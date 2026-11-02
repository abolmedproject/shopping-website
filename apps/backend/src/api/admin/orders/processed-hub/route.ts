import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Fetch orders that are marked as processed
    const ordersRes = await pgConnection.raw(`
      SELECT 
        o.id,
        o.display_id,
        o.status,
        o.metadata,
        o.created_at,
        o.updated_at,
        oa.first_name as ship_first_name,
        oa.last_name as ship_last_name,
        oa.phone as ship_phone,
        oa.province as ship_province,
        oa.city as ship_city,
        oa.address_1 as ship_address_1,
        oa.postal_code as ship_postal_code,
        c.email as customer_email,
        c.first_name as cust_first_name,
        c.last_name as cust_last_name,
        c.phone as cust_phone
      FROM "order" o
      LEFT JOIN order_address oa ON o.shipping_address_id = oa.id
      LEFT JOIN customer c ON o.customer_id = c.id
      WHERE (o.metadata->>'is_processed')::boolean = true
         OR (o.metadata->'iranian_order'->>'postal_tracking_code') IS NOT NULL
      ORDER BY o.display_id DESC
    `)

    const orders: any[] = []

    for (const row of ordersRes.rows) {
      const meta = row.metadata || {}
      const iranianMeta = meta.iranian_order || {}
      const exchangeHistory = meta.exchange_history || []

      // Fetch items for this order
      const itemsRes = await pgConnection.raw(`
        SELECT 
          oli.id as item_id,
          oli.title,
          oli.subtitle,
          oli.variant_title,
          oli.variant_id,
          oli.thumbnail,
          oli.unit_price::numeric,
          oi.quantity::int,
          (oli.unit_price::numeric * oi.quantity::int) as total_price
        FROM order_item oi
        JOIN order_line_item oli ON oli.id = oi.item_id
        WHERE oi.order_id = ?
      `, [row.id])

      // Fetch summary totals JSON
      const sumRes = await pgConnection.raw(`
        SELECT totals
        FROM order_summary
        WHERE order_id = ?
        ORDER BY version DESC
        LIMIT 1
      `, [row.id])

      const totalsJson = sumRes.rows[0]?.totals || {}
      const itemSubtotal = itemsRes.rows.reduce((sum: number, it: any) => sum + Number(it.total_price || 0), 0)
      const grandTotal = Number(totalsJson.current_order_total || totalsJson.original_order_total || (itemSubtotal + 35000))
      const shippingTotal = grandTotal > itemSubtotal ? (grandTotal - itemSubtotal) : 35000

      const customerName = (row.ship_first_name || row.cust_first_name || '') + ' ' + (row.ship_last_name || row.cust_last_name || '')
      const phone = row.ship_phone || row.cust_phone || '—'

      orders.push({
        id: row.id,
        display_id: row.display_id,
        created_at: row.created_at,
        customer_name: customerName.trim() || 'خریدار مهمان',
        phone,
        email: row.customer_email || '—',
        shipping_address: {
          first_name: row.ship_first_name || '',
          last_name: row.ship_last_name || '',
          phone,
          province: row.ship_province || '—',
          city: row.ship_city || '—',
          address_1: row.ship_address_1 || '—',
          postal_code: row.ship_postal_code || '—',
        },
        items: itemsRes.rows.map((it: any) => ({
          id: it.item_id,
          title: it.title,
          variant_title: it.variant_title || it.subtitle || 'سایز تک',
          variant_id: it.variant_id,
          thumbnail: it.thumbnail,
          unit_price: Math.round(Number(it.unit_price)),
          quantity: it.quantity,
          total_price: Math.round(Number(it.total_price)),
        })),
        summary: {
          item_subtotal: Math.round(itemSubtotal),
          shipping_total: Math.round(shippingTotal),
          discount_total: 0,
          total: Math.round(grandTotal),
        },
        iranian_order: {
          postal_tracking_code: iranianMeta.postal_tracking_code || '',
          postal_carrier: iranianMeta.postal_carrier || 'پست پیشتاز',
          fulfillment_status_fa: iranianMeta.fulfillment_status_fa || '🧵 در حال آماده‌سازی و بسته‌بندی',
          payment_method: iranianMeta.payment_method || 'درگاه بانکی شاپرک',
          order_source: iranianMeta.source_title || 'سفارش آنلاین وب‌سایت',
          postal_updated_at: iranianMeta.postal_updated_at || null,
        },
        exchange_history: exchangeHistory,
        processed_at: meta.processed_at || row.created_at,
        processed_by_name: meta.processed_by_name || 'مدیر فروشگاه'
      })
    }

    return res.json({
      success: true,
      count: orders.length,
      orders
    })
  } catch (error: any) {
    console.error("PROCESSED HUB ERROR:", error)
    return res.status(500).json({ message: error.message, count: 0, orders: [] })
  }
}
