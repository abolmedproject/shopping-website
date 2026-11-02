import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { useState } from "react"

const DEFAULT_SIZE_GUIDE = [
  { size: "S", chest: "۱۰۲", length: "۶۸", shoulder: "۴۶", sleeve: "۲۱" },
  { size: "M", chest: "۱۰۸", length: "۷۱", shoulder: "۴۹", sleeve: "۲۲" },
  { size: "L", chest: "۱۱۴", length: "۷۴", shoulder: "۵۲", sleeve: "۲۳" },
  { size: "XL", chest: "۱۲۰", length: "۷۷", shoulder: "۵۵", sleeve: "۲۴" },
]

const ProductApparelSpecsWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const product = data
  const metadata = (product.metadata as any) || {}
  const initialSpecs = metadata.apparel_specs || {
    fabric: "۱۰۰٪ نخ پنبه سوپر با بافت لطیف",
    fit: "آزاد و راحت (Regular Fit)",
    season: "چهارفصل / بهاره و تابستانه",
    care: "شستشو با آب ۳۰ درجه، اتوکشی در دمای ملایم",
  }

  const [isEditing, setIsEditing] = useState(false)
  const [specs, setSpecs] = useState(initialSpecs)
  const [sizeGuide, setSizeGuide] = useState(metadata.size_guide || DEFAULT_SIZE_GUIDE)
  const [costPrice, setCostPrice] = useState(metadata.cost_price || "")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [skuSuccess, setSkuSuccess] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metadata: {
            ...metadata,
            apparel_specs: specs,
            size_guide: sizeGuide,
            cost_price: costPrice ? String(costPrice).replace(/[^0-9]/g, "") : null
          },
        }),
      })

      if (res.ok) {
        setSaveSuccess(true)
        setIsEditing(false)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch {
      // Error handling
    } finally {
      setIsSaving(false)
    }
  }

  // Feature 3: Auto SKU & Barcode Generator
  const handleAutoGenerateSku = async () => {
    try {
      const variants = product.variants || []
      const prefix = (product.handle || "ITEM").replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase()
      const generatedList: any[] = []

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i]
        const vTitle = (v.title || "").replace(/[^a-zA-Z0-9]/g, "-").toUpperCase()
        const sku = `${prefix}-${vTitle || i + 1}`
        const barcode = `626${String(Math.floor(100000000 + Math.random() * 900000000))}`
        generatedList.push({ id: v.id, sku, barcode })
      }

      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          metadata: {
            ...metadata,
            generated_skus_and_barcodes: generatedList
          }
        })
      })

      if (res.ok) {
        setSkuSuccess(`شناسه کالا (کد انبار) و بارکد استاندارد ۶۲۶ ایران برای ${variants.length} تنوع به صورت هوشمند تولید شد.`)
        setTimeout(() => setSkuSuccess(null), 4000)
      }
    } catch {
      // Error
    }
  }

  const formatToman = (val: string | number) => {
    if (!val) return "ثبت نشده"
    const num = parseInt(String(val).replace(/[^0-9]/g, "")) || 0
    return num.toLocaleString("fa-IR") + " تومان"
  }

  return (
    <Container className="p-5 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-sm text-right dir-rtl font-sans my-4" dir="rtl">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-ui-border-base mb-4">
        <div>
          <Heading level="h2" className="text-base font-bold text-ui-fg-base flex items-center gap-2">
            <span>👕</span>
            <span>مشخصات فنی پوشاک، بهای تمام‌شده و راهنمای سایزبندی</span>
          </Heading>
          <Text className="text-xs text-ui-fg-muted mt-0.5">
            ثبت قیمت خرید/تولید، متریال، راهنمای سانتیمتری و تولید خودکار کد کالا (SKU)
          </Text>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              ✓ با موفقیت ذخیره شد
            </span>
          )}

          <button
            type="button"
            onClick={handleAutoGenerateSku}
            className="px-3 py-1.5 text-xs bg-ui-bg-subtle hover:bg-ui-bg-component text-blue-600 dark:text-blue-400 border border-ui-border-base rounded-lg font-bold flex items-center gap-1 shadow-sm"
          >
            <span>🏷️</span>
            <span>تولید خودکار کد انبار (SKU) و بارکد</span>
          </button>

          {!isEditing ? (
            <Button size="small" variant="secondary" onClick={() => setIsEditing(true)}>
              ویرایش مشخصات
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="small" variant="transparent" onClick={() => setIsEditing(false)}>
                انصراف
              </Button>
              <Button size="small" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {skuSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-500/30 text-xs text-blue-900 dark:text-blue-300 font-bold flex items-center justify-between">
          <span>✓ {skuSuccess}</span>
          <button onClick={() => setSkuSuccess(null)}>✕</button>
        </div>
      )}

      {/* Feature 4: COGS / Cost Price Card */}
      <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
            <span>💰</span>
            <span>بهای تمام‌شده / هزینه تولید یا خرید هر عدد لباس (COGS):</span>
          </div>
          <div className="text-[11px] text-ui-fg-muted mt-0.5">
            این مقدار مبنای محاسبه حاشیه سود و سود ناخالص واقعی در داشبورد تحلیلی فروشگاه است.
          </div>
        </div>

        <div>
          {!isEditing ? (
            <div className="text-sm font-black text-emerald-700 dark:text-emerald-400">
              {formatToman(costPrice)}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="مثال: 210000"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-36 text-xs p-1.5 rounded-lg bg-ui-bg-base border border-ui-border-base text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold text-center"
              />
              <span className="text-xs text-ui-fg-muted font-bold">تومان</span>
            </div>
          )}
        </div>
      </div>

      {/* Apparel Attributes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-3.5 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
          <Text className="text-[11px] font-bold text-ui-fg-muted mb-1.5">🧵 جنس و متریال پارچه:</Text>
          {!isEditing ? (
            <div className="text-xs font-bold text-ui-fg-base">{specs.fabric}</div>
          ) : (
            <input
              type="text"
              value={specs.fabric}
              onChange={(e) => setSpecs({ ...specs, fabric: e.target.value })}
              className="w-full text-xs p-1.5 rounded-lg bg-ui-bg-base border border-ui-border-base text-ui-fg-base focus:outline-none focus:border-emerald-500"
            />
          )}
        </div>

        <div className="p-3.5 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
          <Text className="text-[11px] font-bold text-ui-fg-muted mb-1.5">📐 قواره و تن‌خور (Fit):</Text>
          {!isEditing ? (
            <div className="text-xs font-bold text-ui-fg-base">{specs.fit}</div>
          ) : (
            <input
              type="text"
              value={specs.fit}
              onChange={(e) => setSpecs({ ...specs, fit: e.target.value })}
              className="w-full text-xs p-1.5 rounded-lg bg-ui-bg-base border border-ui-border-base text-ui-fg-base focus:outline-none focus:border-emerald-500"
            />
          )}
        </div>

        <div className="p-3.5 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
          <Text className="text-[11px] font-bold text-ui-fg-muted mb-1.5">🍂 فصل مناسب استفاده:</Text>
          {!isEditing ? (
            <div className="text-xs font-bold text-ui-fg-base">{specs.season}</div>
          ) : (
            <input
              type="text"
              value={specs.season}
              onChange={(e) => setSpecs({ ...specs, season: e.target.value })}
              className="w-full text-xs p-1.5 rounded-lg bg-ui-bg-base border border-ui-border-base text-ui-fg-base focus:outline-none focus:border-emerald-500"
            />
          )}
        </div>

        <div className="p-3.5 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
          <Text className="text-[11px] font-bold text-ui-fg-muted mb-1.5">🧺 شرایط شستشو و مراقبت:</Text>
          {!isEditing ? (
            <div className="text-xs font-bold text-ui-fg-base">{specs.care}</div>
          ) : (
            <input
              type="text"
              value={specs.care}
              onChange={(e) => setSpecs({ ...specs, care: e.target.value })}
              className="w-full text-xs p-1.5 rounded-lg bg-ui-bg-base border border-ui-border-base text-ui-fg-base focus:outline-none focus:border-emerald-500"
            />
          )}
        </div>
      </div>

      {/* Size Guide Table */}
      <div className="p-4 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
        <div className="flex items-center justify-between mb-3">
          <Text className="text-xs font-bold text-ui-fg-base flex items-center gap-1.5">
            <span>📏</span>
            <span>جدول اندازه‌های سانتیمتری (سانتی‌متر):</span>
          </Text>
          <span className="text-[11px] text-ui-fg-muted">مبنای انتخاب سایز توسط خریدار در سایت فروشگاه</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-ui-border-base text-ui-fg-muted">
                <th className="pb-2 font-bold">سایز</th>
                <th className="pb-2 font-bold">قد لباس (cm)</th>
                <th className="pb-2 font-bold">عرض سینه (cm)</th>
                <th className="pb-2 font-bold">سرشانه (cm)</th>
                <th className="pb-2 font-bold">قد آستین (cm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border-base/50">
              {sizeGuide.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-ui-bg-base/60 transition-colors">
                  <td className="py-2.5 font-black text-ui-fg-base">{row.size}</td>
                  <td className="py-2.5">
                    {!isEditing ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.length} cm</span>
                    ) : (
                      <input
                        type="text"
                        value={row.length}
                        onChange={(e) => {
                          const updated = [...sizeGuide]
                          updated[idx].length = e.target.value
                          setSizeGuide(updated)
                        }}
                        className="w-16 p-1 text-xs rounded border border-ui-border-base bg-ui-bg-base"
                      />
                    )}
                  </td>
                  <td className="py-2.5">
                    {!isEditing ? (
                      <span className="font-bold text-ui-fg-base">{row.chest} cm</span>
                    ) : (
                      <input
                        type="text"
                        value={row.chest}
                        onChange={(e) => {
                          const updated = [...sizeGuide]
                          updated[idx].chest = e.target.value
                          setSizeGuide(updated)
                        }}
                        className="w-16 p-1 text-xs rounded border border-ui-border-base bg-ui-bg-base"
                      />
                    )}
                  </td>
                  <td className="py-2.5">
                    {!isEditing ? (
                      <span className="font-bold text-ui-fg-base">{row.shoulder} cm</span>
                    ) : (
                      <input
                        type="text"
                        value={row.shoulder}
                        onChange={(e) => {
                          const updated = [...sizeGuide]
                          updated[idx].shoulder = e.target.value
                          setSizeGuide(updated)
                        }}
                        className="w-16 p-1 text-xs rounded border border-ui-border-base bg-ui-bg-base"
                      />
                    )}
                  </td>
                  <td className="py-2.5">
                    {!isEditing ? (
                      <span className="font-bold text-ui-fg-base">{row.sleeve} cm</span>
                    ) : (
                      <input
                        type="text"
                        value={row.sleeve}
                        onChange={(e) => {
                          const updated = [...sizeGuide]
                          updated[idx].sleeve = e.target.value
                          setSizeGuide(updated)
                        }}
                        className="w-16 p-1 text-xs rounded border border-ui-border-base bg-ui-bg-base"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductApparelSpecsWidget
