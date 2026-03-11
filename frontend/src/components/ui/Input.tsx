import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    hint?: string
    icon?: React.ReactNode
    iconRight?: React.ReactNode
    inputSize?: 'sm' | 'md' | 'lg'
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    hint,
    icon,
    iconRight,
    inputSize = 'md',
    className,
    ...props
}, ref) => {
    const sizeClass = {
        sm: 'py-1.5 px-3 text-sm',
        md: '',
        lg: 'input-lg',
    }[inputSize]

    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {label}
                    {props.required && <span className="ml-1" style={{ color: '#ef4444' }}>*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'var(--text-muted)' }}>
                        {icon}
                    </span>
                )}
                <input
                    ref={ref}
                    className={cn(
                        'input',
                        sizeClass,
                        icon && 'pl-10',
                        iconRight && 'pr-10',
                        error && 'border-red-400 focus:border-red-400 focus:shadow-none',
                        className
                    )}
                    {...props}
                />
                {iconRight && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)' }}>
                        {iconRight}
                    </span>
                )}
            </div>
            {error && (
                <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            )}
            {hint && !error && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{hint}</p>
            )}
        </div>
    )
})

Input.displayName = 'Input'
export default Input
