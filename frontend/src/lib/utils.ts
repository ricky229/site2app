import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...options,
    })
}

export function formatRelativeTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'à l\'instant'
    if (minutes < 60) return `il y a ${minutes}min`
    if (hours < 24) return `il y a ${hours}h`
    if (days < 7) return `il y a ${days}j`
    return formatDate(d)
}

export function formatBytes(bytes?: number | null): string {
    if (!bytes || bytes === 0) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${sizes[i]}`
}

export function formatNumber(n?: number | null): string {
    if (n === undefined || n === null || isNaN(n)) return '0'
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
}

export function generatePackageName(appName: string): string {
    const sanitized = appName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.+|\.+$/g, '')
    return `com.site2app.${sanitized || 'myapp'}`
}

export function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '')
    } catch {
        return url
    }
}

export function isValidUrl(url: string): boolean {
    try {
        const u = new URL(url)
        return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
        return false
    }
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function statusColor(status: string): string {
    switch (status) {
        case 'completed': return '#10b981'
        case 'building':
        case 'analyzing':
        case 'signing':
        case 'uploading': return '#3461f5'
        case 'pending': return '#f59e0b'
        case 'failed': return '#ef4444'
        default: return '#94a3b8'
    }
}

export function statusLabel(status: string): string {
    const labels: Record<string, string> = {
        pending: 'En attente',
        analyzing: 'Analyse',
        building: 'Compilation',
        signing: 'Signature',
        uploading: 'Upload',
        completed: 'Terminé',
        failed: 'Échec',
    }
    return labels[status] || status
}

export function planLabel(plan: string): string {
    const labels: Record<string, string> = {
        free: 'Gratuit',
        starter: 'Starter',
        pro: 'Pro',
        enterprise: 'Enterprise',
    }
    return labels[plan] || plan
}

export function platformLabel(platform: string): string {
    const labels: Record<string, string> = {
        android: 'Android',
        ios: 'iOS',
        both: 'Android & iOS',
    }
    return labels[platform] || platform
}
