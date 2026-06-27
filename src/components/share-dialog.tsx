'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Share2, Copy, Check, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ShareDialogProps {
  studentId: string
  studentName: string
  coverImage?: string | null
  trigger?: React.ReactNode
}

export function ShareDialog({ studentId, studentName, coverImage, trigger }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/gallery/${studentId}` : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('链接已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        toast.success('链接已复制')
        setTimeout(() => setCopied(false), 2000)
      } catch {
        toast.error('复制失败，请手动选择链接复制')
      }
      document.body.removeChild(textarea)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">分享画展</DialogTitle>
          <DialogDescription>
            将「{studentName}的线上画展」分享给家人朋友
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* 预览卡片 */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            {coverImage ? (
              <img src={coverImage} alt={studentName} className="w-14 h-14 rounded object-cover" />
            ) : (
              <div className="w-14 h-14 rounded bg-muted flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{studentName}的线上画展</p>
              <p className="text-xs text-muted-foreground truncate">艺境美术 ARTRIUM · 学生作品展示</p>
            </div>
          </div>

          {/* 链接 */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">专属链接</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 h-9 px-3 text-sm rounded-md border bg-background truncate"
                onFocus={(e) => e.target.select()}
              />
              <Button size="sm" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
          </div>

          {/* 微信提示 */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1 flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              微信分享小贴士
            </p>
            <p>在微信中打开本页面后，点击右上角「···」→「发送给朋友」或「分享到朋友圈」，即可一键分享给家人。</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
