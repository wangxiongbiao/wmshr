import assert from "node:assert/strict";
import fs from "node:fs";
import { createV4IdentityService } from "./identity.js";

let capturedRpc = null;
const service = createV4IdentityService({
  supabase: {
    async rpc(name, args) {
      capturedRpc = { name, args };
      return {
        data: [{
          account_id: "00000000-0000-0000-0000-000000000002",
          owner_user_id: "00000000-0000-0000-0000-000000000001",
          account: "owner@example.com",
          display_name: "Owner",
          role_name: "超级管理员",
          permissions: ["*"],
          allowed_warehouses: ["*"]
        }],
        error: null
      };
    }
  },
  directDbPool: null
});

const result = await service.bootstrapNewTenant({
  id: "00000000-0000-0000-0000-000000000001",
  email: "OWNER@example.com",
  user_metadata: { full_name: "Owner" }
}, {
  registrationMode: "email",
  name: "Owner",
  passwordHash: "pbkdf2_sha256$120000$salt$hash"
});

assert.deepEqual(capturedRpc, {
  name: "bootstrap_admin_v4_tenant",
  args: {
    p_owner_user_id: "00000000-0000-0000-0000-000000000001",
    p_email: "owner@example.com",
    p_display_name: "Owner",
    p_registration_mode: "email",
    p_password_hash: "pbkdf2_sha256$120000$salt$hash"
  }
});
assert.equal(result.id, "00000000-0000-0000-0000-000000000001");
assert.equal(result.ownerUserId, "00000000-0000-0000-0000-000000000001");
assert.equal(result.accountId, "00000000-0000-0000-0000-000000000002");
assert.deepEqual(result.member.permissions, ["*"]);
assert.deepEqual(result.allowedWarehouses, ["*"]);

const migration = fs.readFileSync(new URL("../../../supabase/migrations/20260909120000_admin_v4_registration_fast_path.sql", import.meta.url), "utf8");
assert.match(migration, /security definer/);
assert.match(migration, /set search_path = public, auth, pg_temp/);
assert.match(migration, /grant execute on function public\.bootstrap_admin_v4_tenant/);
assert.match(migration, /to service_role/);
assert.match(migration, /on conflict on constraint workspace_bootstrap_states_pkey/);
assert.match(migration, /idx_workspace_accounts_active_owner_id/);

console.log("admin-v4 registration fast-path self-check passed");
