import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Smartphone, Plus, Search, Filter, Download, Users, Clock,
    MoreHorizontal, Settings, RefreshCw, Trash2, Eye, Package,
    Globe, Play
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/FormControls'
import { formatRelativeTime, formatNumber, platformLabel } from '../../lib/utils'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import api from '../../lib/api'
import type { App, DashboardStats } from '../../types'

async function fetchBuilds(): Promise<App[]> {
    try {
        const { data } = await api.get('/builds')
        return (Array.isArray(data) ? data : []).map((b: any) => ({
            ...b,
            id: b.id || b.buildId || String(Math.random()),
            name: b.appName || b.name || 'App',
            url: b.url || '',
            status: b.status || 'pending',
            platform: b.platform || 'android',
            version: b.version || '1.0',
            downloadCount: b.downloadCount || 0,
            activeUsers: b.activeUsers || 0,
            lastBuiltAt: b.startedAt || b.lastBuiltAt,
            apkUrl: b.status === 'completed' ? `/api/download/${b.id}` : undefined
        }))
    } catch {
        return []
    }
}

export default function AppsPage() {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const queryClient = useQueryClient()
    const [view, setView] = useState<'grid' | 'list'>('grid')

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette application ?')) return
        try {
            await api.delete(`/build/${id}`)
            toast.success('Application supprimée')
            queryClient.invalidateQueries({ queryKey: ['builds'] })
        } catch (e) {
            toast.error('Erreur lors de la suppression')
        }
    }

    const { data: apps, isLoading } = useQuery({ queryKey: ['builds'], queryFn: fetchBuilds, refetchInterval: 5000 })

    if (isLoading) {
        return <div className="p-20 text-center">Chargement...</div>
    }

    const filtered = (apps || []).filter(app => {
        const matchSearch = String(app.name || '').toLowerCase().includes(search.toLowerCase()) ||
            String(app.url || '').toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || app.status === statusFilter
        return matchSearch && matchStatus
    })

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3 break-words">
                        <Smartphone size={24} className="md:w-7 md:h-7" style={{ color: 'var(--brand-500)' }} />
                        Mes Applications
                    </h1>
                    <p className="text-sm md:text-base break-words" style={{ color: 'var(--text-secondary)' }}>
                        {(apps || []).length} application{(apps || []).length > 1 ? 's' : ''} créée{(apps || []).length > 1 ? 's' : ''}
                    </p>
                </div>
                <Button className="w-full md:w-auto" icon={<Plus size={16} />} onClick={() => navigate('/apps/create')}>
                    Nouvelle App
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row flex-wrap gap-3 mb-6">
                <div className="w-full md:flex-1 md:min-w-48">
                    <Input
                        placeholder="Rechercher..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        icon={<Search size={16} />}
                    />
                </div>
                <Select
                    options={[
                        { value: 'all', label: 'Tous les statuts' },
                        { value: 'completed', label: 'Terminés' },
                        { value: 'building', label: 'En cours' },
                        { value: 'pending', label: 'En attente' },
                        { value: 'failed', label: 'Échoués' },
                    ]}
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                />
                <div className="flex justify-end w-full md:w-auto">
                    {['grid', 'list'].map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v as any)}
                            className="px-3 py-2 text-sm transition-all border first:rounded-l-lg last:rounded-r-lg"
                            style={{
                                background: view === v ? 'var(--brand-500)' : 'var(--surface-0)',
                                color: view === v ? 'white' : 'var(--text-secondary)',
                                borderColor: 'var(--border)',
                            }}
                        >
                            {v === 'grid' ? '⊞' : '⊟'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Apps Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-20">
                    <Smartphone size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                    <h3 className="text-xl font-bold mb-2">Aucune application</h3>
                    <p className="mb-4 text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
                        {search ? 'Aucun résultat pour votre recherche.' : 'Créez votre première application dès maintenant.'}
                    </p>
                    <Button onClick={() => navigate('/apps/create')} icon={<Plus size={16} />}>
                        Créer une application
                    </Button>
                </div>
            ) : view === 'grid' ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((app, i) => (
                        <motion.div
                            key={app.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ y: -4 }}
                            className="card p-5 cursor-pointer group"
                            style={{ transition: 'all 0.2s' }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                        style={{ background: `linear-gradient(135deg, var(--brand-500), var(--brand-600))` }}
                                    >
                                        {String(app.name || 'Ap').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold leading-tight">{app.name}</h3>
                                        <p className="text-xs truncate max-w-28" style={{ color: 'var(--text-muted)' }}>{app.url}</p>
                                    </div>
                                </div>
                                <StatusBadge status={app.status} />
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {[
                                    { icon: Download, v: formatNumber(app.downloadCount) },
                                    { icon: Users, v: formatNumber(app.activeUsers) },
                                    { icon: Package, v: `v${app.version}` },
                                ].map((s, j) => (
                                    <div key={j} className="text-center p-2 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                                        <p className="text-sm font-bold">{s.v}</p>
                                        <s.icon size={11} className="mx-auto mt-0.5" style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                                <span className="flex items-center gap-1">
                                    <Clock size={11} />
                                    {app.lastBuiltAt ? formatRelativeTime(app.lastBuiltAt) : 'Jamais'}
                                </span>
                                <span className="badge badge-muted">{platformLabel(app.platform)}</span>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="flex-1"
                                    icon={<Eye size={13} />}
                                    onClick={(e) => { e.stopPropagation(); navigate(`/apps/${app.id}`) }}
                                >
                                    Modifier
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="flex-1 text-red-500 hover:bg-red-50"
                                    icon={<Trash2 size={13} />}
                                    onClick={(e) => handleDelete(e, app.id)}
                                >
                                    Supprimer
                                </Button>
                                {app.apkUrl && (
                                    <a href={app.apkUrl} onClick={(e) => e.stopPropagation()} className="btn btn-primary btn-sm" title="Télécharger">
                                        <Download size={13} />
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {/* Add new card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: filtered.length * 0.05 }}
                        onClick={() => navigate('/apps/create')}
                        className="card p-5 cursor-pointer flex flex-col items-center justify-center border-dashed border-2 min-h-52 hover:border-[var(--brand-400)] transition-colors group"
                        style={{ borderColor: 'var(--border-strong)' }}
                    >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                            style={{ background: 'var(--surface-2)' }}>
                            <Plus size={22} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Nouvelle application</p>
                        <p className="text-sm text-center mt-1" style={{ color: 'var(--text-muted)' }}>
                            Convertir un site web en app mobile
                        </p>
                    </motion.div>
                </div>
            ) : (
                /* List view */
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Application</th>
                                <th>Statut</th>
                                <th>Plateforme</th>
                                <th>Downloads</th>
                                <th>Dernier build</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((app, i) => (
                                <tr key={app.id} className="cursor-pointer" onClick={() => navigate(`/apps/${app.id}`)}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                style={{ background: 'var(--brand-500)' }}>
                                                {String(app.name || 'Ap').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{app.name}</p>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{app.url}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td><StatusBadge status={app.status} /></td>
                                    <td><span className="badge badge-muted">{platformLabel(app.platform)}</span></td>
                                    <td className="font-semibold">{formatNumber(app.downloadCount)}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                        {app.lastBuiltAt ? formatRelativeTime(app.lastBuiltAt) : '—'}
                                    </td>
                                    <td>
                                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                            <button className="btn btn-ghost btn-sm p-2" title="Modifier" onClick={() => navigate(`/apps/${app.id}`)}><Eye size={14} /></button>
                                            <button className="btn btn-ghost btn-sm p-2 text-red-500 hover:bg-red-50" title="Supprimer" onClick={(e) => handleDelete(e, app.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
