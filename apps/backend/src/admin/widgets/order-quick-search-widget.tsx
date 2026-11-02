import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { MagnifyingGlass, ShoppingBag, ArrowUpRightOnBox } from "../components/icons"

const OrderQuickSearchWidget = () => {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any>({ pages: [], products: [], orders: [], customers: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!query || query.trim().length < 1) {
      setResults({ pages: [], products: [], orders: [], customers: [] })
      setIsOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/admin/quick-search?q=${encodeURIComponent(query.trim())}`, {
          credentials: "include"
        })
        if (res.ok) {
          const json = await res.json()
          setResults(json)
          setIsOpen(true)
        }
      } catch {
        // Error
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const formatToman = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "۰ تومان"
    return Math.round(amount).toLocaleString("fa-IR") + " تومان"
  }

  const navigateTo = (path: string) => {
    window.location.assign("/app" + path)
  }

  return (
    <div className="font-sans mb-4 dir-rtl text-right" dir="rtl">
      <Container className="p-4 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-sm text-right relative">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quick Search Input */}
          <div className="flex-1 relative">
            <div className="relative flex items-center">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="🔍 جستجوی سریع در کل سیستم: شماره موبایل، نام خریدار، کد کالا، عنوان لباس، صفحات مدیریت..."
                className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl py-2.5 pr-10 pl-4 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-medium transition-all shadow-sm"
              />
              <span className="absolute right-3.5 text-ui-fg-muted pointer-events-none">
                <MagnifyingGlass className="w-4 h-4" />
              </span>
              {query && (
                <button
                  onClick={() => { setQuery(""); setIsOpen(false); }}
                  className="absolute left-3 text-ui-fg-muted hover:text-ui-fg-base text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {isOpen && (
              <div className="absolute top-full right-0 left-0 mt-2 bg-ui-bg-base border border-ui-border-base rounded-2xl shadow-2xl z-50 p-3 divide-y divide-ui-border-base max-h-[32rem] overflow-y-auto space-y-2">
                {isLoading && (
                  <div className="p-3 text-center text-xs text-ui-fg-muted animate-pulse">در حال جستجو در فروشگاه...</div>
                )}

                {!isLoading && 
                  (results.pages?.length || 0) === 0 && 
                  (results.products?.length || 0) === 0 && 
                  (results.orders?.length || 0) === 0 && 
                  (results.customers?.length || 0) === 0 && (
                  <div className="p-5 text-center text-xs text-ui-fg-muted">
                    موردی با عبارت «{query}» در پایگاه داده فروشگاه یافت نشد.
                  </div>
                )}

                {/* 1. Pages Navigation Section */}
                {results.pages?.length > 0 && (
                  <div className="pb-2">
                    <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1 px-1 flex items-center gap-1">
                      <span>📑</span>
                      <span>صفحات و بخش‌های پنل:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {results.pages.map((p: any) => (
                        <div
                          key={p.path}
                          onClick={() => navigateTo(p.path)}
                          className="p-2 rounded-xl hover:bg-ui-bg-subtle cursor-pointer transition-colors flex items-center justify-between text-xs border border-transparent hover:border-ui-border-base"
                        >
                          <div className="flex items-center gap-2">
                            <span>{p.icon}</span>
                            <div>
                              <div className="font-bold text-ui-fg-base">{p.title}</div>
                              <div className="text-[10px] text-ui-fg-muted">{p.category}</div>
                            </div>
                          </div>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">رفتن ↵</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Products Section */}
                {results.products?.length > 0 && (
                  <div className="py-2">
                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1 px-1 flex items-center gap-1">
                      <span>👕</span>
                      <span>محصولات و تنوع‌های لباس ({results.products.length}):</span>
                    </div>
                    <div className="space-y-1">
                      {results.products.map((pr: any) => (
                        <div
                          key={pr.variant_id || pr.id}
                          onClick={() => navigateTo(`/products/${pr.id}`)}
                          className="p-2 rounded-xl hover:bg-ui-bg-subtle cursor-pointer transition-colors flex items-center justify-between text-xs border border-transparent hover:border-ui-border-base"
                        >
                          <div className="flex items-center gap-2.5">
                            {pr.thumbnail ? (
                              <img src={pr.thumbnail} alt={pr.title} className="w-8 h-8 rounded-lg object-cover border border-ui-border-base shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-ui-bg-subtle border border-ui-border-base flex items-center justify-center text-xs shrink-0">
                                👕
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-ui-fg-base">{pr.title}</div>
                              <div className="text-[10px] text-ui-fg-muted">
                                {pr.variant_title ? `سایز: ${pr.variant_title} • ` : ""}{pr.sku ? `شناسه: ${pr.sku}` : ""}
                              </div>
                            </div>
                          </div>
                          <div className="text-left font-bold text-ui-fg-base text-[11px]">
                            موجودی: {pr.stock_quantity} عدد
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Orders Section */}
                {results.orders?.length > 0 && (
                  <div className="py-2">
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 px-1 flex items-center gap-1">
                      <span>🛍️</span>
                      <span>سفارشات منطبق ({results.orders.length}):</span>
                    </div>
                    <div className="space-y-1.5">
                      {results.orders.map((o: any) => (
                        <div
                          key={o.id}
                          onClick={() => navigateTo(`/orders/${o.id}`)}
                          className="p-2.5 rounded-xl hover:bg-ui-bg-subtle cursor-pointer transition-colors flex items-center justify-between text-xs group border border-transparent hover:border-ui-border-base"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-bold text-[11px]">
                              #{o.display_id}
                            </span>
                            <div>
                              <div className="font-bold text-ui-fg-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                {o.customer_name} ({o.phone})
                              </div>
                              <div className="text-[10px] text-ui-fg-muted mt-0.5">
                                {o.city} • {o.source_title} • {o.shamsi_date}
                              </div>
                            </div>
                          </div>

                          <div className="text-left">
                            <div className="font-black text-ui-fg-base">{formatToman(o.total)}</div>
                            <span className="text-[10px] text-ui-fg-muted group-hover:underline flex items-center gap-0.5 justify-end mt-0.5">
                              <span>مشاهده فاکتور</span>
                              <ArrowUpRightOnBox className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Customers Section */}
                {results.customers?.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mb-1 px-1 flex items-center gap-1">
                      <span>👥</span>
                      <span>خریداران و مشتریان ({results.customers.length}):</span>
                    </div>
                    <div className="space-y-1">
                      {results.customers.map((c: any) => (
                        <div
                          key={c.id}
                          onClick={() => navigateTo(`/customers/${c.id}`)}
                          className="p-2.5 rounded-xl hover:bg-ui-bg-subtle cursor-pointer transition-colors flex items-center justify-between text-xs group border border-transparent hover:border-ui-border-base"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 flex items-center justify-center font-bold text-[10px]">
                              {c.name?.charAt(0) || "U"}
                            </span>
                            <div>
                              <div className="font-bold text-ui-fg-base group-hover:text-purple-400">
                                {c.name}
                              </div>
                              <div className="text-[10px] text-ui-fg-muted">تلفن: {c.phone}</div>
                            </div>
                          </div>
                          <span className="text-[11px] text-ui-fg-muted">
                            {c.orders_count} سفارش ثبت‌شده
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Order Button */}
            <button
              onClick={() => navigateTo("/quick-order")}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>+ ثبت سریع سفارش (دایرکت/تلفنی)</span>
            </button>
          </div>
        </div>
      </Container>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default OrderQuickSearchWidget
