const pg = require('pg');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../apps/admin/.env'), 'utf8');
const match = envContent.match(/DATABASE_URL=(.+)/);
const connectionString = match ? match[1].trim() : '';

const pool = new pg.Pool({ 
  connectionString, 
  ssl: { rejectUnauthorized: false } 
});

async function main() {
  try {
    const accRes = await pool.query(`
      SELECT a.id, a.owner_user_id, a.employee_id, a.account, a.status, e.name, e.employee_no, e.is_deleted
      FROM workspace_accounts a
      LEFT JOIN workspace_employees e ON a.employee_id = e.id AND a.owner_user_id = e.owner_user_id
      WHERE a.account_type = 'employee'
      ORDER BY a.id ASC;
    `);

    console.log(`总员工账号数 (workspace_accounts): ${accRes.rows.length}`);
    
    const valid = [];
    const invalid = [];

    for (const row of accRes.rows) {
      if (/^MY\d{4}$/.test(row.account)) {
        valid.push(row);
      } else {
        invalid.push(row);
      }
    }

    console.log(`符合 MY+4位数字 规范的账号数: ${valid.length}`);
    console.log(`不符合规范的账号数: ${invalid.length}`);
    console.log('\n不符合规范的账号明细:');
    console.table(invalid.map(r => ({
      acc_id: r.id,
      employee_id: r.employee_id,
      name: r.name,
      employee_no: r.employee_no,
      current_account: r.account,
      status: r.status,
      is_deleted: r.is_deleted
    })));

    const empWithoutAcc = await pool.query(`
      SELECT e.id, e.owner_user_id, e.name, e.employee_no, e.is_deleted
      FROM workspace_employees e
      LEFT JOIN workspace_accounts a ON e.id = a.employee_id AND e.owner_user_id = a.owner_user_id AND a.account_type = 'employee'
      WHERE a.id IS NULL AND e.is_deleted = false;
    `);
    console.log(`\n未关联 APP 账号的在职/未删除员工数: ${empWithoutAcc.rows.length}`);
    if (empWithoutAcc.rows.length > 0) {
      console.table(empWithoutAcc.rows);
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error("查询失败:", err);
  process.exit(1);
});
