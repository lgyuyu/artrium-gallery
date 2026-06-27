'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Upload, ImageIcon, Loader2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminFetch, type StudentItem, type ArtworkItem } from '@/lib/admin-hooks'

export function ArtworksTab() {
  const { authFetch } = useAdminFetch()
  const [students, setStudents] = useState<StudentItem[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [artworks, setArtworks] = useState<ArtworkItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadStudents = useCallback(async () => {
    const res = await fetch('/api/students')
    const data = await res.json()
    setStudents(data)
    if (data.length > 0 && !selectedStudentId) {
      setSelectedStudentId(data[0].id)
    }
  }, [selectedStudentId])

  const loadArtworks = useCallback(async (sid: string) => {
    if (!sid) {
      setArtworks([])
      return
    }
    setLoading(true)
    const res = await fetch(`/api/students/${sid}`)
    const data = await res.json()
    setArtworks(data.artworks ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadStudents()
  }, [loadStudents])

  useEffect(() => {
    if (selectedStudentId) void loadArtworks(selectedStudentId)
  }, [selectedStudentId, loadArtworks])

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-medium">画作管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">为每位学生上传、排序、删除画作</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="选择学生" />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}（{s.artworkCount}）</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedStudentId && (
            <UploadDialog studentId={selectedStudentId} onUploaded={() => loadArtworks(selectedStudentId)} authFetch={authFetch} trigger={
              <Button><Plus className="h-4 w-4 mr-1" /> 上传画作</Button>
            } />
          )}
        </div>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">请先在「学生管理」中添加学生</p>
        </div>
      ) : !selectedStudentId ? (
        <div className="text-center py-16 text-muted-foreground text-sm">请选择一位学生</div>
      ) : loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">加载中...</div>
      ) : artworks.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">该学生还没有画作，点击右上角上传第一幅</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">共 {artworks.length} 幅 · 数字代表墙上展示顺序，可调整</p>
          {artworks.map((a, i) => (
            <div key={a.id} className="bg-card rounded-xl border p-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
              <div className="flex items-center text-muted-foreground/40 px-1">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="w-7 h-7 rounded-full bg-gold/15 text-gold flex items-center justify-center text-xs font-medium shrink-0">
                {i + 1}
              </div>
              <div className="w-14 h-18 rounded overflow-hidden bg-muted shrink-0" style={{ height: '4.5rem' }}>
                <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{a.title}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {a.artworkDate || '未填写日期'}
                  {a.description && ` · ${a.description}`}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost" size="sm" className="h-8 w-8 p-0"
                  disabled={i === 0}
                  onClick={() => moveArtwork(a, 'up')}
                  title="上移"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" size="sm" className="h-8 w-8 p-0"
                  disabled={i === artworks.length - 1}
                  onClick={() => moveArtwork(a, 'down')}
                  title="下移"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <ArtworkEditDialog artwork={a} onSaved={() => loadArtworks(selectedStudentId)} authFetch={authFetch} />
                <ArtworkDelete artwork={a} onDeleted={() => loadArtworks(selectedStudentId)} authFetch={authFetch} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  async function moveArtwork(artwork: ArtworkItem, dir: 'up' | 'down') {
    const idx = artworks.findIndex((a) => a.id === artwork.id)
    const newIdx = dir === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= artworks.length) return
    // 交换顺序
    const reordered = [...artworks]
    ;[reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]]
    // 立即更新UI
    setArtworks(reordered)
    // 提交新顺序
    try {
      await authFetch('/api/artworks/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ items: reordered.map((a, i) => ({ id: a.id, order: i })) }),
      })
      toast.success('顺序已更新')
    } catch {
      toast.error('保存顺序失败')
      loadArtworks(selectedStudentId) // 回滚
    }
  }
}

// ============ 上传画作 Dialog ============
function UploadDialog({
  studentId,
  onUploaded,
  trigger,
  authFetch,
}: {
  studentId: string
  onUploaded: () => void
  trigger: React.ReactNode
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [title, setTitle] = useState('')
  const [artworkDate, setArtworkDate] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null); setPreview(''); setTitle(''); setArtworkDate(''); setDescription('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)) {
      toast.error('仅支持 JPG/PNG/WEBP/GIF 格式')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    // 默认用文件名作标题
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('请选择图片')
      return
    }
    if (!title.trim()) {
      toast.error('请输入画作名称')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('studentId', studentId)
      fd.append('title', title.trim())
      fd.append('artworkDate', artworkDate.trim())
      fd.append('description', description.trim())
      const res = await authFetch('/api/artworks', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '上传失败')
        return
      }
      toast.success('画作已上传')
      setOpen(false)
      reset()
      onUploaded()
    } catch {
      toast.error('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">上传画作</DialogTitle>
          <DialogDescription>支持 JPG / PNG / WEBP，单张不超过 10MB</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          {/* 文件选择 + 预览 */}
          <div className="space-y-2">
            <Label>图片 *</Label>
            {preview ? (
              <div className="relative w-full aspect-[4/5] max-h-56 mx-auto rounded-lg overflow-hidden bg-muted border">
                <img src={preview} alt="预览" className="w-full h-full object-contain" />
                <Button
                  type="button" variant="secondary" size="sm"
                  className="absolute top-2 right-2 h-7"
                  onClick={() => { setFile(null); setPreview(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                >
                  重新选择
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/5] max-h-56 mx-auto rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:border-gold hover:bg-accent/30 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">点击选择图片</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFileChange} className="hidden" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">画作名称 *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：夕阳下的远山" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">创作时间</Label>
            <Input id="date" value={artworkDate} onChange={(e) => setArtworkDate(e.target.value)} placeholder="如：2025年5月" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">简短描述</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述这幅作品的创作背景或特点" rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> 上传中</> : '上传'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============ 编辑画作信息 ============
function ArtworkEditDialog({
  artwork,
  onSaved,
  authFetch,
}: {
  artwork: ArtworkItem
  onSaved: () => void
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(artwork.title)
  const [artworkDate, setArtworkDate] = useState(artwork.artworkDate ?? '')
  const [description, setDescription] = useState(artwork.description ?? '')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('请输入画作名称')
      return
    }
    setLoading(true)
    try {
      const res = await authFetch(`/api/artworks/${artwork.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: title.trim(),
          artworkDate: artworkDate.trim() || null,
          description: description.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '保存失败')
        return
      }
      toast.success('画作信息已更新')
      setOpen(false)
      onSaved()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">编辑画作</DialogTitle>
          <DialogDescription>修改画作名称、创作时间和描述</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="flex justify-center">
            <img src={artwork.imageUrl} alt={artwork.title} className="w-24 h-32 object-cover rounded border" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="etitle">画作名称 *</Label>
            <Input id="etitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edate">创作时间</Label>
            <Input id="edate" value={artworkDate} onChange={(e) => setArtworkDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edesc">简短描述</Label>
            <Textarea id="edesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============ 删除画作 ============
function ArtworkDelete({
  artwork,
  onDeleted,
  authFetch,
}: {
  artwork: ArtworkItem
  onDeleted: () => void
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const confirm = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/artworks/${artwork.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '删除失败')
        return
      }
      toast.success('画作已删除')
      setOpen(false)
      onDeleted()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除画作？</AlertDialogTitle>
          <AlertDialogDescription>
            即将删除「{artwork.title}」，此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? '删除中...' : '确认删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
