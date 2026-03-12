import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    BarChart2, TrendingUp, Users, Bell, Globe, Smartphone,
    Send, CheckCircle, Package, Activity
} from 'lucide-react'
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { StatCard } from '../components/ui/Card'
import { Select } from '../components/ui/FormControls'
import { formatNumber, formatRelativeTime } from '../lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { getAppsByUser } from '../lib/api'
import axios from 'axios'

const CHART_COLORS = { primary: '#3461f5', secondary: '#7c3aed', success: '#10b981', warning: '#f59e0b' }

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="card p-3" style={{ minWidth: '140px' }}>
            <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
                    <span className="font-bold" style={{ color: p.color }}>{formatNumber(p.value)}</span>
                </div>
            ))}
        </div>
    )
}

// Helper to fetch notifications from Bubble Data API
async function getUserNotifications(userId: string) {
    try {
        const constraints = JSON.stringify([{ key: 'userId', constraint_type: 'equals', value: userId }])
        // Since we don't have a helper in api.ts for this, use raw fetch to avoid changing api.ts if possible
        const BUBBLE_BASE = 'https://site2app.online/api/1.1/obj'
        const BUBBLE_TOKEN = '59ef5eb57d786ff8eced03244342f32e'
        const res = await axios.get(`${BUBBLE_BASE}/notification?constraints=${encodeURIComponent(constraints)}`, {
            headers: { 'Authorization': `Bearer ${BUBBLE_TOKEN}` }
        })
        return res.data?.response?.results || []
    } catch {
        return []
    }
}

async function getUserDevices(userId: string) {
    try {
        const constraints = JSON.stringify([{ key: 'userId', constraint_type: 'equals', value: userId }])
        const BUBBLE_BASE = 'https://site2app.online/api/1.1/obj'
        const BUBBLE_TOKEN = '59ef5eb57d786ff8eced03244342f32e'
        const res = await axios.get(`${BUBBLE_BASE}/device?constraints=${encodeURIComponent(constraints)}`, {
            headers: { 'Authorization': `Bearer ${BUBBLE_TOKEN}` }
        })
        return res.data?.response?.results || []
    } catch {
        return []
    }
}

