import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Bell, Send, Clock, Users, BarChart2, Plus, Image,
    Link, AlertCircle, CheckCircle, Loader2, Trash2, Copy,
    ChevronDown, Filter, Globe, Smartphone, Apple,
    Shield, Sparkles, Upload, Save, Settings, Play, Image as ImageIcon
} from 'lucide-react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Textarea, Select, Toggle } from '../components/ui/FormControls'
import { StatusBadge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/Card'
import { formatRelativeTime, formatNumber } from '../lib/utils'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import api, { getUserById, updateUser, getDevices, getAppsByUser, dataApi, nodeApi, BUBBLE_TOKEN } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import type { App } from '../types'

export default function NotificationsPage() {
    const queryClient = useQueryClient()
    const [tab, setTab] = useState<'compose' | 'history' | 'devices' | 'templates' | 'settings' | 'api'>('compose')
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
    const [preview, setPreview] = useState(false)
    const [targetMode, setTargetMode] = useState<'all' | 'specific'>('all')
    const [selectedDevices, setSelectedDevices] = useState<string[]>([])

    const { user, updateUser: updateAuthUser } = useAuthStore()

    const { data: apps = [] } = useQuery<App[]>({ 
        queryKey: ['apps', user?.id], 
        queryFn: async () => user?.id ? await getAppsByUser(user.id) : [],
        enabled: !!user?.id
    })
    const { data: notifications = [] } = useQuery<any[]>({ 
        queryKey: ['notifications', user?.id], 
        queryFn: async () => {
            if (!user?.id) return []
            
            // Priority: User's custom URL, then default dataApi
            let baseUrl = 'https://site2app.online/api/1.1/obj'
            if (user.bubbleApiUrl) {
                const parts = user.bubbleApiUrl.split('/api/1.1/obj');
                if (parts.length > 0) baseUrl = parts[0] + '/api/1.1/obj';
            }

            const constraints = JSON.stringify([{ key: 'owner', constraint_type: 'equals', value: user.id }])
            
            // If custom URL, try without token or with user's token (if we had one)
            // Bubble often rejects the platform token on other apps
            const headers: any = {}
            if (!user.bubbleApiUrl) {
                headers['Authorization'] = `Bearer ${BUBBLE_TOKEN}`
            }

            const res = await axios.get(`${baseUrl}/notification?constraints=${encodeURIComponent(constraints)}&sort_field=Created%20Date&descending=true`, {
                headers
            })
            
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
            // Use user's custom Bubble URL if configured
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
            })).filter((d: any) => d.pushToken && d.pushToken.includes(':')); // Only valid FCM tokens
            
            // Deduplicate by pushToken (keep the most recent entry)
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

    const firebaseMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (!user?.id) throw new Error("Non authentifié")
            // Update directly on Bubble
            // 1. Update on Node Backend (this handles sensitive keys)
            await nodeApi.post('/auth/firebase-config', {
                adminSdkJson: payload.adminSdkJson,
                googleServicesJson: payload.googleServicesJson,
                bubbleApiUrl: payload.bubbleApiUrl
            })
            
            // 2. Also update on Bubble for UI consistency (optional fields only)
            return await updateUser(user.id, {
                bubbleApiUrl: payload.bubbleApiUrl
            })
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] })
            toast.success('Configuration sauvegardée !')
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error || err?.message || 'Erreur lors de la sauvegarde'
            toast.error(msg)
        }
    })

    const sendMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (!user?.id) throw new Error("Non authentifié")
            
            // Priority: User's custom URL, then default dataApi
            let baseUrl = 'https://site2app.online/api/1.1/obj'
            if (user.bubbleApiUrl) {
                const parts = user.bubbleApiUrl.split('/api/1.1/obj');
                if (parts.length > 0) baseUrl = parts[0] + '/api/1.1/obj';
            }

            // Prépare le payload pour Bubble
            const isSpecific = Array.isArray(payload.target);
            const targetStr = isSpecific ? 'specific' : String(payload.target || 'all');
            
            // IMPORTANT: When sending to 'all', we need to collect ALL device tokens
            // so the Bubble Database Trigger has actual tokens to iterate over
            let tokenStr = '';
            if (isSpecific) {
                tokenStr = payload.target.join(',');
            } else {
                // Fetch all valid device tokens for "send to all"
                const allTokens = registeredDevices
                    .map((d: any) => d.pushToken)
                    .filter((t: string) => t && t.includes(':'));
                tokenStr = allTokens.join(',');
            }

            // If custom URL, try without token
            const headers: any = { 'Content-Type': 'application/json' }
            if (!user.bubbleApiUrl) {
                headers['Authorization'] = `Bearer ${BUBBLE_TOKEN}`
            }

            const res = await axios.post(`${baseUrl}/notification_queue`, {
                title: String(payload.title || ''),
                body: String(payload.body || ''),
                owner: String(user.id || ''),
                targetApp: String(payload.buildId || 'all'),
                targetOs: targetStr,
                targetToken: tokenStr,
                image: String(payload.image || ''),
                targetUrl: String(payload.actionUrl || '')
            }, {
                headers
            })
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            toast.success(form.scheduled ? '📅 Notification programmée !' : '🚀 Notification enregistrée !')
            setForm(f => ({ ...f, title: '', body: '' }))
            setSelectedDevices([]) 
            if (!form.scheduled) setTab('history')
        },
        onError: (err: any) => {
            const errorMsg = err?.response?.data?.message || err?.message || 'Erreur inconnue';
            console.error('Bubble Save Error:', err?.response?.data || err);
            toast.error(`Erreur Bubble: ${errorMsg}`);
        }
    })

    const handleSend = () => {
        if (!form.title || !form.body) {
            toast.error('Titre et message requis')
            return
        }

        const payload = {
            ...form,
            target: targetMode === 'specific' ? selectedDevices : (form.target || 'all'),
            buildId: selectedApp === 'all' ? null : selectedApp,
            actionUrl: form.actionUrl || null,
        };

        if (targetMode === 'specific' && selectedDevices.length === 0) {
            toast.error('Sélectionnez au moins un appareil');
            return;
        }

        sendMutation.mutate(payload);
    }

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await dataApi.delete(`/notification/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            toast.success('Notification supprimée')
        }
    })

    const clearAllMutation = useMutation({
        mutationFn: async () => {
            toast.error("La suppression en masse n'est pas supportée par l'API Bubble par défaut.")
            throw new Error("Action non supportée")
        },
        onSuccess: () => {
        }
    })

    const appOptions = [{ value: 'all', label: 'Toutes mes applications' }, ...apps.map(a => ({ value: a.id, label: a.name }))]

    const activeApp = apps.find(a => a.id === selectedApp)
    const activeAppLabel = selectedApp === 'all' ? 'Mon App' : String(activeApp?.name || 'Mon App')
    const activeAppIcon = selectedApp === 'all' ? '📱' : String(activeApp?.name || 'Ap').slice(0, 2).toUpperCase()

    const totalSent = notifications.reduce((sum, n) => sum + (n.stats?.sent || 0), 0)
    const totalDelivered = notifications.reduce((sum, n) => sum + (n.stats?.delivered || 0), 0)
    const totalOpened = notifications.reduce((sum, n) => sum + (n.stats?.opened || 0), 0)

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent * 100).toFixed(1) : '0'
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered * 100).toFixed(1) : '0'
    const devicesCount = registeredDevices.length

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3 break-words">
                        <Bell size={24} className="md:w-7 md:h-7" style={{ color: 'var(--brand-500)' }} />
                        Notifications Push
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Communiquez directement avec vos utilisateurs via Firebase FCM.
                    </p>
                </div>
                <Select
                    options={appOptions}
                    value={selectedApp}
                    onChange={e => setSelectedApp(e.target.value)}
                />
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Notifications envoyées" value={formatNumber(totalSent)} change={0} icon={<Send size={20} />} color="#3461f5" />
            <StatCard title="Appareils actifs" value={formatNumber(devicesCount)} change={0} icon={<CheckCircle size={20} />} color="#10b981" />
        </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b overflow-x-auto whitespace-nowrap hide-scroll" style={{ borderColor: 'var(--border)' }}>
                {[
                    { id: 'compose', label: 'Composer', icon: Plus },
                    { id: 'history', label: 'Historique', icon: Clock },
                    { id: 'devices', label: 'Appareils (Tokens FCM)', icon: Smartphone },
                    { id: 'templates', label: 'Templates', icon: Copy },
                    { id: 'api', label: 'API & Intégration', icon: Link },
                    { id: 'settings', label: 'Configuration Firebase', icon: Globe },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id as any)}
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px"
                        style={{
                            borderColor: tab === t.id ? 'var(--brand-500)' : 'transparent',
                            color: tab === t.id ? 'var(--brand-500)' : 'var(--text-secondary)',
                        }}
                    >
                        <t.icon size={15} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Compose Tab */}
            {tab === 'compose' && (
                <div className="grid lg:grid-cols-5 gap-6">
                    {/* Form */}
                    <div className="lg:col-span-3 space-y-5">
                        <div className="card p-4 sm:p-6">
                            <h3 className="font-bold mb-4 sm:mb-5 text-sm sm:text-base">Contenu de la notification</h3>
                            <div className="space-y-4">
                                <Input
                                    label="Titre"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Titre accrocheur..."
                                    required
                                />
                                <Textarea
                                    label="Message"
                                    value={form.body}
                                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                                    placeholder="Votre message ici..."
                                    style={{ minHeight: '80px' }}
                                />
                                <Input
                                    label="Image (URL optionnelle)"
                                    value={form.image}
                                    onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                                    placeholder="https://..."
                                    icon={<ImageIcon size={16} />}
                                    hint="900×300px recommandé"
                                />
                                <Input
                                    label="URL de destination"
                                    value={form.actionUrl}
                                    onChange={e => setForm(f => ({ ...f, actionUrl: e.target.value }))}
                                    placeholder="https://monsite.fr/promo"
                                    icon={<Link size={16} />}
                                    hint="Page ouverte quand l'utilisateur clique"
                                />
                            </div>
                        </div>

                        <div className="card p-4 sm:p-6">
                            <h3 className="font-bold mb-4 sm:mb-5 text-sm sm:text-base">Ciblage (Appareils Android)</h3>
                            <div className="space-y-4">
                                <Select
                                    label="Mode d'envoi"
                                    options={[
                                        { value: 'all', label: "📢 Diffuser à tous les appareils de l'application" },
                                        { value: 'specific', label: '🎯 Cibler des appareils spécifiques' }
                                    ]}
                                    value={targetMode}
                                    onChange={e => setTargetMode(e.target.value as any)}
                                />

                                {targetMode === 'specific' && (() => {
                                    const filteredDevices = registeredDevices.filter(d => selectedApp === 'all' || d.buildId === selectedApp);
                                    const allSelected = filteredDevices.length > 0 && filteredDevices.every(d => selectedDevices.includes(d.id));
                                    return (
                                        <div className="space-y-2 mt-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold">Sélectionnez les appareils ({filteredDevices.length} disponibles)</p>
                                                {filteredDevices.length > 0 && (
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--brand-500)' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={allSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedDevices(filteredDevices.map(d => d.pushToken))
                                                                else setSelectedDevices([])
                                                            }}
                                                        />
                                                        Tout sélectionner
                                                    </label>
                                                )}
                                            </div>
                                            <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-xl p-3" style={{ borderColor: 'var(--border)' }}>
                                                {filteredDevices.map((device: any) => (
                                                    <label key={device.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDevices.includes(device.pushToken)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedDevices(prev => [...prev, device.pushToken])
                                                                else setSelectedDevices(prev => prev.filter(t => t !== device.pushToken))
                                                            }}
                                                            className="mt-1 accent-brand-500"
                                                        />
                                                        <div className="overflow-hidden">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold truncate">📱 Appareil {device.os?.toUpperCase() || 'Android'}</p>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                                    {device.buildId?.substring(0,6) || 'Global'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-500 truncate font-mono mt-0.5" title={device.pushToken}>{device.pushToken}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                                {filteredDevices.length === 0 && (
                                                    <p className="text-sm text-gray-400 p-2">Aucun appareil trouvé pour cette application.</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="card p-4 sm:p-6">
                            <h3 className="font-bold mb-4 sm:mb-5 text-sm sm:text-base">Envoi</h3>
                            <div className="space-y-4">
                                <Toggle
                                    label="Programmer l'envoi"
                                    description="Définir une date et heure d'envoi automatique"
                                    checked={form.scheduled}
                                    onChange={v => setForm(f => ({ ...f, scheduled: v }))}
                                />
                                {form.scheduled && (
                                    <Input
                                        label="Date et heure d'envoi"
                                        type="datetime-local"
                                        value={form.scheduledAt}
                                        onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                                    />
                                )}
                                <div className="flex gap-3">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setPreview(true)}
                                        icon={<Bell size={16} />}
                                    >
                                        Prévisualiser
                                    </Button>
                                    <Button
                                        onClick={handleSend}
                                        loading={sendMutation.isPending}
                                        icon={form.scheduled ? <Clock size={16} /> : <Send size={16} />}
                                        className="flex-1"
                                    >
                                        {form.scheduled ? 'Programmer' : 'Envoyer maintenant'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="lg:col-span-2">
                        <div className="sticky top-24">
                            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Aperçu</p>

                            {/* Android notification */}
                            <div className="card mb-4">
                                <div className="p-3 border-b text-xs font-semibold"
                                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                    Android
                                </div>
                                <div className="p-3 flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                        style={{ background: '#3461f5' }}>
                                        {activeAppIcon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold truncate">{form.title || 'Titre de la notification'}</p>
                                            <span className="text-xs ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>maintenant</span>
                                        </div>
                                        <p className="text-sm truncate-2" style={{ color: 'var(--text-secondary)' }}>
                                            {form.body || 'Votre message apparaîtra ici'}
                                        </p>
                                        {form.image && (
                                            <div className="mt-2 h-24 rounded-lg bg-gray-100 overflow-hidden">
                                                <img src={form.image} alt="preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {form.actionUrl && (
                                <div className="mt-3 card p-3 shadow-none bg-blue-50/50">
                                    <p className="text-xs font-bold mb-1" style={{ color: 'var(--brand-500)' }}>Action prévue :</p>
                                    <p className="text-xs text-blue-900 truncate">{form.actionUrl}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* History Tab */}
            {tab === 'history' && (
                <div className="space-y-4">
                    {notifications.length > 0 && (
                        <div className="flex justify-end mb-2">
                            <Button
                                variant="danger"
                                size="sm"
                                icon={<Trash2 size={16} />}
                                onClick={() => {
                                    if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
                                        clearAllMutation.mutate()
                                    }
                                }}
                                loading={clearAllMutation.isPending}
                            >
                                Tout effacer
                            </Button>
                        </div>
                    )}

                    {notifications.length === 0 ? (
                        <div className="card p-10 text-center text-zinc-500">
                            <Clock size={32} className="mx-auto mb-3 opacity-20" />
                            Aucun historique disponible.
                        </div>
                    ) : notifications.map(notif => (
                        <motion.div
                            key={notif._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card p-3 sm:p-5"
                        >
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-bold">{notif.title}</h3>
                                        <StatusBadge status={notif.status} />
                                        <span className="badge badge-muted text-xs">
                                            {Array.isArray(notif.targetOs)
                                                ? '🤖 Android'
                                                : notif.targetOs === 'all' ? '🌍 Tous'
                                                    : notif.targetOs === 'android' ? '🤖 Android'
                                                        : notif.targetOs === 'ios' ? '🍎 iOS'
                                                            : '🤖 Android'}
                                        </span>
                                    </div>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{notif.body}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        {notif.status === 'scheduled'
                                            ? `Programmée pour le ${new Date(notif.scheduledAt || Date.now()).toLocaleDateString('fr-FR')}`
                                            : `Envoyée ${formatRelativeTime(notif.sentAt || notif['Created Date'])}`
                                        }
                                    </p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button variant="ghost" size="sm" icon={<Copy size={14} />} onClick={() => {
                                        setForm(f => ({ ...f, title: notif.title, body: notif.body, image: notif.image || '', actionUrl: notif.targetUrl || '' }))
                                        setTab('compose')
                                    }}>Dupliquer</Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        icon={<Trash2 size={14} />}
                                        onClick={() => {
                                            if (confirm('Supprimer cette notification ?')) deleteMutation.mutate(notif._id)
                                        }}
                                        loading={deleteMutation.isPending && deleteMutation.variables === notif._id}
                                    >
                                        Effacer
                                    </Button>
                                </div>
                            </div>

                            {notif.stats && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                                    {[
                                        { label: 'Envoyées', value: formatNumber(notif.stats.sent), color: '#3461f5' },
                                        { label: 'Livrées', value: `${notif.stats.deliveryRate}%`, color: '#10b981' },
                                        { label: 'Ouvertes', value: `${notif.stats.openRate}%`, color: '#f59e0b' },
                                        { label: 'Cliquées', value: `${notif.stats.clickRate}%`, color: '#7c3aed' },
                                    ].map(s => (
                                        <div key={s.label} className="text-center">
                                            <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Devices Tab */}
            {tab === 'devices' && (
                <div className="card p-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                        <Smartphone size={24} style={{ color: 'var(--brand-500)' }} />
                        Appareils Android Inscrits (FCM)
                    </h2>
                    {registeredDevices.length === 0 ? (
                        <div className="text-center p-10 mt-4 border border-dashed rounded-xl" style={{ borderColor: 'var(--border)' }}>
                            <Smartphone size={32} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-semibold">Aucun appareil n'a encore été enregistré.</p>
                            <p className="text-xs text-slate-500 mt-2">Dès qu'un utilisateur ouvre votre app compilée et accepte les notifications Push, son empreinte apparaîtra ici.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                                        <th className="py-3 px-4">Système</th>
                                        <th className="py-3 px-4">ID de l'Application</th>
                                        <th className="py-3 px-4">Date d'inscription</th>
                                        <th className="py-3 px-4">Token FCM Unique</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registeredDevices.map((device: any) => (
                                        <tr key={device.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" style={{ borderColor: 'var(--border)' }}>
                                            <td className="py-3 px-4 font-semibold text-emerald-600 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                {device.os?.toUpperCase() || 'ANDROID'}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs">{device.buildId || 'N/A'}</td>
                                            <td className="py-3 px-4">{new Date(device.createdAt || device['Created Date']).toLocaleDateString()} à {new Date(device.createdAt || device['Created Date']).toLocaleTimeString()}</td>
                                            <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-[200px] overflow-hidden text-ellipsis" title={device.pushToken || device.id}>{device.pushToken || device.id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Settings Tab */}
            {tab === 'settings' && (
                <div className="card p-6 max-w-2xl mx-auto space-y-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                            <ImageIcon size={24} style={{ color: 'var(--brand-500)' }} />
                            Connexion au Serveur Firebase (FCM)
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Pour bénéficier du véritable Push Natif temps réel de Google, vous devez configurer votre clé de compte de service Firebase. Ces clés seront utilisées par notre backend pour expédier instantanément.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <Textarea
                            label="Clé Privée Admin SDK (JSON)"
                            placeholder={'{\n  "type": "service_account",\n  "project_id": "mon-app-123",\n  "private_key": "-----BEGIN PRIVATE KEY-----..."\n}'}
                            value={firebaseConfig.adminSdkJson}
                            onChange={e => setFirebaseConfig(c => ({ ...c, adminSdkJson: e.target.value }))}
                            style={{ minHeight: '180px', fontFamily: 'monospace' }}
                            hint="Se trouve dans la console Firebase > Paramètres du projet > Comptes de service > Node.js > Générer une nouvelle clé."
                        />
                        <Textarea
                            label="Configuration google-services.json (Pour l'App)"
                            placeholder={'{\n  "project_info": {\n    "project_number": "123456789"\n  } ... \n}'}
                            value={firebaseConfig.googleServicesJson}
                            onChange={e => setFirebaseConfig(c => ({ ...c, googleServicesJson: e.target.value }))}
                            style={{ minHeight: '180px', fontFamily: 'monospace' }}
                            hint="Se trouve dans la console Firebase > Paramètres du projet > Général > Vos applications (Android) > Télécharger google-services.json"
                        />

                        <hr className="my-6 border-slate-200 dark:border-slate-800" />

                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                                <Globe size={24} style={{ color: '#10b981' }} />
                                URL du Backend (Data API Bubble)
                            </h2>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                Indiquez ici l'URL de votre API de Données Bubble. Cette URL permet notamment de récupérer l'historique et de lier correctement les événements (Optionnel mais recommandé).
                            </p>
                        </div>

                        <Input
                            label="URL de l'API (Bubble Data API)"
                            placeholder="https://votre-site.com/api/1.1/obj/notification_queue"
                            value={firebaseConfig.bubbleApiUrl}
                            onChange={e => {
                                let val = e.target.value;
                                if (val.includes('https://https://')) {
                                    val = val.replace('https://https://', 'https://');
                                }
                                setFirebaseConfig(c => ({ ...c, bubbleApiUrl: val }))
                            }}
                            icon={<Link size={16} />}
                        />

                        <Button
                            onClick={() => firebaseMutation.mutate(firebaseConfig)}
                            loading={firebaseMutation.isPending}
                            className="w-full mt-4"
                        >
                            Enregistrer la configuration
                        </Button>
                    </div>
                </div>
            )}

            {/* Templates Tab */}
            {tab === 'templates' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { emoji: '🔥', title: 'Offre flash', body: 'Jusqu\'à -50% pendant 24h ! See nos meilleures offres maintenant.' },
                        { emoji: '🆕', title: 'Nouveau contenu', body: 'Nous avons publié {X} nouveaux articles. Venez les découvrir !' },
                        { emoji: '✅', title: 'Confirmation commande', body: 'Votre commande #{NUM} a été confirmée. Merci pour votre achat !' },
                        { emoji: '⏰', title: 'Rappel', body: 'N\'oubliez pas de finaliser votre panier. Il vous attend !' },
                        { emoji: '🎉', title: 'Evénement', body: 'Ne manquez pas notre événement spécial ce {DATE} !' },
                        { emoji: '📦', title: 'Livraison', body: 'Votre colis #{NUM} est en chemin ! Livraison estimée : {DATE}.' },
                    ].map(template => (
                        <div key={template.title} className="card p-5 card-hover cursor-pointer"
                            onClick={() => setForm(f => ({ ...f, title: template.title, body: template.body }))}>
                            <div className="text-3xl mb-3">{template.emoji}</div>
                            <h3 className="font-bold mb-1">{template.title}</h3>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{template.body}</p>
                            <button
                                className="mt-3 text-xs font-medium"
                                style={{ color: 'var(--brand-500)' }}
                                onClick={() => {
                                    setForm(f => ({ ...f, title: template.title, body: template.body }))
                                    setTab('compose')
                                    toast.success('Template chargé !')
                                }}
                            >
                                Utiliser ce template →
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* API & Integration Tab */}
            {tab === 'api' && (
                <div className="card p-6 max-w-4xl mx-auto space-y-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                            <Link size={24} style={{ color: 'var(--brand-500)' }} />
                            Documentation API : Notifications Automatiques
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Envoyez des notifications Push ciblées à vos utilisateurs directement depuis votre site web (WordPress, Bubble.io, Node.js, PHP, etc.) de façon 100% universelle.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="border p-5 rounded-xl" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--body-bg)' }}>
                            <h3 className="font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--brand-500)' }}>1</span>
                                Intercepter le Push Token (Sur votre site)
                            </h3>
                            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                                L'application native Site2App est intelligente. Lorsqu'un visiteur ouvre votre application sur son téléphone, l'application modifie automatiquement l'URL de votre site pour y attacher son identifiant de notification (`s2a_token`).
                                <br /><br />
                                <strong>Exemple d'URL générée en arrière-plan :</strong><br />
                                <code className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded text-xs font-mono font-semibold border mt-1 inline-block" style={{ borderColor: 'var(--border)' }}>https://votre-site.com/?s2a_token=APA91bFoijuty...</code>
                            </p>
                            <p className="text-sm font-bold mt-4 mb-2">
                                👉 Votre mission :
                            </p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Quand l'utilisateur s'inscrit ou se connecte sur votre site web, vérifiez si l'URL contient le paramètre <code>s2a_token</code>. Si oui, sauvegardez cette valeur dans votre base de données dans la fiche de votre utilisateur (créez une colonne "push_token").
                                <br /><br />
                                <em>Exemple sur Bubble.io : Dans un Workflow "Page is loaded" &rarr; Action: Make changes to User &rarr; push_token = Get data from page URL (parameter: s2a_token).</em>
                            </p>
                        </div>

                        <div className="border p-5 rounded-xl" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--body-bg)' }}>
                            <h3 className="font-bold mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--brand-500)' }}>2</span>
                                Déclencher une notification 100% depuis Bubble (Recommandé)
                            </h3>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                L'envoi direct depuis Bubble vers Firebase nécessite une clé cryptée (un token OAuth2 valide 1 heure). Voici comment configurer ça proprement dans Bubble pour un envoi instantané en 24h/24, sans aucun serveur intermédiaire.
                            </p>

                            <h4 className="font-bold text-sm mb-2">Étape A : Générer le Jeton (Token) Google</h4>
                            <ul className="text-sm list-disc pl-5 space-y-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
                                <li>Installez le plugin gratuit <strong>Google Service Account</strong> sur Bubble (ou JWT Generator).</li>
                                <li>Dans un <strong>Backend Workflow</strong> (ou sur une page), utilisez l'action de ce plugin pour générer un Token en utilisant votre fichier JSON Firebase (le même que celui fourni dans "Configuration Firebase").</li>
                                <li>Scopes à utiliser : <code>https://www.googleapis.com/auth/cloud-platform</code></li>
                            </ul>

                            <h4 className="font-bold text-sm mb-2">Étape B : Créer l'Appel API vers Google (FCM)</h4>
                            <ul className="text-sm list-disc pl-5 space-y-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
                                <li>Allez dans <strong>Plugins &gt; API Connector</strong>, et créez un appel API nommé "Firebase FCM API", puis un call (Action / POST) nommé "Send Push".</li>
                            </ul>
                            
                            <code className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded text-xs font-mono font-semibold border mb-4 inline-block w-full" style={{ borderColor: 'var(--border)' }}>
                                POST https://fcm.googleapis.com/v1/projects/VOTRE_FIREBASE_PROJECT_ID/messages:send
                            </code>

                            <h4 className="font-bold text-sm mb-2">Le Header et le Body :</h4>
                            <ul className="text-sm list-disc pl-5 space-y-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
                                <li><strong>Header 1</strong> : <code>Content-Type: application/json</code></li>
                                <li><strong>Header 2 (Décoché Private)</strong> : <code>Authorization: Bearer &lt;token&gt;</code></li>
                                <li><strong>Body JSON</strong> :</li>
                            </ul>
                            
                            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs font-mono border mb-4 overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
{`{
  "message": {
    "token": "<device_token>",
    "notification": {
      "title": "<title>",
      "body": "<body>"
    },
    "data": {
      "actionUrl": "<url>"
    }
  }
}`}
                            </pre>
                            
                            <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                <strong>Important</strong> : Décochez "Private" sur tous les paramètres dynamiques en bas du call `&lt;param&gt;`. Vous pourrez ainsi appeler cette action dans n'importe quel Workflow Bubble, en passant dynamiquement le Token OAuth2 généré à l'étape A, et le Push partira en 1 seconde à votre utilisateur !
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
