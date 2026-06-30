import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Smartphone, Plus, Search, Download, Users, Clock,
    Package, Filter, LayoutGrid, List, Eye, Play, Trash2
} from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { formatRelativeTime, formatNumber, platformLabel } from '../../lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import type { App } from '../../types'
import { getAppsByUser, deleteApp } from '../../lib/api'

async function fetchBuilds(userId: string): Promise<App[]> {
    if (!userId) return [];
    try {
        const data = await getAppsByUser(userId);
        return (Array.isArray(data) ? data : []).map((b: any) => ({
            ...b,
            id: b._id || b.id || String(Math.random()),
            name: b.appName || b.name || 'App',
            url: b.url || '',
            status: b.status || 'pending',
            platform: b.platform || 'android',
            version: b.version || '1.0',
            downloadCount: b.downloadCount || 0,
            activeUsers: b.activeUsers || 0,
            lastBuiltAt: b['Created Date'] || b.startedAt || b.lastBuiltAt,
            apkUrl: b.apkFile || (b.status === 'completed' ? `/node/download/${b._id}` : undefined)
        }))
    } catch {
        return []
    }
}

const PremiumAppCard = ({ app, delay }: any) => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const colors: Record<string, string> = {
        '1': '#3b82f6', '2': '#8b5cf6', '3': '#10b981',
    }
    const color = colors[app.id] || '#3b82f6'

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (window.confirm('Voulez-vous vraiment supprimer cette application ?')) {
            try {
                await deleteApp(id)
                queryClient.invalidateQueries({ queryKey: ['builds'] })
            } catch (err) {
                console.error(err)
            }
        }
    }

    const handlePublish = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (window.confirm('Voulez-vous forcer la publication de cette mise  jour vers tous vos utilisateurs ?')) {
            try {
                alert('Ordre de publication envoy aux appareils !')
            } catch (err) {
                console.error(err)
            }
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => navigate(`/apps/${app.id}`)}
            className="group cursor-pointer rounded-3xl p-5 md:p-6 relative overflow-hidden flex flex-col"
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
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
                        {app.icon ? (
                            <img src={app.icon.startsWith('//') ? 'https:' + app.icon : app.icon} alt="App icon" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                            <span className="text-xl">{(app.name || 'A').slice(0, 2).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-blue-500 transition-colors truncate">{app.name}</h3>
                        <p className="text-xs font-medium text-[var(--text-muted)] mt-1 truncate">{app.url}</p>
                    </div>
                </div>
                <StatusBadge status={app.status} />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6 relative z-10 flex-1">
                {[
                    { label: 'Tlchargements', value: formatNumber(app.downloadCount) },
                    { label: 'Utilisateurs', value: formatNumber(app.activeUsers) },
                    { label: 'Version', value: app.version },
                ].map((s, i) => (
                    <div key={i} className="rounded-2xl p-2 md:p-3 text-center border border-[var(--border)] flex flex-col justify-center" style={{ background: 'var(--surface-2)' }}>
                        <p className="text-lg md:text-xl font-black text-[var(--text-primary)] mb-0.5">{s.value}</p>
                        <p className="text-[9px] md:text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between relative z-10 pt-4 border-t border-[var(--border)] mb-4">
                <div className="flex items-center gap-2 text-[11px] md:text-xs font-medium text-[var(--text-muted)]">
                    <Clock size={14} />
                    {app.lastBuiltAt ? formatRelativeTime(app.lastBuiltAt) : 'Jamais build'}
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[var(--surface-2)] text-[var(--text-secondary)] tracking-wide">
                        {platformLabel(app.platform)}
                    </span>
                </div>
            </div>

            {/* Actions overlay / bottom strip */}
            <div className="flex gap-2 relative z-10" onClick={e => e.stopPropagation()}>
                <button
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-blue-500 transition-colors"
                    onClick={() => navigate(`/apps/${app.id}`)}
                >
                    <Eye size={14} /> Modifier
                </button>
                {app.status === 'completed' && (
                    <button
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-colors"
                        onClick={(e) => handlePublish(e, app.id)}
                    >
                        <Play size={14} /> Publier
                    </button>
                )}
                {app.apkUrl && (
                    <a
                        href={app.apkUrl}
                        className="flex items-center justify-center p-2 rounded-xl text-green-600 bg-green-500/10 hover:bg-green-500 hover:text-white transition-colors"
                        title="Tlcharger APK"
                    >
                        <Download size={16} />
                    </a>
                )}
                <button
                    className="flex items-center justify-center p-2 rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-colors"
                    onClick={(e) => handleDelete(e, app.id)}
                    title="Supprimer"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </motion.div>
    )
})
}

export default function AppsPage() {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [view, setView] = useState<'grid' | 'list'>('grid')
    const { user } = useAuthStore()

    const { data: apps, isLoading } = useQuery({ 
        queryKey: ['builds', user?.id], 
        queryFn: () => fetchBuilds(user?.id || ''), 
        refetchInterval: 5000,
        enabled: !!user?.id
    })

    if (isLoading) {
        return <div className="p-20 text-center text-blue-500 font-semibold flex items-center justify-center gap-3"><span className="animate-spin text-2xl">⏳</span> Chargement...</div>
    }

    const filtered = (apps || []).filter(app => {
        const matchSearch = String(app.name || '').toLowerCase().includes(search.toLowerCase()) ||
            String(app.url || '').toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || app.status === statusFilter
        return matchSearch && matchStatus
    })

    return (
        <div className="p-4 md:p-8 lg:p-10 max-w-[1400px] mx-auto w-full overflow-x-hidden">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
            >
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-2 tracking-tight flex items-center gap-3">
                        <Smartphone className="text-blue-500" size={32} strokeWidth={2.5} />
                        Mes Applications
                    </h1>
                    <p className="text-[var(--text-muted)] text-lg font-medium">Gérez et suivez vos applications mobiles</p>
                </div>
                <button
                    onClick={() => navigate('/apps/create')}
                    className="flex items-center justify-center gap-3 bg-blue-600 text-white rounded-full px-8 py-4 font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25 hover:scale-105"
                >
                    <Plus size={20} strokeWidth={3} />
                    Nouvelle Application
                </button>
            </motion.div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-4 flex flex-col md:flex-row gap-4 items-center justify-between mb-8 shadow-sm"
            >
                <div className="relative w-full md:w-96 flex-shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher une application..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-full pl-12 pr-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                    />
                </div>
                
                <div className="flex items-center justify-between w-full md:w-auto gap-4 overflow-x-auto hide-scroll">
                    <div className="flex items-center gap-2 bg-[var(--surface-2)] p-1.5 rounded-full border border-[var(--border)]">
                        {['all', 'completed', 'building', 'failed'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-all ${statusFilter === status ? 'bg-[var(--surface-0)] text-blue-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                            >
                                {status === 'all' ? 'Tous' : status === 'completed' ? 'Actives' : status === 'building' ? 'Builds' : 'Erreurs'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center bg-[var(--surface-2)] p-1.5 rounded-full border border-[var(--border)]">
                        <button
                            onClick={() => setView('grid')}
                            className={`p-2 rounded-full transition-all ${view === 'grid' ? 'bg-[var(--surface-0)] text-blue-500 shadow-sm' : 'text-[var(--text-muted)]'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-2 rounded-full transition-all ${view === 'list' ? 'bg-[var(--surface-0)] text-blue-500 shadow-sm' : 'text-[var(--text-muted)]'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Apps Grid/List */}
            {filtered.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[var(--surface-1)] border border-dashed border-[var(--border)] rounded-[2rem] p-12 text-center"
                >
                    <div className="w-24 h-24 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-6">
                        {search ? <Search size={40} className="text-[var(--text-muted)]" /> : <Smartphone size={40} className="text-[var(--text-muted)]" />}
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{search ? 'Aucun résultat' : 'Vous n\'avez pas encore d\'application'}</h3>
                    <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto text-lg">
                        {search ? 'Modifiez votre recherche ou vos filtres.' : 'Transformez votre premier site web en application mobile dès aujourd\'hui !'}
                    </p>
                    {!search && (
                        <button
                            onClick={() => navigate('/apps/create')}
                            className="bg-blue-600 text-white rounded-full px-8 py-4 font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mx-auto"
                        >
                            <Plus size={20} strokeWidth={3} />
                            Créer ma première app
                        </button>
                    )}
                </motion.div>
            ) : (
                <div className={`grid gap-6 ${view === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                    <AnimatePresence>
                        {filtered.map((app, i) => (
                            <PremiumAppCard key={app.id} app={app} delay={i * 0.05} />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
