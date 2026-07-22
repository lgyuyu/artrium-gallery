'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Share2, Copy, Check, MessageCircle, ImageDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ShareDialogProps {
  studentId: string
  studentName: string
  studentAge?: string | null
  coverImage?: string | null
  orgName?: string
  orgLogo?: string
  trigger?: React.ReactNode
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  )
}

export function ShareDialog({
  studentId,
  studentName,
  studentAge,
  coverImage,
  orgName = '星玥艺术',
  orgLogo = '/logo-xingyue.png',
  trigger,
}: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [generatingPoster, setGeneratingPoster] = useState(false)
  const isWeChat = typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)

  // 直达学生展厅，避免分享抓取器停留在首页重定向响应。
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/gallery/${studentId}?share=1`
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

  const handleSavePoster = () => {
    if (!posterUrl) return
    if (isWeChat) {
      toast.info('请长按上方海报图片，选择“保存图片”')
      return
    }

    const link = document.createElement('a')
    link.href = posterUrl
    link.download = `${studentName}的线上画展.jpg`
    link.click()
  }

  const handleGeneratePoster = async () => {
    if (!shareUrl) return

    setGeneratingPoster(true)
    try {
      const [coverResult, logoResult, qrImage] = await Promise.all([
        coverImage ? loadImage(coverImage) : Promise.resolve(null),
        loadImage(orgLogo).catch(() => null),
        loadImage(`/api/share-qr?text=${encodeURIComponent(shareUrl)}`),
      ])

      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1440
      const context = canvas.getContext('2d')
      if (!context) throw new Error('浏览器不支持海报生成')

      context.fillStyle = '#f5f2ed'
      context.fillRect(0, 0, canvas.width, canvas.height)

      context.fillStyle = '#dfd8ce'
      context.fillRect(56, 56, 968, 900)
      context.fillStyle = '#ffffff'
      context.fillRect(72, 72, 936, 868)

      if (coverResult) {
        drawContainedImage(context, coverResult, 92, 92, 896, 828)
      } else {
        context.fillStyle = '#ebe7e0'
        context.fillRect(92, 92, 896, 828)
        context.fillStyle = '#8a8177'
        context.font = '36px sans-serif'
        context.textAlign = 'center'
        context.fillText('学生线上画展', 540, 510)
      }

      context.fillStyle = '#191816'
      context.fillRect(0, 980, 1080, 460)

      if (logoResult) {
        context.fillStyle = '#ffffff'
        context.fillRect(72, 1038, 96, 96)
        drawContainedImage(context, logoResult, 80, 1046, 80, 80)
      }

      context.textAlign = 'left'
      context.fillStyle = '#caa06d'
      context.font = '28px sans-serif'
      context.fillText(orgName, logoResult ? 192 : 72, 1082)
      context.fillStyle = '#ffffff'
      context.font = 'bold 58px serif'
      context.fillText(`${studentName}的线上画展`, 72, 1198)
      context.fillStyle = '#c9c4bc'
      context.font = '28px sans-serif'
      context.fillText('360° VR 沉浸式个人展厅', 72, 1254)
      context.fillText('长按识别二维码，进入展厅观展', 72, 1342)

      context.fillStyle = '#ffffff'
      context.fillRect(788, 1032, 228, 228)
      context.drawImage(qrImage, 800, 1044, 204, 204)
      context.fillStyle = '#c9c4bc'
      context.font = '22px sans-serif'
      context.textAlign = 'center'
      context.fillText('扫码进入展厅', 902, 1300)

      setPosterUrl(canvas.toDataURL('image/jpeg', 0.92))
    } catch (error) {
      console.error('[share-poster] 生成失败', error)
      toast.error('海报生成失败，请稍后重试')
    } finally {
      setGeneratingPoster(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-gold"
            aria-label="分享画展"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
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
            <Button
              size="sm"
              variant="outline"
              onClick={handleGeneratePoster}
              disabled={generatingPoster}
              className="w-full"
            >
              {generatingPoster ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ImageDown className="h-4 w-4 mr-1" />
              )}
              {generatingPoster ? '正在生成海报' : '生成朋友圈海报'}
            </Button>
          </div>

          {posterUrl && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {isWeChat ? '微信内请长按下方海报，选择“保存图片”' : '朋友圈海报（手机可长按图片保存）'}
              </p>
              <img
                src={posterUrl}
                alt={`${studentName}的线上画展分享海报`}
                className="w-full border bg-muted object-contain shadow-sm"
              />
              <Button size="sm" variant="outline" className="w-full" onClick={handleSavePoster}>
                <ImageDown className="h-4 w-4 mr-1" />
                {isWeChat ? '长按上方海报保存' : '保存海报'}
              </Button>
            </div>
          )}

          {/* 微信提示 */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1 flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              微信分享小贴士
            </p>
            <p>分享给好友可复制文案；分享到朋友圈建议生成海报，长按保存后发布。二维码会直接进入该学生的画展。</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
