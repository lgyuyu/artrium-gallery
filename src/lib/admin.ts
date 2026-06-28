import { db } from './db'
import { headers } from 'next/headers'

/**
 * 验证管理员口令
 * 从请求头 x-admin-password 读取，与数据库中 organization.adminPassword 比对
 */
export async function verifyAdmin(): Promise<{ ok: boolean; error?: string }> {
  const headerList = await headers()
  const password = headerList.get('x-admin-password')

  if (!password) {
    return { ok: false, error: '缺少管理员口令' }
  }

  const org = await db.organization.findFirst()
  if (!org) {
    return { ok: false, error: '系统未初始化' }
  }

  if (password !== org.adminPassword) {
    return { ok: false, error: '管理员口令错误' }
  }

  return { ok: true }
}
