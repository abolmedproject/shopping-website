import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const ALL_PERMISSIONS = [
  // Products
  { id: "products.view", label: "مشاهده کاتالوگ لباس‌ها و تنوع‌ها", module: "products" },
  { id: "products.manage", label: "ایجاد و ویرایش مشخصات، عکس‌ها و تنوع‌ها", module: "products" },
  { id: "products.price", label: "تغییر و ویرایش قیمت محصولات به تومان", module: "products", is_sensitive: true },
  { id: "products.delete", label: "حذف محصولات از فروشگاه", module: "products", is_sensitive: true },
  { id: "products.sku", label: "تولید خودکار شناسه کالا (SKU) و بارکد", module: "products" },
  // Inventory
  { id: "inventory.view", label: "مشاهده موجودی انبار مرکزی و تنوع‌ها", module: "inventory" },
  { id: "inventory.manage", label: "مدیریت و اصلاح موجودی انبار", module: "inventory" },
  // Orders
  { id: "orders.view", label: "مشاهده لیست و جزئیات سفارش‌ها", module: "orders" },
  { id: "orders.manage", label: "پردازش سفارش‌ها و ثبت کد رهگیری پستی", module: "orders" },
  { id: "orders.create", label: "ثبت سریع سفارش پوشاک (دایرکت / تلفنی)", module: "orders" },
  { id: "orders.exchange", label: "ثبت تعویض سایز تک‌مرحله‌ای پوشاک", module: "orders" },
  { id: "orders.export", label: "دریافت فایل اکسل مرسولات پستی (XLSX)", module: "orders" },
  { id: "orders.refund", label: "صدور بازپرداخت و مرجوعی وجه", module: "orders", is_sensitive: true },
  // Customers
  { id: "customers.view", label: "مشاهده اطلاعات و آدرس مشتریان", module: "customers" },
  { id: "customers.manage", label: "مدیریت و ویرایش پروفایل مشتریان", module: "customers" },
  // Financials
  { id: "analytics.view", label: "مشاهده آمار و تحلیل فروش پوشاک", module: "analytics" },
  { id: "analytics.financial", label: "مشاهده گزارش‌های حساس مالی، درآمد و سود", module: "analytics", is_sensitive: true },
  // Marketing & Campaigns
  { id: "campaigns.view", label: "مشاهده گزارش‌های بازگشت سرمایه تبلیغات (ROAS)", module: "campaigns" },
  { id: "campaigns.manage", label: "ثبت و مدیریت کمپین تبلیغاتی بلاگرها", module: "campaigns" },
  { id: "promotions.manage", label: "ایجاد و مدیریت کدهای تخفیف", module: "promotions" },
  // Users & Security
  { id: "users.view", label: "مشاهده اعضای تیم و کاربران پنل", module: "users" },
  { id: "users.invite", label: "دعوت همکار جدید به پنل مدیریت", module: "users", is_sensitive: true },
  { id: "users.manage", label: "تعلیق و ویرایش وضعیت همکاران", module: "users", is_sensitive: true },
  { id: "roles.configure", label: "مدیریت دسترسی‌ها و اختیارات امنیتی (مخصوص مالک)", module: "security", is_sensitive: true }
]

export const PRESETS = {
  manager: {
    id: "manager",
    title: "مدیر اجرایی فروشگاه",
    description: "نظارت بر عملیات روزانه فروشگاه، سفارشات، کاتالوگ لباس‌ها، مشتریان و پرسنل",
    permissions: [
      "products.view", "products.manage", "products.sku",
      "inventory.view", "inventory.manage",
      "orders.view", "orders.manage", "orders.create", "orders.exchange", "orders.export",
      "customers.view", "customers.manage",
      "analytics.view",
      "campaigns.view",
      "users.view", "users.invite"
    ]
  },
  product_specialist: {
    id: "product_specialist",
    title: "کارشناس محصولات",
    description: "مدیریت لباس‌ها، تنوع‌های رنگ/سایز، دسته‌بندی‌ها و موجودی بدون دسترسی به قیمت و گزارش‌های مالی",
    permissions: ["products.view", "products.manage", "products.sku", "inventory.view", "inventory.manage"]
  },
  order_specialist: {
    id: "order_specialist",
    title: "کارشناس سفارش‌ها",
    description: "مشاهده و پردازش سفارش‌ها، پیگیری ارسال پستی، ثبت سفارش دایرکت، تعویض سایز و خروجی اکسل",
    permissions: ["orders.view", "orders.manage", "orders.create", "orders.exchange", "orders.export", "customers.view"]
  },
  customer_support: {
    id: "customer_support",
    title: "پشتیبان مشتریان",
    description: "پاسخ‌گویی به خریداران، مشاهده وضعیت سفارش‌ها و مدیریت پروفایل مشتری",
    permissions: ["customers.view", "customers.manage", "orders.view"]
  },
  accountant: {
    id: "accountant",
    title: "حسابدار و امور مالی",
    description: "دسترسی به گزارش‌های مالی و تحلیلی، سود ناخالص واقعی (COGS)، فاکتورها و بازگشت سرمایه تبلیغات",
    permissions: ["analytics.view", "analytics.financial", "orders.view", "products.view", "campaigns.view"]
  },
  marketing_manager: {
    id: "marketing_manager",
    title: "مدیر تبلیغات و بازاریابی",
    description: "ثبت و پایش کمپین‌های بلاگرها و اینفلوئنسرها، بررسی ROAS، کدهای تخفیف و تحلیل فروش",
    permissions: ["campaigns.view", "campaigns.manage", "promotions.manage", "analytics.view", "orders.view"]
  }
}

