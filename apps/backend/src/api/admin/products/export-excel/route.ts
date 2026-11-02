import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import ExcelJS from "exceljs"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const prodRes = await pgConnection.raw(`
      SELECT 
        p.id,
        p.title,
        p.subtitle,
        p.description,
        p.status,
        p.thumbnail,
        COALESCE(NULLIF(p.metadata->>'cost_price', ''), '0')::numeric as cost_price,
        STRING_AGG(DISTINCT pc.name, '، ') as categories,
        COUNT(DISTINCT pv.id)::int as variants_count,
        COALESCE(MIN(pr.amount), 0)::numeric as min_price,
        COALESCE(MAX(pr.amount), 0)::numeric as max_price,
        COALESCE(SUM(il.stocked_quantity), 0)::int as total_stock,
        p.created_at
      FROM product p
      LEFT JOIN product_category_product pcp ON pcp.product_id = p.id
      LEFT JOIN product_category pc ON pc.id = pcp.product_category_id
      LEFT JOIN product_variant pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
      LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
      LEFT JOIN price pr ON pr.price_set_id = pvps.price_set_id AND pr.currency_code = 'irt'
      LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
      LEFT JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
      WHERE p.deleted_at IS NULL
      GROUP BY p.id
      ORDER BY p.created_at DESC
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

    const sheet = workbook.addWorksheet("کاتالوگ محصولات و پوشاک", {
      views: [{ rightToLeft: true }]
    })

    sheet.columns = [
      { header: "ردیف", key: "row", width: 8 },
      { header: "شناسه کالا", key: "id", width: 22 },
      { header: "عنوان لباس / محصول", key: "title", width: 32 },
      { header: "دسته‌بندی", key: "categories", width: 22 },
      { header: "تعداد تنوع (سایز/رنگ)", key: "variants_count", width: 18 },
      { header: "موجودی کل انبار", key: "total_stock", width: 16 },
      { header: "قیمت فروش (تومان)", key: "price", width: 20 },
      { header: "بهای تمام‌شده / COGS (تومان)", key: "cost_price", width: 24 },
      { header: "وضعیت کالا", key: "status", width: 14 },
      { header: "تاریخ ثبت شمسی", key: "date", width: 16 },
    ]

    const headerRow = sheet.getRow(1)
    headerRow.height = 28
    headerRow.eachCell((cell) => {
      cell.font = { name: "Tahoma", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D9488" } } // Teal / Emerald
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } }
      }
    })

    prodRes.rows.forEach((p: any, idx: number) => {
      const d = new Date(p.created_at)
      const priceDisplay = Number(p.min_price) === Number(p.max_price)
        ? Number(p.min_price)
        : Number(p.min_price)

      const statusMap: Record<string, string> = {
        published: "منتشر شده",
        draft: "پیش‌نویس",
        proposed: "پیشنهادی",
        rejected: "رد شده"
      }

      const row = sheet.addRow({
        row: idx + 1,
        id: p.id,
        title: p.title,
        categories: p.categories || "دسته‌بندی نشده",
        variants_count: Number(p.variants_count || 0),
        total_stock: Number(p.total_stock || 0),
        price: Math.round(Number(priceDisplay || 0)),
        cost_price: Math.round(Number(p.cost_price || 0)),
        status: statusMap[p.status] || p.status || "منتشر شده",
        date: shamsiFormatter.format(d),
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

      const idCell = row.getCell("id")
      idCell.value = String(p.id)
      idCell.numFmt = "@"

      const priceCell = row.getCell("price")
      priceCell.numFmt = "#,##0"

      const costCell = row.getCell("cost_price")
      costCell.numFmt = "#,##0"
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `medusa-products-${dateStr}.xlsx`

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.status(200).send(Buffer.from(buffer))
  } catch (err: any) {
    console.error("EXPORT PRODUCTS ERROR:", err)
    res.status(500).json({ message: err.message, stack: err.stack })
  }
}
