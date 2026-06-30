import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    BarChart2, TrendingUp, Users, Bell, Globe, Smartphone,
    Send, CheckCircle, Package, Activity, Calendar
} from 'lucide-react'
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { formatNumber, formatRelativeTime } from '../lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { getAppsByUser } from '../lib/api'
import axios from 'axios'

const CHART_COLORS = { primary: '#3b82f6', secondary: '#8b5cf6', success: '#10b981', warning: '#f59e0b' }

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-4 shadow-xl" style={{ minWidth: '160px' }}>
            <p className="text-sm font-bold mb-3 text-[var(--text-primary)] border-b border-[var(--border)] pb-2">{label}</p>
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-4 text-sm mb-1.5 last:mb-0">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                        <span className="text-[var(--text-secondary)] font-medium">{p.name}</span>
                    </div>
                    <span className="font-bold" style={{ color: p.color }}>{formatNumber(p.value)}</span>
                </div>
            ))}
        </div>
    )
}

const PremiumStatCard = ({ title, value, icon: Icon, color, delay }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl p-6 border group"
        style={{
            background: 'var(--surface-1)',
            borderColor: 'var(--border)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
        }}
    >
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 group-hover:scale-150 group-hover:opacity-20 transition-all duration-700 blur-2xl"
            style={{ background: color }} />
        
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: `linear-gradient(135deg, ${color}dd, ${color})`, color: 'white' }}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
        </div>
        <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-1 text-[var(--text-primary)]">
                {value}
            </h3>
            <p className="text-xs font-semibold tracking-wide uppercase text-[var(--text-muted)]">
                {title}
            </p>
        </div>
    </motion.div>
)

// Helper to fetch notifications from Bubble Data API
async function getUserNotifications(user: any) {
    if (!user?.id) return []
    try {
        let baseUrl = 'https://site2app.online/api/1.1/obj'
        if (user.bubbleApiUrl) {
            const parts = user.bubbleApiUrl.split('/api/1.1/obj')
            if (parts.length > 0) baseUrl = parts[0] + '/api/1.1/obj'
        }

        let constraints = '';
        const headers: any = {};
        if (!user.bubbleApiUrl) {
            constraints = `?constraints=${encodeURIComponent(JSON.stringify([{ key: 'userId', constraint_type: 'equals', value: user.id }]))}`;
            headers['Authorization'] = `Bearer 59ef5eb57d786ff8eced03244342f32e`
        }

        const res = await axios.get(`${baseUrl}/notification${constraints}`, { headers })
        return res.data?.response?.results || []
    } catch {
        return []
    }
}