export default function AnalyticsPage() {
    const [period, setPeriod] = useState('30')
    const { user } = useAuthStore()

    const { data: analytics, isLoading } = useQuery<any>({
        queryKey: ['analytics', period, user?.id],
        queryFn: async () => {
             if (!user?.id) throw new Error('Not logged in')
             
             // Fetch real data from Bubble
             const [apps, notifs, devices] = await Promise.all([
                 getAppsByUser(user.id),
                 getUserNotifications(user.id),
                 getUserDevices(user.id)
             ])
             
             const periodDays = parseInt(period) || 30
             const now = new Date()
             const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
             
             // Filter by date
             const periodNotifs = notifs.filter((n: any) => new Date(n['Created Date'] || n.createdAt) >= periodStart)
             const periodDevices = devices.filter((d: any) => new Date(d['Created Date'] || d.createdAt) >= periodStart)

             // Calculate stats
             const totalSent = periodNotifs.reduce((sum: number, n: any) => sum + (n.sent || 0), 0)
             const totalDelivered = periodNotifs.reduce((sum: number, n: any) => sum + (n.delivered || 0), 0)
             const avgDeliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0
             
             const summary = {
                 totalApps: apps.length,
                 totalDevices: devices.length,
                 totalSent,
                 totalDelivered,
                 avgDeliveryRate
             }
             
             // Daily timeline
             const dailyData: Record<string, { sent: number, delivered: number, devices: number }> = {}
             for (let i = 0; i < periodDays; i++) {
                 const day = new Date(now.getTime() - (periodDays - 1 - i) * 24 * 60 * 60 * 1000)
                 const key = day.toISOString().split('T')[0]
                 dailyData[key] = { sent: 0, delivered: 0, devices: 0 }
             }
             
             periodNotifs.forEach((n: any) => {
                 const d1 = new Date(n['Created Date'] || n.createdAt)
                 if (isNaN(d1.getTime())) return;
                 const key = d1.toISOString().split('T')[0]
                 if (dailyData[key]) {
                     dailyData[key].sent += (n.sent || 0)
                     dailyData[key].delivered += (n.delivered || 0)
                 }
             })
             
             periodDevices.forEach((d: any) => {
                 const d1 = new Date(d['Created Date'] || d.createdAt)
                 if (isNaN(d1.getTime())) return;
                 const key = d1.toISOString().split('T')[0]
                 if (dailyData[key]) {
                     dailyData[key].devices += 1
                 }
             })
             
             const sendTimeline = Object.entries(dailyData).map(([date, data]) => ({
                 date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
                 sent: data.sent,
                 delivered: data.delivered
             }))
             
             const deviceTimeline = Object.entries(dailyData).map(([date, data]) => ({
                 date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
                 devices: data.devices
             }))
             
             // Platform stats based on apps
             const androidApps = apps.filter((a: any) => a.platform === 'android' || a.platform === 'both').length
             const iosApps = apps.filter((a: any) => a.platform === 'ios' || a.platform === 'both').length
             const totalPlatforms = androidApps + iosApps || 1
             
             const platformData = [
                 { name: 'Android', value: Math.round((androidApps / totalPlatforms) * 100), count: androidApps, color: '#3ddc84' },
                 { name: 'iOS', value: Math.round((iosApps / totalPlatforms) * 100), count: iosApps, color: '#000000' }
             ]
             
             // Apps stats mapping
             const appStats = apps.map((a: any) => {
                 const appNotifs = notifs.filter((n: any) => n.appId === a._id)
                 const aSent = appNotifs.reduce((sum: number, n: any) => sum + (n.sent || 0), 0)
                 const aDeliv = appNotifs.reduce((sum: number, n: any) => sum + (n.delivered || 0), 0)
                 return {
                     id: a._id,
                     name: a.appName || a.name || 'App',
                     devices: devices.filter((d: any) => d.appId === a._id).length || a.activeUsers || 0,
                     notificationsSent: aSent,
                     deliveryRate: aSent > 0 ? Math.round((aDeliv / aSent) * 100) : 0
                 }
             })
             
             // Top notifs
             const topNotifications = periodNotifs.sort((a: any, b: any) => new Date(b['Created Date'] || b.createdAt).getTime() - new Date(a['Created Date'] || a.createdAt).getTime()).slice(0, 5).map((n: any) => ({
                 id: n._id,
                 title: n.title,
                 sent: n.sent || 0,
                 delivered: n.delivered || 0,
                 deliveryRate: n.sent > 0 ? Math.round(((n.delivered || 0) / n.sent) * 100) : 0,
                 sentAt: n['Created Date'] || n.createdAt
             }))
             
             // Recent devices fallback
             const recentDevices = periodDevices.slice(0, 5).map((d: any) => ({
                 os: d.os || 'android',
                 buildName: d.appName || 'App',
                 id: (d.deviceId || d._id || '').slice(0, 15) + '...',
                 fullId: d.deviceId || d._id,
                 registeredAt: d['Created Date'] || d.createdAt
             }))

             return {
                 summary,
                 sendTimeline,
                 deviceTimeline,
                 platformData,
                 appStats,
                 topNotifications,
                 recentDevices
             }
        },
        refetchInterval: 30000 // Rafraîchir toutes les 30s
    })

    const summary = analytics?.summary || { totalNotifications: 0, totalSent: 0, totalDelivered: 0, avgDeliveryRate: 0, totalDevices: 0, totalApps: 0 }
    const sendTimeline = analytics?.sendTimeline || []
    const deviceTimeline = analytics?.deviceTimeline || []
    const platformData = analytics?.platformData || [{ name: 'Android', value: 100, count: 0, color: '#3461f5' }]
    const appStats = analytics?.appStats || []
    const topNotifications = analytics?.topNotifications || []
    const recentDevices = analytics?.recentDevices || []

    return (
        <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-3 break-words">
                        <BarChart2 size={24} className="md:w-7 md:h-7" style={{ color: 'var(--brand-500)' }} />
                        Analytics
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Statistiques en temps réel de vos applications et notifications.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <Activity size={14} className="animate-pulse" /> Chargement...
                        </div>
                    )}
                    <Select
                        options={[
                            { value: '7', label: '7 derniers jours' },
                            { value: '30', label: '30 derniers jours' },
                            { value: '90', label: '90 derniers jours' },
                        ]}
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                    />
                </div>
            </div>

            {/* KPI Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Notifications envoyées"
                    value={formatNumber(summary.totalSent)}
                    change={0}
                    icon={<Send size={20} />}
                    color="#3461f5"
                />
                <StatCard
                    title="Appareils enregistrés"
                    value={formatNumber(summary.totalDevices)}
                    change={0}
                    icon={<Smartphone size={20} />}
                    color="#7c3aed"
                />
                <StatCard
                    title="Taux de livraison"
                    value={`${summary.avgDeliveryRate}%`}
                    change={0}
                    icon={<CheckCircle size={20} />}
                    color="#10b981"
                />
                <StatCard
                    title="Applications actives"
                    value={formatNumber(summary.totalApps)}
                    change={0}
                    icon={<Package size={20} />}
                    color="#f59e0b"
                />
            </div>

            {/* Main Charts Row */}
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
                {/* Notifications envoyées / livrées */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 card p-5"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold">Notifications envoyées vs livrées</h3>
                        <div className="flex gap-4 text-xs">
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-0.5 rounded" style={{ background: CHART_COLORS.primary, display: 'inline-block' }} />
                                Envoyées
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-0.5 rounded" style={{ background: CHART_COLORS.success, display: 'inline-block' }} />
                                Livrées
                            </span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={sendTimeline}>
                            <defs>
                                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.15} />
                                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={Math.max(Math.floor(sendTimeline.length / 8), 1)} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="sent" name="Envoyées" stroke={CHART_COLORS.primary} strokeWidth={2} fill="url(#colorSent)" dot={false} />
                            <Area type="monotone" dataKey="delivered" name="Livrées" stroke={CHART_COLORS.success} strokeWidth={2} fill="url(#colorDelivered)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Plateformes (Pie) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="card p-5"
                >
                    <h3 className="font-bold mb-5">Plateformes</h3>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie
                                data={platformData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={70}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {platformData.map((entry: any, index: number) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => `${v}%`} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                        {platformData.map((d: any) => (
                            <div key={d.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                                    <span className="text-sm">{d.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({d.count} appareils)</span>
                                    <span className="font-bold text-sm">{d.value}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Second Row */}
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
                {/* Appareils inscrits over time */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="card p-5"
                >
                    <h3 className="font-bold mb-5">Appareils inscrits</h3>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={deviceTimeline}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval={Math.max(Math.floor(deviceTimeline.length / 6), 1)} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                            <Tooltip formatter={(v: any) => formatNumber(v)} />
                            <Bar dataKey="devices" name="Appareils" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Stats par application */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="card p-5"
                >
                    <h3 className="font-bold mb-4">Statistiques par application</h3>
                    <div className="space-y-3">
                        {appStats.length === 0 ? (
                            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                                Aucune application trouvée. Créez votre première app pour voir les stats.
                            </p>
                        ) : appStats.map((app: any) => (
                            <div key={app.id} className="p-3 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold truncate">{app.name}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                        style={{ background: 'var(--brand-50)', color: 'var(--brand-500)' }}>
                                        {app.devices} appareil{app.devices > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                                    <span>📤 {app.notificationsSent} envoyées</span>
                                    <span>✅ {app.deliveryRate}% livrées</span>
                                </div>
                                <div className="progress-bar mt-2" style={{ height: '4px' }}>
                                    <div className="progress-fill" style={{ width: `${app.deliveryRate}%`, background: CHART_COLORS.success }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Dernières notifications */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="card p-5"
                >
                    <h3 className="font-bold mb-4">Dernières notifications</h3>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto">
                        {topNotifications.length === 0 ? (
                            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                                Aucune notification envoyée durant cette période.
                            </p>
                        ) : topNotifications.map((notif: any) => (
                            <div key={notif.id} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: notif.deliveryRate >= 80 ? '#dcfce7' : notif.deliveryRate > 0 ? '#fef3c7' : '#fee2e2' }}>
                                    <Bell size={14} style={{ color: notif.deliveryRate >= 80 ? '#10b981' : notif.deliveryRate > 0 ? '#f59e0b' : '#ef4444' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{notif.title}</p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            📤 {notif.sent} → ✅ {notif.delivered}
                                        </span>
                                        <span className="text-xs font-bold" style={{ color: notif.deliveryRate >= 80 ? '#10b981' : '#f59e0b' }}>
                                            {notif.deliveryRate}%
                                        </span>
                                    </div>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(notif.sentAt)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Appareils enregistrés récemment */}
            {recentDevices.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="card p-5"
                >
                    <h3 className="font-bold mb-4">Appareils enregistrés récemment</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                                    <th className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--text-muted)' }}>OS</th>
                                    <th className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Application</th>
                                    <th className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Token FCM</th>
                                    <th className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Inscrit le</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentDevices.map((device: any, i: number) => (
                                    <tr key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
                                        <td className="py-2.5 px-3">
                                            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-semibold"
                                                style={{
                                                    background: device.os === 'android' ? '#e0e7ff' : '#f3e8ff',
                                                    color: device.os === 'android' ? '#3461f5' : '#7c3aed'
                                                }}>
                                                {device.os === 'android' ? '🤖' : '🍎'} {device.os?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 font-medium">{device.buildName}</td>
                                        <td className="py-2.5 px-3">
                                            <code className="text-xs px-2 py-1 rounded" style={{ background: 'var(--surface-1)' }} title={device.fullId}>
                                                {device.id}
                                            </code>
                                        </td>
                                        <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {formatRelativeTime(device.registeredAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
