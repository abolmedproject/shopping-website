import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import ExcelJS from "exceljs"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const isProcessedOnly = req.query.processed === "true" || req.query.processed_only === "true"

    let whereClause = "WHERE o.deleted_at IS NULL AND o.status != 'canceled'"
    if (isProcessedOnly) {
      whereClause += " AND ((o.metadata->>'is_processed')::boolean = true OR (o.metadata->'iranian_order'->>'postal_tracking_code') IS NOT NULL)"
    }

    const fromParam = req.query.from as string
    const toParam = req.query.to as string
    if (fromParam && toParam) {
      whereClause += ` AND o.created_at >= '${fromParam.replace(/'/g, "")}' AND o.created_at <= '${toParam.replace(/'/g, "")}'`
    }

    // Fetch orders with shipping address, line items, and iranian order metadata
    const ordersRes = await pgConnection.raw(`
      SELECT 
        o.id as order_id,
        o.display_id,
        o.status,
        COALESCE(os.totals->>'accounting_total', '0')::numeric as total,
        oa.first_name,
        oa.last_name,
        oa.phone,
        oa.province,
        oa.city,
        oa.address_1,
        oa.postal_code,
        o.metadata->'iranian_order'->>'order_source' as order_source,
        o.metadata->'iranian_order'->>'source_title' as source_title,
        o.metadata->'iranian_order'->>'postal_carrier' as carrier,
        o.metadata->'iranian_order'->>'postal_tracking_code' as tracking_code,
        o.metadata->'iranian_order'->>'fulfillment_status_fa' as fulfillment_status_fa,
        o.created_at,
        COALESCE(items_data.items_desc, 'پوشاک و البسه') as items_desc,
        COALESCE(items_data.total_weight, 400)::int as total_weight
      FROM public."order" o
      LEFT JOIN order_address oa ON oa.id = o.shipping_address_id
      LEFT JOIN order_summary os ON os.order_id = o.id
      LEFT JOIN (
        SELECT 
          oi.order_id,
          STRING_AGG(CONCAT(oli.title, ' (', COALESCE(oli.variant_title, ''), ' × ', oi.quantity, ')'), ' + ') as items_desc,
          SUM(oi.quantity * COALESCE(p.weight, 400)) as total_weight
        FROM order_item oi
        JOIN order_line_item oli ON oli.id = oi.item_id
        LEFT JOIN product p ON p.id = oli.product_id
        GROUP BY oi.order_id
      ) items_data ON items_data.order_id = o.id
      ${whereClause}
      ORDER BY o.display_id DESC
    `)

    const shamsiFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "مدوسا - سامانه مدیریت فروشگاه پوشاک"
    workbook.lastModifiedBy = "مدیریت فروشگاه"
    workbook.created = new Date()
    workbook.modified = new Date()

    const sheetTitle = isProcessedOnly ? "مرسولات پستی پردازش‌شده" : "مرسولات پستی ایران"

    // Native Right-To-Left Worksheet for Persian
    const sheet = workbook.addWorksheet(sheetTitle, {
      views: [{ rightToLeft: true }]
    })

    sheet.columns = [
      { header: "ردیف", key: "row", width: 8 },
      { header: "شماره سفارش", key: "order_id", width: 16 },
      { header: "تاریخ ثبت شمسی", key: "date", width: 16 },
      { header: "نام و نام خانوادگی خریدار", key: "customer_name", width: 24 },
      { header: "شماره موبایل", key: "phone", width: 16 },
      { header: "استان مقصد", key: "province", width: 16 },
      { header: "شهر مقصد", key: "city", width: 16 },
      { header: "نشانی پستی دقیق", key: "address", width: 45 },
      { header: "کد پستی ۱۰ رقمی", key: "postal_code", width: 16 },
      { header: "روش ارسال", key: "carrier", width: 18 },
      { header: "شرح محتوای مرسوله", key: "items", width: 35 },
      { header: "وزن (گرم)", key: "weight", width: 12 },
      { header: "مبلغ فاکتور (تومان)", key: "total", width: 18 },
      { header: "کد رهگیری پستی", key: "tracking", width: 24 },
      { header: "منبع سفارش", key: "source", width: 20 },
    ]

    // Style Header Row (Emerald Green with White Bold Text)
    const headerRow = sheet.getRow(1)
    headerRow.height = 28
    headerRow.eachCell((cell) => {
      cell.font = { name: "Tahoma", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isProcessedOnly ? "FF059669" : "FF2563EB" } }
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } }
      }
    })

    // Add Data Rows with explicit String types for Phone & Postal Code
    ordersRes.rows.forEach((o: any, idx: number) => {
      const d = new Date(o.created_at)
      const phoneStr = String(o.phone || "").trim()
      const postalStr = String(o.postal_code || "").trim()
      const customerName = `${o.first_name || ""} ${o.last_name || ""}`.trim() || "مشتری فروشگاه"

      const row = sheet.addRow({
        row: idx + 1,
        order_id: `MEDUSA-#${o.display_id}`,
        date: shamsiFormatter.format(d),
        customer_name: customerName,
        phone: phoneStr,
        province: o.province || "تهران",
        city: o.city || "تهران",
        address: o.address_1 || "—",
        postal_code: postalStr,
        carrier: o.carrier || "پست پیشتاز",
        items: o.items_desc || "پوشاک",
        weight: Number(o.total_weight || 400),
        total: Math.round(Number(o.total || 0)),
        tracking: o.tracking_code || "-",
        source: o.source_title || "فروشگاه آنلاین"
      })

      row.height = 24
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Tahoma", size: 9.5 }
        cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } }

        if (colNumber === 4 || colNumber === 8 || colNumber === 11) {
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

      const totalCell = row.getCell("total")
      totalCell.numFmt = "#,##0"
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = isProcessedOnly 
      ? `iran-postal-processed-orders-${dateStr}.xlsx` 
      : `iran-postal-orders-${dateStr}.xlsx`

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.status(200).send(Buffer.from(buffer))
  } catch (err: any) {
    console.error("EXPORT POSTAL ERROR:", err)
    res.status(500).json({ message: err.message, stack: err.stack })
  }
}
