import { authenticate, configureStoreSearch, defineMiddlewares } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from '@medusajs/framework/http'

const enforceRbac = async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  const authContext = (req as any).auth_context
  const userId = authContext?.actor_id || (req as any).user?.id

  if (!userId) {
    return next()
  }

  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const userRes = await pgConnection.raw('SELECT id, email, first_name, last_name, deleted_at, metadata FROM public."user" WHERE id = ?', [userId])
    const user = userRes?.rows?.[0]

    if (!user) {
      return next()
    }

    // 0. Check if user is soft-deleted
    if (user.deleted_at) {
      return res.status(401).json({
        message: 'حساب کاربری شما از سیستم حذف شده است.',
        code: 'ACCOUNT_DELETED'
      })
    }

    const rbac = user.metadata?.rbac || {}
    const isOwner = user.email === 'admin@medusa-test.com' || rbac.role === 'owner'

    // 1. Check if user is suspended (Owner cannot be suspended)
    if (!isOwner && rbac.status === 'suspended') {
      return res.status(403).json({
        message: 'حساب کاربری شما توسط مالک فروشگاه تعلیق شده است و امکان هیچ‌گونه دسترسی یا فعالیتی در پنل مدیریت وجود ندارد.',
        code: 'ACCOUNT_SUSPENDED'
      })
    }

    // 2. Real-time Live Activity Logging for ALL users (including Owner, Manager, and Staff)
    const method = req.method.toUpperCase()
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const url = req.originalUrl || req.url

      // Skip generic middleware logging for endpoints that handle their own specialized audit logs
      const skipLogging = url.includes('/process-toggle') || 
                          url.includes('/shipping-meta') || 
                          url.includes('/exchange-size') || 
                          url.includes('/uploads')

      if (!skipLogging) {
        let actionTitle = 'ویرایش اطلاعات در پنل مدیریت'
        let targetType = 'general'
        let targetUrl = url.replace('/admin', '')
        const userName = ((user.first_name || '') + ' ' + (user.last_name || '')).trim() || user.email
        let details = `ثبت موفق عملیات ${method} در بخش ${actionTitle} توسط ${userName}`

        if (url.includes('/quick-order')) {
          actionTitle = 'ثبت سفارش سریع پوشاک (دایرکت / تلفنی)'
          targetType = 'order'
          details = `ثبت سفارش جدید توسط ${userName}`
        } else if (url.includes('/product-categories') || url.includes('/categories')) {
          targetType = 'category'
          targetUrl = '/categories'
          const catName = (req.body as any)?.name || (req.body as any)?.title || ''
          if (method === 'POST') {
            actionTitle = catName ? `ایجاد دسته‌بندی جدید پوشاک: "${catName}"` : 'ایجاد دسته‌بندی جدید پوشاک'
            details = catName 
              ? `ثبت و ایجاد دسته‌بندی جدید "${catName}" در کاتالوگ فروشگاه توسط ${userName}`
              : `ایجاد دسته‌بندی جدید در کاتالوگ پوشاک توسط ${userName}`
          } else if (method === 'DELETE') {
            actionTitle = 'حذف دسته‌بندی پوشاک'
            details = `حذف دسته‌بندی کالا از کاتالوگ فروشگاه توسط ${userName}`
          } else {
            actionTitle = catName ? `ویرایش دسته‌بندی پوشاک: "${catName}"` : 'ویرایش دسته‌بندی پوشاک'
            details = `به‌روزرسانی اطلاعات دسته‌بندی پوشاک توسط ${userName}`
          }
        } else if (url.includes('/products')) {
          targetType = 'product'
          const prodName = (req.body as any)?.title || (req.body as any)?.name || ''
          actionTitle = method === 'POST' 
            ? (prodName ? `ایجاد لباس جدید: "${prodName}"` : 'ایجاد یا ویرایش مشخصات لباس') 
            : method === 'DELETE' 
            ? 'حذف لباس از کاتالوگ' 
            : 'به‌روزرسانی کاتالوگ پوشاک'
          details = prodName 
            ? `عملیات ${method} روی لباس "${prodName}" در کاتالوگ توسط ${userName}` 
            : `ثبت موفق عملیات ${method} در بخش کاتالوگ پوشاک توسط ${userName}`
        } else if (url.includes('/orders')) {
          actionTitle = 'مدیریت و تغییر وضعیت سفارش'
          targetType = 'order'
          details = `به‌روزرسانی و تغییر اطلاعات سفارش توسط ${userName}`
        } else if (url.includes('/inventory')) {
          actionTitle = 'تغییر و اصلاح موجودی انبار مرکزی'
          targetType = 'inventory'
          details = `تغییر و تنظیم مجدد موجودی کالاهای انبار مرکزی توسط ${userName}`
        } else if (url.includes('/customers')) {
          actionTitle = 'به‌روزرسانی پروفایل خریدار'
          targetType = 'customer'
          details = `ویرایش مشخصات مشتری در سیستم توسط ${userName}`
        } else if (url.includes('/campaign-analytics') || url.includes('/promotions')) {
          actionTitle = 'ایجاد یا تنظیم کمپین تبلیغاتی'
          targetType = 'campaign'
          details = `تنظیمات و تغییرات کمپین‌های تبلیغاتی توسط ${userName}`
        } else if (url.includes('/rbac') || url.includes('/users')) {
          actionTitle = 'تغییر وضعیت یا دسترسی‌های پرسنل'
          targetType = 'user'
          details = `تغییر سطح دسترسی یا اطلاعات همکار توسط ${userName}`
        }

        const actId = 'act_' + Math.random().toString(36).substring(2, 11)
        pgConnection.raw(`
          INSERT INTO admin_activity_log (id, user_id, user_email, user_name, action_type, action_title, target_type, target_url, details, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          actId,
          user.id,
          user.email,
          userName,
          'admin_action',
          actionTitle,
          targetType,
          targetUrl,
          details
        ]).catch(() => {})
      }
    }

    // Owner bypasses all permission blocks
    if (isOwner) {
      return next()
    }

    // 3. Granular Permission Checks for Manager & Staff
    const permissions: string[] = rbac.permissions || []
    const fullPath = (req.originalUrl || req.url || '').toLowerCase()

    const has = (...perms: string[]) => {
      if (permissions.includes('*')) return true
      return perms.some(p => permissions.includes(p))
    }

    // Analytics / Financials
    if (fullPath.includes('/fashion-analytics') || fullPath.includes('/analytics')) {
      if (!has('analytics.view')) {
        return res.status(403).json({ message: 'شما مجوز مشاهده گزارش‌های تحلیلی را ندارید.' })
      }
    }

    // Campaign Management
    if (fullPath.includes('/campaign-analytics')) {
      if (['POST', 'PUT', 'DELETE'].includes(method)) {
        if (!has('campaigns.manage')) {
          return res.status(403).json({ message: 'تنها کاربران دارای مجوز مدیریت تبلیغات مجاز به ایجاد یا تغییر کمپین هستند.' })
        }
      } else {
        if (!has('campaigns.view')) {
          return res.status(403).json({ message: 'شما مجوز مشاهده بخش تبلیغات و کمپین‌ها را ندارید.' })
        }
      }
    }

    // Fast Product Create
    if (fullPath.includes('/fast-product-create')) {
      if (method === 'POST') {
        if (!has('products.manage')) {
          return res.status(403).json({ message: 'تنها کاربران دارای مجوز مدیریت کاتالوگ مجاز به ایجاد لباس هستند.' })
        }
      } else {
        if (!has('products.view', 'products.manage')) {
          return res.status(403).json({ message: 'شما مجوز دسترسی به بخش کاتالوگ لباس را ندارید.' })
        }
      }
    }

    // Price updates & Price Lists (Sensitive: products.price required)
    if ((fullPath.includes('/price') || fullPath.includes('/pricing')) && method !== 'GET') {
      if (!has('products.price')) {
        return res.status(403).json({ message: 'تنها کاربران دارای مجوز تغییر قیمت مجاز به ویرایش مبالغ هستند.' })
      }
    }

    // Core Products Route
    if (fullPath.includes('/products')) {
      if (method === 'DELETE') {
        if (!has('products.delete')) {
          return res.status(403).json({ message: 'شما مجوز حذف کالا از فروشگاه را ندارید.' })
        }
      } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
        if (!has('products.manage')) {
          return res.status(403).json({ message: 'شما مجوز ویرایش یا افزودن محصول را ندارید.' })
        }
      } else if (method === 'GET' && !fullPath.includes('/products/')) {
        // Checking products list
        if (!has('products.view', 'products.manage')) {
          return res.status(403).json({ message: 'شما مجوز مشاهده کاتالوگ محصولات را ندارید.' })
        }
      }
    }

    // Inventory Items & Levels
    if (fullPath.includes('/inventory') || fullPath.includes('/inventory-items') || fullPath.includes('/inventory-levels')) {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        if (!has('inventory.manage')) {
          return res.status(403).json({ message: 'تنها کاربران دارای مجوز مدیریت انبار مجاز به تغییر موجودی هستند.' })
        }
      } else if (method === 'GET') {
        if (!has('inventory.view', 'inventory.manage')) {
          return res.status(403).json({ message: 'شما مجوز مشاهده موجودی انبار را ندارید.' })
        }
      }
    }

    // Quick Order Creation
    if (fullPath.includes('/quick-order') && method === 'POST') {
      if (!has('orders.create', 'orders.manage')) {
        return res.status(403).json({ message: 'شما مجوز ثبت سریع سفارش دایرکت را ندارید.' })
      }
    }

    // Size Exchange
    if (fullPath.includes('/exchange-size') && method === 'POST') {
      if (!has('orders.exchange', 'orders.manage')) {
        return res.status(403).json({ message: 'شما مجوز ثبت تعویض سایز سفارش را ندارید.' })
      }
    }

    // Postal Export
    if (fullPath.includes('/export-postal')) {
      if (!has('orders.export', 'orders.view')) {
        return res.status(403).json({ message: 'شما مجوز دریافت خروجی مرسولات پستی را ندارید.' })
      }
    }

    // Core Orders Route
    if (fullPath.includes('/orders') && !fullPath.includes('/orders/export-postal') && !fullPath.includes('/exchange-size')) {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        if (!has('orders.manage')) {
          return res.status(403).json({ message: 'شما مجوز مدیریت یا تغییر وضعیت سفارش را ندارید.' })
        }
      } else if (method === 'GET' && !fullPath.includes('/orders/')) {
        if (!has('orders.view', 'orders.manage')) {
          return res.status(403).json({ message: 'شما مجوز مشاهده سفارشات را ندارید.' })
        }
      }
    }

    // Customers Route
    if (fullPath.includes('/customers')) {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        if (!has('customers.manage')) {
          return res.status(403).json({ message: 'شما مجوز ویرایش اطلاعات مشتریان را ندارید.' })
        }
      } else if (method === 'GET') {
        if (!has('customers.view', 'customers.manage')) {
          return res.status(403).json({ message: 'شما مجوز مشاهده مشخصات مشتریان را ندارید.' })
        }
      }
    }

    // Users and Permissions (Pure Unified RBAC)
    if (fullPath.includes('/rbac') || fullPath.includes('/users')) {
      // 1. Current user profile (/admin/users/me) is ESSENTIAL for login bootstrap and must always be allowed
      if (fullPath.includes('/users/me')) {
        return next()
      }

      // 2. Activities route: handled in its own route handler
      if (fullPath.includes('/activities')) {
        return next()
      }

      // 3. Checking users list requires users.view
      if (method === 'GET') {
        if (!has('users.view')) {
          return res.status(403).json({ message: 'شما مجوز مشاهده اعضای تیم و کاربران را ندارید.' })
        }
      } else if (method === 'POST') {
        // Inviting / adding user requires users.invite
        if (!has('users.invite')) {
          return res.status(403).json({ message: 'شما مجوز دعوت یا افزودن همکار جدید را ندارید.' })
        }
      } else if (['PUT', 'PATCH', 'DELETE'].includes(method)) {
        // Managing status, profile or deletion requires users.manage
        if (!has('users.manage')) {
          return res.status(403).json({ message: 'شما مجوز تغییر وضعیت یا دسترسی‌های پرسنل را ندارید.' })
        }
      }
    }

  } catch {
    // Continue
  }

  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: '/admin/uploads',
      method: ['POST'],
      bodyParser: {
        sizeLimit: '50mb',
      },
      middlewares: [
        authenticate('user', ['session', 'bearer', 'api-key']),
        enforceRbac,
      ],
    },
    {
      matcher: '/admin/fast-product-create*',
      method: ['POST'],
      bodyParser: {
        sizeLimit: '50mb',
      },
      middlewares: [
        authenticate('user', ['session', 'bearer', 'api-key']),
        enforceRbac,
      ],
    },
    {
      matcher: /\/admin(.*)/,
      bodyParser: {
        sizeLimit: '50mb',
      },
      middlewares: [
        authenticate('user', ['session', 'bearer', 'api-key']),
        enforceRbac,
      ],
    },
    {
      method: ['POST'],
      matcher: '/store/search',
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
  ],
})
