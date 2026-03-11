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
        <div className="main-layout">
            <Sidebar darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />
            <motion.main
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`main-content flex-1 min-w-0 ${isWizard ? '' : 'pt-20 md:pt-0'}`}
                style={{ background: 'var(--surface-1)', minHeight: '100vh', paddingBottom: '2rem' }}
            >
                <Outlet />
            </motion.main>
            <Toaster
                position="bottom-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'var(--surface-0)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: 500,
                        boxShadow: 'var(--shadow-xl)',
                    },
                }}
            />
        </div>
    )
}

export function AuthLayout() {
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
    }, [darkMode])

    if (isAuthenticated) {
        const from = (location.state as any)?.from?.pathname || '/dashboard'
        return <Navigate to={from} replace />
    }

    return (
        <div className="min-h-screen flex" style={{ background: 'var(--surface-0)' }}>
            {/* Left: Form */}
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8">
                <Outlet />
            </div>

            {/* Right: Visual */}
            <div className="hidden md:flex w-1/2 hero-bg gradient-mesh items-center justify-center p-12 relative overflow-hidden">
                <div className="hero-grid" />
                <div className="relative z-10 text-center">
                    <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6 animate-float"
                        style={{ boxShadow: 'var(--shadow-glow)' }}>
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                            <path d="M8 20L20 8L32 20L20 32L8 20Z" fill="rgba(255,255,255,0.3)" />
                            <path d="M14 20L20 14L26 20L20 26L14 20Z" fill="white" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold mb-4 gradient-text">Site2App</h1>
                    <p className="text-xl mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Transformez votre site web
                    </p>
                    <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        en application mobile native
                    </p>
                    <p className="mt-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        Sans code. Sans Android Studio. Sans Xcode.
                        Juste votre URL et quelques clics.
                    </p>

                    {/* Feature chips */}
                    <div className="flex flex-wrap justify-center gap-2 mt-8">
                        {['Android APK', 'iOS IPA', 'Push Notifications', 'Mode hors-ligne', 'Analytics', 'OTA Updates'].map(f => (
                            <span
                                key={f}
                                className="px-3 py-1 rounded-full text-sm font-medium"
                                style={{
                                    background: 'rgba(52,97,245,0.12)',
                                    color: 'var(--brand-500)',
                                    border: '1px solid rgba(52,97,245,0.2)',
                                }}
                            >
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Floating cards */}
                <div className="absolute top-16 right-16 card p-3 animate-float" style={{ animationDelay: '0.5s', maxWidth: '180px' }}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
                            <span className="text-white text-xs font-bold">APK</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>myapp.apk</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Prêt à télécharger</p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-24 left-16 card p-3 animate-float" style={{ animationDelay: '1s', maxWidth: '180px' }}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg" style={{ background: '#10b98120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#10b981', fontSize: '1rem' }}>✓</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Build terminé</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>en 3 minutes</p>
                        </div>
                    </div>
                </div>
            </div>
            <Toaster position="bottom-right" />
        </div>
    )
}

export function PublicLayout() {
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('site2app_theme') === 'dark'
    })

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

    return (
        <>
            <Outlet />
            <Toaster position="bottom-right" />
        </>
    )
}
