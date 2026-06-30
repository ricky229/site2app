import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    LayoutDashboard, Smartphone, Bell, BarChart2, Settings,
    Shield, Plus, Zap
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
    { path: '/apps', icon: Smartphone, label: 'Apps' },
    { path: '/notifications', icon: Bell, label: 'Push' },
    { path: '/analytics', icon: BarChart2, label: 'Stats' },
    { path: '/settings', icon: Settings, label: 'Profil' },
]

export default function Sidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-64 bg-[var(--surface-0)] border-r border-[var(--border)] z-50">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                        <Zap size={20} fill="currentColor" />
                    </div>
                    <div>
                        <span className="font-black text-xl tracking-tight text-[var(--text-primary)]">Site2App</span>
                    </div>
                </div>

                <div className="px-4 mb-6">
                    <button
                        onClick={() => navigate('/apps/create')}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:shadow-blue-500/20"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Créer une App
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
                    {navItems.map(item => {
                        const active = location.pathname.startsWith(item.path)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                                    active 
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' 
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}

                    {user?.role === 'admin' && (
                        <div className="pt-6 mt-6 border-t border-[var(--border)]">
                            <p className="px-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Admin</p>
                            <Link
                                to="/admin"
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                                    location.pathname.startsWith('/admin')
                                    ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <Shield size={20} />
                                <span>Admin Panel</span>
                            </Link>
                        </div>
                    )}
                </nav>
            </aside>

            {/* Mobile Top Bar */}
            <div className={`md:hidden fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-[var(--surface-0)]/80 backdrop-blur-xl border-b border-[var(--border)] shadow-sm' : 'bg-transparent'}`}>
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 text-white shadow-md">
                            <Zap size={16} fill="currentColor" />
                        </div>
                        <span className="font-black text-lg tracking-tight text-[var(--text-primary)]">Site2App</span>
                    </div>
                    <button
                        onClick={() => navigate('/apps/create')}
                        className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 rounded-full"
                    >
                        <Plus size={18} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface-0)]/90 backdrop-blur-xl border-t border-[var(--border)] z-50 pb-safe">
                <div className="flex items-center justify-around p-2">
                    {navItems.map(item => {
                        const active = location.pathname.startsWith(item.path)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center justify-center w-16 p-1 rounded-xl transition-all ${
                                    active ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--text-muted)]'
                                }`}
                            >
                                <div className={`flex items-center justify-center w-10 h-8 rounded-full mb-1 transition-colors ${active ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-transparent'}`}>
                                    <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                                </div>
                                <span className="text-[10px] font-semibold">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </>
    )
}
