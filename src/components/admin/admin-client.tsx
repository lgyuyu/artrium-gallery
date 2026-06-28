'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Users, Image as ImageIcon, Settings, ArrowLeft, ExternalLink } from 'lucide-react'
import { useAdminStore } from '@/lib/admin-store'
import { AdminLogin } from './admin-login'
import { StudentsTab } from './students-tab'
import { ArtworksTab } from './artworks-tab'
import { OrgTab } from './org-tab'

export function AdminClient({ orgName, orgLogo }: { orgName: string; orgLogo: string }) {
  const password = useAdminStore((s) => s.password)
  const logout = useAdminStore((s) => s.logout)
  // 处理 zustand persist hydration：客户端挂载后才读 store
  const [hydrated, setHydrated] = useState(false)
  const [tab, setTab] = useState('students')

  useEffect(() => {
    // hydration 标记，标准模式，lint 误报
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true)
  }, [])

  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        加载中...
      </main>
    )
  }

  if (!password) {
    return <AdminLogin orgLogo={orgLogo} orgName={orgName} />
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/85 border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-12 w-12 rounded-lg bg-white shadow-sm border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
                <img src={orgLogo} alt={`${orgName} logo`} className="h-10 w-10 object-contain" />
              </div>
              <div className="leading-tight">
                <p className="font-serif text-xl font-semibold tracking-wide">{orgName}</p>
                <p className="text-[10px] text-muted-foreground tracking-[0.25em] uppercase mt-0.5">Admin Console</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold transition-colors px-3 py-1.5 rounded-md hover:bg-accent/50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              查看大厅
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors px-3 py-1.5 rounded-md hover:bg-accent/50"
            >
              <Lock className="h-3.5 w-3.5" />
              退出登录
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent/50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回首页
            </Link>
          </div>
        </div>
      </header>

      {/* 内容区 */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-8 h-auto p-1">
            <TabsTrigger value="students" className="flex items-center gap-1.5 py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">学生管理</span>
              <span className="sm:hidden">学生</span>
            </TabsTrigger>
            <TabsTrigger value="artworks" className="flex items-center gap-1.5 py-2">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">画作管理</span>
              <span className="sm:hidden">画作</span>
            </TabsTrigger>
            <TabsTrigger value="org" className="flex items-center gap-1.5 py-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">机构设置</span>
              <span className="sm:hidden">设置</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="students"><StudentsTab /></TabsContent>
          <TabsContent value="artworks"><ArtworksTab /></TabsContent>
          <TabsContent value="org"><OrgTab /></TabsContent>
        </Tabs>
      </div>

      {/* 页脚 */}
      <footer className="mt-auto border-t border-border/60 bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-center text-xs text-muted-foreground">
          {orgName} · 管理后台 · 当前口令已验证
        </div>
      </footer>
    </main>
  )
}
