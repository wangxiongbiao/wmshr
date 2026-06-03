// Vercel 会把 /api/* 请求交给这个 catch-all Node Function。
// 这里复用后台现有 Express app，保持本地 API 与生产 API 的路由、鉴权和 Supabase 访问逻辑一致。
// 如果后台服务拆分或迁移，请先同步检查 apps/admin/server/index.js 的默认导出。
export { default } from "../apps/admin/server/index.js";
