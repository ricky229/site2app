import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthState } from '../types'

interface AuthStore extends AuthState {
    login: (user: User, token: string) => void
    logout: () => void
    updateUser: (updates: Partial<User>) => void
    setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,

            login: (user, token) => {
                localStorage.setItem('site2app_token', token)
                set({ user, token, isAuthenticated: true, isLoading: false })
            },

            logout: () => {
                localStorage.removeItem('site2app_token')
                localStorage.removeItem('site2app_user')
                set({ user: null, token: null, isAuthenticated: false })
            },

            updateUser: (updates) => set((state) => ({
                user: state.user ? { ...state.user, ...updates } : null,
            })),

            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'site2app_auth',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)
