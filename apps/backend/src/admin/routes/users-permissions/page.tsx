
const getActivityIcon = (targetType?: string, actionType?: string) => {
  if (targetType === "category") return "📁"
  if (targetType === "order" || actionType?.includes("order")) return "📦"
  if (targetType === "product") return "👕"
  if (targetType === "inventory") return "🏭"
  if (targetType === "customer") return "👥"
  if (targetType === "campaign") return "📢"
  if (targetType === "user" || actionType?.includes("user")) return "👤"
  return "⚡"
}
"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ShieldCheck,
  User,
  Key,
  CheckCircle,
  ExclamationCircle,
  ArrowUpRightOnBox
} from "../../components/icons"
import { Button, Heading, Text, clx } from "@medusajs/ui"
import { useEffect, useState } from "react"

export const config = defineRouteConfig({
  label: "کاربران و دسترسی‌ها (RBAC)",
  icon: ShieldCheck,
  rank: 2,
})

const CATEGORIZED_PERMISSIONS = [
  {
    category: "📦 محصولات، لباس‌ها و کاتالوگ",
    permissions: [
      { id: "products.view", label: "مشاهده کاتالوگ لباس‌ها و تنوع‌ها", desc: "دسترسی خواندن محصولات، تصاویر و دسته‌بندی‌ها" },
      { id: "products.manage", label: "ایجاد و ویرایش مشخصات و تنوع‌ها", desc: "افزودن لباس جدید، تغییر عکس‌ها، سایزها و رنگ‌ها" },
      { id: "products.price", label: "تغییر و ویرایش قیمت‌های تومانی", desc: "دسترسی حساس به قیمت‌گذاری محصولات و تخفیف‌ها", is_sensitive: true },
      { id: "products.sku", label: "تولید خودکار شناسه کالا (SKU) و بارکد", desc: "تولید کد انبار استاندارد بر اساس مشخصات لباس" },
      { id: "products.delete", label: "حذف محصولات از فروشگاه", desc: "مجوز حذف دائمی اقلام از کاتالوگ", is_sensitive: true }
    ]
  },
  {
    category: "🏢 انبارداری و کنترل موجودی",
    permissions: [
      { id: "inventory.view", label: "مشاهده موجودی انبار مرکزی و تنوع‌ها", desc: "بررسی مقادیر فیزیکی، رزرو شده و کالاهای کم‌موجود" },
      { id: "inventory.manage", label: "مدیریت و اصلاح موجودی انبار", desc: "تغییر موجودی تنوع‌ها در انبار مرکزی تهران" }
    ]
  },
  {
    category: "🛍️ سفارشات، فاکتور و ارسال",
    permissions: [
      { id: "orders.view", label: "مشاهده لیست و جزئیات سفارش‌ها", desc: "مشاهده فاکتورها، اقلام سفارش و وضعیت" },
      { id: "orders.manage", label: "پردازش و تغییر وضعیت ارسال", desc: "بسته‌بندی، ثبت کد رهگیری پستی و ارسال" },
      { id: "orders.create", label: "ثبت سریع سفارش پوشاک (دایرکت / تلفنی)", desc: "دسترسی به فرم ثبت سفارشات کارت‌به‌کارت و دایرکت" },
      { id: "orders.exchange", label: "ثبت تعویض سایز تک‌مرحله‌ای پوشاک", desc: "امکان تغییر سایز لباس و اصلاح خودکار انبار" },
      { id: "orders.export", label: "دریافت فایل اکسل مرسولات پستی (XLSX)", desc: "دانلود لیست نشانی‌ها و بارنامه‌ها برای باجه پست" },
      { id: "orders.refund", label: "صدور بازپرداخت و مرجوعی وجه", desc: "لغو سفارش و عودت وجه به مشتری", is_sensitive: true }
    ]
  },
  {
    category: "👥 مشتریان و خریداران",
    permissions: [
      { id: "customers.view", label: "مشاهده مشخصات و آدرس مشتریان", desc: "دیدن نام، شماره تلفن و آدرس پستی جهت ارسال" },
      { id: "customers.manage", label: "ویرایش پروفایل و گروه‌بندی مشتریان", desc: "تغییر اطلاعات یا افزودن مشتری به گروه VIP" }
    ]
  },
  {
    category: "📊 آمار، سود و امور مالی",
    permissions: [
      { id: "analytics.view", label: "مشاهده داشبورد تحلیل فروش و عملکرد", desc: "مشاهده نمودارها، اقلام پرفروش، سایزها و رنگ‌ها" },
      { id: "analytics.financial", label: "مشاهده گزارش‌های حساس درآمد و سود", desc: "دسترسی به مبالغ کل فروش، درآمد خالص و سود (COGS)", is_sensitive: true }
    ]
  },
  {
    category: "🎯 تبلیغات، اینفلوئنسرها و کمپین‌ها",
    permissions: [
      { id: "campaigns.view", label: "مشاهده گزارش‌های بازگشت سرمایه تبلیغات (ROAS)", desc: "بررسی سودآوری و نرخ بازگشت بلاگرها" },
      { id: "campaigns.manage", label: "ثبت و مدیریت کمپین تبلیغاتی بلاگرها", desc: "تعریف هزینه تبلیغات و بلاگرهای اینستاگرام" },
      { id: "promotions.manage", label: "ایجاد و مدیریت کدهای تخفیف", desc: "ساخت کوپن‌های جشنواره و درصد تخفیف" }
    ]
  },
  {
    category: "🛡️ امنیت و مدیریت همکاران",
    permissions: [
      { id: "users.view", label: "مشاهده اعضای تیم و نقش‌ها", desc: "دیدن همکاران فعال در پنل مدیریت" },
      { id: "users.invite", label: "دعوت همکار جدید به پنل", desc: "ارسال دعوت و ایجاد دسترسی", is_sensitive: true },
      { id: "users.manage", label: "تعلیق و ویرایش وضعیت همکاران", desc: "غیرفعال‌سازی یا تغییر نقش کارمندان", is_sensitive: true },
      { id: "roles.configure", label: "مدیریت دسترسی‌ها و اختیارات امنیتی (مخصوص مالک)", desc: "تنظیم حاکمیت و تعیین مجوزهای سیستم", is_sensitive: true }
    ]
  }
]

