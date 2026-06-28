'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, ArrowRight, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAdminStore } from '@/lib/admin-store'

export function AdminLogin({ orgLogo, orgName }: { orgLogo: string; orgName: string }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuthed = useAdminStore((s) => s.setAuthed)

  // 已登录则跳过（由父组件控制，这里不做路由跳转）
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      toast.error('请输入管理口令')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '口令错误')
        return
      }
      setAuthed(password.trim())
      toast.success('验证通过，欢迎进入管理后台')
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-background to-accent/30">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 text-muted-foreground hover:text-foreground transition-colors">
          <div className="h-16 w-16 rounded-xl bg-white shadow-md border border-border/40 flex items-center justify-center overflow-hidden">
            <img src={orgLogo} alt={`${orgName} logo`} className="h-14 w-14 object-contain" />
          </div>
          <div className="leading-tight text-left">
            <p className="font-serif text-2xl font-semibold text-foreground">{orgName}</p>
            <p className="text-[10px] tracking-[0.25em] uppercase mt-0.5">Online Gallery</p>
          </div>
        </Link>

        <div className="bg-card rounded-2xl p-7 frame-shadow border">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-accent mx-auto mb-4">
            <Lock className="h-6 w-6 text-gold" />
          </div>
          <h1 className="font-serif text-2xl text-center font-medium">管理后台</h1>
          <p className="text-sm text-muted-foreground text-center mt-1.5 mb-6">
            请输入管理口令以继续
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pwd" className="text-xs text-muted-foreground">管理口令</Label>
              <Input
                id="pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入口令"
                autoFocus
                disabled={loading}
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? '验证中...' : '进入后台'}
              {!loading && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-border/60 text-center">
            <p className="text-xs text-muted-foreground mb-1">
              默认口令：<code className="px-1.5 py-0.5 rounded bg-muted text-gold font-mono">art2025</code>
            </p>
            <p className="text-[10px] text-muted-foreground/70">登录后可在「机构设置」中修改</p>
          </div>
        </div>

        <Link href="/" className="flex items-center justify-center gap-1.5 mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          返回展厅大厅
        </Link>
      </div>
    </main>
  )
}
