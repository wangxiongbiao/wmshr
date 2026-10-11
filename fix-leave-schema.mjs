import pg from "pg";
import fs from "node:fs";

const envContent = fs.readFileSync("apps/admin/.env", "utf-8");
const getEnv = (key) => envContent.split("\n").find(line => line.startsWith(key + "="))?.split("=")[1]?.trim();

const pool = new pg.Pool({
  connectionString: getEnv("DATABASE_URL")
});

async function run() {
  console.log("Fixing leave_requests schema...");
  try {
    await pool.query(`ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_employee_id_fkey;`);
    await pool.query(`ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.workspace_employees(id) ON DELETE CASCADE;`);
    await pool.query(`ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_type_check;`);
    await pool.query(`ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_type_check CHECK (type IN ('personal', 'sick', 'annual', 'special', '事假', '病假', '年假', '调休', 'leave', 'sick_leave', 'unpaid'));`);
    console.log("✅ Fixed schema.");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    pool.end();
  }
}

run();