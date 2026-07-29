import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield, Users, Smartphone, Zap, DollarSign, Activity,
    Loader2, CheckCircle, XCircle, Clock, Ban, Edit, Eye,
    Settings, Database, BarChart2, RefreshCw, AlertTriangle,
    Globe, Server, HardDrive, Trash2, Search, TrendingUp
} from 'lucide-react'
import { StatCard } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { formatNumber, formatRelativeTime, formatBytes } from '../lib/utils'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'builds' | 'system' | 'settings'>('overview')
    const [userSearch, setUserSearch] = useState('')
    
    const [stats, setStats] = useState({ totalUsers: 0, totalBuilds: 0, mrr: 0, totalRevenue: 0 })
    const [users, setUsers] = useState<any[]>([])
    const [builds, setBuilds] = useState<any[]>([])
    const [settings, setSettings] = useState({ pricing: { starter: 200, pro: 200 } })
    const [isLoading, setIsLoading] = useState(true)

    // Editing Modals
    const [editingUser, setEditingUser] = useState<any>(null)

    const fetchData = async () => {
        setIsLoading(true)
        try {
            const [stRes, usRes, bdRes, setRes] = await Promise.all([
                api.get('/admin/stats').catch(() => ({ data: { totalUsers: 0, totalBuilds: 0, mrr: 0, totalRevenue: 0 } })),
                api.get('/admin/users').catch(() => ({ data: [] })),
                api.get('/admin/builds').catch(() => ({ data: [] })),
                api.get('/settings').catch(() => ({ data: { pricing: { starter: 200, pro: 200 } } }))
            ])
            setStats(stRes.data)
            setUsers(usRes.data)
            setBuilds(bdRes.data)
            if (setRes.data && setRes.data.pricing) {
                setSettings(setRes.data)
            }
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
        if (!window.confirm("Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible.")) return
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
            toast.success("Configuration sauvegardée avec succès")
        } catch (e) {
            toast.error("Erreur lors de la mise à jour")
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                <p className="text-zinc-400 font-medium">Chargement de l'interface d'administration...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/10">
                            <Shield size={28} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Espace Admin</h1>
                                <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Accès Restreint</span>
                            </div>
                            <p className="text-zinc-400 mt-1 text-sm sm:text-base">Gérez votre plateforme Site2App d'une main de fer.</p>
                        </div>
                    </div>
                    
                    <Button variant="secondary" onClick={fetchData} icon={<RefreshCw size={16} />} className="self-start md:self-auto hover:bg-zinc-800">
                        Actualiser les données
                    </Button>
                </div>

                {/* Main Navigation Tabs */}
                <div className="flex gap-2 sm:gap-4 mb-8 border-b border-white/5 overflow-x-auto pb-4 scrollbar-hide">
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
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                                activeTab === t.id 
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <t.icon size={18} className={activeTab === t.id ? 'text-white' : 'text-zinc-500'} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                            {/* Premium Stat Cards */}
                            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity"><Users size={64} className="text-blue-500 -mt-4 -mr-4 transform rotate-12" /></div>
                                <div className="relative z-10">
                                    <p className="text-zinc-400 font-medium mb-1">Utilisateurs Totaux</p>
                                    <h3 className="text-4xl font-extrabold text-white">{formatNumber(stats.totalUsers)}</h3>
                                </div>
                            </div>
                            
                            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity"><Smartphone size={64} className="text-purple-500 -mt-4 -mr-4 transform -rotate-12" /></div>
                                <div className="relative z-10">
                                    <p className="text-zinc-400 font-medium mb-1">Apps Créées</p>
                                    <h3 className="text-4xl font-extrabold text-white">{formatNumber(stats.totalBuilds)}</h3>
                                </div>
                            </div>

                            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity"><DollarSign size={64} className="text-emerald-500 -mt-4 -mr-4" /></div>
                                <div className="relative z-10">
                                    <p className="text-zinc-400 font-medium mb-1">Revenus Totaux</p>
                                    <h3 className="text-3xl font-extrabold text-white">{formatNumber(stats.totalRevenue)} <span className="text-lg text-zinc-500 font-normal">FCFA</span></h3>
                                </div>
                            </div>

                            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity"><TrendingUp size={64} className="text-amber-500 -mt-4 -mr-4 transform rotate-6" /></div>
                                <div className="relative z-10">
                                    <p className="text-zinc-400 font-medium mb-1">MRR Estimé</p>
                                    <h3 className="text-3xl font-extrabold text-white">{formatNumber(stats.mrr)} <span className="text-lg text-zinc-500 font-normal">FCFA</span></h3>
                                </div>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-3 bg-zinc-900/30 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold flex items-center gap-2"><Activity className="text-blue-500" /> Activité Récente (Inscriptions)</h3>
                                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('users')} className="text-blue-400 hover:text-blue-300">Voir tout</Button>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {users.slice(0, 6).map((u, i) => (
                                        <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/80 border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-lg font-bold text-white shadow-inner">
                                                    {(u.name || u.fullName || u.email || 'A')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-white">{u.name || u.fullName || 'Nouvel Utilisateur'}</p>
                                                    <p className="text-sm text-zinc-500">{u.email}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                                u.plan === 'lifetime' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                                                u.plan === 'yearly' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                                                'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                            }`}>
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
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search size={18} className="text-zinc-500" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="Rechercher par nom, email..."
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                />
                            </div>
                            <div className="px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-2xl flex items-center gap-2 text-zinc-400 text-sm font-medium">
                                <Users size={18} /> {filteredUsers.length} trouvé(s)
                            </div>
                        </div>

                        <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-zinc-900/80 border-b border-white/5 text-xs uppercase tracking-wider font-semibold text-zinc-500">
                                        <tr>
                                            <th className="px-6 py-4">Utilisateur</th>
                                            <th className="px-6 py-4">Forfait</th>
                                            <th className="px-6 py-4">Rôle</th>
                                            <th className="px-6 py-4">Statut</th>
                                            <th className="px-6 py-4">Inscription</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-sm">
                                        {filteredUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                                                            {(user.name || user.fullName || user.email || 'A')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-white">{user.name || user.fullName || 'Sans nom'}</p>
                                                            <p className="text-xs text-zinc-500">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                        user.plan === 'lifetime' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                                                        user.plan === 'yearly' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                                                        'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                                    }`}>
                                                        {user.plan || 'free'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                        user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                                    }`}>
                                                        {user.role || 'user'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                        user.status === 'suspended' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                    }`}>
                                                        {user.status || 'active'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-zinc-500 text-xs">
                                                    {user.createdAt ? new Date(user.createdAt._seconds ? user.createdAt._seconds * 1000 : user.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingUser(user)} className="p-2 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 rounded-lg transition-colors" title="Modifier"><Edit size={16} /></button>
                                                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors" title="Supprimer"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredUsers.length === 0 && (
                                    <div className="text-center py-12 text-zinc-500">
                                        Aucun utilisateur ne correspond à votre recherche.
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Builds Tab */}
                {activeTab === 'builds' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Zap className="text-amber-500" /> Générations Récentes</h3>
                            <div className="space-y-4">
                                {builds.length === 0 ? (
                                    <div className="text-center py-10 bg-zinc-900/50 rounded-2xl border border-white/5 text-zinc-500">Aucun build récent.</div>
                                ) : builds.map(build => (
                                    <div key={build.id} className="flex items-center justify-between p-5 rounded-2xl bg-zinc-900/80 border border-white/5 hover:border-white/10 transition-all group">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                                                build.status === 'building' ? 'bg-blue-500/10 border-blue-500/20' :
                                                build.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20' :
                                                build.status === 'failed' ? 'bg-red-500/10 border-red-500/20' :
                                                'bg-zinc-800 border-zinc-700'
                                            }`}>
                                                {build.status === 'building' ? <Loader2 size={24} className="animate-spin text-blue-500" /> :
                                                 build.status === 'completed' ? <CheckCircle size={24} className="text-emerald-500" /> :
                                                 build.status === 'failed' ? <XCircle size={24} className="text-red-500" /> :
                                                 <Clock size={24} className="text-zinc-500" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-bold text-white text-lg">{build.appName || 'App Sans Nom'}</span>
                                                    <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-xs uppercase font-bold tracking-wider">{build.platform || 'ANDROID'}</span>
                                                </div>
                                                <p className="text-xs text-zinc-500 flex items-center gap-2">
                                                    <span className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">ID: {build.id.substring(0, 8)}...</span>
                                                    <span>•</span>
                                                    <span>{build.createdAt ? new Date(build.createdAt._seconds ? build.createdAt._seconds * 1000 : build.createdAt).toLocaleString('fr-FR') : 'N/A'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="hidden sm:block">
                                            <StatusBadge status={build.status || 'pending'} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-2xl">
                        <form onSubmit={handleSaveSettings} className="bg-zinc-900/30 backdrop-blur-sm rounded-3xl p-8 border border-white/5">
                            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/5">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-white">Tarification des Forfaits</h3>
                                    <p className="text-sm text-zinc-500">Ajustez les prix publics affichés et utilisés lors du paiement.</p>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5">
                                    <label className="block text-sm font-bold text-zinc-300 mb-2 uppercase tracking-wide">Prix Annuel (FCFA)</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-lg"
                                        value={settings?.pricing?.starter || 0} 
                                        onChange={e => setSettings({...settings, pricing: {...settings.pricing, starter: parseInt(e.target.value)}})}
                                    />
                                    <p className="text-xs text-zinc-500 mt-2">Ce prix sera appliqué au forfait "Annuel".</p>
                                </div>
                                <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5">
                                    <label className="block text-sm font-bold text-zinc-300 mb-2 uppercase tracking-wide">Prix À Vie (FCFA)</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-lg"
                                        value={settings?.pricing?.pro || 0} 
                                        onChange={e => setSettings({...settings, pricing: {...settings.pricing, pro: parseInt(e.target.value)}})}
                                    />
                                    <p className="text-xs text-zinc-500 mt-2">Ce prix sera appliqué au forfait "À Vie" (paiement unique).</p>
                                </div>
                                
                                <div className="pt-4 flex justify-end">
                                    <Button type="submit" variant="primary" className="px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20">Sauvegarder les modifications</Button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}

                {/* System Tab */}
                {activeTab === 'system' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-zinc-900/30 backdrop-blur-sm p-6 rounded-3xl border border-white/5">
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-white">
                                    <Server className="text-emerald-500" /> Infrastructure
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                                        <span className="text-sm text-zinc-400">Architecture</span>
                                        <span className="text-sm font-mono font-bold text-white bg-zinc-800 px-2 py-1 rounded">Firebase / Vercel</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                                        <span className="text-sm text-zinc-400">Base de données</span>
                                        <span className="text-sm font-mono font-bold text-white bg-zinc-800 px-2 py-1 rounded">Firestore</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                                        <span className="text-sm text-zinc-400">Région Cloud</span>
                                        <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded flex items-center gap-1"><CheckCircle size={12}/> us-central1</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* User Editing Modal */}
                <AnimatePresence>
                    {editingUser && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            {/* Backdrop */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setEditingUser(null)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            />
                            
                            {/* Modal Content */}
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative bg-zinc-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
                                
                                <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                                    <Edit className="text-blue-500" />
                                    Modifier l'utilisateur
                                </h3>
                                
                                <div className="mb-6 p-4 bg-zinc-950 rounded-2xl border border-white/5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-xl">
                                        {(editingUser.name || editingUser.email || 'A')[0].toUpperCase()}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-white truncate">{editingUser.name || 'Utilisateur sans nom'}</p>
                                        <p className="text-sm text-zinc-500 truncate">{editingUser.email}</p>
                                    </div>
                                </div>

                                <form onSubmit={handleUpdateUser} className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Forfait Actif</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-white font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                value={editingUser.plan || 'free'}
                                                onChange={e => setEditingUser({...editingUser, plan: e.target.value})}
                                            >
                                                <option value="free" className="bg-zinc-900 text-white">Gratuit (0 FCFA)</option>
                                                <option value="yearly" className="bg-zinc-900 text-white">Annuel (Abonnement)</option>
                                                <option value="lifetime" className="bg-zinc-900 text-white">À Vie (Paiement Unique)</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
                                                <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Rôle de l'utilisateur</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-white font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                value={editingUser.role || 'user'}
                                                onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                                            >
                                                <option value="user" className="bg-zinc-900 text-white">Utilisateur Standard</option>
                                                <option value="admin" className="bg-zinc-900 text-white text-purple-400">Administrateur</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
                                                <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Statut du compte</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-white font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                value={editingUser.status || 'active'}
                                                onChange={e => setEditingUser({...editingUser, status: e.target.value})}
                                            >
                                                <option value="active" className="bg-zinc-900 text-emerald-400">Actif (Normal)</option>
                                                <option value="suspended" className="bg-zinc-900 text-red-400">Suspendu / Banni</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
                                                <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-6 mt-2 border-t border-white/5">
                                        <button 
                                            type="button" 
                                            className="flex-1 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
                                            onClick={() => setEditingUser(null)}
                                        >
                                            Annuler
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-900/20 transition-all"
                                        >
                                            Sauvegarder
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
