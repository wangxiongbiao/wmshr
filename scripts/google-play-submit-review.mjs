#!/usr/bin/env node
import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Submit an already-uploaded Google Play track draft for review / activation.
 *
 * This script intentionally does not upload a bundle. It only opens a Play edit,
 * reads the selected track, changes the requested versionCode release to
 * `completed`, then commits the edit with `changesNotSentForReview=false` so the
 * change is sent through Play Console's normal review pipeline.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULTS = {
  packageName: 'com.wmshr.app',
  serviceAccount: path.join(repoRoot, 'apps/mobile/google-service-account.json'),
  track: 'internal',
  versionCode: '129',
};

function usage() {
  console.log(`用法：
  npm run mobile:google-play:submit-review
  npm run mobile:google-play:submit-review -- --version-code 129 --track internal

作用：
  不重新上传 AAB，只把指定轨道里已存在的 draft 版本改为 completed 并提交审核/发布流程。

选项：
  --version-code <code>             要提交的 versionCode，默认：${DEFAULTS.versionCode}
  --track <name>                    轨道，默认：${DEFAULTS.track}
  --service-account <path>          服务账号 JSON，默认：${DEFAULTS.serviceAccount}
  --package <name>                  Android package name，默认：${DEFAULTS.packageName}
  -h, --help                        显示帮助。
`);
}

function printRequestInstallPackagesFix() {
  console.error(`\n下一步需要先处理 Play Console 的敏感权限声明：
1. 打开 Google Play Console 中文后台，进入应用 com.wmshr.app。
2. 进入「政策和计划」或「应用内容」。
3. 找到「敏感应用权限」/「特殊应用访问权限」中关于 REQUEST_INSTALL_PACKAGES 的声明项。
4. 说明本应用使用该权限是为了下载并打开企业自有 Android 安装包更新流程。
5. 保存声明后，再回到项目执行：npm run mobile:google-play:submit-review -- --version-code 129 --track internal

如果不想在 Play 包里声明该权限，则需要另做一个 Play 专用 AAB：移除 REQUEST_INSTALL_PACKAGES、提升 versionCode 后重新上传并提交。`);
}

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--version-code':
        args.versionCode = String(argv[++index] || '').trim();
        break;
      case '--track':
        args.track = String(argv[++index] || '').trim();
        break;
      case '--service-account':
        args.serviceAccount = path.resolve(argv[++index] || '');
        break;
      case '--package':
        args.packageName = String(argv[++index] || '').trim();
        break;
      case '-h':
      case '--help':
        usage();
        process.exit(0);
      default:
        throw new Error(`未知参数：${arg}`);
    }
  }
  if (!args.versionCode || !/^\d+$/.test(args.versionCode)) {
    throw new Error(`无效 versionCode：${args.versionCode}`);
  }
  if (!args.track) {
    throw new Error('缺少 --track');
  }
  if (!args.packageName) {
    throw new Error('缺少 --package');
  }
  return args;
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${base64Url(signer.sign(serviceAccount.private_key))}`;
}

function parsePayload(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function curlJson(args) {
  const result = spawnSync('curl', [
    '--retry', '3',
    '--retry-delay', '2',
    '--retry-all-errors',
    ...args,
    '-w', '\nHTTP_STATUS:%{http_code}\n',
  ], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `curl 退出码 ${result.status}`).trim());
  }
  const raw = result.stdout || '';
  const marker = '\nHTTP_STATUS:';
  const markerIndex = raw.lastIndexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`curl 响应缺少 HTTP 状态码：${raw.slice(0, 200)}`);
  }
  const body = raw.slice(0, markerIndex).trim();
  const statusCode = Number(raw.slice(markerIndex + marker.length).trim());
  const payload = parsePayload(body);
  if (statusCode < 200 || statusCode >= 300) {
    const error = payload?.error || payload;
    const wrapped = new Error(error?.message || body || `HTTP ${statusCode}`);
    wrapped.statusCode = statusCode;
    wrapped.googleStatus = error?.status || statusCode;
    wrapped.payload = payload;
    throw wrapped;
  }
  return payload;
}

async function getAccessToken(serviceAccount) {
  const jwt = signJwt(serviceAccount);
  const payload = curlJson([
    '-fsS',
    '--connect-timeout', '15',
    '--max-time', '60',
    '-H', 'Content-Type: application/x-www-form-urlencoded',
    '-d', 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer',
    '--data-urlencode', `assertion=${jwt}`,
    serviceAccount.token_uri,
  ]);
  if (!payload.access_token) {
    throw new Error('Google OAuth 没有返回 access_token');
  }
  return payload.access_token;
}

function playJson(accessToken, url, options = {}) {
  const args = [
    '-sS',
    '--connect-timeout', '15',
    '--max-time', '60',
    '-X', options.method || 'GET',
    '-H', `Authorization: Bearer ${accessToken}`,
    '-H', 'Content-Type: application/json',
  ];
  if (options.body !== undefined) {
    args.push('-d', options.body);
  }
  args.push(url);
  return curlJson(args);
}

function createEdit(accessToken, packageName) {
  return playJson(
    accessToken,
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits`,
    { method: 'POST', body: '{}' },
  );
}

