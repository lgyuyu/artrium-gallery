import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync, unlinkSync } from 'fs'
import path from 'path'

// ============ 持久化数据保护 ============
// 问题: 项目目录 /home/z/my-project 在重新发布时会被重建，
//       导致其中的 db/custom.db 数据库丢失，上传的画作全部消失。
// 方案: 数据库存到持久目录 /home/z/.local/artium-data/，
//       并自动备份到多个位置，启动时自动迁移和恢复。

const PERSIST_DIR = '/home/z/.local/artium-data'
const PERSIST_DB = path.join(PERSIST_DIR, 'custom.db')
const BACKUP_DIR = path.join(PERSIST_DIR, 'backups')

// 旧数据库位置（项目目录内，发布会丢）
const OLD_DB = path.join(process.cwd(), 'db', 'custom.db')

// 备份保留数量
const MAX_BACKUPS = 5

/**
 * 初始化持久数据目录
 * - 创建持久目录
 * - 如果持久位置没数据库但旧位置有，自动迁移
 */
export function ensurePersistentDB() {
  try {
    // 1. 确保持久目录存在
    if (!existsSync(PERSIST_DIR)) {
      mkdirSync(PERSIST_DIR, { recursive: true })
    }
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true })
    }

    // 2. 如果持久位置没有数据库，但旧位置有，自动迁移
    if (!existsSync(PERSIST_DB) && existsSync(OLD_DB)) {
      console.log('[数据保护] 检测到旧数据库，迁移到持久位置...')
      copyFileSync(OLD_DB, PERSIST_DB)
      console.log('[数据保护] 迁移完成:', PERSIST_DB)
    }

    // 3. 如果持久位置有数据库，同时复制回项目目录（兼容某些需要项目内 db 的场景）
    if (existsSync(PERSIST_DB)) {
      const projectDbDir = path.join(process.cwd(), 'db')
      if (!existsSync(projectDbDir)) {
        mkdirSync(projectDbDir, { recursive: true })
      }
      // 只有当项目内 db 不存在或更旧时才复制
      const projectDb = path.join(projectDbDir, 'custom.db')
      if (!existsSync(projectDb)) {
        copyFileSync(PERSIST_DB, projectDb)
      }
    }
  } catch (e) {
    console.error('[数据保护] 初始化失败:', e)
  }
}

/**
 * 备份数据库
 * 在数据变更后调用，保留最近 MAX_BACKUPS 个备份
 */
export function backupDB() {
  try {
    if (!existsSync(PERSIST_DB)) return
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(BACKUP_DIR, `custom-${timestamp}.db`)
    copyFileSync(PERSIST_DB, backupFile)
    console.log('[数据保护] 已备份:', backupFile)

    // 清理旧备份，只保留最近 MAX_BACKUPS 个
    const backups = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('custom-') && f.endsWith('.db'))
      .map((f) => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        mtime: statSync(path.join(BACKUP_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime)

    // 删除多余备份
    for (let i = MAX_BACKUPS; i < backups.length; i++) {
      try {
        unlinkSync(backups[i].path)
        console.log('[数据保护] 清理旧备份:', backups[i].name)
      } catch {}
    }
  } catch (e) {
    console.error('[数据保护] 备份失败:', e)
  }
}

/**
 * 检查数据库是否为空（无任何数据表或表为空）
 * 如果为空且备份存在，自动从最新备份恢复
 */
export function recoverIfEmpty() {
  try {
    if (!existsSync(PERSIST_DB)) {
      console.log('[数据保护] 持久数据库不存在，尝试从备份恢复...')
      restoreFromBackup()
      return
    }

    const stat = statSync(PERSIST_DB)
    // 数据库文件小于 10KB 视为空（正常有数据的库至少几十KB）
    if (stat.size < 10240) {
      console.log('[数据保护] 数据库文件过小(', stat.size, 'bytes)，可能为空，尝试从备份恢复...')
      restoreFromBackup()
    }
  } catch (e) {
    console.error('[数据保护] 恢复检查失败:', e)
  }
}

/**
 * 从最新的备份恢复数据库
 */
function restoreFromBackup() {
  try {
    if (!existsSync(BACKUP_DIR)) {
      console.log('[数据保护] 无备份目录')
      return
    }
    const backups = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('custom-') && f.endsWith('.db'))
      .map((f) => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        mtime: statSync(path.join(BACKUP_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime)

    if (backups.length === 0) {
      console.log('[数据保护] 无可用备份')
      return
    }

    const latest = backups[0]
    copyFileSync(latest.path, PERSIST_DB)
    console.log('[数据保护] 已从备份恢复:', latest.name)

    // 同步到项目目录
    const projectDbDir = path.join(process.cwd(), 'db')
    if (!existsSync(projectDbDir)) {
      mkdirSync(projectDbDir, { recursive: true })
    }
    copyFileSync(PERSIST_DB, path.join(projectDbDir, 'custom.db'))
  } catch (e) {
    console.error('[数据保护] 恢复失败:', e)
  }
}
