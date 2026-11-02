import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const result = await pgConnection.raw(`
      SELECT 
        o.id,
        o.display_id,
        o.status,
        o.metadata,
        o.created_at,
        COALESCE(oa.phone, c.phone, '') as phone,
        CONCAT(COALESCE(oa.first_name, c.first_name, ''), ' ', COALESCE(oa.last_name, c.last_name, '')) as customer_name
      FROM "order" o
      LEFT JOIN order_address oa ON o.shipping_address_id = oa.id
      LEFT JOIN customer c ON o.customer_id = c.id
      ORDER BY o.display_id DESC
    `)

    const mapping: Record<string, any> = {}
    const byDisplayId: Record<string, any> = {}

    for (const row of result.rows) {
      const meta = row.metadata || {}
      const iranianMeta = meta.iranian_order || {}
      const isProcessed = !!meta.is_processed || !!iranianMeta.postal_tracking_code

      const d = new Date(row.created_at)
      let shamsiDate = "—"
      let shamsiTime = ""
      try {
        shamsiDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
          timeZone: 'Asia/Tehran',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(d)
        shamsiTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
          timeZone: 'Asia/Tehran',
          hour: '2-digit',
          minute: '2-digit'
        }).format(d)
      } catch {}

      const item = {
        id: row.id,
        display_id: row.display_id,
        created_at: row.created_at,
        shamsi_date: shamsiDate,
        shamsi_time: shamsiTime,
        shamsi_full: `${shamsiDate} ساعت ${shamsiTime}`,
        phone: row.phone || '—',
        customer_name: row.customer_name?.trim() || 'خریدار مهمان',
        is_processed: isProcessed,
        tracking_code: iranianMeta.postal_tracking_code || '',
        carrier: iranianMeta.postal_carrier || 'پست پیشتاز',
        status_fa: iranianMeta.fulfillment_status_fa || (isProcessed ? '✅ پردازش‌شده' : '⏳ در انتظار پردازش'),
        processed_at: meta.processed_at || null,
        processed_by: meta.processed_by_name || null
      }

      mapping[row.id] = item
      byDisplayId[String(row.display_id)] = item
    }

    return res.json({
      success: true,
      count: result.rows.length,
      orders: mapping,
      by_display_id: byDisplayId
    })
  } catch (error: any) {
    console.error("PHONE AND STATUS ERROR:", error)
    return res.status(500).json({ message: error.message, orders: {}, by_display_id: {} })
  }
}
