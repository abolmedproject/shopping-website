import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = (req.body as any) || {}

    const orderRes = await pgConnection.raw(
      'SELECT id, display_id, metadata FROM "order" WHERE id = ?',
      [id]
    )

    if (!orderRes?.rows?.length) {
      return res.status(404).json({ message: "سفارش یافت نشد." })
    }

    const order = orderRes.rows[0]
    const currentMeta = order.metadata || {}
    const currentIranian = currentMeta.iranian_order || {}

    const updatedIranian = {
      ...currentIranian,
      postal_tracking_code: (body.postal_tracking_code ?? currentIranian.postal_tracking_code ?? "").trim(),
      postal_carrier: body.postal_carrier || currentIranian.postal_carrier || "پست پیشتاز",
      fulfillment_status_fa: body.fulfillment_status_fa || currentIranian.fulfillment_status_fa || "🧵 در حال آماده‌سازی و بسته‌بندی",
      postal_updated_at: new Date().toISOString()
    }

    const updatedMeta = {
      ...currentMeta,
      iranian_order: updatedIranian,
      is_processed: true // Saving shipping info implies processed
    }

    await pgConnection.raw(
      'UPDATE "order" SET metadata = ?::jsonb, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(updatedMeta), id]
    )

    // Actor info
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

    // Log activity
    const actId = "act_" + Math.random().toString(36).substring(2, 11)
    const actTitle = `به‌روزرسانی ارسال و رهگیری پستی سفارش: #${order.display_id}`
    const details = `وضعیت: ${updatedIranian.fulfillment_status_fa} | حامل: ${updatedIranian.postal_carrier} ${updatedIranian.postal_tracking_code ? '| کد رهگیری: ' + updatedIranian.postal_tracking_code : ''} توسط ${userName}`

    await pgConnection.raw(`
      INSERT INTO admin_activity_log (id, user_id, user_email, user_name, action_type, action_title, target_type, target_id, target_url, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      actId,
      callerId,
      userEmail,
      userName,
      "order_shipping",
      actTitle,
      "order",
      order.id,
      `/orders/${order.id}`,
      details
    ]).catch((e: any) => console.error("Error logging activity:", e))

    return res.json({
      success: true,
      message: "مشخصات ارسال و وضعیت مرسوله با موفقیت ثبت شد.",
      iranian_order: updatedIranian
    })
  } catch (error: any) {
    console.error("SHIPPING META ERROR:", error)
    return res.status(500).json({ message: error.message })
  }
}
