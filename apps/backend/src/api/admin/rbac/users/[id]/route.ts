import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRESETS } from "../route"

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

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { id } = req.params
  const { user: callerUser, rbac: callerRbac } = await getCallerRbac(req, pgConnection)

  if (!callerUser || callerRbac?.status === "suspended") {
    return res.status(403).json({ message: "حساب کاربری شما تعلیق شده است." })
  }

  const isOwner = callerRbac?.role === "owner" || callerUser.email === "admin@medusa-test.com"
  const isManager = callerRbac?.role === "manager"
  const callerPermissions: string[] = callerRbac?.permissions || []

  // Check management permission: must have users.manage or be owner
  const canManageUsers = isOwner || callerPermissions.includes("users.manage") || callerPermissions.includes("*")
  if (!canManageUsers) {
    return res.status(403).json({ message: "شما مجوز ویرایش مشخصات یا مجوزهای کاربران را ندارید." })
  }

  // Get target user
  const targetUserRes = await pgConnection.raw('SELECT id, email, first_name, last_name, metadata FROM public."user" WHERE id = ?', [id])
  if (!targetUserRes.rows[0]) {
    return res.status(404).json({ message: "کاربر مورد نظر یافت نشد." })
  }

  const targetUser = targetUserRes.rows[0]
  const targetRbac = targetUser.metadata?.rbac || {}
  const targetIsOwner = targetRbac.role === "owner" || targetUser.email === "admin@medusa-test.com"
  const targetIsManager = targetRbac.role === "manager"

  // Security: No one except the owner can modify the owner
  if (targetIsOwner && !isOwner) {
    return res.status(403).json({ message: "شما اجازه تغییر مشخصات یا مجوزهای مالک فروشگاه را ندارید." })
  }

  // Security: Manager cannot edit or suspend another manager
  if (targetIsManager && !isOwner && callerUser.id !== id) {
    return res.status(403).json({ message: "تنها مالک فروشگاه مجاز به ویرایش یا تغییر وضعیت سایر مدیران است." })
  }

  // Security: User cannot suspend themselves
  if (callerUser.id === id && (req.body as any)?.status === "suspended") {
    return res.status(400).json({ message: "امکان تعلیق حساب کاربری جاری توسط خودتان وجود ندارد." })
  }

  // Non-owner restrictions: cannot change roles or permissions unless Owner or has roles.configure
  const canConfigureRoles = isOwner || callerPermissions.includes("roles.configure") || callerPermissions.includes("*")
  if (!canConfigureRoles && ((req.body as any)?.role || (req.body as any)?.custom_permissions)) {
    return res.status(403).json({ message: "تنها مالک فروشگاه مجاز به تعریف یا تغییر مجوزهای پرسنل است." })
  }

  const {
    first_name,
    last_name,
    role,
    preset,
    status,
    custom_permissions
  } = req.body as any

  let updatedRbac = { ...targetRbac }

  if (first_name !== undefined) targetUser.first_name = first_name
  if (last_name !== undefined) targetUser.last_name = last_name

  let activityAction = "user_update"
  let activityTitle = `ویرایش مشخصات همکار: ${targetUser.first_name} ${targetUser.last_name}`
  let activityDetails = `به‌روزرسانی اطلاعات حساب توسط ${callerUser.first_name || callerUser.email}`

  if (status) {
    if (targetIsOwner && status === "suspended") {
      return res.status(400).json({ message: "حساب مالک فروشگاه به دلایل امنیتی هرگز نمی‌تواند تعلیق شود." })
    }
    updatedRbac.status = status
    activityAction = status === "suspended" ? "user_suspend" : "user_activate"
    activityTitle = status === "suspended" 
      ? `تعلیق موقت دسترسی همکار: ${targetUser.first_name} ${targetUser.last_name}` 
      : `رفع تعلیق و فعال‌سازی مجدد: ${targetUser.first_name} ${targetUser.last_name}`
    activityDetails = `تغییر وضعیت به ${status === "suspended" ? "تعلیق‌شده" : "فعال"} توسط ${callerUser.first_name || callerUser.email}`
  }

  if (role && canConfigureRoles) {
    updatedRbac.role = role
    if (role === "owner") {
      updatedRbac.role_title = "مالک فروشگاه (Store Owner)"
      updatedRbac.permissions = ["*"]
    } else if (role === "manager") {
      updatedRbac.role_title = "مدیر فروشگاه (Store Manager)"
      if (!custom_permissions && (!updatedRbac.permissions || updatedRbac.permissions.length <= 4)) {
        updatedRbac.permissions = (PRESETS.manager as any).permissions
        updatedRbac.preset_title = PRESETS.manager.title
      }
    } else {
      updatedRbac.role_title = "کارمند فروشگاه (Staff)"
      if (!preset && !custom_permissions) {
        updatedRbac.preset = "custom"
        updatedRbac.preset_title = "کارمند فروشگاه"
      }
    }
    activityTitle = `تغییر نقش سازمانی همکار به ${updatedRbac.role_title}`
  }

  if (preset) {
    if ((PRESETS as any)[preset]) {
      updatedRbac.preset = preset
      updatedRbac.preset_title = (PRESETS as any)[preset].title
      updatedRbac.permissions = (PRESETS as any)[preset].permissions
      activityTitle = `تخصیص الگوی دسترسی ${(PRESETS as any)[preset].title} به ${targetUser.first_name}`
    }
  } else if (custom_permissions && canConfigureRoles) {
    updatedRbac.preset = "custom"
    updatedRbac.preset_title = "مجوزهای سفارشی"
    updatedRbac.permissions = custom_permissions
    activityTitle = `تنظیم دستی ${custom_permissions.length} مجوز برای ${targetUser.first_name} ${targetUser.last_name}`
  }

  const updatedMetadata = {
    ...targetUser.metadata,
    rbac: updatedRbac
  }

  await pgConnection.raw(`
    UPDATE public."user"
    SET first_name = ?, last_name = ?, metadata = ?, updated_at = NOW()
    WHERE id = ?
  `, [targetUser.first_name, targetUser.last_name, JSON.stringify(updatedMetadata), id])

  // Record this REAL action into admin_activity_log for the caller
  const actId = "act_" + Math.random().toString(36).substring(2, 11)
  const callerName = `${callerUser.first_name || ""} ${callerUser.last_name || ""}`.trim() || callerUser.email
  await pgConnection.raw(`
    INSERT INTO admin_activity_log (id, user_id, user_email, user_name, action_type, action_title, target_type, target_id, target_url, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'user', ?, '/users-permissions', ?, NOW())
  `, [actId, callerUser.id, callerUser.email, callerName, activityAction, activityTitle, id, activityDetails]).catch(() => {})

  res.json({
    message: "کاربر با موفقیت به‌روزرسانی شد.",
    user: {
      id,
      name: `${targetUser.first_name || ""} ${targetUser.last_name || ""}`.trim() || targetUser.email,
      role: updatedRbac.role,
      role_title: updatedRbac.role_title,
      preset_title: updatedRbac.preset_title,
      status: updatedRbac.status,
      permissions: updatedRbac.permissions
    }
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { id } = req.params
  const { user: callerUser, rbac: callerRbac } = await getCallerRbac(req, pgConnection)

  if (!callerUser || callerRbac?.status === "suspended") {
    return res.status(403).json({ message: "حساب کاربری شما تعلیق شده است." })
  }

  const isOwner = callerRbac?.role === "owner" || callerUser.email === "admin@medusa-test.com"
  const isManager = callerRbac?.role === "manager"
  const callerPermissions: string[] = callerRbac?.permissions || []

  const canDelete = isOwner || callerPermissions.includes("users.manage") || callerPermissions.includes("*")
  if (!canDelete) {
    return res.status(403).json({ message: "شما مجوز لغو دسترسی کاربران را ندارید." })
  }

  if (callerUser.id === id) {
    return res.status(400).json({ message: "امکان حذف حساب کاربری جاری توسط خودتان وجود ندارد." })
  }

  const targetUserRes = await pgConnection.raw('SELECT id, email, first_name, last_name, metadata FROM public."user" WHERE id = ?', [id])
  if (!targetUserRes.rows[0]) {
    return res.status(404).json({ message: "کاربر مورد نظر یافت نشد." })
  }

  const targetRbac = targetUserRes.rows[0].metadata?.rbac || {}
  const targetIsOwner = targetRbac.role === "owner" || targetUserRes.rows[0].email === "admin@medusa-test.com"

  if (targetIsOwner) {
    return res.status(400).json({ message: "حساب مالک فروشگاه به دلایل امنیتی هرگز قابل حذف یا لغو دسترسی نیست." })
  }

  if (targetRbac.role === "manager" && !isOwner) {
    return res.status(403).json({ message: "تنها مالک فروشگاه مجاز به حذف حساب مدیران است." })
  }

  await pgConnection.raw('UPDATE public."user" SET deleted_at = NOW() WHERE id = ?', [id])
  await pgConnection.raw(`
    DELETE FROM provider_identity WHERE auth_identity_id IN (
      SELECT id FROM auth_identity WHERE app_metadata->>'user_id' = ?
    )
  `, [id]).catch(() => {})
  await pgConnection.raw(`DELETE FROM auth_identity WHERE app_metadata->>'user_id' = ?`, [id]).catch(() => {})

  // Log activity
  const actId = "act_" + Math.random().toString(36).substring(2, 11)
  const callerName = `${callerUser.first_name || ""} ${callerUser.last_name || ""}`.trim() || callerUser.email
  await pgConnection.raw(`
    INSERT INTO admin_activity_log (id, user_id, user_email, user_name, action_type, action_title, target_type, target_id, target_url, details, created_at)
    VALUES (?, ?, ?, ?, 'user_delete', ?, 'user', ?, '/users-permissions', ?, NOW())
  `, [actId, callerUser.id, callerUser.email, callerName, `حذف و لغو دسترسی همکار: ${targetUserRes.rows[0].email}`, id, `لغو دسترسی توسط ${callerName}`]).catch(() => {})

  res.json({ message: "دسترسی کاربر با موفقیت لغو شد." })
}
