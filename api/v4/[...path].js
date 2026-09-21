// Admin V4 uses an independent API namespace and service.
// Keep the legacy catch-all at api/[...path].js untouched for old Admin/Mobile clients.
export { default } from "../../apps/admin/server-v4/index.js";
