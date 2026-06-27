'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, ExternalLink, ZoomIn } from 'lucide-react'
import type { Artwork3D } from './gallery-scene'

interface ArtworkDetailProps {
  artwork: Artwork3D | null
  onClose: () => void
}

export function ArtworkDetail({ artwork, onClose }: ArtworkDetailProps) {
  const [zoomed, setZoomed] = useState(false)

  // ESC 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomed) setZoomed(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, zoomed])

  // 锁定滚动
  useEffect(() => {
    if (artwork) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [artwork])

  return (
    <AnimatePresence>
      {artwork && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-md"
          onClick={onClose}
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">关闭</span>
            <span className="text-xs opacity-60 ml-1">ESC</span>
          </button>

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col sm:flex-row gap-6 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 大图 */}
            <div className="relative flex-1 min-h-0 flex items-center justify-center">
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                onClick={() => setZoomed(true)}
                className="max-h-[55vh] sm:max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl cursor-zoom-in"
                style={{ boxShadow: '0 0 0 8px #fff, 0 0 0 10px #b8895a, 0 20px 60px rgba(0,0,0,0.6)' }}
              />
              <button
                onClick={() => setZoomed(true)}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs hover:bg-black/80 transition-colors"
              >
                <ZoomIn className="h-3.5 w-3.5" /> 查看原图
              </button>
            </div>

            {/* 信息 */}
            <div className="sm:w-72 shrink-0 text-white text-center sm:text-left">
              <p className="text-xs tracking-[0.25em] uppercase text-gold mb-2">Artwork</p>
              <h2 className="font-serif text-3xl sm:text-4xl font-medium leading-tight">{artwork.title}</h2>
              <div className="h-px w-12 bg-gold/60 my-4 mx-auto sm:mx-0" />
              {artwork.artworkDate && (
                <p className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-white/70 mb-3">
                  <Calendar className="h-3.5 w-3.5" />
                  {artwork.artworkDate}
                </p>
              )}
              {artwork.description && (
                <p className="text-sm text-white/80 leading-relaxed">{artwork.description}</p>
              )}
              <a
                href={artwork.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-gold transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                在新标签打开原图
              </a>
            </div>
          </motion.div>

          {/* 缩放原图查看 */}
          <AnimatePresence>
            {zoomed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-20 bg-black flex items-center justify-center p-2"
                onClick={() => setZoomed(false)}
              >
                <img
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  className="max-w-full max-h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => setZoomed(false)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
