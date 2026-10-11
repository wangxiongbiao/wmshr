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
    console.log("=== 开始执行员工 APP 账号规范化清洗 ===");
    await client.query("BEGIN");

    // 1. 查询所有已被占用的 account（小写集合）
    const allAccountsRes = await client.query("SELECT account FROM workspace_accounts;");
    const usedAccounts = new Set(allAccountsRes.rows.map(r => (r.account || '').toLowerCase()));

    // 2. 查询所有待清洗的员工账号
    const queryRes = await client.query(`
      SELECT a.id, a.owner_user_id, a.employee_id, a.account, a.status, e.name, e.employee_no
      FROM workspace_accounts a
      LEFT JOIN workspace_employees e ON a.employee_id = e.id AND a.owner_user_id = e.owner_user_id
      WHERE a.account_type = 'employee'
      ORDER BY 
        CASE WHEN a.employee_id IS NOT NULL THEN a.employee_id ELSE 999999 END ASC,
        a.created_at ASC,
        a.id ASC;
    `);

    const toMigrate = [];
    for (const row of queryRes.rows) {
      if (!/^MY\d{4}$/i.test(row.account)) {
        toMigrate.push(row);
      }
    }

    console.log(`总员工账号数: ${queryRes.rows.length}，需清洗账号数: ${toMigrate.length}`);

    if (toMigrate.length === 0) {
      console.log("所有员工账号已符合规范，无需清洗。");
      await client.query("COMMIT");
      return;
    }

    // 3. 从 1001 开始顺序寻找未被占用的编号，生成 MY+4位数字
    let nextNum = 1001;
    function getNextAvailableAccount() {
      while (nextNum <= 9999) {
        const candidate = `MY${nextNum}`;
        nextNum++;
        if (!usedAccounts.has(candidate.toLowerCase())) {
          usedAccounts.add(candidate.toLowerCase());
          return candidate;
        }
      }
      throw new Error("4位数字账号空间 (MY1001-MY9999) 已耗尽！");
    }

    const migrationLog = [];

    for (const item of toMigrate) {
      const oldAccount = item.account;
      const newAccount = getNextAvailableAccount();

      // 先从旧占用中移除旧账号，避免同名问题
      if (oldAccount) {
        usedAccounts.delete(oldAccount.toLowerCase());
      }

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
