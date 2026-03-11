import { cn } from '../../lib/utils'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'brand' | 'muted'

interface BadgeProps {
    variant?: BadgeVariant
    children: React.ReactNode
    className?: string
    dot?: boolean
}

export function Badge({ variant = 'brand', children, className, dot }: BadgeProps) {
    return (
        <span className={cn('badge', `badge-${variant}`, className)}>
            {dot && (
                <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: 'currentColor' }}
                />
            )}
            {children}
        </span>
    )
}

interface StatusBadgeProps {
    status: string
    className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config: Record<string, { variant: BadgeVariant; label: string }> = {
        completed: { variant: 'success', label: 'Terminé' },
        building: { variant: 'info', label: 'Compilation' },
        analyzing: { variant: 'info', label: 'Analyse' },
        signing: { variant: 'info', label: 'Signature' },
        uploading: { variant: 'info', label: 'Upload' },
        pending: { variant: 'warning', label: 'En attente' },
        failed: { variant: 'error', label: 'Échec' },
    }

    const { variant = 'muted', label = status } = config[status] || {}

    return (
        <Badge variant={variant} dot className={className}>
            {label}
        </Badge>
    )
}

export default Badge
