/**
 * wmshr Expense (Reimbursement) Data Flow Test (Stage 1)
 *
 * Implements the confirmed Stage 1 testing scenario for Expense endpoints.
 * 1. Create Flow: Insert full record with multi-field assertions.
 * 2. Update Flow: Change fields of the pending record.
 * 3. Approval Flow: Change status and add approval note.
 * 4. Delete Flow: Teardown.
 */

import http from "node:http";
import assert from "node:assert";

const BASE_URL = "http://127.0.0.1:8789/api/v4/expenses";
const HEALTH_URL = "http://127.0.0.1:8789/api/v4/health";
const ADMIN_EMAIL = "admin@wmshr.com";
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "X-User-Email": ADMIN_EMAIL
};

const LOG = (msg) => console.log(`[Expense-Stage1] ${msg}`);
const ERROR = (msg) => console.error(`[Expense-Stage1] ERROR: ${msg}`);

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const result = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: result });
        } catch (err) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function checkHealth() {
  try {
    const res = await request(HEALTH_URL, { method: "GET" });
    if (res.status !== 200) throw new Error("API not ready");
    LOG("API health check passed.");
    return true;
  } catch (err) {
    throw new Error(`API health check failed: ${err.message}. Make sure server-v4 is running.`);
  }
}

async function runTests() {
  LOG("Starting Expense Data Flow Matrix...");
  await checkHealth();

  const timestamp = Date.now();
  const TEST_ID = `expense-test-${timestamp}`;

  const payload = {
    id: TEST_ID,
    name: `Test Expense ${timestamp}`,
    type: "差旅交通",
    paymentMethod: "Bank Transfer",
    amount: 150.50,
    currency: "USD",
    receiptUrl: "https://example.com/receipt.jpg",
    receiptUrls: ["https://example.com/receipt.jpg"],
    receiptName: "Taxi_Receipt.jpg",
    payerId: 999,
    payerName: "Test Payer",
    paymentTime: new Date().toISOString(),
    status: "pending",
    note: "Initial test note",
    purpose: "payout"
  };

  try {
    // 1. CREATE FLOW
    LOG(`1. Create Flow: Creating expense ${TEST_ID}`);
    const createRes = await request(BASE_URL, {
      method: "POST",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(payload)
    });
    assert.strictEqual(createRes.status, 201, `Create failed: ${JSON.stringify(createRes.data)}`);
    assert(createRes.data.data, "No data returned in response");

    // Retrieve to verify
    const getRes = await request(BASE_URL, {
      method: "GET",
      headers: DEFAULT_HEADERS
    });
    assert.strictEqual(getRes.status, 200, "Get expenses failed");
    let found = getRes.data.data.find(e => e.id === TEST_ID);
    assert(found, "Created expense not found in list");
    assert.strictEqual(found.amount, 150.50, "Amount mismatch");
    assert.strictEqual(found.status, "pending", "Initial status should be pending");
    LOG("✓ Create Flow Passed.");

    // 2. UPDATE FLOW
    LOG(`2. Update Flow: Updating expense ${TEST_ID}`);
    const updatePayload = {
      ...payload,
      amount: 250.00,
      note: "Updated test note"
    };
    const updateRes = await request(`${BASE_URL}/${TEST_ID}`, {
      method: "PUT",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(updatePayload)
    });
    // the v4 router might handle this differently - sometimes put to /expenses doesn't take id param
    // looking at the router grep result: router.put("/expenses/:id", async (req, res) => {
    assert.strictEqual(updateRes.status, 200, `Update failed: ${JSON.stringify(updateRes.data)}`);
    
    // Retrieve again to verify update
    const getRes2 = await request(BASE_URL, { method: "GET", headers: DEFAULT_HEADERS });
    found = getRes2.data.data.find(e => e.id === TEST_ID);
    assert.strictEqual(found.amount, 250.00, "Update amount mismatch");
    assert.strictEqual(found.note, "Updated test note", "Update note mismatch");
    LOG("✓ Update Flow Passed.");

    // 3. APPROVAL FLOW (Status Machine Shift)
    LOG(`3. Approval Flow: Approving expense ${TEST_ID}`);
    const approvalPayload = {
      ...found,
      status: "approved",
      approvalNote: "Approved by testing agent",
      approvedBy: "Admin Tester",
      approvedTime: new Date().toISOString()
    };
    const approveRes = await request(`${BASE_URL}/${TEST_ID}`, {
      method: "PUT",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(approvalPayload)
    });
    assert.strictEqual(approveRes.status, 200, `Approve failed: ${JSON.stringify(approveRes.data)}`);

    const getRes3 = await request(BASE_URL, { method: "GET", headers: DEFAULT_HEADERS });
    found = getRes3.data.data.find(e => e.id === TEST_ID);
    assert.strictEqual(found.status, "approved", "Status was not changed to approved");
    assert.strictEqual(found.approvalNote, "Approved by testing agent", "Approval note mismatch");
    LOG("✓ Approval Flow Passed.");

    // 4. DELETE FLOW
    LOG(`4. Delete Flow: Removing expense ${TEST_ID}`);
    const deleteRes = await request(`${BASE_URL}/${TEST_ID}`, {
      method: "DELETE",
      headers: DEFAULT_HEADERS
    });
    assert.strictEqual(deleteRes.status, 200, `Delete failed: ${JSON.stringify(deleteRes.data)}`);

    const getRes4 = await request(BASE_URL, { method: "GET", headers: DEFAULT_HEADERS });
    found = getRes4.data.data.find(e => e.id === TEST_ID);
    assert(!found, "Expense was not deleted successfully");
    LOG("✓ Delete Flow Passed.");

    LOG("\n==== ALL STAGE 1 TESTS PASSED ====");
  } catch (err) {
    ERROR(`Test failed: ${err.message}`);
    process.exit(1);
  }
}

runTests();
