import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, Smartphone, Bell, BarChart2, Settings,
    Shield, LogOut, Plus, ChevronRight, Moon, Sun, Menu, X,
    Zap, User as UserIcon, HelpCircle, ExternalLink
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getInitials } from '../../lib/utils'

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/apps', icon: Smartphone, label: 'Mes Apps' },
    { path: '/notifications', icon: Bell, label: 'Notifications Push' },
    { path: '/analytics', icon: BarChart2, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Paramètres' },
]

const adminItems = [
    { path: '/admin', icon: Shield, label: 'Admin Panel' },
]

interface SidebarProps {
    darkMode: boolean
    onToggleDark: () => void
}

export default function Sidebar({ darkMode, onToggleDark }: SidebarProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuthStore()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    const handleLogout = () => {
        logout()
        navigate('/auth/login')
    }

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="p-5 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center gradient-brand flex-shrink-0">
                    <Zap size={18} color="white" />
                </div>
                {!collapsed && (
                    <div>
                        <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Site2App</span>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Web → Mobile
                        </div>
                    </div>
                )}
            </div>

            {/* New App Button */}
            <div className="p-4">
                <button
                    onClick={() => navigate('/apps/create')}
                    className="btn btn-primary w-full"
                    style={{ gap: '0.5rem', justifyContent: collapsed ? 'center' : 'flex-start' }}
                >
                    <Plus size={16} />
                    {!collapsed && 'Nouvelle App'}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                {navItems.map(item => {
                    const active = location.pathname.startsWith(item.path)
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-item ${active ? 'active' : ''}`}
                            title={collapsed ? item.label : ''}
                            onClick={() => setMobileOpen(false)}
                        >
                            <item.icon size={18} className="flex-shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                            {!collapsed && active && <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--brand-500)' }} />}
                        </Link>
                    )
                })}

                {user?.role === 'admin' && (
                    <>
                        <div className="my-3 px-2">
                            <div className="divider" />
                            {!collapsed && <p className="text-xs font-semibold mt-3 mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Administration</p>}
                        </div>
                        {adminItems.map(item => {
                            const active = location.pathname.startsWith(item.path)
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`sidebar-item ${active ? 'active' : ''}`}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <item.icon size={18} className="flex-shrink-0" />
                                    {!collapsed && <span>{item.label}</span>}
                                </Link>
                            )
                        })}
                    </>
                )}
            </nav>

            {/* Bottom Actions */}
            <div className="p-3 border-t space-y-0.5" style={{ borderColor: 'var(--border)' }}>
                <button
                    onClick={onToggleDark}
                    className="sidebar-item w-full"
                >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    {!collapsed && <span>{darkMode ? 'Mode clair' : 'Mode sombre'}</span>}
                </button>
                <Link to="/help" className="sidebar-item" onClick={() => setMobileOpen(false)}>
                    <HelpCircle size={18} />
                    {!collapsed && 'Aide & Support'}
                </Link>
            </div>

            {/* User Profile */}
            <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                    onClick={() => {
                        navigate('/settings/profile');
                        setMobileOpen(false);
                    }}>
                    <div className="avatar w-9 h-9 text-sm flex-shrink-0">
                        {user?.avatar ? (
                            <img src={user.avatar} alt={user?.name} className="w-9 h-9 rounded-full" />
                        ) : (
                            <div className="w-9 h-9 rounded-full avatar flex items-center justify-center text-sm">
                                {getInitials(user?.name || 'U')}
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                            <p className="text-xs truncate capitalize" style={{ color: 'var(--text-muted)' }}>{user?.plan} plan</p>
                        </div>
                    )}
                    {!collapsed && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLogout() }}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Déconnexion"
                        >
                            <LogOut size={15} style={{ color: '#ef4444' }} />
                        </button>
                    )}
                </div>
            </div>
        </>
    )

    return (
        <>
            {/* Mobile backdrop */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-30 md:hidden"
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Mobile Top Navbar (hidden on wizard to prevent overlap with wizard header) */}
            {!(location.pathname.includes('/create') || (location.pathname.startsWith('/apps/') && location.pathname !== '/apps')) && (
                <div className="md:hidden fixed top-0 left-0 right-0 h-16 z-40 px-4 flex items-center justify-between border-b shadow-sm"
                    style={{ background: 'var(--surface-0)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <button
                            className="p-2 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
                            onClick={() => setMobileOpen(!mobileOpen)}
                        >
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-brand flex-shrink-0">
                                <Zap size={16} color="white" />
                            </div>
                            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Site2App</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            <motion.aside
                className="sidebar hidden md:flex flex-col"
                animate={{ width: collapsed ? 72 : 260 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
            >
                <SidebarContent />

                {/* Collapse button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center border"
                    style={{ background: 'var(--surface-0)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)', zIndex: 10 }}
                >
                    <ChevronRight
                        size={14}
                        style={{
                            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                            transition: 'transform 0.25s',
                            color: 'var(--text-muted)',
                        }}
                    />
                </button>
            </motion.aside>

            {/* Mobile sidebar */}
            <motion.aside
                className="sidebar flex md:hidden flex-col"
                initial={false}
                animate={{ x: mobileOpen ? 0 : -280 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ zIndex: 40 }}
            >
                <SidebarContent />
            </motion.aside>
        </>
    )
}
