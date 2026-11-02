"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ShoppingBag,
  CheckCircle,
  ExclamationCircle,
  ArrowUpRightOnBox,
  Truck,
  Phone,
  MagnifyingGlass
} from "../../components/icons"
import { Heading, Text, clx } from "@medusajs/ui"
import { useEffect, useState, useMemo } from "react"
import { IRAN_PROVINCES } from "../../lib/iran-locations"

export const config = defineRouteConfig({
  label: "ثبت سریع سفارش (دایرکت/تلفنی)",
  icon: ShoppingBag,
  rank: 3,
})

const QuickOrderPage = () => {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successOrder, setSuccessOrder] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [variantSearch, setVariantSearch] = useState("")
  const [customShippingPrices, setCustomShippingPrices] = useState<Record<string, number>>({})

  // Form State
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    province: "تهران",
    city: "تهران",
    address_1: "",
    postal_code: "",
    order_source: "instagram_direct",
    source_notes: "",
    shipping_option_id: "",
    selected_variant_id: "",
    quantity: 1,
    payment_method: "کارت به کارت / واریز مستقیم"
  })

  const fetchInitData = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/admin/quick-order", { credentials: "include" })
      if (!res.ok) throw new Error("خطا در بارگذاری موجودی محصولات.")
      const json = await res.json()
      setData(json)
      if (json.shipping_options?.length) {
        setForm(f => ({ ...f, shipping_option_id: json.shipping_options[0].id }))
      }
      if (json.variants?.length) {
        setForm(f => ({ ...f, selected_variant_id: json.variants[0].variant_id }))
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInitData()
  }, [])

  const currentProvinceData = useMemo(() => {
    return IRAN_PROVINCES.find(p => p.name === form.province)
  }, [form.province])

  const availableCities = useMemo(() => {
    return currentProvinceData?.cities || []
  }, [currentProvinceData])

  const filteredVariants = useMemo(() => {
    if (!data?.variants) return []
    if (!variantSearch.trim()) return data.variants
    const q = variantSearch.toLowerCase().trim()
    return data.variants.filter((v: any) => 
      v.title.toLowerCase().includes(q) || 
      v.product_title.toLowerCase().includes(q) || 
      v.variant_title.toLowerCase().includes(q) ||
      (v.sku && v.sku.toLowerCase().includes(q))
    )
  }, [data?.variants, variantSearch])

  const selectedVariant = useMemo(() => {
    return data?.variants?.find((v: any) => v.variant_id === form.selected_variant_id)
  }, [data, form.selected_variant_id])

  const selectedShipping = useMemo(() => {
    return data?.shipping_options?.find((s: any) => s.id === form.shipping_option_id)
  }, [data, form.shipping_option_id])

  const formatToman = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "۰ تومان"
    return Math.round(amount).toLocaleString("fa-IR") + " تومان"
  }

  const handleProvinceChange = (prov: string) => {
    const pData = IRAN_PROVINCES.find(p => p.name === prov)
    setForm(prev => ({
      ...prev,
      province: prov,
      city: pData?.cities?.[0] || ""
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessOrder(null)
    setIsSubmitting(true)

    try {
      const payload = {
        customer: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email,
          province: form.province,
          city: form.city,
          address_1: form.address_1,
          postal_code: form.postal_code || "1111111111"
        },
        items: [
          {
            variant_id: form.selected_variant_id,
            quantity: Number(form.quantity || 1)
          }
        ],
        shipping_option_id: form.shipping_option_id,
        custom_shipping_price: shippingTotal,
        order_source: form.order_source,
        source_notes: form.source_notes,
        payment_method: form.payment_method
      }

      const res = await fetch("/admin/quick-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "خطا در ثبت سفارش.")

      setSuccessOrder(json)
      // Reset form fields
      setForm(prev => ({
        ...prev,
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        address_1: "",
        postal_code: "",
        source_notes: "",
        quantity: 1
      }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const itemTotal = (selectedVariant?.price || 0) * (form.quantity || 1)
  const shippingTotal = customShippingPrices[form.shipping_option_id] !== undefined
    ? customShippingPrices[form.shipping_option_id]
    : (selectedShipping?.amount || 0)
  const grandTotal = itemTotal + shippingTotal

  return (
    <div className="min-h-screen bg-ui-bg-subtle text-ui-fg-base p-3 sm:p-6 lg:p-8 dir-rtl text-right font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-ui-border-base">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ui-bg-base border border-ui-border-base flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <Heading level="h1" className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-ui-fg-base">
              ثبت سریع سفارش (دایرکت اینستاگرام / تلفنی)
            </Heading>
            <Text className="text-xs text-ui-fg-muted mt-0.5">
              فرم اختصاصی برای ثبت خریدهای کارت‌به‌کارت و دایرکت بدون نیاز به مراجعه مشتری به سایت با کسر آنی از انبار
            </Text>
          </div>
        </div>

        <button
          onClick={() => window.location.assign("/app/orders")}
          className="px-3.5 py-2 text-xs bg-ui-bg-base hover:bg-ui-bg-component border border-ui-border-base rounded-xl font-bold text-ui-fg-base shadow-sm flex items-center gap-1.5"
        >
          <span>مشاهده کل سفارشات</span>
          <ArrowUpRightOnBox className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Success Modal / Notification */}
      {successOrder && (
        <div className="my-6 p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl shadow-sm text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                سفارش شماره #{successOrder.display_id} با موفقیت در سیستم ثبت گردید!
              </div>
              <div className="text-ui-fg-muted mt-1">
                خریدار: <strong>{successOrder.customer_name}</strong> ({successOrder.phone}) • مبلغ کل: <strong>{formatToman(successOrder.total)}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.assign(`/app/orders/${successOrder.order_id}`)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5"
            >
              <span>مشاهده و چاپ فاکتور سفارش #{successOrder.display_id}</span>
              <ArrowUpRightOnBox className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="my-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-500/40 text-red-900 dark:text-red-300 rounded-2xl text-xs flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <ExclamationCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <Text className="text-ui-fg-muted text-xs">در حال بارگذاری لیست موجودی انبار و روش‌های ارسال...</Text>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left/Middle: Customer Information & Item Selection (Takes 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Customer Contact & Shipping Address */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-ui-border-base">
                <div className="font-bold text-sm text-ui-fg-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>۱. اطلاعات خریدار و نشانی تحویل مرسوله</span>
                </div>
                <span className="text-[11px] text-ui-fg-muted">سفارشات دایرکت / تلفنی</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-ui-fg-subtle font-bold mb-1">شماره موبایل خریدار *</label>
                  <input
                    type="text"
                    required
                    placeholder="09123456789"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-ui-fg-subtle font-bold mb-1">منبع ورودی سفارش</label>
                  <select
                    value={form.order_source}
                    onChange={(e) => setForm({ ...form, order_source: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {data?.order_sources?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-ui-fg-subtle font-bold mb-1">نام خریدار *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: بردیا"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-ui-fg-subtle font-bold mb-1">نام خانوادگی *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: اسماعیلی"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                {/* Iranian Province & City Dropdowns */}
                <div>
                  <label className="block text-ui-fg-subtle font-bold mb-1">استان مقصد *</label>
                  <select
                    value={form.province}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {IRAN_PROVINCES.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-ui-fg-subtle font-bold mb-1">شهر مقصد *</label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {availableCities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-ui-fg-subtle font-bold mb-1">نشانی پستی دقیق (خیابان، کوچه، پلاک، واحد) *</label>
                  <input
                    type="text"
                    required
                    placeholder="خیابان ارم، کوچه ۴، پلاک ۱۲"
                    value={form.address_1}
                    onChange={(e) => setForm({ ...form, address_1: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-ui-fg-subtle font-bold mb-1">کد پستی ۱۰ رقمی (اختیاری جهت رهگیری)</label>
                  <input
                    type="text"
                    placeholder="7134512345"
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-ui-fg-subtle font-bold mb-1">روش تسویه / پرداخت</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="کارت به کارت / واریز مستقیم">کارت به کارت / واریز مستقیم</option>
                    <option value="پرداخت در محل (COD)">پرداخت در محل (COD)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Apparel Selection from Real Inventory */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-ui-border-base">
                <div className="font-bold text-sm text-ui-fg-base flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>۲. انتخاب لباس و تنوع از انبار مرکزی</span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">کسر آنی موجودی</span>
              </div>

              {/* Search Bar for Variants */}
              <div className="relative">
                <label className="block text-ui-fg-subtle font-bold mb-1 text-xs">
                  جستجوی سریع لباس و سایز/رنگ:
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="🔍 تایپ کنید: تیشرت، سویشرت، شلوار، مشکی، سفید، S، M، L..."
                    value={variantSearch}
                    onChange={(e) => {
                      const val = e.target.value
                      setVariantSearch(val)
                      const q = val.toLowerCase().trim()
                      const matches = (data?.variants || []).filter((v: any) => 
                        v.title.toLowerCase().includes(q) || 
                        v.product_title.toLowerCase().includes(q) || 
                        v.variant_title.toLowerCase().includes(q) ||
                        (v.sku && v.sku.toLowerCase().includes(q))
                      )
                      if (matches.length > 0) {
                        setForm(f => ({ ...f, selected_variant_id: matches[0].variant_id }))
                      }
                    }}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl py-2.5 pr-10 pl-4 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-medium shadow-sm"
                  />
                  <span className="absolute right-3.5 text-ui-fg-muted pointer-events-none">
                    <MagnifyingGlass className="w-4 h-4" />
                  </span>
                  {variantSearch && (
                    <button
                      type="button"
                      onClick={() => setVariantSearch("")}
                      className="absolute left-3 text-xs text-ui-fg-muted hover:text-ui-fg-base"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-ui-fg-subtle font-bold">انتخاب از لیست موجودی انبار *</label>
                    <span className="text-[11px] text-ui-fg-muted">
                      {filteredVariants.length} مورد منطبق
                    </span>
                  </div>
                  <select
                    value={form.selected_variant_id}
                    onChange={(e) => setForm({ ...form, selected_variant_id: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {filteredVariants.length > 0 ? (
                      filteredVariants.map((v: any) => (
                        <option key={v.variant_id} value={v.variant_id}>
                          {v.title} — موجودی: {v.stock_quantity} عدد — {formatToman(v.price)}
                        </option>
                      ))
                    ) : (
                      <option disabled value="">لباسی با این جستجو یافت نشد</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-ui-fg-subtle font-bold mb-1">تعداد *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold text-center"
                  />
                </div>
              </div>

              {/* Selected Item Preview Box */}
              {selectedVariant && (
                <div className="p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {selectedVariant.thumbnail ? (
                      <img src={selectedVariant.thumbnail} alt={selectedVariant.title} className="w-10 h-10 rounded-lg object-cover border border-ui-border-base" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-ui-bg-base border border-ui-border-base flex items-center justify-center">👕</div>
                    )}
                    <div>
                      <div className="font-bold text-ui-fg-base">{selectedVariant.title}</div>
                      <div className="text-[11px] text-ui-fg-muted mt-0.5">شناسه تنوع: {selectedVariant.sku} • موجودی انبار: {selectedVariant.stock_quantity} عدد</div>
                    </div>
                  </div>
                  <div className="text-left font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatToman(itemTotal)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary, Shipping & Confirm (Takes 1 col) */}
          <div className="space-y-6">
            {/* Shipping Selection */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest space-y-4">
              <div className="font-bold text-sm text-ui-fg-base flex items-center gap-2 pb-3 border-b border-ui-border-base">
                <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>۳. روش ارسال کالا</span>
              </div>

              <div className="space-y-2 text-xs">
                {data?.shipping_options?.map((opt: any) => {
                  const isSelected = form.shipping_option_id === opt.id
                  const currentPrice = customShippingPrices[opt.id] !== undefined
                    ? customShippingPrices[opt.id]
                    : opt.amount

                  return (
                    <label
                      key={opt.id}
                      className={clx(
                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all gap-2",
                        isSelected
                          ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 dark:border-blue-500 font-bold"
                          : "bg-ui-bg-subtle border-ui-border-base opacity-80"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shipping_option"
                          checked={isSelected}
                          onChange={() => setForm({ ...form, shipping_option_id: opt.id })}
                          className="accent-blue-500"
                        />
                        <span className="text-xs">{opt.name}</span>
                      </div>

                      {/* Editable Price Input with Toman */}
                      <div 
                        className="flex items-center gap-1.5 shrink-0" 
                        onClick={(e) => {
                          e.stopPropagation()
                          setForm({ ...form, shipping_option_id: opt.id })
                        }}
                      >
                        <input
                          type="text"
                          dir="ltr"
                          value={currentPrice.toLocaleString("en-US")}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "")
                            const val = raw === "" ? 0 : parseInt(raw, 10)
                            setCustomShippingPrices(prev => ({ ...prev, [opt.id]: val }))
                          }}
                          className="w-24 text-center px-2 py-1 rounded-lg bg-ui-bg-base border border-ui-border-base text-xs font-mono font-bold text-ui-fg-base focus:border-blue-500 focus:outline-none shadow-xs"
                          title="برای تغییر تعرفه ارسال، رقم دلخواه را تایپ کنید"
                        />
                        <span className="text-[11px] text-ui-fg-muted font-normal">تومان</span>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div>
                <label className="block text-ui-fg-subtle font-bold mb-1 text-xs">یادداشت دایرکت (مثلاً آی‌دی پیج اینستاگرام مشتری):</label>
                <textarea
                  rows={2}
                  placeholder="@username_instagram یا توضیحات هماهنگی تحویل"
                  value={form.source_notes}
                  onChange={(e) => setForm({ ...form, source_notes: e.target.value })}
                  className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl p-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Total Summary & Submit */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest space-y-4">
              <div className="font-bold text-sm text-ui-fg-base pb-3 border-b border-ui-border-base">
                خلاصه صورتحساب سفارش (تومان)
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-ui-fg-subtle">
                  <span>مجموع اقلام:</span>
                  <span className="font-bold text-ui-fg-base">{formatToman(itemTotal)}</span>
                </div>
                <div className="flex justify-between text-ui-fg-subtle">
                  <span>هزینه ارسال:</span>
                  <span className="font-bold text-ui-fg-base">{formatToman(shippingTotal)}</span>
                </div>
                <div className="flex justify-between text-ui-fg-subtle">
                  <span>مالیات بر ارزش افزوده:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">۰ تومان (مقطوع)</span>
                </div>
                <div className="pt-3 border-t border-ui-border-base flex justify-between text-base font-black text-ui-fg-base">
                  <span>جمع کل فاکتور:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatToman(grandTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>در حال ثبت فاکتور و کسر از انبار...</span>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>ثبت نهایی سفارش دایرکت / تلفنی</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

export default QuickOrderPage
