'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Share2, Copy, Check, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ShareDialogProps {
  studentId: string
  studentName: string
  studentAge?: string | null
  coverImage?: string | null
  orgName?: string
  trigger?: React.ReactNode
}

export function ShareDialog({ studentId, studentName, studentAge, coverImage, orgName = '星玥艺术', trigger }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // 分享链接：首页带 student + share 参数（分享模式下隐藏返回按钮，看不到其他同学）
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?student=${studentId}&share=1`
    : ''

  // 年龄描述
  const ageDesc = studentAge ? `（${studentAge}）` : ''
  // 复制的完整文案：标题 + 描述 + 链接
  const shareText = `${studentName}的线上画展\n${orgName} · ${studentName}${ageDesc}的个人画展，欢迎观赏\n${shareUrl}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      toast.success('分享文案已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea')
      textarea.value = shareText
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        toast.success('分享文案已复制')
        setTimeout(() => setCopied(false), 2000)
      } catch {
        toast.error('复制失败，请手动复制')
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
              <p className="text-xs text-muted-foreground truncate">
                {orgName} · {studentName}{ageDesc}的个人画展，欢迎观赏
              </p>
            </div>
          </div>

          {/* 分享文案预览 */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">分享文案（点击复制）</label>
            <div
              className="relative p-3 rounded-md border bg-background text-sm whitespace-pre-line cursor-pointer hover:border-gold transition-colors"
              onClick={handleCopy}
            >
              <p className="font-medium">{studentName}的线上画展</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {orgName} · {studentName}{ageDesc}的个人画展，欢迎观赏
              </p>
              <p className="text-xs mt-1.5 text-gold break-all">{shareUrl}</p>
            </div>
            <Button size="sm" onClick={handleCopy} className="w-full mt-2">
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? '已复制' : '复制分享文案'}
            </Button>
          </div>

          {/* 微信提示 */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1 flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              微信分享小贴士
            </p>
            <p>复制文案后，粘贴到微信聊天框发送给家人朋友即可。对方点开链接直接进入该学生的画展，不会看到其他同学的作品。</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
