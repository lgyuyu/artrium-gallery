'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminState {
  password: string | null
  setAuthed: (pwd: string) => void
  logout: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      password: null,
      setAuthed: (pwd) => set({ password: pwd }),
      logout: () => set({ password: null }),
    }),
    {
      name: 'artium-admin',
    }
  )
)
