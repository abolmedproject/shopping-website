"use client"

import React, { useMemo } from "react"
import { IRAN_PROVINCES } from "@lib/data/iran-locations"
import NativeSelect from "@modules/common/components/native-select"

type IranLocationSelectProps = {
  provinceName: string
  cityName: string
  selectedProvince?: string
  selectedCity?: string
  onLocationChange: (field: string, value: string) => void
}

export const IranLocationSelect: React.FC<IranLocationSelectProps> = ({
  provinceName,
  cityName,
  selectedProvince = "",
  selectedCity = "",
  onLocationChange,
}) => {
  const currentProvinceData = useMemo(() => {
    return IRAN_PROVINCES.find((p) => p.name === selectedProvince)
  }, [selectedProvince])

  const availableCities = useMemo(() => {
    return currentProvinceData?.cities || []
  }, [currentProvinceData])

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prov = e.target.value
    onLocationChange(provinceName, prov)
    // Automatically select the center/first city of this province if available
    const pData = IRAN_PROVINCES.find((p) => p.name === prov)
    if (pData?.cities?.length) {
      onLocationChange(cityName, pData.cities[0])
    } else {
      onLocationChange(cityName, "")
    }
  }

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLocationChange(cityName, e.target.value)
  }

  return (
    <>
      <div className="flex flex-col gap-1 text-right" dir="rtl">
        <label className="text-xs font-bold text-ui-fg-subtle mb-1">
          استان (Province) *
        </label>
        <NativeSelect
          name={provinceName}
          value={selectedProvince}
          onChange={handleProvinceChange}
          placeholder="انتخاب استان..."
          required
        >
          {IRAN_PROVINCES.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1 text-right" dir="rtl">
        <label className="text-xs font-bold text-ui-fg-subtle mb-1">
          شهر / شهرستان (City) *
        </label>
        <NativeSelect
          name={cityName}
          value={selectedCity}
          onChange={handleCityChange}
          placeholder={selectedProvince ? "انتخاب شهر..." : "ابتدا استان را انتخاب کنید"}
          disabled={!selectedProvince}
          required
        >
          {availableCities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </NativeSelect>
      </div>
    </>
  )
}

export default IranLocationSelect
