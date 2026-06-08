import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 统一复用 apps/admin/.env 的 Supabase 连接信息，避免发布后门户/后台/回写脚本分别维护三套数据库入口。
dotenv.config({ path: path.resolve(__dirname, "../apps/admin/.env"), override: false });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLATFORM = "android";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/admin/.env");
}

function readRequiredArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
  if (!value) {
    throw new Error(`Missing --${name}`);
  }
  return value;
}

const version = readRequiredArg("version");
const content = readRequiredArg("content");
const url = readRequiredArg("url");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const payload = {
  platform: PLATFORM,
  version,
  content,
  url,
  updated_at: new Date().toISOString(),
};

const { data, error } = await supabase
  .from("mobile_app_releases")
  .upsert(payload, { onConflict: "platform" })
  .select("platform, version, content, url, updated_at")
  .single();

if (error) {
  throw error;
}

console.log(JSON.stringify(data));
