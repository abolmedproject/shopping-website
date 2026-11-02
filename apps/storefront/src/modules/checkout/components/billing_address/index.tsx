import { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import React, { useState } from "react"
import CountrySelect from "../country-select"
import IranLocationSelect from "../iran-location-select"

const BillingAddress = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    "billing_address.first_name": cart?.billing_address?.first_name || "",
    "billing_address.last_name": cart?.billing_address?.last_name || "",
    "billing_address.address_1": cart?.billing_address?.address_1 || "",
    "billing_address.company": cart?.billing_address?.company || "",
    "billing_address.postal_code": cart?.billing_address?.postal_code || "",
    "billing_address.city": cart?.billing_address?.city || "",
    "billing_address.country_code": cart?.billing_address?.country_code || "ir",
    "billing_address.province": cart?.billing_address?.province || "",
    "billing_address.phone": cart?.billing_address?.phone || "",
  })

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleLocationChange = (field: string, value: string) => {
    setFormData((prevState) => ({
      ...prevState,
      [field]: value,
    }))
  }

  return (
    <div className="grid grid-cols-2 gap-4 text-right" dir="rtl">
      <Input
        label="نام (First name) *"
        name="billing_address.first_name"
        autoComplete="given-name"
        value={formData["billing_address.first_name"]}
        onChange={handleChange}
        required
        data-testid="billing-first-name-input"
      />
      <Input
        label="نام خانوادگی (Last name) *"
        name="billing_address.last_name"
        autoComplete="family-name"
        value={formData["billing_address.last_name"]}
        onChange={handleChange}
        required
        data-testid="billing-last-name-input"
      />

      <IranLocationSelect
        provinceName="billing_address.province"
        cityName="billing_address.city"
        selectedProvince={formData["billing_address.province"]}
        selectedCity={formData["billing_address.city"]}
        onLocationChange={handleLocationChange}
      />

      <div className="col-span-2">
        <Input
          label="نشانی پستی دقیق فاکتور *"
          name="billing_address.address_1"
          autoComplete="address-line1"
          value={formData["billing_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="billing-address-input"
        />
      </div>

      <Input
        label="کد پستی ۱۰ رقمی *"
        name="billing_address.postal_code"
        autoComplete="postal-code"
        value={formData["billing_address.postal_code"]}
        onChange={handleChange}
        required
        data-testid="billing-postal-code-input"
      />
      <CountrySelect
        name="billing_address.country_code"
        autoComplete="country"
        region={cart?.region}
        value={formData["billing_address.country_code"]}
        onChange={handleChange}
        required
        data-testid="billing-country-select"
      />
      <div className="col-span-2">
        <Input
          label="شماره تماس جهت صدور فاکتور *"
          name="billing_address.phone"
          autoComplete="tel"
          value={formData["billing_address.phone"]}
          onChange={handleChange}
          data-testid="billing-phone-input"
        />
      </div>
    </div>
  )
}

export default BillingAddress
