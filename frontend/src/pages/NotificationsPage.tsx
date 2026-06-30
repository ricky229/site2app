import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Bell, Send, Clock, Users, BarChart2, Plus, Image as ImageIcon,
    Link as LinkIcon, CheckCircle, Trash2, Smartphone, Apple, Play, Copy, Globe, AlertCircle
} from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Textarea, Select, Toggle } from '../components/ui/FormControls'
import { StatusBadge } from '../components/ui/Badge'
import { formatRelativeTime, formatNumber } from '../lib/utils'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import api, { getUserById, updateUser, getDevices, getAppsByUser, nodeApi, BUBBLE_TOKEN } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import type { App } from '../types'

export default function NotificationsPage() {
    const queryClient = useQueryClient()
    const [tab, setTab] = useState<'compose' | 'history' | 'devices' | 'templates' | 'settings'>('compose')
    const [selectedApp, setSelectedApp] = useState('all')
    const [form, setForm] = useState({
        title: '',
        body: '',
        image: '',
        actionUrl: '',
        target: 'all' as 'all' | 'android' | 'ios' | string[],
        scheduled: false,
        scheduledAt: '',
    })
    const [targetMode, setTargetMode] = useState<'all' | 'specific'>('all')
    const [selectedDevices, setSelectedDevices] = useState<string[]>([])

    const { user } = useAuthStore()

    const { data: apps = [] } = useQuery<App[]>({ 
        queryKey: ['apps', user?.id], 
        queryFn: async () => user?.id ? await getAppsByUser(user.id) : [],
        enabled: !!user?.id
    })

    const { data: notifications = [] } = useQuery<any[]>({ 
        queryKey: ['notifications', user?.id], 
        queryFn: async () => {
            if (!user?.id) return []
            let baseUrl = 'https://site2app.online/api/1.1/obj'
            if (user.bubbleApiUrl) {
                const parts = user.bubbleApiUrl.split('/api/1.1/obj');
                if (parts.length > 0) baseUrl = parts[0] + '/api/1.1/obj';
            }

            const constraints = JSON.stringify([{ key: 'owner', constraint_type: 'equals', value: user.id }])
            const headers: any = {}
            if (!user.bubbleApiUrl) {
                headers['Authorization'] = `Bearer ${BUBBLE_TOKEN}`
            }

            const res = await axios.get(`${baseUrl}/notification?constraints=${encodeURIComponent(constraints)}&sort_field=Created%20Date&descending=true`, { headers })
            
            const results = res.data?.response?.results || []
            return results.map((n: any) => ({
                ...n,
                stats: n.stats || {
                    sent: n.sentCount || 0,
                    delivered: n.deliveredCount || 0,
                    deliveryRate: n.sentCount > 0 ? Math.round((n.deliveredCount || 0) / n.sentCount * 100) : 0,
                    openRate: 0,
                    clickRate: 0
                }
            }))
        },
        enabled: !!user?.id
    })

    const { data: userProfile } = useQuery<any>({ 
        queryKey: ['userProfile', user?.id], 
        queryFn: async () => {
            if (!user?.id) return null;
            return await getUserById(user.id);
        },
        enabled: !!user?.id
    })

    const { data: registeredDevices = [] } = useQuery<any[]>({ 
        queryKey: ['devices', user?.bubbleApiUrl], 
        queryFn: async () => {
            let customBaseUrl = '';
            if (user?.bubbleApiUrl) {
                const parts = user.bubbleApiUrl.split('/api/1.1/obj');
                if (parts.length > 0) customBaseUrl = parts[0] + '/api/1.1/obj';
            }
            const results = await getDevices(undefined, customBaseUrl);
            const mapped = results.map((d: any) => ({
                ...d,
                id: d._id || d.id,
                pushToken: d.pushToken || d.push_token || d.id
            })).filter((d: any) => d.pushToken && d.pushToken.includes(':')); 
            
            const seen = new Map<string, any>();
            for (const d of mapped) {
                const existing = seen.get(d.pushToken);
                if (!existing || new Date(d.Modified_Date || d.Created_Date || 0) > new Date(existing.Modified_Date || existing.Created_Date || 0)) {
                    seen.set(d.pushToken, d);
                }
            }
            return Array.from(seen.values());
        } 
    })

    const [firebaseConfig, setFirebaseConfig] = useState({
        adminSdkJson: '',
        googleServicesJson: '',
        bubbleApiUrl: ''
    })

    useEffect(() => {
        if (userProfile) {
            setFirebaseConfig({
                adminSdkJson: userProfile.firebaseKey || '',
                googleServicesJson: userProfile.googleServicesJson || '',
                bubbleApiUrl: userProfile.bubbleApiUrl || ''
            })
        }
    }, [userProfile])

    useEffect(() => {
        if (!user?.bubbleApiUrl || !user?.id) return;
        const triggerSync = async () => {
            try {
                await nodeApi.get('/notifications/poll');
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } catch (err) {
                console.warn('[Sync] Node polling not available');
            }
        };
        triggerSync();
        const interval = setInterval(triggerSync, 30000);
        return () => clearInterval(interval);
    }, [user?.bubbleApiUrl, user?.id])

    const firebaseMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (!user?.id) throw new Error("Non authentifié")
            try {
                await nodeApi.post('/auth/firebase-config', {
                    adminSdkJson: payload.adminSdkJson,
                    googleServicesJson: payload.googleServicesJson,
                    bubbleApiUrl: payload.bubbleApiUrl
                })
            } catch (nodeErr) {}
            return await updateUser(user.id, {
                bubbleApiUrl: payload.bubbleApiUrl,
                firebaseKey: payload.adminSdkJson,
                googleServicesJson: payload.googleServicesJson
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] })
            toast.success('Configuration sauvegardée !')
        },
        onError: (err: any) => toast.error(err?.response?.data?.error || err?.message || 'Erreur')
    })

    const sendMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (!user?.id) throw new Error("Non authentifié")
            let baseUrl = 'https://site2app.online/api/1.1/obj'
            if (user.bubbleApiUrl) {
                const parts = user.bubbleApiUrl.split('/api/1.1/obj');
                if (parts.length > 0) baseUrl = parts[0] + '/api/1.1/obj';
            }

            const isSpecific = Array.isArray(payload.target);
            const targetStr = isSpecific ? 'specific' : String(payload.target || 'all');
            
            let tokenStr = '';
            if (isSpecific) {
                tokenStr = payload.target.join(',');
            } else {
                const allTokens = registeredDevices
                    .map((d: any) => d.pushToken)
                    .filter((t: string) => t && t.includes(':'));
                tokenStr = allTokens.join(',');
            }

            const headers: any = { 'Content-Type': 'application/json' }
            if (!user.bubbleApiUrl) headers['Authorization'] = `Bearer ${BUBBLE_TOKEN}`

            const res = await axios.post(`${baseUrl}/notification_queue`, {
                title: String(payload.title || ''),
                body: String(payload.body || ''),
                owner: String(user.id || ''),
                targetApp: String(payload.buildId || 'all'),
                targetOs: targetStr,
                targetToken: tokenStr,
                image: String(payload.image || ''),
                targetUrl: String(payload.actionUrl || '')
            }, { headers })
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            toast.success(form.scheduled ? '📅 Notification programmée !' : '🚀 Notification envoyée !')
            setForm(f => ({ ...f, title: '', body: '' }))
            setSelectedDevices([]) 
            if (!form.scheduled) setTab('history')
        },
        onError: (err: any) => toast.error('Erreur lors de l\'envoi')
    })

    const handleSend = () => {
        if (!form.title || !form.body) {
            toast.error('Le titre et le message sont requis');
            return;
        }
        let target = 'all';
        if (targetMode === 'specific') {
            if (selectedDevices.length === 0) {
                toast.error('Veuillez sélectionner au moins un appareil');
                return;
            }
            target = selectedDevices as any;
        }
        sendMutation.mutate({ ...form, target, buildId: selectedApp });
    }

    const clearAllMutation = useMutation({
        mutationFn: async () => {
            if (!user?.id) throw new Error("Non authentifié")
            let baseUrl = 'https://site2app.online/api/1.1/obj'
            if (user.bubbleApiUrl) {
                const parts = user.bubbleApiUrl.split('/api/1.1/obj');
                if (parts.length > 0) baseUrl = parts[0] + '/api/1.1/obj';
            }
            const constraints = JSON.stringify([{ key: 'owner', constraint_type: 'equals', value: user.id }])
            const headers: any = {}
            if (!user.bubbleApiUrl) headers['Authorization'] = `Bearer ${BUBBLE_TOKEN}`

            const res = await axios.get(`${baseUrl}/notification?constraints=${encodeURIComponent(constraints)}`, { headers })
            const toDelete = res.data?.response?.results || []
            for (const item of toDelete) {
                await axios.delete(`${baseUrl}/notification/${item._id}`, { headers })
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            toast.success('Historique effacé')
        }
    })

    const activeApp = selectedApp === 'all' ? apps[0] : apps.find(a => a.id === selectedApp)
    const activeAppIcon = activeApp?.name ? activeApp.name.slice(0,2).toUpperCase() : 'APP'

    return (
        <div className="p-4 md:p-8 lg:p-10 max-w-[1400px] mx-auto w-full overflow-x-hidden">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
            >
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] mb-2 tracking-tight flex items-center gap-3">
                        <Bell className="text-blue-500" size={32} strokeWidth={2.5} />
                        Push Notifications
                    </h1>
                    <p className="text-[var(--text-muted)] text-lg font-medium">Engagez vos utilisateurs instantanément.</p>
                </div>

                <div className="flex bg-[var(--surface-1)] border border-[var(--border)] p-1 rounded-2xl shadow-sm overflow-x-auto hide-scroll">
                    {[
                        { id: 'compose', label: 'Rédiger', icon: Send },
                        { id: 'history', label: 'Historique', icon: Clock },
                        { id: 'devices', label: 'Appareils', icon: Users },
                        { id: 'templates', label: 'Modèles', icon: Copy },
                        { id: 'settings', label: 'API & Config', icon: Smartphone }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as any)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                                tab === t.id ? 'bg-[var(--surface-0)] text-blue-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <t.icon size={18} />
                            {t.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {tab === 'compose' && (
                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Form Section */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 space-y-6">
                        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 md:p-8 shadow-sm">
                            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                                <Send className="text-blue-500" />
                                Contenu du message
                            </h2>
                            <div className="space-y-5">
                                <Select
                                    label="Application cible"
                                    options={[
                                        { value: 'all', label: `Toutes vos apps (${apps.length})` },
                                        ...apps.map(a => ({ value: a.id, label: a.name || 'App' }))
                                    ]}
                                    value={selectedApp}
                                    onChange={e => setSelectedApp(e.target.value)}
                                />
                                <Select
                                    label="Mode d'envoi"
                                    options={[
                                        { value: 'all', label: '📢 Diffuser à tous les appareils' },
                                        { value: 'specific', label: '🎯 Cibler des appareils spécifiques' }
                                    ]}
                                    value={targetMode}
                                    onChange={e => setTargetMode(e.target.value as any)}
                                />
                                {targetMode === 'specific' && (() => {
                                    const filteredDevices = registeredDevices.filter(d => selectedApp === 'all' || d.buildId === selectedApp);
                                    const allSelected = filteredDevices.length > 0 && filteredDevices.every(d => selectedDevices.includes(d.pushToken));
                                    return (
                                        <div className="space-y-2 mt-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-[var(--text-primary)]">SǸlectionnez les appareils ({filteredDevices.length})</p>
                                                {filteredDevices.length > 0 && (
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-500 font-medium">
                                                        <input
                                                            type="checkbox"
                                                            checked={allSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedDevices(filteredDevices.map(d => d.pushToken))
                                                                else setSelectedDevices([])
                                                            }}
                                                        />
                                                        Tout sǸlectionner
                                                    </label>
                                                )}
                                            </div>
                                            <div className="max-h-[200px] overflow-y-auto space-y-2 border border-[var(--border)] rounded-xl p-3 bg-[var(--surface-0)]">
                                                {filteredDevices.map((device: any) => (
                                                    <label key={device.id} className="flex items-start gap-3 p-2 hover:bg-[var(--surface-2)] rounded-lg cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDevices.includes(device.pushToken)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedDevices(prev => [...prev, device.pushToken])
                                                                else setSelectedDevices(prev => prev.filter(t => t !== device.pushToken))
                                                            }}
                                                            className="mt-1"
                                                        />
                                                        <div className="overflow-hidden">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold truncate text-[var(--text-primary)]">📱 Appareil {device.os?.toUpperCase() || 'Android'}</p>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                                    {device.buildId?.substring(0,6) || 'Global'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-[var(--text-muted)] truncate font-mono mt-0.5" title={device.pushToken}>{device.pushToken}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                                {filteredDevices.length === 0 && (
                                                    <p className="text-sm text-[var(--text-muted)] p-2">Aucun appareil trouvǸ pour cette application.</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })()}
                                <Input
                                    label="Titre"
                                    placeholder="Offre spéciale !"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                />
                                <Textarea
                                    label="Message"
                                    placeholder="Découvrez notre nouvelle collection..."
                                    rows={4}
                                    value={form.body}
                                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 md:p-8 shadow-sm">
                            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                                <ImageIcon className="text-purple-500" />
                                Médias & Actions (Optionnel)
                            </h2>
                            <div className="space-y-5">
                                <Input
                                    label="URL de l'image"
                                    placeholder="https://..."
                                    value={form.image}
                                    onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                                    icon={<ImageIcon size={16} />}
                                />
                                <Input
                                    label="Lien d'action (URL)"
                                    placeholder="Ouvrir une page spécifique au clic"
                                    value={form.actionUrl}
                                    onChange={e => setForm(f => ({ ...f, actionUrl: e.target.value }))}
                                    icon={<LinkIcon size={16} />}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Preview Section */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
                        <div className="sticky top-24">
                            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm mb-6 flex flex-col items-center justify-center min-h-[500px]">
                                <p className="text-sm font-bold text-[var(--text-muted)] mb-8 tracking-widest uppercase">Aperçu en direct</p>
                                
                                {/* iOS Mockup */}
                                <div className="relative w-[300px] h-[600px] bg-black rounded-[3rem] p-3 shadow-2xl border-[4px] border-slate-800 flex flex-col">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-20" /> {/* Notch */}
                                    <div className="flex-1 rounded-[2.5rem] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 overflow-hidden relative border border-white/10">
                                        {/* Lock Screen UI */}
                                        <div className="absolute top-12 w-full text-center">
                                            <p className="text-[64px] font-thin tracking-tight leading-none text-slate-800 dark:text-white">
                                                {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </p>
                                        </div>

                                        {/* Notification Bubble */}
                                        <AnimatePresence>
                                            {(form.title || form.body) && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    className="absolute top-48 left-4 right-4 rounded-3xl p-4 shadow-xl backdrop-blur-xl"
                                                    style={{ background: 'rgba(255, 255, 255, 0.65)' }}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                                                            <span className="text-white font-bold text-sm">{activeAppIcon}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center mb-0.5">
                                                                <p className="font-bold text-slate-900 text-sm truncate">{activeApp?.name || 'Site2App'}</p>
                                                                <span className="text-[10px] text-slate-500 font-medium">à l'instant</span>
                                                            </div>
                                                            <p className="font-bold text-slate-800 text-sm leading-tight mb-1">{form.title || 'Titre de la notification'}</p>
                                                            <p className="text-sm text-slate-600 leading-snug">{form.body || 'Le texte de votre message s\'affichera ici.'}</p>
                                                        </div>
                                                    </div>
                                                    {form.image && (
                                                        <div className="mt-3 rounded-xl overflow-hidden shadow-sm h-32 bg-slate-200">
                                                            <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={sendMutation.isPending || !form.title || !form.body}
                                className="w-full py-5 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-lg transition-all shadow-[0_10px_40px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                            >
                                {sendMutation.isPending ? <Clock className="animate-spin" /> : <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                Envoyer la Notification
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Templates Tab */}
            {tab === 'templates' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { emoji: '🔥', title: 'Offre flash', body: 'Jusqu\'à -50% pendant 24h ! Découvrez nos meilleures offres maintenant.' },
                        { emoji: '📰', title: 'Nouveau contenu', body: 'Nous avons publié {X} nouveaux articles. Venez les découvrir !' },
                        { emoji: '✅', title: 'Confirmation commande', body: 'Votre commande #{NUM} a été confirmée. Merci pour votre achat !' },
                        { emoji: '⏰', title: 'Rappel', body: 'N\'oubliez pas de finaliser votre panier. Il vous attend !' },
                        { emoji: '🎉', title: 'Evénement', body: 'Ne manquez pas notre événement spécial ce {DATE} !' },
                        { emoji: '📦', title: 'Livraison', body: 'Votre colis #{NUM} est en chemin ! Livraison estimée : {DATE}.' },
                    ].map(template => (
                        <div key={template.title} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-3xl p-6 shadow-sm hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                            onClick={() => { setForm(f => ({ ...f, title: template.title, body: template.body })); setTab('compose'); toast.success('Modèle chargé !') }}>
                            <div className="text-4xl mb-4 bg-[var(--surface-2)] w-16 h-16 flex items-center justify-center rounded-2xl shadow-inner">{template.emoji}</div>
                            <h3 className="font-bold mb-2 text-[var(--text-primary)] text-lg">{template.title}</h3>
                            <p className="text-sm text-[var(--text-muted)] leading-relaxed">{template.body}</p>
                            <button
                                className="mt-4 text-sm font-bold text-blue-500 bg-blue-500/10 px-4 py-2 rounded-xl w-full hover:bg-blue-500 hover:text-white transition-colors"
                            >
                                Utiliser ce modèle →
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Other Tabs Content */}
            {tab === 'history' && (
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 md:p-8 shadow-sm min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black">Historique des envois</h2>
                        {notifications.length > 0 && (
                            <button
                                onClick={() => {
                                    if (confirm('Tout effacer ?')) clearAllMutation.mutate()
                                }}
                                className="text-red-500 font-bold text-sm flex items-center gap-2 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors"
                            >
                                <Trash2 size={16} /> Effacer
                            </button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <div className="text-center py-20">
                            <Clock size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                            <p className="text-lg font-bold text-[var(--text-muted)]">Aucune notification envoyée</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map(notif => (
                                <div key={notif._id} className="p-5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-500">
                                            <Bell size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-[var(--text-primary)] truncate">{notif.title}</h3>
                                            <p className="text-[var(--text-secondary)] text-sm truncate">{notif.body}</p>
                                            <p className="text-[var(--text-muted)] text-xs mt-2 font-medium">{formatRelativeTime(notif.scheduledAt || notif['Created Date'] || Date.now())}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border)]">
                                        <div className="text-center px-2">
                                            <p className="text-xs font-bold text-[var(--text-muted)] uppercase">Envoyées</p>
                                            <p className="font-black text-[var(--text-primary)] text-lg">{formatNumber(notif.stats?.sent || 0)}</p>
                                        </div>
                                        <div className="w-px h-8 bg-[var(--border)]" />
                                        <div className="text-center px-2">
                                            <p className="text-xs font-bold text-[var(--text-muted)] uppercase">Livrées</p>
                                            <p className="font-black text-emerald-500 text-lg">{formatNumber(notif.stats?.delivered || 0)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'devices' && (
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 md:p-8 shadow-sm">
                    <h2 className="text-2xl font-black mb-2">Appareils abonnés</h2>
                    <p className="text-[var(--text-muted)] font-medium mb-8">Liste des téléphones ayant accepté de recevoir vos notifications.</p>
                    
                    {registeredDevices.length === 0 ? (
                        <div className="text-center py-20">
                            <Users size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                            <p className="text-lg font-bold text-[var(--text-muted)]">Aucun appareil enregistré</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-[var(--border)]">
                                        <th className="py-3 px-4 font-bold text-[var(--text-muted)] uppercase text-xs">OS</th>
                                        <th className="py-3 px-4 font-bold text-[var(--text-muted)] uppercase text-xs">Token</th>
                                        <th className="py-3 px-4 font-bold text-[var(--text-muted)] uppercase text-xs">Dernière activité</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registeredDevices.map((d: any, i: number) => (
                                        <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${d.os === 'android' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                                    {d.os === 'android' ? '🤖 Android' : '🍎 iOS'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 font-mono text-xs text-[var(--text-secondary)]">{d.pushToken}</td>
                                            <td className="py-4 px-4 text-sm font-medium text-[var(--text-muted)]">{formatRelativeTime(d['Modified Date'] || d['Created Date'])}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === 'settings' && (
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 md:p-8 shadow-sm max-w-3xl">
                    <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                        <Apple className="text-[var(--text-primary)]" size={28} />
                        Configuration Firebase (FCM)
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold mb-2">Clé Privée Admin SDK (Firebase)</label>
                            <Textarea
                                rows={6}
                                placeholder='{\n  "type": "service_account",\n  "project_id": "votre-projet",\n  ...\n}'
                                value={firebaseConfig.adminSdkJson}
                                onChange={e => setFirebaseConfig(f => ({ ...f, adminSdkJson: e.target.value }))}
                                className="font-mono text-xs"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold mb-2">Google Services JSON (Pour l'App)</label>
                            <Textarea
                                rows={6}
                                placeholder='{\n  "project_info": {\n    "project_number": "123456789",\n    ...\n}'
                                value={firebaseConfig.googleServicesJson}
                                onChange={e => setFirebaseConfig(f => ({ ...f, googleServicesJson: e.target.value }))}
                                className="font-mono text-xs"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold mb-2">URL API Bubble (Optionnel)</label>
                            <Input
                                placeholder="https://votre-app.bubbleapps.io/api/1.1/obj"
                                value={firebaseConfig.bubbleApiUrl}
                                onChange={e => setFirebaseConfig(f => ({ ...f, bubbleApiUrl: e.target.value }))}
                            />
                        </div>

                        <button
                            onClick={() => firebaseMutation.mutate(firebaseConfig)}
                            disabled={firebaseMutation.isPending}
                            className="bg-[var(--text-primary)] text-[var(--surface-0)] font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
                        >
                            {firebaseMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