async function getUserDevices(user: any) {
    if (!user?.id) return []
    try {
        let baseUrl = 'https://site2app.online/api/1.1/obj'
        if (user.bubbleApiUrl) {
            const parts = user.bubbleApiUrl.split('/api/1.1/obj')
            if (parts.length > 0) baseUrl = parts[0] + '/api/1.1/obj'
        }

        let constraints = '';
        const headers: any = {};
        if (!user.bubbleApiUrl) {
            constraints = `?constraints=${encodeURIComponent(JSON.stringify([{ key: 'userId', constraint_type: 'equals', value: user.id }]))}`;
            headers['Authorization'] = `Bearer 59ef5eb57d786ff8eced03244342f32e`
        }

        const res = await axios.get(`${baseUrl}/device${constraints}`, { headers })
        
        // Deduplicate devices by pushToken
        const rawResults = res.data?.response?.results || []
        const mapped = rawResults.map((d: any) => ({
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
             const [apps, notifs, devices] = await Promise.all([
                 getAppsByUser(user.id),
                 getUserNotifications(user),
                 getUserDevices(user)
             ])
             
             const periodDays = parseInt(period) || 30
             const now = new Date()
             const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
             
             const periodNotifs = notifs.filter((n: any) => new Date(n['Created Date'] || n.createdAt) >= periodStart)
             const periodDevices = devices.filter((d: any) => new Date(d['Created Date'] || d.createdAt) >= periodStart)

             const totalSent = periodNotifs.reduce((sum: number, n: any) => sum + (n.sentCount || n.sent || 0), 0)
             const totalDelivered = periodNotifs.reduce((sum: number, n: any) => sum + (n.deliveredCount || n.delivered || 0), 0)
             const avgDeliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0
             
             const summary = {
                 totalApps: apps.length,
                 totalDevices: devices.length,
                 totalSent,
                 totalDelivered,
                 avgDeliveryRate
             }
             
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
                     dailyData[key].sent += (n.sentCount || n.sent || 0)
                     dailyData[key].delivered += (n.deliveredCount || n.delivered || 0)
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
             
             const androidApps = apps.filter((a: any) => a.platform === 'android' || a.platform === 'both').length
             const iosApps = apps.filter((a: any) => a.platform === 'ios' || a.platform === 'both').length
             const totalPlatforms = androidApps + iosApps || 1
             
             const platformData = [
                 { name: 'Android', value: Math.round((androidApps / totalPlatforms) * 100), count: androidApps, color: '#3b82f6' },
                 { name: 'iOS', value: Math.round((iosApps / totalPlatforms) * 100), count: iosApps, color: '#8b5cf6' }
             ]
             
             const appStats = apps.map((a: any) => {
                 const appNotifs = notifs.filter((n: any) => n.appId === a._id)
                 const aSent = appNotifs.reduce((sum: number, n: any) => sum + (n.sentCount || n.sent || 0), 0)
                 const aDeliv = appNotifs.reduce((sum: number, n: any) => sum + (n.deliveredCount || n.delivered || 0), 0)
                 return {
                     id: a._id,
                     name: a.appName || a.name || 'App',
                     devices: devices.filter((d: any) => d.appId === a._id).length || a.activeUsers || 0,
                     notificationsSent: aSent,
                     deliveryRate: aSent > 0 ? Math.round((aDeliv / aSent) * 100) : 0
                 }
             })
             
             const topNotifications = periodNotifs.sort((a: any, b: any) => new Date(b['Created Date'] || b.createdAt).getTime() - new Date(a['Created Date'] || a.createdAt).getTime()).slice(0, 5).map((n: any) => {
                 const nSent = n.sentCount || n.sent || 0;
                 const nDeliv = n.deliveredCount || n.delivered || 0;
                 return {
                     id: n._id,
                     title: n.title,
                     sent: nSent,
                     delivered: nDeliv,
                     deliveryRate: nSent > 0 ? Math.round((nDeliv / nSent) * 100) : 0,
                     sentAt: n['Created Date'] || n.createdAt
                 }
             })
             
             const recentDevices = periodDevices.sort((a: any, b: any) => new Date(b['Created Date'] || b.createdAt).getTime() - new Date(a['Created Date'] || a.createdAt).getTime()).slice(0, 5).map((d: any) => ({
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
        refetchInterval: 30000
    })

    const summary = analytics?.summary || { totalSent: 0, totalDelivered: 0, avgDeliveryRate: 0, totalDevices: 0, totalApps: 0 }
    const sendTimeline = analytics?.sendTimeline || []
    const deviceTimeline = analytics?.deviceTimeline || []
    const platformData = analytics?.platformData || [{ name: 'Android', value: 100, count: 0, color: '#3b82f6' }]
    const appStats = analytics?.appStats || []
    const topNotifications = analytics?.topNotifications || []
    const recentDevices = analytics?.recentDevices || []

    return (
        <div className="p-4 md:p-8 lg:p-10 max-w-[1400px] mx-auto w-full overflow-x-hidden">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
            >
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-2 tracking-tight flex items-center gap-3">
                        <BarChart2 className="text-blue-500" size={32} strokeWidth={2.5} />
                        Statistiques
                    </h1>
                    <p className="text-[var(--text-muted)] text-lg font-medium">Analysez les performances et l'engagement.</p>
                </div>
                
                <div className="flex items-center gap-4 bg-[var(--surface-1)] p-2 rounded-2xl border border-[var(--border)] shadow-sm">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-sm text-blue-500 px-3 font-semibold">
                            <Activity size={16} className="animate-pulse" /> Actualisation...
                        </div>
                    )}
                    <div className="flex items-center bg-[var(--surface-2)] p-1 rounded-xl">
                        {[
                            { value: '7', label: '7j' },
                            { value: '30', label: '30j' },
                            { value: '90', label: '90j' },
                        ].map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setPeriod(opt.value)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === opt.value ? 'bg-[var(--surface-0)] text-blue-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mb-10">
                <PremiumStatCard
                    title="Notifs Envoyées"
                    value={formatNumber(summary.totalSent)}
                    icon={Send}
                    color="#3b82f6"
                    delay={0.1}
                />
                <PremiumStatCard
                    title="Appareils Actifs"
                    value={formatNumber(summary.totalDevices)}
                    icon={Smartphone}
                    color="#8b5cf6"
                    delay={0.2}
                />
                <PremiumStatCard
                    title="Taux de Livraison"
                    value={`${summary.avgDeliveryRate}%`}
                    icon={CheckCircle}
                    color="#10b981"
                    delay={0.3}
                />
                <PremiumStatCard
                    title="Applications"
                    value={formatNumber(summary.totalApps)}
                    icon={Package}
                    color="#f59e0b"
                    delay={0.4}
                />
            </div>

            {/* Main Charts Row */}
            <div className="grid lg:grid-cols-3 gap-8 mb-8">
                {/* Notifications Area Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 rounded-[2rem] p-6 md:p-8 bg-[var(--surface-1)] border border-[var(--border)] shadow-sm"
                >
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-[var(--text-primary)]">Performances des Notifications</h3>
                        <div className="flex gap-4 text-sm font-bold bg-[var(--surface-2)] px-4 py-2 rounded-xl">
                            <span className="flex items-center gap-2 text-blue-500">
                                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                Envoyées
                            </span>
                            <span className="flex items-center gap-2 text-emerald-500">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                Livrées
                            </span>
                        </div>
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sendTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={30} />
                                <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="sent" name="Envoyées" stroke={CHART_COLORS.primary} strokeWidth={3} fill="url(#colorSent)" />
                                <Area type="monotone" dataKey="delivered" name="Livrées" stroke={CHART_COLORS.success} strokeWidth={3} fill="url(#colorDelivered)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Platforms Donut Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="rounded-[2rem] p-6 md:p-8 bg-[var(--surface-1)] border border-[var(--border)] shadow-sm flex flex-col"
                >
                    <h3 className="text-xl font-black text-[var(--text-primary)] mb-6">Plateformes</h3>
                    <div className="flex-1 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={platformData}
                                    cx="50%" cy="50%"
                                    innerRadius="65%" outerRadius="85%"
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {platformData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-6">
                        {platformData.map((d: any) => (
                            <div key={d.name} className="flex items-center justify-between bg-[var(--surface-2)] p-3 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ background: d.color }} />
                                    <span className="font-bold text-[var(--text-primary)]">{d.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-[var(--text-muted)]">{d.count} app{d.count > 1 ? 's' : ''}</span>
                                    <span className="font-black text-lg" style={{ color: d.color }}>{d.value}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Second Row */}
            <div className="grid lg:grid-cols-3 gap-8 mb-8">
                {/* Devices Bar Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="rounded-[2rem] p-6 md:p-8 bg-[var(--surface-1)] border border-[var(--border)] shadow-sm"
                >
                    <h3 className="text-xl font-black text-[var(--text-primary)] mb-8">Acquisition (Appareils)</h3>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deviceTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={20} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
                                <Bar dataKey="devices" name="Appareils" fill={CHART_COLORS.secondary} radius={[6, 6, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Top Notifications */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="lg:col-span-2 rounded-[2rem] p-6 md:p-8 bg-[var(--surface-1)] border border-[var(--border)] shadow-sm"
                >
                    <h3 className="text-xl font-black text-[var(--text-primary)] mb-6">Campagnes récentes</h3>
                    <div className="space-y-4">
                        {topNotifications.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-3xl bg-[var(--surface-2)]">
                                <Bell className="mx-auto text-[var(--text-muted)] mb-3" size={32} />
                                <p className="text-[var(--text-muted)] font-medium">Aucune notification envoyée.</p>
                            </div>
                        ) : topNotifications.map((notif: any) => (
                            <div key={notif.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface-2)] border border-transparent hover:border-[var(--border)] transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                                        style={{ background: notif.deliveryRate >= 80 ? '#10b98122' : notif.deliveryRate > 0 ? '#f59e0b22' : '#ef444422' }}>
                                        <Bell size={20} style={{ color: notif.deliveryRate >= 80 ? '#10b981' : notif.deliveryRate > 0 ? '#f59e0b' : '#ef4444' }} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[var(--text-primary)] text-base">{notif.title}</p>
                                        <p className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1 mt-1">
                                            <Calendar size={12} /> {formatRelativeTime(notif.sentAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 bg-[var(--surface-0)] px-5 py-3 rounded-xl border border-[var(--border)] self-start sm:self-auto">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Envoyées</p>
                                        <p className="font-black text-blue-500">{formatNumber(notif.sent)}</p>
                                    </div>
                                    <div className="w-px h-8 bg-[var(--border)]" />
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Livrées</p>
                                        <p className="font-black text-emerald-500">{formatNumber(notif.delivered)}</p>
                                    </div>
                                    <div className="w-px h-8 bg-[var(--border)]" />
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">Taux</p>
                                        <p className="font-black" style={{ color: notif.deliveryRate >= 80 ? '#10b981' : '#f59e0b' }}>
                                            {notif.deliveryRate}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Devices Table */}
            {recentDevices.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-[2rem] bg-[var(--surface-1)] border border-[var(--border)] shadow-sm overflow-hidden"
                >
                    <div className="p-6 md:p-8 border-b border-[var(--border)]">
                        <h3 className="text-xl font-black text-[var(--text-primary)]">Appareils Récemment Inscrits</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--surface-2)]">
                                <tr>
                                    <th className="py-4 px-6 font-bold text-[var(--text-muted)] uppercase tracking-wider text-xs">OS</th>
                                    <th className="py-4 px-6 font-bold text-[var(--text-muted)] uppercase tracking-wider text-xs">Application</th>
                                    <th className="py-4 px-6 font-bold text-[var(--text-muted)] uppercase tracking-wider text-xs">Identifiant (Token)</th>
                                    <th className="py-4 px-6 font-bold text-[var(--text-muted)] uppercase tracking-wider text-xs">Date d'inscription</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {recentDevices.map((device: any, i: number) => (
                                    <tr key={i} className="hover:bg-[var(--surface-2)] transition-colors">
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-bold"
                                                style={{
                                                    background: device.os === 'android' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                                                    color: device.os === 'android' ? '#3b82f6' : '#8b5cf6'
                                                }}>
                                                {device.os === 'android' ? '🤖 Android' : '🍎 iOS'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 font-bold text-[var(--text-primary)]">{device.buildName}</td>
                                        <td className="py-4 px-6">
                                            <code className="text-xs px-3 py-1.5 rounded-lg font-mono text-[var(--text-secondary)] bg-[var(--surface-0)] border border-[var(--border)]">
                                                {device.id}
                                            </code>
                                        </td>
                                        <td className="py-4 px-6 font-medium text-[var(--text-muted)]">
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
