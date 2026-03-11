import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Settings, User, CreditCard, Bell, Shield, Globe, Plus, Pencil,
    Save, LogOut, Trash2, Eye, EyeOff, CheckCircle, Upload
} from 'lucide-react'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { Toggle, Select } from '../components/ui/FormControls'
import { useAuthStore } from '../store/authStore'
import { getInitials } from '../lib/utils'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useEffect } from 'react'

const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'billing', label: 'Facturation', icon: CreditCard },
    { id: 'integrations', label: 'Intégrations', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Shield },
]

const plans = [
    { id: 'free', name: 'Gratuit', price: 0, apps: 1, builds: 2 },
    { id: 'starter', name: 'Starter', price: 19, apps: 5, builds: 20 },
    { id: 'pro', name: 'Pro', price: 49, apps: -1, builds: -1 },
    { id: 'enterprise', name: 'Enterprise', price: 149, apps: -1, builds: -1 },
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
        toast.success('Profil mis à jour !')
    }

    const handleLogout = () => {
        logout()
        navigate('/auth/login')
    }

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto w-full overflow-x-hidden">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3 break-words">
                    <Settings size={24} className="md:w-7 md:h-7" style={{ color: 'var(--brand-500)' }} />
                    Paramètres
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>Gérez votre compte et vos préférences.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar tabs */}
                <div className="md:w-52 flex-shrink-0">
                    <nav className="space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="sidebar-item w-full"
                                style={{
                                    background: activeTab === tab.id ? 'rgba(52,97,245,0.1)' : '',
                                    color: activeTab === tab.id ? 'var(--brand-500)' : 'var(--text-secondary)',
                                }}
                            >
                                <tab.icon size={17} />
                                {tab.label}
                            </button>
                        ))}
                        <div className="divider my-2" />
                        <button onClick={handleLogout} className="sidebar-item w-full" style={{ color: '#ef4444' }}>
                            <LogOut size={17} />
                            Déconnexion
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-5">
                    {/* Profile */}
                    {activeTab === 'profile' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="card p-6">
                                <h2 className="font-bold text-lg mb-5">Informations personnelles</h2>

                                {/* Avatar */}
                                <div className="flex items-center gap-5 mb-6">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-full avatar flex items-center justify-center text-xl font-bold text-white"
                                            style={{ background: 'linear-gradient(135deg, #3461f5, #7c3aed)' }}>
                                            {user?.avatar ? (
                                                <img src={user.avatar} alt="avatar" className="w-20 h-20 rounded-full" />
                                            ) : getInitials(user?.name || 'U')}
                                        </div>
                                        <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                                            style={{ background: 'var(--brand-500)', color: 'white' }}>
                                            <Upload size={12} />
                                        </button>
                                    </div>
                                    <div>
                                        <p className="font-semibold">{user?.name}</p>
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                                        <span className="badge badge-brand text-xs mt-1 capitalize">{user?.plan}</span>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                                    <Input
                                        label="Nom complet"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    />
                                    <Input
                                        label="Email"
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    />
                                </div>

                                <Button onClick={handleSaveProfile} loading={saving} icon={<Save size={16} />}>
                                    Sauvegarder
                                </Button>
                            </div>


                        </motion.div>
                    )}

                    {/* Billing */}
                    {activeTab === 'billing' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="card p-6 mb-5">
                                <h2 className="font-bold text-lg mb-5">Plan actuel</h2>
                                <div className="flex items-center justify-between p-4 rounded-xl mb-5"
                                    style={{ background: 'rgba(52,97,245,0.08)', border: '1px solid rgba(52,97,245,0.2)' }}>
                                    <div>
                                        <p className="font-bold text-lg capitalize">{user?.plan}</p>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {plans.find(p => p.id === user?.plan)?.price === 0 ? 'Gratuit' : `${plans.find(p => p.id === user?.plan)?.price}€/mois`}
                                        </p>
                                    </div>
                                    <CheckCircle size={22} style={{ color: '#10b981' }} />
                                </div>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {plans.map(plan => (
                                        <div
                                            key={plan.id}
                                            className="p-4 rounded-xl border-2 cursor-pointer transition-all"
                                            style={{
                                                borderColor: user?.plan === plan.id ? 'var(--brand-500)' : 'var(--border)',
                                                background: user?.plan === plan.id ? 'rgba(52,97,245,0.08)' : 'var(--surface-1)',
                                            }}
                                        >
                                            <p className="font-bold">{plan.name}</p>
                                            <p className="text-lg font-bold mt-1"
                                                style={{ color: user?.plan === plan.id ? 'var(--brand-500)' : 'var(--text-primary)' }}>
                                                {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                                            </p>
                                            <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                                <p>{plan.apps === -1 ? '∞' : plan.apps} app{plan.apps !== 1 ? 's' : ''}</p>
                                                <p>{plan.builds === -1 ? '∞' : plan.builds} builds/mois</p>
                                            </div>
                                            {user?.plan !== plan.id && (
                                                <button
                                                    className="btn btn-primary btn-sm w-full mt-3 text-xs"
                                                    onClick={() => toast.success(`Passage au plan ${plan.name}...`)}
                                                >
                                                    {plan.price > (plans.find(p => p.id === user?.plan)?.price || 0) ? 'Upgrader' : 'Choisir'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="card p-6">
                                <h2 className="font-bold text-lg mb-5">Moyen de paiement</h2>
                                <div className="flex items-center gap-4 p-4 rounded-xl mb-4"
                                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                                    <div className="w-10 h-7 rounded bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold">
                                        VISA
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">•••• •••• •••• 4242</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Expire 12/27</p>
                                    </div>
                                    <button className="ml-auto text-xs" style={{ color: 'var(--brand-500)' }}>Modifier</button>
                                </div>
                                <Button variant="secondary" size="sm" icon={<Plus size={14} />}>
                                    Ajouter un moyen de paiement
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Notifications settings */}
                    {activeTab === 'notifications' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="card p-6">
                                <h2 className="font-bold text-lg mb-5">Préférences de notifications</h2>
                                <div className="space-y-4">
                                    <Toggle
                                        label="Build terminé"
                                        description="Recevoir un email quand votre app est prête"
                                        checked={notifSettings.buildComplete}
                                        onChange={v => setNotifSettings(s => ({ ...s, buildComplete: v }))}
                                    />
                                    <div className="divider" />
                                    <Toggle
                                        label="Build échoué"
                                        description="Recevoir un email en cas d'erreur de compilation"
                                        checked={notifSettings.buildFailed}
                                        onChange={v => setNotifSettings(s => ({ ...s, buildFailed: v }))}
                                    />
                                    <div className="divider" />
                                    <Toggle
                                        label="Rapport hebdomadaire"
                                        description="Résumé des performances de vos apps chaque lundi"
                                        checked={notifSettings.weeklyReport}
                                        onChange={v => setNotifSettings(s => ({ ...s, weeklyReport: v }))}
                                    />
                                    <div className="divider" />
                                    <Toggle
                                        label="Communications marketing"
                                        description="Nouveautés, tutoriels et offres spéciales"
                                        checked={notifSettings.marketing}
                                        onChange={v => setNotifSettings(s => ({ ...s, marketing: v }))}
                                    />
                                </div>
                                <Button className="mt-5" loading={saving} onClick={async () => {
                                    setSaving(true)
                                    await new Promise(r => setTimeout(r, 800))
                                    setSaving(false)
                                    toast.success('Préférences sauvegardées !')
                                }}>
                                    Enregistrer
                                </Button>
                            </div>
                        </motion.div>
                    )}
                    {/* Integrations (Firebase) */}
                    {activeTab === 'integrations' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="card p-6">
                                <h2 className="font-bold text-lg mb-2">Clé Firebase Cloud Messaging</h2>
                                <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                                    Pour envoyer des notifications push en marque blanche à vos utilisateurs, veuillez renseigner votre clé de compte de service Firebase.
                                </p>
                                <div className="space-y-4 max-w-lg mb-5">
                                    <Input
                                        label="Service Account JSON"
                                        placeholder='{"type": "service_account", "project_id": "..."}'
                                        value={firebaseKey}
                                        onChange={e => setFirebaseKey(e.target.value)}
                                        type="password"
                                    />
                                </div>
                                <Button loading={saving} onClick={async () => {
                                    if (!firebaseKey) return toast.error('Veuillez entrer une clé valide');
                                    setSaving(true)
                                    try {
                                        await api.post('/user/firebase', { key: firebaseKey })
                                        toast.success('Clé Firebase sauvegardée. Les push sont activés !')
                                    } catch (e: any) {
                                        toast.error(e.error || 'Erreur lors de la sauvegarde')
                                    } finally {
                                        setSaving(false)
                                    }
                                }}>
                                    Connecter Firebase
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Security */}
                    {activeTab === 'security' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="card p-6 mb-5">
                                <h2 className="font-bold text-lg mb-5">Changer le mot de passe</h2>
                                <div className="space-y-4 max-w-md">
                                    <Input label="Mot de passe actuel" type="password" placeholder="••••••••" />
                                    <Input label="Nouveau mot de passe" type="password" placeholder="••••••••" />
                                    <Input label="Confirmer le nouveau" type="password" placeholder="••••••••" />
                                    <Button icon={<Shield size={16} />}>Modifier le mot de passe</Button>
                                </div>
                            </div>

                            <div className="card p-6 mb-5">
                                <h2 className="font-bold text-lg mb-2">Sessions actives</h2>
                                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                    Appareils actuellement connectés à votre compte.
                                </p>
                                {[
                                    { device: 'Chrome sur Windows', location: 'Paris, France', current: true, time: 'Maintenant' },
                                    { device: 'Safari sur iPhone', location: 'Lyon, France', current: false, time: 'il y a 2 jours' },
                                ].map((session, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl mb-2"
                                        style={{ background: 'var(--surface-1)' }}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-sm">{session.device}</p>
                                                {session.current && <span className="badge badge-success text-xs">Actuelle</span>}
                                            </div>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{session.location} · {session.time}</p>
                                        </div>
                                        {!session.current && (
                                            <button className="text-xs font-medium" style={{ color: '#ef4444' }}>Révoquer</button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="card p-6">
                                <h2 className="font-bold text-lg mb-2">Double authentification (2FA)</h2>
                                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                    Ajoutez une couche de sécurité supplémentaire à votre compte.
                                </p>
                                <Button variant="secondary" icon={<Shield size={16} />}>Activer la 2FA</Button>
                            </div>

                            <div className="card p-6 mt-6 overflow-hidden relative">
                                <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 pointer-events-none" />
                                <div className="absolute inset-y-0 left-0 w-1 bg-red-500" />
                                <div className="relative z-10">
                                    <h2 className="font-bold text-xl mb-2 flex items-center gap-2 text-red-600 dark:text-red-400">
                                        <Trash2 size={20} />
                                        Zone de danger extrême
                                    </h2>
                                    <p className="text-sm mb-5 text-red-800/70 dark:text-red-200/60 font-medium">
                                        Attention : La suppression de votre compte est définitive. Toutes vos données, y compris vos applications générées et statistiques, seront effacées à tout jamais. Cette action est irréversible.
                                    </p>
                                    <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.1)' }}>
                                        <Button
                                            loading={saving}
                                            onClick={async () => {
                                                if (confirm('Êtes-vous absolument sûr de vouloir supprimer votre compte définitivement ?\n\nCette action ne peut pas être annulée.')) {
                                                    setSaving(true);
                                                    try {
                                                        await api.delete('/user');
                                                        toast.success('Votre compte a été supprimé avec succès.');
                                                        logout();
                                                        navigate('/auth/login');
                                                    } catch (e) {
                                                        toast.error('Erreur lors de la suppression du compte.');
                                                    }
                                                    setSaving(false);
                                                }
                                            }}
                                            style={{ background: '#ef4444', color: 'white', borderColor: 'transparent', boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.39)', border: 'none' }}
                                            icon={<Trash2 size={16} />}
                                        >
                                            Oui, Supprimer mon compte
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}


