import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import path from "path"
import fs from "fs"

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { filename } = req.params
  const safeFilename = path.basename(filename)
  const filePath = path.resolve(process.cwd(), "uploads", safeFilename)

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("تصویر یافت نشد.")
  }

  const ext = path.extname(safeFilename).toLowerCase()
  const contentType = MIME_TYPES[ext] || "application/octet-stream"

  res.setHeader("Content-Type", contentType)
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
  const stream = fs.createReadStream(filePath)
  stream.pipe(res)
}
