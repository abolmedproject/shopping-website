import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { id } = req.params

  // Get order items and their products' available variants with current stock
  const itemsRes = await pgConnection.raw(`
    SELECT 
      oli.id as item_id,
      oli.title as product_title,
      oli.variant_title,
      oli.variant_id,
      oli.product_id,
      oli.thumbnail,
      oi.quantity::int,
      oli.unit_price::numeric as unit_price
    FROM order_item oi
    JOIN order_line_item oli ON oli.id = oi.item_id
    WHERE oi.order_id = ?
  `, [id])

  // Get other variants for each product in this order
  const productIds = [...new Set(itemsRes.rows.map((r: any) => r.product_id))]

  let allVariants: any[] = []
  if (productIds.length > 0) {
    const quoted = productIds.map((pid: any) => `'${String(pid).replace(/'/g, "''")}'`).join(',')
    const varsRes = await pgConnection.raw(`
      SELECT 
        pv.id as variant_id,
        pv.product_id,
        pv.title as variant_title,
        pv.sku,
        COALESCE(il.stocked_quantity, 0)::int as stock_quantity
      FROM product_variant pv
      LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
      LEFT JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
      WHERE pv.product_id IN (${quoted}) AND pv.deleted_at IS NULL
      ORDER BY pv.title ASC
    `)
    allVariants = varsRes.rows
  }

  // Get order exchange history
  const orderRes = await pgConnection.raw('SELECT metadata FROM public."order" WHERE id = ?', [id])
  const meta = orderRes.rows[0]?.metadata || {}
  const exchangeHistory = meta.exchange_history || []

  res.json({
    order_id: id,
    items: itemsRes.rows.map((item: any) => ({
      ...item,
      available_replacements: allVariants.filter((v: any) => v.product_id === item.product_id && v.variant_id !== item.variant_id)
    })),
    exchange_history: exchangeHistory
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { id } = req.params
  const { item_id, new_variant_id, reason = "درخواست مشتری جهت تعویض سایز پوشاک" } = req.body as any

  if (!item_id || !new_variant_id) {
    return res.status(400).json({ message: "انتخاب قلم سفارش و سایز جدید الزامی است." })
  }

  // 1. Get order details
  const orderRes = await pgConnection.raw('SELECT id, display_id, metadata FROM public."order" WHERE id = ?', [id])
  if (!orderRes.rows[0]) {
    return res.status(404).json({ message: "سفارش مورد نظر یافت نشد." })
  }
  const order = orderRes.rows[0]
  const currentMeta = order.metadata || {}

  // 2. Get line item details
  const itemRes = await pgConnection.raw(`
    SELECT 
      oli.id,
      oli.variant_id,
      oli.title,
      oli.variant_title,
      oli.product_id,
      oi.quantity::int
    FROM order_item oi
    JOIN order_line_item oli ON oli.id = oi.item_id
    WHERE oi.order_id = ? AND oli.id = ?
    LIMIT 1
  `, [id, item_id])

  if (!itemRes.rows[0]) {
    return res.status(404).json({ message: "قلم کالای مورد نظر در این سفارش یافت نشد." })
  }
  const lineItem = itemRes.rows[0]

  // 3. Get target new variant details
  const newVarRes = await pgConnection.raw('SELECT id, title, sku FROM product_variant WHERE id = ?', [new_variant_id])
  if (!newVarRes.rows[0]) {
    return res.status(404).json({ message: "سایز جدید انتخابی یافت نشد." })
  }
  const newVariant = newVarRes.rows[0]

  // 4. Update Inventory: return old variant quantity to stock, deduct new variant from stock
  const oldInvRes = await pgConnection.raw('SELECT inventory_item_id FROM product_variant_inventory_item WHERE variant_id = ? LIMIT 1', [lineItem.variant_id])
  if (oldInvRes.rows[0]) {
    await pgConnection.raw(`
      UPDATE inventory_level 
      SET stocked_quantity = stocked_quantity + ?
      WHERE inventory_item_id = ?
    `, [lineItem.quantity, oldInvRes.rows[0].inventory_item_id])
  }

  const newInvRes = await pgConnection.raw('SELECT inventory_item_id FROM product_variant_inventory_item WHERE variant_id = ? LIMIT 1', [newVariant.id])
  if (newInvRes.rows[0]) {
    await pgConnection.raw(`
      UPDATE inventory_level 
      SET stocked_quantity = GREATEST(0, stocked_quantity - ?)
      WHERE inventory_item_id = ?
    `, [lineItem.quantity, newInvRes.rows[0].inventory_item_id])
  }

  // 5. Update order_line_item with new variant details
  await pgConnection.raw(`
    UPDATE order_line_item
    SET variant_id = ?, variant_title = ?, subtitle = ?, variant_sku = ?, updated_at = NOW()
    WHERE id = ?
  `, [newVariant.id, newVariant.title, newVariant.title, newVariant.sku, item_id])

  // 6. Record exchange in order metadata
  const shamsiFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const exchangeRecord = {
    exchange_id: "exch_" + Math.random().toString(36).substring(2, 10),
    item_title: lineItem.title,
    from_size: lineItem.variant_title,
    to_size: newVariant.title,
    quantity: lineItem.quantity,
    reason,
    shamsi_date: shamsiFormatter.format(new Date()),
    created_at: new Date().toISOString()
  }

  const existingHistory = currentMeta.exchange_history || []
  const iranianMeta = currentMeta.iranian_order || {}

  const updatedMetadata = {
    ...currentMeta,
    exchange_history: [exchangeRecord, ...existingHistory],
    iranian_order: {
      ...iranianMeta,
      fulfillment_status_fa: "🔄 مرجوعی جهت تعویض سایز"
    }
  }

  await pgConnection.raw('UPDATE public."order" SET metadata = ?, updated_at = NOW() WHERE id = ?', [JSON.stringify(updatedMetadata), id])

  // 7. Log real activity in admin_activity_log
  const callerUser = (req as any).user || {}
  const callerId = (req as any).auth_context?.actor_id || callerUser.id || 'user_01M5SP73MA566NQBTS4KHH9699'
  const actId = "act_" + Math.random().toString(36).substring(2, 11)

  await pgConnection.raw(`
    INSERT INTO admin_activity_log (id, user_id, user_email, user_name, action_type, action_title, target_type, target_id, target_url, details, created_at)
    VALUES (?, ?, ?, ?, 'size_exchange', ?, 'order', ?, ?, ?, NOW())
  `, [
    actId,
    callerId,
    callerUser.email || 'admin@medusa-test.com',
    `${callerUser.first_name || ""} ${callerUser.last_name || ""}`.trim() || "مدیر فروشگاه",
    `تعویض سایز لباس در سفارش #${order.display_id}`,
    id,
    `/orders/${id}`,
    `تعویض ${lineItem.title} از سایز ${lineItem.variant_title} به سایز جدید ${newVariant.title} (علت: ${reason})`
  ]).catch(() => {})

  res.json({
    message: `تعویض سایز با موفقیت انجام شد. ${lineItem.title} از سایز ${lineItem.variant_title} به ${newVariant.title} تغییر یافت و موجودی انبار اصلاح گردید.`,
    exchange: exchangeRecord
  })
}
