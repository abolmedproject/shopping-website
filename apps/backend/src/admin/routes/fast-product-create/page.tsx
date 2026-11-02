"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  TagSolid,
  Sparkles,
  CheckCircle,
  ExclamationCircle,
  ArrowUpRightOnBox,
  CurrencyDollar,
  ShoppingBag
} from "../../components/icons"
import { Heading, Text, clx } from "@medusajs/ui"
import { useEffect, useState, useRef } from "react"

export const config = defineRouteConfig({
  label: "ایجاد سریع لباس (تک‌مرحله‌ای)",
  icon: TagSolid,
  rank: 5,
})

const DEFAULT_APPAREL_IMAGES = [
  { label: "تیشرت مشکی", url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png" },
  { label: "تیشرت سفید", url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png" },
  { label: "شلوارک و شورت", url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png" },
  { label: "سویشرت طوسی", url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png" },
  { label: "هودی کرم", url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/hoodie-vintage-front.png" },
  { label: "شلوار جین / اسلش", url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-vintage-front.png" },
]

const SIZE_SYSTEMS = {
  upper: {
    id: "upper",
    label: "👕 بالاتنه (حروفی S تا 4XL)",
    defaultSizes: ["S", "M", "L", "XL"],
    allSizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "فری‌سایز"]
  },
  pants: {
    id: "pants",
    label: "👖 شلوار، جین و اسلش (عددی ۲۸ تا ۴۰)",
    defaultSizes: ["30", "31", "32", "33", "34", "36"],
    allSizes: ["28", "29", "30", "31", "32", "33", "34", "35", "36", "38", "40"]
  },
  shoes: {
    id: "shoes",
    label: "👟 کفش و کتونی (عددی ۳۷ تا ۴۵)",
    defaultSizes: ["39", "40", "41", "42", "43"],
    allSizes: ["37", "38", "39", "40", "41", "42", "43", "44", "45"]
  }
}

const DEFAULT_COLORS = [
  { name: "مشکی", code: "#18181B" },
  { name: "سفید", code: "#FFFFFF" },
  { name: "طوسی", code: "#9CA3AF" },
  { name: "کرم", code: "#F5ECD7" },
  { name: "سرمه‌ای", code: "#1E3A8A" },
  { name: "سبز زیتونی", code: "#4D7C0F" },
  { name: "زرشکی", code: "#881337" },
  { name: "جین / آبی", code: "#2563EB" },
  { name: "ذغالی", code: "#374151" },
  { name: "نسکافه‌ای", code: "#C4A482" }
]

const FastProductCreatePage = () => {
  const [initData, setInitData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Product Main Info
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [thumbnail, setThumbnail] = useState(DEFAULT_APPAREL_IMAGES[0].url)

  // Direct PC Upload Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  const colorFileInputRef = useRef<HTMLInputElement>(null)
  const [activeColorForUpload, setActiveColorForUpload] = useState<string | null>(null)

  // Color Images Map (Color Name -> Image URL)
  const [colorImages, setColorImages] = useState<Record<string, string>>({})

  // Pricing (Double Level in Toman)
  const [retailPrice, setRetailPrice] = useState("450000") // فروشگاه
  const [costPrice, setCostPrice] = useState("250000")     // خرید / بهای تمام‌شده

  // Size System & Options Selection
  const [sizeMode, setSizeMode] = useState<"upper" | "pants" | "shoes">("upper")
  const [selectedSizes, setSelectedSizes] = useState<string[]>(SIZE_SYSTEMS.upper.defaultSizes)
  const [customSizeInput, setCustomSizeInput] = useState("")

  // Colors Selection (Manual & Custom)
  const [colorPalette, setColorPalette] = useState(DEFAULT_COLORS)
  const [selectedColors, setSelectedColors] = useState<string[]>(["مشکی", "سفید"])
  const [customColorName, setCustomColorName] = useState("")
  const [customColorCode, setCustomColorCode] = useState("#4F46E5")

  // Bulk Variant Rows State
  const [variantRows, setVariantRows] = useState<any[]>([])
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([])

  // Bulk Apply Bar State
  const [bulkPrice, setBulkPrice] = useState("")
  const [bulkStock, setBulkStock] = useState("30")

  // Apparel Technical Specs
  const specs = {
    fabric: "۱۰۰٪ نخ پنبه سوپر با بافت لطیف و ضدحساسیت",
    fit: "قواره آزاد و استاندارد (Regular Fit)",
    season: "چهارفصل / بهاره و تابستانه",
    care: "شستشو با آب ۳۰ درجه بدون سفیدکننده"
  }

  // Fetch Categories & Defaults
  useEffect(() => {
    fetch("/admin/fast-product-create", { credentials: "include" })
      .then(res => res.json())
      .then(json => {
        setInitData(json)
        if (json.categories?.length) {
          setCategoryId(json.categories[0].id)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [])

  // Smart size mode switch when category changes
  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId)
    const cat = initData?.categories?.find((c: any) => c.id === catId)
    const catName = cat?.name || ""
    if (catName.includes("شلوار") || catName.includes("جین") || catName.includes("اسلش")) {
      setSizeMode("pants")
      setSelectedSizes(SIZE_SYSTEMS.pants.defaultSizes)
    } else if (catName.includes("کفش") || catName.includes("کتونی")) {
      setSizeMode("shoes")
      setSelectedSizes(SIZE_SYSTEMS.shoes.defaultSizes)
    } else {
      setSizeMode("upper")
      setSelectedSizes(SIZE_SYSTEMS.upper.defaultSizes)
    }
  }

  // Switch size mode manually
  const switchSizeMode = (mode: "upper" | "pants" | "shoes") => {
    setSizeMode(mode)
    setSelectedSizes(SIZE_SYSTEMS[mode].defaultSizes)
  }

  // Auto regenerate variant combinations when colors or sizes change
  useEffect(() => {
    const rows: any[] = []
    const baseRetail = parseInt(retailPrice.replace(/[^0-9]/g, "")) || 0
    const baseCost = parseInt(costPrice.replace(/[^0-9]/g, "")) || 0
    const defaultStock = parseInt(bulkStock.replace(/[^0-9]/g, "")) || 30

    if (selectedColors.length === 0 && selectedSizes.length === 0) {
      rows.push({
        title: "تک‌سایز / تک‌رنگ",
        color: "تک‌رنگ",
        size: "فری‌سایز",
        price: baseRetail,
        cost_price: baseCost,
        stock: defaultStock,
        thumbnail: thumbnail,
        sku: ""
      })
    } else if (selectedColors.length > 0 && selectedSizes.length === 0) {
      selectedColors.forEach(c => {
        rows.push({
          title: `${c} / فری‌سایز`,
          color: c,
          size: "فری‌سایز",
          price: baseRetail,
          cost_price: baseCost,
          stock: defaultStock,
          thumbnail: colorImages[c] || thumbnail,
          sku: ""
        })
      })
    } else if (selectedColors.length === 0 && selectedSizes.length > 0) {
      selectedSizes.forEach(s => {
        rows.push({
          title: `تک‌رنگ / ${s}`,
          color: "تک‌رنگ",
          size: s,
          price: baseRetail,
          cost_price: baseCost,
          stock: defaultStock,
          thumbnail: thumbnail,
          sku: ""
        })
      })
    } else {
      selectedColors.forEach(c => {
        selectedSizes.forEach(s => {
          rows.push({
            title: `${c} / ${s}`,
            color: c,
            size: s,
            price: baseRetail,
            cost_price: baseCost,
            stock: defaultStock,
            thumbnail: colorImages[c] || thumbnail,
            sku: ""
          })
        })
      })
    }

    setVariantRows(rows)
    setSelectedRowIndices(rows.map((_, i) => i))
  }, [selectedColors, selectedSizes, colorImages, thumbnail])

  // Direct PC Image Upload Handler (Main Product Thumbnail)
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Data = reader.result as string
        const res = await fetch("/admin/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            filename: file.name,
            base64: base64Data
          })
        })
        const json = await res.json()
        if (res.ok && json.url) {
          setThumbnail(json.url)
        } else {
          alert(json.message || "خطا در آپلود تصویر.")
        }
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setIsUploading(false)
      alert("خطای غیرمنتظره در پردازش فایل.")
    }
  }

  // Direct PC Image Upload Handler for Specific Color
  const handleColorFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeColorForUpload) return

    const colorTarget = activeColorForUpload
    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Data = reader.result as string
        const res = await fetch("/admin/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            filename: `${colorTarget}_${file.name}`,
            base64: base64Data
          })
        })
        const json = await res.json()
        if (res.ok && json.url) {
          setColorImages(prev => ({ ...prev, [colorTarget]: json.url }))
        } else {
          alert(json.message || "خطا در آپلود تصویر رنگ.")
        }
        setIsUploading(false)
        setActiveColorForUpload(null)
      }
      reader.readAsDataURL(file)
    } catch {
      setIsUploading(false)
      setActiveColorForUpload(null)
      alert("خطا در پردازش تصویر رنگ.")
    }
  }

  // Color actions
  const toggleColor = (colorName: string) => {
    if (selectedColors.includes(colorName)) {
      setSelectedColors(selectedColors.filter(c => c !== colorName))
    } else {
      setSelectedColors([...selectedColors, colorName])
    }
  }

  const handleAddCustomColor = (e: React.FormEvent) => {
    e.preventDefault()
    const name = customColorName.trim()
    if (!name) return
    if (!colorPalette.find(c => c.name === name)) {
      setColorPalette([...colorPalette, { name, code: customColorCode }])
    }
    if (!selectedColors.includes(name)) {
      setSelectedColors([...selectedColors, name])
    }
    setCustomColorName("")
  }

  // Size actions
  const toggleSize = (sizeName: string) => {
    if (selectedSizes.includes(sizeName)) {
      setSelectedSizes(selectedSizes.filter(s => s !== sizeName))
    } else {
      setSelectedSizes([...selectedSizes, sizeName])
    }
  }

  const handleAddCustomSize = (e: React.FormEvent) => {
    e.preventDefault()
    const sz = customSizeInput.trim()
    if (!sz) return
    if (!selectedSizes.includes(sz)) {
      setSelectedSizes([...selectedSizes, sz])
    }
    setCustomSizeInput("")
  }

  // Row selection
  const toggleSelectRow = (idx: number) => {
    if (selectedRowIndices.includes(idx)) {
      setSelectedRowIndices(selectedRowIndices.filter(i => i !== idx))
    } else {
      setSelectedRowIndices([...selectedRowIndices, idx])
    }
  }

  const toggleSelectAll = () => {
    if (selectedRowIndices.length === variantRows.length) {
      setSelectedRowIndices([])
    } else {
      setSelectedRowIndices(variantRows.map((_, i) => i))
    }
  }

  // Bulk Apply Price & Stock
  const handleApplyBulk = () => {
    const p = bulkPrice ? parseInt(bulkPrice.replace(/[^0-9]/g, "")) : null
    const s = bulkStock ? parseInt(bulkStock.replace(/[^0-9]/g, "")) : null

    setVariantRows(prev => prev.map((row, idx) => {
      if (selectedRowIndices.includes(idx)) {
        return {
          ...row,
          price: p !== null && !isNaN(p) ? p : row.price,
          stock: s !== null && !isNaN(s) ? s : row.stock
        }
      }
      return row
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessResult(null)
    setIsSubmitting(true)

    try {
      const payload = {
        title,
        subtitle,
        category_id: categoryId,
        thumbnail,
        color_images: colorImages,
        retail_price: parseInt(retailPrice.replace(/[^0-9]/g, "")) || 0,
        cost_price: parseInt(costPrice.replace(/[^0-9]/g, "")) || 0,
        colors: selectedColors,
        sizes: selectedSizes,
        variants: variantRows,
        apparel_specs: specs
      }

      const res = await fetch("/admin/fast-product-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "خطا در ایجاد لباس.")

      setSuccessResult(json)
      setTitle("")
      setSubtitle("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ui-bg-subtle text-ui-fg-base p-3 sm:p-6 lg:p-8 dir-rtl text-right font-sans" dir="rtl">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDirectFileUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={colorFileInputRef}
        onChange={handleColorFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-ui-border-base">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ui-bg-base border border-ui-border-base flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1" className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-ui-fg-base">
                ایجاد سریع و یکپارچه لباس جدید (تک‌مرحله‌ای)
              </Heading>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                ویژه بازار پوشاک ایران
              </span>
            </div>
            <Text className="text-xs text-ui-fg-muted mt-0.5 font-medium">
              آپلود مستقیم عکس از سیستم، تصویر مجزا برای هر رنگ، سایزبندی متناسب (عددی شلوار/حروفی) و اتصال خودکار به انبار
            </Text>
          </div>
        </div>

        <button
          onClick={() => window.location.assign("/app/products")}
          className="px-3.5 py-2 text-xs bg-ui-bg-base hover:bg-ui-bg-component border border-ui-border-base rounded-xl font-bold text-ui-fg-base shadow-sm flex items-center gap-1.5"
        >
          <span>مشاهده کاتالوگ محصولات</span>
          <ArrowUpRightOnBox className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Success Notification */}
      {successResult && (
        <div className="my-6 p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl shadow-sm text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                لباس جدید با {successResult.variants_count} تنوع با موفقیت در فروشگاه و انبار ثبت شد!
              </div>
              <div className="text-ui-fg-muted mt-1 font-medium">
                شناسه محصول: <code>{successResult.product_id}</code> • اتصال خودکار به انبار مرکزی تهران انجام شد.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.assign(`/app/products/${successResult.product_id}`)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5"
            >
              <span>مشاهده و ویرایش صفحه محصول</span>
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
          <Text className="text-ui-fg-muted text-xs">در حال بارگذاری تنظیمات اولیه پوشاک...</Text>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Section 1: Main Product Details, Direct PC Upload & Category */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-ui-border-base">
              <div className="font-bold text-sm text-ui-fg-base flex items-center gap-2">
                <TagSolid className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>۱. مشخصات کالا، آپلود عکس اصلی و دسته‌بندی</span>
              </div>
              <span className="text-[11px] text-ui-fg-muted">آپلود مستقیم فایل از کامپیوتر با ذخیره در سرور محلی</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 text-xs">
              {/* Image Preview & PC Upload Box (1 Col) */}
              <div className="p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base flex flex-col items-center justify-between gap-3">
                <div className="w-full text-center">
                  <div className="text-[11px] font-bold text-ui-fg-muted mb-2">تصویر اصلی محصول:</div>
                  <div className="w-32 h-32 mx-auto rounded-xl overflow-hidden border-2 border-ui-border-base bg-ui-bg-base shadow-sm relative group">
                    <img src={thumbnail} alt="پیش‌نمایش لباس" className="w-full h-full object-cover" />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[11px] font-bold">
                        در حال ذخیره...
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full space-y-2">
                  {/* Direct PC Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>📤</span>
                    <span>{isUploading ? "در حال آپلود..." : "انتخاب و آپلود عکس از سیستم"}</span>
                  </button>

                  {/* Sample Fast Presets */}
                  <div className="text-[10px] text-ui-fg-muted text-center pt-1">یا انتخاب از تصاویر آماده:</div>
                  <div className="flex items-center justify-center gap-1.5 overflow-x-auto pb-1">
                    {DEFAULT_APPAREL_IMAGES.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setThumbnail(img.url)}
                        className={clx(
                          "w-7 h-7 rounded-lg overflow-hidden border shrink-0 transition-all",
                          thumbnail === img.url ? "border-emerald-500 ring-2 ring-emerald-500/30 scale-105" : "border-ui-border-base opacity-70 hover:opacity-100"
                        )}
                        title={img.label}
                      >
                        <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title, Category & Subtitle (3 Cols) */}
              <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-ui-fg-subtle font-bold mb-1">نام و عنوان لباس *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: شلوار جین اسلیم راسته / هودی دورس توکرکی"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-ui-fg-subtle font-bold mb-1">دسته‌بندی پوشاک *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {initData?.categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-ui-fg-subtle font-bold mb-1">زیرعنوان / نکات مهم لباس</label>
                  <input
                    type="text"
                    placeholder="مثال: پارچه ترک بدون آبرفت، رنگ ثابت، دوخت دو رو زنجیره‌ای"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Transparent Double Pricing (Retail vs Cost) */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-ui-border-base">
              <div className="font-bold text-sm text-ui-fg-base flex items-center gap-2">
                <CurrencyDollar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>۲. قیمت‌گذاری شفاف و دوگانه (کاملاً به تومان IRT)</span>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">بدون ریال و دلار</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/30 rounded-xl space-y-1.5">
                <label className="block text-blue-900 dark:text-blue-300 font-extrabold text-xs">
                  🛍️ قیمت فروش در فروشگاه (تومان) *
                </label>
                <div className="text-[11px] text-ui-fg-muted mb-2">
                  قیمتی که خریدار روی سایت می‌بیند و با آن خرید می‌کند.
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="450000"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                    className="w-full bg-ui-bg-base border border-ui-border-base rounded-xl px-3.5 py-2 text-sm text-ui-fg-base focus:outline-none focus:border-blue-500 font-black text-center"
                  />
                  <span className="absolute left-3 text-xs text-ui-fg-muted font-bold pointer-events-none">تومان</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl space-y-1.5">
                <label className="block text-emerald-900 dark:text-emerald-300 font-extrabold text-xs">
                  💰 قیمت پایه / هزینه خرید کالا (COGS - تومان)
                </label>
                <div className="text-[11px] text-ui-fg-muted mb-2">
                  بهای تمام‌شده برای محاسبه سود خالص واقعی در داشبورد تحلیلی.
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="250000"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-ui-bg-base border border-ui-border-base rounded-xl px-3.5 py-2 text-sm text-ui-fg-base focus:outline-none focus:border-emerald-500 font-black text-center"
                  />
                  <span className="absolute left-3 text-xs text-ui-fg-muted font-bold pointer-events-none">تومان</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Colors with Image Upload & Dynamic Sizing System */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-ui-border-base">
              <div className="font-bold text-sm text-ui-fg-base flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>۳. رنگ‌بندی پویا با آپلود عکس مجزا برای هر رنگ و سایزبندی تخصصی</span>
              </div>
              <span className="text-[11px] text-ui-fg-muted">امکان تعریف عکس اختصاصی برای هر رنگ لباس</span>
            </div>

            {/* Colors Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-ui-fg-base flex items-center gap-1.5">
                  <span>🎨</span>
                  <span>رنگ‌بندی لباس (روی هر رنگ برای فعال/غیرفعال‌سازی کلیک کنید):</span>
                </label>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                  {selectedColors.length} رنگ فعال
                </span>
              </div>

              {/* Color Chips with Custom Image Indicator */}
              <div className="flex flex-wrap gap-2 items-center">
                {colorPalette.map((c) => {
                  const isSelected = selectedColors.includes(c.name)
                  const hasColorImage = Boolean(colorImages[c.name])
                  return (
                    <div
                      key={c.name}
                      className={clx(
                        "rounded-xl border transition-all flex items-center gap-1 p-1 pr-2.5",
                        isSelected
                          ? "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500 shadow-sm"
                          : "bg-ui-bg-subtle text-ui-fg-muted border-ui-border-base hover:text-ui-fg-base"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleColor(c.name)}
                        className="flex items-center gap-2 text-xs font-bold"
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: c.code }} />
                        <span>{c.name}</span>
                        {isSelected && <span className="text-[10px]">✓</span>}
                      </button>

                      {/* Button to Upload Specific Photo for this Color */}
                      {isSelected && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveColorForUpload(c.name)
                            colorFileInputRef.current?.click()
                          }}
                          className={clx(
                            "px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all mr-1 flex items-center gap-1",
                            hasColorImage
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500"
                              : "bg-ui-bg-base text-ui-fg-subtle border-ui-border-base hover:text-ui-fg-base"
                          )}
                          title={`آپلود عکس اختصاصی برای رنگ ${c.name}`}
                        >
                          <span>{hasColorImage ? "✓ عکس رنگ" : "+ عکس رنگ"}</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Add Custom Color Input */}
              <div className="flex items-center gap-2 mt-3 max-w-md">
                <input
                  type="color"
                  value={customColorCode}
                  onChange={(e) => setCustomColorCode(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-ui-border-base p-0.5 bg-ui-bg-base"
                  title="انتخاب کد رنگ"
                />
                <input
                  type="text"
                  placeholder="افزودن رنگ دلخواه (مثلاً: سبز یشمی، خردلی، یاسی)..."
                  value={customColorName}
                  onChange={(e) => setCustomColorName(e.target.value)}
                  className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3 py-1.5 text-xs text-ui-fg-base focus:outline-none focus:border-purple-500 font-bold"
                />
                <button
                  type="button"
                  onClick={handleAddCustomColor}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 shadow-sm"
                >
                  + افزودن رنگ
                </button>
              </div>
            </div>

            {/* Sizing Section: Multi-System Mode Switcher */}
            <div className="pt-4 border-t border-ui-border-base">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <label className="text-xs font-bold text-ui-fg-base flex items-center gap-1.5">
                  <span>📐</span>
                  <span>الگوی سایزبندی متناسب با محصول:</span>
                </label>

                {/* Sizing System Switcher Tabs */}
                <div className="flex items-center gap-1 bg-ui-bg-subtle p-1 rounded-xl border border-ui-border-base text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => switchSizeMode("upper")}
                    className={clx(
                      "px-3 py-1 rounded-lg transition-all",
                      sizeMode === "upper" ? "bg-emerald-600 text-white shadow-sm" : "text-ui-fg-muted hover:text-ui-fg-base"
                    )}
                  >
                    👕 بالاتنه (حروفی S تا 4XL)
                  </button>
                  <button
                    type="button"
                    onClick={() => switchSizeMode("pants")}
                    className={clx(
                      "px-3 py-1 rounded-lg transition-all",
                      sizeMode === "pants" ? "bg-emerald-600 text-white shadow-sm" : "text-ui-fg-muted hover:text-ui-fg-base"
                    )}
                  >
                    👖 شلوار و جین (عددی ۲۸ تا ۴۰)
                  </button>
                  <button
                    type="button"
                    onClick={() => switchSizeMode("shoes")}
                    className={clx(
                      "px-3 py-1 rounded-lg transition-all",
                      sizeMode === "shoes" ? "bg-emerald-600 text-white shadow-sm" : "text-ui-fg-muted hover:text-ui-fg-base"
                    )}
                  >
                    👟 کفش (عددی ۳۷ تا ۴۵)
                  </button>
                </div>
              </div>

              {/* Available Sizes in Current System */}
              <div className="flex flex-wrap gap-2 items-center">
                {SIZE_SYSTEMS[sizeMode].allSizes.map((sz: string) => {
                  const isSelected = selectedSizes.includes(sz)
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      className={clx(
                        "px-4 py-1.5 rounded-xl text-xs font-black border transition-all",
                        isSelected
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500 shadow-sm"
                          : "bg-ui-bg-subtle text-ui-fg-muted border-ui-border-base hover:text-ui-fg-base"
                      )}
                    >
                      {sz} {isSelected && "✓"}
                    </button>
                  )
                })}
              </div>

              {/* Custom Size Addition */}
              <div className="flex items-center gap-2 mt-3 max-w-sm">
                <input
                  type="text"
                  placeholder="افزودن سایز خاص (مثلاً: 35 یا Oversize)..."
                  value={customSizeInput}
                  onChange={(e) => setCustomSizeInput(e.target.value)}
                  className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3 py-1.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSize}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 shadow-sm"
                >
                  + افزودن سایز
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Bulk Price & Stock Applicator Table */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-ui-border-base">
              <div>
                <div className="font-bold text-sm text-ui-fg-base flex items-center gap-2">
                  <span>⚡</span>
                  <span>۴. جدول تنوع‌ها با تصویر تفکیکی رنگ و نوار ابزار قیمت‌گذاری گروهی</span>
                </div>
                <Text className="text-xs text-ui-fg-muted mt-0.5">
                  هر رنگ تصویر اختصاصی خود را نمایش می‌دهد • امکان اعمال قیمت و موجودی یکجا
                </Text>
              </div>

              <span className="px-3 py-1 rounded-xl bg-ui-bg-subtle border border-ui-border-base font-bold text-xs text-emerald-600 dark:text-emerald-400">
                {variantRows.length} تنوع لباس آماده ایجاد
              </span>
            </div>

            {/* Bulk Toolbar */}
            <div className="p-4 bg-ui-bg-subtle rounded-xl border border-ui-border-base flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedRowIndices.length === variantRows.length && variantRows.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <span className="font-bold text-ui-fg-base">
                  انتخاب همه ({selectedRowIndices.length} مورد انتخاب‌شده)
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-ui-fg-muted font-medium">قیمت گروهی:</span>
                  <input
                    type="text"
                    placeholder="مثال: 450000"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    className="w-28 p-1.5 rounded-lg bg-ui-bg-base border border-ui-border-base text-ui-fg-base text-center font-bold"
                  />
                  <span className="text-ui-fg-muted">تومان</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-ui-fg-muted font-medium">موجودی انبار:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="30"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    className="w-20 p-1.5 rounded-lg bg-ui-bg-base border border-ui-border-base text-ui-fg-base text-center font-bold"
                  />
                  <span className="text-ui-fg-muted">عدد</span>
                </div>

                <button
                  type="button"
                  onClick={handleApplyBulk}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-sm"
                >
                  اعمال به انتخاب‌شده‌ها
                </button>
              </div>
            </div>

            {/* Variants Table with Color-Specific Thumbnail Preview */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-ui-border-base text-ui-fg-muted">
                    <th className="pb-3 w-10 text-center">انتخاب</th>
                    <th className="pb-3 font-bold">عکس رنگ</th>
                    <th className="pb-3 font-bold">تنوع لباس</th>
                    <th className="pb-3 font-bold">رنگ</th>
                    <th className="pb-3 font-bold">سایز</th>
                    <th className="pb-3 font-bold">قیمت فروشگاه (تومان)</th>
                    <th className="pb-3 font-bold">موجودی انبار مرکزی</th>
                    <th className="pb-3 font-bold text-left">کد انبار خودکار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border-base/40">
                  {variantRows.map((row, idx) => {
                    const isSelected = selectedRowIndices.includes(idx)
                    const rowThumb = row.thumbnail || colorImages[row.color] || thumbnail
                    return (
                      <tr key={idx} className={clx("hover:bg-ui-bg-subtle/50 transition-colors", isSelected ? "bg-ui-bg-subtle/30" : "")}>
                        <td className="py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(idx)}
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5">
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-ui-border-base bg-ui-bg-base shadow-sm">
                            <img src={rowThumb} alt={row.title} className="w-full h-full object-cover" />
                          </div>
                        </td>
                        <td className="py-2.5 font-bold text-ui-fg-base">{row.title}</td>
                        <td className="py-2.5 text-ui-fg-subtle">{row.color}</td>
                        <td className="py-2.5 font-black text-ui-fg-base">{row.size}</td>
                        <td className="py-2.5">
                          <input
                            type="number"
                            min="0"
                            value={row.price}
                            onChange={(e) => {
                              const updated = [...variantRows]
                              updated[idx].price = parseInt(e.target.value) || 0
                              setVariantRows(updated)
                            }}
                            className="w-28 p-1 rounded-lg bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base font-bold text-center"
                          />
                        </td>
                        <td className="py-2.5">
                          <input
                            type="number"
                            min="0"
                            value={row.stock}
                            onChange={(e) => {
                              const updated = [...variantRows]
                              updated[idx].stock = parseInt(e.target.value) || 0
                              setVariantRows(updated)
                            }}
                            className="w-20 p-1 rounded-lg bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base font-bold text-center"
                          />
                        </td>
                        <td className="py-2.5 text-left text-ui-fg-muted font-mono">
                          {row.sku || "تولید خودکار (SKU)"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>در حال ایجاد لباس و اتصال خودکار به انبار مرکزی تهران...</span>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>ثبت نهایی کالا و ایجاد موجودی در انبار مرکزی تهران</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default FastProductCreatePage
