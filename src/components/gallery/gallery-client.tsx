'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Share2, Info, X, MousePointerClick, Hand, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShareDialog } from '@/components/share-dialog'
import { ArtworkDetail } from './artwork-detail'
import type { Artwork3D } from './gallery-scene'

const GalleryScene = dynamic(
  () => import('./gallery-scene').then((m) => m.GalleryScene),
  {
    ssr: false,
    loading: () => <SceneLoading />,
  }
)

interface GalleryClientProps {
  student: {
    id: string
    name: string
    age: string | null
    bio: string | null
    style: string
  }
  artworks: Artwork3D[]
  orgName: string
  orgLogo: string
}

function SceneLoading() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-stone-100 to-stone-200">
      <div className="w-12 h-12 border-2 border-stone-300 border-t-[#b8895a] rounded-full animate-spin" />
      <p className="text-sm text-stone-600 font-serif">正在布置展厅...</p>
    </div>
  )
}

export function GalleryClient({ student, artworks, orgName, orgLogo }: GalleryClientProps) {
  const [selected, setSelected] = useState<Artwork3D | null>(null)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [showInfo, setShowInfo] = useState(true)
  const [showHint, setShowHint] = useState(true)
  const ready = isMobile !== null

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // 自动隐藏提示
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setShowHint(false), 8000)
    return () => clearTimeout(t)
  }, [ready])

  const style = (student.style === 'cozy' ? 'cozy' : 'modern') as 'modern' | 'cozy'

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      {/* 3D 场景 */}
      {ready && (
        <GalleryScene
          artworks={artworks}
          style={style}
          onSelect={setSelected}
          isMobile={isMobile as boolean}
        />
      )}

      {/* 顶部 header */}
      <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="bg-gradient-to-b from-black/60 to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between pointer-events-auto">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-sm hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">返回大厅</span>
            </Link>

            <div className="flex items-center gap-2.5 text-white">
              <div className="h-8 w-8 rounded-md bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                <img src={orgLogo} alt={`${orgName} logo`} className="h-7 w-7 object-contain" />
              </div>
              <div className="text-center leading-tight">
                <h1 className="font-serif text-base sm:text-lg font-semibold">
                  {student.name}的画展
                </h1>
                <p className="text-[10px] text-white/60 tracking-wider">
                  {orgName} · {style === 'modern' ? '现代简约画廊' : '温馨家居展厅'}
                </p>
              </div>
            </div>

            <ShareDialog
              studentId={student.id}
              studentName={student.name}
              coverImage={artworks[0]?.imageUrl}
              orgName={orgName}
              trigger={
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-sm hover:bg-white/20 transition-colors">
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">分享</span>
                </button>
              }
            />
          </div>
        </div>
      </header>

      {/* 左下 学生信息卡 */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-20 max-w-xs"
          >
            <div className="relative bg-black/55 backdrop-blur-md rounded-2xl p-4 sm:p-5 text-white border border-white/10">
              <button
                onClick={() => setShowInfo(false)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/15 transition-colors"
                aria-label="收起"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="text-[10px] tracking-[0.25em] uppercase text-gold mb-1">Artist</p>
              <h2 className="font-serif text-2xl font-medium">{student.name}</h2>
              {student.age && <p className="text-sm text-gold mt-0.5">{student.age}</p>}
              {student.bio && (
                <p className="mt-2 text-xs text-white/75 leading-relaxed line-clamp-4">{student.bio}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 信息卡收起后的展开按钮 */}
      {!showInfo && (
        <button
          onClick={() => setShowInfo(true)}
          className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/55 backdrop-blur-md text-white text-sm hover:bg-black/70 transition-colors"
        >
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">作者信息</span>
        </button>
      )}

      {/* 右下 操作提示 */}
      <AnimatePresence>
        {showHint && ready && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20"
          >
            <div className="relative bg-black/55 backdrop-blur-md rounded-2xl px-4 py-3 text-white border border-white/10 text-xs">
              <button
                onClick={() => setShowHint(false)}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                aria-label="关闭提示"
              >
                <X className="h-3 w-3" />
              </button>
              {isMobile ? (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-2"><Hand className="h-3.5 w-3.5 text-gold" /> 滑动屏幕转动视角</p>
                  <p className="flex items-center gap-2"><MousePointerClick className="h-3.5 w-3.5 text-gold" /> 点击画作查看大图</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-2"><Hand className="h-3.5 w-3.5 text-gold" /> 鼠标拖拽转动视角</p>
                  <p className="flex items-center gap-2"><Keyboard className="h-3.5 w-3.5 text-gold" /> W A S D / 方向键 移动</p>
                  <p className="flex items-center gap-2"><MousePointerClick className="h-3.5 w-3.5 text-gold" /> 点击画作查看大图</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 画作详情浮层 */}
      <ArtworkDetail artwork={selected} onClose={() => setSelected(null)} />
    </main>
  )
}
