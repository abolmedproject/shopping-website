import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import path from "path"
import fs from "fs/promises"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { filename = "image.png", base64 } = req.body as { filename?: string; base64?: string }

    if (!base64) {
      return res.status(400).json({ message: "داده‌های تصویر ارسال نشده است." })
    }

    // Strip data URL header if present (e.g. data:image/jpeg;base64,...)
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    const cleanBase64 = matches ? matches[2] : base64
    const buffer = Buffer.from(cleanBase64, "base64")

    const ext = path.extname(filename) || ".png"
    const safeName = "img_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8) + ext
    const uploadDir = path.resolve(process.cwd(), "uploads")
    await fs.mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, safeName)
    await fs.writeFile(filePath, buffer)

    const host = req.get("host") || "localhost:9000"
    const protocol = req.protocol || "http"
    const fileUrl = `${protocol}://${host}/uploads/${safeName}`

    res.status(201).json({
      message: "تصویر با موفقیت در سرور محلی ذخیره شد.",
      filename: safeName,
      url: fileUrl,
      size: buffer.length
    })
  } catch (err: any) {
    res.status(500).json({ message: "خطا در ذخیره‌سازی فایل: " + err.message })
  }
}
