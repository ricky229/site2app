import { useState, useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import { useAuthStore } from '../../store/authStore'
import { Toaster } from 'react-hot-toast'

export function DashboardLayout() {
    const { isAuthenticated, updateUser } = useAuthStore()
    const location = useLocation()
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('site2app_theme') === 'dark'
    })

    useEffect(() => {
        if (isAuthenticated) {
            import('../../lib/api').then(({ api }) => {
                api.get('/auth/me').then(res => {
                    if (res.data) updateUser(res.data)
                }).catch(() => {})
            })
        }
    }, [isAuthenticated, updateUser])

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        localStorage.setItem('site2app_theme', darkMode ? 'dark' : 'light')
    }, [darkMode])

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />
    }

    const isWizard = location.pathname.includes('/create') || (location.pathname.startsWith('/apps/') && location.pathname !== '/apps')

    return (
        <div className="h-[100dvh] bg-[var(--surface-0)] md:bg-[var(--surface-1)] overflow-hidden flex flex-col relative">
            <Sidebar />
            <motion.main
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex-1 overflow-y-auto ${!isWizard ? 'md:ml-64 pt-20 md:pt-0' : ''}`}
            >
                <Outlet />
            </motion.main>
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'var(--surface-0)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        fontSize: '15px',
                        fontWeight: 600,
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                    },
                }}
            />
        </div>
    )
}

export function AdminLayout() {
    const { user, isAuthenticated } = useAuthStore()
    const location = useLocation()
    const [darkMode] = useState(() => localStorage.getItem('site2app_theme') === 'dark')

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
    }, [darkMode])

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />
    }

    // SECURITY CHECK: If user is not admin, redirect to user dashboard
    if (user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />
    }

    // Admin gets a clean, full-width interface separated from the normal user sidebar
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Topbar specific for admin */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">Site2App</span>
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded ml-2">ADMIN</span>
                </div>
                <div>
                    <a href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
                        Quitter l'Admin
                    </a>
                </div>
            </div>

            <motion.main
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="pt-16 min-h-screen"
            >
                <Outlet />
            </motion.main>
            <Toaster position="top-center" />
        </div>
    )
}

export function AuthLayout() {
    const { isAuthenticated } = useAuthStore()
    const location = useLocation()
    const [darkMode] = useState(() => {
        return localStorage.getItem('site2app_theme') === 'dark'
    })

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

    if (isAuthenticated) {
        const from = (location.state as any)?.from?.pathname || '/dashboard'
        return <Navigate to={from} replace />
    }

    return (
        <div className="min-h-screen flex" style={{ background: 'var(--surface-0)' }}>
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12">
                <Outlet />
            </div>

            <div className="hidden md:flex w-1/2 bg-blue-600 relative overflow-hidden flex-col items-center justify-center p-12 text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-purple-800 opacity-90" />
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                
                <div className="relative z-10 text-center max-w-lg">
                    <div className="w-24 h-24 rounded-[2rem] bg-white/10 backdrop-blur-xl flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/20">
                        <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
                            <path d="M8 20L20 8L32 20L20 32L8 20Z" fill="currentColor" opacity="0.5" />
                            <path d="M14 20L20 14L26 20L20 26L14 20Z" fill="currentColor" />
                        </svg>
                    </div>
                    <h2 className="text-4xl font-black mb-4">Transformez votre site en App Mobile</h2>
                    <p className="text-blue-100 text-lg font-medium">Rejoignez des milliers de créateurs qui utilisent Site2App pour publier sur Android et iOS en quelques clics, sans aucune ligne de code.</p>
                </div>
            </div>
        </div>
    )
}
