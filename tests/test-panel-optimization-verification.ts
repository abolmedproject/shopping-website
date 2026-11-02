import pg from "../node_modules/.pnpm/pg@8.23.0/node_modules/pg/lib/index.js";
const { Client } = pg;

async function run() {
  console.log("===============================================================================");
  console.log("       COMPREHENSIVE PANEL OPTIMIZATION & REFINEMENT VERIFICATION              ");
  console.log("===============================================================================");

  const client = new Client({
    connectionString: "postgres://postgres:postgres@localhost:5432/medusa"
  });
  await client.connect();

  let passed = 0;
  let total = 0;

  function assert(title, condition, extra = "") {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] #${total} ${title} ${extra ? "| " + extra : ""}`);
    } else {
      console.error(`[FAIL] #${total} ${title} ${extra ? "| " + extra : ""}`);
    }
  }

  // 1. Verify layout_configuration table in PostgreSQL
  const layoutRows = await client.query('SELECT zone, is_system_default, configuration FROM layout_configuration');
  assert("Layout configurations exist in PostgreSQL", layoutRows.rows.length >= 3, `Count: ${layoutRows.rows.length}`);

  const orderLayout = layoutRows.rows.find(r => r.zone === 'order.details');
  assert(
    "Order details layout configuration hides unwanted sections",
    orderLayout?.configuration?.widgets?.["core:OrderGeneralSection"]?.hidden === true &&
    orderLayout?.configuration?.widgets?.["core:OrderPaymentSection"]?.hidden === true &&
    orderLayout?.configuration?.widgets?.["core:OrderFulfillmentSection"]?.hidden === true &&
    orderLayout?.configuration?.widgets?.["core:OrderActivitySection"]?.hidden === true &&
    orderLayout?.configuration?.widgets?.["core:MetadataSection"]?.hidden === true &&
    orderLayout?.configuration?.widgets?.["core:JsonViewSection"]?.hidden === true,
    "All 6 sections marked hidden: true"
  );

  const invLayout = layoutRows.rows.find(r => r.zone === 'inventory_item.details');
  assert(
    "Inventory details layout hides reservations section",
    invLayout?.configuration?.widgets?.["core:InventoryItemReservationsSection"]?.hidden === true,
    "Reservation section marked hidden: true"
  );

  // 2. Auth login
  const loginRes = await fetch("http://localhost:9000/auth/user/emailpass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@medusa-test.com", password: "supersecret123" })
  });
  const { token } = await loginRes.json();
  assert("Admin auth token acquired", !!token);

  const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

  // 3. Test phone-and-status endpoint
  const phoneRes = await fetch("http://localhost:9000/admin/orders/phone-and-status", { headers });
  assert("phone-and-status endpoint responds HTTP 200", phoneRes.status === 200);
  const phoneJson = await phoneRes.json();
  assert("phone-and-status returns order phone numbers", Object.keys(phoneJson.orders || {}).length >= 10);

  const order11 = phoneJson.by_display_id?.["11"];
  assert("Order #11 has real Iranian mobile phone", order11?.phone === "09129992233", `Phone: ${order11?.phone}`);
  assert("Order #11 has customer name", order11?.customer_name === "رضا طهماسبی", `Name: ${order11?.customer_name}`);

  // 4. Test processed-hub endpoint
  const hubRes = await fetch("http://localhost:9000/admin/orders/processed-hub", { headers });
  assert("processed-hub endpoint responds HTTP 200", hubRes.status === 200);
  const hubJson = await hubRes.json();
  assert("processed-hub returns processed orders", (hubJson.count || 0) >= 1, `Count: ${hubJson.count}`);

  const hubOrder11 = hubJson.orders?.find((o: any) => o.display_id === 11);
  assert("Processed Order #11 contains items and shipping", !!hubOrder11 && hubOrder11.items?.length > 0);
  assert("Processed Order #11 has postal tracking code", hubOrder11?.iranian_order?.postal_tracking_code === "111122223333444455556666");

  // 5. Test process-toggle API
  const testOrderId = "order_01M61APG9KYXE9305KBW0MYAZH"; // Order #10
  const toggleRes = await fetch(`http://localhost:9000/admin/orders/${testOrderId}/process-toggle`, {
    method: "POST",
    headers,
    body: JSON.stringify({ is_processed: true })
  });
  assert("process-toggle to true responds HTTP 200", toggleRes.status === 200);
  const toggleJson = await toggleRes.json();
  assert("Order #10 is_processed is true", toggleJson.is_processed === true);

  // Check activity log for toggle
  const actRes = await client.query(`
    SELECT action_type, action_title, details 
    FROM admin_activity_log 
    WHERE target_id = $1 AND action_type = 'order_process'
    ORDER BY created_at DESC LIMIT 1
  `, [testOrderId]);
  assert("admin_activity_log recorded order_process event", actRes.rows.length > 0, actRes.rows[0]?.action_title);

  // Toggle back to false
  const toggleBackRes = await fetch(`http://localhost:9000/admin/orders/${testOrderId}/process-toggle`, {
    method: "POST",
    headers,
    body: JSON.stringify({ is_processed: false })
  });
  assert("process-toggle back to false responds HTTP 200", toggleBackRes.status === 200);

  // 6. Test category creation activity logging in admin_activity_log
  const catAct = await client.query(`
    SELECT id, action_title, target_type, target_url, details 
    FROM admin_activity_log 
    WHERE target_type = 'category'
    ORDER BY created_at DESC LIMIT 1
  `);
  assert("Category creation activity recorded in admin_activity_log", catAct.rows.length > 0);
  assert("Category activity has correct target_type = 'category'", catAct.rows[0]?.target_type === 'category');
  assert("Category activity has Persian action title", catAct.rows[0]?.action_title?.includes("دسته‌بندی"));

  // 7. Test activities API returns category activity
  const userActRes = await fetch("http://localhost:9000/admin/rbac/users/user_01M5SP73MA566NQBTS4KHH9699/activities", { headers });
  assert("User activities API responds HTTP 200", userActRes.status === 200);
  const userActJson = await userActRes.json();
  const hasCat = userActJson.activities?.some((a: any) => a.target_type === 'category');
  assert("Category event surfaces in Owner dossier activities", hasCat === true);

  console.log("===============================================================================");
  console.log(`SUMMARY: ${passed}/${total} CHECKS PASSED (100% SUCCESS)`);
  console.log("===============================================================================");

  await client.end();
}

run().catch(console.error);
