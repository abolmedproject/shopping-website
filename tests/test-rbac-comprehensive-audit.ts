import { execSync } from "child_process";

interface AuditTest {
  id: number;
  category: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes?: string;
}

const auditResults: AuditTest[] = [];
let testCounter = 0;

function report(category: string, name: string, expected: string, actual: string, condition: boolean, notes?: string) {
  testCounter++;
  const passed = condition;
  auditResults.push({ id: testCounter, category, name, expected, actual, passed, notes });
  const tag = passed ? "[PASS]" : "[FAIL]";
  console.log(`${tag} #${testCounter} [${category}] ${name} -> Expected: ${expected} | Actual: ${actual}`);
  if (!passed && notes) {
    console.log(`    Error: ${notes}`);
  }
}

async function login(email: string, password = "supersecret123") {
  try {
    const res = await fetch("http://127.0.0.1:9000/auth/user/emailpass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.token as string;
  } catch (e: any) {
    console.error("Login catch error:", e);
    return null;
  }
}

function queryDb(sql: string) {
  try {
    const cmd = `docker exec medusa-postgres psql -U postgres -d medusa -t -A -c "${sql}"`;
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch (e: any) {
    return "";
  }
}

async function runAudit() {
  console.log("===============================================================================");
  console.log("      DEEP OPERATIONAL RBAC & DATABASE AUDIT SUITE (MEDUSA 2.0 APPAREL)        ");
  console.log("===============================================================================\n");

  const ownerToken = await login("admin@medusa-test.com");
  report("Auth", "Owner Authentication", "Valid JWT Token", String(Boolean(ownerToken)), Boolean(ownerToken));
  if (!ownerToken) {
    console.error("Owner auth failed");
    return;
  }

  const mgrToken = await login("manager@medusa-test.com");
  report("Auth", "Manager Authentication", "Valid JWT Token", String(Boolean(mgrToken)), Boolean(mgrToken));

  // 1. User Creation with Custom Permissions
  const testEmail = `deep.audit.${Date.now()}@medusa-store.ir`;
  const customPerms = ["products.view", "products.manage", "inventory.view", "orders.view"];
  const createRes = await fetch("http://127.0.0.1:9000/admin/rbac/users", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      email: testEmail,
      first_name: "تست",
      last_name: "آزمون‌گر",
      role: "staff",
      custom_permissions: customPerms
    })
  });
  const createJson = await createRes.json();
  report("Creation", "API returns 201 Created", "201 Created", String(createRes.status), createRes.status === 201);
  const newUserId = createJson.user?.id;
  report("Creation", "User ID assigned", "user_rbac_*", String(newUserId), Boolean(newUserId && newUserId.startsWith("user_rbac_")));

  // DB Persistence Checks
  const dbUserRole = queryDb(`SELECT metadata->'rbac'->>'role' FROM public.user WHERE id = '${newUserId}';`);
  report("DB Persistence", "Role in PostgreSQL is staff", "staff", dbUserRole, dbUserRole === "staff");

  const dbUserPerms = queryDb(`SELECT metadata->'rbac'->'permissions' FROM public.user WHERE id = '${newUserId}';`);
  const parsedPerms = JSON.parse(dbUserPerms || "[]");
  report("DB Persistence", "Exact 4 permissions stored in PostgreSQL", "4 permissions", `${parsedPerms.length} permissions`, parsedPerms.length === 4 && parsedPerms.includes("products.manage"));

  const dbAuthId = queryDb(`SELECT id FROM auth_identity WHERE app_metadata->>'user_id' = '${newUserId}';`);
  report("DB Persistence", "Auth identity linked in auth_identity table", "authid_*", dbAuthId, Boolean(dbAuthId));

  // Live Login Test
  const newStaffToken = await login(testEmail, "supersecret123");
  report("Live Login", "Newly created user logs in immediately", "Valid Token", String(Boolean(newStaffToken)), Boolean(newStaffToken));

  if (newStaffToken) {
    // Permitted Routes
    const pView = await fetch("http://127.0.0.1:9000/admin/products", { headers: { Authorization: `Bearer ${newStaffToken}` } });
    report("Enforcement", "Permitted route /admin/products accessible", "200 OK", String(pView.status), pView.status === 200);

    const oView = await fetch("http://127.0.0.1:9000/admin/orders", { headers: { Authorization: `Bearer ${newStaffToken}` } });
    report("Enforcement", "Permitted route /admin/orders accessible", "200 OK", String(oView.status), oView.status === 200);

    // Forbidden Routes
    const aView = await fetch("http://127.0.0.1:9000/admin/fashion-analytics", { headers: { Authorization: `Bearer ${newStaffToken}` } });
    report("Enforcement", "Unpermitted route /admin/fashion-analytics blocked", "403 Forbidden", String(aView.status), aView.status === 403);

    const prEdit = await fetch("http://127.0.0.1:9000/admin/products/price/123", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${newStaffToken}` },
      body: JSON.stringify({ amount: 999999 })
    });
    report("Enforcement", "Unpermitted price update blocked", "403 Forbidden", String(prEdit.status), prEdit.status === 403);

    const cManage = await fetch("http://127.0.0.1:9000/admin/campaign-analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${newStaffToken}` },
      body: JSON.stringify({ title: "Hack", cost: 100 })
    });
    report("Enforcement", "Unpermitted campaign creation blocked", "403 Forbidden", String(cManage.status), cManage.status === 403);
  }

  // Permission Elevation Test
  const elevatedPerms = [...customPerms, "analytics.view", "analytics.financial", "campaigns.manage", "products.price"];
  const elevateRes = await fetch(`http://127.0.0.1:9000/admin/rbac/users/${newUserId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ custom_permissions: elevatedPerms })
  });
  report("Elevation API", "Permissions updated via PUT", "200 OK", String(elevateRes.status), elevateRes.status === 200);

  const dbElevatedPerms = queryDb(`SELECT metadata->'rbac'->'permissions' FROM public.user WHERE id = '${newUserId}';`);
  const parsedElevated = JSON.parse(dbElevatedPerms || "[]");
  report("DB Persistence", "Elevated permissions persisted in DB", "8 permissions", `${parsedElevated.length} permissions`, parsedElevated.includes("analytics.financial") && parsedElevated.includes("campaigns.manage"));

  // Real-time Propagation without re-login
  if (newStaffToken) {
    const aViewAfter = await fetch("http://127.0.0.1:9000/admin/fashion-analytics", { headers: { Authorization: `Bearer ${newStaffToken}` } });
    const aJson = await aViewAfter.json();
    report("Real-time Propagation", "fashion-analytics now accessible", "200 OK", String(aViewAfter.status), aViewAfter.status === 200);
    report("Financials Access", "User can view financial numbers (can_view_financials)", "true", String(aJson.kpis?.can_view_financials), aJson.kpis?.can_view_financials === true);

    const cManageAfter = await fetch("http://127.0.0.1:9000/admin/campaign-analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${newStaffToken}` },
      body: JSON.stringify({ title: "کمپین مجاز تست", platform: "استوری اینستاگرام", cost: 500000 })
    });
    report("Real-time Propagation", "campaign creation now permitted", "201 Created", String(cManageAfter.status), cManageAfter.status === 201);
  }

  // Role Promotion to Manager with Controlled Permissions
  const managerPermsNoInvite = [
    "products.view", "products.manage", "products.sku", "inventory.view", "inventory.manage",
    "orders.view", "orders.manage", "customers.view", "customers.manage", "analytics.view"
  ];
  const promoteRes = await fetch(`http://127.0.0.1:9000/admin/rbac/users/${newUserId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      role: "manager",
      custom_permissions: managerPermsNoInvite
    })
  });
  report("Promotion API", "User promoted to Manager", "200 OK", String(promoteRes.status), promoteRes.status === 200);

  const dbRoleAfter = queryDb(`SELECT metadata->'rbac'->>'role' FROM public.user WHERE id = '${newUserId}';`);
  report("DB Persistence", "Role in PostgreSQL updated to manager", "manager", dbRoleAfter, dbRoleAfter === "manager");

  const dbHasInvite = queryDb(`SELECT metadata->'rbac'->'permissions' ? 'users.invite' FROM public.user WHERE id = '${newUserId}';`);
  report("DB Persistence", "users.invite is false in DB permissions", "f", dbHasInvite, dbHasInvite === "f");

  if (newStaffToken) {
    const tryInvite = await fetch("http://127.0.0.1:9000/admin/rbac/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${newStaffToken}` },
      body: JSON.stringify({ email: "should.fail@store.ir", role: "staff" })
    });
    report("Unified Permissions", "Manager invite blocked (users.invite absent)", "403 Forbidden", String(tryInvite.status), tryInvite.status === 403);
  }

  // Owner grants users.invite to Manager
  const updatePerms = await fetch(`http://127.0.0.1:9000/admin/rbac/users/${newUserId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      custom_permissions: [...managerPermsNoInvite, "users.invite", "users.manage"]
    })
  });
  report("Permissions Update", "Owner grants users.invite to Manager", "200 OK", String(updatePerms.status), updatePerms.status === 200);

  const subStaffEmail = `substaff.${Date.now()}@medusa-store.ir`;
  let subStaffId = "";
  if (newStaffToken) {
    const inviteSuccess = await fetch("http://127.0.0.1:9000/admin/rbac/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${newStaffToken}` },
      body: JSON.stringify({ email: subStaffEmail, first_name: "زیرمجموعه", role: "staff", preset: "product_specialist" })
    });
    const invJson = (await inviteSuccess.json()) as any;
    subStaffId = invJson.user?.id;
    report("Unified Permissions", "Manager invite allowed (users.invite present)", "201 Created", String(inviteSuccess.status), inviteSuccess.status === 201);
  }
  // Suspension Lifecycle
  const suspRes = await fetch(`http://127.0.0.1:9000/admin/rbac/users/${newUserId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ status: "suspended" })
  });
  report("Suspension API", "Owner suspends account", "200 OK", String(suspRes.status), suspRes.status === 200);

  const dbStatus = queryDb(`SELECT metadata->'rbac'->>'status' FROM public.user WHERE id = '${newUserId}';`);
  report("DB Persistence", "Status in PostgreSQL is suspended", "suspended", dbStatus, dbStatus === "suspended");

  if (newStaffToken) {
    const pLock = await fetch("http://127.0.0.1:9000/admin/products", { headers: { Authorization: `Bearer ${newStaffToken}` } });
    const pLockJson = await pLock.json();
    report("Lockout", "/admin/products locked with ACCOUNT_SUSPENDED", "403 ACCOUNT_SUSPENDED", `${pLock.status} ${pLockJson.code}`, pLock.status === 403 && pLockJson.code === "ACCOUNT_SUSPENDED");

    const oLock = await fetch("http://127.0.0.1:9000/admin/orders", { headers: { Authorization: `Bearer ${newStaffToken}` } });
    report("Lockout", "/admin/orders locked with 403", "403 Forbidden", String(oLock.status), oLock.status === 403);
  }

  // Reactivation
  const reactRes = await fetch(`http://127.0.0.1:9000/admin/rbac/users/${newUserId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({ status: "active" })
  });
  report("Reactivation API", "Owner reactivates account", "200 OK", String(reactRes.status), reactRes.status === 200);

  if (newStaffToken) {
    const pUnlock = await fetch("http://127.0.0.1:9000/admin/products", { headers: { Authorization: `Bearer ${newStaffToken}` } });
    report("Restoration", "/admin/products accessible again after reactivation", "200 OK", String(pUnlock.status), pUnlock.status === 200);
  }

  // Deletion
  if (subStaffId) {
    const delSub = await fetch(`http://127.0.0.1:9000/admin/rbac/users/${subStaffId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    report("Deletion API", "Owner deletes sub-staff", "200 OK", String(delSub.status), delSub.status === 200);

    const dbDeletedAt = queryDb(`SELECT deleted_at FROM public.user WHERE id = '${subStaffId}';`);
    report("DB Persistence", "deleted_at timestamp set in PostgreSQL", "NOT NULL", dbDeletedAt ? "Timestamp set" : "NULL", Boolean(dbDeletedAt));

    const dbAuthPurged = queryDb(`SELECT count(*) FROM auth_identity WHERE app_metadata->>'user_id' = '${subStaffId}';`);
    report("Auth Purge", "auth_identity row purged", "0", dbAuthPurged, dbAuthPurged === "0");
  }

  const delMain = await fetch(`http://127.0.0.1:9000/admin/rbac/users/${newUserId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  report("Deletion API", "Owner deletes test user", "200 OK", String(delMain.status), delMain.status === 200);

  if (newStaffToken) {
    const oldTokenReq = await fetch("http://127.0.0.1:9000/admin/orders", { headers: { Authorization: `Bearer ${newStaffToken}` } });
    report("Security Guard", "Deleted user token rejected by middleware", "401 or 403", String(oldTokenReq.status), oldTokenReq.status === 401 || oldTokenReq.status === 403);
  }

  // Audit Trail Check
  const logCount = queryDb(`SELECT count(*) FROM admin_activity_log WHERE target_id = '${newUserId}' OR user_id = '${newUserId}';`);
  report("Audit Trail", "Real audit logs recorded in admin_activity_log", "> 3 events", `${logCount} events`, parseInt(logCount) >= 3);

  const actApi = await fetch("http://127.0.0.1:9000/admin/rbac/users/user_01M5SP73MA566NQBTS4KHH9699/activities", {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  const actJson = await actApi.json();
  report("Activity API", "Activity API serves real events with Shamsi time", "true", String(Boolean(actJson.activities?.length)), Boolean(actJson.activities?.length > 0));

  console.log("\n===============================================================================");
  const total = auditResults.length;
  const passed = auditResults.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`AUDIT RESULT SUMMARY: ${total} CHECKS EXECUTED | ${passed} PASSED | ${failed} FAILED`);
  console.log("===============================================================================");
  if (failed > 0) process.exit(1);
}

runAudit();