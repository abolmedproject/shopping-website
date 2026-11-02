import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import ExcelJS from "exceljs"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const invRes = await pgConnection.raw(`
      SELECT 
        ii.id as inventory_item_id,
        ii.sku,
        ii.title as item_title,
        p.title as product_title,
        pv.title as variant_title,
        COALESCE(pr.amount, 0)::numeric as price,
        COALESCE(NULLIF(p.metadata->>'cost_price', ''), '0')::numeric as cost_price,
        COALESCE(il.stocked_quantity, 0)::int as stocked_quantity,
        COALESCE(il.reserved_quantity, 0)::int as reserved_quantity,
        COALESCE(il.stocked_quantity - il.reserved_quantity, 0)::int as available_quantity,
        sl.name as location_name,
        ii.created_at
      FROM inventory_item ii
      LEFT JOIN product_variant_inventory_item pvii ON pvii.inventory_item_id = ii.id
      LEFT JOIN product_variant pv ON pv.id = pvii.variant_id
      LEFT JOIN product p ON p.id = pv.product_id
      LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
      LEFT JOIN price pr ON pr.price_set_id = pvps.price_set_id AND pr.currency_code = 'irt'
      LEFT JOIN inventory_level il ON il.inventory_item_id = ii.id
      LEFT JOIN stock_location sl ON sl.id = il.location_id
      WHERE ii.deleted_at IS NULL
      ORDER BY COALESCE(il.stocked_quantity, 0) ASC, p.title ASC
    `)

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "مدوسا - سامانه مدیریت فروشگاه پوشاک"
    workbook.lastModifiedBy = "مدیریت فروشگاه"
    workbook.created = new Date()
    workbook.modified = new Date()

    const sheet = workbook.addWorksheet("موجودی انبار مرکزی پوشاک", {
      views: [{ rightToLeft: true }]
    })

    sheet.columns = [
      { header: "ردیف", key: "row", width: 8 },
      { header: "کد کالا (SKU)", key: "sku", width: 22 },
      { header: "عنوان لباس", key: "product_title", width: 32 },
      { header: "سایز و رنگ (تنوع)", key: "variant_title", width: 22 },
      { header: "موجودی کل", key: "stocked_quantity", width: 14 },
      { header: "رزرو شده", key: "reserved_quantity", width: 14 },
      { header: "قابل فروش", key: "available_quantity", width: 14 },
      { header: "قیمت فروش (تومان)", key: "price", width: 20 },
      { header: "بهای تمام‌شده (تومان)", key: "cost_price", width: 22 },
      { header: "انبار فیزیکی", key: "location", width: 20 },
    ]

    const headerRow = sheet.getRow(1)
    headerRow.height = 28
    headerRow.eachCell((cell) => {
      cell.font = { name: "Tahoma", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } } // Deep Blue
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } }
      }
    })

    invRes.rows.forEach((it: any, idx: number) => {
      const row = sheet.addRow({
        row: idx + 1,
        sku: String(it.sku || it.inventory_item_id || "—"),
        product_title: it.product_title || it.item_title || "پوشاک",
        variant_title: it.variant_title || it.item_title || "تک‌سایز",
        stocked_quantity: Number(it.stocked_quantity || 0),
        reserved_quantity: Number(it.reserved_quantity || 0),
        available_quantity: Number(it.available_quantity || 0),
        price: Math.round(Number(it.price || 0)),
        cost_price: Math.round(Number(it.cost_price || 0)),
        location: it.location_name || "انبار مرکزی تهران",
      })

      row.height = 24
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Tahoma", size: 9.5 }
        cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } }

        if (colNumber === 3 || colNumber === 4) {
          cell.alignment = { vertical: "middle", horizontal: "right" }
        } else {
          cell.alignment = { vertical: "middle", horizontal: "center" }
        }
      })

      const skuCell = row.getCell("sku")
      skuCell.numFmt = "@"

      const priceCell = row.getCell("price")
      priceCell.numFmt = "#,##0"

      const costCell = row.getCell("cost_price")
      costCell.numFmt = "#,##0"
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `medusa-inventory-${dateStr}.xlsx`

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.status(200).send(Buffer.from(buffer))
  } catch (err: any) {
    console.error("EXPORT INVENTORY ERROR:", err)
    res.status(500).json({ message: err.message, stack: err.stack })
  }
}
