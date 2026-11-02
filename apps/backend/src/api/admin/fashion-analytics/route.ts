import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // 1. Identify current user and check RBAC permissions
  let userRbac: any = null
  const userId = (req as any).auth_context?.actor_id || (req as any).user?.id

  if (userId) {
    const userRes = await pgConnection.raw(
      'SELECT id, email, first_name, last_name, metadata FROM public."user" WHERE id = ? AND deleted_at IS NULL',
      [userId]
    )
    if (userRes?.rows?.[0]) {
      const u = userRes.rows[0]
      userRbac = u.metadata?.rbac || {
        role: u.email === "admin@medusa-test.com" ? "owner" : "staff",
        status: "active",
        permissions: u.email === "admin@medusa-test.com" ? ["*"] : []
      }
    }
  }

  const isOwner = userRbac?.role === "owner" || userRbac?.permissions?.includes("*")
  const isSuspended = userRbac?.status === "suspended"
  const canViewAnalytics = isOwner || userRbac?.permissions?.includes("analytics.view")
  const canViewFinancials = isOwner || 
    userRbac?.permissions?.includes("analytics.financial") || 
    userRbac?.permissions?.includes("*")

  if (isSuspended) {
    return res.status(403).json({
      message: "حساب کاربری شما توسط مدیریت فروشگاه تعلیق شده است.",
      code: "ACCOUNT_SUSPENDED"
    })
  }

  if (!canViewAnalytics) {
    return res.status(403).json({
      message: "شما مجوز دسترسی به داشبورد تحلیلی را ندارید.",
      code: "FORBIDDEN"
    })
  }

  const { timeframe = "daily", stock_threshold = "50" } = req.query as { timeframe?: string; stock_threshold?: string }
  const threshold = Math.max(1, parseInt(String(stock_threshold).replace(/[^0-9]/g, "")) || 50)

  // 2. Query KPIs with Deduplicated CTEs for exact math
  const kpiDataRes = await pgConnection.raw(`
    WITH latest_summary AS (
      SELECT DISTINCT ON (order_id)
        order_id,
        COALESCE(CAST(totals->>'accounting_total' as numeric), 0) as accounting_total,
        COALESCE(CAST(totals->>'refunded_total' as numeric), 0) as refunded_total
      FROM order_summary
      ORDER BY order_id, version DESC
    ),
    active_items AS (
      SELECT DISTINCT ON (oi.order_id, oi.item_id)
        oi.order_id,
        oi.quantity::int as qty,
        COALESCE(oli.unit_price, 0)::numeric as unit_price,
        COALESCE(NULLIF(p.metadata->>'cost_price', '')::numeric, COALESCE(oli.unit_price, 0) * 0.6)::numeric as unit_cost
      FROM order_item oi
      JOIN order_line_item oli ON oli.id = oi.item_id
      LEFT JOIN product p ON p.id = oli.product_id
      JOIN public.order o ON o.id = oi.order_id AND o.status != 'canceled' AND o.deleted_at IS NULL
      ORDER BY oi.order_id, oi.item_id, oi.version DESC
    )
    SELECT 
      (SELECT COUNT(DISTINCT id)::int FROM public.order WHERE deleted_at IS NULL) as total_orders,
      (SELECT COUNT(DISTINCT id)::int FROM public.order WHERE status = 'completed' AND deleted_at IS NULL) as completed_orders,
      (SELECT COUNT(DISTINCT id)::int FROM public.order WHERE status = 'pending' AND deleted_at IS NULL) as pending_orders,
      (SELECT COUNT(DISTINCT id)::int FROM public.order WHERE status = 'canceled' AND deleted_at IS NULL) as canceled_orders,
      (SELECT COALESCE(SUM(accounting_total), 0)::numeric FROM latest_summary ls JOIN public.order o ON o.id = ls.order_id WHERE o.status != 'canceled' AND o.deleted_at IS NULL) as gross_revenue,
      (SELECT COALESCE(SUM(refunded_total), 0)::numeric FROM latest_summary ls JOIN public.order o ON o.id = ls.order_id WHERE o.status != 'canceled' AND o.deleted_at IS NULL) as total_refunds,
      (SELECT COALESCE(SUM(qty), 0)::int FROM active_items) as total_items_sold,
      (SELECT COALESCE(SUM(qty * unit_cost), 0)::numeric FROM active_items) as total_cogs
  `)

  const kpiRow = kpiDataRes.rows[0] || {}
  const totalOrders = Number(kpiRow.total_orders || 0)
  const totalItemsSold = Number(kpiRow.total_items_sold || 0)
  const completedOrders = Number(kpiRow.completed_orders || 0)
  const pendingOrders = Number(kpiRow.pending_orders || 0)
  const canceledOrders = Number(kpiRow.canceled_orders || 0)

  const grossRevenue = Number(kpiRow.gross_revenue || 0)
  const totalRefunds = Number(kpiRow.total_refunds || 0)
  const netRevenue = grossRevenue - totalRefunds
  const totalCogs = Number(kpiRow.total_cogs || 0)
  const grossProfit = Math.max(0, netRevenue - totalCogs)
  const profitMarginPercent = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 1000) / 10 : 0
  const avgOrderValue = totalOrders > 0 ? Math.round(netRevenue / totalOrders) : 0

  // 3. Detailed Order Data with Items & Customers for drilldowns
  const allOrdersRes = await pgConnection.raw(`
    WITH latest_summary AS (
      SELECT DISTINCT ON (order_id)
        order_id,
        COALESCE(CAST(totals->>'accounting_total' as numeric), 0) as accounting_total
      FROM order_summary
      ORDER BY order_id, version DESC
    ),
    order_items_agg AS (
      SELECT 
        oi.order_id,
        STRING_AGG(CONCAT(oli.title, ' (', COALESCE(oli.variant_title, ''), ' × ', oi.quantity, ')'), ' + ') as items_desc,
        SUM(oi.quantity)::int as total_qty,
        SUM(oi.quantity * COALESCE(NULLIF(p.metadata->>'cost_price', '')::numeric, COALESCE(oli.unit_price, 0) * 0.6))::numeric as order_cogs
      FROM (
        SELECT DISTINCT ON (order_id, item_id) order_id, item_id, quantity, version
        FROM order_item
        ORDER BY order_id, item_id, version DESC
      ) oi
      JOIN order_line_item oli ON oli.id = oi.item_id
      LEFT JOIN product p ON p.id = oli.product_id
      GROUP BY oi.order_id
    )
    SELECT 
      o.id as order_id,
      o.display_id,
      o.created_at,
      TO_CHAR(o.created_at, 'YYYY-MM-DD') as date_str,
      COALESCE(ls.accounting_total, 0)::numeric as total,
      COALESCE(oia.order_cogs, 0)::numeric as cogs,
      COALESCE(oia.total_qty, 1)::int as items_count,
      COALESCE(oia.items_desc, 'پوشاک و البسه') as items_desc,
      COALESCE(o.metadata->'iranian_order'->>'payment_method', 'درگاه بانکی شاپرک (سیستمی)') as payment_method,
      CONCAT(COALESCE(oa.first_name, ''), ' ', COALESCE(oa.last_name, '')) as customer_name,
      oa.phone,
      oa.city
    FROM public.order o
    LEFT JOIN latest_summary ls ON ls.order_id = o.id
    LEFT JOIN order_items_agg oia ON oia.order_id = o.id
    LEFT JOIN order_address oa ON oa.id = o.shipping_address_id
    WHERE o.deleted_at IS NULL AND o.status != 'canceled'
    ORDER BY o.display_id DESC
  `)

  const shamsiTimeFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tehran'
  })
  const shamsiDayFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Tehran'
  })
  const shamsiFullFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tehran'
  })

  const enrichedOrders = allOrdersRes.rows.map((r: any) => {
    const d = new Date(r.created_at)
    return {
      id: r.order_id,
      display_id: r.display_id,
      customer_name: r.customer_name?.trim() || r.phone || "مشتری فروشگاه",
      phone: r.phone || "—",
      city: r.city || "نامشخص",
      total: canViewFinancials ? Number(r.total) : null,
      cogs: canViewFinancials ? Number(r.cogs) : null,
      net_profit: canViewFinancials ? Math.max(0, Number(r.total) - Number(r.cogs)) : null,
      items_count: Number(r.items_count),
      items_desc: r.items_desc,
      payment_method: r.payment_method,
      created_at: r.created_at,
      date_str: r.date_str,
      shamsi_date: shamsiFullFmt.format(d),
      shamsi_time: shamsiTimeFmt.format(d)
    }
  })

  // 4. Construct Continuous Timeline Buckets (Daily, Weekly, Monthly)
  const now = new Date()
  let salesTrends: any[] = []

  if (timeframe === "weekly") {
    // 6 Consecutive Weeks
    for (let i = 5; i >= 0; i--) {
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)

      const bucketOrders = enrichedOrders.filter((o: any) => {
        const od = new Date(o.created_at)
        return od >= start && od <= end
      })

      const bRev = bucketOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
      const bCogs = bucketOrders.reduce((sum: number, o: any) => sum + (o.cogs || 0), 0)
      const bItems = bucketOrders.reduce((sum: number, o: any) => sum + o.items_count, 0)

      salesTrends.push({
        id: `week_${i}`,
        label: `${shamsiDayFmt.format(start)} تا ${shamsiDayFmt.format(end)}`,
        full_label: `هفته ${shamsiDayFmt.format(start)} تا ${shamsiDayFmt.format(end)}`,
        orders: bucketOrders.length,
        items: bItems,
        revenue: canViewFinancials ? bRev : null,
        total_sales: canViewFinancials ? bRev : null,
        cogs: canViewFinancials ? bCogs : null,
        net_income: canViewFinancials ? Math.max(0, bRev - bCogs) : null,
        orders_list: bucketOrders
      })
    }
  } else if (timeframe === "monthly") {
    // 6 Consecutive Months
    const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"]
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000)
      const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

      const bucketOrders = enrichedOrders.filter((o: any) => {
        const od = new Date(o.created_at)
        return od >= start && od <= end
      })

      const bRev = bucketOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
      const bCogs = bucketOrders.reduce((sum: number, o: any) => sum + (o.cogs || 0), 0)
      const bItems = bucketOrders.reduce((sum: number, o: any) => sum + o.items_count, 0)

      const shamsiMonthFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', year: 'numeric', timeZone: 'Asia/Tehran' })

      salesTrends.push({
        id: `month_${i}`,
        label: shamsiMonthFmt.format(d),
        full_label: `ماه ${shamsiMonthFmt.format(d)}`,
        orders: bucketOrders.length,
        items: bItems,
        revenue: canViewFinancials ? bRev : null,
        total_sales: canViewFinancials ? bRev : null,
        cogs: canViewFinancials ? bCogs : null,
        net_income: canViewFinancials ? Math.max(0, bRev - bCogs) : null,
        orders_list: bucketOrders
      })
    }
  } else {
    // DEFAULT: Daily (14 Consecutive Days with Zero-Sales Days included!)
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().slice(0, 10)

      const bucketOrders = enrichedOrders.filter((o: any) => o.date_str === dateStr)
      const bRev = bucketOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
      const bCogs = bucketOrders.reduce((sum: number, o: any) => sum + (o.cogs || 0), 0)
      const bItems = bucketOrders.reduce((sum: number, o: any) => sum + o.items_count, 0)

      salesTrends.push({
        id: dateStr,
        date: dateStr,
        label: shamsiDayFmt.format(d),
        full_label: shamsiFullFmt.format(d),
        orders: bucketOrders.length,
        items: bItems,
        revenue: canViewFinancials ? bRev : null,
        total_sales: canViewFinancials ? bRev : null,
        cogs: canViewFinancials ? bCogs : null,
        net_income: canViewFinancials ? Math.max(0, bRev - bCogs) : null,
        orders_list: bucketOrders
      })
    }
  }

  // 5. Payment Methods Breakdown (Standard 3 Methods + Interactive Drilldown Orders)
  const validMethods = [
    "درگاه بانکی شاپرک (سیستمی)",
    "کارت به کارت / واریز مستقیم",
    "پرداخت در محل (COD)"
  ]

  // Filter orders according to timeframe if needed
  const timeframeOrderIds = new Set(salesTrends.flatMap(t => t.orders_list.map((o: any) => o.id)))
  const relevantOrders = enrichedOrders.filter((o: any) => timeframeOrderIds.has(o.id))
  const totalRelevantOrders = relevantOrders.length || 1

  const paymentMethods = validMethods.map(methodName => {
    const methodOrders = relevantOrders.filter((o: any) => {
      const pm = (o.payment_method || "").trim()
      if (methodName.includes("شاپرک")) return pm.includes("شاپرک") || pm.includes("درگاه") || !pm
      if (methodName.includes("کارت")) return pm.includes("کارت") || pm.includes("شتاب")
      if (methodName.includes("محل")) return pm.includes("محل") || pm.includes("COD") || pm.includes("حضوری")
      return pm === methodName
    })

    const count = methodOrders.length
    const revenue = methodOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
    const percentage = Math.round((count / totalRelevantOrders) * 100)

    return {
      name: methodName,
      count,
      revenue: canViewFinancials ? revenue : null,
      percentage,
      orders: methodOrders
    }
  }).sort((a, b) => b.count - a.count)

  // 6. Real-time Inventory Alerts (Based on Dynamic Threshold & LEFT JOIN)
  const lowStockWarningsRes = await pgConnection.raw(`
    SELECT 
      pv.id as variant_id,
      p.id as product_id,
      p.title as product_title,
      pv.title as variant_title,
      pv.thumbnail as variant_thumbnail,
      p.thumbnail as product_thumbnail,
      COALESCE(pv.sku, '') as sku,
      COALESCE(il.stocked_quantity, 0)::int as stock_quantity,
      COALESCE(sales.sold_count, 0)::int as sold_count
    FROM product_variant pv
    JOIN product p ON p.id = pv.product_id AND p.deleted_at IS NULL
    LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
    LEFT JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id AND il.deleted_at IS NULL
    LEFT JOIN (
      SELECT oli.variant_id, SUM(oi.quantity)::int as sold_count
      FROM order_item oi
      JOIN order_line_item oli ON oli.id = oi.item_id
      JOIN public.order o ON o.id = oi.order_id AND o.status != 'canceled' AND o.deleted_at IS NULL
      GROUP BY oli.variant_id
    ) sales ON sales.variant_id = pv.id
    WHERE pv.deleted_at IS NULL 
      AND COALESCE(il.stocked_quantity, 0) <= ?
    ORDER BY il.stocked_quantity ASC, sold_count DESC
    LIMIT 30
  `, [threshold])

  const lowStockWarnings = lowStockWarningsRes.rows.map((r: any) => ({
    variant_id: r.variant_id,
    product_id: r.product_id,
    product_title: r.product_title,
    variant_title: r.variant_title,
    thumbnail: r.variant_thumbnail || r.product_thumbnail || "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
    sku: r.sku,
    stock_quantity: Number(r.stock_quantity),
    sold_count: Number(r.sold_count)
  }))

  // 7. Warehouse SLA Alerts
  const delayedRes = await pgConnection.raw(`
    SELECT 
      o.id,
      o.display_id,
      oa.first_name,
      oa.last_name,
      oa.phone,
      oa.province,
      oa.city,
      COALESCE(o.metadata->'iranian_order'->>'fulfillment_status_fa', 'در حال آماده‌سازی و بسته‌بندی') as fulfillment_status,
      COALESCE(o.metadata->'iranian_order'->>'postal_carrier', 'پست پیشتاز') as carrier,
      ROUND(EXTRACT(EPOCH FROM (NOW() - o.created_at))/3600)::int as hours_delayed,
      o.created_at
    FROM public.order o
    LEFT JOIN order_address oa ON oa.id = o.shipping_address_id
    WHERE o.status = 'pending' 
      AND (o.metadata->'iranian_order'->>'postal_tracking_code' IS NULL OR o.metadata->'iranian_order'->>'postal_tracking_code' = '')
      AND o.created_at < NOW() - INTERVAL '24 hours'
    ORDER BY o.created_at ASC
  `)

  const delayedOrders = delayedRes.rows.map((r: any) => ({
    id: r.id,
    display_id: r.display_id,
    customer_name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.phone,
    phone: r.phone || "—",
    location: `${r.province || ""} - ${r.city || ""}`.trim(),
    fulfillment_status: r.fulfillment_status,
    carrier: r.carrier,
    hours_delayed: Number(r.hours_delayed || 24),
    shamsi_created: shamsiDayFmt.format(new Date(r.created_at))
  }))

  // 8. Top Selling Products
  const topProductsRes = await pgConnection.raw(`
    WITH active_items AS (
      SELECT DISTINCT ON (oi.order_id, oi.item_id)
        oli.product_id,
        oli.product_title,
        oli.variant_title,
        oli.variant_id,
        oli.thumbnail,
        oi.quantity::int as qty,
        COALESCE(oli.unit_price, 0)::numeric as unit_price
      FROM order_item oi
      JOIN order_line_item oli ON oli.id = oi.item_id
      JOIN public.order o ON o.id = oi.order_id AND o.status != 'canceled' AND o.deleted_at IS NULL
      ORDER BY oi.order_id, oi.item_id, oi.version DESC
    )
    SELECT 
      ai.product_id,
      ai.product_title,
      ai.variant_title,
      ai.thumbnail,
      SUM(ai.qty)::int as units_sold,
      SUM(ai.qty * ai.unit_price)::numeric as total_revenue,
      COALESCE(il.stocked_quantity, 50)::int as stock_quantity
    FROM active_items ai
    LEFT JOIN product_variant pv ON pv.id = ai.variant_id
    LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
    LEFT JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
    GROUP BY ai.product_id, ai.product_title, ai.variant_title, ai.thumbnail, il.stocked_quantity
    ORDER BY units_sold DESC
    LIMIT 6
  `)

  res.json({
    kpis: {
      total_orders: totalOrders,
      total_items_sold: totalItemsSold,
      completed_orders: completedOrders,
      pending_orders: pendingOrders,
      canceled_orders: canceledOrders,
      can_view_financials: canViewFinancials,
      gross_revenue: canViewFinancials ? grossRevenue : null,
      net_revenue: canViewFinancials ? netRevenue : null,
      total_cogs: canViewFinancials ? totalCogs : null,
      gross_profit: canViewFinancials ? grossProfit : null,
      profit_margin_percent: canViewFinancials ? profitMarginPercent : null,
      avg_order_value: canViewFinancials ? avgOrderValue : null
    },
    timeframe,
    stock_threshold: threshold,
    sales_trends: salesTrends,
    payment_methods: paymentMethods,
    warehouse_sla: {
      delayed_count: delayedOrders.length,
      orders: delayedOrders
    },
    low_stock_warnings: lowStockWarnings,
    top_products: topProductsRes.rows.map((r: any) => ({
      product_id: r.product_id,
      title: r.product_title,
      variant: r.variant_title,
      thumbnail: r.thumbnail,
      units_sold: Number(r.units_sold),
      revenue: canViewFinancials ? Number(r.total_revenue) : null,
      in_stock: Number(r.stock_quantity) > 0,
      stock_quantity: Number(r.stock_quantity)
    })),
    currency_code: "irt",
    currency_symbol: "تومان",
    current_user_role: isOwner ? "owner" : (userRbac?.role || "staff")
  })
}
