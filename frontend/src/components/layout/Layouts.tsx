import { useState, useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import { useAuthStore } from '../../store/authStore'
import { Toaster } from 'react-hot-toast'

export function DashboardLayout() {
    const { isAuthenticated } = useAuthStore()
    const location = useLocation()
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('site2app_theme') === 'dark'
    })

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
        <div className="min-h-screen bg-[var(--surface-0)] md:bg-[var(--surface-1)]">
            <Sidebar />
            <motion.main
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                // md:ml-64 makes room for the sidebar on desktop
                // pt-16 makes room for the top bar on mobile
                // pb-24 makes room for the bottom nav on mobile
                // md:pt-0 and md:pb-8 resets padding on desktop
                className={`md:ml-64 min-h-screen flex flex-col ${isWizard ? '' : 'pt-16 pb-24 md:pt-0 md:pb-8'}`}
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
