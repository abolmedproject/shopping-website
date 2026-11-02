import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // 1. Fetch all marketing campaigns
  const campaignsRes = await pgConnection.raw(`
    SELECT * FROM admin_marketing_campaign
    ORDER BY created_at DESC
  `)

  // 2. Fetch all orders with their promo codes, metadata, and totals
  const ordersRes = await pgConnection.raw(`
    SELECT 
      o.id as order_id,
      o.display_id,
      o.status,
      COALESCE(os.totals->>'accounting_total', '0')::numeric as total,
      oa.first_name,
      oa.last_name,
      oa.phone,
      oa.city,
      o.metadata->'iranian_order'->>'order_source' as order_source,
      o.metadata->'iranian_order'->>'source_notes' as source_notes,
      o.created_at,
      p.code as promo_code
    FROM public."order" o
    LEFT JOIN order_address oa ON oa.id = o.shipping_address_id
    LEFT JOIN order_summary os ON os.order_id = o.id
    LEFT JOIN order_promotion op ON op.order_id = o.id
    LEFT JOIN promotion p ON p.id = op.promotion_id
    WHERE o.deleted_at IS NULL AND o.status != 'canceled'
  `)

  // 3. Line items for COGS calculation
  const cogsRes = await pgConnection.raw(`
    SELECT 
      oi.order_id,
      oi.quantity::int,
      COALESCE(oli.unit_price, 0)::numeric as unit_price,
      NULLIF(pr.metadata->>'cost_price', '')::numeric as unit_cost
    FROM order_item oi
    JOIN order_line_item oli ON oli.id = oi.item_id
    LEFT JOIN product pr ON pr.id = oli.product_id
  `)

  const orderCostMap: Record<string, number> = {}
  for (const row of cogsRes.rows) {
    const q = Number(row.quantity || 1)
    const cost = Number(row.unit_cost || (Number(row.unit_price) * 0.6))
    orderCostMap[row.order_id] = (orderCostMap[row.order_id] || 0) + (cost * q)
  }

  const shamsiFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  let totalAdSpend = 0
  let totalCampaignRevenue = 0
  let totalCampaignProfit = 0
  let totalCampaignOrders = 0

  const campaigns = campaignsRes.rows.map((camp: any) => {
    const cost = Number(camp.cost || 0)
    totalAdSpend += cost

    // Match orders that used this campaign's promo_code OR mention the influencer handle
    const handleClean = (camp.influencer_handle || "").toLowerCase().replace(/[@_]/g, "")
    const promoClean = (camp.promo_code || "").toUpperCase().trim()

    const matchingOrders = ordersRes.rows.filter((o: any) => {
      const oPromo = (o.promo_code || "").toUpperCase().trim()
      const oNotes = (o.source_notes || "").toLowerCase().replace(/[@_]/g, "")
      
      const promoMatch = promoClean && oPromo === promoClean
      const handleMatch = handleClean && oNotes.includes(handleClean)
      return promoMatch || handleMatch
    })

    const ordersCount = matchingOrders.length
    totalCampaignOrders += ordersCount

    const revenue = matchingOrders.reduce((acc: number, o: any) => acc + Number(o.total || 0), 0)
    totalCampaignRevenue += revenue

    const cogs = matchingOrders.reduce((acc: number, o: any) => acc + (orderCostMap[o.order_id] || 0), 0)
    const grossProfit = Math.max(0, revenue - cogs)
    totalCampaignProfit += grossProfit

    // ROAS (Return On Ad Spend) = Revenue / Cost
    const roas = cost > 0 ? Math.round((revenue / cost) * 10) / 10 : 0
    // ROI % = (Net Profit - Cost) / Cost * 100
    const roiPercent = cost > 0 ? Math.round(((grossProfit - cost) / cost) * 100) : 0
    const isProfitable = grossProfit >= cost

    return {
      id: camp.id,
      title: camp.title,
      influencer_handle: camp.influencer_handle || "—",
      platform: camp.platform,
      cost,
      promo_code: camp.promo_code || "—",
      status: camp.status || "active",
      notes: camp.notes || "",
      start_date_shamsi: camp.start_date ? shamsiFormatter.format(new Date(camp.start_date)) : "—",
      metrics: {
        orders_count: ordersCount,
        revenue,
        gross_profit: grossProfit,
        roas,
        roi_percent: roiPercent,
        is_profitable: isProfitable,
        recent_buyers: matchingOrders.slice(0, 3).map((o: any) => ({
          name: `${o.first_name || ""} ${o.last_name || ""}`.trim() || o.phone,
          city: o.city,
          total: Number(o.total || 0)
        }))
      }
    }
  })

  const overallRoas = totalAdSpend > 0 ? Math.round((totalCampaignRevenue / totalAdSpend) * 10) / 10 : 0
  const overallRoi = totalAdSpend > 0 ? Math.round(((totalCampaignProfit - totalAdSpend) / totalAdSpend) * 100) : 0

  res.json({
    kpis: {
      total_ad_spend: totalAdSpend,
      total_campaign_revenue: totalCampaignRevenue,
      total_campaign_profit: totalCampaignProfit,
      total_campaign_orders: totalCampaignOrders,
      overall_roas: overallRoas,
      overall_roi_percent: overallRoi,
      campaigns_count: campaigns.length,
      active_campaigns_count: campaigns.filter((c: any) => c.status === "active").length
    },
    campaigns
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const {
    title,
    influencer_handle,
    platform = "استوری اینستاگرام",
    cost = 0,
    promo_code,
    discount_percent = 15,
    notes = ""
  } = req.body as any

  if (!title) {
    return res.status(400).json({ message: "وارد کردن عنوان کمپین تبلیغاتی الزامی است." })
  }

  const campaignId = "camp_" + Math.random().toString(36).substring(2, 10)
  const numCost = Math.max(0, parseInt(String(cost).replace(/[^0-9]/g, "")) || 0)
  const cleanPromo = promo_code ? promo_code.trim().toUpperCase() : null

  // 1. Insert into admin_marketing_campaign
  await pgConnection.raw(`
    INSERT INTO admin_marketing_campaign (id, title, influencer_handle, platform, cost, promo_code, status, notes, start_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, NOW(), NOW(), NOW())
  `, [
    campaignId,
    title.trim(),
    influencer_handle ? influencer_handle.trim() : null,
    platform,
    numCost,
    cleanPromo,
    notes.trim()
  ])

  // 2. If promo_code is provided, automatically register active Promotion in Medusa if not exists
  if (cleanPromo) {
    try {
      const existingPromo = await pgConnection.raw('SELECT id FROM promotion WHERE UPPER(code) = ?', [cleanPromo])
      if (!existingPromo.rows.length) {
        const promoId = "promo_" + Math.random().toString(36).substring(2, 12)
        const appMethodId = "proappmet_" + Math.random().toString(36).substring(2, 12)
        const discVal = String(Math.max(1, Math.min(99, parseInt(String(discount_percent)) || 15)))

        await pgConnection.raw(`
          INSERT INTO promotion (id, code, is_automatic, type, status, is_tax_inclusive, used, created_at, updated_at)
          VALUES (?, ?, false, 'standard', 'active', false, 0, NOW(), NOW())
        `, [promoId, cleanPromo])

        await pgConnection.raw(`
          INSERT INTO promotion_application_method (id, type, target_type, value, raw_value, promotion_id, created_at, updated_at)
          VALUES (?, 'percentage', 'order', ?, ?::jsonb, ?, NOW(), NOW())
        `, [appMethodId, discVal, JSON.stringify({ value: discVal, precision: 20 }), promoId])
      }
    } catch (promoErr) {
      console.error("Error creating medusa promotion for campaign:", promoErr)
    }
  }

  // 3. Log activity in admin_activity_log
  const callerUser = (req as any).user || {}
  const callerId = (req as any).auth_context?.actor_id || callerUser.id || "user_01M5SP73MA566NQBTS4KHH9699"
  const userEmail = callerUser.email || "admin@medusa-test.com"
  const userName = ((callerUser.first_name || "") + " " + (callerUser.last_name || "")).trim() || "مدیر فروشگاه"
  const actId = "act_" + Math.random().toString(36).substring(2, 11)

  await pgConnection.raw(`
    INSERT INTO admin_activity_log (id, user_id, user_email, user_name, action_type, action_title, target_type, target_id, target_url, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `, [
    actId,
    callerId,
    userEmail,
    userName,
    "campaign_create",
    `ایجاد کمپین تبلیغاتی جدید: "${title.trim()}"`,
    "campaign",
    campaignId,
    "/campaign-analytics",
    `ثبت کمپین تبلیغاتی "${title.trim()}" (هزینه: ${numCost.toLocaleString('fa-IR')} تومان${cleanPromo ? ' | کد تخفیف: ' + cleanPromo : ''}) توسط ${userName}`
  ]).catch(() => {})

  res.status(201).json({
    message: "کمپین تبلیغاتی و کد تخفیف با موفقیت ثبت و فعال شد.",
    campaign_id: campaignId
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { id } = req.query as { id?: string }

  if (!id) {
    return res.status(400).json({ message: "شناسه کمپین الزامی است." })
  }

  await pgConnection.raw('DELETE FROM admin_marketing_campaign WHERE id = ?', [id])
  res.json({ message: "کمپین تبلیغاتی با موفقیت حذف شد." })
}