async function getCallerRbac(req: MedusaRequest, pgConnection: any) {
  const userId = (req as any).auth_context?.actor_id || (req as any).user?.id

  if (userId) {
    const res = await pgConnection.raw('SELECT id, email, first_name, last_name, metadata FROM public."user" WHERE id = ? AND deleted_at IS NULL', [userId])
    if (res?.rows?.[0]) {
      const user = res.rows[0]
      const rbac = user.metadata?.rbac || {
        role: user.email === "admin@medusa-test.com" ? "owner" : "staff",
        role_title: user.email === "admin@medusa-test.com" ? "مالک فروشگاه (Store Owner)" : "کارمند فروشگاه",
        status: "active",
        permissions: user.email === "admin@medusa-test.com" ? ["*"] : []
      }
      return { user, rbac }
    }
  }

  return { user: null, rbac: { role: "guest", status: "suspended", permissions: [] } }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { user: callerUser, rbac: callerRbac } = await getCallerRbac(req, pgConnection)

  if (!callerUser || callerRbac?.status === "suspended") {
    return res.status(403).json({ message: "حساب کاربری شما تعلیق شده است.", code: "ACCOUNT_SUSPENDED" })
  }

  const isOwner = callerRbac?.role === "owner" || callerUser.email === "admin@medusa-test.com"
  const isManager = callerRbac?.role === "manager"
  const callerPermissions: string[] = callerRbac?.permissions || []

  // Security Check: Caller MUST have users.view to see users list!
  const canViewUsers = isOwner || callerPermissions.includes("users.view") || callerPermissions.includes("*")
  if (!canViewUsers) {
    return res.status(403).json({
      message: "شما مجوز مشاهده اعضای تیم و کاربران پنل مدیریت را ندارید.",
      code: "FORBIDDEN"
    })
  }

  // Fetch all active admin users
  const usersRes = await pgConnection.raw(`
    SELECT id, email, first_name, last_name, avatar_url, metadata, created_at, updated_at
    FROM public."user"
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC
  `)

  const users = usersRes.rows.map((u: any) => {
    const rbac = u.metadata?.rbac || {
      role: u.email === "admin@medusa-test.com" ? "owner" : "staff",
      role_title: u.email === "admin@medusa-test.com" ? "مالک فروشگاه (Store Owner)" : "کارمند فروشگاه",
      status: "active",
      permissions: u.email === "admin@medusa-test.com" ? ["*"] : []
    }

    return {
      id: u.id,
      email: u.email,
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email,
      avatar_url: u.avatar_url,
      role: rbac.role,
      role_title: rbac.role_title,
      preset: rbac.preset || null,
      preset_title: rbac.preset_title || null,
      status: rbac.status || "active",
      permissions: rbac.permissions || [],
      created_at: u.created_at
    }
  })

  // Query Real Staff Performance from admin_activity_log
  const staffPerfRes = await pgConnection.raw(`
    SELECT 
      COALESCE(u.user_name, 'مدیریت') as staff_name,
      u.user_email,
      u.user_id,
      COUNT(*)::int as total_actions,
      COUNT(*) FILTER (WHERE u.action_type = 'order_create' OR u.action_type = 'order_review')::int as orders_handled,
      MAX(u.created_at) as last_action_time
    FROM admin_activity_log u
    GROUP BY u.user_name, u.user_email, u.user_id
    ORDER BY total_actions DESC
    LIMIT 6
  `)

  const shamsiTimeFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const staffPerformance = staffPerfRes.rows.map((r: any) => ({
    user_id: r.user_id,
    name: r.staff_name,
    email: r.user_email,
    total_actions: Number(r.total_actions),
    orders_handled: Number(r.orders_handled),
    last_action: r.last_action_time ? shamsiTimeFormatter.format(new Date(r.last_action_time)) : "—"
  }))

  res.json({
    users,
    staff_performance: staffPerformance,
    caller_id: callerUser.id,
    caller_role: isOwner ? "owner" : isManager ? "manager" : "staff",
    caller_permissions: isOwner ? ["*"] : callerPermissions,
    available_permissions: ALL_PERMISSIONS,
    available_presets: PRESETS
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { user: callerUser, rbac: callerRbac } = await getCallerRbac(req, pgConnection)

  if (!callerUser || callerRbac?.status === "suspended") {
    return res.status(403).json({ message: "حساب کاربری شما تعلیق شده است.", code: "ACCOUNT_SUSPENDED" })
  }

  const isOwner = callerRbac?.role === "owner" || callerUser.email === "admin@medusa-test.com"
  const isManager = callerRbac?.role === "manager"
  const callerPermissions: string[] = callerRbac?.permissions || []

  // Unified Permission Check: user must have users.invite!
  const hasInvitePermission = isOwner || callerPermissions.includes("users.invite") || callerPermissions.includes("*")

  if (!hasInvitePermission) {
    return res.status(403).json({ message: "شما مجوز دعوت یا افزودن همکار جدید به پنل را ندارید." })
  }

  const {
    email,
    first_name,
    last_name,
    role = "staff",
    preset,
    custom_permissions = []
  } = req.body as any

  if (!email) {
    return res.status(400).json({ message: "وارد کردن ایمیل الزامی است." })
  }

  // Manager Restrictions: Manager can only invite staff members
  if (isManager && (role === "owner" || role === "manager")) {
    return res.status(403).json({ message: "مدیر فروشگاه تنها مجاز به دعوت کارمند (Staff) است." })
  }

  let finalPermissions: string[] = []
  let roleTitle = "کارمند فروشگاه (Staff)"
  let presetTitle: string | null = null

  if (role === "owner") {
    roleTitle = "مالک فروشگاه (Store Owner)"
    finalPermissions = ["*"]
  } else if (role === "manager") {
    roleTitle = "مدیر فروشگاه (Store Manager)"
    finalPermissions = (PRESETS.manager as any).permissions
    presetTitle = PRESETS.manager.title
  } else {
    if (preset && (PRESETS as any)[preset]) {
      finalPermissions = (PRESETS as any)[preset].permissions
      presetTitle = (PRESETS as any)[preset].title
    } else {
      finalPermissions = custom_permissions
      presetTitle = "مجوزهای سفارشی"
    }
  }

  const newUserId = "user_rbac_" + Math.random().toString(36).substring(2, 11)
  const authId = "authid_rbac_" + Math.random().toString(36).substring(2, 11)
  const pridId = "prid_rbac_" + Math.random().toString(36).substring(2, 11)

  const rbacMetadata = {
    role,
    role_title: roleTitle,
    preset: preset || (role === "staff" ? "custom" : null),
    preset_title: presetTitle,
    permissions: finalPermissions,
    status: "active",
    created_at: new Date().toISOString()
  }

  await pgConnection.raw(`
    INSERT INTO public."user" (id, email, first_name, last_name, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
  `, [newUserId, email.trim(), first_name || "", last_name || "", JSON.stringify({ rbac: rbacMetadata })])

  await pgConnection.raw(`
    INSERT INTO auth_identity (id, app_metadata, created_at, updated_at)
    VALUES (?, ?, NOW(), NOW())
  `, [authId, JSON.stringify({ user_id: newUserId })])

  await pgConnection.raw(`
    INSERT INTO provider_identity (id, entity_id, provider, auth_identity_id, user_metadata, provider_metadata, created_at, updated_at)
    VALUES (?, ?, 'emailpass', ?, '{}', '{"password": "c2NyeXB0AA8AAAAIAAAAAVYE8YlaxtEB6kVRXwvfOW0skFuT2WTxX27GD/hKg2Q9op7Bpk1qKRFnzP+Y63r6JWlRrmEOgz5qQI9O6ub4hhtec3F9dWY3IkTujCtmzkk+"}', NOW(), NOW())
  `, [pridId, email.trim(), authId])

  // Log real activity
  const actId = "act_" + Math.random().toString(36).substring(2, 11)
  const callerName = `${callerUser.first_name || ""} ${callerUser.last_name || ""}`.trim() || callerUser.email
  await pgConnection.raw(`
    INSERT INTO admin_activity_log (id, user_id, user_email, user_name, action_type, action_title, target_type, target_id, target_url, details, created_at)
    VALUES (?, ?, ?, ?, 'user_invite', ?, 'user', ?, '/users-permissions', ?, NOW())
  `, [
    actId,
    callerUser.id,
    callerUser.email,
    callerName,
    `دعوت همکار جدید: ${first_name || ""} ${last_name || ""} (${email})`,
    newUserId,
    `ثبت حساب کاربری با نقش ${roleTitle} و ${finalPermissions.length} مجوز توسط ${callerName}`
  ]).catch(() => {})

  res.status(201).json({
    message: "کاربر جدید با موفقیت اضافه شد.",
    user: {
      id: newUserId,
      email,
      name: `${first_name || ""} ${last_name || ""}`.trim() || email,
      role,
      role_title: roleTitle,
      preset_title: presetTitle,
      status: "active",
      permissions: finalPermissions
    }
  })
}
