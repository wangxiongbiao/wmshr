#!/usr/bin/env node
import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Google Play AAB 上传前置脚本。
 *
 * 这个脚本默认只做“权限检查”，不会上传 AAB；因为 Play Console 上传会改变线上发布草稿，
 * 必须由调用方显式传入 `--upload --commit` 才会创建并提交一个 Play edit。
 * 这样后续排查权限时可以安全复用同一入口，避免把临时权限检查命令误当成正式发布。
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULTS = {
  packageName: 'com.wmshr.app',
  serviceAccount: path.join(repoRoot, 'apps/mobile/google-service-account.json'),
  aab: path.join(repoRoot, 'apps/mobile/android/app/build/outputs/bundle/release/app-release.aab'),
  track: 'internal',
  status: 'draft',
};

function usage() {
  console.log(`用法：
  npm run mobile:google-play:check
  npm run mobile:google-play -- --upload --commit [选项]

默认行为：
  只创建一个临时 Play edit 并立即删除，用来检查服务账号是否有 com.wmshr.app 的 Play Console 权限。

常用命令：
  # 1. 只检查权限，不上传
  npm run mobile:google-play:check

  # 2. 权限通过后，把当前 AAB 上传到内部测试轨道草稿
  npm run mobile:google-play -- --upload --commit --track internal --status draft

选项：
  --upload                         上传 AAB。必须同时传 --commit，否则脚本会拒绝执行。
  --commit                         提交 Play edit，让上传结果进入 Play Console 草稿/轨道。
  --verify-track                   只读取指定轨道当前版本，用于上传后复核。
  --aab <path>                     AAB 路径，默认：${DEFAULTS.aab}
  --service-account <path>         服务账号 JSON，默认：${DEFAULTS.serviceAccount}
  --package <name>                 Android package name，默认：${DEFAULTS.packageName}
  --track <name>                   轨道，默认 internal；也可用 alpha/beta/production。
  --status <draft|completed|inProgress|halted>
                                  发布状态，默认 draft。首次建议保持 draft。
  -h, --help                       显示帮助。
`);
}

