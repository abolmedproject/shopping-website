import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { Container, Heading, clx } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { ShoppingBag, ArrowUpRightOnBox } from "../components/icons"

const formatShamsiDate = (dateStr: string | Date | undefined) => {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d)
  } catch {
    return String(dateStr)
  }
}

const formatShamsiTime = (dateStr: string | Date | undefined) => {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d)
  } catch {
    return ""
  }
}

const OrderDetailsHeaderWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  const order = data
  const metadata = (order?.metadata as any) || {}
  const iranianMeta = metadata.iranian_order || {}
  const shippingAddress = order?.shipping_address

  const initialProcessed = !!metadata.is_processed || !!iranianMeta.postal_tracking_code
  const [isProcessed, setIsProcessed] = useState(initialProcessed)
  const [isToggling, setIsToggling] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    // Inject CSS to hide unwanted sections on order detail page
    const styleEl = document.createElement("style")
    styleEl.id = "order-detail-cleaner-style"
    styleEl.innerHTML = `
      /* Hide General Sales Channel Card (Top card) */
      div:has(> div > span:contains("Default Sales Channel")),
      div:has(> div > a[href*="/sales-channels"]),
      /* Hide Payment card */
      div:has(> div > h2:contains("پرداخت")),
      /* Hide Unprocessed Items card */
      div:has(> div > h2:contains("آیتم‌های پردازش نشده")),
      div:has(> div > h2:contains("نیاز به حمل و نقل")),
      /* Hide Activity Section */
      div:has(> div > h2:contains("فعالیت")),
      /* Hide Metadata & JSON views */
      div:has(> button > span:contains("متادیتا")),
      div:has(> button > span:contains("JSON")) {
        display: none !important;
      }
    `
    document.head.appendChild(styleEl)

    return () => {
      styleEl.remove()
    }
  }, [])

  const handleToggleProcess = async () => {
    setIsToggling(true)
    const next = !isProcessed
    try {
      const res = await fetch(`/admin/orders/${order.id}/process-toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_processed: next })
      })

      if (res.ok) {
        setIsProcessed(next)
        setToastMsg(next ? "✓ سفارش با موفقیت به حالت پردازش‌شده تغییر یافت و به لیست آماده ارسال منتقل شد." : "سفارش به حالت پردازش‌نشده بازگشت.")
        setTimeout(() => setToastMsg(null), 3000)
      } else {
        alert("خطا در تغییر وضعیت سفارش")
      }
    } catch {
      alert("خطای اتصال در تغییر وضعیت")
    } finally {
      setIsToggling(false)
    }
  }

  const customerName = `${shippingAddress?.first_name || ""} ${shippingAddress?.last_name || ""}`.trim() || "خریدار مهمان"
  const phone = shippingAddress?.phone || "—"

  return (
    <div className="font-sans text-right dir-rtl my-3 space-y-3" dir="rtl">
      {toastMsg && (
        <div className="p-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg animate-fade-in flex items-center justify-between">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-white text-sm">✕</button>
        </div>
      )}

      {/* Clean Unified Order Header Toolbar */}
      <Container className="p-4 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 font-mono font-bold text-base shadow-xs">
              سفارش شماره #{order.display_id}
            </span>

            <div>
              <div className="font-bold text-sm text-ui-fg-base flex items-center gap-2">
                <span>{customerName}</span>
                <span className="text-xs font-mono text-ui-fg-muted bg-ui-bg-subtle px-2 py-0.5 rounded border border-ui-border-base dir-ltr">
                  {phone}
                </span>
              </div>
              <div className="text-[11px] text-ui-fg-subtle mt-0.5 font-medium">
                ثبت سفارش: {formatShamsiDate(order.created_at)} ساعت {formatShamsiTime(order.created_at)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* Interactive Processing Status Button */}
            <button
              onClick={handleToggleProcess}
              disabled={isToggling}
              className={clx(
                "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer border",
                isProcessed
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                  : "bg-amber-500 hover:bg-amber-400 text-white border-amber-500 shadow-amber-500/20"
              )}
              title="برای تغییر وضعیت سفارش بین پردازش‌شده و پردازش‌نشده کلیک کنید"
            >
              <span>{isProcessed ? "✅" : "⏳"}</span>
              <span>{isToggling ? "در حال ثبت..." : isProcessed ? "پردازش‌شده (آماده ارسال)" : "پردازش‌نشده (کلیک جهت تغییر)"}</span>
            </button>

            {isProcessed && (
              <button
                onClick={() => window.location.assign("/app/processed-orders")}
                className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>📦 سفارش‌های آماده ارسال</span>
                <ArrowUpRightOnBox className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderDetailsHeaderWidget
