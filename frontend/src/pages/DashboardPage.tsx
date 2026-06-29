import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Plus, Smartphone, Download, Users, TrendingUp, Zap, Bell,
    Clock, CheckCircle, AlertCircle, Loader2, BarChart2, ArrowRight,
    Play, Settings, RefreshCw, Globe, ChevronRight, Package
} from 'lucide-react'
import { StatCard } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useAuthStore } from '../store/authStore'
import { formatRelativeTime, formatNumber, platformLabel } from '../lib/utils'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { App, DashboardStats } from '../types'

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
        
        // Handle variations of objects coming from Bubble
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



const AppCard = ({ app }: { app: App }) => {
    const navigate = useNavigate()
    const colors: Record<string, string> = {
        '1': '#3461f5', '2': '#7c3aed', '3': '#10b981',
    }
    const color = colors[app.id] || '#3461f5'

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="card p-3 sm:p-5 cursor-pointer"
            onClick={() => navigate(`/apps/${app.id}`)}
            style={{ transition: 'all 0.2s' }}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-white text-xs sm:text-sm flex-shrink-0 overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>
                        {app.icon ? (
                            <img src={app.icon.startsWith('//') ? 'https:' + app.icon : app.icon} alt="App icon" className="w-full h-full object-cover" />
                        ) : (
                            (app.name || 'A').slice(0, 2).toUpperCase()
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm sm:text-base">{app.name}</h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{app.url}</p>
                    </div>
                </div>
                <StatusBadge status={app.status} />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                    { label: 'Downloads', value: formatNumber(app.downloadCount), icon: Download },
                    { label: 'Utilisateurs', value: formatNumber(app.activeUsers), icon: Users },
                    { label: 'Version', value: app.version, icon: Package },
                ].map(s => (
                    <div key={s.label} className="text-center p-1.5 sm:p-2 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                        <p className="text-sm sm:text-base font-bold mb-0.5">{s.value}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={12} />
                    {app.lastBuiltAt ? formatRelativeTime(app.lastBuiltAt) : 'Jamais buildé'}
                </div>
                <div className="flex items-center gap-2">
                    <span className="badge badge-muted text-xs">{platformLabel(app.platform)}</span>
                    {app.status === 'building' && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--brand-500)' }}>
                            <Loader2 size={12} className="animate-spin" /> En cours...
                        </span>
                    )}
                </div>
            </div>

            {app.status === 'building' && (
                <div className="mt-3">
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '65%', animation: 'none' }} />
                    </div>
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
        return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto mb-4" /> Chargement...</div>
    }

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
            >
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 break-words">
                        Bonjour, {user?.name?.split(' ')[0] || 'Utilisateur'} 👋
                    </h1>
                    <p className="text-sm md:text-base break-words" style={{ color: 'var(--text-secondary)' }}>
                        Voici un aperçu de vos applications mobile.
                    </p>
                </div>
                <Button
                    icon={<Plus size={16} />}
                    onClick={() => navigate('/apps/create')}
                    size="lg"
                    className="w-full md:w-auto mt-2 md:mt-0"
                >
                    Nouvelle App
                </Button>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8"
            >
                <StatCard
                    title="Applications"
                    value={stats?.totalApps ?? 0}
                    change={0}
                    icon={<Smartphone size={22} />}
                    color="#3461f5"
                />
                <StatCard
                    title="Téléchargements"
                    value={formatNumber(stats?.totalDownloads ?? 0)}
                    change={0}
                    icon={<Download size={22} />}
                    color="#10b981"
                />
                <StatCard
                    title="Utilisateurs actifs"
                    value={formatNumber(stats?.activeUsers ?? 0)}
                    change={0}
                    icon={<Users size={22} />}
                    color="#7c3aed"
                />
                <StatCard
                    title="Builds totaux"
                    value={stats?.totalBuilds ?? 0}
                    change={0}
                    icon={<Zap size={22} />}
                    color="#f59e0b"
                />
            </motion.div>

            {/* Quick actions banner */}
            {(stats?.pendingBuilds ?? 0) > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-6 p-4 rounded-xl flex items-center gap-3"
                    style={{ background: 'rgba(52,97,245,0.08)', border: '1px solid rgba(52,97,245,0.2)' }}
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--brand-500)' }}>
                        <Loader2 size={16} color="white" className="animate-spin" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Build en cours</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Compilation en cours, ~2 minutes restantes
                        </p>
                    </div>
                </motion.div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Apps List */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Mes Applications</h2>
                        <Link to="/apps" className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--brand-500)' }}>
                            Voir tout <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {(apps || []).length === 0 ? (
                            <div className="card p-8 text-center" style={{ background: 'var(--surface-1)' }}>
                                <Smartphone size={32} className="mx-auto mb-3 opacity-20" />
                                <p style={{ color: 'var(--text-muted)' }}>Aucune application pour le moment.</p>
                            </div>
                        ) : (
                            apps?.slice(0, 5).map((app, i) => (
                                <motion.div
                                    key={app.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + i * 0.1 }}
                                >
                                    <AppCard app={app} />
                                </motion.div>
                            ))
                        )}

                        {/* Create new app prompt */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            onClick={() => navigate('/apps/create')}
                            className="card p-5 cursor-pointer border-dashed border-2 flex items-center justify-center gap-3 group"
                            style={{ borderColor: 'var(--border-strong)', minHeight: '80px' }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                                style={{ background: 'var(--surface-2)' }}>
                                <Plus size={20} style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <div>
                                <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Créer une nouvelle application</p>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Convertissez votre site web en app mobile</p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="card p-3 sm:p-5"
                    >
                        <h3 className="font-bold mb-4">Actions rapides</h3>
                        <div className="space-y-2">
                            {[
                                { icon: Plus, label: 'Nouvelle application', desc: 'Convertir un site', path: '/apps/create', color: '#3461f5' },
                                { icon: Bell, label: 'Notifications push', desc: 'Envoyer aux utilisateurs', path: '/notifications', color: '#f59e0b' },
                                { icon: BarChart2, label: 'Voir analytics', desc: 'Statistiques détaillées', path: '/analytics', color: '#7c3aed' },
                                { icon: Settings, label: 'Paramètres', desc: 'Compte & facturation', path: '/settings', color: '#10b981' },
                            ].map(item => (
                                <div
                                    key={item.label}
                                    className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-[var(--surface-1)] transition-colors"
                                    onClick={() => navigate(item.path)}
                                >
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ background: `${item.color}18`, color: item.color }}>
                                        <item.icon size={17} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{item.label}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                                    </div>
                                    <ChevronRight size={14} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
                                </div>
                            ))}
                        </div>
                    </motion.div>


                </div>
            </div>
        </div>
    )
}


