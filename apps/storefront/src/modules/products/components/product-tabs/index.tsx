"use client"

import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"
import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const DEFAULT_SIZE_GUIDE = [
  { size: "S", chest: "۱۰۲", length: "۶۸", shoulder: "۴۶", sleeve: "۲۱" },
  { size: "M", chest: "۱۰۸", length: "۷۱", shoulder: "۴۹", sleeve: "۲۲" },
  { size: "L", chest: "۱۱۴", length: "۷۴", shoulder: "۵۲", sleeve: "۲۳" },
  { size: "XL", chest: "۱۲۰", length: "۷۷", shoulder: "۵۵", sleeve: "۲۴" },
]

const ProductTabs = ({ product }: ProductTabsProps) => {
  const metadata = (product.metadata as any) || {}
  const specs = metadata.apparel_specs || {
    fabric: "۱۰۰٪ نخ پنبه سوپر کامپکت با کیفیت صادراتی",
    fit: "قواره آزاد و استاندارد (Regular Fit)",
    season: "چهارفصل / بهاره و تابستانه",
    care: "شستشو با آب سرد ۳۰ درجه، بدون استفاده از سفیدکننده",
  }
  const sizeGuide = metadata.size_guide || DEFAULT_SIZE_GUIDE

  const tabs = [
    {
      label: "📏 جدول راهنمای سایز (سانتی‌متر)",
      component: <SizeGuideTab sizeGuide={sizeGuide} />,
    },
    {
      label: "🧵 مشخصات تخصصی پارچه و تن‌خور",
      component: <ApparelSpecsTab specs={specs} product={product} />,
    },
    {
      label: "🚚 شرایط ارسال و تعویض سایز در ایران",
      component: <ShippingInfoTab />,
    },
  ]

  return (
    <div className="w-full text-right dir-rtl mt-6" dir="rtl">
      <Accordion type="multiple">
        {tabs.map((tab, i) => (
          <Accordion.Item
            key={i}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const SizeGuideTab = ({ sizeGuide }: { sizeGuide: any[] }) => {
  return (
    <div className="text-small-regular py-4 text-right" dir="rtl">
      <p className="text-xs text-ui-fg-muted mb-3 leading-relaxed">
        برای انتخاب دقیق‌ترین سایز، یکی از لباس‌های متناسب خود را روی سطح صاف پهن کرده و با جدول زیر مقایسه نمایید:
      </p>
      <div className="overflow-x-auto rounded-xl border border-ui-border-base bg-ui-bg-subtle/50">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted">
              <th className="py-2.5 px-3 font-bold">سایز</th>
              <th className="py-2.5 px-3 font-bold">قد لباس (cm)</th>
              <th className="py-2.5 px-3 font-bold">عرض سینه (cm)</th>
              <th className="py-2.5 px-3 font-bold">عرض سرشانه (cm)</th>
              <th className="py-2.5 px-3 font-bold">قد آستین (cm)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border-base/50">
            {sizeGuide.map((row: any, idx: number) => (
              <tr key={idx} className="hover:bg-ui-bg-base/80 transition-colors">
                <td className="py-2.5 px-3 font-black text-ui-fg-base">{row.size}</td>
                <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">{row.length} cm</td>
                <td className="py-2.5 px-3 font-medium text-ui-fg-base">{row.chest} cm</td>
                <td className="py-2.5 px-3 font-medium text-ui-fg-base">{row.shoulder} cm</td>
                <td className="py-2.5 px-3 font-medium text-ui-fg-base">{row.sleeve} cm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ui-fg-muted mt-2">
        * تلرانس استاندارد دوخت پوشاک ۱ الی ۲ سانتی‌متر می‌باشد.
      </p>
    </div>
  )
}

const ApparelSpecsTab = ({ specs, product }: { specs: any; product: HttpTypes.StoreProduct }) => {
  return (
    <div className="text-small-regular py-4 text-right" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-ui-bg-subtle border border-ui-border-base">
          <span className="text-[11px] font-bold text-ui-fg-muted block mb-1">جنس و بافت پارچه:</span>
          <p className="font-bold text-xs text-ui-fg-base">{specs.fabric}</p>
        </div>
        <div className="p-3 rounded-xl bg-ui-bg-subtle border border-ui-border-base">
          <span className="text-[11px] font-bold text-ui-fg-muted block mb-1">قواره و تن‌خور (Fit):</span>
          <p className="font-bold text-xs text-ui-fg-base">{specs.fit}</p>
        </div>
        <div className="p-3 rounded-xl bg-ui-bg-subtle border border-ui-border-base">
          <span className="text-[11px] font-bold text-ui-fg-muted block mb-1">فصل مناسب:</span>
          <p className="font-bold text-xs text-ui-fg-base">{specs.season}</p>
        </div>
        <div className="p-3 rounded-xl bg-ui-bg-subtle border border-ui-border-base">
          <span className="text-[11px] font-bold text-ui-fg-muted block mb-1">دستورالعمل شستشو:</span>
          <p className="font-bold text-xs text-ui-fg-base">{specs.care}</p>
        </div>
      </div>
      {product.weight && (
        <div className="mt-3 text-xs text-ui-fg-muted">
          وزن تقریبی بسته مرسوله: <strong>{product.weight} گرم</strong>
        </div>
      )}
    </div>
  )
}

const ShippingInfoTab = () => {
  return (
    <div className="text-small-regular py-4 text-right" dir="rtl">
      <div className="grid grid-cols-1 gap-y-4">
        <div className="flex items-start gap-x-3 p-3 rounded-xl bg-ui-bg-subtle border border-ui-border-base">
          <div className="text-emerald-600 dark:text-emerald-400 mt-0.5">
            <FastDelivery />
          </div>
          <div>
            <span className="font-bold text-xs text-ui-fg-base block mb-0.5">ارسال سریع به سراسر ایران</span>
            <p className="text-xs text-ui-fg-subtle leading-relaxed">
              ارسال با پست پیشتاز و تیپاکس به تمام شهرها و روستاهای کشور در ۲ الی ۳ روز کاری، و ارسال فوری با پیک در همان روز برای مراکز استان.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-x-3 p-3 rounded-xl bg-ui-bg-subtle border border-ui-border-base">
          <div className="text-blue-600 dark:text-blue-400 mt-0.5">
            <Refresh />
          </div>
          <div>
            <span className="font-bold text-xs text-ui-fg-base block mb-0.5">ضمانت تعویض سایز و مرجوعی</span>
            <p className="text-xs text-ui-fg-subtle leading-relaxed">
              در صورتی که سایز لباس برای شما مناسب نبود، تا ۴۸ ساعت پس از تحویل امکان تعویض سریع با سایز دلخواه شما فراهم است.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
