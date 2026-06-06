#!/usr/bin/env python3
"""Batch-fill Admin i18n locale values that still mirror Chinese.

This is a temporary migration helper for the WMSHR i18n cleanup. It only
rewrites locale values in packages/i18n/src/namespaces/admin.ts; keys and the zh
source block stay unchanged so existing tAdmin(key) calls remain stable. The
script protects i18next interpolation placeholders before machine translation so
runtime variables such as {{count}} and {{name}} are not translated or spaced.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
ADMIN_TS = ROOT / "packages/i18n/src/namespaces/admin.ts"
CACHE_PATH = ROOT / ".tmp-admin-i18n-translation-cache.json"
LOCALE_TARGETS = {
    "en": "en",
    "zht": "zh-TW",
    "th": "th",
    "id": "id",
    "ms": "ms",
    "es": "es",
    "pt": "pt",
}
PLACEHOLDER_RE = re.compile(r"{{\s*[^{}]+\s*}}")
CJK_RE = re.compile(r"[\u4e00-\u9fff]")


def load_admin_object() -> dict:
    script = """
const fs = require('fs');
const src = fs.readFileSync(process.argv[1], 'utf8');
const js = src.replace(/export const \\w+ = /, 'module.exports = ').replace(/ as const;?\\s*$/, ';');
const moduleShim = {exports: {}};
new Function('module', js)(moduleShim);
process.stdout.write(JSON.stringify(moduleShim.exports));
"""
    result = subprocess.run(
        ["node", "-e", script, str(ADMIN_TS)],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    return json.loads(result.stdout)


def protect_placeholders(text: str) -> tuple[str, dict[str, str]]:
    mapping: dict[str, str] = {}

    def repl(match: re.Match[str]) -> str:
        token = f" __VAR{len(mapping)}__ "
        mapping[token.strip()] = match.group(0)
        return token

    return PLACEHOLDER_RE.sub(repl, text), mapping


def restore_placeholders(text: str, mapping: dict[str, str]) -> str:
    restored = text
    for token, value in mapping.items():
        # Translators may add spaces around the artificial token; accept both.
        restored = re.sub(rf"\s*{re.escape(token)}\s*", value, restored)
    return restored


def translate_value(translator: GoogleTranslator, text: str) -> str:
    protected, mapping = protect_placeholders(text)
    for attempt in range(3):
        try:
            translated = translator.translate(protected)
            return restore_placeholders(translated, mapping)
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1.5 * (attempt + 1))
    return text


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def write_admin_object(data: dict) -> None:
    lines = [
        "// Admin 深层页面已经统一迁移到 tAdmin(key)。这里显式登记所有静态 key，避免非中文语言下依赖 i18next 隐式 fallback。",
        "// 当前先保留未人工翻译文案的中文原文；后续补翻译时只需要替换对应 locale 的 value，不要删除 key。",
        "export const adminTranslations = {",
    ]
    locales = ["zh", "en", "zht", "th", "id", "ms", "es", "pt"]
    zh_keys = list(data["zh"].keys())
    for locale_index, locale in enumerate(locales):
        lines.append(f"  {locale}: {{")
        block = data[locale]
        for index, key in enumerate(zh_keys):
            comma = "," if index < len(zh_keys) - 1 else ""
            lines.append(f"    {js_string(key)}: {js_string(block[key])}{comma}")
        lines.append("  }" + ("," if locale_index < len(locales) - 1 else ""))
    lines.append("} as const;")
    ADMIN_TS.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    data = load_admin_object()
    cache = json.loads(CACHE_PATH.read_text("utf-8")) if CACHE_PATH.exists() else {}
    changed = 0
    failures: list[tuple[str, str, str]] = []

    for locale, target in LOCALE_TARGETS.items():
        translator = GoogleTranslator(source="zh-CN", target=target)
        for key, zh_value in data["zh"].items():
            current = data[locale].get(key)
            if current != zh_value or not CJK_RE.search(str(zh_value)):
                continue
            cache_key = f"{target}\u241f{zh_value}"
            try:
                translated = cache.get(cache_key)
                if translated is None:
                    translated = translate_value(translator, str(zh_value))
                    cache[cache_key] = translated
                    if changed % 25 == 0:
                        CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), "utf-8")
                data[locale][key] = translated
                changed += 1
            except Exception as exc:
                failures.append((locale, key, str(exc)))
                # Keep going so one problematic long SOP body does not block all
                # shorter UI labels in the same migration pass.
                continue
        CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), "utf-8")
        write_admin_object(data)
        print(f"{locale}: pass complete")

    write_admin_object(data)
    if failures:
        print("Failures:", json.dumps(failures[:20], ensure_ascii=False, indent=2), file=sys.stderr)
    print(f"changed={changed} failures={len(failures)} cache={CACHE_PATH}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
