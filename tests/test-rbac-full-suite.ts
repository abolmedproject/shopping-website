
interface TestResult {
  num: number;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

async function login(email: string, password = "supersecret123") {
  const res = await fetch("http://127.0.0.1:9000/auth/user/emailpass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.token as string;
}

async function run() {
  console.log("==========================================================");
  console.log("   MEDUSA 2.0 RBAC DEEP FUNCTIONAL TEST SUITE STARTING   ");
  console.log("==========================================================\n");

  // 1. Authenticate All Personas
  const ownerToken = await login("admin@medusa-test.com");
  const mgrToken = await login("manager@medusa-test.com");
  const prodToken = await login("product.staff@medusa-test.com");
  const financeToken = await login("finance.staff@medusa-test.com");
  const supportToken = await login("support.staff@medusa-test.com");

  console.log("Authentication Status:");
  console.log("  Owner:", Boolean(ownerToken));
  console.log("  Manager:", Boolean(mgrToken));
  console.log("  Product Staff:", Boolean(prodToken));
  console.log("  Finance Staff:", Boolean(financeToken));
  console.log("  Support Staff:", Boolean(supportToken));
  console.log("");

  let testCount = 0;
  const assert = (name: string, expected: string, actual: string, condition: boolean, details?: string) => {
    testCount++;
    const passed = condition;
    results.push({ num: testCount, name, expected, actual, passed, details });
    const mark = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`[${mark}] Test ${testCount}: ${name} | Expected: ${expected} -> Actual: ${actual}`);
    if (!passed && details) {
      console.log(`       Details: ${details}`);
    }
  };

  // ----------------------------------------------------
  // SECTION 1: OWNER PRIVILEGES & INVIOLABILITY
  // ----------------------------------------------------
  console.log("\n--- SECTION 1: OWNER PRIVILEGES & INVIOLABILITY ---");

  // T1: Owner can list all users
  const t1 = await fetch("http://127.0.0.1:9000/admin/rbac/users", {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  const t1Data = await t1.json();
  assert("Owner can list users", "200 OK with users array", `${t1.status} (${t1Data.users?.length || 0} users)`, t1.status === 200 && Array.isArray(t1Data.users));

  // T2: Owner cannot suspend himself
  const t2 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_01M5SP73MA566NQBTS4KHH9699", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ status: "suspended" })
  });
  assert("Owner self-suspend guard", "400 Bad Request", String(t2.status), t2.status === 400);

  // T3: Owner cannot delete himself
  const t3 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_01M5SP73MA566NQBTS4KHH9699", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  assert("Owner self-delete guard", "400 Bad Request", String(t3.status), t3.status === 400);

  // T4: Owner can view any user's activity log
  const t4 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_manager_01/activities", {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  const t4Data = await t4.json();
  assert("Owner views Manager activity", "200 OK with activities", `${t4.status} (${t4Data.activities_count} activities)`, t4.status === 200);

  // ----------------------------------------------------
  // SECTION 2: MANAGER BOUNDARIES & GOVERNANCE
  // ----------------------------------------------------
  console.log("\n--- SECTION 2: MANAGER BOUNDARIES & GOVERNANCE ---");

  // T5: Manager CANNOT view Owner's activity
  const t5 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_01M5SP73MA566NQBTS4KHH9699/activities", {
    headers: { Authorization: `Bearer ${mgrToken}` }
  });
  assert("Manager blocked from Owner activity", "403 Forbidden", String(t5.status), t5.status === 403);

  // T6: Manager CAN view Staff activity
  const t6 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_order_01/activities", {
    headers: { Authorization: `Bearer ${mgrToken}` }
  });
  assert("Manager views Staff activity", "200 OK", String(t6.status), t6.status === 200);

  // T7: Manager CANNOT suspend Owner
  const t7 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_01M5SP73MA566NQBTS4KHH9699", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({ status: "suspended" })
  });
  assert("Manager cannot suspend Owner", "403 Forbidden", String(t7.status), t7.status === 403);

  // T8: Manager CANNOT edit granular permissions
  const t8 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_order_01", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({ custom_permissions: ["*"] })
  });
  assert("Manager cannot edit granular permissions", "403 Forbidden", String(t8.status), t8.status === 403);

  // T9: Manager CANNOT invite an Owner
  const t9 = await fetch("http://127.0.0.1:9000/admin/rbac/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({ email: "illegal.owner@test.com", role: "owner" })
  });
  assert("Manager cannot invite Owner", "403 Forbidden", String(t9.status), t9.status === 403);

  // T10: Manager CANNOT invite another Manager
  const t10 = await fetch("http://127.0.0.1:9000/admin/rbac/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({ email: "illegal.manager@test.com", role: "manager" })
  });
  assert("Manager cannot invite another Manager", "403 Forbidden", String(t10.status), t10.status === 403);

  // T11: Manager invite blocked when users.invite is revoked by Owner -> 403
  const mgrPerms = [
    "products.view", "products.manage", "products.sku", "inventory.view", "inventory.manage",
    "orders.view", "orders.manage", "customers.view", "customers.manage", "analytics.view",
    "users.view", "users.manage"
  ];
  await fetch("http://127.0.0.1:9000/admin/rbac/users/user_manager_01", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ custom_permissions: mgrPerms })
  });
  const t11 = await fetch("http://127.0.0.1:9000/admin/rbac/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({ email: "staff.blocked@test.com", role: "staff", preset: "order_specialist" })
  });
  assert("Manager invite blocked when users.invite revoked", "403 Forbidden", String(t11.status), t11.status === 403);

  // Restore users.invite to Manager
  await fetch("http://127.0.0.1:9000/admin/rbac/users/user_manager_01", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ custom_permissions: [...mgrPerms, "users.invite"] })
  });

  // T12: Manager invite succeeds when can_invite_users = true with allowed preset
  const t12Email = `test.staff.${Date.now()}@test.com`;
  const t12 = await fetch("http://127.0.0.1:9000/admin/rbac/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({ email: t12Email, first_name: "تست", last_name: "مدیر", role: "staff", preset: "order_specialist" })
  });
  const t12Data = await t12.json();
  assert("Manager invite allowed when users.invite granted", "201 Created", String(t12.status), t12.status === 201);
  const createdStaffId = t12Data.user?.id;

  // ----------------------------------------------------
  // SECTION 3: STAFF BOUNDARIES & PRIVACY
  // ----------------------------------------------------
  console.log("\n--- SECTION 3: STAFF BOUNDARIES & PRIVACY ---");

  // T13: Staff CANNOT invite anyone
  const t13 = await fetch("http://127.0.0.1:9000/admin/rbac/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${supportToken}` },
    body: JSON.stringify({ email: "staff.illegal@test.com", role: "staff" })
  });
  assert("Staff cannot invite users", "403 Forbidden", String(t13.status), t13.status === 403);

  // T14: Staff CANNOT suspend anyone
  const t14 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_order_01", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${supportToken}` },
    body: JSON.stringify({ status: "suspended" })
  });
  assert("Staff cannot suspend users", "403 Forbidden", String(t14.status), t14.status === 403);

  // T15: Staff CANNOT view another user's activity log
  const t15 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_order_01/activities", {
    headers: { Authorization: `Bearer ${supportToken}` }
  });
  assert("Staff cannot view other users activities", "403 Forbidden", String(t15.status), t15.status === 403);

  // T16: Staff CAN view their OWN activity log
  const t16 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_support_01/activities", {
    headers: { Authorization: `Bearer ${supportToken}` }
  });
  assert("Staff can view own activity log", "200 OK", String(t16.status), t16.status === 200);

  // ----------------------------------------------------
  // SECTION 4: GRANULAR ROUTE PERMISSIONS ENFORCEMENT
  // ----------------------------------------------------
  console.log("\n--- SECTION 4: GRANULAR ROUTE PERMISSIONS ENFORCEMENT ---");

  // T17: Support Staff has NO analytics.view -> fashion-analytics must be 403
  const t17 = await fetch("http://127.0.0.1:9000/admin/fashion-analytics", {
    headers: { Authorization: `Bearer ${supportToken}` }
  });
  assert("Support staff blocked from fashion-analytics", "403 Forbidden", String(t17.status), t17.status === 403);

  // T18: Finance Staff HAS analytics.view -> fashion-analytics must be 200
  const t18 = await fetch("http://127.0.0.1:9000/admin/fashion-analytics", {
    headers: { Authorization: `Bearer ${financeToken}` }
  });
  const t18Data = await t18.json();
  assert("Finance staff allowed into fashion-analytics", "200 OK with financials", `${t18.status} (financials: ${t18Data.kpis?.can_view_financials})`, t18.status === 200 && t18Data.kpis?.can_view_financials === true);

  // T19: Product Staff CANNOT modify price without products.price permission
  const t19 = await fetch("http://127.0.0.1:9000/admin/products/price/test", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${prodToken}` },
    body: JSON.stringify({ amount: 999999 })
  });
  assert("Product staff blocked from price updates", "403 Forbidden", String(t19.status), t19.status === 403);

  // T20: Support Staff CANNOT create campaign without campaigns.manage
  const t20 = await fetch("http://127.0.0.1:9000/admin/campaign-analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${supportToken}` },
    body: JSON.stringify({ title: "Unauthorized Campaign", cost: 1000000 })
  });
  assert("Support staff blocked from campaign creation", "403 Forbidden", String(t20.status), t20.status === 403);

  // ----------------------------------------------------
  // SECTION 5: ACCOUNT SUSPENSION & REACTIVATION LIFECYCLE
  // ----------------------------------------------------
  console.log("\n--- SECTION 5: ACCOUNT SUSPENSION & REACTIVATION LIFECYCLE ---");

  // T21: Suspend Product Staff
  const t21 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_product_01", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ status: "suspended" })
  });
  assert("Owner suspends Product Staff", "200 OK", String(t21.status), t21.status === 200);

  // T22: Suspended Product Staff blocked from /admin/products
  const t22 = await fetch("http://127.0.0.1:9000/admin/products", {
    headers: { Authorization: `Bearer ${prodToken}` }
  });
  assert("Suspended Product Staff blocked from products", "403 Forbidden (ACCOUNT_SUSPENDED)", String(t22.status), t22.status === 403);

  // T23: Suspended Product Staff blocked from /admin/orders
  const t23 = await fetch("http://127.0.0.1:9000/admin/orders", {
    headers: { Authorization: `Bearer ${prodToken}` }
  });
  assert("Suspended Product Staff blocked from orders", "403 Forbidden", String(t23.status), t23.status === 403);

  // T24: Reactivate Product Staff
  const t24 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_product_01", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ status: "active" })
  });
  assert("Owner reactivates Product Staff", "200 OK", String(t24.status), t24.status === 200);

  // T25: Reactivated Product Staff can access /admin/products again
  const t25 = await fetch("http://127.0.0.1:9000/admin/products", {
    headers: { Authorization: `Bearer ${prodToken}` }
  });
  assert("Reactivated Product Staff accesses products", "200 OK", String(t25.status), t25.status === 200);

  // ----------------------------------------------------
  // SECTION 6: USER DELETION & AUTH IDENTITY PURGING
  // ----------------------------------------------------
  console.log("\n--- SECTION 6: USER DELETION & AUTH IDENTITY PURGING ---");

  if (createdStaffId) {
    // Authenticate the newly created staff user
    const newStaffToken = await login(t12Email, "supersecret123");
    assert("Newly created staff can login", "valid token", String(Boolean(newStaffToken)), Boolean(newStaffToken));

    // T26: Owner deletes the staff user
    const t26 = await fetch(`http://127.0.0.1:9000/admin/rbac/users/${createdStaffId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert("Owner deletes staff user", "200 OK", String(t26.status), t26.status === 200);

    // T27: Deleted staff user cannot login anymore
    const postDeleteToken = await login(t12Email, "supersecret123");
    assert("Deleted staff cannot authenticate", "null token (rejected)", String(Boolean(postDeleteToken)), postDeleteToken === null);

    // T28: Old token of deleted user is rejected by middleware
    if (newStaffToken) {
      const t28 = await fetch("http://127.0.0.1:9000/admin/orders", {
        headers: { Authorization: `Bearer ${newStaffToken}` }
      });
      assert("Deleted staff old token rejected", "401 or 403", String(t28.status), t28.status === 401 || t28.status === 403);
    }
  }


  // ----------------------------------------------------
  // SECTION 7: ADVANCED EDGE CASES & PEER MANAGER GUARDS
  // ----------------------------------------------------
  console.log("\n--- SECTION 7: ADVANCED EDGE CASES & PEER MANAGER GUARDS ---");

  // T30: Manager CANNOT delete another Manager
  // Find a manager or promote one
  const t30 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_rbac_oqs8fbkxj", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${mgrToken}` }
  });
  assert("Manager cannot delete peer Manager", "403 Forbidden", String(t30.status), t30.status === 403);

  // T31: Manager CANNOT edit peer Manager's info
  const t31 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_rbac_oqs8fbkxj", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({ first_name: "هک شده" })
  });
  assert("Manager cannot edit peer Manager", "403 Forbidden", String(t31.status), t31.status === 403);

  // T32: Staff CANNOT edit anyone's info
  const t32 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_product_01", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${supportToken}` },
    body: JSON.stringify({ first_name: "تلاش غیرمجاز" })
  });
  assert("Staff cannot edit any user info", "403 Forbidden", String(t32.status), t32.status === 403);

  // T33: Support staff blocked from Fast Product Create (needs products.manage)
  const t33 = await fetch("http://127.0.0.1:9000/admin/fast-product-create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${supportToken}` },
    body: JSON.stringify({ title: "تیشرت غیرمجاز", retail_price: 100000 })
  });
  assert("Support staff blocked from Fast Product Create", "403 Forbidden", String(t33.status), t33.status === 403);

  // T34: Product staff CAN access Fast Product Create GET
  const t34 = await fetch("http://127.0.0.1:9000/admin/fast-product-create", {
    headers: { Authorization: `Bearer ${prodToken}` }
  });
  assert("Product staff accesses Fast Product Create GET", "200 OK", String(t34.status), t34.status === 200);

  // T35: Support staff blocked from Size Exchange POST (needs orders.exchange or orders.manage)
  const t35 = await fetch("http://127.0.0.1:9000/admin/orders/order_01M5WY83PGPDDAK9W9D4R1W5FV/exchange-size", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${supportToken}` },
    body: JSON.stringify({ item_id: "test", new_variant_id: "test" })
  });
  assert("Support staff blocked from Size Exchange", "403 Forbidden", String(t35.status), t35.status === 403);

  // T36: Authenticate Order Staff
  const orderStaffToken = await login("order.staff@medusa-test.com");
  assert("Order staff authenticated", "valid token", String(Boolean(orderStaffToken)), Boolean(orderStaffToken));

  // T37: Order staff CAN access Postal Export (has orders.view)
  const t37 = await fetch("http://127.0.0.1:9000/admin/orders/export-postal", {
    headers: { Authorization: `Bearer ${orderStaffToken}` }
  });
  assert("Order staff accesses Postal Export", "200 OK", String(t37.status), t37.status === 200);

  // T38: User cannot suspend themselves
  const t38 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_manager_01", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({ status: "suspended" })
  });
  assert("Manager cannot suspend themselves", "400 Bad Request", String(t38.status), t38.status === 400);

  // T39: User cannot delete themselves
  const t39 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_manager_01", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${mgrToken}` }
  });
  assert("Manager cannot delete themselves", "400 Bad Request", String(t39.status), t39.status === 400);

  // T40: Real Activity Log entry verified after action
  const t40 = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_manager_01/activities", {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  const t40Data = await t40.json();
  const hasValidLogs = Array.isArray(t40Data.activities) && t40Data.activities.length > 0 && Boolean(t40Data.activities[0].shamsi_full);
  assert("Activity log contains Shamsi timestamps & actionable links", "true with Shamsi date", String(hasValidLogs), hasValidLogs);

  // ----------------------------------------------------
  // SUMMARY REPORT
  // ----------------------------------------------------
  console.log("\n==========================================================");
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = total - passedCount;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log("==========================================================");
}

run();
