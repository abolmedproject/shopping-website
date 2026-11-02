import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import ExcelJS from "exceljs"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const customersRes = await pgConnection.raw(`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.has_account,
        c.created_at,
        COUNT(DISTINCT o.id)::int as orders_count,
        COALESCE(SUM((os.totals->>'accounting_total')::numeric), 0)::numeric as total_spend,
        MAX(oa.province) as province,
        MAX(oa.city) as city,
        MAX(oa.address_1) as address_1,
        MAX(oa.postal_code) as postal_code
      FROM customer c
      LEFT JOIN public."order" o ON o.customer_id = c.id AND o.deleted_at IS NULL AND o.status != 'canceled'
      LEFT JOIN order_summary os ON os.order_id = o.id
      LEFT JOIN order_address oa ON o.shipping_address_id = oa.id
      WHERE c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `)

    const shamsiFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "مدوسا - سامانه مدیریت فروشگاه پوشاک"
    workbook.lastModifiedBy = "مدیریت فروشگاه"
    workbook.created = new Date()
    workbook.modified = new Date()

    const sheet = workbook.addWorksheet("لیست مشتریان فروشگاه", {
      views: [{ rightToLeft: true }]
    })

    sheet.columns = [
      { header: "ردیف", key: "row", width: 8 },
      { header: "نام و نام خانوادگی", key: "name", width: 24 },
      { header: "شماره موبایل", key: "phone", width: 16 },
      { header: "پست الکترونیک (ایمیل)", key: "email", width: 30 },
      { header: "استان", key: "province", width: 16 },
      { header: "شهر", key: "city", width: 16 },
      { header: "نشانی کامل پستی", key: "address", width: 45 },
      { header: "کد پستی ۱۰ رقمی", key: "postal_code", width: 16 },
      { header: "تعداد سفارشات", key: "orders_count", width: 14 },
      { header: "مجموع خرید (تومان)", key: "total_spend", width: 20 },
      { header: "تاریخ عضویت شمسی", key: "date", width: 18 },
      { header: "وضعیت حساب", key: "account_status", width: 16 },
    ]

    // Style Header Row (Purple / Emerald Header)
    const headerRow = sheet.getRow(1)
    headerRow.height = 28
    headerRow.eachCell((cell) => {
      cell.font = { name: "Tahoma", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } } // Elegant Purple
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } }
      }
    })

    customersRes.rows.forEach((c: any, idx: number) => {
      const d = new Date(c.created_at)
      const phoneStr = String(c.phone || "").trim()
      const postalStr = String(c.postal_code || "").trim()
      const fullName = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "خریدار ثبت‌شده"

      const row = sheet.addRow({
        row: idx + 1,
        name: fullName,
        phone: phoneStr,
        email: c.email || "—",
        province: c.province || "تهران",
        city: c.city || "تهران",
        address: c.address_1 || "—",
        postal_code: postalStr,
        orders_count: Number(c.orders_count || 0),
        total_spend: Math.round(Number(c.total_spend || 0)),
        date: shamsiFormatter.format(d),
        account_status: c.has_account ? "عضو رسمی" : "خریدار مهمان",
      })

      row.height = 24
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Tahoma", size: 9.5 }
        cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } }

        if (colNumber === 2 || colNumber === 4 || colNumber === 7) {
          cell.alignment = { vertical: "middle", horizontal: "right" }
        } else {
          cell.alignment = { vertical: "middle", horizontal: "center" }
        }
      })

      const phoneCell = row.getCell("phone")
      phoneCell.value = phoneStr
      phoneCell.numFmt = "@"

      const postalCell = row.getCell("postal_code")
      postalCell.value = postalStr
      postalCell.numFmt = "@"

      const totalCell = row.getCell("total_spend")
      totalCell.numFmt = "#,##0"
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `medusa-customers-${dateStr}.xlsx`

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.status(200).send(Buffer.from(buffer))
  } catch (err: any) {
    console.error("EXPORT CUSTOMERS ERROR:", err)
    res.status(500).json({ message: err.message, stack: err.stack })
  }
}
