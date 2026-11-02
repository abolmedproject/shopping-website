import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // 1. Get Categories
  const catRes = await pgConnection.raw(`
    SELECT id, name FROM product_category WHERE deleted_at IS NULL ORDER BY name ASC
  `)

  // 2. Get Default Sales Channel, Shipping Profile, Location
  const scRes = await pgConnection.raw(`SELECT id, name FROM sales_channel WHERE deleted_at IS NULL LIMIT 1`)
  const spRes = await pgConnection.raw(`SELECT id, name FROM shipping_profile WHERE deleted_at IS NULL LIMIT 1`)
  const locRes = await pgConnection.raw(`SELECT id, name FROM stock_location WHERE deleted_at IS NULL LIMIT 1`)

  res.json({
    categories: catRes.rows,
    defaults: {
      sales_channel: scRes.rows[0] || { id: "sc_01M5SP4WRFQSXRDXY2H0XFEHK7", name: "Default Sales Channel" },
      shipping_profile: spRes.rows[0] || { id: "sp_01M5SP4WKST2BZH6F30TEVP5GZ", name: "Default Shipping Profile" },
      stock_location: locRes.rows[0] || { id: "sloc_01M5SP4WX70FRZS9TBX6389AM7", name: "انبار مرکزی تهران" },
      currency_code: "irt",
      currency_symbol: "تومان"
    },
    suggested_colors: [
      { name: "مشکی", code: "#000000", tag: "Black" },
      { name: "سفید", code: "#FFFFFF", tag: "White" },
      { name: "طوسی", code: "#9CA3AF", tag: "Gray" },
      { name: "کرم", code: "#F3E8D2", tag: "Beige" },
      { name: "سرمه‌ای", code: "#1E3A8A", tag: "Navy" },
      { name: "سبز زیتونی", code: "#4D7C0F", tag: "Olive" },
      { name: "زرشکی", code: "#881337", tag: "Maroon" },
      { name: "جین / آبی", code: "#2563EB", tag: "Denim" }
    ],
    suggested_sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "فری‌سایز"]
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const {
    title,
    subtitle = "",
    description = "",
    category_id,
    thumbnail = "",
    color_images = {},
    retail_price = 0,
    cost_price = 0,
    colors = [],
    sizes = [],
    variants = [],
    apparel_specs = {}
  } = req.body as any

  if (!title || !title.trim()) {
    return res.status(400).json({ message: "وارد کردن عنوان لباس الزامی است." })
  }

  if (!variants || variants.length === 0) {
    return res.status(400).json({ message: "حداقل یک تنوع سایز/رنگ با قیمت و موجودی الزامی است." })
  }

  const numRetail = Math.max(0, parseInt(String(retail_price).replace(/[^0-9]/g, "")) || 0)
  const numCost = Math.max(0, parseInt(String(cost_price).replace(/[^0-9]/g, "")) || 0)

  // 1. Create Product
  const productId = "prod_" + Math.random().toString(36).substring(2, 12)
  const baseHandle = title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, "")
  const handle = `${baseHandle}-${Math.random().toString(36).substring(2, 6)}`

  const productMeta = {
    cost_price: numCost ? String(numCost) : null,
    color_images: color_images || {},
    apparel_specs: {
      fabric: apparel_specs.fabric || "۱۰۰٪ نخ پنبه صادراتی",
      fit: apparel_specs.fit || "قواره استاندارد (Regular Fit)",
      season: apparel_specs.season || "چهارفصل / پاییزه و زمستانه",
      care: apparel_specs.care || "شستشو با آب ۳۰ درجه بدون سفیدکننده"
    }
  }

  await pgConnection.raw(`
    INSERT INTO product (
      id, title, subtitle, description, handle, status, thumbnail, discountable, is_giftcard, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'published', ?, true, false, ?, NOW(), NOW())
  `, [
    productId,
    title.trim(),
    subtitle.trim() || null,
    description.trim() || subtitle.trim() || "پوشاک باکیفیت و دوخت صنعتی",
    handle,
    thumbnail || "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
    JSON.stringify(productMeta)
  ])

  // 2. Link Default Sales Channel
  const scId = "sc_01M5SP4WRFQSXRDXY2H0XFEHK7"
  const pscId = "psc_" + Math.random().toString(36).substring(2, 12)
  await pgConnection.raw(`
    INSERT INTO product_sales_channel (id, product_id, sales_channel_id, created_at, updated_at)
    VALUES (?, ?, ?, NOW(), NOW())
    ON CONFLICT DO NOTHING
  `, [pscId, productId, scId])

  // 3. Link Default Shipping Profile
  const spId = "sp_01M5SP4WKST2BZH6F30TEVP5GZ"
  const pspId = "psp_" + Math.random().toString(36).substring(2, 12)
  await pgConnection.raw(`
    INSERT INTO product_shipping_profile (id, product_id, shipping_profile_id, created_at, updated_at)
    VALUES (?, ?, ?, NOW(), NOW())
    ON CONFLICT DO NOTHING
  `, [pspId, productId, spId])

  // 4. Link Category (if provided)
  if (category_id) {
    await pgConnection.raw(`
      INSERT INTO product_category_product (product_id, product_category_id)
      VALUES (?, ?)
      ON CONFLICT DO NOTHING
    `, [productId, category_id])
  }

  // 5. Link Shared Options: Color & Size
  const colorOptId = "opt_01M5SP4X3Q4BVEDP942QDS7VBN" // Global Color option
  const sizeOptId = "opt_01M5SP4X3QA4MXQCS3JHT6XKB9"  // Global Size option

  const ppoColorId = "ppo_" + Math.random().toString(36).substring(2, 12)
  const ppoSizeId = "ppo_" + Math.random().toString(36).substring(2, 12)
  await pgConnection.raw(`
    INSERT INTO product_product_option (id, product_id, product_option_id, created_at, updated_at)
    VALUES (?, ?, ?, NOW(), NOW()), (?, ?, ?, NOW(), NOW())
    ON CONFLICT DO NOTHING
  `, [ppoColorId, productId, colorOptId, ppoSizeId, productId, sizeOptId])

  // Map values for options (Find existing or insert if new)
  const colorValIds: Record<string, string> = {}
  for (const c of colors) {
    const existing = await pgConnection.raw(
      'SELECT id FROM product_option_value WHERE option_id = ? AND value = ? LIMIT 1',
      [colorOptId, c]
    )
    if (existing.rows[0]) {
      colorValIds[c] = existing.rows[0].id
    } else {
      const vid = "optval_" + Math.random().toString(36).substring(2, 12)
      colorValIds[c] = vid
      await pgConnection.raw(`
        INSERT INTO product_option_value (id, option_id, value, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `, [vid, colorOptId, c])
    }
  }

  const sizeValIds: Record<string, string> = {}
  for (const s of sizes) {
    const existing = await pgConnection.raw(
      'SELECT id FROM product_option_value WHERE option_id = ? AND value = ? LIMIT 1',
      [sizeOptId, s]
    )
    if (existing.rows[0]) {
      sizeValIds[s] = existing.rows[0].id
    } else {
      const vid = "optval_" + Math.random().toString(36).substring(2, 12)
      sizeValIds[s] = vid
      await pgConnection.raw(`
        INSERT INTO product_option_value (id, option_id, value, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `, [vid, sizeOptId, s])
    }
  }

  // 6. Create Each Variant, Prices, Inventory Item & Level
  const warehouseLocationId = "sloc_01M5SP4WX70FRZS9TBX6389AM7" // انبار مرکزی تهران
  const prefix = handle.slice(0, 5).toUpperCase()

  for (const v of variants) {
    const variantId = "variant_" + Math.random().toString(36).substring(2, 12)
    const varTitle = v.title || `${v.color || "تک‌رنگ"} / ${v.size || "فری‌سایز"}`
    const vSku = v.sku || `${prefix}-${(v.color || "").toUpperCase()}-${(v.size || "").toUpperCase()}`
    const vPrice = Math.max(0, parseInt(String(v.price).replace(/[^0-9]/g, "")) || numRetail)
    const vStock = Math.max(0, parseInt(String(v.stock).replace(/[^0-9]/g, "")) || 0)

    // A) Insert Variant with specific Color/Variant Thumbnail
    const variantThumbnail = v.thumbnail || (v.color && color_images[v.color]) || thumbnail || null
    await pgConnection.raw(`
      INSERT INTO product_variant (
        id, product_id, title, sku, manage_inventory, allow_backorder, thumbnail, created_at, updated_at
      ) VALUES (?, ?, ?, ?, true, false, ?, NOW(), NOW())
    `, [variantId, productId, varTitle, vSku, variantThumbnail])

    // B) Link Variant Options
    if (v.color && colorValIds[v.color]) {
      const pvoId = "pvo_" + Math.random().toString(36).substring(2, 12)
      await pgConnection.raw(`
        INSERT INTO product_variant_option (variant_id, option_value_id) VALUES (?, ?)
      `, [variantId, colorValIds[v.color]])
    }

    if (v.size && sizeValIds[v.size]) {
      const pvoId = "pvo_" + Math.random().toString(36).substring(2, 12)
      await pgConnection.raw(`
        INSERT INTO product_variant_option (variant_id, option_value_id) VALUES (?, ?)
      `, [variantId, sizeValIds[v.size]])
    }

    // C) Price Set & Price
    const priceSetId = "pset_" + Math.random().toString(36).substring(2, 12)
    await pgConnection.raw(`
      INSERT INTO price_set (id, created_at, updated_at)
      VALUES (?, NOW(), NOW())
    `, [priceSetId])

    const pvpsId = "pvps_" + Math.random().toString(36).substring(2, 12)
    await pgConnection.raw(`
      INSERT INTO product_variant_price_set (id, variant_id, price_set_id, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW())
    `, [pvpsId, variantId, priceSetId])

    const priceId = "price_" + Math.random().toString(36).substring(2, 12)
    await pgConnection.raw(`
      INSERT INTO price (
        id, price_set_id, currency_code, amount, raw_amount, rules_count, created_at, updated_at
      ) VALUES (
        ?, ?, 'irt', ?, json_build_object('value', ?::text, 'precision', 20)::jsonb, 0, NOW(), NOW()
      )
    `, [priceId, priceSetId, vPrice, vPrice])

    // D) Inventory Item
    const invItemId = "iitem_" + Math.random().toString(36).substring(2, 12)
    await pgConnection.raw(`
      INSERT INTO inventory_item (
        id, sku, title, description, requires_shipping, created_at, updated_at
      ) VALUES (?, ?, ?, ?, true, NOW(), NOW())
    `, [invItemId, vSku, varTitle, `${title} - ${varTitle}`])

    // E) Link Variant to Inventory Item
    const pvItemLinkId = "pvitem_" + Math.random().toString(36).substring(2, 12)
    await pgConnection.raw(`
      INSERT INTO product_variant_inventory_item (
        id, variant_id, inventory_item_id, required_quantity, created_at, updated_at
      ) VALUES (?, ?, ?, 1, NOW(), NOW())
    `, [pvItemLinkId, variantId, invItemId])

    // F) Link Inventory Level to Central Warehouse with Initial Stock Quantity
    const invLevelId = "ilev_" + Math.random().toString(36).substring(2, 12)
    await pgConnection.raw(`
      INSERT INTO inventory_level (
        id, inventory_item_id, location_id, stocked_quantity, reserved_quantity, incoming_quantity,
        raw_stocked_quantity, raw_reserved_quantity, raw_incoming_quantity, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, 0, 0,
        json_build_object('value', ?::text, 'precision', 20)::jsonb,
        json_build_object('value', '0', 'precision', 20)::jsonb,
        json_build_object('value', '0', 'precision', 20)::jsonb,
        NOW(), NOW()
      )
    `, [invLevelId, invItemId, warehouseLocationId, vStock, vStock])
  }

  // 7. Log Activity in admin_activity_log for the caller
  const callerUser = (req as any).user || {}
  const callerId = (req as any).auth_context?.actor_id || callerUser.id || "user_01M5SP73MA566NQBTS4KHH9699"
  const actId = "act_" + Math.random().toString(36).substring(2, 11)

  await pgConnection.raw(`
    INSERT INTO admin_activity_log (
      id, user_id, user_email, user_name, action_type, action_title, target_type, target_id, target_url, details, created_at
    ) VALUES (?, ?, ?, ?, 'product_create', ?, 'product', ?, ?, ?, NOW())
  `, [
    actId,
    callerId,
    callerUser.email || "admin@medusa-test.com",
    `${callerUser.first_name || ""} ${callerUser.last_name || ""}`.trim() || "مدیر فروشگاه",
    `ایجاد سریع لباس جدید: ${title.trim()}`,
    productId,
    `/products/${productId}`,
    `ثبت کالا با ${variants.length} تنوع، قیمت فروش ${numRetail.toLocaleString("fa-IR")} تومان، بهای تمام‌شده ${numCost.toLocaleString("fa-IR")} تومان و اتصال فوری به انبار مرکزی`
  ]).catch(() => {})

  res.status(201).json({
    message: "لباس جدید با تمامی تنوع‌ها، قیمت‌ها و اتصال خودکار به انبار مرکزی تهران با موفقیت ایجاد شد.",
    product_id: productId,
    handle,
    variants_count: variants.length
  })
  } catch (err: any) {
    console.error("FAST PRODUCT CREATE POST ERROR:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
}
