import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Settings, User, Bell, Shield, Globe, Upload, Save,
    LogOut, Trash2, Smartphone
} from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { Toggle } from '../components/ui/FormControls'
import { useAuthStore } from '../store/authStore'
import { getInitials } from '../lib/utils'
import toast from 'react-hot-toast'
import api from '../lib/api'

const tabs = [
    { id: 'profile', label: 'Profil', icon: User, color: 'blue' },
    { id: 'integrations', label: 'Intégrations', icon: Globe, color: 'purple' },
    { id: 'notifications', label: 'Alertes', icon: Bell, color: 'emerald' },
    { id: 'security', label: 'Sécurité', icon: Shield, color: 'red' },
]

export default function SettingsPage() {
    const navigate = useNavigate()
    const { user, updateUser, logout } = useAuthStore()
    const [activeTab, setActiveTab] = useState('profile')
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        avatar: user?.avatar || '',
    })
    const [notifSettings, setNotifSettings] = useState({
        buildComplete: true,
        buildFailed: true,
        weeklyReport: false,
        marketing: false,
    })
    const [firebaseKey, setFirebaseKey] = useState('')

    useEffect(() => {
        api.get('/user/firebase').then(r => {
            if (r.data?.key) setFirebaseKey(r.data.key)
        }).catch(e => console.error(e))
    }, [])

    const handleSaveProfile = async () => {
        setSaving(true)
        await new Promise(r => setTimeout(r, 1000))
        updateUser({ name: form.name, email: form.email })
        setSaving(false)
        toast.success('Profil mis à jour avec succès !')
    }

    const handleLogout = () => {
        logout()
        navigate('/auth/login')
    }

    return (
        <div className="p-4 md:p-8 lg:p-10 max-w-[1400px] mx-auto w-full overflow-x-hidden">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10"
            >
                <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-2 tracking-tight flex items-center gap-3">
                    <Settings className="text-[var(--text-muted)]" size={32} strokeWidth={2.5} />
                    Paramètres
                </h1>
                <p className="text-[var(--text-muted)] text-lg font-medium">Gérez votre compte, vos intégrations et votre sécurité.</p>
            </motion.div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Sidebar Navigation */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full lg:w-64 flex-shrink-0"
                >
                    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-3 shadow-sm flex lg:flex-col gap-2 overflow-x-auto hide-scroll">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all whitespace-nowrap lg:whitespace-normal ${
                                    activeTab === tab.id 
                                    ? `bg-[var(--surface-0)] text-${tab.color}-500 shadow-sm border border-[var(--border)]` 
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] border border-transparent'
                                }`}
                            >
                                <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                                {tab.label}
                            </button>
                        ))}
                        <div className="hidden lg:block w-full h-px bg-[var(--border)] my-2" />
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all border border-transparent whitespace-nowrap lg:whitespace-normal"
                        >
                            <LogOut size={20} strokeWidth={2} />
                            Déconnexion
                        </button>
                    </div>
                </motion.div>

                {/* Content Area */}
                <div className="flex-1 min-w-0 w-full">
                    <AnimatePresence mode="wait">
                        {/* PROFILE */}
                        {activeTab === 'profile' && (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 md:p-8 shadow-sm">
                                    <h2 className="text-2xl font-black mb-8 text-[var(--text-primary)]">Informations du Compte</h2>
                                    
                                    <div className="flex flex-col md:flex-row gap-8 mb-10">
                                        <div className="relative group self-start">
                                            <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-3xl font-black text-white shadow-xl bg-gradient-to-br from-blue-500 to-purple-600">
                                                {user?.avatar ? (
                                                    <img src={user.avatar} alt="avatar" className="w-full h-full rounded-[2rem] object-cover" />
                                                ) : getInitials(user?.name || 'U')}
                                            </div>
                                            <button className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                                                <Upload size={18} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                        <div className="flex-1 space-y-5">
                                            <div className="grid sm:grid-cols-2 gap-5">
                                                <Input
                                                    label="Nom Complet"
                                                    value={form.name}
                                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                                    className="font-medium"
                                                />
                                                <Input
                                                    label="Adresse Email"
                                                    type="email"
                                                    value={form.email}
                                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                                    className="font-medium"
                                                />
                                            </div>
                                            <div className="pt-2">
                                                <label className="text-sm font-bold text-[var(--text-primary)] mb-2 block">Plan d'abonnement</label>
                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 rounded-lg font-black text-sm shadow-sm">
                                                    👑 {user?.plan || 'PRO'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-[var(--border)] flex justify-end">
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={saving}
                                            className="px-8 py-3.5 bg-[var(--text-primary)] text-[var(--surface-0)] rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
                                        >
                                            {saving ? 'Sauvegarde...' : <><Save size={18} /> Sauvegarder</>}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* INTEGRATIONS */}
                        {activeTab === 'integrations' && (
                            <motion.div
                                key="integrations"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 md:p-8 shadow-sm">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                            <Smartphone size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-[var(--text-primary)]">Firebase Cloud Messaging</h2>
                                            <p className="text-[var(--text-secondary)] font-medium">Connectez FCM pour envoyer des Push en marque blanche.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <Input
                                            label="Service Account JSON"
                                            placeholder='{"type": "service_account", "project_id": "..."}'
                                            value={firebaseKey}
                                            onChange={e => setFirebaseKey(e.target.value)}
                                            type="password"
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!firebaseKey) return toast.error('Veuillez entrer une clé valide');
                                                setSaving(true)
                                                try {
                                                    await api.post('/user/firebase', { key: firebaseKey })
                                                    toast.success('Clé Firebase sauvegardée !')
                                                } catch (e: any) {
                                                    toast.error(e.error || 'Erreur')
                                                } finally {
                                                    setSaving(false)
                                                }
                                            }}
                                            disabled={saving}
                                            className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors"
                                        >
                                            Connecter Firebase
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* NOTIFICATIONS */}
                        {activeTab === 'notifications' && (
                            <motion.div
                                key="notifications"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 md:p-8 shadow-sm">
                                    <h2 className="text-2xl font-black mb-8 text-[var(--text-primary)]">Préférences d'Alertes</h2>
                                    
                                    <div className="space-y-6">
                                        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5">
                                            <Toggle
                                                label="Build terminé"
                                                description="Recevoir un email quand votre application est compilée et prête."
                                                checked={notifSettings.buildComplete}
                                                onChange={v => setNotifSettings(s => ({ ...s, buildComplete: v }))}
                                            />
                                        </div>
                                        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5">
                                            <Toggle
                                                label="Erreur de compilation"
                                                description="Recevoir une alerte immédiate si le build échoue."
                                                checked={notifSettings.buildFailed}
                                                onChange={v => setNotifSettings(s => ({ ...s, buildFailed: v }))}
                                            />
                                        </div>
                                        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5">
                                            <Toggle
                                                label="Rapport hebdomadaire"
                                                description="Recevoir un résumé des statistiques de vos apps chaque lundi."
                                                checked={notifSettings.weeklyReport}
                                                onChange={v => setNotifSettings(s => ({ ...s, weeklyReport: v }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-8 flex justify-end">
                                        <button
                                            onClick={async () => {
                                                setSaving(true)
                                                await new Promise(r => setTimeout(r, 800))
                                                setSaving(false)
                                                toast.success('Préférences enregistrées !')
                                            }}
                                            disabled={saving}
                                            className="px-8 py-3.5 bg-[var(--text-primary)] text-[var(--surface-0)] rounded-xl font-bold hover:opacity-90 transition-opacity"
                                        >
                                            {saving ? 'Enregistrement...' : 'Enregistrer'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* SECURITY */}
                        {activeTab === 'security' && (
                            <motion.div
                                key="security"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 md:p-8 shadow-sm">
                                    <h2 className="text-2xl font-black mb-6 text-[var(--text-primary)]">Mot de passe</h2>
                                    <div className="space-y-4 max-w-md mb-6">
                                        <Input label="Mot de passe actuel" type="password" />
                                        <Input label="Nouveau mot de passe" type="password" />
                                        <Input label="Confirmer le nouveau" type="password" />
                                    </div>
                                    <button className="px-6 py-3 bg-[var(--surface-2)] text-[var(--text-primary)] rounded-xl font-bold border border-[var(--border)] hover:bg-[var(--border)] transition-colors">
                                        Modifier le mot de passe
                                    </button>
                                </div>

                                <div className="bg-[var(--surface-1)] border-2 border-red-500/20 rounded-[2rem] p-6 md:p-8 shadow-sm relative overflow-hidden">
                                    <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black mb-3 text-red-600 flex items-center gap-2">
                                            <Trash2 size={24} /> Danger Zone
                                        </h2>
                                        <p className="text-red-800/80 dark:text-red-200/80 font-medium mb-6">
                                            La suppression de votre compte est irréversible. Toutes vos applications et données seront effacées.
                                        </p>
                                        <button
                                            onClick={async () => {
                                                if (confirm('Êtes-vous absolument sûr ?')) {
                                                    try {
                                                        await api.delete('/user');
                                                        toast.success('Compte supprimé.');
                                                        logout();
                                                        navigate('/auth/login');
                                                    } catch (e) {
                                                        toast.error('Erreur lors de la suppression.');
                                                    }
                                                }
                                            }}
                                            className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black shadow-[0_10px_20px_rgba(239,68,68,0.2)] transition-all"
                                        >
                                            Supprimer mon compte
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
