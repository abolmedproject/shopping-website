"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ChartBar,
  ReceiptPercent,
  TagSolid,
  Sparkles,
  ExclamationCircle,
  ArrowUpRightOnBox,
  EyeSlash,
  CurrencyDollar
} from "../../components/icons"
import { Heading, Text, clx } from "@medusajs/ui"
import { useEffect, useState, useRef } from "react"

export const config = defineRouteConfig({
  label: "تحلیل فروش (Analytics)",
  icon: ChartBar,
  rank: 1,
})

const FashionAnalyticsPage = () => {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Requirement: Default MUST be daily (روزانه)
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("daily")
  const [stockThreshold, setStockThreshold] = useState<number>(50)
  const [error, setError] = useState<string | null>(null)

  // Chart Hover & Drilldown State
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [selectedBucket, setSelectedBucket] = useState<any | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any | null>(null)

  // Modals
  const [showRevenueBreakdownModal, setShowRevenueBreakdownModal] = useState(false)
  const [showThresholdModal, setShowThresholdModal] = useState(false)
  const [tempThreshold, setTempThreshold] = useState("50")

  const chartContainerRef = useRef<HTMLDivElement>(null)

  const navigateTo = (path: string) => {
    window.location.assign("/app" + path)
  }

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (typeof window !== "undefined" && (window as any).__sdk?.client) {
        try {
          const sdkData = await (window as any).__sdk.client.fetch(
            `/admin/fashion-analytics?timeframe=${timeframe}&stock_threshold=${stockThreshold}`
          )
          setData(sdkData)
          setIsLoading(false)
          return
        } catch (err: any) {
          if (err.status === 403) {
            setError(err.message || "شما مجوز مشاهده گزارش‌های تحلیلی را ندارید.")
            setIsLoading(false)
            return
          }
        }
      }

      const res = await fetch(
        `/admin/fashion-analytics?timeframe=${timeframe}&stock_threshold=${stockThreshold}`,
        { credentials: "include" }
      )

      if (res.status === 403) {
        const err = await res.json()
        setError(err.message || "شما مجوز دسترسی به این بخش را ندارید.")
        setIsLoading(false)
        return
      }

      if (!res.ok) {
        throw new Error("خطا در دریافت اطلاعات تحلیلی.")
      }

      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || "خطای غیرمنتظره در بارگذاری داده‌ها.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeframe, stockThreshold])

  const formatToman = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "۰ تومان"
    return Math.round(amount).toLocaleString("fa-IR") + " تومان"
  }

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "۰"
    return Number(num).toLocaleString("fa-IR")
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8 dir-rtl text-right font-sans" dir="rtl">
        <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-8 max-w-2xl mx-auto text-center shadow-elevation-card-rest">
          <ExclamationCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <Heading level="h2" className="text-ui-fg-base mb-2 font-bold">عدم دسترسی به داشبورد تحلیلی</Heading>
          <Text className="text-ui-fg-subtle mb-6 text-xs leading-relaxed">{error}</Text>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 rounded-xl bg-ui-bg-subtle hover:bg-ui-bg-component text-ui-fg-base text-xs font-bold border border-ui-border-base"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    )
  }

  const kpis = data?.kpis
  const topProducts = data?.top_products || []
  const lowStock = data?.low_stock_warnings || []
  const trends = data?.sales_trends || []
  const paymentMethods = data?.payment_methods || []
  const warehouseSla = data?.warehouse_sla || { delayed_count: 0, orders: [] }
  const canViewFinancials = kpis?.can_view_financials

  // SVG Chart Calculation Helpers
  const numPoints = trends.length
  const svgWidth = 800
  const svgHeight = 220
  const paddingX = 40
  const usableW = svgWidth - paddingX * 2
  const maxVal = Math.max(
    ...trends.map((t: any) => Math.max(t.revenue || 0, t.net_income || 0, 1000000)),
    1000000
  )

  const getPtX = (i: number) => {
    if (numPoints <= 1) return paddingX + usableW / 2
    return paddingX + (i / (numPoints - 1)) * usableW
  }

  const getRevY = (val: number) => svgHeight - 35 - ((val || 0) / maxVal) * 150
  const getNetY = (val: number) => svgHeight - 35 - ((val || 0) / maxVal) * 150

  const buildSvgPath = (getY: (t: any) => number) => {
    if (numPoints === 0) return ""
    let d = `M ${getPtX(0)} ${getY(trends[0])}`
    for (let i = 0; i < numPoints - 1; i++) {
      const x0 = getPtX(i)
      const y0 = getY(trends[i])
      const x1 = getPtX(i + 1)
      const y1 = getY(trends[i + 1])
      const cx = (x0 + x1) / 2
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`
    }
    return d
  }

  const revLinePath = buildSvgPath((t) => getRevY(t.revenue || 0))
  const netLinePath = buildSvgPath((t) => getNetY(t.net_income || 0))

  const revAreaPath = numPoints > 0
    ? `${revLinePath} L ${getPtX(numPoints - 1)} ${svgHeight - 20} L ${getPtX(0)} ${svgHeight - 20} Z`
    : ""
  const netAreaPath = numPoints > 0
    ? `${netLinePath} L ${getPtX(numPoints - 1)} ${svgHeight - 20} L ${getPtX(0)} ${svgHeight - 20} Z`
    : ""

  return (
    <div className="min-h-screen bg-ui-bg-subtle text-ui-fg-base p-3 sm:p-6 lg:p-8 dir-rtl text-right font-sans" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-ui-border-base">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ui-bg-base border border-ui-border-base flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
            <ChartBar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1" className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-ui-fg-base">
                تحلیل فروش و عملکرد مالی پوشاک
              </Heading>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                بروزرسانی بلادرنگ
              </span>
            </div>
            <Text className="text-xs text-ui-fg-muted mt-0.5 font-medium">
              محاسبه سود خالص بر پایه بهای تمام‌شده (COGS)، پایش انبار، روش‌های پرداخت و هشدار سفارشات معوقه
            </Text>
          </div>
        </div>

        <button
          onClick={() => navigateTo("/orders")}
          className="px-3.5 py-2 text-xs bg-ui-bg-base hover:bg-ui-bg-component border border-ui-border-base rounded-xl font-bold text-ui-fg-base shadow-sm flex items-center gap-1.5"
        >
          <span>مشاهده سفارشات فروشگاه</span>
          <ArrowUpRightOnBox className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <Text className="text-ui-fg-muted text-xs">در حال پردازش داده‌های مالی و تحلیلی فروشگاه...</Text>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {/* Main 4 KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Real Gross Profit (Net Income with COGS) */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest relative overflow-hidden transition-all group hover:border-emerald-500/50">
              <div className="flex items-center justify-between mb-3">
                <Text className="text-xs text-ui-fg-muted font-bold">سود ناخالص واقعی (Net Profit)</Text>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              {canViewFinancials ? (
                <>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {formatToman(kpis?.gross_profit)}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs font-bold">
                    <span className="text-ui-fg-subtle">حاشیه سود خالص: {kpis?.profit_margin_percent}%</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                      محاسبه با COGS دقیق
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 py-2">
                  <EyeSlash className="w-4 h-4" />
                  <span className="text-xs font-bold">محرمانه مالک فروشگاه</span>
                </div>
              )}
            </div>

            {/* 2. Total Gross Sales */}
            <div
              onClick={() => canViewFinancials && setShowRevenueBreakdownModal(true)}
              className={clx(
                "bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest relative overflow-hidden transition-all group",
                canViewFinancials ? "cursor-pointer hover:border-blue-500/50" : ""
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <Text className="text-xs text-ui-fg-muted font-bold">فروش کل ناخالص (Gross Revenue)</Text>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center">
                  <CurrencyDollar className="w-4 h-4" />
                </div>
              </div>
              {canViewFinancials ? (
                <>
                  <div className="text-2xl font-black text-ui-fg-base tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {formatToman(kpis?.gross_revenue)}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-ui-fg-subtle font-medium">
                    <span>بهای تمام‌شده کالا: {formatToman(kpis?.total_cogs)}</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-0.5 font-bold group-hover:underline">
                      <span>ریز حسابداری</span>
                      <ArrowUpRightOnBox className="w-3 h-3" />
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 py-2">
                  <EyeSlash className="w-4 h-4" />
                  <span className="text-xs font-bold">محرمانه مالک</span>
                </div>
              )}
            </div>

            {/* 3. Total Orders */}
            <div
              onClick={() => navigateTo("/orders")}
              className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest relative overflow-hidden transition-all group cursor-pointer hover:border-purple-500/50"
            >
              <div className="flex items-center justify-between mb-3">
                <Text className="text-xs text-ui-fg-muted font-bold">تعداد کل سفارشات</Text>
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center">
                  <ReceiptPercent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-ui-fg-base tracking-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {formatNumber(kpis?.total_orders)} سفارش
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-ui-fg-subtle font-medium">
                <span>تکمیل: {formatNumber(kpis?.completed_orders)} • پردازش: {formatNumber(kpis?.pending_orders)}</span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold group-hover:underline flex items-center gap-0.5">
                  <span>لیست سفارشات</span>
                  <ArrowUpRightOnBox className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* 4. Items Sold & AOV */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <Text className="text-xs text-ui-fg-muted font-bold">اقلام پوشاک فروخته‌شده</Text>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
                  <TagSolid className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-ui-fg-base tracking-tight">
                {formatNumber(kpis?.total_items_sold)} عدد لباس
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-ui-fg-subtle font-medium">
                <span>میانگین فاکتور (AOV): {canViewFinancials ? formatToman(kpis?.avg_order_value) : "—"}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  محاسبه از اقلام فعال
                </span>
              </div>
            </div>
          </div>

          {/* Middle Row: RetailPro Multi-Line Area Chart & Circular Payment Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. RetailPro Sales Performance Multi-Line Area Chart (2 cols) */}
            <div className="lg:col-span-2 bg-[#090D12] dark:bg-[#070A0E] border border-ui-border-base rounded-3xl p-6 shadow-elevation-card-rest relative overflow-hidden text-white font-sans flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <h2 className="text-base font-extrabold text-white tracking-wide">
                        روند عملکرد فروش (Sales performance)
                      </h2>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 font-medium">
                      کلیک روی هر ستون/روز، لیست فاکتورهای واقعی همان تاریخ را باز می‌کند
                    </p>
                  </div>

                  {/* Multi-Stream Legend */}
                  <div className="flex items-center gap-3 text-[11px] font-bold flex-wrap">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400/50" />
                      <span>سود خالص (Net income)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-sm shadow-sky-400/50" />
                      <span>درآمد ناخالص (Revenue)</span>
                    </span>
                  </div>
                </div>

                {/* RetailPro SVG Canvas with dir="ltr" for Pixel-Perfect Horizontal Alignment */}
                <div
                  ref={chartContainerRef}
                  dir="ltr"
                  className="relative h-64 w-full select-none overflow-x-auto"
                >
                  {/* Horizontal Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-b border-dashed border-neutral-500 w-full" />
                    <div className="border-b border-dashed border-neutral-500 w-full" />
                    <div className="border-b border-dashed border-neutral-500 w-full" />
                    <div className="border-b border-dashed border-neutral-500 w-full" />
                    <div className="border-b border-neutral-700 w-full" />
                  </div>

                  {trends.length > 0 ? (
                    <svg
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    >
                      <defs>
                        <linearGradient id="netIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                        </linearGradient>

                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.30" />
                          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Area Fills */}
                      <path d={revAreaPath} fill="url(#revenueGrad)" />
                      <path d={netAreaPath} fill="url(#netIncomeGrad)" />

                      {/* Stroke Lines */}
                      <path d={revLinePath} fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
                      <path d={netLinePath} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />

                      {/* Active Hover Vertical Dashed Line & Glowing Dot Markers */}
                      {hoveredIdx !== null && trends[hoveredIdx] && (() => {
                        const hX = getPtX(hoveredIdx)
                        const revY = getRevY(trends[hoveredIdx].revenue || 0)
                        const netY = getNetY(trends[hoveredIdx].net_income || 0)

                        return (
                          <g>
                            {/* Vertical Line placed EXACTLY at hX */}
                            <line
                              x1={hX}
                              y1={15}
                              x2={hX}
                              y2={svgHeight - 20}
                              stroke="#10B981"
                              strokeWidth="2"
                              strokeDasharray="4 4"
                            />
                            {/* Revenue Marker */}
                            <circle cx={hX} cy={revY} r="4.5" fill="#38BDF8" stroke="#000" strokeWidth="2" />
                            {/* Net Income Marker */}
                            <circle cx={hX} cy={netY} r="5.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
                          </g>
                        )
                      })()}
                    </svg>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                      داده‌های کافی برای این بازه وجود ندارد.
                    </div>
                  )}

                  {/* Pixel-Perfect Floating Tooltip Card */}
                  {hoveredIdx !== null && trends[hoveredIdx] && (() => {
                    const t = trends[hoveredIdx]
                    // Calculate exact percentage across width
                    const xPct = numPoints > 1 ? (hoveredIdx / (numPoints - 1)) * 100 : 50
                    const isZeroSales = (t.orders || 0) === 0

                    return (
                      <div
                        style={{
                          position: "absolute",
                          left: `${xPct}%`,
                          top: "15px",
                          transform: xPct < 15 ? "translate(0%, 0)" : xPct > 85 ? "translate(-100%, 0)" : "translate(-50%, 0)",
                          zIndex: 30
                        }}
                        className="bg-white text-neutral-900 rounded-2xl p-3.5 shadow-2xl border border-neutral-200 pointer-events-none transition-all font-sans text-right min-w-[170px]"
                        dir="rtl"
                      >
                        <div className="text-[11px] font-bold text-neutral-500 mb-1">
                          {t.label || t.date}
                        </div>

                        {isZeroSales ? (
                          <div className="text-xs font-bold text-neutral-400 my-1">
                            ۰ قلم لباس • فروشی ثبت نشد
                          </div>
                        ) : (
                          <>
                            <div className="text-sm font-black text-emerald-600 mb-1">
                              {formatToman(t.net_income)}
                              <span className="text-[10px] font-normal text-neutral-500 mr-1">(سود خالص)</span>
                            </div>
                            <div className="text-xs font-bold text-sky-600">
                              فروش کل: {formatToman(t.revenue)}
                            </div>
                            <div className="text-[10px] text-neutral-500 mt-1 font-medium">
                              {formatNumber(t.orders)} سفارش • {formatNumber(t.items)} لباس
                            </div>
                          </>
                        )}
                        <div className="text-[10px] text-emerald-600 font-bold mt-1.5 pt-1 border-t border-neutral-100 flex items-center gap-1">
                          <span>👆 برای مشاهده جزئیات کلیک کنید</span>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Interactive Hitbox Overlay with Click-To-Open Drilldown */}
                  <div className="absolute inset-0 flex">
                    {trends.map((t: any, idx: number) => (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onClick={() => setSelectedBucket(t)}
                        className="flex-1 h-full cursor-pointer hover:bg-white/5 transition-colors"
                        title="مشاهده فاکتورهای این تاریخ"
                      />
                    ))}
                  </div>
                </div>

                {/* X-Axis Dates */}
                <div dir="ltr" className="flex items-center justify-between text-[11px] text-neutral-400 mt-3 pt-3 border-t border-neutral-800 font-medium px-4">
                  {trends.map((t: any, idx: number) => (
                    <span
                      key={idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onClick={() => setSelectedBucket(t)}
                      className={clx(
                        "cursor-pointer transition-colors text-center shrink-0",
                        hoveredIdx === idx ? "text-emerald-400 font-bold scale-105" : "hover:text-neutral-200"
                      )}
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* REQUIREMENT: Move 3 Timeframe Buttons Underneath the Chart */}
              <div className="mt-5 pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 font-bold">بازه تحلیل عملکرد:</span>
                  <div className="flex items-center gap-1.5 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setTimeframe("daily")}
                      className={clx(
                        "px-4 py-1.5 rounded-xl font-bold transition-all text-xs",
                        timeframe === "daily" ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "text-neutral-400 hover:text-white"
                      )}
                    >
                      📅 روزانه (پیوسته با روزهای صفر)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeframe("weekly")}
                      className={clx(
                        "px-4 py-1.5 rounded-xl font-bold transition-all text-xs",
                        timeframe === "weekly" ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "text-neutral-400 hover:text-white"
                      )}
                    >
                      📆 هفتگی (هفته‌های پی‌درپی)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeframe("monthly")}
                      className={clx(
                        "px-4 py-1.5 rounded-xl font-bold transition-all text-xs",
                        timeframe === "monthly" ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "text-neutral-400 hover:text-white"
                      )}
                    >
                      🗓️ ماهانه (ماه‌های شمسی)
                    </button>
                  </div>
                </div>

                <span className="text-neutral-400 text-[11px] font-medium">
                  {numPoints} نقطه زمانی پیوسته در تقویم ۱۴۰۵
                </span>
              </div>
            </div>

            {/* 2. RetailPro Circular Payment Methods Donut Card with Interactive Click */}
            <div className="bg-[#090D12] dark:bg-[#070A0E] border border-ui-border-base rounded-3xl p-6 shadow-elevation-card-rest flex flex-col justify-between text-white font-sans">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-extrabold text-white tracking-wide">
                    روش‌های پرداخت و تسویه
                  </h2>
                  <span className="text-[10px] text-neutral-400 bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700 font-bold">
                    همگام با بازه انتخابی
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mb-4 font-medium">
                  کلیک روی هر روش، فاکتورهای مربوطه را باز می‌کند
                </p>

                {/* Circular Donut Ring */}
                <div className="relative w-44 h-44 mx-auto my-2 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#1F2937" strokeWidth="12" />

                    {(() => {
                      const circumference = 2 * Math.PI * 38
                      let accumulated = 0
                      const colors = ["#10B981", "#8B5CF6", "#F59E0B"]

                      return paymentMethods.map((pm: any, idx: number) => {
                        const pct = pm.percentage || 0
                        const dashLen = (pct / 100) * circumference
                        const dashOffset = -accumulated
                        accumulated += dashLen
                        const color = colors[idx % colors.length]

                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r="38"
                            fill="none"
                            stroke={color}
                            strokeWidth="12"
                            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            onClick={() => setSelectedPaymentMethod(pm)}
                            className="transition-all duration-700 cursor-pointer hover:opacity-80"
                          />
                        )
                      })
                    })()}
                  </svg>

                  {/* Donut Center Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-xl font-black text-white tracking-tight">
                      {formatNumber(kpis?.total_orders)}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400 mt-0.5">
                      کل سفارشات
                    </span>
                  </div>
                </div>

                {/* Interactive Legend List (Clickable Drilldown) */}
                <div className="space-y-2 mt-4">
                  {paymentMethods.map((pm: any, idx: number) => {
                    const dotColors = ["bg-emerald-400", "bg-purple-400", "bg-amber-400"]
                    const dotColor = dotColors[idx % dotColors.length]

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedPaymentMethod(pm)}
                        className="flex items-center justify-between text-xs font-bold p-2.5 rounded-xl bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <span className={clx("w-2.5 h-2.5 rounded-full shrink-0", dotColor)} />
                          <span className="text-neutral-200 group-hover:text-white">{pm.name}</span>
                          <span className="text-[11px] text-neutral-400">({pm.count} سفارش)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono">{pm.percentage}%</span>
                          <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between font-medium">
                <span>تراز مالی: ۳ روش قطعی</span>
                <span className="text-emerald-400 font-bold">۱۰۰٪ تسویه مستند</span>
              </div>
            </div>
          </div>

          {/* Row 3: Transferred Warehouse SLA Alerts & Dynamic Inventory Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Transferred Warehouse SLA Alerts */}
            <div className="bg-ui-bg-base border border-amber-500/30 rounded-2xl p-6 shadow-elevation-card-rest flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Heading level="h2" className="text-base font-bold text-ui-fg-base flex items-center gap-2">
                    <span>⚠️</span>
                    <span>پایش هوشمند سفارشات معوقه انبار (Order SLA)</span>
                  </Heading>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                    {warehouseSla.delayed_count} سفارش معطل
                  </span>
                </div>
                <Text className="text-xs text-ui-fg-muted mb-4">
                  سفارشاتی که بیش از ۲۴ ساعت در انبار مانده و هنوز کد رهگیری پستی دریافت نکرده‌اند
                </Text>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {warehouseSla.orders.length > 0 ? (
                    warehouseSla.orders.map((o: any) => (
                      <div
                        key={o.id}
                        onClick={() => navigateTo(`/orders/${o.id}`)}
                        className="p-3 rounded-xl bg-ui-bg-subtle border border-ui-border-base hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-xs text-ui-fg-base group-hover:text-amber-500 flex items-center gap-2">
                            <span>سفارش #{o.display_id}</span>
                            <span>•</span>
                            <span>{o.customer_name}</span>
                          </div>
                          <div className="text-[10px] text-ui-fg-muted mt-0.5 font-medium">
                            {o.location} • {o.carrier} • تلفن: {o.phone}
                          </div>
                          <div className="text-[10px] text-ui-fg-subtle mt-0.5 font-mono">
                            ثبت: {o.shamsi_created}
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            {o.hours_delayed} ساعت تأخیر
                          </span>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 group-hover:underline mt-1 font-bold flex items-center gap-0.5 justify-end">
                            <span>صدور بارنامه</span>
                            <ArrowUpRightOnBox className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-ui-fg-muted bg-ui-bg-subtle rounded-xl border border-ui-border-base">
                      تمامی سفارشات در چارچوب زمانی استاندارد پردازش و ارسال شده‌اند.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-ui-border-base text-xs text-ui-fg-subtle flex items-center justify-between">
                <span>مهلت ارسال مجاز: ۲۴ ساعت پس از ثبت فاکتور</span>
                <button
                  onClick={() => navigateTo("/orders")}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                  مشاهده همه سفارشات
                </button>
              </div>
            </div>

            {/* 2. DYNAMIC Inventory Alerts with Customizable Threshold */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-6 shadow-elevation-card-rest flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Heading level="h2" className="text-base font-bold text-ui-fg-base flex items-center gap-2">
                      <span>📦</span>
                      <span>هشدار هوشمند موجودی انبار (Inventory Alerts)</span>
                    </Heading>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                      موجودی ≤ {stockThreshold} عدد ({lowStock.length} مورد)
                    </span>
                  </div>

                  {/* Customizable Threshold Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setTempThreshold(String(stockThreshold))
                      setShowThresholdModal(true)
                    }}
                    className="px-3 py-1 bg-ui-bg-subtle hover:bg-ui-bg-component text-ui-fg-base border border-ui-border-base rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                  >
                    <span>⚙️</span>
                    <span>تنظیم حد آستانه (فعلی: {stockThreshold})</span>
                  </button>
                </div>
                <Text className="text-xs text-ui-fg-muted mb-4">
                  شامل تمام کالاهای موجودی کم حتی در صورت عدم فروش اولیه (مستقیماً متصل به پایگاه داده انبار)
                </Text>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {lowStock.length > 0 ? (
                    lowStock.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-ui-border-base bg-ui-bg-base shrink-0">
                            <img src={item.thumbnail} alt={item.product_title} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-ui-fg-base">{item.product_title}</div>
                            <div className="text-[11px] text-ui-fg-muted mt-0.5 font-medium">
                              تنوع: {item.variant_title} {item.sku ? `(کد: ${item.sku})` : ""}
                            </div>
                            <div className="text-[10px] text-red-600 dark:text-red-400 mt-0.5 font-bold">
                              فروش قطعی تاکنون: {formatNumber(item.sold_count)} عدد
                            </div>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <div className="text-base font-black text-red-600 dark:text-red-400">
                            {formatNumber(item.stock_quantity)} عدد
                          </div>
                          <button
                            onClick={() => navigateTo("/inventory")}
                            className="mt-1 text-[11px] bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg transition-all font-bold flex items-center gap-1 shadow-sm"
                          >
                            <span>شارژ در انبار</span>
                            <ArrowUpRightOnBox className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-ui-fg-muted bg-ui-bg-subtle rounded-xl border border-ui-border-base">
                      هیچ کالایی با موجودی کمتر از {stockThreshold} عدد در انبار وجود ندارد.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-ui-border-base text-xs text-ui-fg-subtle flex items-center justify-between">
                <span>انبار مرکزی: انبار توزیع تهران</span>
                <button
                  onClick={() => navigateTo("/inventory")}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                >
                  مدیریت کل موجودی انبار
                </button>
              </div>
            </div>
          </div>

          {/* Row 4: Top Selling Products Table */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-6 shadow-elevation-card-rest">
            <div className="flex items-center justify-between mb-1">
              <div>
                <Heading level="h2" className="text-base font-bold text-ui-fg-base">
                  پرفروش‌ترین محصولات فروشگاه (Top Selling Products)
                </Heading>
                <Text className="text-xs text-ui-fg-muted mt-0.5">
                  رتبه‌بندی بر اساس بیشترین تعداد فروش قطعی • کلیک روی هر ردیف، صفحه مدیریت همان کالا را باز می‌کند
                </Text>
              </div>
              <button onClick={() => navigateTo("/products")} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-bold">
                <span>کاتالوگ کامل</span>
                <ArrowUpRightOnBox className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-right text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-ui-border-base text-ui-fg-muted">
                    <th className="pb-3 font-bold">تصویر</th>
                    <th className="pb-3 font-bold">نام محصول</th>
                    <th className="pb-3 font-bold">تنوع / سایز</th>
                    <th className="pb-3 font-bold">تعداد فروش</th>
                    {canViewFinancials && <th className="pb-3 font-bold">مجموع فروش</th>}
                    <th className="pb-3 font-bold">وضعیت موجودی انبار</th>
                    <th className="pb-3 font-bold text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border-base/40">
                  {topProducts.map((p: any, idx: number) => (
                    <tr
                      key={idx}
                      onClick={() => p.product_id && navigateTo(`/products/${p.product_id}`)}
                      className="hover:bg-ui-bg-subtle cursor-pointer transition-colors group"
                    >
                      <td className="py-3">
                        {p.thumbnail ? (
                          <img src={p.thumbnail} alt={p.title} className="w-9 h-9 rounded-lg object-cover border border-ui-border-base" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-ui-bg-subtle flex items-center justify-center text-ui-fg-muted border border-ui-border-base">👕</div>
                        )}
                      </td>
                      <td className="py-3 font-bold text-ui-fg-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {p.title}
                      </td>
                      <td className="py-3 text-ui-fg-muted font-medium">{p.variant || "—"}</td>
                      <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(p.units_sold)} عدد</td>
                      {canViewFinancials && <td className="py-3 font-bold text-ui-fg-base">{formatToman(p.revenue)}</td>}
                      <td className="py-3">
                        <span className={clx(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                          p.in_stock
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30"
                            : "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/30"
                        )}>
                          {p.in_stock ? `موجود در انبار (${p.stock_quantity})` : "ناموجود"}
                        </span>
                      </td>
                      <td className="py-3 text-left">
                        <span className="text-[10px] text-ui-fg-muted group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-end gap-0.5 font-bold">
                          <span>ویرایش کالا</span>
                          <ArrowUpRightOnBox className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Date/Timeline Drilldown (Orders on this Day/Week/Month) */}
      {selectedBucket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-ui-border-base mb-4">
              <div>
                <Heading level="h2" className="text-base font-bold text-ui-fg-base flex items-center gap-2">
                  <span>📅</span>
                  <span>گزارش فاکتورهای واقعی: {selectedBucket.full_label || selectedBucket.label}</span>
                </Heading>
                <Text className="text-xs text-ui-fg-muted mt-0.5">
                  {formatNumber(selectedBucket.orders)} سفارش قطعی • {formatNumber(selectedBucket.items)} قلم لباس • مجموع فروش: {formatToman(selectedBucket.revenue)}
                </Text>
              </div>
              <button onClick={() => setSelectedBucket(null)} className="text-ui-fg-muted hover:text-ui-fg-base text-lg font-bold">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {selectedBucket.orders_list?.length > 0 ? (
                selectedBucket.orders_list.map((o: any) => (
                  <div key={o.id} className="p-3.5 rounded-xl bg-ui-bg-subtle border border-ui-border-base flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-bold text-[11px]">
                          سفارش #{o.display_id}
                        </span>
                        <span className="font-bold text-ui-fg-base">{o.customer_name}</span>
                        <span className="text-[10px] text-ui-fg-muted font-mono">{o.phone}</span>
                      </div>
                      <div className="text-[11px] text-ui-fg-subtle mt-1 font-medium">
                        اقلام: {o.items_desc}
                      </div>
                      <div className="text-[10px] text-ui-fg-muted mt-0.5">
                        روش پرداخت: {o.payment_method} • شهر: {o.city} • ساعت ثبت: {o.shamsi_time}
                      </div>
                    </div>

                    <div className="text-left shrink-0 self-end sm:self-auto">
                      <div className="font-black text-sm text-ui-fg-base">{formatToman(o.total)}</div>
                      {canViewFinancials && o.net_profit !== null && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          سود: {formatToman(o.net_profit)}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setSelectedBucket(null)
                          navigateTo(`/orders/${o.id}`)
                        }}
                        className="mt-1 px-3 py-1 bg-ui-bg-base hover:bg-ui-bg-component text-blue-600 dark:text-blue-400 border border-ui-border-base rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"
                      >
                        <span>مشاهده فاکتور</span>
                        <ArrowUpRightOnBox className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-ui-fg-muted bg-ui-bg-subtle rounded-xl border border-ui-border-base">
                  در این تاریخ هیچ سفارشی در فروشگاه ثبت نشده است. (فروش: ۰ تومان)
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-ui-border-base mt-3 text-left">
              <button
                onClick={() => setSelectedBucket(null)}
                className="px-4 py-2 rounded-xl bg-ui-bg-subtle hover:bg-ui-bg-component text-ui-fg-base text-xs font-bold border border-ui-border-base"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Payment Method Orders Drilldown */}
      {selectedPaymentMethod && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-ui-border-base mb-4">
              <div>
                <Heading level="h2" className="text-base font-bold text-ui-fg-base flex items-center gap-2">
                  <span>💳</span>
                  <span>فاکتورهای پرداخت‌شده با: {selectedPaymentMethod.name}</span>
                </Heading>
                <Text className="text-xs text-ui-fg-muted mt-0.5">
                  {formatNumber(selectedPaymentMethod.count)} سفارش • مجموع: {formatToman(selectedPaymentMethod.revenue)} ({selectedPaymentMethod.percentage}% از کل فاکتورها)
                </Text>
              </div>
              <button onClick={() => setSelectedPaymentMethod(null)} className="text-ui-fg-muted hover:text-ui-fg-base text-lg font-bold">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {selectedPaymentMethod.orders?.map((o: any) => (
                <div key={o.id} className="p-3.5 rounded-xl bg-ui-bg-subtle border border-ui-border-base flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-emerald-500/40 transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 font-bold text-[11px]">
                        سفارش #{o.display_id}
                      </span>
                      <span className="font-bold text-ui-fg-base">{o.customer_name}</span>
                      <span className="text-[10px] text-ui-fg-muted font-mono">{o.phone}</span>
                    </div>
                    <div className="text-[11px] text-ui-fg-subtle mt-1 font-medium">
                      اقلام: {o.items_desc}
                    </div>
                    <div className="text-[10px] text-ui-fg-muted mt-0.5">
                      شهر: {o.city} • تاریخ ثبت: {o.shamsi_date} ساعت {o.shamsi_time}
                    </div>
                  </div>

                  <div className="text-left shrink-0 self-end sm:self-auto">
                    <div className="font-black text-sm text-ui-fg-base">{formatToman(o.total)}</div>
                    <button
                      onClick={() => {
                        setSelectedPaymentMethod(null)
                        navigateTo(`/orders/${o.id}`)
                      }}
                      className="mt-1 px-3 py-1 bg-ui-bg-base hover:bg-ui-bg-component text-blue-600 dark:text-blue-400 border border-ui-border-base rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"
                    >
                      <span>مشاهده فاکتور</span>
                      <ArrowUpRightOnBox className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-ui-border-base mt-3 text-left">
              <button
                onClick={() => setSelectedPaymentMethod(null)}
                className="px-4 py-2 rounded-xl bg-ui-bg-subtle hover:bg-ui-bg-component text-ui-fg-base text-xs font-bold border border-ui-border-base"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Customizable Inventory Stock Threshold Editor */}
      {showThresholdModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 max-w-sm w-full shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-ui-border-base mb-4">
              <Heading level="h2" className="text-sm font-bold text-ui-fg-base flex items-center gap-1.5">
                <span>⚙️</span>
                <span>تنظیم حد آستانه هشدار انبار</span>
              </Heading>
              <button onClick={() => setShowThresholdModal(false)} className="text-ui-fg-muted hover:text-ui-fg-base font-bold">✕</button>
            </div>

            <div className="space-y-4">
              <p className="text-ui-fg-muted leading-relaxed">
                کالاهایی که موجودی آنها در انبار مرکزی تهران مساوی یا کمتر از این عدد شود، در لیست هشدار نمایش داده می‌شوند.
              </p>

              <div>
                <label className="block font-bold text-ui-fg-base mb-1.5">حداقل موجودی برای اخطار:</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={tempThreshold}
                    onChange={(e) => setTempThreshold(e.target.value)}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-black text-center"
                  />
                  <span className="absolute left-3 text-xs text-ui-fg-muted font-bold pointer-events-none">عدد</span>
                </div>
              </div>

              {/* Fast Presets */}
              <div className="flex items-center justify-between gap-1.5">
                {[10, 20, 30, 50, 100].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTempThreshold(String(num))}
                    className={clx(
                      "flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all",
                      tempThreshold === String(num) ? "bg-emerald-600 text-white border-emerald-600" : "bg-ui-bg-subtle border-ui-border-base text-ui-fg-muted hover:text-ui-fg-base"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-ui-border-base flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowThresholdModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-ui-fg-muted hover:text-ui-fg-base"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseInt(tempThreshold) || 50
                    setStockThreshold(parsed)
                    setShowThresholdModal(false)
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  ذخیره و اعمال فوری
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Revenue & Accounting Breakdown */}
      {showRevenueBreakdownModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-ui-border-base mb-4">
              <Heading level="h2" className="text-base font-bold text-ui-fg-base">جزئیات حسابداری فروش و سود واقعی (COGS)</Heading>
              <button onClick={() => setShowRevenueBreakdownModal(false)} className="text-ui-fg-muted hover:text-ui-fg-base font-bold text-base">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
                <span className="text-ui-fg-muted font-medium">فروش کل ناخالص (Gross Revenue):</span>
                <span className="font-bold text-ui-fg-base">{formatToman(kpis?.gross_revenue)}</span>
              </div>
              <div className="flex justify-between p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
                <span className="text-ui-fg-muted font-medium">هزینه کل خرید و بهای تمام‌شده (Total COGS):</span>
                <span className="font-bold text-red-600 dark:text-red-400">- {formatToman(kpis?.total_cogs)}</span>
              </div>
              <div className="flex justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300 font-bold text-sm">
                <span>سود خالص واقعی (Net Profit):</span>
                <span>{formatToman(kpis?.gross_profit)} ({kpis?.profit_margin_percent}%)</span>
              </div>
            </div>
            <div className="mt-5 text-left">
              <button
                onClick={() => setShowRevenueBreakdownModal(false)}
                className="px-4 py-2 rounded-xl bg-ui-bg-subtle hover:bg-ui-bg-component text-ui-fg-base text-xs font-bold border border-ui-border-base"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FashionAnalyticsPage
