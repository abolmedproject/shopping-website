import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const result = await pgConnection.raw(`
      SELECT 
        c.id,
        c.email,
        c.phone,
        c.first_name,
        c.last_name,
        c.created_at
      FROM customer c
      WHERE c.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `)

    const shamsiDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const shamsiTimeFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit'
    })

    const mapping: Record<string, any> = {}

    for (const row of result.rows) {
      const d = new Date(row.created_at)
      const dateStr = shamsiDateFormatter.format(d)
      const timeStr = shamsiTimeFormatter.format(d)

      const item = {
        id: row.id,
        email: row.email,
        phone: row.phone,
        shamsi_date: dateStr,
        shamsi_time: timeStr,
        shamsi_full: `${dateStr} ساعت ${timeStr}`
      }

      mapping[row.id] = item
      if (row.email) mapping[row.email.toLowerCase()] = item
    }

    return res.json({
      success: true,
      count: result.rows.length,
      customers: mapping
    })
  } catch (error: any) {
    console.error("CUSTOMER SUMMARY ERROR:", error)
    return res.status(500).json({ message: error.message, customers: {} })
  }
}
