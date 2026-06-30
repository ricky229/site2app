import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Plus, Smartphone, Download, Users, Zap, Bell,
    Clock, Loader2, BarChart2, ArrowRight,
    Settings, ChevronRight, Package, Layout
} from 'lucide-react'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useAuthStore } from '../store/authStore'
import { formatRelativeTime, formatNumber, platformLabel } from '../lib/utils'
import { useQuery } from '@tanstack/react-query'
import type { DashboardStats } from '../types'
import { getAppsByUser } from '../lib/api'

async function fetchStats(userId: string): Promise<DashboardStats> {
    const defaultStats = {
        totalApps: 0,
        totalDownloads: 0,
        activeUsers: 0,
        totalBuilds: 0,
        pendingBuilds: 0,
        storageUsed: 0,
        storageLimit: 1024 * 1024 * 1024,
    }
    if (!userId) return defaultStats;
    try {
        const apps = await getAppsByUser(userId)
        let totalDownloads = 0
        let activeUsers = 0
        let pendingBuilds = 0
        const appList = Array.isArray(apps) ? apps : []
        appList.forEach((app: any) => {
            totalDownloads += app.downloadCount || 0
            activeUsers += app.activeUsers || 0
            if (app.status === 'building') pendingBuilds++
        })
        return {
            totalApps: appList.length,
            totalDownloads,
            activeUsers,
            totalBuilds: appList.length,
            pendingBuilds,
            storageUsed: 0,
            storageLimit: 1024 * 1024 * 1024,
        }
    } catch {
        return defaultStats
    }
}

async function fetchBuilds(userId: string): Promise<any[]> {
    if (!userId) return [];
    try {
        const data = await getAppsByUser(userId);
        return (Array.isArray(data) ? data : []).map((b: any) => ({
            id: b._id || b.id || '0',
            name: b.appName || b.name || 'Sans nom',
            url: b.url || '',
            status: b.status || 'pending',
            platform: b.platform || 'android',
            version: b.version || '1.0',
            downloadCount: b.downloadCount || 0,
            activeUsers: b.activeUsers || 0,
            lastBuiltAt: b['Created Date'] || b.startedAt || b.lastBuiltAt,
            apkUrl: b.apkFile || (b.status === 'completed' ? `/node/download/${b._id}` : undefined),
            icon: b.icon || null,
        }))
    } catch {
        return []
    }
}

