import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    Shield, Users, Smartphone, Zap, DollarSign, Activity,
    Loader2, CheckCircle, XCircle, Clock, Ban, Edit, Eye,
    Settings, Database, BarChart2, RefreshCw, AlertTriangle,
    Globe, Server, HardDrive
} from 'lucide-react'
import { StatCard } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/FormControls'
import { formatNumber, formatRelativeTime, formatBytes } from '../lib/utils'
import toast from 'react-hot-toast'

const mockUsers = [
    { id: '1', name: 'Marie Dupont', email: 'marie@test.fr', plan: 'pro', apps: 5, status: 'active', createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
    { id: '2', name: 'Thomas Laurent', email: 'thomas@test.fr', plan: 'starter', apps: 2, status: 'active', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: '3', name: 'Sarah Benali', email: 'sarah@test.fr', plan: 'free', apps: 1, status: 'suspended', createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
    { id: '4', name: 'Pierre Martin', email: 'pierre@test.fr', plan: 'enterprise', apps: 12, status: 'active', createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
]

const mockBuilds = [
    { id: 'b1', app: 'Blog Express', user: 'Thomas L.', platform: 'android', status: 'building', started: new Date(Date.now() - 3 * 60000).toISOString(), progress: 65 },
    { id: 'b2', app: 'Shop Plus', user: 'Jean D.', platform: 'both', status: 'pending', started: new Date(Date.now() - 1 * 60000).toISOString(), progress: 0 },
    { id: 'b3', app: 'Portfolio Pro', user: 'Anna K.', platform: 'ios', status: 'completed', started: new Date(Date.now() - 15 * 60000).toISOString(), progress: 100 },
    { id: 'b4', app: 'NewsApp', user: 'Marc B.', platform: 'android', status: 'failed', started: new Date(Date.now() - 8 * 60000).toISOString(), progress: 42 },
]

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'builds' | 'system'>('overview')
    const [userSearch, setUserSearch] = useState('')

    const filteredUsers = mockUsers.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
    )

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
                    <Shield size={20} color="white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Panneau Admin</h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Gestion globale de la plateforme Site2App
                    </p>
                </div>
                <span className="badge badge-error ml-auto">ADMIN</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
                {[
                    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart2 },
                    { id: 'users', label: 'Utilisateurs', icon: Users },
                    { id: 'builds', label: 'Build Queue', icon: Zap },
                    { id: 'system', label: 'Système', icon: Server },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap"
                        style={{
                            borderColor: activeTab === t.id ? 'var(--brand-500)' : 'transparent',
                            color: activeTab === t.id ? 'var(--brand-500)' : 'var(--text-secondary)',
                        }}
                    >
                        <t.icon size={15} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard title="Utilisateurs totaux" value={formatNumber(12847)} change={+15} icon={<Users size={20} />} color="#3461f5" />
                        <StatCard title="Applications créées" value={formatNumber(38210)} change={+22} icon={<Smartphone size={20} />} color="#7c3aed" />
                        <StatCard title="Builds (30j)" value={formatNumber(4820)} change={+8} icon={<Zap size={20} />} color="#f59e0b" />
                        <StatCard title="Revenus MRR" value="24,890€" change={+18} icon={<DollarSign size={20} />} color="#10b981" />
                    </div>

                    <div className="grid lg:grid-cols-3 gap-5">
                        {/* System health */}
                        <div className="lg:col-span-2 card p-5">
                            <h3 className="font-bold mb-4">Santé du système</h3>
                            <div className="grid sm:grid-cols-3 gap-4">
                                {[
                                    { label: 'API Server', status: 'ok', value: '99.9%', icon: Globe },
                                    { label: 'Build Queue', status: 'ok', value: '3 actifs', icon: Zap },
                                    { label: 'Storage', status: 'warning', value: '72% utilisé', icon: HardDrive },
                                    { label: 'Database', status: 'ok', value: '12ms avg', icon: Database },
                                    { label: 'Redis', status: 'ok', value: 'Opérationnel', icon: Server },
                                    { label: 'Firebase', status: 'ok', value: 'Connecté', icon: Activity },
                                ].map(s => (
                                    <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl"
                                        style={{ background: 'var(--surface-1)' }}>
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                            style={{
                                                background: s.status === 'ok' ? '#10b98120' : '#f59e0b20',
                                                color: s.status === 'ok' ? '#10b981' : '#f59e0b',
                                            }}>
                                            <s.icon size={15} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold">{s.label}</p>
                                            <p className="text-xs" style={{ color: s.status === 'ok' ? '#10b981' : '#f59e0b' }}>{s.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent signups */}
                        <div className="card p-5">
                            <h3 className="font-bold mb-4">Inscriptions récentes</h3>
                            <div className="space-y-3">
                                {mockUsers.map((u, i) => (
                                    <div key={u.id} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                            style={{ background: ['#3461f5', '#7c3aed', '#10b981', '#f59e0b'][i] }}>
                                            {u.name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{u.name}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(u.createdAt)}</p>
                                        </div>
                                        <span className={`badge badge-${u.plan === 'pro' || u.plan === 'enterprise' ? 'brand' : 'muted'} text-xs`}>
                                            {u.plan}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Users */}
            {activeTab === 'users' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex gap-3 mb-5">
                        <div className="flex-1">
                            <Input
                                placeholder="Rechercher un utilisateur..."
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                icon={<Users size={16} />}
                            />
                        </div>
                        <Select options={[
                            { value: 'all', label: 'Tous les plans' },
                            { value: 'free', label: 'Gratuit' },
                            { value: 'starter', label: 'Starter' },
                            { value: 'pro', label: 'Pro' },
                        ]} value="all" onChange={() => { }} />
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Utilisateur</th>
                                    <th>Plan</th>
                                    <th>Apps</th>
                                    <th>Statut</th>
                                    <th>Inscrit</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div>
                                                <p className="font-semibold text-sm">{user.name}</p>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${user.plan === 'pro' || user.plan === 'enterprise' ? 'brand' : 'muted'} capitalize`}>
                                                {user.plan}
                                            </span>
                                        </td>
                                        <td className="font-semibold">{user.apps}</td>
                                        <td>
                                            <span className={`badge badge-${user.status === 'active' ? 'success' : 'error'}`}>
                                                {user.status === 'active' ? 'Actif' : 'Suspendu'}
                                            </span>
                                        </td>
                                        <td className="text-sm" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(user.createdAt)}</td>
                                        <td>
                                            <div className="flex gap-1">
                                                <button className="btn btn-ghost btn-sm p-1.5" title="Voir"><Eye size={13} /></button>
                                                <button className="btn btn-ghost btn-sm p-1.5" title="Modifier"><Edit size={13} /></button>
                                                <button
                                                    className="btn btn-ghost btn-sm p-1.5"
                                                    title={user.status === 'active' ? 'Suspendre' : 'Réactiver'}
                                                    onClick={() => toast.success(`Utilisateur ${user.status === 'active' ? 'suspendu' : 'réactivé'}`)}
                                                >
                                                    <Ban size={13} style={{ color: user.status === 'active' ? '#ef4444' : '#10b981' }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Build Queue */}
            {activeTab === 'builds' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex gap-3">
                            <span className="badge badge-info">{mockBuilds.filter(b => b.status === 'building').length} en cours</span>
                            <span className="badge badge-warning">{mockBuilds.filter(b => b.status === 'pending').length} en attente</span>
                        </div>
                        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />}>
                            Actualiser
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {mockBuilds.map(build => (
                            <div key={build.id} className="card p-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: build.status === 'building' ? 'rgba(52,97,245,0.12)'
                                                : build.status === 'completed' ? '#10b98120'
                                                    : build.status === 'failed' ? '#ef444420'
                                                        : 'var(--surface-2)'
                                        }}>
                                        {build.status === 'building' ? (
                                            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--brand-500)' }} />
                                        ) : build.status === 'completed' ? (
                                            <CheckCircle size={18} style={{ color: '#10b981' }} />
                                        ) : build.status === 'failed' ? (
                                            <XCircle size={18} style={{ color: '#ef4444' }} />
                                        ) : (
                                            <Clock size={18} style={{ color: 'var(--text-muted)' }} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-semibold">{build.app}</span>
                                            <StatusBadge status={build.status} />
                                            <span className="badge badge-muted text-xs">{build.platform}</span>
                                        </div>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {build.user} · {formatRelativeTime(build.started)}
                                        </p>
                                        {build.status === 'building' && (
                                            <div className="mt-2 progress-bar" style={{ height: '4px' }}>
                                                <div className="progress-fill" style={{ width: `${build.progress}%` }} />
                                            </div>
                                        )}
                                    </div>
                                    {build.status === 'building' && (
                                        <span className="text-sm font-bold" style={{ color: 'var(--brand-500)' }}>{build.progress}%</span>
                                    )}
                                    {(build.status === 'building' || build.status === 'pending') && (
                                        <Button variant="danger" size="sm" onClick={() => toast.success('Build annulé')}>
                                            Annuler
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* System */}
            {activeTab === 'system' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="grid sm:grid-cols-2 gap-5">
                        <div className="card p-5">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Server size={18} style={{ color: 'var(--brand-500)' }} /> Configuration serveur
                            </h3>
                            <div className="space-y-3 text-sm">
                                {[
                                    { label: 'Node.js', value: 'v20.11.0' },
                                    { label: 'OS', value: 'Linux Ubuntu 22.04' },
                                    { label: 'CPU cores', value: '8' },
                                    { label: 'RAM', value: '16 GB' },
                                    { label: 'Uptime', value: '14j 6h 23m' },
                                ].map(s => (
                                    <div key={s.label} className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                                        <span className="font-mono font-semibold">{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card p-5">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <HardDrive size={18} style={{ color: 'var(--brand-500)' }} /> Stockage
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { label: 'APK/IPA files', used: 72, total: 100, unit: 'GB' },
                                    { label: 'Icônes & assets', used: 8.2, total: 20, unit: 'GB' },
                                    { label: 'Base de données', used: 2.4, total: 10, unit: 'GB' },
                                ].map(s => (
                                    <div key={s.label}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{s.label}</span>
                                            <span className="font-semibold">{s.used}/{s.total} {s.unit}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill"
                                                style={{ width: `${(s.used / s.total) * 100}%`, background: s.used / s.total > 0.8 ? '#f59e0b' : '#3461f5' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card p-5">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} style={{ color: '#f59e0b' }} /> Logs récents
                            </h3>
                            <div className="space-y-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {[
                                    { time: '09:14:23', level: 'INFO', msg: 'Build #4821 started - Blog Express' },
                                    { time: '09:12:01', level: 'ERROR', msg: 'Build #4820 failed - NewsApp timeout' },
                                    { time: '09:08:45', level: 'INFO', msg: 'User registered: pierre@test.fr' },
                                    { time: '09:05:12', level: 'WARN', msg: 'Storage at 72% capacity' },
                                    { time: '09:00:00', level: 'INFO', msg: 'System health check OK' },
                                ].map((log, i) => (
                                    <div key={i} className="flex gap-2 items-start">
                                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{log.time}</span>
                                        <span
                                            className="flex-shrink-0 font-bold"
                                            style={{ color: log.level === 'ERROR' ? '#ef4444' : log.level === 'WARN' ? '#f59e0b' : '#10b981' }}>
                                            [{log.level}]
                                        </span>
                                        <span>{log.msg}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card p-5">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Settings size={18} style={{ color: 'var(--brand-500)' }} /> Actions admin
                            </h3>
                            <div className="space-y-2">
                                {[
                                    { label: 'Vider le cache Redis', icon: RefreshCw, variant: 'secondary' as const },
                                    { label: 'Rebuild tous les assets', icon: Zap, variant: 'secondary' as const },
                                    { label: 'Exporter les données', icon: Database, variant: 'secondary' as const },
                                    { label: 'Mode maintenance', icon: AlertTriangle, variant: 'danger' as const },
                                ].map(action => (
                                    <Button
                                        key={action.label}
                                        variant={action.variant}
                                        size="sm"
                                        className="w-full justify-start"
                                        icon={<action.icon size={14} />}
                                        onClick={() => toast.success(`${action.label} — OK`)}
                                    >
                                        {action.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    )
}


