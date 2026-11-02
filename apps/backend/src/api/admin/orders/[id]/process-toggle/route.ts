import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = (req.body as any) || {}

    // Find order
    const orderRes = await pgConnection.raw(
      'SELECT id, display_id, metadata FROM "order" WHERE id = ?',
      [id]
    )

    if (!orderRes?.rows?.length) {
      return res.status(404).json({ message: "سفارش مورد نظر یافت نشد." })
    }

    const order = orderRes.rows[0]
    const currentMeta = order.metadata || {}
    const currentProcessed = !!currentMeta.is_processed

    const nextProcessed = typeof body.is_processed === "boolean" 
      ? body.is_processed 
      : !currentProcessed

    // Actor / Staff info
    const callerUser = (req as any).user || {}
    const callerId = (req as any).auth_context?.actor_id || callerUser.id || "user_01M5SP73MA566NQBTS4KHH9699"
    
    let userEmail = callerUser.email || "admin@medusa-test.com"
    let userName = (callerUser.first_name || "") + " " + (callerUser.last_name || "")
    userName = userName.trim() || userEmail

    try {
      const uRes = await pgConnection.raw('SELECT email, first_name, last_name FROM public."user" WHERE id = ?', [callerId])
      if (uRes?.rows?.length) {
        userEmail = uRes.rows[0].email || userEmail
        const n = ((uRes.rows[0].first_name || "") + " " + (uRes.rows[0].last_name || "")).trim()
        if (n) userName = n
      }
    } catch {}

    const updatedMeta = {
      ...currentMeta,
      is_processed: nextProcessed,
      processed_at: nextProcessed ? new Date().toISOString() : null,
      processed_by_id: nextProcessed ? callerId : null,
      processed_by_name: nextProcessed ? userName : null,
    }

    await pgConnection.raw(
      'UPDATE "order" SET metadata = ?::jsonb, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(updatedMeta), id]
    )

    // Log in admin_activity_log
    const actId = "act_" + Math.random().toString(36).substring(2, 11)
    const actionTitle = nextProcessed
      ? `تأیید و پردازش سفارش پوشاک: #${order.display_id}`
      : `لغو وضعیت پردازش سفارش: #${order.display_id}`

    const details = nextProcessed
      ? `سفارش شماره #${order.display_id} توسط ${userName} به وضعیت پردازش‌شده (آماده ارسال) تغییر یافت.`
      : `وضعیت پردازش سفارش شماره #${order.display_id} توسط ${userName} لغو شد.`

    await pgConnection.raw(`
      INSERT INTO admin_activity_log (id, user_id, user_email, user_name, action_type, action_title, target_type, target_id, target_url, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      actId,
      callerId,
      userEmail,
      userName,
      "order_process",
      actionTitle,
      "order",
      order.id,
      `/orders/${order.id}`,
      details
    ]).catch((e: any) => console.error("Error logging activity:", e))

    return res.json({
      success: true,
      order_id: order.id,
      display_id: order.display_id,
      is_processed: nextProcessed,
      processed_at: updatedMeta.processed_at,
      processed_by: userName,
      message: nextProcessed
        ? `سفارش #${order.display_id} با موفقیت پردازش شد و به لیست آماده ارسال منتقل گردید.`
        : `سفارش #${order.display_id} به وضعیت پردازش‌نشده بازگشت.`
    })
  } catch (error: any) {
    console.error("PROCESS TOGGLE ERROR:", error)
    return res.status(500).json({ message: error.message })
  }
}
