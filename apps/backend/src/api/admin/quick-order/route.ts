import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // 1. Get products and variants with current stock and IRT price
  const variantsRes = await pgConnection.raw(`
    SELECT 
      pv.id as variant_id,
      p.id as product_id,
      p.title as product_title,
      pv.title as variant_title,
      pv.sku,
      p.thumbnail,
      COALESCE(pr.amount, 0)::numeric as price,
      COALESCE(il.stocked_quantity, 0)::int as stock_quantity
    FROM product_variant pv
    JOIN product p ON p.id = pv.product_id
    LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
    LEFT JOIN price pr ON pr.price_set_id = pvps.price_set_id AND pr.currency_code = 'irt'
    LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
    LEFT JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
    WHERE p.deleted_at IS NULL AND pv.deleted_at IS NULL AND COALESCE(il.stocked_quantity, 0) > 0
    ORDER BY il.stocked_quantity DESC, p.title ASC
  `)

  // 2. Get shipping options
  const shippingRes = await pgConnection.raw(`
    SELECT 
      so.id,
      so.name,
      COALESCE(pr.amount, 0)::numeric as amount
    FROM shipping_option so
    LEFT JOIN shipping_option_price_set sops ON sops.shipping_option_id = so.id
    LEFT JOIN price pr ON pr.price_set_id = sops.price_set_id AND pr.currency_code = 'irt'
    WHERE so.deleted_at IS NULL
    ORDER BY so.created_at ASC
  `)

  res.json({
    variants: variantsRes.rows.map((r: any) => ({
      variant_id: r.variant_id,
      product_id: r.product_id,
      title: `${r.product_title} (${r.variant_title})`,
      product_title: r.product_title,
      variant_title: r.variant_title,
      sku: r.sku,
      thumbnail: r.thumbnail,
      price: Number(r.price),
      stock_quantity: Number(r.stock_quantity),
    })),
    shipping_options: shippingRes.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      amount: Number(r.amount),
    })),
    order_sources: [
      { id: "instagram_direct", label: "دایرکت اینستاگرام (Instagram Direct)" },
      { id: "whatsapp", label: "واتساپ / تلگرام (WhatsApp / Telegram)" },
      { id: "phone", label: "سفارش تلفنی (Phone Order)" },
      { id: "in_person", label: "خرید حضوری / کارت‌به‌کارت (In-Person / Direct)" }
    ]
  })
  } catch (err: any) {
    console.error("GET /admin/quick-order ERROR:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const {
    customer,
    items,
    shipping_option_id,
    order_source = "instagram_direct",
    source_notes,
    payment_method = "کارت به کارت / واریز مستقیم"
  } = req.body as any

  if (!customer?.first_name || !customer?.last_name) {
    return res.status(400).json({ message: "وارد کردن نام و نام خانوادگی خریدار الزامی است." })
  }

  if (!customer?.phone) {
    return res.status(400).json({ message: "شماره موبایل مشتری الزامی است." })
  }

  if (!customer?.address_1 || !customer?.province || !customer?.city) {
    return res.status(400).json({ message: "استان، شهر و نشانی پستی دقیق الزامی است." })
  }

  if (!items || !items.length) {
    return res.status(400).json({ message: "حداقل باید یک قلم پوشاک برای سفارش انتخاب شود." })
  }

  const phone = customer.phone.trim()
  const email = customer.email?.trim() || `${phone}@medusa-store.local`

  // Find or create customer
  let customerId = ""
  const existingCus = await pgConnection.raw(
    'SELECT id FROM customer WHERE phone = ? OR email = ? LIMIT 1',
    [phone, email]
  )

  if (existingCus.rows[0]) {
    customerId = existingCus.rows[0].id
    await pgConnection.raw(
      'UPDATE customer SET first_name = ?, last_name = ?, phone = ?, updated_at = NOW() WHERE id = ?',
      [customer.first_name, customer.last_name, phone, customerId]
    )
  } else {
    customerId = "cus_" + Math.random().toString(36).substring(2, 12)
    await pgConnection.raw(`
      INSERT INTO customer (id, email, first_name, last_name, phone, has_account, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, false, NOW(), NOW())
    `, [customerId, email, customer.first_name, customer.last_name, phone])
  }

  // Create Cart via Store API
  const host = "http://127.0.0.1:9000"
  const apiKey = "pk_5cdc752e91685b560c4e0e669e339b69711c9ea7fdecf31fca616ef6bdb62645"
  const storeHeaders = {
    "Content-Type": "application/json",
    "x-publishable-api-key": apiKey
  }

  const cartResp = await fetch(`${host}/store/carts`, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({
      region_id: "reg_01M5WD1MY20KX3RYJJ023JYRWS",
      currency_code: "irt"
    })
  })

  if (!cartResp.ok) {
    return res.status(500).json({ message: "خطا در ایجاد سبد خرید سفارش." })
  }

  const { cart } = await cartResp.json()

  // Add Items
  for (const it of items) {
    const itemRes = await fetch(`${host}/store/carts/${cart.id}/line-items`, {
      method: "POST",
      headers: storeHeaders,
      body: JSON.stringify({
        variant_id: it.variant_id,
        quantity: Number(it.quantity || 1)
      })
    })
    if (!itemRes.ok) {
      const errItem = await itemRes.json()
      return res.status(400).json({ message: errItem.message || "خطا در افزودن لباس به سبد خرید (موجودی ناکافی)." })
    }
  }

  // Set Address
  const addrPayload = {
    first_name: customer.first_name,
    last_name: customer.last_name,
    address_1: customer.address_1,
    city: customer.city,
    province: customer.province,
    postal_code: customer.postal_code || "1111111111",
    country_code: "ir",
    phone: phone
  }

  await fetch(`${host}/store/carts/${cart.id}`, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({
      email,
      shipping_address: addrPayload,
      billing_address: addrPayload
    })
  })

  // Set Shipping Method
  const finalShipOptionId = shipping_option_id || "so_01M5WY3DB3NM6CKZXN5JRCPX9Y"
  await fetch(`${host}/store/carts/${cart.id}/shipping-methods`, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({
      option_id: finalShipOptionId
    })
  })

  // Payment Collection & Session
  const payColResp = await fetch(`${host}/store/payment-collections`, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({ cart_id: cart.id })
  })
  const payColData = await payColResp.json()

  await fetch(`${host}/store/payment-collections/${payColData.payment_collection.id}/payment-sessions`, {
    method: "POST",
    headers: storeHeaders,
    body: JSON.stringify({ provider_id: "pp_system_default" })
  })

  // Complete Cart to make an Order
  const compResp = await fetch(`${host}/store/carts/${cart.id}/complete`, {
    method: "POST",
    headers: storeHeaders
  })

  if (!compResp.ok) {
    const errData = await compResp.json()
    return res.status(400).json({ message: errData.message || "خطا در ثبت نهایی فاکتور سفارش." })
  }

  const { order } = await compResp.json()

  // Apply custom shipping price if provided
  const body = (req.body || {}) as any
  const customShipPrice = body.custom_shipping_price !== undefined
    ? Math.max(0, parseInt(String(body.custom_shipping_price)) || 0)
    : null

  if (customShipPrice !== null) {
    try {
      // 1. Update order_shipping_method
      await pgConnection.raw(`
        UPDATE order_shipping_method
        SET amount = ?, raw_amount = jsonb_build_object('value', ?::text, 'precision', 20), is_custom_amount = true, updated_at = NOW()
        WHERE id IN (
          SELECT shipping_method_id FROM order_shipping WHERE order_id = ?
        )
      `, [customShipPrice, String(customShipPrice), order.id])

      // 2. Calculate item subtotal
      const itemsSumRes = await pgConnection.raw(`
        SELECT COALESCE(SUM(oli.unit_price::numeric * oi.quantity::int), 0) as items_subtotal
        FROM order_item oi
        JOIN order_line_item oli ON oli.id = oi.item_id
        WHERE oi.order_id = ?
      `, [order.id])
      const itemSub = Number(itemsSumRes.rows[0]?.items_subtotal || 0)
      const newTotal = itemSub + customShipPrice

      // 3. Update order_summary totals
      await pgConnection.raw(`
        UPDATE order_summary
        SET totals = jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                totals,
                '{shipping_total}',
                to_jsonb(?::numeric)
              ),
              '{current_order_total}',
              to_jsonb(?::numeric)
            ),
            '{original_order_total}',
            to_jsonb(?::numeric)
          ),
          '{accounting_total}',
          to_jsonb(?::numeric)
        ),
        updated_at = NOW()
        WHERE order_id = ?
      `, [customShipPrice, newTotal, newTotal, newTotal, order.id])

      order.total = newTotal
    } catch (shipErr) {
      console.error("Error applying custom shipping price to order:", shipErr)
    }
  }

  // Tag order metadata with Iranian source & status
  const sourceLabels: Record<string, string> = {
    instagram_direct: "دایرکت اینستاگرام",
    whatsapp: "واتساپ / تلگرام",
    phone: "سفارش تلفنی",
    in_person: "خرید حضوری / مستقیم"
  }

  const orderMeta = {
    order_source,
    source_title: sourceLabels[order_source] || "سفارش تلفنی / دایرکت",
    source_notes: source_notes || "",
    payment_method,
    fulfillment_status_fa: "در حال آماده‌سازی و بسته‌بندی در انبار"
  }

  await pgConnection.raw(
    'UPDATE public."order" SET metadata = jsonb_set(COALESCE(metadata, \'{}\'::jsonb), \'{iranian_order}\', ?::jsonb), updated_at = NOW() WHERE id = ?',
    [JSON.stringify(orderMeta), order.id]
  )

  // Log this order creation into admin_activity_log for the logged in user
  const userId = (req as any).auth_context?.actor_id || (req as any).user?.id || 'user_01M5SP73MA566NQBTS4KHH9699'
  const userRes = await pgConnection.raw('SELECT email, first_name, last_name FROM public."user" WHERE id = ?', [userId])
  const uObj = userRes?.rows?.[0] || {}
  const uName = `${uObj.first_name || ""} ${uObj.last_name || ""}`.trim() || uObj.email || "مدیریت فروشگاه"

  const actId = 'act_' + Math.random().toString(36).substring(2, 11)
  await pgConnection.raw(`
    INSERT INTO admin_activity_log (id, user_id, user_email, user_name, action_type, action_title, target_type, target_id, target_url, details, created_at)
    VALUES (?, ?, ?, ?, 'order_create', ?, 'order', ?, ?, ?, NOW())
  `, [
    actId,
    userId,
    uObj.email || 'admin@medusa-test.com',
    uName,
    `ثبت سفارش جدید #${order.display_id} (${customer.first_name} ${customer.last_name})`,
    order.id,
    `/orders/${order.id}`,
    `ثبت سفارش از منبع ${sourceLabels[order_source] || "دایرکت"} به مبلغ ${Math.round(order.total).toLocaleString("fa-IR")} تومان به مقصد ${customer.province} - ${customer.city}`
  ]).catch(() => {})

  res.status(201).json({
    message: "سفارش دایرکت / تلفنی با موفقیت ثبت شد.",
    order_id: order.id,
    display_id: order.display_id,
    total: order.total,
    customer_name: `${customer.first_name} ${customer.last_name}`,
    phone: phone
  })
}