function deleteEdit(accessToken, packageName, editId) {
  try {
    curlJson([
      '-sS',
      '--connect-timeout', '15',
      '--max-time', '60',
      '-X', 'DELETE',
      '-H', `Authorization: Bearer ${accessToken}`,
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}`,
    ]);
    return 200;
  } catch (error) {
    if (error.statusCode === 204) {
      return 204;
    }
    throw error;
  }
}

function getTrack(accessToken, packageName, editId, track) {
  return playJson(
    accessToken,
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/tracks/${track}`,
  );
}

function updateTrack(accessToken, packageName, editId, track, releases) {
  return playJson(
    accessToken,
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/tracks/${track}`,
    {
      method: 'PUT',
      body: JSON.stringify({ track, releases }),
    },
  );
}

function commitEdit(accessToken, packageName, editId) {
  return playJson(
    accessToken,
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}:commit?changesNotSentForReview=false`,
    { method: 'POST', body: '{}' },
  );
}

function releaseIncludesVersion(release, versionCode) {
  return (release.versionCodes || []).map(String).includes(String(versionCode));
}

function buildSubmittedReleases(trackPayload, versionCode) {
  const existing = Array.isArray(trackPayload.releases) ? trackPayload.releases : [];
  const target = existing.find((release) => releaseIncludesVersion(release, versionCode));

  // Google Play 每个轨道只允许一个 completed release。提交目标版本时不能把旧 completed
  // release 一起带回 PUT 请求，否则会返回 “Only one completed release is allowed”。
  // 如果目标 versionCode 已在当前轨道中，就复用其 release 元信息；如果像 production 首次提交一样
  // 轨道里还没有该 versionCode，则直接创建一个指向已上传 bundle 的新 completed release。
  return [
    {
      ...(target || { name: `WMSHR Android ${versionCode}` }),
      status: 'completed',
      versionCodes: [String(versionCode)],
    },
  ];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const serviceAccount = JSON.parse(await readFile(args.serviceAccount, 'utf8'));
  console.log(`服务账号：${serviceAccount.client_email}`);
  console.log(`应用包名：${args.packageName}`);
  console.log(`目标轨道：${args.track}`);
  console.log(`目标 versionCode：${args.versionCode}`);

  const accessToken = await getAccessToken(serviceAccount);
  console.log('Google OAuth：通过');

  const edit = await createEdit(accessToken, args.packageName);
  console.log(`Play edit：已创建 ${String(edit.id).slice(0, 8)}***`);

  try {
    const beforeTrack = getTrack(accessToken, args.packageName, edit.id, args.track);
    const releases = buildSubmittedReleases(beforeTrack, args.versionCode);
    for (const release of releases) {
      console.log(`提交前 release：status=${release.status || ''} versionCodes=${(release.versionCodes || []).join(',')} name=${release.name || ''}`);
    }

    updateTrack(accessToken, args.packageName, edit.id, args.track, releases);
    console.log(`轨道更新：${args.track} / versionCode=${args.versionCode} -> completed`);

    const commit = commitEdit(accessToken, args.packageName, edit.id);
    console.log(`提交审核/发布流程：完成，id=${commit.id || edit.id}`);
  } catch (error) {
    try {
      const deleteStatus = deleteEdit(accessToken, args.packageName, edit.id);
      console.error(`已清理失败的 Play edit，HTTP ${deleteStatus}`);
    } catch (cleanupError) {
      console.error(`清理 Play edit 失败：${cleanupError.message}`);
    }
    throw error;
  }

  const verifyEdit = createEdit(accessToken, args.packageName);
  const verifyTrack = getTrack(accessToken, args.packageName, verifyEdit.id, args.track);
  console.log(`轨道复核：${verifyTrack.track || args.track}`);
  for (const release of verifyTrack.releases || []) {
    console.log(`- status=${release.status || ''} versionCodes=${(release.versionCodes || []).join(',')} name=${release.name || ''}`);
  }
  const deleteStatus = deleteEdit(accessToken, args.packageName, verifyEdit.id);
  console.log(`复核 Play edit：已删除，HTTP ${deleteStatus}`);
}

main().catch((error) => {
  console.error(`失败：${error.message}`);
  if (String(error.message || '').includes('REQUEST_INSTALL_PACKAGES')) {
    printRequestInstallPackagesFix();
  }
  if (error.payload) {
    console.error(JSON.stringify(error.payload));
  }
  process.exit(1);
});
