'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, ExternalLink, User, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useAdminFetch, type StudentItem } from '@/lib/admin-hooks'

export function StudentsTab() {
  const { authFetch } = useAdminFetch()
  const [students, setStudents] = useState<StudentItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/students')
    const data = await res.json()
    setStudents(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    // 初始数据获取，标准模式，lint 误报
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-medium">学生管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">共 {students.length} 位学员</p>
        </div>
        <StudentDialog onSaved={load} trigger={
          <Button><Plus className="h-4 w-4 mr-1" /> 添加学生</Button>
        } />
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">加载中...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl">
          <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">还没有学生，点击右上角添加第一位</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((s) => (
            <div key={s.id} className="bg-card rounded-xl border p-4 flex gap-3 hover:shadow-md transition-shadow">
              <div className="w-16 h-20 rounded overflow-hidden bg-muted shrink-0">
                {s.coverImage ? (
                  <img src={s.coverImage} alt={s.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{s.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{s.age || '未填写班级'}</p>
                <p className="text-xs text-gold mt-0.5">{s.artworkCount} 幅作品 · {s.style === 'museum' ? '策展美术馆' : s.style === 'cozy' ? '温馨' : '简约'}</p>
                <div className="flex items-center gap-1 mt-2">
                  <StudentDialog student={s} onSaved={load} trigger={
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"><Pencil className="h-3 w-3" /></Button>
                  } />
                  <DeleteConfirm student={s} onDeleted={load} authFetch={authFetch} />
                  <Link href={`/gallery/${s.id}`} target="_blank">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"><ExternalLink className="h-3 w-3" /></Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ 添加/编辑学生 Dialog ============
function StudentDialog({
  student,
  onSaved,
  trigger,
}: {
  student?: StudentItem
  onSaved: () => void
  trigger: React.ReactNode
}) {
  const { authFetch } = useAdminFetch()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(student?.name ?? '')
  const [age, setAge] = useState(student?.age ?? '')
  const [bio, setBio] = useState(student?.bio ?? '')
  const [style, setStyle] = useState(student?.style ?? 'modern')
  const [loading, setLoading] = useState(false)

  const isEdit = !!student

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('请输入学生姓名')
      return
    }
    setLoading(true)
    try {
      const body = { name: name.trim(), age: age.trim() || null, bio: bio.trim() || null, style }
      const res = await authFetch(
        isEdit ? `/api/students/${student!.id}` : '/api/students',
        { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(body) }
      )
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '操作失败')
        return
      }
      toast.success(isEdit ? '已更新学生信息' : '已添加学生')
      setOpen(false)
      // 重置
      if (!isEdit) {
        setName(''); setAge(''); setBio(''); setStyle('modern')
      }
      onSaved()
    } catch {
      toast.error('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{isEdit ? '编辑学生' : '添加学生'}</DialogTitle>
          <DialogDescription>{isEdit ? '修改学生的基本信息和展厅风格' : '为机构添加一位新学员'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">姓名 *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：小明" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="age">年龄 / 班级</Label>
            <Input id="age" value={age} onChange={(e) => setAge(e.target.value)} placeholder="如：8岁 · 少儿启蒙班" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">简介</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="如：小明，8岁，学习画画2年，喜欢用画笔记录大自然的色彩。" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>展厅风格</Label>
            <RadioGroup value={style} onValueChange={setStyle} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label htmlFor={`style-modern-${isEdit ? 'e' : 'n'}`} className="flex items-start gap-2 p-3 rounded-lg border cursor-pointer hover:bg-accent/40 has-[:checked]:border-gold has-[:checked]:bg-accent/60">
                <RadioGroupItem value="modern" id={`style-modern-${isEdit ? 'e' : 'n'}`} className="mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">现代简约画廊</p>
                  <p className="text-xs text-muted-foreground mt-0.5">白墙 + 木地板，干净专业</p>
                </div>
              </label>
              <label htmlFor={`style-cozy-${isEdit ? 'e' : 'n'}`} className="flex items-start gap-2 p-3 rounded-lg border cursor-pointer hover:bg-accent/40 has-[:checked]:border-gold has-[:checked]:bg-accent/60">
                <RadioGroupItem value="cozy" id={`style-cozy-${isEdit ? 'e' : 'n'}`} className="mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">温馨家居风</p>
                  <p className="text-xs text-muted-foreground mt-0.5">暖墙 + 地毯，像家里的客厅</p>
                </div>
              </label>
              <label htmlFor={`style-museum-${isEdit ? 'e' : 'n'}`} className="flex items-start gap-2 p-3 rounded-lg border cursor-pointer hover:bg-accent/40 has-[:checked]:border-gold has-[:checked]:bg-accent/60">
                <RadioGroupItem value="museum" id={`style-museum-${isEdit ? 'e' : 'n'}`} className="mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">策展美术馆</p>
                  <p className="text-xs text-muted-foreground mt-0.5">迎宾墙 + 轨道灯，作品按真实比例展示</p>
                </div>
              </label>
            </RadioGroup>
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

// ============ 删除确认 ============
function DeleteConfirm({
  student,
  onDeleted,
  authFetch,
}: {
  student: StudentItem
  onDeleted: () => void
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const confirm = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/students/${student.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '删除失败')
        return
      }
      toast.success(`已删除「${student.name}」及其所有画作`)
      setOpen(false)
      onDeleted()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive">
          <Trash2 className="h-3 w-3" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除学生？</AlertDialogTitle>
          <AlertDialogDescription>
            即将删除「{student.name}」及其名下 {student.artworkCount} 幅画作，此操作不可撤销。
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
