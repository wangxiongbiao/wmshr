const pg = require('pg');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../apps/admin/.env'), 'utf8');
const connectionString = envContent.match(/DATABASE_URL=(.+)/)[1].trim();

const pool = new pg.Pool({ 
  connectionString, 
  ssl: { rejectUnauthorized: false } 
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("=== 开始执行按所属仓库国家规范化清洗员工 APP 账号 ===");
    await client.query("BEGIN");

    // 1. 查询所有已被占用的非员工 account（例如 superadmin 等，避免冲突）
    const nonEmpAccountsRes = await client.query("SELECT account FROM workspace_accounts WHERE account_type <> 'employee';");
    const usedAccounts = new Set(nonEmpAccountsRes.rows.map(r => (r.account || '').toLowerCase()));

    // 2. 查询所有员工账号以及关联的仓库信息
    const queryRes = await client.query(`
      SELECT 
        a.id, 
        a.owner_user_id, 
        a.employee_id, 
        a.account, 
        a.status, 
        e.name, 
        e.employee_no,
        COALESCE(e.warehouse_code, e.country, 'TH') as raw_warehouse
      FROM workspace_accounts a
      LEFT JOIN workspace_employees e ON a.employee_id = e.id AND a.owner_user_id = e.owner_user_id
      WHERE a.account_type = 'employee'
      ORDER BY 
        CASE 
          WHEN UPPER(COALESCE(e.warehouse_code, e.country, 'TH')) = 'MY' THEN 1
          WHEN UPPER(COALESCE(e.warehouse_code, e.country, 'TH')) = 'TH' THEN 2
          ELSE 3
        END ASC,
        CASE WHEN a.employee_id IS NOT NULL THEN a.employee_id ELSE 999999 END ASC,
        a.created_at ASC,
        a.id ASC;
    `);

    console.log(`总员工账号数: ${queryRes.rows.length}`);

    // 3. 阶段一：先赋临时前缀，解除已有名字占用冲突
    for (const item of queryRes.rows) {
      const tmpAccount = `TMP_${item.id.replace(/-/g, '').slice(0, 16)}`;
      await client.query(`UPDATE workspace_accounts SET account = $1 WHERE id = $2;`, [tmpAccount, item.id]);
    }

    // 4. 阶段二：各国家前缀独立计数，赋标准账号
    const prefixCounters = {};

    function getNextAccount(prefix) {
      if (!prefixCounters[prefix]) {
        prefixCounters[prefix] = 1001;
      }
      while (prefixCounters[prefix] <= 9999) {
        const candidate = `${prefix}${prefixCounters[prefix]}`;
        prefixCounters[prefix]++;
        if (!usedAccounts.has(candidate.toLowerCase())) {
          usedAccounts.add(candidate.toLowerCase());
          return candidate;
        }
      }
      throw new Error(`国家前缀 ${prefix} 的账号空间已耗尽！`);
    }

    const migrationLog = [];

    for (const item of queryRes.rows) {
      const rawWh = String(item.raw_warehouse || 'TH').trim().toUpperCase();
      const match = rawWh.match(/^[A-Z]{2}/);
      const prefix = match ? match[0] : 'TH';

      const oldAccount = item.account;
      const newAccount = getNextAccount(prefix);

      // 更新 workspace_accounts
      await client.query(`
        UPDATE workspace_accounts
        SET account = $1, updated_at = NOW()
        WHERE id = $2;
      `, [newAccount, item.id]);

      // 同步兼容旧表 employee_app_accounts（若存在该记录）
      if (item.employee_id) {
        await client.query(`
          UPDATE employee_app_accounts
          SET account = $1, updated_at = NOW()
          WHERE owner_user_id = $2 AND employee_id = $3;
        `, [newAccount, item.owner_user_id, item.employee_id]);
      }

      migrationLog.push({
        empId: item.employee_id,
        name: item.name || '(未关联员工档案)',
        warehouse: prefix,
        oldAccount: oldAccount,
        newAccount: newAccount,
        status: item.status
      });
    }

    await client.query("COMMIT");
    console.log("=== 清洗成功！已提交事务 ===");
    console.table(migrationLog);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("清洗失败，已回滚事务:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  process.exit(1);
});
