import { cn } from '../../lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hover?: boolean
    glass?: boolean
    padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ hover, glass, padding = 'md', className, children, ...props }: CardProps) {
    const padClass = {
        none: '',
        sm: 'p-3 md:p-4',
        md: 'p-4 md:p-6',
        lg: 'p-5 md:p-8',
    }[padding]

    return (
        <div
            className={cn(
                glass ? 'card-glass' : 'card',
                hover && 'card-hover',
                padClass,
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    subtitle?: string
    action?: React.ReactNode
    icon?: React.ReactNode
}

export function CardHeader({ title, subtitle, action, icon, className, ...props }: CardHeaderProps) {
    return (
        <div className={cn('flex items-start justify-between mb-5', className)} {...props}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="feature-icon-wrapper" style={{ marginBottom: 0 }}>
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                    {subtitle && (
                        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
                    )}
                </div>
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    )
}

interface StatCardProps {
    title: string
    value: string | number
    change?: number
    icon: React.ReactNode
    color?: string
    className?: string
}

export function StatCard({ title, value, change, icon, color = '#3461f5', className }: StatCardProps) {
    return (
        <div className={cn('stat-card', className)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{title}</p>
                    <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    {change !== undefined && (
                        <p className="text-xs mt-1 font-medium" style={{ color: change >= 0 ? '#10b981' : '#ef4444' }}>
                            {change >= 0 ? '+' : ''}{change}% ce mois
                        </p>
                    )}
                </div>
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18`, color }}
                >
                    {icon}
                </div>
            </div>
        </div>
    )
}

export default Card
