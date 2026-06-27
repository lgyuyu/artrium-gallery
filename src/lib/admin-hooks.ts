'use client'

import { useState, useCallback } from 'react'
import { useAdminStore } from '@/lib/admin-store'

// 通用 fetch hook（带口令头）—— 直接从 zustand store 读取口令
export function useAdminFetch() {
  const password = useAdminStore((s) => s.password)

  const authFetch = useCallback(
    async (url: string, opts: RequestInit = {}) => {
      const headers: Record<string, string> = {
        ...(opts.headers as Record<string, string>),
      }
      if (!headers['Content-Type'] && !(opts.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }
      if (password) headers['x-admin-password'] = password
      const res = await fetch(url, { ...opts, headers })
      return res
    },
    [password]
  )

  return { authFetch, password }
}

// 学生类型
export interface StudentItem {
  id: string
  name: string
  age: string | null
  bio: string | null
  style: string
  order: number
  coverImage: string | null
  artworkCount: number
}

// 画作类型
export interface ArtworkItem {
  id: string
  title: string
  imageUrl: string
  artworkDate: string | null
  description: string | null
  order: number
  studentId: string
}

// 机构类型
export interface OrgItem {
  id: string
  name: string
  slogan: string | null
  logo: string | null
  defaultStyle: string
}
