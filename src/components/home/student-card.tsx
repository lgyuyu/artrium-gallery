'use client'

import Link from 'next/link'
import { ArrowRight, ImageIcon } from 'lucide-react'
import { ShareDialog } from '@/components/share-dialog'

interface StudentCardProps {
  id: string
  name: string
  age: string | null
  bio: string | null
  coverImage: string | null
  artworkCount: number
  index?: number
}

export function StudentCard({ id, name, age, bio, coverImage, artworkCount, index = 0 }: StudentCardProps) {
  return (
    <div
      className="group relative bg-card rounded-xl overflow-hidden frame-shadow transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl animate-fade-in"
      style={{ animationDelay: `${index * 80}ms`, opacity: 0 }}
    >
      {/* 代表画作 */}
      <Link href={`/gallery/${id}`} className="block relative aspect-[4/5] overflow-hidden bg-muted">
        {coverImage ? (
          <img
            src={coverImage}
            alt={`${name}的代表画作`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-10 w-10 opacity-40" />
          </div>
        )}
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* 画作数量角标 */}
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs">
          {artworkCount} 幅作品
        </div>

        {/* 悬浮进入提示 */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium shadow-lg">
            进入展厅 <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>

      {/* 信息区 */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link href={`/gallery/${id}`}>
              <h3 className="font-serif text-2xl font-medium leading-tight hover:text-gold transition-colors">
                {name}
              </h3>
            </Link>
            {age && (
              <p className="text-sm text-gold mt-0.5 font-medium">{age}</p>
            )}
          </div>
          <ShareDialog
            studentId={id}
            studentName={name}
            coverImage={coverImage}
          />
        </div>

        {bio && (
          <p className="mt-2.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {bio}
          </p>
        )}

        <Link
          href={`/gallery/${id}`}
          className="mt-3 inline-flex items-center gap-1 text-sm text-foreground/80 hover:text-gold transition-colors group/link"
        >
          进入 3D 展厅
          <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
