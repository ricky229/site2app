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
import { formatRelativeTime, formatNumber, formatDate } from '../lib/utils'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import api, { apiGetMe, getDevices, getBuilds, getNotifications, sendNotification, deleteAllNotifications, deleteNotification, pollNotifications, saveFirebaseConfig } from '../lib/api'
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
        queryFn: async () => {
            if (!user?.id) return [];
            const data = await getBuilds(user.id);
            let buildsArray: any[] = data || [];
            return buildsArray.map((b: any) => ({
                ...b,
                id: b._id || b.id || String(Math.random()),
                name: b.appName || b.name || 'App'
            }));
        },
        enabled: !!user?.id
    })
    const { data: notifications = [] } = useQuery<any[]>({ 
        queryKey: ['notifications', user?.id, selectedApp], 
        queryFn: async () => {
            if (!user?.id) return []
            const results = await getNotifications(selectedApp)
            if (!Array.isArray(results)) return []
            return results.map((n: any) => {
                const sCount = n.stats?.successCount || n.sentCount || 0;
                const fCount = n.stats?.failureCount || 0;
                const total = sCount + fCount;
                return {
                    ...n,
                    id: n._id || n.id,
                    stats: {
                        sent: total > 0 ? total : (n.stats?.sent || 0),
                        delivered: sCount > 0 ? sCount : (n.stats?.delivered || 0),
                        deliveryRate: total > 0 ? Math.round((sCount / total) * 100) : (n.stats?.deliveryRate || 0),
                        openRate: n.stats?.openRate || 0,
                        clickRate: n.stats?.clickRate || 0
                    }
                };
            });
        },
        enabled: !!user?.id
    })
    const { data: userProfile } = useQuery<any>({ 
        queryKey: ['userProfile', user?.id], 
        queryFn: async () => {
            if (!user?.id) return null;
            return await apiGetMe();
        },
        enabled: !!user?.id
    })
    const { data: registeredDevices = [] } = useQuery<any[]>({ 
        queryKey: ['devices', selectedApp], 
        queryFn: async () => {
            const results = await getDevices(selectedApp === 'all' ? undefined : selectedApp);
            if (!Array.isArray(results)) return []
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
        if (!user?.id) return;

        const triggerSync = async () => {
            try {
                await pollNotifications(selectedApp);
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } catch (err) {
                console.warn('Poll error');
            }
        };

        triggerSync();
        const interval = setInterval(triggerSync, 30000);
        return () => clearInterval(interval);
    }, [user?.id, selectedApp])

    const firebaseMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (!user?.id) throw new Error("Non authentifié")
            return await saveFirebaseConfig(selectedApp === 'all' ? 'default' : selectedApp, payload)
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
            
            return await sendNotification(payload)
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
        mutationFn: async (id: string) => await deleteNotification(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            toast.success('Notification supprimée')
        }
    })

    const clearAllMutation = useMutation({
        mutationFn: async () => await deleteAllNotifications(selectedApp),
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 min-w-[50px]">
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3 break-words min-w-[50px]">
                        <Bell size={24} className="md:w-7 md:h-7 flex-shrink-0" style={{ color: 'var(--brand-500)' }} />
                        <span className="truncate">Notifications Push</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }} className="min-w-[50px] break-words text-sm md:text-base">
                        Communiquez directement et instantanément avec vos utilisateurs.
                    </p>
                </div>
                <div className="w-full md:w-auto min-w-[50px]">
                    <Select
                        options={appOptions}
                        value={selectedApp}
                        onChange={e => setSelectedApp(e.target.value)}
                        className="w-full"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 min-w-[50px] min-w-0">
                <div className="min-w-[50px] min-w-0">
                    <StatCard title="Notifications envoyées" value={formatNumber(totalSent)} change={0} icon={<Send size={20} />} color="#3461f5" />
                </div>
                <div className="min-w-[50px] min-w-0">
                    <StatCard title="Appareils actifs" value={formatNumber(devicesCount)} change={0} icon={<CheckCircle size={20} />} color="#10b981" />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b min-w-[50px] min-w-0" style={{ borderColor: 'var(--border)' }}>
                {[
                    { id: 'compose', label: 'Composer', icon: Plus },
                    { id: 'history', label: 'Historique', icon: Clock },
                    { id: 'devices', label: 'Appareils (Tokens FCM)', icon: Smartphone },
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
                <div className="grid lg:grid-cols-5 gap-6 min-w-[50px] min-w-0">
                    {/* Form */}
                    <div className="lg:col-span-3 space-y-5 min-w-[50px] min-w-0">
                        <div className="card p-4 sm:p-6 min-w-[50px] min-w-0">
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
                                    hint="900x300px recommandé"
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

                        <div className="card p-4 sm:p-6 min-w-[50px] min-w-0">
                            <h3 className="font-bold mb-4 sm:mb-5 text-sm sm:text-base">Ciblage (Appareils Android)</h3>
                            <div className="space-y-4 min-w-[50px]">
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
                                        const allSelected = filteredDevices.length > 0 && filteredDevices.every(d => selectedDevices.includes(d.pushToken));
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

                            <div className="card p-4 sm:p-6 min-w-[50px] min-w-0">
                            <h3 className="font-bold mb-4 sm:mb-5 text-sm sm:text-base">Envoi</h3>
                            <div className="space-y-4 min-w-[50px]">
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
                                        onClick={handleSend}
                                        loading={sendMutation.isPending}
                                        icon={form.scheduled ? <Clock size={16} /> : <Send size={16} />}
                                        className="flex-1 w-full"
                                    >
                                        {form.scheduled ? 'Programmer' : 'Envoyer maintenant'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="lg:col-span-2 min-w-[50px] min-w-0">
                        <div className="sticky top-24 min-w-[50px]">
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
                <div className="space-y-4 min-w-[50px] min-w-0">
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
                            key={notif.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 sm:p-5 rounded-2xl border"
                            style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border)' }}
                        >
                            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <h3 className="font-bold text-lg break-words">{notif.title}</h3>
                                        <StatusBadge status={notif.status} />
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
                                            <Smartphone size={12} /> {Array.isArray(notif.targetOs)
                                                ? '🤖 Android'
                                                : notif.targetOs === 'all' ? '🌍 Tous'
                                                    : notif.targetOs === 'android' ? '🤖 Android'
                                                        : notif.targetOs === 'ios' ? '🍏 iOS'
                                                            : '🤖 Android'}
                                        </span>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)' }} className="text-sm mb-2 break-words line-clamp-2">{notif.body}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {notif.status === 'scheduled'
                                            ? `Programmée pour le ${new Date(notif.scheduledAt?.seconds ? notif.scheduledAt.seconds * 1000 : (notif.scheduledAt || Date.now())).toLocaleDateString('fr-FR')}`
                                            : `Envoyée ${formatRelativeTime(notif.createdAt || notif.sentAt || notif['Created Date'] || Date.now())}`
                                        }
                                    </p>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={<Copy size={14} />}
                                        onClick={() => {
                                            setForm(f => ({ ...f, title: notif.title, body: notif.body, image: notif.image || '', actionUrl: notif.targetUrl || '' }))
                                            setTab('compose')
                                        }}
                                    >
                                        Dupliquer
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        icon={<Trash2 size={14} />}
                                        onClick={() => {
                                            if (confirm('Supprimer cette notification ?')) deleteMutation.mutate(notif.id)
                                        }}
                                        loading={deleteMutation.isPending && deleteMutation.variables === notif.id}
                                    >
                                        Effacer
                                    </Button>
                                </div>
                            </div>

                            {notif.stats && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                                    {[
                                        { label: 'Envoyées', value: formatNumber(notif.stats?.sent || notif.sentCount || 0), color: '#3461f5' },
                                        { label: 'Livrées', value: `${notif.stats?.deliveryRate !== undefined ? notif.stats.deliveryRate : ((notif.stats?.sent || notif.sentCount || 0) > 0 ? Math.round((notif.stats?.delivered || notif.deliveredCount || 0) / (notif.stats?.sent || notif.sentCount || 0) * 100) : 0)}%`, color: '#10b981' },
                                        { label: 'Ouvertes', value: `${notif.stats?.openRate || 0}%`, color: '#f59e0b' },
                                        { label: 'Cliquées', value: `${notif.stats?.clickRate || 0}%`, color: '#7c3aed' },
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
                                    {registeredDevices.map((device: any) => {
                                        return (
                                        <tr key={device.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" style={{ borderColor: 'var(--border)' }}>
                                            <td className="py-3 px-4 font-semibold text-emerald-600 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                {device.os?.toUpperCase() || 'ANDROID'}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs">{device.buildId || 'N/A'}</td>
                                            <td className="py-3 px-4">{formatDate(device.createdAt || device['Created Date'] || Date.now())}</td>
                                            <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-[200px] overflow-hidden text-ellipsis" title={device.pushToken || device.id}>{device.pushToken || device.id}</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}



            {/* Templates Tab */}
            {tab === 'templates' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { emoji: '🔥', title: 'Offre flash', body: 'Jusqu\'à -50% pendant 24h ! See nos meilleures offres maintenant.' },
                        { emoji: '📰', title: 'Nouveau contenu', body: 'Nous avons publié {X} nouveaux articles. Venez les découvrir !' },
                        { emoji: '✅', title: 'Confirmation commande', body: 'Votre commande #{NUM} a été confirmée. Merci pour votre achat !' },
                        { emoji: '🛒', title: 'Rappel', body: 'N\'oubliez pas de finaliser votre panier. Il vous attend !' },
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
                                Utiliser ce template ÔåÆ
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