const formatShamsiDate = (dateStr: string | Date | undefined) => {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d)
  } catch {
    return String(dateStr)
  }
}

const UsersPermissionsPage = () => {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showActivityDrawer, setShowActivityDrawer] = useState(false)
  const [showEditInfoModal, setShowEditInfoModal] = useState(false)

  // Real Activities State
  const [userActivities, setUserActivities] = useState<any[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)

  // Selected User
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null)

  // Permissions Form
  const [editPermissions, setEditPermissions] = useState<string[]>([])

  // Edit User Info Form
  const [editInfoForm, setEditInfoForm] = useState({
    first_name: "",
    last_name: "",
    role: "staff",
    preset: ""
  })

  // Comprehensive Invite Form
  const [inviteForm, setInviteForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "staff",
    preset: "product_specialist",
    custom_permissions: [] as string[]
  })
  const [showGranularInInvite, setShowGranularInInvite] = useState(false)

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setAccessDenied(null)
      setError(null)

      if (typeof window !== "undefined" && (window as any).__sdk?.client) {
        try {
          const sdkData = await (window as any).__sdk.client.fetch("/admin/rbac/users")
          if (sdkData.caller_role !== "owner" && !sdkData.caller_permissions?.includes("users.view") && !sdkData.caller_permissions?.includes("*")) {
            setAccessDenied("شما مجوز مشاهده اعضای تیم و کاربران پنل مدیریت را ندارید.")
            setIsLoading(false)
            return
          }
          setData(sdkData)
          setIsLoading(false)
          return
        } catch (err: any) {
          if (err.status === 403) {
            setAccessDenied("شما مجوز مشاهده اعضای تیم و کاربران پنل مدیریت را ندارید.")
            setIsLoading(false)
            return
          }
        }
      }

      const res = await fetch("/admin/rbac/users", { credentials: "include" })
      if (res.status === 403) {
        setAccessDenied("شما مجوز مشاهده اعضای تیم و کاربران پنل مدیریت را ندارید.")
        setIsLoading(false)
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.message || "خطا در بارگذاری اطلاعات کاربران.")
      }

      const json = await res.json()
      // Guard against client cache or missing view permission
      if (json.caller_role !== "owner" && !json.caller_permissions?.includes("users.view") && !json.caller_permissions?.includes("*")) {
        setAccessDenied("شما مجوز مشاهده اعضای تیم و کاربران پنل مدیریت را ندارید.")
      } else {
        setData(json)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Action Menu Helpers
  const handleOpenPermissions = (user: any) => {
    setSelectedUser(user)
    setEditPermissions(user.permissions || [])
    setShowPermissionsModal(true)
    setActiveMenuUserId(null)
  }

  const handleOpenActivity = async (user: any) => {
    setSelectedUser(user)
    setShowActivityDrawer(true)
    setActiveMenuUserId(null)
    setIsLoadingActivities(true)
    try {
      const res = await fetch(`/admin/rbac/users/${user.id}/activities`, { credentials: "include" })
      if (res.ok) {
        const json = await res.json()
        setUserActivities(json.activities || [])
      } else {
        setUserActivities([])
      }
    } catch {
      setUserActivities([])
    } finally {
      setIsLoadingActivities(false)
    }
  }

  const handleOpenEditInfo = (user: any) => {
    setSelectedUser(user)
    setEditInfoForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      role: user.role || "staff",
      preset: user.preset || "product_specialist"
    })
    setShowEditInfoModal(true)
    setActiveMenuUserId(null)
  }

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === "active" ? "suspended" : "active"
    try {
      const res = await fetch(`/admin/rbac/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      setSuccessMsg(`وضعیت حساب ${user.name} به ${newStatus === "active" ? "فعال" : "تعلیق‌شده"} تغییر یافت.`)
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    }
    setActiveMenuUserId(null)
  }

  const handleDeleteUser = async (user: any) => {
    setActiveMenuUserId(null)
    if (!confirm(`آیا از لغو دسترسی و حذف همکار «${user.name}» اطمینان دارید؟ این عملیات غیرقابل بازگشت است.`)) {
      return
    }

    try {
      const res = await fetch(`/admin/rbac/users/${user.id}`, {
        method: "DELETE",
        credentials: "include"
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      setSuccessMsg(`دسترسی همکار «${user.name}» با موفقیت لغو شد.`)
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSavePermissions = async () => {
    if (!selectedUser) return
    try {
      const res = await fetch(`/admin/rbac/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ custom_permissions: editPermissions })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      setSuccessMsg(`مجوزهای کاربر ${selectedUser.name} با موفقیت به‌روزرسانی شد.`)
      setShowPermissionsModal(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    try {
      const payload: any = {
        first_name: editInfoForm.first_name,
        last_name: editInfoForm.last_name,
        preset: editInfoForm.preset
      }
      if (isCallerOwner && selectedUser.role !== "owner") {
        payload.role = editInfoForm.role
      }
      const res = await fetch(`/admin/rbac/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      setSuccessMsg(`مشخصات کاربر ${selectedUser.name} با موفقیت ذخیره شد.`)
      setShowEditInfoModal(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    try {
      const payload: any = {
        email: inviteForm.email,
        first_name: inviteForm.first_name,
        last_name: inviteForm.last_name,
        role: inviteForm.role,
        preset: inviteForm.preset,
      }

      if (inviteForm.custom_permissions.length > 0) {
        payload.custom_permissions = inviteForm.custom_permissions
      }

      const res = await fetch("/admin/rbac/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "خطا در ایجاد کاربر.")

      setSuccessMsg(json.message || "کاربر جدید با موفقیت اضافه شد.")
      setShowInviteModal(false)
      setInviteForm({
        email: "",
        first_name: "",
        last_name: "",
        role: "staff",
        preset: "product_specialist",
        custom_permissions: []
      })
      setShowGranularInInvite(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const callerRole = data?.caller_role || "staff"
  const isCallerOwner = callerRole === "owner"
  const isCallerManager = callerRole === "manager"
  const callerPerms: string[] = data?.caller_permissions || []

  // Clean Unified Permission Rules:
  const canCallerInvite = isCallerOwner || callerPerms.includes("users.invite") || callerPerms.includes("*")
  const canCallerManage = isCallerOwner || callerPerms.includes("users.manage") || callerPerms.includes("*")
  const canCallerConfigure = isCallerOwner || callerPerms.includes("roles.configure") || callerPerms.includes("*")

  if (isLoading) {
    return (
      <div className="py-24 text-center dir-rtl font-sans" dir="rtl">
        <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <Text className="text-ui-fg-muted text-xs">در حال دریافت اطلاعات پرسنل و مجوزها...</Text>
      </div>
    )
  }

  // ACCESS DENIED VIEW
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-ui-bg-subtle text-ui-fg-base p-6 dir-rtl text-right font-sans flex items-center justify-center" dir="rtl">
        <div className="bg-ui-bg-base border border-amber-500/30 rounded-2xl p-8 max-w-lg w-full text-center shadow-elevation-card-rest">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            ⚠️
          </div>
          <Heading level="h1" className="text-lg font-bold text-ui-fg-base mb-2">
            عدم دسترسی به بخش کاربران و دسترسی‌ها
          </Heading>
          <Text className="text-xs text-ui-fg-muted mb-6 leading-relaxed">
            {accessDenied}
            <br />
            کاربر جاری شما فاقد مجوز مشاهده اعضای تیم (<code className="text-amber-500 font-mono">users.view</code>) است. در صورت نیاز به دسترسی، با مالک فروشگاه هماهنگ فرمایید.
          </Text>
          <button
            onClick={() => window.location.assign("/app")}
            className="px-5 py-2.5 rounded-xl bg-ui-bg-subtle hover:bg-ui-bg-component text-ui-fg-base text-xs font-bold border border-ui-border-base transition-all"
          >
            بازگشت به پیشخوان اصلی
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ui-bg-subtle text-ui-fg-base p-3 sm:p-6 lg:p-8 dir-rtl text-right font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-ui-border-base">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1" className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-ui-fg-base">
                مدیریت کاربران و کنترل سطوح دسترسی (RBAC)
              </Heading>
              <span className={clx(
                "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                isCallerOwner ? "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500/30" :
                isCallerManager ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/30" :
                "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30"
              )}>
                شما: {isCallerOwner ? "مالک فروشگاه (دسترسی تام)" : isCallerManager ? "مدیر اجرایی" : "کارمند فروشگاه"}
              </span>
            </div>
            <Text className="text-xs text-ui-fg-muted mt-0.5">
              تفکیک وظایف، اعمال یکپارچه مجوزها در بک‌اند و ثبت کارنامه فعالیت‌های زنده
            </Text>
          </div>
        </div>

        {/* Action Button: ONLY visible if permitted */}
        {canCallerInvite && (
          <Button
            onClick={() => setShowInviteModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm self-stretch sm:self-auto justify-center"
          >
            <User className="w-4 h-4" />
            <span>افزودن / دعوت همکار جدید</span>
          </Button>
        )}
      </div>

      {/* Success & Error alerts */}
      {successMsg && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300 rounded-xl text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-80">✕</button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 text-red-900 dark:text-red-300 rounded-xl text-xs flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <ExclamationCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:opacity-80">✕</button>
        </div>
      )}

      {/* 3 Core Roles Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* Role 1: Owner */}
        <div className="p-5 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-elevation-card-rest relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                صاحب‌اختیار نهایی
              </span>
              <div className="w-7 h-7 rounded-lg bg-ui-bg-subtle text-purple-600 dark:text-purple-400 border border-ui-border-base flex items-center justify-center text-xs font-bold">۱</div>
            </div>
            <div className="font-bold text-ui-fg-base text-base mb-1">مالک فروشگاه (Store Owner)</div>
            <Text className="text-xs text-ui-fg-subtle leading-relaxed mb-4 font-medium">
              سیاست‌گذار و دارنده اختیار تام؛ دسترسی کامل به امور مالی، کاربران، تنظیمات و تعیین کلیه مجوزهای سیستم.
            </Text>
          </div>
          <div className="text-[11px] text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/20 p-2.5 rounded-lg flex items-center gap-2 font-medium">
            <span>🔒</span>
            <span>غیرقابل حذف یا تعلیق توسط سایر کاربران پنل</span>
          </div>
        </div>

        {/* Role 2: Manager */}
        <div className="p-5 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-elevation-card-rest relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                مدیریت اجرایی
              </span>
              <div className="w-7 h-7 rounded-lg bg-ui-bg-subtle text-blue-600 dark:text-blue-400 border border-ui-border-base flex items-center justify-center text-xs font-bold">۲</div>
            </div>
            <div className="font-bold text-ui-fg-base text-base mb-1">مدیر فروشگاه (Store Manager)</div>
            <Text className="text-xs text-ui-fg-subtle leading-relaxed mb-4 font-medium">
              مسئول عملیات روزانه در چارچوب مجوزهای تعیین‌شده؛ نظارت بر وظایف تیم، سفارشات و محصولات.
            </Text>
          </div>
          <div className="text-[11px] text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 p-2.5 rounded-lg flex items-center gap-2 font-medium">
            <span>🛡️</span>
            <span>اختیارات مستقیماً بر اساس مجوزهای فعال سنجیده می‌شود</span>
          </div>
        </div>

        {/* Role 3: Staff */}
        <div className="p-5 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-elevation-card-rest relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                وظایف تخصصی
              </span>
              <div className="w-7 h-7 rounded-lg bg-ui-bg-subtle text-emerald-600 dark:text-emerald-400 border border-ui-border-base flex items-center justify-center text-xs font-bold">۳</div>
            </div>
            <div className="font-bold text-ui-fg-base text-base mb-1">کارمند / ادمین (Staff)</div>
            <Text className="text-xs text-ui-fg-subtle leading-relaxed mb-4 font-medium">
              حداقل دسترسی لازم برای انجام وظیفه محوله بر پایه الگوهای دسترسی از پیش‌تعریف‌شده یا مجوزهای سفارشی.
            </Text>
          </div>
          <div className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2 font-medium">
            <span>⚡</span>
            <span>الگوهای آماده + امکان تنظیم تک‌تک مجوزها توسط مالک</span>
          </div>
        </div>
      </div>

      {/* Transferred Feature: Team Performance & Real Live Audit Productivity */}
      {data?.staff_performance?.length > 0 && (
        <div className="mt-6 bg-ui-bg-base border border-ui-border-base rounded-2xl p-5 shadow-elevation-card-rest">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-ui-border-base">
            <div>
              <div className="font-bold text-sm text-ui-fg-base flex items-center gap-2">
                <span>📊</span>
                <span>عملکرد و بهره‌وری زنده اعضای تیم و ادمین‌ها (Team Performance)</span>
              </div>
              <Text className="text-xs text-ui-fg-muted mt-0.5">
                تعداد اقدامات و سفارشات ثبت‌شده توسط هر یک از پرسنل بر پایه لاگ‌های دیتابیس (admin_activity_log)
              </Text>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-ui-bg-subtle px-3 py-1 rounded-xl border border-ui-border-base">
              رصد زنده بهره‌وری
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.staff_performance.map((st: any) => (
              <div
                key={st.user_id}
                onClick={() => {
                  const target = data.users?.find((u: any) => u.id === st.user_id)
                  if (target) handleOpenActivity(target)
                }}
                className="p-3.5 rounded-xl bg-ui-bg-subtle border border-ui-border-base hover:border-emerald-500/50 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-ui-bg-base border border-ui-border-base flex items-center justify-center font-bold text-xs text-ui-fg-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    {st.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-ui-fg-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      {st.name}
                    </div>
                    <div className="text-[10px] text-ui-fg-muted mt-0.5">{st.email}</div>
                  </div>
                </div>

                <div className="text-left font-medium">
                  <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    {st.total_actions.toLocaleString("fa-IR")} اقدام ثبت‌شده
                  </div>
                  <div className="text-[10px] text-ui-fg-muted mt-0.5">
                    آخرین: {st.last_action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="mt-6 bg-ui-bg-base border border-ui-border-base rounded-2xl p-4 sm:p-6 shadow-elevation-card-rest">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <Heading level="h2" className="text-base font-bold text-ui-fg-base">لیست اعضای تیم و کاربران پنل مدیریت</Heading>
            <Text className="text-xs text-ui-fg-muted mt-0.5">برای مشاهده پرونده فعالیت‌ها یا تنظیم مجوزها، از منوی سه نقطه هر ردیف استفاده کنید</Text>
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-ui-bg-subtle px-3 py-1 rounded-lg border border-ui-border-base">
            {data?.users?.length || 0} کاربر ثبت‌شده در هسته مدوسا
          </span>
        </div>

        {/* Responsive Horizontal Scroll Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-ui-border-base text-ui-fg-muted">
                <th className="pb-3 font-bold">کاربر</th>
                <th className="pb-3 font-bold">نقش سازمانی</th>
                <th className="pb-3 font-bold">الگوی دسترسی</th>
                <th className="pb-3 font-bold">وضعیت مجوزها</th>
                <th className="pb-3 font-bold">وضعیت فعالیت</th>
                <th className="pb-3 font-bold text-left">اقدامات مدیریتی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border-base/40">
              {data?.users?.map((u: any) => {
                const isUserOwner = u.role === "owner"
                const isUserManager = u.role === "manager"
                const isActive = u.status === "active"
                const isMenuOpen = activeMenuUserId === u.id

                // Security Boundaries:
                const canManageThisUser = isCallerOwner || (canCallerManage && !isUserOwner && !isUserManager)
                const canViewThisActivity = isCallerOwner || (!isUserOwner && isCallerManager) || u.id === data?.caller_id

                return (
                  <tr key={u.id} className="hover:bg-ui-bg-subtle/50 transition-colors">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={clx(
                          "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                          isUserOwner ? "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500/30" :
                          isUserManager ? "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/30" :
                          "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30"
                        )}>
                          {u.name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <div className="font-bold text-ui-fg-base text-xs flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isUserOwner && <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">(مالک اصلی)</span>}
                          </div>
                          <div className="text-[11px] text-ui-fg-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className={clx(
                        "px-2.5 py-1 rounded-md text-[11px] font-bold border whitespace-nowrap",
                        isUserOwner ? "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500/30" :
                        isUserManager ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/30" :
                        "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30"
                      )}>
                        {u.role_title}
                      </span>
                    </td>
                    <td className="py-3.5 text-ui-fg-subtle font-medium whitespace-nowrap">
                      {u.preset_title || (isUserOwner ? "دسترسی کامل (Full Root)" : isUserManager ? "مدیریت اجرایی" : "سفارشی")}
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      {canCallerConfigure ? (
                        <button
                          onClick={() => handleOpenPermissions(u)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                          title="مشاهده و تغییر مجوزها"
                        >
                          <span>{u.permissions?.includes("*") ? "تمام بخش‌ها (*)" : `${u.permissions?.length || 0} مجوز فعال`}</span>
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-xs text-ui-fg-muted font-medium">
                          {u.permissions?.includes("*") ? "تمام بخش‌ها (*)" : `${u.permissions?.length || 0} مجوز فعال`}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <span className={clx(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                        isActive
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          : "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                      )}>
                        <span className={clx("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-600 dark:bg-emerald-400" : "bg-red-600 dark:bg-red-400")} />
                        {isActive ? "فعال" : "تعلیق‌شده"}
                      </span>
                    </td>
                    <td className="py-3.5 text-left relative whitespace-nowrap">
                      {canManageThisUser ? (
                        <div className="inline-block text-left">
                          <button
                            onClick={() => setActiveMenuUserId(isMenuOpen ? null : u.id)}
                            className="w-8 h-8 rounded-lg bg-ui-bg-subtle hover:bg-ui-bg-component border border-ui-border-base flex items-center justify-center text-ui-fg-base font-bold transition-all"
                            title="عملیات و مدیریت کاربر"
                          >
                            •••
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div className="absolute left-0 mt-2 w-56 bg-ui-bg-base border border-ui-border-base rounded-xl shadow-2xl z-40 py-1.5 divide-y divide-ui-border-base/50 text-right">
                              <div className="py-1">
                                <button
                                  onClick={() => handleOpenActivity(u)}
                                  className="w-full px-3.5 py-2 text-xs text-ui-fg-base hover:bg-ui-bg-subtle flex items-center justify-between font-medium"
                                >
                                  <span>مشاهده کارنامه و پرونده فعالیت</span>
                                  <span className="text-ui-fg-muted">📋</span>
                                </button>
                                <button
                                  onClick={() => handleOpenEditInfo(u)}
                                  className="w-full px-3.5 py-2 text-xs text-ui-fg-base hover:bg-ui-bg-subtle flex items-center justify-between font-medium"
                                >
                                  <span>ویرایش نام و مشخصات فردی</span>
                                  <span className="text-ui-fg-muted">✏️</span>
                                </button>
                                
                                {canCallerConfigure && (
                                  <button
                                    onClick={() => handleOpenPermissions(u)}
                                    className="w-full px-3.5 py-2 text-xs text-ui-fg-base hover:bg-ui-bg-subtle flex items-center justify-between font-medium"
                                  >
                                    <span>مدیریت تک‌تک مجوزها</span>
                                    <span className="text-ui-fg-muted">🔑</span>
                                  </button>
                                )}
                              </div>

                              {!isUserOwner && canCallerManage && (
                                <div className="py-1">
                                  <button
                                    onClick={() => handleToggleStatus(u)}
                                    className={clx(
                                      "w-full px-3.5 py-2 text-xs flex items-center justify-between font-bold hover:bg-ui-bg-subtle",
                                      isActive ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                                    )}
                                  >
                                    <span>{isActive ? "تعلیق موقت دسترسی" : "رفع تعلیق و فعال‌سازی"}</span>
                                    <span>{isActive ? "⏸️" : "▶️"}</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="w-full px-3.5 py-2 text-xs flex items-center justify-between font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                  >
                                    <span>حذف و لغو دسترسی همکار</span>
                                    <span>🗑️</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : isUserOwner && !isCallerOwner ? (
                        <span className="text-[11px] text-ui-fg-muted font-bold px-2.5 py-1 rounded-lg bg-ui-bg-subtle border border-ui-border-base">
                          🔒 محرمانه مالک
                        </span>
                      ) : canViewThisActivity ? (
                        <button
                          onClick={() => handleOpenActivity(u)}
                          className="px-2.5 py-1 text-[11px] bg-ui-bg-subtle hover:bg-ui-bg-component text-ui-fg-subtle rounded-lg border border-ui-border-base transition-all font-medium"
                        >
                          مشاهده کارنامه
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer / Modal 1: User Profile & REAL LIVE Activity Log with Clickable Links */}
      {showActivityDrawer && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-ui-border-base mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ui-bg-subtle border border-ui-border-base flex items-center justify-center font-bold text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
                  {selectedUser.name?.charAt(0)}
                </div>
                <div>
                  <Heading level="h2" className="text-base font-bold text-ui-fg-base">{selectedUser.name}</Heading>
                  <Text className="text-xs text-ui-fg-muted">{selectedUser.email} • {selectedUser.role_title}</Text>
                </div>
              </div>
              <button onClick={() => setShowActivityDrawer(false)} className="text-ui-fg-muted hover:text-ui-fg-base text-lg font-bold">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-5 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
                  <div className="text-ui-fg-muted text-[11px] font-medium">وضعیت حساب:</div>
                  <div className="font-bold text-ui-fg-base mt-1 flex items-center gap-1.5">
                    <span className={clx("w-2 h-2 rounded-full", selectedUser.status === "active" ? "bg-emerald-600 dark:bg-emerald-400" : "bg-red-600 dark:bg-red-400")} />
                    <span>{selectedUser.status === "active" ? "فعال در سیستم" : "تعلیق‌شده"}</span>
                  </div>
                </div>
                <div className="p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
                  <div className="text-ui-fg-muted text-[11px] font-medium">الگوی تخصیص‌یافته:</div>
                  <div className="font-bold text-ui-fg-base mt-1">{selectedUser.preset_title || "دسترسی تام"}</div>
                </div>
                <div className="p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
                  <div className="text-ui-fg-muted text-[11px] font-medium">تاریخ عضویت شمسی:</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatShamsiDate(selectedUser.created_at)}</div>
                </div>
              </div>

              {/* REAL Live Activity Log fetched from PostgreSQL */}
              <div>
                <div className="font-bold text-sm text-ui-fg-base mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span>کارنامه و گزارش فعالیت‌های زنده در فروشگاه:</span>
                  </div>
                  {isLoadingActivities && <span className="text-[11px] text-ui-fg-muted animate-pulse">در حال خواندن لاگ‌ها...</span>}
                </div>

                <div className="space-y-2.5">
                  {userActivities.length > 0 ? (
                    userActivities.map((act) => (
                      <div key={act.id} className="p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:border-ui-border-strong transition-all">
                        <div className="flex-1">
                          <div className="font-bold text-ui-fg-base flex items-center gap-2">
                            <span className="p-1 rounded-md bg-ui-bg-base border border-ui-border-base text-sm shadow-xs">
                              {getActivityIcon(act.target_type, act.action_type)}
                            </span>
                            <span>{act.action_title}</span>
                          </div>
                          <div className="text-[11px] text-ui-fg-muted mt-0.5 font-medium leading-relaxed">
                            {act.details}
                          </div>
                          <div className="text-[10px] text-ui-fg-subtle mt-1 font-mono">
                            {act.shamsi_full}
                          </div>
                        </div>

                        {act.target_url && (
                          <button
                            onClick={() => {
                              setShowActivityDrawer(false)
                              window.location.assign("/app" + act.target_url)
                            }}
                            className="px-3 py-1.5 rounded-lg bg-ui-bg-base hover:bg-ui-bg-component text-emerald-600 dark:text-emerald-400 border border-ui-border-base text-[11px] font-bold flex items-center gap-1 shadow-sm shrink-0 self-end sm:self-auto"
                          >
                            <span>مشاهده در سایت</span>
                            <ArrowUpRightOnBox className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-ui-fg-muted bg-ui-bg-subtle rounded-xl border border-ui-border-base">
                      هنوز فعالیتی برای این کاربر در سیستم ثبت نشده است.
                    </div>
                  )}
                </div>
              </div>

              {/* Active Permissions Checklist */}
              <div>
                <div className="font-bold text-sm text-ui-fg-base mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>مجوزهای فعال برای این حساب:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUser.permissions?.includes("*") ? (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 font-bold">
                      دسترسی تام و کامل به کلیه ماژول‌های سیستم (*)
                    </span>
                  ) : (
                    selectedUser.permissions?.map((p: string) => (
                      <span key={p} className="px-2.5 py-1 rounded-lg bg-ui-bg-subtle border border-ui-border-base text-ui-fg-subtle font-medium">
                        ✓ {p}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-ui-border-base mt-4 flex items-center justify-between">
              {canCallerConfigure ? (
                <button
                  onClick={() => {
                    setShowActivityDrawer(false)
                    handleOpenPermissions(selectedUser)
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  تغییر مجوزهای این کاربر
                </button>
              ) : <div />}
              <Button variant="secondary" onClick={() => setShowActivityDrawer(false)}>بستن</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Permissions Manager */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-ui-border-base mb-4">
              <div>
                <Heading level="h2" className="text-base font-bold text-ui-fg-base flex items-center gap-2">
                  <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>مدیریت دقیق مجوزها: {selectedUser.name}</span>
                </Heading>
                <Text className="text-xs text-ui-fg-muted mt-0.5">
                  شما می‌توانید تک‌تک اختیارات این کاربر را به صورت دستی فعال یا غیرفعال کنید
                </Text>
              </div>
              <button onClick={() => setShowPermissionsModal(false)} className="text-ui-fg-muted hover:text-ui-fg-base text-lg font-bold">✕</button>
            </div>

            {/* Quick Presets Bar */}
            <div className="p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base mb-4 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ui-fg-base">اعمال سریع بر پایه الگو:</span>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEditPermissions(["products.view", "products.manage", "products.sku", "inventory.view", "inventory.manage"])}
                    className="px-2.5 py-1 rounded-lg bg-ui-bg-base border border-ui-border-base text-[11px] font-bold hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    کارشناس محصول
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPermissions(["orders.view", "orders.manage", "orders.create", "orders.exchange", "orders.export", "customers.view"])}
                    className="px-2.5 py-1 rounded-lg bg-ui-bg-base border border-ui-border-base text-[11px] font-bold hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    کارشناس سفارش
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPermissions(["customers.view", "customers.manage", "orders.view"])}
                    className="px-2.5 py-1 rounded-lg bg-ui-bg-base border border-ui-border-base text-[11px] font-bold hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    پشتیبان مشتریان
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPermissions(["analytics.view", "analytics.financial", "orders.view", "products.view"])}
                    className="px-2.5 py-1 rounded-lg bg-ui-bg-base border border-ui-border-base text-[11px] font-bold hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    حسابدار مالی
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPermissions(["campaigns.view", "campaigns.manage", "promotions.manage", "analytics.view"])}
                    className="px-2.5 py-1 rounded-lg bg-ui-bg-base border border-ui-border-base text-[11px] font-bold hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    مدیر تبلیغات
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = CATEGORIZED_PERMISSIONS.flatMap(c => c.permissions.map(p => p.id))
                    setEditPermissions(allIds)
                  }}
                  className="px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  انتخاب همه
                </button>
                <span className="text-ui-fg-muted">|</span>
                <button
                  type="button"
                  onClick={() => setEditPermissions([])}
                  className="px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
                >
                  لغو همه
                </button>
              </div>
            </div>

            {/* Permissions List */}
            <div className="overflow-y-auto flex-1 space-y-5 pr-1">
              {CATEGORIZED_PERMISSIONS.map((cat, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400 pb-1 border-b border-ui-border-base">
                    {cat.category}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {cat.permissions.map((p) => {
                      const isChecked = editPermissions.includes(p.id) || editPermissions.includes("*")
                      return (
                        <label
                          key={p.id}
                          className={clx(
                            "flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all",
                            isChecked
                              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40"
                              : "bg-ui-bg-subtle/40 border-ui-border-base opacity-80"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditPermissions([...editPermissions.filter(x => x !== "*"), p.id])
                              } else {
                                setEditPermissions(editPermissions.filter(x => x !== p.id && x !== "*"))
                              }
                            }}
                            className="w-4 h-4 mt-0.5 accent-emerald-500 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-ui-fg-base">{p.label}</span>
                              {p.is_sensitive && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400">
                                  حساس
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-ui-fg-muted mt-0.5 font-medium">{p.desc}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-ui-border-base mt-4 flex items-center justify-between">
              <span className="text-xs text-ui-fg-muted font-medium">
                {editPermissions.includes("*") ? "تمام مجوزها فعال است" : `${editPermissions.length} مجوز انتخاب شده`}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowPermissionsModal(false)}>انصراف</Button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  ذخیره تغییرات مجوزها
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Edit User Info & Role */}
      {showEditInfoModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-ui-border-base mb-4">
              <Heading level="h2" className="text-base font-bold text-ui-fg-base">ویرایش مشخصات و نقش همکار</Heading>
              <button onClick={() => setShowEditInfoModal(false)} className="text-ui-fg-muted hover:text-ui-fg-base font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveInfo} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-ui-fg-subtle mb-1">نام</label>
                <input
                  type="text"
                  required
                  value={editInfoForm.first_name}
                  onChange={(e) => setEditInfoForm({ ...editInfoForm, first_name: e.target.value })}
                  className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3 py-2 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ui-fg-subtle mb-1">نام خانوادگی</label>
                <input
                  type="text"
                  required
                  value={editInfoForm.last_name}
                  onChange={(e) => setEditInfoForm({ ...editInfoForm, last_name: e.target.value })}
                  className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3 py-2 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ui-fg-subtle mb-1">ایمیل (شناسه ورود)</label>
                <input
                  type="email"
                  disabled
                  value={selectedUser.email}
                  className="w-full bg-ui-bg-subtle/50 border border-ui-border-base rounded-xl px-3 py-2 text-xs text-ui-fg-muted cursor-not-allowed"
                />
              </div>

              {isCallerOwner && selectedUser.role !== "owner" && (
                <div>
                  <label className="block text-xs font-bold text-ui-fg-subtle mb-1">نقش سازمانی</label>
                  <select
                    value={editInfoForm.role}
                    onChange={(e) => setEditInfoForm({ ...editInfoForm, role: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3 py-2 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="staff">کارمند فروشگاه (Staff)</option>
                    <option value="manager">مدیر فروشگاه (Store Manager)</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-ui-border-base">
                <Button variant="secondary" onClick={() => setShowEditInfoModal(false)}>انصراف</Button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  ذخیره مشخصات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Comprehensive Invite Member with Permissions */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-4 sm:p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-ui-border-base mb-4">
              <div className="flex items-center gap-2 text-ui-fg-base font-bold text-base">
                <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>دعوت همکار جدید و صدور دسترسی</span>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-ui-fg-muted hover:text-ui-fg-base font-bold text-base">✕</button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-ui-fg-subtle mb-1">ایمیل سازمانی همکار (شناسه ورود) *</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="name@store.ir"
                  className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ui-fg-subtle mb-1">نام</label>
                  <input
                    type="text"
                    value={inviteForm.first_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                    placeholder="مثال: سارا"
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ui-fg-subtle mb-1">نام خانوادگی</label>
                  <input
                    type="text"
                    value={inviteForm.last_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                    placeholder="مثال: محمدی"
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-bold text-ui-fg-subtle mb-1">نقش سازمانی</label>
                {isCallerOwner ? (
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="staff">کارمند / ادمین (Staff)</option>
                    <option value="manager">مدیر فروشگاه (Store Manager)</option>
                    <option value="owner">مالک مشترک (Store Owner)</option>
                  </select>
                ) : (
                  <div className="p-2.5 rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base font-bold">
                    کارمند فروشگاه (Staff) — مدیران فقط مجاز به افزودن کارمند هستند
                  </div>
                )}
              </div>

              {/* Preset Selection */}
              {inviteForm.role === "staff" && (
                <div>
                  <label className="block font-bold text-ui-fg-subtle mb-1">الگوی دسترسی اولیه</label>
                  <select
                    value={inviteForm.preset}
                    onChange={(e) => setInviteForm({ ...inviteForm, preset: e.target.value })}
                    className="w-full bg-ui-bg-subtle border border-ui-border-base rounded-xl px-3.5 py-2.5 text-xs text-ui-fg-base focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="product_specialist">کارشناس محصولات (مدیریت لباس‌ها، تنوع‌ها و انبار)</option>
                    <option value="order_specialist">کارشناس سفارش‌ها (پردازش سفارش‌ها و ارسال پستی)</option>
                    <option value="customer_support">پشتیبان مشتریان (رسیدگی به خریداران و تیکت‌ها)</option>
                    <option value="accountant">حسابدار و امور مالی (گزارش‌های درآمد و فاکتورها)</option>
                    <option value="marketing_manager">مدیر تبلیغات و بازاریابی (پایش کمپین‌ها و ROAS)</option>
                  </select>
                </div>
              )}

              {/* Custom Permissions Toggle */}
              {canCallerConfigure && inviteForm.role === "staff" && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGranularInInvite(!showGranularInInvite)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <span>{showGranularInInvite ? "▲ بستن تنظیم دستی مجوزها" : "▼ تنظیم دستی و سفارشی تک‌تک مجوزها"}</span>
                  </button>

                  {showGranularInInvite && (
                    <div className="mt-3 p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base max-h-48 overflow-y-auto space-y-3">
                      {CATEGORIZED_PERMISSIONS.map((cat, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="font-bold text-[11px] text-ui-fg-base">{cat.category}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {cat.permissions.map((p) => {
                              const isChecked = inviteForm.custom_permissions.includes(p.id)
                              return (
                                <label key={p.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-ui-bg-base border border-ui-border-base cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setInviteForm({ ...inviteForm, custom_permissions: [...inviteForm.custom_permissions, p.id] })
                                      } else {
                                        setInviteForm({ ...inviteForm, custom_permissions: inviteForm.custom_permissions.filter(x => x !== p.id) })
                                      }
                                    }}
                                    className="w-3.5 h-3.5 accent-emerald-500"
                                  />
                                  <span className="text-[11px] font-medium text-ui-fg-base">{p.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-ui-border-base">
                <Button variant="secondary" onClick={() => setShowInviteModal(false)}>انصراف</Button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm"
                >
                  صدور دعوت و ثبت کاربر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPermissionsPage
