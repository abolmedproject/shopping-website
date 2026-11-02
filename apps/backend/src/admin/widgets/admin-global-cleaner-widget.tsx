import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"

const AdminGlobalCleanerWidget = () => {
  useEffect(() => {
    // 0. Immediate Export Route Interception:
    // If user lands on /app/*/export, initiate real Excel download and redirect back to parent page
    const pathname = window.location.pathname
    if (pathname.includes("/orders/export")) {
      window.open("/admin/orders/export-postal", "_blank")
      window.location.replace("/app/orders")
      return
    }
    if (pathname.includes("/customers/export")) {
      window.open("/admin/customers/export-excel", "_blank")
      window.location.replace("/app/customers")
      return
    }
    if (pathname.includes("/products/export")) {
      window.open("/admin/products/export-excel", "_blank")
      window.location.replace("/app/products")
      return
    }
    if (pathname.includes("/inventory/export")) {
      window.open("/admin/inventory/export-excel", "_blank")
      window.location.replace("/app/inventory")
      return
    }

    // 1. Inject Global Clean Styling
    const styleEl = document.createElement("style")
    styleEl.id = "medusa-iranian-admin-cleaner"
    styleEl.innerHTML = `
      /* ======================================================== */
      /* Medusa Admin Clean & Persian Fashion Store Optimization   */
      /* ======================================================== */

      /* 1. Sidebar Cleanups: Hide Unwanted Menu Items and their <li> wrappers */
      li:has(a[href*="/draft-orders"]),
      li:has(a[href*="/collections"]),
      li:has(a[href*="/reservations"]),
      li:has(a[href*="/customer-groups"]),
      li:has(a[href*="/price-lists"]),
      a[href*="/draft-orders"],
      a[href*="/collections"],
      a[href*="/reservations"],
      a[href*="/customer-groups"],
      a[href*="/price-lists"] {
        display: none !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* 2. Hide Settings General Items and Section */
      li:has(a[href*="/settings/store"]),
      li:has(a[href*="/settings/users"]),
      li:has(a[href*="/settings/regions"]),
      li:has(a[href*="/settings/tax-regions"]),
      li:has(a[href*="/settings/return-reasons"]),
      li:has(a[href*="/settings/refund-reasons"]),
      li:has(a[href*="/settings/sales-channels"]),
      li:has(a[href*="/settings/product-types"]),
      li:has(a[href*="/settings/product-tags"]),
      li:has(a[href*="/settings/locations"]),
      a[href*="/settings/store"],
      a[href*="/settings/users"],
      a[href*="/settings/regions"],
      a[href*="/settings/tax-regions"],
      a[href*="/settings/return-reasons"],
      a[href*="/settings/refund-reasons"],
      a[href*="/settings/sales-channels"],
      a[href*="/settings/product-types"],
      a[href*="/settings/product-tags"],
      a[href*="/settings/locations"] {
        display: none !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* 3. Submenu Spacing & Padding for Products */
      ul:has(a[href*="/categories"]),
      ul:has(a[href*="/product-options"]) {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
      }

      a[href*="/categories"],
      a[href*="/product-options"],
      a[href*="/processed-orders"],
      a[href*="/campaigns"] {
        padding-right: 28px !important;
        padding-left: 12px !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        min-height: 32px !important;
        line-height: 1.4 !important;
        margin-top: 2px !important;
        margin-bottom: 2px !important;
        border-radius: 6px !important;
      }

      /* 4. Orders List Table (/app/orders): Hide Payment Column */
      table thead tr th:nth-child(5),
      table tbody tr td:nth-child(5) {
        display: none !important;
      }

      /* Align table cells cleanly */
      table tbody tr td:nth-child(4) {
        direction: ltr !important;
        text-align: center !important;
        font-family: monospace !important;
        font-weight: bold !important;
      }

      /* Customers Table Styling: Align Date to the right and format cleanly */
      table thead tr th:last-child {
        text-align: right !important;
      }

      table tbody tr td:last-child {
        text-align: right !important;
        direction: rtl !important;
      }

      table tbody tr td:last-child > div {
        justify-content: flex-start !important;
        text-align: right !important;
        direction: rtl !important;
      }

      /* Interactive status button in table */
      .medusa-proc-btn {
        transition: all 0.15s ease-in-out;
        cursor: pointer;
      }
      .medusa-proc-btn:hover {
        transform: scale(1.04);
      }
      .medusa-proc-btn:active {
        transform: scale(0.96);
      }

      /* Date Filter Popover */
      .medusa-date-popover {
        position: absolute;
        top: 100%;
        right: 0;
        z-index: 9999;
        min-width: 300px;
        background: #18181b;
        color: #f4f4f5;
        border: 1px solid #3f3f46;
        border-radius: 14px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        padding: 14px;
        font-family: inherit;
        direction: rtl;
        text-align: right;
      }

      /* Responsive improvements for mobile */
      @media (max-width: 768px) {
        table {
          display: block;
          overflow-x: auto;
          white-space: nowrap;
        }
      }
    `
    document.head.appendChild(styleEl)

    // Redirect settings if landing on /settings or /settings/store
    if (window.location.pathname === "/app/settings" || window.location.pathname === "/app/settings/store") {
      window.location.replace("/app/settings/profile")
    }

    // 2. Cache of orders & customers info
    let ordersCache: Record<string, any> = {}
    let byDisplayIdCache: Record<string, any> = {}
    let customersCache: Record<string, any> = {}

    const loadOrdersInfo = async () => {
      try {
        const res = await fetch("/admin/orders/phone-and-status", { credentials: "include" })
        if (res.ok) {
          const json = await res.json()
          ordersCache = json.orders || {}
          byDisplayIdCache = json.by_display_id || {}
          enhanceOrdersTable()
        }
      } catch {}
    }

    const loadCustomersInfo = async () => {
      try {
        const res = await fetch("/admin/customers/details-summary", { credentials: "include" })
        if (res.ok) {
          const json = await res.json()
          customersCache = json.customers || {}
          enhanceCustomersTable()
        }
      } catch {}
    }

    // Helper: convert Shamsi Y/M/D to Gregorian {gy, gm, gd}
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

    function applyDateRangeFilter(startISO: string | null, endISO: string | null) {
      const url = new URL(window.location.href)
      if (startISO && endISO) {
        const filterObj = { $gte: startISO, $lte: endISO }
        url.searchParams.set("created_at", JSON.stringify(filterObj))
      } else {
        url.searchParams.delete("created_at")
      }
      url.searchParams.delete("offset")
      window.location.assign(url.pathname + url.search)
    }

    // 3. Enhance Orders List Table
    const enhanceOrdersTable = () => {
      const table = document.querySelector("table")
      if (!table) return

      // Replace Top Export Button in Orders Header
      const exportLinks = document.querySelectorAll('a[href*="/orders/export"]')
      exportLinks.forEach((link) => {
        const el = link as HTMLAnchorElement
        if (!el.dataset.postalEnhanced) {
          el.dataset.postalEnhanced = "true"
          el.href = "/admin/orders/export-postal"
          el.target = "_blank"
          el.className = "px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          el.innerHTML = "<span>📥</span><span>خروجی مرسولات پستی (.xlsx)</span>"
          el.onclick = (e) => {
            e.preventDefault()
            e.stopPropagation()
            window.open("/admin/orders/export-postal", "_blank")
          }
        }
      })

      // Update Header Row
      const thList = table.querySelectorAll("thead tr th")
      if (thList.length >= 6) {
        // Col 2: Date with Shamsi Filter Popup
        const dateTh = thList[1] as HTMLElement
        if (dateTh && !dateTh.dataset.enhanced) {
          dateTh.dataset.enhanced = "true"
          dateTh.style.position = "relative"
          dateTh.style.cursor = "pointer"

          const url = new URL(window.location.href)
          const hasDateFilter = url.searchParams.has("created_at")

          dateTh.innerHTML = `
            <div class="flex items-center gap-1.5 select-none" id="medusa-date-th-trigger">
              <span class="font-bold text-xs">تاریخ</span>
              <span class="p-1 rounded-md bg-ui-bg-subtle text-xs hover:bg-ui-bg-component transition-all" title="فیلتر بر اساس تاریخ شمسی">📅</span>
              ${hasDateFilter ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white" id="medusa-clear-date-filter" title="حذف فیلتر تاریخ">فعال ✕</span>' : ''}
            </div>
          `

          const trigger = dateTh.querySelector("#medusa-date-th-trigger") as HTMLElement
          const clearBtn = dateTh.querySelector("#medusa-clear-date-filter") as HTMLElement

          if (clearBtn) {
            clearBtn.onclick = (e) => {
              e.preventDefault()
              e.stopPropagation()
              applyDateRangeFilter(null, null)
            }
          }

          if (trigger) {
            trigger.onclick = (e) => {
              e.preventDefault()
              e.stopPropagation()

              const existingPop = document.querySelector(".medusa-date-popover")
              if (existingPop) {
                existingPop.remove()
                return
              }

              const pop = document.createElement("div")
              pop.className = "medusa-date-popover"

              pop.innerHTML = `
                <div class="flex items-center justify-between pb-2 border-b border-zinc-700 mb-3">
                  <span class="font-bold text-xs flex items-center gap-1.5">
                    <span>📅</span>
                    <span>فیلتر زمانی سفارشات (شمسی)</span>
                  </span>
                  <button type="button" id="medusa-pop-close" class="text-zinc-400 hover:text-white text-xs">✕</button>
                </div>

                <!-- Quick Presets -->
                <div class="space-y-1.5 mb-3">
                  <div class="text-[10px] font-bold text-zinc-400">گزینه‌های سریع:</div>
                  <div class="grid grid-cols-2 gap-1.5">
                    <button type="button" data-preset="today" class="medusa-preset-btn px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-200 border border-zinc-700 text-right">امروز</button>
                    <button type="button" data-preset="yesterday" class="medusa-preset-btn px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-200 border border-zinc-700 text-right">دیروز</button>
                    <button type="button" data-preset="last7" class="medusa-preset-btn px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-200 border border-zinc-700 text-right">۷ روز اخیر</button>
                    <button type="button" data-preset="last30" class="medusa-preset-btn px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-200 border border-zinc-700 text-right">۳۰ روز اخیر</button>
                  </div>
                </div>

                <!-- Custom Range Selection -->
                <div class="pt-2 border-t border-zinc-700 space-y-2">
                  <div class="text-[10px] font-bold text-zinc-400">یا انتخاب بازه دلخواه شمسی:</div>
                  
                  <div class="space-y-1">
                    <label class="block text-[10px] text-zinc-300">از روز / تاریخ:</label>
                    <div class="grid grid-cols-3 gap-1">
                      <input type="number" id="sh-start-day" placeholder="روز" min="1" max="31" value="۱" class="text-xs p-1.5 rounded bg-zinc-900 border border-zinc-700 text-white text-center font-bold" />
                      <select id="sh-start-month" class="text-xs p-1.5 rounded bg-zinc-900 border border-zinc-700 text-white font-bold">
                        <option value="1">فروردین</option><option value="2">اردیبهشت</option><option value="3">خرداد</option>
                        <option value="4">تیر</option><option value="5">مرداد</option><option value="6">شهریور</option>
                        <option value="7">مهر</option><option value="8" selected>آبان</option><option value="9">آذر</option>
                        <option value="10">دی</option><option value="11">بهمن</option><option value="12">اسفند</option>
                      </select>
                      <input type="number" id="sh-start-year" value="1405" class="text-xs p-1.5 rounded bg-zinc-900 border border-zinc-700 text-white text-center font-bold" />
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="block text-[10px] text-zinc-300">تا روز / تاریخ:</label>
                    <div class="grid grid-cols-3 gap-1">
                      <input type="number" id="sh-end-day" placeholder="روز" min="1" max="31" value="۳۰" class="text-xs p-1.5 rounded bg-zinc-900 border border-zinc-700 text-white text-center font-bold" />
                      <select id="sh-end-month" class="text-xs p-1.5 rounded bg-zinc-900 border border-zinc-700 text-white font-bold">
                        <option value="1">فروردین</option><option value="2">اردیبهشت</option><option value="3">خرداد</option>
                        <option value="4">تیر</option><option value="5">مرداد</option><option value="6">شهریور</option>
                        <option value="7">مهر</option><option value="8" selected>آبان</option><option value="9">آذر</option>
                        <option value="10">دی</option><option value="11">بهمن</option><option value="12">اسفند</option>
                      </select>
                      <input type="number" id="sh-end-year" value="1405" class="text-xs p-1.5 rounded bg-zinc-900 border border-zinc-700 text-white text-center font-bold" />
                    </div>
                  </div>

                  <div class="flex items-center gap-2 pt-2">
                    <button type="button" id="medusa-pop-apply" class="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all">اعمال فیلتر تاریخ</button>
                    <button type="button" id="medusa-pop-reset" class="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs border border-zinc-700">حذف فیلتر</button>
                  </div>
                </div>
              `

              pop.onclick = (pe) => pe.stopPropagation()

              pop.querySelector("#medusa-pop-close")?.addEventListener("click", () => pop.remove())

              pop.querySelectorAll(".medusa-preset-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                  const preset = (btn as HTMLElement).dataset.preset
                  const now = new Date()

                  if (preset === "today") {
                    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
                    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
                    applyDateRangeFilter(start.toISOString(), end.toISOString())
                  } else if (preset === "yesterday") {
                    const yest = new Date(now.getTime() - 24 * 3600 * 1000)
                    const start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0)
                    const end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999)
                    applyDateRangeFilter(start.toISOString(), end.toISOString())
                  } else if (preset === "last7") {
                    const past = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
                    applyDateRangeFilter(past.toISOString(), now.toISOString())
                  } else if (preset === "last30") {
                    const past = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
                    applyDateRangeFilter(past.toISOString(), now.toISOString())
                  }
                })
              })

              pop.querySelector("#medusa-pop-apply")?.addEventListener("click", () => {
                const sDay = parseInt((pop.querySelector("#sh-start-day") as HTMLInputElement).value) || 1
                const sMonth = parseInt((pop.querySelector("#sh-start-month") as HTMLSelectElement).value) || 8
                const sYear = parseInt((pop.querySelector("#sh-start-year") as HTMLInputElement).value) || 1405

                const eDay = parseInt((pop.querySelector("#sh-end-day") as HTMLInputElement).value) || 30
                const eMonth = parseInt((pop.querySelector("#sh-end-month") as HTMLSelectElement).value) || 8
                const eYear = parseInt((pop.querySelector("#sh-end-year") as HTMLInputElement).value) || 1405

                const gStart = shamsiToGregorian(sYear, sMonth, sDay)
                const gEnd = shamsiToGregorian(eYear, eMonth, eDay)

                const startISO = new Date(Date.UTC(gStart.gy, gStart.gm - 1, gStart.gd, 0, 0, 0)).toISOString()
                const endISO = new Date(Date.UTC(gEnd.gy, gEnd.gm - 1, gEnd.gd, 23, 59, 59, 999)).toISOString()

                applyDateRangeFilter(startISO, endISO)
              })

              pop.querySelector("#medusa-pop-reset")?.addEventListener("click", () => {
                applyDateRangeFilter(null, null)
              })

              dateTh.appendChild(pop)
            }
          }
        }

        // Col 4: Channel -> Phone Number
        const chTh = thList[3] as HTMLElement
        if (chTh && !chTh.dataset.enhanced) {
          chTh.dataset.enhanced = "true"
          chTh.innerHTML = '<span class="font-bold text-xs">شماره موبایل خریدار</span>'
        }

        // Col 6: Fulfillment -> Processing Status
        const fTh = thList[5] as HTMLElement
        if (fTh && !fTh.dataset.enhanced) {
          fTh.dataset.enhanced = "true"
          fTh.innerHTML = '<span class="font-bold text-xs">وضعیت پردازش سفارش</span>'
        }
      }

      // Update Data Rows
      const rows = table.querySelectorAll("tbody tr")
      rows.forEach((tr) => {
        const tdList = tr.querySelectorAll("td")
        if (tdList.length < 6) return

        const link = tr.querySelector('a[href*="/orders/"]') as HTMLAnchorElement
        let orderId = ""
        let displayId = ""

        if (link) {
          const match = link.href.match(/\/orders\/(order_[a-zA-Z0-9]+)/)
          if (match) orderId = match[1]
        }

        const firstColText = tdList[0]?.textContent || ""
        const numMatch = firstColText.match(/#?(\d+)/)
        if (numMatch) {
          displayId = numMatch[1]
        }

        const info = (orderId && ordersCache[orderId]) || (displayId && byDisplayIdCache[displayId])
        if (!info) return

        // 1. Column 2: Shamsi Date & Time
        const dateTd = tdList[1] as HTMLElement
        if (dateTd && dateTd.dataset.orderId !== info.id && info.shamsi_date) {
          dateTd.dataset.orderId = info.id
          dateTd.innerHTML = `
            <div class="flex flex-col text-right">
              <span class="font-bold text-xs text-ui-fg-base">${info.shamsi_date}</span>
              ${info.shamsi_time ? '<span class="text-[10px] text-ui-fg-muted font-mono mt-0.5">ساعت ' + info.shamsi_time + '</span>' : ''}
            </div>
          `
        }

        // 2. Column 4: Real Phone Number
        const phoneTd = tdList[3] as HTMLElement
        if (phoneTd && phoneTd.dataset.orderId !== info.id) {
          phoneTd.dataset.orderId = info.id
          phoneTd.innerHTML = `<span class="px-2 py-0.5 rounded-md bg-ui-bg-subtle text-ui-fg-base border border-ui-border-base font-mono font-bold text-xs dir-ltr tracking-wider inline-block">${info.phone || "—"}</span>`
        }

        // 3. Column 6: Interactive Processing Toggle Button
        const procTd = tdList[5] as HTMLElement
        if (procTd && procTd.dataset.orderId !== info.id) {
          procTd.dataset.orderId = info.id

          const renderBtn = (isProc: boolean) => {
            procTd.innerHTML = ""
            const btn = document.createElement("button")
            btn.type = "button"
            btn.className = isProc
              ? "medusa-proc-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shadow-xs flex items-center gap-1 mx-auto"
              : "medusa-proc-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-xs flex items-center gap-1 mx-auto"

            btn.innerHTML = isProc
              ? "<span>✅</span><span>پردازش‌شده</span>"
              : "<span>⏳</span><span>پردازش‌نشده</span>"

            btn.title = isProc
              ? "سفارش پردازش شده و آماده ارسال است (کلیک جهت لغو)"
              : "سفارش هنوز پردازش نشده است (کلیک جهت تغییر به پردازش‌شده)"

            btn.onclick = async (e) => {
              e.preventDefault()
              e.stopPropagation()
              btn.disabled = true
              btn.innerHTML = '<span class="animate-spin">⏳</span><span>در حال ثبت...</span>'

              const next = !isProc
              try {
                const res = await fetch(`/admin/orders/${info.id}/process-toggle`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ is_processed: next })
                })

                if (res.ok) {
                  info.is_processed = next
                  renderBtn(next)
                } else {
                  alert("خطا در تغییر وضعیت سفارش")
                  renderBtn(isProc)
                }
              } catch {
                alert("خطای اتصال")
                renderBtn(isProc)
              }
            }

            procTd.appendChild(btn)
          }

          renderBtn(!!info.is_processed)
        }
      })
    }

    // 4. Enhance Customers Table (/app/customers)
    const enhanceCustomersTable = () => {
      const table = document.querySelector("table")
      if (!table) return

      // Replace Export Button in Customers Header
      const exportLinks = document.querySelectorAll('a[href*="/customers/export"]')
      exportLinks.forEach((link) => {
        const el = link as HTMLAnchorElement
        if (!el.dataset.custEnhanced) {
          el.dataset.custEnhanced = "true"
          el.href = "/admin/customers/export-excel"
          el.target = "_blank"
          el.className = "px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          el.innerHTML = "<span>📥</span><span>خروجی اکسل مشتریان (.xlsx)</span>"
          el.onclick = (e) => {
            e.preventDefault()
            e.stopPropagation()
            window.open("/admin/customers/export-excel", "_blank")
          }
        }
      })

      // Align header th for created_at
      const lastTh = table.querySelector("thead tr th:last-child") as HTMLElement
      if (lastTh) {
        lastTh.style.textAlign = "right"
        lastTh.style.direction = "rtl"
      }

      // Update customer rows date & alignment
      const rows = table.querySelectorAll("tbody tr")
      rows.forEach((tr) => {
        const tdList = tr.querySelectorAll("td")
        if (tdList.length < 4) return

        const emailText = tdList[0]?.textContent?.trim()?.toLowerCase() || ""
        const nameText = tdList[1]?.textContent?.trim() || ""

        let info = customersCache[emailText]
        if (!info) {
          const keys = Object.keys(customersCache)
          for (let k = 0; k < keys.length; k++) {
            const c = customersCache[keys[k]]
            const fullName = ((c.first_name || "") + " " + (c.last_name || "")).trim()
            if (c.email?.toLowerCase() === emailText || (nameText && fullName === nameText)) {
              info = c
              break
            }
          }
        }

        const dateTd = tdList[tdList.length - 1] as HTMLElement
        if (dateTd && dateTd.dataset.enhanced !== "true" && info?.shamsi_date) {
          dateTd.dataset.enhanced = "true"
          dateTd.style.textAlign = "right"
          dateTd.style.direction = "rtl"
          dateTd.innerHTML = `
            <div class="flex flex-col text-right dir-rtl items-start" dir="rtl">
              <span class="font-bold text-xs text-ui-fg-base">${info.shamsi_date}</span>
              ${info.shamsi_time ? '<span class="text-[10px] text-ui-fg-muted font-mono mt-0.5">ساعت ' + info.shamsi_time + '</span>' : ''}
            </div>
          `
        } else if (dateTd && dateTd.dataset.enhanced !== "true") {
          dateTd.style.textAlign = "right"
          dateTd.style.direction = "rtl"
          const innerDiv = dateTd.querySelector("div")
          if (innerDiv) {
            innerDiv.style.justifyContent = "flex-start"
            innerDiv.style.textAlign = "right"
          }
        }
      })
    }

    // 5. Enhance Products Table (/app/products)
    const enhanceProductsTable = () => {
      const exportLinks = document.querySelectorAll('a[href*="/products/export"]')
      exportLinks.forEach((link) => {
        const el = link as HTMLAnchorElement
        if (!el.dataset.prodEnhanced) {
          el.dataset.prodEnhanced = "true"
          el.href = "/admin/products/export-excel"
          el.target = "_blank"
          el.className = "px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          el.innerHTML = "<span>📥</span><span>خروجی اکسل پوشاک (.xlsx)</span>"
          el.onclick = (e) => {
            e.preventDefault()
            e.stopPropagation()
            window.open("/admin/products/export-excel", "_blank")
          }
        }
      })
    }

    // 6. Enhance Inventory Table (/app/inventory)
    const enhanceInventoryTable = () => {
      const exportLinks = document.querySelectorAll('a[href*="/inventory/export"]')
      exportLinks.forEach((link) => {
        const el = link as HTMLAnchorElement
        if (!el.dataset.invEnhanced) {
          el.dataset.invEnhanced = "true"
          el.href = "/admin/inventory/export-excel"
          el.target = "_blank"
          el.className = "px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          el.innerHTML = "<span>📥</span><span>خروجی اکسل موجودی انبار (.xlsx)</span>"
          el.onclick = (e) => {
            e.preventDefault()
            e.stopPropagation()
            window.open("/admin/inventory/export-excel", "_blank")
          }
        }
      })
    }

    // 7. Enhance Settings Sidebar: Hide General Items and "عمومی" Header Container
    const enhanceSettingsSidebar = () => {
      const aside = document.querySelector("aside")
      if (!aside) return

      const headers = aside.querySelectorAll("div")
      headers.forEach((div) => {
        const t = div.textContent?.trim()
        if (t === "عمومی" || t === "General") {
          const coll = div.closest("div.py-3") as HTMLElement
          if (coll) coll.style.display = "none"
          const nextDiv = coll?.nextElementSibling as HTMLElement
          if (nextDiv && (nextDiv.tagName === "HR" || nextDiv.querySelector("hr") || nextDiv.classList.contains("px-3"))) {
            nextDiv.style.display = "none"
          }
        }
      })

      const settingLinks = aside.querySelectorAll('a[href*="/settings/"]')
      settingLinks.forEach((a) => {
        const href = (a as HTMLAnchorElement).href || ""
        const isGeneral = [
          "/settings/store",
          "/settings/users",
          "/settings/regions",
          "/settings/tax-regions",
          "/settings/return-reasons",
          "/settings/refund-reasons",
          "/settings/sales-channels",
          "/settings/product-types",
          "/settings/product-tags",
          "/settings/locations"
        ].some(p => href.includes(p))

        if (isGeneral) {
          const li = a.closest("li") || a.closest("div.flex")
          if (li) (li as HTMLElement).style.display = "none"
        }
      })
    }

    // 8. Setup Observers & Periodic Intervals
    loadOrdersInfo()
    loadCustomersInfo()

    const observer = new MutationObserver(() => {
      const path = window.location.pathname
      if (path.includes("/orders")) {
        enhanceOrdersTable()
      }
      if (path.includes("/customers")) {
        enhanceCustomersTable()
      }
      if (path.includes("/products")) {
        enhanceProductsTable()
      }
      if (path.includes("/inventory")) {
        enhanceInventoryTable()
      }
      if (path.includes("/settings")) {
        enhanceSettingsSidebar()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    const timer = setInterval(() => {
      const path = window.location.pathname
      if (path.includes("/orders")) {
        loadOrdersInfo()
      }
      if (path.includes("/customers")) {
        loadCustomersInfo()
      }
      if (path.includes("/products")) {
        enhanceProductsTable()
      }
      if (path.includes("/inventory")) {
        enhanceInventoryTable()
      }
      if (path.includes("/settings")) {
        enhanceSettingsSidebar()
      }
    }, 4000)

    const handleGlobalClick = (e: MouseEvent) => {
      const pop = document.querySelector(".medusa-date-popover")
      if (pop && !pop.contains(e.target as Node) && !(e.target as HTMLElement).closest("#medusa-date-th-trigger")) {
        pop.remove()
      }
    }
    document.addEventListener("click", handleGlobalClick)

    return () => {
      styleEl.remove()
      observer.disconnect()
      clearInterval(timer)
      document.removeEventListener("click", handleGlobalClick)
    }
  }, [])

  return null
}

export const config = defineWidgetConfig({
  zone: "topbar",
})

export default AdminGlobalCleanerWidget
