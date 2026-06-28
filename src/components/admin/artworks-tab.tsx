'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Upload, ImageIcon, Loader2, ChevronUp, ChevronDown, GripVertical, Check, X } from 'lucide-react'
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

// ============ 上传画作 Dialog（支持批量） ============
interface UploadItem {
  file: File
  title: string
  preview: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

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
  const [items, setItems] = useState<UploadItem[]>([])
  const [artworkDate, setArtworkDate] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    // 释放预览 URL
    items.forEach((it) => URL.revokeObjectURL(it.preview))
    setItems([])
    setArtworkDate('')
    setDescription('')
    setDoneCount(0)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const newItems: UploadItem[] = []
    let rejected = 0
    for (const f of files) {
      if (!validTypes.includes(f.type)) { rejected++; continue }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} 超过 10MB，已跳过`)
        rejected++
        continue
      }
      newItems.push({
        file: f,
        title: f.name.replace(/\.[^.]+$/, ''),
        preview: URL.createObjectURL(f),
        status: 'pending',
      })
    }
    if (rejected > 0 && newItems.length === 0) {
      toast.error('所选文件均不符合要求')
    }
    setItems((prev) => [...prev, ...newItems])
    if (fileInputRef.current) fileInputRef.current.value = '' // 允许重复选同名
  }

  const removeItem = (idx: number) => {
    setItems((prev) => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const updateTitle = (idx: number, title: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, title } : it)))
  }

  // 逐个上传
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pending = items.filter((it) => it.status === 'pending' || it.status === 'error')
    if (pending.length === 0) {
      toast.error('请先选择图片')
      return
    }
    // 校验标题
    const noTitle = pending.find((it) => !it.title.trim())
    if (noTitle) {
      toast.error(`请为「${noTitle.file.name}」填写名称`)
      return
    }
    setUploading(true)
    setDoneCount(0)
    let success = 0
    let failed = 0
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.status === 'done') { success++; continue }
      if (it.status !== 'pending' && it.status !== 'error') continue
      // 标记上传中
      setItems((prev) => prev.map((x, j) => (j === i ? { ...x, status: 'uploading', error: undefined } : x)))
      try {
        const fd = new FormData()
        fd.append('file', it.file)
        fd.append('studentId', studentId)
        fd.append('title', it.title.trim())
        fd.append('artworkDate', artworkDate.trim())
        fd.append('description', description.trim())
        const res = await authFetch('/api/artworks', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || '上传失败')
        }
        setItems((prev) => prev.map((x, j) => (j === i ? { ...x, status: 'done' } : x)))
        success++
        setDoneCount(success)
      } catch (err) {
        const msg = err instanceof Error ? err.message : '上传失败'
        setItems((prev) => prev.map((x, j) => (j === i ? { ...x, status: 'error', error: msg } : x)))
        failed++
      }
    }
    setUploading(false)
    if (success > 0 && failed === 0) {
      toast.success(`成功上传 ${success} 幅画作`)
      setOpen(false)
      reset()
      onUploaded()
    } else if (success > 0 && failed > 0) {
      toast.success(`成功 ${success} 幅，失败 ${failed} 幅`)
      onUploaded()
    } else if (failed > 0) {
      toast.error(`上传失败 ${failed} 幅，请重试`)
    }
  }

  const allDone = items.length > 0 && items.every((it) => it.status === 'done')

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v && !uploading) reset() }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">上传画作</DialogTitle>
          <DialogDescription>支持批量选择 · JPG / PNG / WEBP · 单张不超过 10MB</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex-1 overflow-hidden flex flex-col gap-4 pt-2">
          {/* 文件选择区 */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={onFilesChange}
              className="hidden"
            />
            {items.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[16/7] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:border-gold hover:bg-accent/30 transition-colors"
              >
                <Upload className="h-9 w-9 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">点击选择图片（可多选）</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-2 rounded-lg border border-dashed flex items-center justify-center gap-2 hover:border-gold hover:bg-accent/30 transition-colors text-sm text-muted-foreground disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> 继续添加图片
              </button>
            )}
          </div>

          {/* 已选文件列表 */}
          {items.length > 0 && (
            <div className="flex-1 overflow-y-auto scrollbar-art space-y-2 max-h-64 pr-1">
              {items.map((it, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg border ${it.status === 'error' ? 'border-destructive/50 bg-destructive/5' : it.status === 'done' ? 'border-gold/50 bg-accent/30' : 'border-border'}`}>
                  <img src={it.preview} alt={it.title} className="w-12 h-16 object-cover rounded shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      value={it.title}
                      onChange={(e) => updateTitle(idx, e.target.value)}
                      disabled={uploading || it.status === 'done'}
                      placeholder="画作名称"
                      className="w-full h-7 px-2 text-sm rounded border bg-background disabled:opacity-60"
                    />
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground truncate">{(it.file.size / 1024 / 1024).toFixed(1)}MB</span>
                      {it.status === 'uploading' && <span className="text-gold flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> 上传中</span>}
                      {it.status === 'done' && <span className="text-gold flex items-center gap-1"><Check className="h-3 w-3" /> 已完成</span>}
                      {it.status === 'error' && <span className="text-destructive">{it.error}</span>}
                    </div>
                  </div>
                  {!uploading && it.status !== 'done' && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => removeItem(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 共享的日期和描述 */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs">创作时间（共用）</Label>
                <Input id="date" value={artworkDate} onChange={(e) => setArtworkDate(e.target.value)} placeholder="如：2025年5月" disabled={uploading} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs">描述（共用，可选）</Label>
                <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="选填" disabled={uploading} className="h-9" />
              </div>
            </div>
          )}

          {/* 进度提示 */}
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <Loader2 className="h-4 w-4 animate-spin text-gold" />
              正在上传 {doneCount} / {items.length}...
            </div>
          )}

          <DialogFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={() => { if (!uploading) { setOpen(false); reset() } }} disabled={uploading}>取消</Button>
            <Button type="submit" disabled={uploading || items.length === 0 || allDone}>
              {uploading ? `上传中 ${doneCount}/${items.length}` : allDone ? '全部完成' : `上传 ${items.filter(i => i.status === 'pending' || i.status === 'error').length} 幅`}
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
