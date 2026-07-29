import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield, Users, Smartphone, Zap, DollarSign, Activity,
    Loader2, CheckCircle, XCircle, Clock, Ban, Edit, Eye,
    Settings, Database, BarChart2, RefreshCw, AlertTriangle,
    Globe, Server, HardDrive, Trash2
} from 'lucide-react'
import { StatCard } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { Select } from '../components/ui/FormControls'
import { formatNumber, formatRelativeTime, formatBytes } from '../lib/utils'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'builds' | 'system' | 'settings'>('overview')
    const [userSearch, setUserSearch] = useState('')
    
    const [stats, setStats] = useState({ totalUsers: 0, totalBuilds: 0, mrr: 0 })
    const [users, setUsers] = useState<any[]>([])
    const [builds, setBuilds] = useState<any[]>([])
    const [settings, setSettings] = useState({ pricing: { starter: 25000, pro: 75000, enterprise: 150000 } })
    const [isLoading, setIsLoading] = useState(true)

    // Editing Modals
    const [editingUser, setEditingUser] = useState<any>(null)

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [stRes, usRes, bdRes, setRes] = await Promise.all([
                api.get('/admin/stats').catch(() => ({ data: { totalUsers: 0, totalBuilds: 0, mrr: 0 } })),
                api.get('/admin/users').catch(() => ({ data: [] })),
                api.get('/admin/builds').catch(() => ({ data: [] })),
                api.get('/settings').catch(() => ({ data: { pricing: { starter: 25000, pro: 75000, enterprise: 150000 } } }))
            ])
            setStats(stRes.data)
            setUsers(usRes.data)
            setBuilds(bdRes.data)
            setSettings(setRes.data)
        } catch (e) {
            toast.error("Erreur de chargement des données")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const filteredUsers = users.filter(u =>
        (u.name || u.displayName || u.fullName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
    )

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await api.put(`/admin/users/${editingUser.id}`, {
                plan: editingUser.plan,
                role: editingUser.role,
                status: editingUser.status
            })
            toast.success("Utilisateur mis à jour")
            setEditingUser(null)
            fetchData()
        } catch (e) {
            toast.error("Erreur lors de la mise à jour")
        }
    }

    const handleDeleteUser = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible.")) return
        try {
            await api.delete(`/admin/users/${id}`)
            toast.success("Utilisateur supprimé")
            fetchData()
        } catch (e) {
            toast.error("Erreur de suppression")
        }
    }

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await api.put('/admin/settings', settings)
            toast.success("Prix mis à jour avec succès")
        } catch (e) {
            toast.error("Erreur lors de la mise à jour")
        }
    }

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center pt-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
    }

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden pt-24">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
                    <Shield size={20} color="white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panneau Admin</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gestion globale de la plateforme Site2App
                    </p>
                </div>
                <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold ml-auto border border-red-200">ADMIN</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
                {[
                    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart2 },
                    { id: 'users', label: 'Utilisateurs', icon: Users },
                    { id: 'builds', label: 'Générations', icon: Zap },
                    { id: 'settings', label: 'Configuration', icon: Settings },
                    { id: 'system', label: 'Système', icon: Server },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${activeTab === t.id ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <t.icon size={15} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard title="Utilisateurs totaux" value={formatNumber(stats.totalUsers)} change={+0} icon={<Users size={20} />} color="#3461f5" />
                        <StatCard title="Applications créées" value={formatNumber(stats.totalBuilds)} change={+0} icon={<Smartphone size={20} />} color="#7c3aed" />
                        <StatCard title="Builds récents" value={formatNumber(builds.length)} change={0} icon={<Zap size={20} />} color="#f59e0b" />
                        <StatCard title="Revenus MRR estimé" value={`${formatNumber(stats.mrr)} FCFA`} change={+0} icon={<DollarSign size={20} />} color="#10b981" />
                    </div>

                    <div className="grid lg:grid-cols-3 gap-5">
                        <div className="card p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm col-span-3">
                            <h3 className="font-bold mb-4 text-gray-900 dark:text-white">Inscriptions récentes</h3>
                            <div className="space-y-3">
                                {users.slice(0, 5).map((u, i) => (
                                    <div key={u.id} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-blue-500">
                                            {(u.name || u.fullName || u.email || 'A')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate dark:text-white">{u.name || u.fullName || 'Utilisateur'}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.plan === 'pro' || u.plan === 'enterprise' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {u.plan || 'free'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Users Tab */}
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
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Utilisateur</th>
                                        <th className="px-4 py-3 font-medium">Plan</th>
                                        <th className="px-4 py-3 font-medium">Rôle</th>
                                        <th className="px-4 py-3 font-medium">Statut</th>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-4 py-3">
                                                <p className="font-semibold dark:text-white">{user.name || user.fullName}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${user.plan === 'pro' || user.plan === 'enterprise' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                    {user.plan || 'free'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                    {user.role || 'user'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${user.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    {user.status || 'active'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {user.createdAt ? new Date(user.createdAt._seconds ? user.createdAt._seconds * 1000 : user.createdAt).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingUser(user)} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100" title="Modifier"><Edit size={14} /></button>
                                                    <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100" title="Supprimer"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Builds Tab */}
            {activeTab === 'builds' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex gap-3">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{builds.length} builds totaux</span>
                        </div>
                        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={fetchData}>
                            Actualiser
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {builds.length === 0 ? <p className="text-gray-500">Aucun build récent.</p> : builds.map(build => (
                            <div key={build.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                                        {build.status === 'building' ? (
                                            <Loader2 size={18} className="animate-spin text-blue-500" />
                                        ) : build.status === 'completed' ? (
                                            <CheckCircle size={18} className="text-green-500" />
                                        ) : build.status === 'failed' ? (
                                            <XCircle size={18} className="text-red-500" />
                                        ) : (
                                            <Clock size={18} className="text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-semibold dark:text-white">{build.appName || 'App'}</span>
                                            <StatusBadge status={build.status || 'pending'} />
                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">{build.platform || 'android'}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            ID: {build.id} · {build.createdAt ? new Date(build.createdAt._seconds ? build.createdAt._seconds * 1000 : build.createdAt).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <form onSubmit={handleSaveSettings} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 max-w-2xl">
                        <h3 className="font-bold text-xl mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                            <DollarSign className="text-blue-500" /> Tarification des forfaits
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix Starter (FCFA)</label>
                                <Input 
                                    type="number" 
                                    value={settings?.pricing?.starter || 0} 
                                    onChange={e => setSettings({...settings, pricing: {...settings.pricing, starter: parseInt(e.target.value)}})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix Pro (FCFA)</label>
                                <Input 
                                    type="number" 
                                    value={settings?.pricing?.pro || 0} 
                                    onChange={e => setSettings({...settings, pricing: {...settings.pricing, pro: parseInt(e.target.value)}})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix Enterprise (FCFA)</label>
                                <Input 
                                    type="number" 
                                    value={settings?.pricing?.enterprise || 0} 
                                    onChange={e => setSettings({...settings, pricing: {...settings.pricing, enterprise: parseInt(e.target.value)}})}
                                />
                            </div>
                            <Button type="submit" variant="primary" className="mt-4">Enregistrer les prix</Button>
                        </div>
                    </form>
                </motion.div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="grid sm:grid-cols-2 gap-5">
                        <div className="card p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold mb-4 flex items-center gap-2 dark:text-white">
                                <Server size={18} className="text-blue-500" /> Serveur
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between text-gray-500"><span>Architecture</span><span className="font-mono font-semibold dark:text-white">Firebase Functions</span></div>
                                <div className="flex justify-between text-gray-500"><span>Région</span><span className="font-mono font-semibold dark:text-white">us-central1</span></div>
                                <div className="flex justify-between text-gray-500"><span>Base de données</span><span className="font-mono font-semibold dark:text-white">Firestore</span></div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Editing Modal */}
            <AnimatePresence>
                {editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-md shadow-2xl"
                        >
                            <h3 className="text-xl font-bold mb-4 dark:text-white">Modifier {editingUser.name || editingUser.email}</h3>
                            <form onSubmit={handleUpdateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Plan</label>
                                    <select 
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2"
                                        value={editingUser.plan || 'free'}
                                        onChange={e => setEditingUser({...editingUser, plan: e.target.value})}
                                    >
                                        <option value="free">Gratuit</option>
                                        <option value="starter">Starter</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Rôle</label>
                                    <select 
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2"
                                        value={editingUser.role || 'user'}
                                        onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                                    >
                                        <option value="user">Utilisateur</option>
                                        <option value="admin">Administrateur</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Statut</label>
                                    <select 
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2"
                                        value={editingUser.status || 'active'}
                                        onChange={e => setEditingUser({...editingUser, status: e.target.value})}
                                    >
                                        <option value="active">Actif</option>
                                        <option value="suspended">Suspendu</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button variant="secondary" className="flex-1" onClick={() => setEditingUser(null)}>Annuler</Button>
                                    <Button variant="primary" type="submit" className="flex-1">Sauvegarder</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
