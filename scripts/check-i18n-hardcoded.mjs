#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceRoots = ['apps/home/src', 'apps/admin/src', 'apps/mobile/src'];
const filePattern = /\.(tsx?|jsx?)$/;
const cjkPattern = /[\u4e00-\u9fff]/;
const ignoredPathParts = [
  'packages/i18n',
  'node_modules',
  'dist',
  'build',
];
const ignoredFilePatterns = [
  /\.test\./,
  /\.spec\./,
  /services\/.*Api\.ts$/,
  /src\/lib\/utils\.ts$/,
  /src\/constants\.ts$/,
];

function walk(directory) {
  const entries = readdirSync(directory);
  return entries.flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      return walk(fullPath);
    }
    return [fullPath];
  });
}

function shouldSkipFile(filePath) {
  const normalized = relative(root, filePath).replaceAll('\\', '/');
  return ignoredPathParts.some((part) => normalized.includes(part))
    || ignoredFilePatterns.some((pattern) => pattern.test(normalized))
    || !filePattern.test(normalized);
}

function stripNonVisibleContext(source) {
  // 检查脚本只负责发现“明显遗留”的用户可见文案：注释、t('中文 key') 和翻译资源本身不算问题，避免把正确迁移后的中文 key 当成漏项。
  // 必须在整份源码层面剥离 t/tAdmin 调用：SOP 文本域示例使用多行模板字符串，逐行扫描会把已迁移的 key 误报为硬编码。
  return source
    .replace(/\b(?:t|tAdmin)\(\s*(['"`])(?:\\.|(?!\1)[\s\S])*[\u4e00-\u9fff](?:\\.|(?!\1)[\s\S])*\1\s*(?:,[\s\S]*?)?\)/g, '')
    .replace(/message\.includes\(\s*(['"`])(?:\\.|(?!\1)[\s\S])*[\u4e00-\u9fff](?:\\.|(?!\1)[\s\S])*\1\s*\)/g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

const findings = [];
const maxPrintedFindings = Number.parseInt(process.env.I18N_MAX_FINDINGS || '120', 10);
const strictMode = process.env.STRICT_I18N === '1';

for (const sourceRoot of sourceRoots) {
  const absoluteRoot = join(root, sourceRoot);
  for (const filePath of walk(absoluteRoot)) {
    if (shouldSkipFile(filePath)) continue;
    const rel = relative(root, filePath).replaceAll('\\', '/');
    const source = readFileSync(filePath, 'utf8');
    const originalLines = source.split('\n');
    const visibleLines = stripNonVisibleContext(source).split('\n');
    visibleLines.forEach((line, index) => {
      if (cjkPattern.test(line)) {
        findings.push(`${rel}:${index + 1}: ${originalLines[index]?.trim() ?? line.trim()}`);
      }
    });
  }
}

if (findings.length > 0) {
  console.log(`Found ${findings.length} possible hardcoded visible Chinese text entries.`);
  console.log(findings.slice(0, maxPrintedFindings).join('\n'));
  if (findings.length > maxPrintedFindings) {
    console.log(`... ${findings.length - maxPrintedFindings} more omitted. Set I18N_MAX_FINDINGS to print more.`);
  }
  // 默认使用报告模式，让 CI/本地构建能先通过；需要卡口时设置 STRICT_I18N=1，避免在既有 Admin 深层页面迁移前阻断发布。
  if (strictMode) {
    process.exitCode = 1;
  }
} else {
  console.log('No obvious hardcoded visible Chinese text found outside i18n keys/resources.');
}
