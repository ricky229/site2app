import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    loading?: boolean
    icon?: React.ReactNode
    iconRight?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconRight,
    children,
    className,
    disabled,
    ...props
}, ref) => {
    const variantClass = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        ghost: 'btn-ghost',
        danger: 'btn-danger',
        outline: 'btn-secondary',
    }[variant]

    const sizeClass = {
        sm: 'btn-sm',
        md: '',
        lg: 'btn-lg',
        xl: 'btn-xl',
    }[size]

    return (
        <button
            ref={ref}
            className={cn('btn', variantClass, sizeClass, className)}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <Loader2 size={16} className="animate-spin" />
            ) : icon ? (
                icon
            ) : null}
            {children}
            {iconRight && !loading && iconRight}
        </button>
    )
})

Button.displayName = 'Button'
export default Button
