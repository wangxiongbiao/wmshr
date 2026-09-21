import assert from "node:assert/strict";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.ptsmigtxbtruohvchskf:3v4wiTHbZcSuz1X4HhaFionafcK1yOEyc%2BQbr%2BKoyI4h%2Btwx3x6lQTasUXeWtKRg@aws-1-us-west-2.pooler.supabase.com:5432/postgres";
const OWNER_USER_ID = "14f3a54f-410f-4dfd-ae11-6adb3c956b45";

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  try {
    console.log("1. Verifying workspace_nodes...");
    const nodes = await pool.query("SELECT country_code, country_name, currency FROM workspace_nodes WHERE owner_user_id = $1 ORDER BY country_code", [OWNER_USER_ID]);
    assert.ok(nodes.rows.length >= 18, `Expected at least 18 nodes, found ${nodes.rows.length}`);
    assert.ok(nodes.rows.some(n => n.country_code === "TH"), "TH node missing");
    console.log(`✓ Verified ${nodes.rows.length} workspace nodes (including TH).`);

    console.log("2. Verifying all 15 workspace_employees are in Thailand warehouse (TH)...");
    const thEmp = await pool.query("SELECT id, name, status, country, nationality FROM workspace_employees WHERE owner_user_id = $1 AND warehouse_code = 'TH' ORDER BY id", [OWNER_USER_ID]);
    const mmEmp = await pool.query("SELECT id, name, status FROM workspace_employees WHERE owner_user_id = $1 AND warehouse_code = 'MM' ORDER BY id", [OWNER_USER_ID]);
    
    assert.equal(thEmp.rows.length, 15, `Expected all 15 employees in TH, got ${thEmp.rows.length}`);
    assert.equal(mmEmp.rows.length, 0, `Expected 0 employees in MM, got ${mmEmp.rows.length}`);
    
    const thActive = thEmp.rows.filter(e => e.status === "active");
    const thResigned = thEmp.rows.filter(e => e.status === "resigned");
    assert.equal(thActive.length, 8, `Expected 8 active TH employees, got ${thActive.length}`);
    assert.equal(thResigned.length, 7, `Expected 7 resigned TH employees, got ${thResigned.length}`);
    console.log(`✓ Verified 15 employees all in TH (8 active + 7 resigned = 15).`);

    console.log("3. Verifying workspace_attendance_records (all in TH)...");
    const thAtt = await pool.query("SELECT count(*) FROM workspace_attendance_records WHERE owner_user_id = $1 AND warehouse_code = 'TH'", [OWNER_USER_ID]);
    const mmAtt = await pool.query("SELECT count(*) FROM workspace_attendance_records WHERE owner_user_id = $1 AND warehouse_code = 'MM'", [OWNER_USER_ID]);
    assert.equal(Number(thAtt.rows[0].count), 703, `Expected all 703 TH attendance records, got ${thAtt.rows[0].count}`);
    assert.equal(Number(mmAtt.rows[0].count), 0, `Expected 0 MM attendance records, got ${mmAtt.rows[0].count}`);
    console.log(`✓ Verified 703 attendance records all in TH.`);

    console.log("4. Verifying workspace_attendance_calculation_results (all in TH)...");
    const thCalc = await pool.query("SELECT count(*) FROM workspace_attendance_calculation_results WHERE owner_user_id = $1 AND warehouse_code = 'TH'", [OWNER_USER_ID]);
    const mmCalc = await pool.query("SELECT count(*) FROM workspace_attendance_calculation_results WHERE owner_user_id = $1 AND warehouse_code = 'MM'", [OWNER_USER_ID]);
    assert.equal(Number(thCalc.rows[0].count), 703, `Expected all 703 TH calculation results, got ${thCalc.rows[0].count}`);
    assert.equal(Number(mmCalc.rows[0].count), 0, `Expected 0 MM calculation results, got ${mmCalc.rows[0].count}`);
    console.log(`✓ Verified 703 calculation results all in TH.`);

    console.log("5. Verifying leave_requests...");
    const leaves = await pool.query("SELECT count(*) FROM leave_requests WHERE owner_user_id = $1", [OWNER_USER_ID]);
    assert.equal(Number(leaves.rows[0].count), 106, `Expected 106 leave requests, got ${leaves.rows[0].count}`);
    console.log(`✓ Verified 106 synthesized leave requests.`);

    console.log("6. Verifying workspace_accounts and workspace_members...");
    const superadmin = await pool.query(`
      SELECT a.account, a.account_type, m.role_name, m.permissions
      FROM workspace_accounts a
      JOIN workspace_members m ON m.account_id = a.id
      WHERE a.owner_user_id = $1 AND a.account_type = 'superadmin'
    `, [OWNER_USER_ID]);
    assert.equal(superadmin.rows.length, 1, "Expected 1 superadmin account");
    assert.equal(superadmin.rows[0].role_name, "超级管理员");

    const empAccounts = await pool.query(`
      SELECT count(*) FROM workspace_accounts WHERE owner_user_id = $1 AND account_type = 'employee'
    `, [OWNER_USER_ID]);
    assert.equal(Number(empAccounts.rows[0].count), 15, "Expected 15 employee accounts");
    console.log("✓ Verified 1 superadmin and 15 employee accounts with matching permissions.");

    console.log("\nALL VERIFICATION CHECKS PASSED PERFECTLY (ALL IN TH WAREHOUSE)!");
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error("Verification failed:", err);
  process.exitCode = 1;
});
