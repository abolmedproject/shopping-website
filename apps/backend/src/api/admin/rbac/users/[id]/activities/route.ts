import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { id } = req.params
  const callerUser = (req as any).user || {}
  const callerId = (req as any).auth_context?.actor_id || callerUser.id
  
  // Get caller and target details
  const callerRes = await pgConnection.raw('SELECT id, email, metadata FROM public."user" WHERE id = ? AND deleted_at IS NULL', [callerId])
  const caller = callerRes?.rows?.[0]
  const isCallerOwner = caller?.email === 'admin@medusa-test.com' || caller?.metadata?.rbac?.role === 'owner'
  const isCallerManager = caller?.metadata?.rbac?.role === 'manager'

  const targetRes = await pgConnection.raw('SELECT id, email, metadata FROM public."user" WHERE id = ?', [id])
  const target = targetRes?.rows?.[0]
  if (!target) {
    return res.status(404).json({ message: "کاربر مورد نظر یافت نشد." })
  }
  const isTargetOwner = target?.email === 'admin@medusa-test.com' || target?.metadata?.rbac?.role === 'owner'
  
  // Rule 1: No one except the Owner can view the Owner's activity
  if (isTargetOwner && !isCallerOwner) {
    return res.status(403).json({ message: "مشاهده کارنامه و پرونده فعالیت مالک فروشگاه برای سایر نقش‌ها مجاز نیست." })
  }

  // Rule 2: Staff members can ONLY view their own activity, not other staff or managers
  if (!isCallerOwner && !isCallerManager && callerId !== id) {
    return res.status(403).json({ message: "کارمندان تنها مجاز به مشاهده کارنامه فعالیت‌های خود هستند." })
  }

  const activitiesRes = await pgConnection.raw(`
    SELECT 
      id,
      user_id,
      user_name,
      user_email,
      action_type,
      action_title,
      target_type,
      target_id,
      target_url,
      details,
      created_at
    FROM admin_activity_log
    WHERE user_id = ? OR target_id = ?
    ORDER BY created_at DESC
    LIMIT 250
  `, [id, id])

  const shamsiDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const shamsiTimeFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const activities = activitiesRes.rows.map((r: any) => {
    const d = new Date(r.created_at)
    return {
      id: r.id,
      action_type: r.action_type,
      action_title: r.action_title,
      target_type: r.target_type,
      target_id: r.target_id,
      target_url: r.target_url,
      details: r.details,
      created_at: r.created_at,
      shamsi_date: shamsiDateFormatter.format(d),
      shamsi_time: shamsiTimeFormatter.format(d),
      shamsi_full: `${shamsiDateFormatter.format(d)} - ساعت ${shamsiTimeFormatter.format(d)}`
    }
  })

  res.json({
      user_id: id,
      activities_count: activities.length,
      activities
    })
  } catch (err: any) {
    console.error("GET ACTIVITIES ERROR:", err)
    res.status(500).json({ message: err.message, activities_count: 0, activities: [] })
  }
}