function parseArgs(argv) {
  const args = {
    upload: false,
    commit: false,
    verifyTrack: false,
    aab: DEFAULTS.aab,
    serviceAccount: DEFAULTS.serviceAccount,
    packageName: DEFAULTS.packageName,
    track: DEFAULTS.track,
    status: DEFAULTS.status,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--upload':
        args.upload = true;
        break;
      case '--commit':
        args.commit = true;
        break;
      case '--verify-track':
        args.verifyTrack = true;
        break;
      case '--aab':
        args.aab = path.resolve(argv[++index] || '');
        break;
      case '--service-account':
        args.serviceAccount = path.resolve(argv[++index] || '');
        break;
      case '--package':
        args.packageName = argv[++index] || '';
        break;
      case '--track':
        args.track = argv[++index] || '';
        break;
      case '--status':
        args.status = argv[++index] || '';
        break;
      case '--check-permission':
        args.upload = false;
        break;
      case '-h':
      case '--help':
        usage();
        process.exit(0);
      default:
        throw new Error(`未知参数：${arg}`);
    }
  }

  if (!args.packageName) {
    throw new Error('缺少 --package');
  }
  if (!['draft', 'completed', 'inProgress', 'halted'].includes(args.status)) {
    throw new Error(`不支持的 --status：${args.status}`);
  }
  if (args.upload && !args.commit) {
    throw new Error('为了避免误上传，--upload 必须同时传 --commit。');
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

function parseCurlPayload(text) {
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  return payload;
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

  const text = raw.slice(0, markerIndex).trim();
  const statusCode = Number(raw.slice(markerIndex + marker.length).trim());
  const payload = parseCurlPayload(text);
  if (statusCode < 200 || statusCode >= 300) {
    const error = payload?.error || payload;
    const message = error?.message || text || `HTTP ${statusCode}`;
    const status = error?.status || statusCode;
    const wrapped = new Error(message);
    wrapped.statusCode = statusCode;
    wrapped.googleStatus = status;
    wrapped.payload = payload;
    throw wrapped;
  }
  return payload;
}

async function getAccessToken(serviceAccount) {
  const jwt = signJwt(serviceAccount);
  // 本机 Node/Python 的 CA 链路历史上会拦截 Google OAuth；系统 curl 已验证可用，
  // 因此这里统一走 curl，避免发布脚本在“权限检查前”被本机 TLS 环境误挡。
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

async function playJson(accessToken, url, options = {}) {
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

async function createEdit(accessToken, packageName) {
  return playJson(
    accessToken,
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits`,
    { method: 'POST', body: '{}' },
  );
}

async function deleteEdit(accessToken, packageName, editId) {
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

async function uploadBundle(accessToken, packageName, editId, aabPath) {
  const buffer = await readFile(aabPath);
  if (buffer.subarray(0, 4).toString('hex') !== '504b0304') {
    throw new Error(`AAB 文件不像 ZIP/AAB：${aabPath}`);
  }
  return curlJson([
    '-sS',
    '--connect-timeout', '15',
    '--max-time', '600',
    '-X', 'POST',
    '-H', `Authorization: Bearer ${accessToken}`,
    '-H', 'Content-Type: application/octet-stream',
    '--data-binary', `@${aabPath}`,
    `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${packageName}/edits/${editId}/bundles?uploadType=media`,
  ]);
}

async function updateTrack(accessToken, packageName, editId, { track, status, versionCode }) {
  return playJson(
    accessToken,
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/tracks/${track}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        track,
        releases: [
          {
            name: `WMSHR Android ${versionCode}`,
            status,
            versionCodes: [String(versionCode)],
          },
        ],
      }),
    },
  );
}

async function getTrack(accessToken, packageName, editId, track) {
  return playJson(
    accessToken,
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/tracks/${track}`,
  );
}

async function commitEdit(accessToken, packageName, editId) {
  return playJson(
    accessToken,
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}:commit`,
    { method: 'POST', body: '{}' },
  );
}

function printPermissionFix(serviceAccountEmail, packageName) {
  console.log(`\n下一步请在中文 Play Console 里授权：
1. 打开 Google Play Console，进入你的开发者账号。
2. 左侧进入「用户和权限」。
3. 点击「邀请新用户」或编辑已有用户。
4. 邮箱填写/选择：${serviceAccountEmail}
5. 在「应用权限」里选择应用：${packageName}
6. 勾选发布相关权限，至少要能管理测试轨道/发布版本。
7. 保存后回到项目执行：npm run mobile:google-play:check
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const serviceAccount = JSON.parse(await readFile(args.serviceAccount, 'utf8'));
  console.log(`服务账号：${serviceAccount.client_email}`);
  console.log(`应用包名：${args.packageName}`);

  const accessToken = await getAccessToken(serviceAccount);
  console.log('Google OAuth：通过');

  let edit = null;
  try {
    edit = await createEdit(accessToken, args.packageName);
  } catch (error) {
    console.error(`Play Console 权限检查：失败 ${error.statusCode || ''} ${error.googleStatus || ''}`.trim());
    console.error(`Google 返回：${error.message}`);
    printPermissionFix(serviceAccount.client_email, args.packageName);
    process.exitCode = 1;
    return;
  }

  console.log(`Play edit：已创建 ${String(edit.id).slice(0, 8)}***`);

  if (args.verifyTrack) {
    const track = await getTrack(accessToken, args.packageName, edit.id, args.track);
    const releases = Array.isArray(track.releases) ? track.releases : [];
    console.log(`轨道复核：${track.track || args.track}`);
    if (releases.length === 0) {
      console.log('轨道复核：当前没有 release。');
    } else {
      for (const release of releases) {
        console.log(`- status=${release.status || ''} versionCodes=${(release.versionCodes || []).join(',')} name=${release.name || ''}`);
      }
    }
    const deleteStatus = await deleteEdit(accessToken, args.packageName, edit.id);
    console.log(`Play edit：已删除，HTTP ${deleteStatus}`);
    return;
  }

  if (!args.upload) {
    const deleteStatus = await deleteEdit(accessToken, args.packageName, edit.id);
    console.log(`Play edit：已删除，HTTP ${deleteStatus}`);
    console.log('权限检查：通过。现在可以执行带 --upload --commit 的上传命令。');
    return;
  }

  console.log(`AAB：${args.aab}`);
  try {
    const bundle = await uploadBundle(accessToken, args.packageName, edit.id, args.aab);
    console.log(`AAB 上传：通过，versionCode=${bundle.versionCode}`);

    await updateTrack(accessToken, args.packageName, edit.id, {
      track: args.track,
      status: args.status,
      versionCode: bundle.versionCode,
    });
    console.log(`轨道更新：${args.track} / ${args.status}`);

    const commit = await commitEdit(accessToken, args.packageName, edit.id);
    console.log(`提交 Play edit：完成，id=${commit.id || edit.id}`);
    console.log('完成：请到 Play Console 中文后台对应测试轨道查看草稿/发布记录。');
  } catch (error) {
    // 上传或轨道更新失败时主动删除本次 edit，避免 Play Console 里留下不可追踪的半成品草稿。
    // 如果失败发生在 commit 之后，删除 edit 可能会被 Google 拒绝；此时保留原始错误继续暴露给调用方。
    try {
      const deleteStatus = await deleteEdit(accessToken, args.packageName, edit.id);
      console.error(`已清理失败的 Play edit，HTTP ${deleteStatus}`);
    } catch (cleanupError) {
      console.error(`清理 Play edit 失败：${cleanupError.message}`);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(`失败：${error.message}`);
  if (error.payload) {
    console.error(JSON.stringify(error.payload));
  }
  process.exit(1);
});
