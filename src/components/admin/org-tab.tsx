'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Building2, Save, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminFetch } from '@/lib/admin-hooks'
import { useAdminStore } from '@/lib/admin-store'

export function OrgTab() {
  const { authFetch } = useAdminFetch()
  const logout = useAdminStore((s) => s.logout)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // 表单字段
  const [name, setName] = useState('')
  const [slogan, setSlogan] = useState('')
  const [logo, setLogo] = useState('')
  const [defaultStyle, setDefaultStyle] = useState('modern')
  const [newPassword, setNewPassword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/organization')
    const data = await res.json()
    setName(data.name ?? '')
    setSlogan(data.slogan ?? '')
    setLogo(data.logo ?? '')
    setDefaultStyle(data.defaultStyle ?? 'modern')
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('机构名称不能为空')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        slogan: slogan.trim() || null,
        logo: logo.trim() || null,
        defaultStyle,
      }
      if (newPassword.trim()) body.adminPassword = newPassword.trim()
      const res = await authFetch('/api/organization', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '保存失败')
        return
      }
      toast.success('机构设置已保存')
      setNewPassword('')
      if (newPassword.trim()) {
        // 口令改了，需重新登录
        setTimeout(() => {
          logout()
          window.location.reload()
        }, 1200)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-16 text-muted-foreground text-sm">加载中...</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-serif text-2xl font-medium">机构设置</h2>
        <p className="text-sm text-muted-foreground mt-0.5">管理机构信息、默认展厅风格和管理口令</p>
      </div>

      <form onSubmit={save} className="space-y-5 bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 pb-3 border-b">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <Building2 className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="font-medium">基本信息</p>
            <p className="text-xs text-muted-foreground">显示在首页和展厅中</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="oname">机构名称 *</Label>
          <Input id="oname" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：艺境美术 ARTRIUM" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="oslogan">副标题 / Slogan</Label>
          <Textarea id="oslogan" value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="如：让每个孩子都拥有属于自己的画展" rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ologo">Logo 路径</Label>
          <Input id="ologo" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="/logo-artium.png" />
          {logo && (
            <div className="flex items-center gap-2 mt-1.5">
              <img src={logo} alt="logo预览" className="h-10 w-10 rounded object-contain border" />
              <span className="text-xs text-muted-foreground">预览</span>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2">
          <Label>默认展厅风格</Label>
          <p className="text-xs text-muted-foreground -mt-1">新创建学生时默认使用此风格（已建学生可在「学生管理」单独修改）</p>
          <RadioGroup value={defaultStyle} onValueChange={setDefaultStyle} className="grid grid-cols-2 gap-3">
            <label htmlFor="ds-modern" className="flex items-start gap-2 p-3 rounded-lg border cursor-pointer hover:bg-accent/40 has-[:checked]:border-gold has-[:checked]:bg-accent/60">
              <RadioGroupItem value="modern" id="ds-modern" className="mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">现代简约画廊</p>
                <p className="text-xs text-muted-foreground mt-0.5">白墙 + 木地板</p>
              </div>
            </label>
            <label htmlFor="ds-cozy" className="flex items-start gap-2 p-3 rounded-lg border cursor-pointer hover:bg-accent/40 has-[:checked]:border-gold has-[:checked]:bg-accent/60">
              <RadioGroupItem value="cozy" id="ds-cozy" className="mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">温馨家居风</p>
                <p className="text-xs text-muted-foreground mt-0.5">暖墙 + 地毯</p>
              </div>
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-1.5 pt-3 border-t">
          <Label htmlFor="npwd">修改管理口令</Label>
          <p className="text-xs text-muted-foreground -mt-1">留空则不修改。修改后将自动退出，需用新口令重新登录</p>
          <Input id="npwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="输入新口令（留空保持不变）" />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </form>

      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">退出登录</p>
            <p className="text-xs text-muted-foreground mt-0.5">退出当前管理后台会话</p>
          </div>
          <Button variant="outline" onClick={() => { logout(); window.location.reload() }}>
            <LogOut className="h-4 w-4 mr-1" /> 退出
          </Button>
        </div>
      </div>
    </div>
  )
}