const PremiumStatCard = ({ title, value, icon: Icon, color, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl p-6 border group"
        style={{
            background: 'var(--surface-1)',
            borderColor: 'var(--border)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
        }}
    >
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 group-hover:scale-150 group-hover:opacity-20 transition-all duration-700 blur-2xl"
            style={{ background: color }} />
        
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md text-white"
                style={{ background: `linear-gradient(135deg, ${color}dd, ${color})` }}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
        </div>
        <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                {value}
            </h3>
            <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                {title}
            </p>
        </div>
    </motion.div>
)

const PremiumAppCard = ({ app, delay }: any) => {
    const navigate = useNavigate()
    const colors: Record<string, string> = {
        '1': '#3461f5', '2': '#7c3aed', '3': '#10b981',
    }
    const color = colors[app.id] || '#3461f5'

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => navigate(`/apps/${app.id}`)}
            className="group cursor-pointer rounded-3xl p-5 md:p-6 relative overflow-hidden"
            style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.03)'
            }}
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500"
                 style={{ background: `linear-gradient(135deg, ${color}, transparent)` }} />
                 
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
                        {app.icon ? (
                            <img src={app.icon.startsWith('//') ? 'https:' + app.icon : app.icon} alt="App icon" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                            <span className="text-2xl">{(app.name || 'A').slice(0, 2).toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <h3 className="font-extrabold text-xl text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">{app.name}</h3>
                        <p className="text-sm font-medium text-[var(--text-muted)] mt-1">{app.url}</p>
                    </div>
                </div>
                <StatusBadge status={app.status} />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
                {[
                    { label: 'Téléchargements', value: formatNumber(app.downloadCount), icon: Download },
                    { label: 'Utilisateurs', value: formatNumber(app.activeUsers), icon: Users },
                    { label: 'Version', value: app.version, icon: Package },
                ].map((s, i) => (
                    <div key={i} className="rounded-2xl p-3 md:p-4 text-center border border-[var(--border)]" style={{ background: 'var(--surface-2)' }}>
                        <p className="text-xl md:text-2xl font-black text-[var(--text-primary)] mb-1">{s.value}</p>
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between relative z-10 pt-5 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
                    <Clock size={16} />
                    {app.lastBuiltAt ? formatRelativeTime(app.lastBuiltAt) : 'Jamais buildé'}
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-[var(--surface-2)] text-[var(--text-secondary)] tracking-wide">
                        {platformLabel(app.platform)}
                    </span>
                    {app.status === 'building' && (
                        <span className="flex items-center gap-2 text-xs font-bold text-blue-500 bg-blue-500/10 px-4 py-1.5 rounded-full">
                            <Loader2 size={14} className="animate-spin" /> Compilation...
                        </span>
                    )}
                </div>
            </div>
            
            {app.status === 'building' && (
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-blue-500/20">
                    <div className="h-full bg-blue-500 animate-pulse rounded-r-full" style={{ width: '65%' }} />
                </div>
            )}
        </motion.div>
    )
}

export default function DashboardPage() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({ 
        queryKey: ['stats', user?.id], 
        queryFn: () => fetchStats(user?.id || ''), 
        refetchInterval: 10000 
    })
    const { data: apps, isLoading: appsLoading } = useQuery({
        queryKey: ['builds', user?.id],
        queryFn: () => fetchBuilds(user?.id || ''),
        refetchInterval: 5000,
        enabled: !!user?.id
    })

    if (statsLoading || appsLoading) {
        return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto mb-4 w-8 h-8 text-blue-500" /> <span className="font-semibold text-lg">Chargement de votre espace...</span></div>
    }

    return (
        <div className="p-4 md:p-8 lg:p-10 max-w-[1400px] mx-auto w-full overflow-x-hidden">
            {/* Premium Hero Header */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative rounded-[2rem] p-8 md:p-12 mb-10 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8"
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <div className="absolute inset-0 opacity-40 pointer-events-none">
                    <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600 blur-[100px] opacity-60 mix-blend-screen" />
                    <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-purple-600 blur-[100px] opacity-50 mix-blend-screen" />
                </div>
                
                <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight leading-tight">
                        Bonjour, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{user?.name?.split(' ')[0] || 'Utilisateur'}</span> 👋
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 font-medium max-w-2xl mx-auto md:mx-0">
                        Prêt à transformer vos idées en applications exceptionnelles aujourd'hui ?
                    </p>
                </div>
                
                <div className="relative z-10 w-full md:w-auto">
                    <button
                        onClick={() => navigate('/apps/create')}
                        className="w-full md:w-auto flex items-center justify-center gap-3 rounded-full px-8 py-4 md:py-5 text-lg font-bold shadow-2xl hover:scale-105 transition-transform"
                        style={{ background: 'white', color: '#0f172a' }}
                    >
                        <Plus size={22} strokeWidth={3} />
                        Créer une application
                    </button>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mb-10">
                <PremiumStatCard
                    title="Applications actives"
                    value={stats?.totalApps ?? 0}
                    icon={Smartphone}
                    color="#3b82f6"
                    delay={0.1}
                />
                <PremiumStatCard
                    title="Téléchargements"
                    value={formatNumber(stats?.totalDownloads ?? 0)}
                    icon={Download}
                    color="#10b981"
                    delay={0.2}
                />
                <PremiumStatCard
                    title="Utilisateurs uniques"
                    value={formatNumber(stats?.activeUsers ?? 0)}
                    icon={Users}
                    color="#8b5cf6"
                    delay={0.3}
                />
                <PremiumStatCard
                    title="Générations (Builds)"
                    value={stats?.totalBuilds ?? 0}
                    icon={Zap}
                    color="#f59e0b"
                    delay={0.4}
                />
            </div>

            {/* Quick actions banner (If building) */}
            {(stats?.pendingBuilds ?? 0) > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-5 rounded-2xl flex items-center gap-4"
                    style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500 text-white shadow-lg">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">Génération en cours...</p>
                        <p className="text-sm font-medium text-blue-600/70 dark:text-blue-400/70">
                            Vos applications sont en cours de compilation. Cette opération prend généralement 2 à 3 minutes.
                        </p>
                    </div>
                </motion.div>
            )}

            <div className="grid xl:grid-cols-3 gap-8">
                {/* Apps List */}
                <div className="xl:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                            Vos Applications
                            <span className="px-3 py-1 rounded-full text-xs bg-blue-500/10 text-blue-500">
                                {(apps || []).length}
                            </span>
                        </h2>
                        <Link to="/apps" className="text-sm font-bold flex items-center gap-1.5 hover:gap-2 transition-all text-blue-500 bg-blue-500/10 px-4 py-2 rounded-full">
                            Tout afficher <ArrowRight size={16} />
                        </Link>
                    </div>
                    
                    <div className="space-y-5">
                        {(apps || []).length === 0 ? (
                            <div className="rounded-[2rem] p-12 text-center border-2 border-dashed border-[var(--border)]" style={{ background: 'var(--surface-1)' }}>
                                <div className="w-24 h-24 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-6">
                                    <Smartphone size={40} className="text-[var(--text-muted)]" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Aucune application</h3>
                                <p className="text-[var(--text-muted)] mb-8 max-w-sm mx-auto">Vous n'avez pas encore converti de site web. Commencez dès maintenant !</p>
                                <Button size="lg" onClick={() => navigate('/apps/create')} icon={<Plus size={20} />}>
                                    Créer ma première app
                                </Button>
                            </div>
                        ) : (
                            apps?.slice(0, 5).map((app, i) => (
                                <PremiumAppCard key={app.id} app={app} delay={0.2 + i * 0.1} />
                            ))
                        )}

                        {/* Create new app prompt */}
                        {(apps || []).length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                onClick={() => navigate('/apps/create')}
                                className="rounded-3xl p-6 cursor-pointer border-dashed border-2 flex items-center justify-center gap-5 group transition-colors hover:border-blue-500/50 hover:bg-blue-500/5"
                                style={{ borderColor: 'var(--border)', minHeight: '100px' }}
                            >
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform bg-[var(--surface-2)] group-hover:bg-blue-500 group-hover:text-white text-[var(--text-muted)] shadow-sm">
                                    <Plus size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">Créer une nouvelle application</p>
                                    <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Convertissez un autre site web en app mobile native</p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Premium Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="rounded-[2rem] p-8 relative overflow-hidden"
                        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.02)' }}
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Layout size={20} strokeWidth={2.5} />
                            </div>
                            <h3 className="font-black text-2xl">Actions Rapides</h3>
                        </div>
                        
                        <div className="space-y-4">
                            {[
                                { icon: Plus, label: 'Nouvelle App', desc: 'Convertir un site', path: '/apps/create', color: '#3b82f6' },
                                { icon: Bell, label: 'Notifications Push', desc: 'Fidéliser l\'audience', path: '/notifications', color: '#f59e0b' },
                                { icon: BarChart2, label: 'Statistiques', desc: 'Audience & Usage', path: '/analytics', color: '#8b5cf6' },
                                { icon: Settings, label: 'Paramètres', desc: 'Profil & Sécurité', path: '/settings', color: '#10b981' },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    onClick={() => navigate(item.path)}
                                    className="group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-[var(--border)]"
                                    style={{ background: 'var(--surface-2)' }}
                                >
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-all"
                                        style={{ background: `${item.color}15`, color: item.color }}>
                                        <item.icon size={24} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors text-lg">{item.label}</p>
                                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mt-1">{item.desc}</p>
                                    </div>
                                    <ChevronRight size={20} strokeWidth={2.5} className="ml-auto opacity-30 group-hover:opacity-100 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
