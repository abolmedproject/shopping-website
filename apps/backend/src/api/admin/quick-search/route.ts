import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const ADMIN_PAGES = [
  { title: "سفارش‌های پردازش‌شده (آماده ارسال)", path: "/processed-orders", category: "سفارشات", icon: "📦" },
  { title: "سفارشات فروشگاه", path: "/orders", category: "سفارشات", icon: "🛍️" },
  { title: "ثبت سریع سفارش (دایرکت / تلفنی)", path: "/quick-order", category: "سفارشات", icon: "⚡" },
  { title: "ایجاد سریع لباس (تک‌مرحله‌ای)", path: "/fast-product-create", category: "محصولات", icon: "👕" },
  { title: "محصولات و کاتالوگ لباس", path: "/products", category: "محصولات", icon: "🏷️" },
  { title: "دسته‌بندی‌های پوشاک", path: "/categories", category: "محصولات", icon: "📁" },
  { title: "ویژگی‌های لباس (سایز و رنگ)", path: "/product-options", category: "محصولات", icon: "🎨" },
  { title: "مدیریت موجودی انبار مرکزی", path: "/inventory", category: "انبارداری", icon: "🏭" },
  { title: "تحلیل فروش و سود پوشاک (Analytics)", path: "/fashion-analytics", category: "گزارشات", icon: "📊" },
  { title: "تبلیغات و کمپین‌ها (ROI)", path: "/campaign-analytics", category: "مارکتینگ", icon: "📢" },
  { title: "کاربران و سطوح دسترسی (RBAC)", path: "/users-permissions", category: "مدیریت", icon: "👥" },
  { title: "لیست خریداران و مشتریان", path: "/customers", category: "مشتریان", icon: "👤" },
  { title: "پروفایل و اطلاعات حساب کاربری", path: "/settings/profile", category: "تنظیمات", icon: "⚙️" },
  { title: "کلیدهای API محرمانه و عمومی", path: "/settings/publishable-api-keys", category: "توسعه‌دهنده", icon: "🔑" },
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { q = "", sla } = req.query as { q?: string; sla?: string }

  // Check delayed orders (>24 hours pending without tracking code)
  const delayedRes = await pgConnection.raw(`
    SELECT 
      o.id,
      o.display_id,
      oa.first_name,
      oa.last_name,
      oa.phone,
      oa.city,
      oa.province,
      ROUND(EXTRACT(EPOCH FROM (NOW() - o.created_at))/3600)::int as hours_delayed,
      o.created_at
    FROM public."order" o
    LEFT JOIN order_address oa ON oa.id = o.shipping_address_id
    WHERE o.status = 'pending' 
      AND (o.metadata->'iranian_order'->>'postal_tracking_code' IS NULL OR o.metadata->'iranian_order'->>'postal_tracking_code' = '')
      AND o.created_at < NOW() - INTERVAL '24 hours'
    ORDER BY o.created_at ASC
    LIMIT 10
  `)

  const delayedOrders = delayedRes.rows.map((r: any) => ({
    id: r.id,
    display_id: r.display_id,
    customer_name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.phone,
    phone: r.phone || "—",
    city: `${r.province || ""} - ${r.city || ""}`.trim(),
    hours_delayed: Number(r.hours_delayed || 24),
  }))

  const term = q.trim()
  if (!term || term.length < 1) {
    return res.json({ 
      pages: [],
      products: [],
      orders: [], 
      customers: [],
      delayed_orders_count: delayedOrders.length,
      delayed_orders: delayedOrders
    })
  }

  // 1. Search Admin Pages
  const matchedPages = ADMIN_PAGES.filter(p => 
    p.title.includes(term) || p.category.includes(term) || p.path.includes(term.toLowerCase())
  ).slice(0, 5)

  // 2. Search Products & Variants
  const productsRes = await pgConnection.raw(`
    SELECT 
      p.id,
      p.title,
      p.thumbnail,
      pv.id as variant_id,
      pv.title as variant_title,
      pv.sku,
      COALESCE(il.stocked_quantity, 0)::int as stock_quantity
    FROM product p
    LEFT JOIN product_variant pv ON pv.product_id = p.id
    LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
    LEFT JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
    WHERE p.deleted_at IS NULL AND (
      p.title ILIKE ? OR
      pv.title ILIKE ? OR
      pv.sku ILIKE ?
    )
    ORDER BY p.created_at DESC
    LIMIT 6
  `, [`%${term}%`, `%${term}%`, `%${term}%`])

  // 3. Search Customers by phone, name, email
  const customersRes = await pgConnection.raw(`
    SELECT 
      c.id,
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      COUNT(DISTINCT o.id)::int as orders_count
    FROM customer c
    LEFT JOIN public."order" o ON o.customer_id = c.id
    WHERE c.deleted_at IS NULL AND (
      c.phone ILIKE ? OR
      c.first_name ILIKE ? OR
      c.last_name ILIKE ? OR
      c.email ILIKE ?
    )
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT 6
  `, [`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`])

  // 4. Search Orders by phone, display_id, customer name, postal tracking
  const isNumeric = /^\d+$/.test(term)
  const displayIdParam = isNumeric ? parseInt(term) : -1

  const ordersRes = await pgConnection.raw(`
    SELECT 
      o.id,
      o.display_id,
      o.status,
      COALESCE(os.totals->>'accounting_total', '0')::numeric as total,
      oa.first_name,
      oa.last_name,
      oa.phone,
      oa.city,
      oa.province,
      o.metadata->'iranian_order'->>'source_title' as source_title,
      o.metadata->'iranian_order'->>'postal_tracking_code' as tracking_code,
      o.metadata->'iranian_order'->>'fulfillment_status_fa' as fulfillment_status_fa,
      o.created_at
    FROM public."order" o
    LEFT JOIN order_address oa ON oa.id = o.shipping_address_id
    LEFT JOIN order_summary os ON os.order_id = o.id
    WHERE o.deleted_at IS NULL AND (
      oa.phone ILIKE ? OR
      oa.first_name ILIKE ? OR
      oa.last_name ILIKE ? OR
      o.metadata->'iranian_order'->>'postal_tracking_code' ILIKE ? OR
      o.display_id = ?
    )
    ORDER BY o.display_id DESC
    LIMIT 6
  `, [`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`, displayIdParam])

  const shamsiFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  res.json({
    delayed_orders_count: delayedOrders.length,
    delayed_orders: delayedOrders,
    pages: matchedPages,
    products: productsRes.rows.map((p: any) => ({
      id: p.id,
      title: p.title,
      variant_title: p.variant_title,
      sku: p.sku,
      thumbnail: p.thumbnail,
      stock_quantity: Number(p.stock_quantity || 0)
    })),
    customers: customersRes.rows.map((c: any) => ({
      id: c.id,
      name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.phone,
      email: c.email,
      phone: c.phone || "—",
      orders_count: Number(c.orders_count || 0)
    })),
    orders: ordersRes.rows.map((o: any) => ({
      id: o.id,
      display_id: o.display_id,
      customer_name: `${o.first_name || ""} ${o.last_name || ""}`.trim() || o.phone,
      phone: o.phone || "—",
      city: `${o.province || ""} - ${o.city || ""}`.trim() || "نامشخص",
      total: Number(o.total || 0),
      status: o.status,
      source_title: o.source_title || "فروشگاه آنلاین",
      tracking_code: o.tracking_code || null,
      fulfillment_status_fa: o.fulfillment_status_fa || "در حال آماده‌سازی و بسته‌بندی در انبار",
      shamsi_date: shamsiFormatter.format(new Date(o.created_at))
    }))
  })
}
