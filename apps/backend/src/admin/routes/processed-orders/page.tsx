import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, clx } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { ShoppingBag, ArrowUpRightOnBox } from "../../components/icons"

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

const formatToman = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return "۰ تومان"
  return Math.round(amount).toLocaleString("fa-IR") + " تومان"
}


function shamsiToGregorian(jy: number, jm: number, jd: number) {
  let sal_a, gy, gm, gd, days;
  jy += 1595;
  days = -355668 + (365 * jy) + (Math.floor(jy / 33) * 8) + (Math.floor(((jy % 33) + 3) / 4)) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  gd = days + 1;
  sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return { gy, gm, gd };
}

const ProcessedOrdersPage = () => {
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<{ startISO: string; endISO: string; label: string } | null>(null)
  const [showDatePop, setShowDatePop] = useState(false)
  const [startDay, setStartDay] = useState(1)
  const [startMonth, setStartMonth] = useState(8)
  const [startYear, setStartYear] = useState(1405)
  const [endDay, setEndDay] = useState(30)
  const [endMonth, setEndMonth] = useState(8)
  const [endYear, setEndYear] = useState(1405)
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // One-Click Size Exchange Modal State
  const [exchangeOrder, setExchangeOrder] = useState<any | null>(null)
  const [exchangeData, setExchangeData] = useState<any>(null)
  const [selectedItemId, setSelectedItemId] = useState("")
  const [selectedNewVariantId, setSelectedNewVariantId] = useState("")
  const [exchangeReason, setExchangeReason] = useState("درخواست مشتری جهت تعویض سایز به دلیل تنگی/گشادی لباس")
  const [isExchanging, setIsExchanging] = useState(false)
  const [exchangeSuccess, setExchangeSuccess] = useState<string | null>(null)

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/admin/orders/processed-hub", { credentials: "include" })
      if (res.ok) {
        const json = await res.json()
        setOrders(json.orders || [])
      }
    } catch (err) {
      console.error("Failed to load processed orders:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleUpdateShipping = async (orderId: string, carrier: string, tracking: string) => {
    setSavingOrderId(orderId)
    try {
      const res = await fetch(`/admin/orders/${orderId}/shipping-meta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          postal_carrier: carrier,
          postal_tracking_code: tracking,
          fulfillment_status_fa: "پردازش‌شده و آماده ارسال"
        })
      })

      if (res.ok) {
        showToast("✓ مشخصات ارسال و کد رهگیری پستی با موفقیت ثبت گردید.")
        setOrders(prev => prev.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              iranian_order: {
                ...o.iranian_order,
                postal_carrier: carrier,
                postal_tracking_code: tracking,
                postal_updated_at: new Date().toISOString()
              }
            }
          }
          return o
        }))
      } else {
        alert("خطا در ذخیره وضعیت مرسوله")
      }
    } catch {
      alert("خطای اتصال در ثبت مشخصات مرسوله")
    } finally {
      setSavingOrderId(null)
    }
  }

  const handleRevertProcess = async (order: any) => {
    if (!confirm(`آیا از بازگرداندن سفارش #${order.display_id} به وضعیت پردازش‌نشده اطمینان دارید؟`)) {
      return
    }

    try {
      const res = await fetch(`/admin/orders/${order.id}/process-toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_processed: false })
      })

      if (res.ok) {
        showToast(`سفارش #${order.display_id} به وضعیت پردازش‌نشده بازگشت.`)
        setOrders(prev => prev.filter(o => o.id !== order.id))
      }
    } catch {
      alert("خطا در تغییر وضعیت سفارش")
    }
  }

  const handleCopySms = (order: any) => {
    const customerName = order.customer_name || ""
    const carrier = order.iranian_order?.postal_carrier || "پست پیشتاز"
    const tracking = order.iranian_order?.postal_tracking_code || "در حال صدور"
    const text = `سلام ${customerName} عزیز، سفارش پوشاک شما (#${order.display_id}) پردازش و آماده ارسال گردید.\nروش ارسال: ${carrier}\nکد رهگیری پستی: ${tracking}\nفروشگاه آنلاین مدوسا`
    navigator.clipboard.writeText(text)
    showToast("✓ متن پیامک اطلاع‌رسانی به مشتری کپی شد.")
  }

  const handleOpenExchange = async (order: any) => {
    setExchangeOrder(order)
    setExchangeSuccess(null)
    try {
      const res = await fetch(`/admin/orders/${order.id}/exchange-size`, { credentials: "include" })
      if (res.ok) {
        const json = await res.json()
        setExchangeData(json)
        if (json.items?.length) {
          setSelectedItemId(json.items[0].item_id)
          if (json.items[0].available_replacements?.length) {
            setSelectedNewVariantId(json.items[0].available_replacements[0].variant_id)
          }
        }
      }
    } catch {
      alert("خطا در بارگذاری موجودی تنوع‌های کالا")
    }
  }

  const handleExecuteExchange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exchangeOrder || !selectedItemId || !selectedNewVariantId) return
    setIsExchanging(true)
    try {
      const res = await fetch(`/admin/orders/${exchangeOrder.id}/exchange-size`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          item_id: selectedItemId,
          new_variant_id: selectedNewVariantId,
          reason: exchangeReason
        })
      })
      const json = await res.json()
      if (res.ok) {
        setExchangeSuccess(json.message)
        showToast("✓ تعویض سایز و اصلاح موجودی انبار با موفقیت انجام شد.")
        setTimeout(() => {
          setExchangeOrder(null)
          fetchOrders()
        }, 1500)
      } else {
        alert(json.message || "خطا در ثبت تعویض سایز")
      }
    } catch {
      alert("خطای غیرمنتظره در ثبت تعویض سایز")
    } finally {
      setIsExchanging(false)
    }
  }

  const handlePrintInvoice = (order: any) => {
    const printWindow = window.open("", "_blank", "width=900,height=800")
    if (!printWindow) return

    const iranianMeta = order.iranian_order || {}
    const shippingAddress = order.shipping_address || {}
    const customerName = order.customer_name || ""

    const invoiceHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8">
        <title>فاکتور رسمی فروش - سفارش #${order.display_id}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: Tahoma, 'Segoe UI', sans-serif; }
          body { background: #fff; color: #111; padding: 24px; font-size: 13px; line-height: 1.6; }
          .invoice-box { border: 2px solid #222; border-radius: 8px; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 16px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: bold; }
          .meta { font-size: 12px; text-align: left; }
          .section-title { font-size: 14px; font-weight: bold; background: #f3f4f6; padding: 6px 10px; margin: 12px 0 8px 0; border-radius: 4px; border: 1px solid #e5e7eb; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
          .info-item { font-size: 12px; }
          .info-item strong { color: #374151; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 16px; }
          th { background: #f3f4f6; border: 1px solid #d1d5db; padding: 8px 6px; font-size: 12px; text-align: right; }
          td { border: 1px solid #d1d5db; padding: 8px 6px; font-size: 12px; }
          .total-box { margin-right: auto; width: 320px; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
          .grand-total { border-top: 2px solid #111; margin-top: 6px; padding-top: 6px; font-weight: bold; font-size: 14px; color: #059669; }
          .footer { text-align: center; margin-top: 30px; padding-top: 12px; border-top: 1px dashed #9ca3af; font-size: 11px; color: #4b5563; }
          .tracking-badge { background: #f0fdf4; border: 1px solid #86efac; color: #166534; padding: 6px 10px; border-radius: 6px; margin-top: 8px; font-weight: bold; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="title">فاکتور رسمی فروش پوشاک</div>
              <div style="font-size: 13px; color: #4b5563; margin-top: 4px;">فروشگاه آنلاین مدوسا (Medusa Fashion)</div>
            </div>
            <div class="meta">
              <div><strong>شماره سفارش:</strong> #${order.display_id}</div>
              <div><strong>تاریخ صدور:</strong> ${formatShamsiDate(order.created_at)}</div>
              <div><strong>ساعت:</strong> ${formatShamsiTime(order.created_at)}</div>
            </div>
          </div>

          <div class="section-title">مشخصات خریدار و گیرنده</div>
          <div class="info-grid">
            <div class="info-item"><strong>نام و نام خانوادگی:</strong> ${customerName}</div>
            <div class="info-item"><strong>شماره تماس:</strong> ${shippingAddress.phone || "—"}</div>
            <div class="info-item"><strong>استان / شهر:</strong> ${shippingAddress.province || "—"} / ${shippingAddress.city || "—"}</div>
            <div class="info-item"><strong>کد پستی ۱۰ رقمی:</strong> ${shippingAddress.postal_code || "—"}</div>
            <div class="info-item" style="grid-column: span 2;"><strong>نشانی کامل پستی:</strong> ${shippingAddress.address_1 || "—"}</div>
          </div>

          ${iranianMeta.postal_tracking_code ? `
            <div class="tracking-badge">
              کد رهگیری مرسوله پستی: <strong>${iranianMeta.postal_tracking_code}</strong> (${iranianMeta.postal_carrier || "پست پیشتاز"})
            </div>
          ` : ""}

          <div class="section-title">اقلام و کالاهای فاکتور</div>
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">ردیف</th>
                <th>شرح کالا / لباس</th>
                <th>سایز و تنوع</th>
                <th style="text-align: center;">تعداد</th>
                <th>قیمت واحد</th>
                <th>مبلغ کل</th>
              </tr>
            </thead>
            <tbody>
              ${order.items?.map((it: any, idx: number) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td><strong>${it.title}</strong></td>
                  <td>${it.variant_title || "—"}</td>
                  <td style="text-align: center; font-weight: bold;">${it.quantity}</td>
                  <td>${formatToman(it.unit_price)}</td>
                  <td><strong>${formatToman(it.total_price)}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row">
              <span>جمع اقلام:</span>
              <span>${formatToman(order.summary?.item_subtotal)}</span>
            </div>
            <div class="total-row">
              <span>هزینه بسته‌بندی و ارسال:</span>
              <span>${formatToman(order.summary?.shipping_total)}</span>
            </div>
            ${order.summary?.discount_total ? `
              <div class="total-row" style="color: #dc2626;">
                <span>تخفیف:</span>
                <span>- ${formatToman(order.summary?.discount_total)}</span>
              </div>
            ` : ""}
            <div class="total-row grand-total">
              <span>مبلغ نهایی پرداخت‌شده:</span>
              <span>${formatToman(order.summary?.total)}</span>
            </div>
          </div>

          <div class="footer">
            از خرید شما سپاسگزاریم • امکان تعویض سایز تا ۴۸ ساعت پس از تحویل کالا محفوظ است.
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(invoiceHtml)
    printWindow.document.close()
  }

  const handlePrintShippingLabel = (order: any) => {
    const printWindow = window.open("", "_blank", "width=700,height=750")
    if (!printWindow) return

    const iranianMeta = order.iranian_order || {}
    const shippingAddress = order.shipping_address || {}

    const labelHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8">
        <title>برچسب پستی مرسوله - سفارش #${order.display_id}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: Tahoma, 'Segoe UI', sans-serif; }
          body { background: #fff; color: #111; padding: 20px; }
          .label-box { width: 100%; max-width: 520px; border: 3px solid #111; border-radius: 12px; margin: 0 auto; overflow: hidden; }
          .header-bar { background: #111; color: #fff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; }
          .header-title { font-size: 15px; font-weight: bold; }
          .service-tag { background: #059669; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
          .section { padding: 14px 16px; border-bottom: 2px dashed #9ca3af; }
          .section:last-child { border-bottom: none; }
          .sec-label { font-size: 11px; font-weight: bold; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; }
          .person-name { font-size: 16px; font-weight: bold; color: #111; margin-bottom: 4px; }
          .address-text { font-size: 13px; line-height: 1.6; color: #1f2937; margin-bottom: 6px; }
          .post-grid { display: flex; gap: 20px; font-size: 13px; }
          .post-code { background: #f3f4f6; border: 1.5px solid #374151; padding: 4px 10px; border-radius: 6px; font-weight: bold; letter-spacing: 2px; font-size: 14px; }
          .barcode-box { text-align: center; padding: 12px; background: #fafafa; border-top: 2px solid #111; }
          .barcode-mock { font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; letter-spacing: 5px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="label-box">
          <div class="header-bar">
            <div class="header-title">مرسوله پستی پوشاک مدوسا</div>
            <div class="service-tag">${iranianMeta.postal_carrier || "پست پیشتاز"}</div>
          </div>

          <div class="section" style="background: #f9fafb;">
            <div class="sec-label">فرستنده (Sender):</div>
            <div class="person-name" style="font-size: 14px;">انبار مرکزی و توزیع پوشاک مدوسا</div>
            <div class="address-text">تهران، بزرگراه فتح، شهرک صنعتی، انبار مرکزی توزیع پوشاک</div>
            <div class="post-grid">
              <div>کد پستی: <strong>1389745612</strong></div>
              <div>تلفن پشتیبانی: <strong>021-88997766</strong></div>
            </div>
          </div>

          <div class="section">
            <div class="sec-label" style="color: #dc2626; font-size: 12px;">گیرنده محترم (Receiver):</div>
            <div class="person-name">${order.customer_name}</div>
            <div class="address-text">
              <strong>استان:</strong> ${shippingAddress.province || "—"} ، <strong>شهر:</strong> ${shippingAddress.city || "—"}<br>
              <strong>نشانی کامل:</strong> ${shippingAddress.address_1 || "—"}
            </div>
            <div class="post-grid" style="margin-top: 8px;">
              <div>کد پستی ۱۰ رقمی: <span class="post-code">${shippingAddress.postal_code || "—"}</span></div>
              <div style="align-self: center;">تلفن همراه: <strong>${order.phone}</strong></div>
            </div>
          </div>

          <div class="barcode-box">
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">شناسه پیگیری سفارش (Order Tracking ID)</div>
            <div class="barcode-mock">||| | |||| || ||| |||| | |||||</div>
            <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">${iranianMeta.postal_tracking_code ? `کد رهگیری: ${iranianMeta.postal_tracking_code}` : `MEDUSA-#${order.display_id}`}</div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(labelHtml)
    printWindow.document.close()
  }

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    if (dateFilter?.startISO && dateFilter?.endISO) {
      const oTime = new Date(o.created_at).getTime()
      const sTime = new Date(dateFilter.startISO).getTime()
      const eTime = new Date(dateFilter.endISO).getTime()
      if (oTime < sTime || oTime > eTime) return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchId = String(o.display_id).includes(q)
      const matchName = (o.customer_name || "").toLowerCase().includes(q)
      const matchPhone = (o.phone || "").includes(q)
      const matchCity = (o.shipping_address?.city || "").toLowerCase().includes(q)
      const matchTracking = (o.iranian_order?.postal_tracking_code || "").includes(q)
      if (!matchId && !matchName && !matchPhone && !matchCity && !matchTracking) {
        return false
      }
    }
    return true
  })

  const totalValue = filteredOrders.reduce((sum, o) => sum + Number(o.summary?.total || 0), 0)
  const totalItemsCount = filteredOrders.reduce((sum, o) => {
    return sum + (o.items?.reduce((isum: number, it: any) => isum + Number(it.quantity || 0), 0) || 0)
  }, 0)

  return (
    <div className="font-sans text-right dir-rtl space-y-6 max-w-7xl mx-auto p-4 sm:p-6" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <Container className="p-6 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-lg">
                📦
              </span>
              <div>
                <Heading level="h1" className="text-xl font-bold text-ui-fg-base">
                  سفارش‌های پردازش‌شده (آماده ارسال و توزیع)
                </Heading>
                <p className="text-xs text-ui-fg-muted mt-0.5">
                  مرکز متمرکز بسته‌بندی، صدور برچسب پستی، ثبت کد رهگیری، تعویض سایز و تحویل به شرکت‌های پستی
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* Dedicated Excel Export for Processed Orders */}
            <button
              onClick={() => {
                const url = dateFilter
                  ? `/admin/orders/export-postal?processed=true&from=${encodeURIComponent(dateFilter.startISO)}&to=${encodeURIComponent(dateFilter.endISO)}`
                  : "/admin/orders/export-postal?processed=true"
                window.open(url, "_blank")
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              title="خروجی اکسل مرسولات پستی ویژه سفارش‌های پردازش‌شده"
            >
              <span>📥</span>
              <span>خروجی اکسل سفارش‌های پردازش‌شده (.xlsx)</span>
            </button>

            <button
              onClick={fetchOrders}
              className="px-3.5 py-2.5 rounded-xl bg-ui-bg-subtle hover:bg-ui-bg-component border border-ui-border-base text-ui-fg-base text-xs font-bold transition-all shadow-sm"
              title="بروزرسانی زنده"
            >
              🔄
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-ui-border-base">
          <div className="p-3.5 rounded-xl bg-ui-bg-subtle border border-ui-border-base">
            <div className="text-[11px] font-bold text-ui-fg-muted">تعداد سفارش‌های پردازش‌شده:</div>
            <div className="text-lg font-black text-ui-fg-base mt-1 flex items-center gap-1.5">
              <span>{filteredOrders.length}</span>
              <span className="text-xs font-normal text-ui-fg-subtle">فاکتور</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-ui-bg-subtle border border-ui-border-base">
            <div className="text-[11px] font-bold text-ui-fg-muted">تعداد کل اقلام و لباس‌ها:</div>
            <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1.5">
              <span>{totalItemsCount}</span>
              <span className="text-xs font-normal text-ui-fg-subtle">عدد لباس</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-ui-bg-subtle border border-ui-border-base">
            <div className="text-[11px] font-bold text-ui-fg-muted">مجموع ارزش فاکتورهای آماده توزیع:</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatToman(totalValue)}
            </div>
          </div>
        </div>
      </Container>

      {/* Search Bar & Shamsi Date Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3 relative">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="🔍 جستجو بر اساس شماره سفارش (#11)، نام مشتری، شماره موبایل، شهر، یا کد رهگیری..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 px-4 rounded-xl bg-ui-bg-base border border-ui-border-base text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-2.5 text-xs text-ui-fg-muted hover:text-ui-fg-base"
            >
              ✕
            </button>
          )}
        </div>

        {/* Date Filter Button */}
        <div className="relative w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowDatePop(!showDatePop)}
            className={clx(
              "w-full sm:w-auto px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm shrink-0",
              dateFilter
                ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20"
                : "bg-ui-bg-base text-ui-fg-base border-ui-border-base hover:bg-ui-bg-subtle"
            )}
          >
            <span>📅</span>
            <span>{dateFilter ? `بازه: ${dateFilter.label}` : "فیلتر زمانی (شمسی)"}</span>
            {dateFilter && (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  setDateFilter(null)
                }}
                className="mr-1 px-1.5 py-0.5 rounded-full bg-black/30 hover:bg-black/50 text-[10px]"
                title="حذف فیلتر زمانی"
              >
                ✕
              </span>
            )}
          </button>

          {/* Date Filter Popover */}
          {showDatePop && (
            <div 
              className="absolute top-full left-0 mt-2 z-50 w-80 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-4 text-white text-xs text-right dir-rtl space-y-3" 
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-700">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <span>📅</span>
                  <span>فیلتر زمانی سفارش‌های پردازش‌شده</span>
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowDatePop(false)} 
                  className="text-zinc-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-zinc-400">گزینه‌های آماده:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date()
                      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
                      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
                      setDateFilter({ startISO: start.toISOString(), endISO: end.toISOString(), label: "امروز" })
                      setShowDatePop(false)
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-200 border border-zinc-700 text-right"
                  >
                    امروز
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date()
                      const yest = new Date(now.getTime() - 24 * 3600 * 1000)
                      const start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0)
                      const end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999)
                      setDateFilter({ startISO: start.toISOString(), endISO: end.toISOString(), label: "دیروز" })
                      setShowDatePop(false)
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-200 border border-zinc-700 text-right"
                  >
                    دیروز
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date()
                      const past = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
                      setDateFilter({ startISO: past.toISOString(), endISO: now.toISOString(), label: "۷ روز اخیر" })
                      setShowDatePop(false)
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-200 border border-zinc-700 text-right"
                  >
                    ۷ روز اخیر
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date()
                      const past = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
                      setDateFilter({ startISO: past.toISOString(), endISO: now.toISOString(), label: "۳۰ روز اخیر" })
                      setShowDatePop(false)
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-200 border border-zinc-700 text-right"
                  >
                    ۳۰ روز اخیر
                  </button>
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="pt-2 border-t border-zinc-700 space-y-2">
                <div className="text-[10px] font-bold text-zinc-400">یا انتخاب بازه دلخواه شمسی:</div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] text-zinc-300">از روز / تاریخ:</label>
                  <div className="grid grid-cols-3 gap-1">
                    <input 
                      type="number" 
                      min="1" 
                      max="31" 
                      value={startDay} 
                      onChange={(e) => setStartDay(parseInt(e.target.value) || 1)} 
                      className="text-xs p-1.5 rounded bg-zinc-800 border border-zinc-700 text-white text-center font-bold" 
                    />
                    <select 
                      value={startMonth} 
                      onChange={(e) => setStartMonth(parseInt(e.target.value))} 
                      className="text-xs p-1.5 rounded bg-zinc-800 border border-zinc-700 text-white font-bold"
                    >
                      <option value="1">فروردین</option><option value="2">اردیبهشت</option><option value="3">خرداد</option>
                      <option value="4">تیر</option><option value="5">مرداد</option><option value="6">شهریور</option>
                      <option value="7">مهر</option><option value="8">آبان</option><option value="9">آذر</option>
                      <option value="10">دی</option><option value="11">بهمن</option><option value="12">اسفند</option>
                    </select>
                    <input 
                      type="number" 
                      value={startYear} 
                      onChange={(e) => setStartYear(parseInt(e.target.value) || 1405)} 
                      className="text-xs p-1.5 rounded bg-zinc-800 border border-zinc-700 text-white text-center font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-zinc-300">تا روز / تاریخ:</label>
                  <div className="grid grid-cols-3 gap-1">
                    <input 
                      type="number" 
                      min="1" 
                      max="31" 
                      value={endDay} 
                      onChange={(e) => setEndDay(parseInt(e.target.value) || 30)} 
                      className="text-xs p-1.5 rounded bg-zinc-800 border border-zinc-700 text-white text-center font-bold" 
                    />
                    <select 
                      value={endMonth} 
                      onChange={(e) => setEndMonth(parseInt(e.target.value))} 
                      className="text-xs p-1.5 rounded bg-zinc-800 border border-zinc-700 text-white font-bold"
                    >
                      <option value="1">فروردین</option><option value="2">اردیبهشت</option><option value="3">خرداد</option>
                      <option value="4">تیر</option><option value="5">مرداد</option><option value="6">شهریور</option>
                      <option value="7">مهر</option><option value="8">آبان</option><option value="9">آذر</option>
                      <option value="10">دی</option><option value="11">بهمن</option><option value="12">اسفند</option>
                    </select>
                    <input 
                      type="number" 
                      value={endYear} 
                      onChange={(e) => setEndYear(parseInt(e.target.value) || 1405)} 
                      className="text-xs p-1.5 rounded bg-zinc-800 border border-zinc-700 text-white text-center font-bold" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const gStart = shamsiToGregorian(startYear, startMonth, startDay)
                      const gEnd = shamsiToGregorian(endYear, endMonth, endDay)
                      const startISO = new Date(Date.UTC(gStart.gy, gStart.gm - 1, gStart.gd, 0, 0, 0)).toISOString()
                      const endISO = new Date(Date.UTC(gEnd.gy, gEnd.gm - 1, gEnd.gd, 23, 59, 59, 999)).toISOString()
                      setDateFilter({
                        startISO,
                        endISO,
                        label: `${startDay}/${startMonth} تا ${endDay}/${endMonth}`
                      })
                      setShowDatePop(false)
                    }}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    اعمال فیلتر
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter(null)
                      setShowDatePop(false)
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs border border-zinc-700"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-ui-fg-muted bg-ui-bg-base rounded-2xl border border-ui-border-base animate-pulse">
          در حال بارگذاری لیست سفارش‌های پردازش‌شده...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-16 text-center bg-ui-bg-base rounded-2xl border border-ui-border-base space-y-3">
          <div className="text-3xl">📦</div>
          <div className="font-bold text-sm text-ui-fg-base">هیچ سفارشی در این بخش یافت نشد</div>
          <p className="text-xs text-ui-fg-muted max-w-md mx-auto leading-relaxed">
            برای افزودن سفارش به این بخش، وارد پنل سفارشات شوید و روی دکمه «⏳ پردازش‌نشده» در هر سفارش کلیک کنید تا به وضعیت «✅ پردازش‌شده» درآمده و مستقیماً به اینجا منتقل گردد.
          </p>
          <button
            onClick={() => window.location.assign("/app/orders")}
            className="mt-2 px-4 py-2 rounded-xl bg-ui-bg-subtle hover:bg-ui-bg-component text-xs font-bold text-ui-fg-base border border-ui-border-base shadow-sm"
          >
            رفتن به جدول سفارشات ↗
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const iranian = order.iranian_order || {}
            const shipping = order.shipping_address || {}
            const isSavingThis = savingOrderId === order.id

            return (
              <Container key={order.id} className="p-5 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-sm hover:border-ui-border-strong transition-all space-y-4">
                {/* Order Header Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-ui-border-base gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-mono font-bold text-sm">
                      #{order.display_id}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-ui-fg-base flex items-center gap-2">
                        <span>{order.customer_name}</span>
                        <span className="text-xs font-mono text-ui-fg-muted bg-ui-bg-subtle px-2 py-0.5 rounded border border-ui-border-base dir-ltr">
                          {order.phone}
                        </span>
                      </div>
                      <div className="text-[11px] text-ui-fg-subtle mt-0.5 font-medium">
                        ثبت سفارش: {formatShamsiDate(order.created_at)} ساعت {formatShamsiTime(order.created_at)} • روش پرداخت: {iranian.payment_method || "درگاه بانکی شاپرک"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => window.location.assign(`/app/orders/${order.id}`)}
                      className="px-3 py-1.5 rounded-lg bg-ui-bg-subtle hover:bg-ui-bg-component border border-ui-border-base text-ui-fg-base text-xs font-bold flex items-center gap-1 shadow-sm"
                      title="مشاهده صفحه فاکتور اصلی"
                    >
                      <span>مشاهده فاکتور</span>
                      <ArrowUpRightOnBox className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleRevertProcess(order)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-[11px] font-bold transition-all shadow-sm"
                      title="لغو وضعیت پردازش و بازگشت به لیست عادی سفارشات"
                    >
                      ↩️ لغو پردازش
                    </button>
                  </div>
                </div>

                {/* Items & Shipping Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left Column: Items List */}
                  <div className="lg:col-span-7 space-y-2">
                    <div className="text-[11px] font-bold text-ui-fg-subtle flex items-center justify-between">
                      <span>اقلام لباس این سفارش ({order.items?.length || 0} قلم):</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        مجموع: {formatToman(order.summary?.total)}
                      </span>
                    </div>

                    <div className="divide-y divide-ui-border-base border border-ui-border-base rounded-xl overflow-hidden bg-ui-bg-subtle">
                      {order.items?.map((it: any) => (
                        <div key={it.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            {it.thumbnail ? (
                              <img src={it.thumbnail} alt={it.title} className="w-10 h-10 object-cover rounded-lg border border-ui-border-base shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-ui-bg-base border border-ui-border-base flex items-center justify-center text-sm shrink-0">
                                👕
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-ui-fg-base">{it.title}</div>
                              <div className="text-[11px] text-ui-fg-muted mt-0.5 font-medium">
                                سایز/رنگ: <strong className="text-purple-600 dark:text-purple-400">{it.variant_title}</strong> • تعداد: <strong className="text-ui-fg-base">{it.quantity} عدد</strong>
                              </div>
                            </div>
                          </div>
                          <div className="text-left font-bold text-ui-fg-base shrink-0">
                            {formatToman(it.total_price)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Customer Destination Box */}
                    <div className="p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base text-xs space-y-1">
                      <div className="font-bold text-ui-fg-base flex items-center gap-1.5">
                        <span>📍</span>
                        <span>مقصد ارسال: {shipping.province || "—"} ، {shipping.city || "—"}</span>
                      </div>
                      <div className="text-ui-fg-muted text-[11px] leading-relaxed">
                        {shipping.address_1 || "—"}
                      </div>
                      <div className="text-ui-fg-subtle text-[10px] font-mono">
                        کد پستی ۱۰ رقمی: <strong>{shipping.postal_code || "—"}</strong> • تماس: <strong>{order.phone}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Postal Shipping & Fulfillment Services */}
                  <div className="lg:col-span-5 bg-ui-bg-subtle p-3.5 rounded-xl border border-ui-border-base space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ui-fg-base flex items-center gap-1">
                        <span>📮</span>
                        <span>خدمات ارسال و رهگیری مرسوله</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                        آماده توزیع
                      </span>
                    </div>

                    {/* Postal Tracking Code & Carrier (Direct and Clean, no status button clutter) */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-ui-fg-base">حامل پستی و کد رهگیری مرسوله:</label>
                        {iranian.postal_tracking_code && (
                          <button
                            onClick={() => handleCopySms(order)}
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            📋 کپی پیامک
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <select
                          id={`carrier-${order.id}`}
                          defaultValue={iranian.postal_carrier || "پست پیشتاز"}
                          className="text-xs p-2 rounded-lg bg-ui-bg-base border border-ui-border-base text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                        >
                          <option value="پست پیشتاز">پست پیشتاز</option>
                          <option value="تیپاکس">تیپاکس (اکسپرس)</option>
                          <option value="پیک فوری موتوری">پیک فوری موتوری</option>
                          <option value="چاپار">چاپار</option>
                        </select>

                        <input
                          id={`tracking-${order.id}`}
                          type="text"
                          dir="ltr"
                          placeholder="کد رهگیری ۲۴ رقمی پستی"
                          defaultValue={iranian.postal_tracking_code || ""}
                          className="col-span-2 text-xs p-2 rounded-lg bg-ui-bg-base border border-ui-border-base text-ui-fg-base focus:outline-none focus:border-emerald-500 font-mono text-center tracking-wider"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const carrierEl = document.getElementById(`carrier-${order.id}`) as HTMLSelectElement
                          const trackingEl = document.getElementById(`tracking-${order.id}`) as HTMLInputElement
                          handleUpdateShipping(
                            order.id,
                            carrierEl?.value || "پست پیشتاز",
                            trackingEl?.value || ""
                          )
                        }}
                        disabled={isSavingThis}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all"
                      >
                        {isSavingThis ? "در حال ثبت..." : "ثبت و به‌روزرسانی کد رهگیری"}
                      </button>
                    </div>

                    {/* Print & Exchange Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => handlePrintInvoice(order)}
                        className="py-2 px-2 rounded-lg bg-ui-bg-base hover:bg-ui-bg-component border border-ui-border-base text-xs font-bold text-ui-fg-base flex items-center justify-center gap-1 shadow-sm"
                      >
                        <span>📄</span>
                        <span>چاپ فاکتور رسمی</span>
                      </button>

                      <button
                        onClick={() => handlePrintShippingLabel(order)}
                        className="py-2 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                      >
                        <span>🏷️</span>
                        <span>چاپ برچسب پستی</span>
                      </button>
                    </div>

                    {/* Size Exchange Button */}
                    <button
                      onClick={() => handleOpenExchange(order)}
                      className="w-full py-2.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <span>🔄</span>
                      <span>ثبت تعویض سایز لباس (Size Exchange)</span>
                    </button>

                    {/* Exchange History if exists */}
                    {order.exchange_history?.length > 0 && (
                      <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[11px] space-y-1">
                        <div className="font-bold text-purple-900 dark:text-purple-300">سوابق تعویض سایز:</div>
                        {order.exchange_history.map((ex: any, idx: number) => (
                          <div key={idx} className="leading-relaxed text-ui-fg-muted">
                            • {ex.item_title}: از <strong>{ex.from_size}</strong> به <strong>{ex.to_size}</strong> ({ex.shamsi_date})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Container>
            )
          })}
        </div>
      )}

      {/* Modal: One-Click Size Exchange Modal */}
      {exchangeOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-6 max-w-lg w-full shadow-2xl relative text-xs text-right dir-rtl" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-ui-border-base mb-4">
              <Heading level="h2" className="text-base font-bold text-ui-fg-base flex items-center gap-2">
                <span>🔄</span>
                <span>تعویض سایز لباس - سفارش #{exchangeOrder.display_id}</span>
              </Heading>
              <button onClick={() => setExchangeOrder(null)} className="text-ui-fg-muted hover:text-ui-fg-base font-bold text-base">✕</button>
            </div>

            {exchangeSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-center font-bold">
                ✓ {exchangeSuccess}
              </div>
            ) : (
              <form onSubmit={handleExecuteExchange} className="space-y-4">
                <div className="p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base text-ui-fg-subtle leading-relaxed">
                  با ثبت این فرم، سایز قبلی به صورت خودکار به انبار مرکزی بازگشته و سایز جدید کسر و در فاکتور جایگزین می‌شود.
                </div>

                <div>
                  <label className="block font-bold text-ui-fg-base mb-1">کالای نیازمند تعویض سایز:</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      const id = e.target.value
                      setSelectedItemId(id)
                      const it = exchangeData?.items?.find((i: any) => i.item_id === id)
                      if (it?.available_replacements?.length) {
                        setSelectedNewVariantId(it.available_replacements[0].variant_id)
                      }
                    }}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl p-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-purple-500 font-bold"
                  >
                    {exchangeData?.items?.map((it: any) => (
                      <option key={it.item_id} value={it.item_id}>
                        {it.product_title} (سایز فعلی: {it.variant_title}) — تعداد: {it.quantity} عدد
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ui-fg-base mb-1">انتخاب سایز و رنگ جدید جایگزین (انبار مرکزی):</label>
                  <select
                    value={selectedNewVariantId}
                    onChange={(e) => setSelectedNewVariantId(e.target.value)}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl p-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-purple-500 font-bold"
                  >
                    {exchangeData?.items
                      ?.find((i: any) => i.item_id === selectedItemId)
                      ?.available_replacements?.map((rep: any) => (
                        <option key={rep.variant_id} value={rep.variant_id}>
                          سایز جدید: {rep.variant_title} — موجودی انبار: {rep.stock_quantity} عدد (کد: {rep.sku})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ui-fg-base mb-1">علت و توضیحات تعویض:</label>
                  <input
                    type="text"
                    value={exchangeReason}
                    onChange={(e) => setExchangeReason(e.target.value)}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl p-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-2 border-t border-ui-border-base">
                  <button
                    type="button"
                    onClick={() => setExchangeOrder(null)}
                    className="px-4 py-2 rounded-xl text-xs text-ui-fg-muted hover:text-ui-fg-base"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={isExchanging || !selectedNewVariantId}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                  >
                    {isExchanging ? "در حال ثبت تعویض و اصلاح انبار..." : "تأیید و ثبت تعویض سایز"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "سفارش‌های پردازش‌شده",
  icon: ShoppingBag,
  nested: "/orders",
  rank: 1,
})

export default ProcessedOrdersPage
