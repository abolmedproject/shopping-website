"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ReceiptPercent,
  Sparkles,
  CheckCircle,
  ExclamationCircle,
    CurrencyDollar
} from "../../components/icons"
import { Heading, Text, clx } from "@medusajs/ui"
import { useEffect, useState } from "react"

export const config = defineRouteConfig({
  label: "تبلیغات و کمپین‌ها (ROI)",
  icon: ReceiptPercent,
  rank: 4,
})

const CampaignAnalyticsPage = () => {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: "",
    influencer_handle: "",
    platform: "استوری اینستاگرام",
    cost: "",
    promo_code: "",
    notes: ""
  })

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch("/admin/campaign-analytics", { credentials: "include" })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.message || "خطا در بارگذاری اطلاعات کمپین‌های تبلیغاتی.")
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const formatToman = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "۰ تومان"
    return Math.round(amount).toLocaleString("fa-IR") + " تومان"
  }

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "۰"
    return Number(num).toLocaleString("fa-IR")
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setIsSubmitting(true)

    try {
      const res = await fetch("/admin/campaign-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form)
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "خطا در ثبت کمپین.")

      setSuccessMsg("کمپین تبلیغاتی با موفقیت ثبت شد.")
      setShowModal(false)
      setForm({
        title: "",
        influencer_handle: "",
        platform: "استوری اینستاگرام",
        cost: "",
        promo_code: "",
        notes: ""
      })
      fetchCampaigns()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCampaign = async (id: string, title: string) => {
    if (!confirm(`آیا از حذف کمپین «${title}» اطمینان دارید؟`)) return
    try {
      const res = await fetch(`/admin/campaign-analytics?id=${id}`, {
        method: "DELETE",
        credentials: "include"
      })
      if (res.ok) {
        setSuccessMsg(`کمپین «${title}» با موفقیت حذف شد.`)
        fetchCampaigns()
      }
    } catch {
      // Error
    }
  }

  const kpis = data?.kpis
  const campaigns = data?.campaigns || []

  return (
    <div className="min-h-screen bg-ui-bg-subtle text-ui-fg-base p-3 sm:p-6 lg:p-8 dir-rtl text-right font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-ui-border-base">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ui-bg-base border border-ui-border-base flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
            <ReceiptPercent className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1" className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-ui-fg-base">
                مدیریت تبلیغات و بازگشت سرمایه (ROAS & ROI)
              </Heading>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                سودآوری هوشمند
              </span>
            </div>
            <Text className="text-xs text-ui-fg-muted mt-0.5 font-medium">
              محاسبه خودکار بازگشت هزینه تبلیغات بلاگرها، اینفلوئنسرها و کمپین‌های تخفیف پوشاک
            </Text>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm self-stretch sm:self-auto justify-center"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ ثبت کمپین جدید اینفلوئنسر / تبلیغات</span>
        </button>
      </div>

      {/* Success & Error alerts */}
      {successMsg && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300 rounded-xl text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>✕</button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 text-red-900 dark:text-red-300 rounded-xl text-xs flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <ExclamationCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <Text className="text-ui-fg-muted text-xs">در حال محاسبه بازگشت سرمایه و درآمد کمپین‌ها...</Text>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Ad Spend */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest">
              <div className="flex items-center justify-between mb-3">
                <Text className="text-xs text-ui-fg-muted font-bold">مجموع هزینه تبلیغات</Text>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center">
                  <CurrencyDollar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-ui-fg-base tracking-tight">
                {formatToman(kpis?.total_ad_spend)}
              </div>
              <div className="mt-2 text-xs text-ui-fg-subtle font-medium">
                {formatNumber(kpis?.active_campaigns_count)} کمپین فعال در حال اجرا
              </div>
            </div>

            {/* 2. Total Campaign Revenue */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest">
              <div className="flex items-center justify-between mb-3">
                <Text className="text-xs text-ui-fg-muted font-bold">درآمد حاصل از تبلیغات</Text>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center">
                  <ReceiptPercent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-ui-fg-base tracking-tight text-blue-600 dark:text-blue-400">
                {formatToman(kpis?.total_campaign_revenue)}
              </div>
              <div className="mt-2 text-xs text-ui-fg-subtle font-medium">
                {formatNumber(kpis?.total_campaign_orders)} سفارش قطعی ثبت‌شده
              </div>
            </div>

            {/* 3. Overall ROAS */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest">
              <div className="flex items-center justify-between mb-3">
                <Text className="text-xs text-ui-fg-muted font-bold">شاخص بازگشت هزینه (ROAS)</Text>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {kpis?.overall_roas > 0 ? `${kpis?.overall_roas}x` : "—"}
              </div>
              <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                {kpis?.overall_roas >= 2.5 ? "✓ عملکرد اقتصادی عالی و سودآور" : "در حال جمع‌آوری داده‌های اولیه"}
              </div>
            </div>

            {/* 4. Net Profit from Ads */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest">
              <div className="flex items-center justify-between mb-3">
                <Text className="text-xs text-ui-fg-muted font-bold">سود خالص حاصل از تبلیغات</Text>
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center">
                  <CurrencyDollar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatToman(kpis?.total_campaign_profit)}
              </div>
              <div className="mt-2 text-xs text-ui-fg-subtle font-medium">
                محاسبه پس از کسر بهای تمام‌شده لباس‌ها
              </div>
            </div>
          </div>

          {/* Campaigns Table */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-4 sm:p-6 shadow-elevation-card-rest">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <Heading level="h2" className="text-base font-bold text-ui-fg-base">
                  لیست کمپین‌ها و بازگشت سرمایه اینفلوئنسرها
                </Heading>
                <Text className="text-xs text-ui-fg-muted mt-0.5">
                  پایش فروش، حاشیه سود و نرخ بازگشت (ROAS) هر بلاگر یا کانال تبلیغاتی
                </Text>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-ui-bg-subtle px-3 py-1 rounded-lg border border-ui-border-base">
                {campaigns.length} کمپین ثبت‌شده
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[780px]">
                <thead>
                  <tr className="border-b border-ui-border-base text-ui-fg-muted">
                    <th className="pb-3 font-bold">عنوان کمپین و پلتفرم</th>
                    <th className="pb-3 font-bold">اینفلوئنسر / بلاگر</th>
                    <th className="pb-3 font-bold">کد تخفیف</th>
                    <th className="pb-3 font-bold">هزینه تبلیغ</th>
                    <th className="pb-3 font-bold">فروش محقق‌شده</th>
                    <th className="pb-3 font-bold">سود خالص</th>
                    <th className="pb-3 font-bold">شاخص بازگشت (ROAS)</th>
                    <th className="pb-3 font-bold">تعداد سفارش</th>
                    <th className="pb-3 font-bold text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border-base/40">
                  {campaigns.map((c: any) => {
                    const roas = c.metrics.roas
                    const isGoodRoas = roas >= 2.0

                    return (
                      <tr key={c.id} className="hover:bg-ui-bg-subtle/50 transition-colors">
                        <td className="py-3.5">
                          <div className="font-bold text-ui-fg-base text-xs">{c.title}</div>
                          <div className="text-[11px] text-ui-fg-muted mt-0.5">{c.platform} • {c.start_date_shamsi}</div>
                        </td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded-lg bg-ui-bg-subtle border border-ui-border-base font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                            {c.influencer_handle}
                          </span>
                        </td>
                        <td className="py-3.5">
                          {c.promo_code !== "—" ? (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold font-mono">
                              {c.promo_code}
                            </span>
                          ) : (
                            <span className="text-ui-fg-muted">—</span>
                          )}
                        </td>
                        <td className="py-3.5 font-bold text-ui-fg-base">
                          {formatToman(c.cost)}
                        </td>
                        <td className="py-3.5 font-bold text-blue-600 dark:text-blue-400">
                          {formatToman(c.metrics.revenue)}
                        </td>
                        <td className="py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                          {formatToman(c.metrics.gross_profit)}
                        </td>
                        <td className="py-3.5">
                          {c.cost > 0 ? (
                            <span className={clx(
                              "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                              isGoodRoas
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30"
                                : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/30"
                            )}>
                              {roas > 0 ? `${roas}x بازگشت` : "در انتظار سفارش"}
                            </span>
                          ) : (
                            <span className="text-ui-fg-muted">رایگان</span>
                          )}
                        </td>
                        <td className="py-3.5 font-bold text-ui-fg-base">
                          {formatNumber(c.metrics.orders_count)} سفارش
                        </td>
                        <td className="py-3.5 text-left">
                          <button
                            onClick={() => handleDeleteCampaign(c.id, c.title)}
                            className="px-2 py-1 text-[11px] text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="حذف کمپین"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Influencer Campaign */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-4 sm:p-6 max-w-lg w-full shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-ui-border-base mb-4">
              <div className="flex items-center gap-2 text-ui-fg-base font-bold text-base">
                <ReceiptPercent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>ثبت کمپین تبلیغاتی جدید اینفلوئنسر</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-ui-fg-muted hover:text-ui-fg-base text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block font-bold text-ui-fg-subtle mb-1">عنوان کمپین *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: کمپین استوری اینستاگرام کالکشن بهاره"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ui-fg-subtle mb-1">آی‌دی اینستاگرام / کانال بلاگر</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="@username_blogger"
                    value={form.influencer_handle}
                    onChange={(e) => setForm({ ...form, influencer_handle: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ui-fg-subtle mb-1">پلتفرم تبلیغ</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="استوری اینستاگرام">استوری اینستاگرام (Instagram Story)</option>
                    <option value="پست / ریلز اینستاگرام">پست / ریلز اینستاگرام (Reels)</option>
                    <option value="کانال تلگرام">کانال تلگرام (Telegram)</option>
                    <option value="پیامک تبلیغاتی">پیامک تبلیغاتی (SMS Blast)</option>
                    <option value="گوگل ادز">گوگل ادز (Google Ads)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ui-fg-subtle mb-1">مبلغ پرداختی به بلاگر (تومان) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 5000000"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ui-fg-subtle mb-1">کد تخفیف اختصاصی کمپین</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="مثال: PARISA20"
                    value={form.promo_code}
                    onChange={(e) => setForm({ ...form, promo_code: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-mono font-bold uppercase text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ui-fg-subtle mb-1">توضیحات و سناریوی تبلیغ</label>
                <textarea
                  rows={2}
                  placeholder="مثال: ۳ پارت استوری معرفی هودی و تیشرت با تگ کردن پیج"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl p-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-ui-border-base">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-ui-fg-muted hover:text-ui-fg-base"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
                >
                  {isSubmitting ? "در حال ثبت..." : "ثبت و فعال‌سازی کمپین"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampaignAnalyticsPage
