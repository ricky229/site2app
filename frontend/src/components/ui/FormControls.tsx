import { useState } from 'react'
import { cn } from '../../lib/utils'

interface ToggleProps {
    checked?: boolean
    onChange?: (checked: boolean) => void
    disabled?: boolean
    label?: string
    description?: string
    size?: 'sm' | 'md'
    className?: string
}

export function Toggle({ checked = false, onChange, disabled, label, description, size = 'md', className }: ToggleProps) {
    const handleClick = () => {
        if (!disabled) onChange?.(!checked)
    }

    return (
        <div className={cn('flex items-center justify-between gap-4', className)}>
            {(label || description) && (
                <div className="flex-1 min-w-0">
                    {label && (
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    )}
                    {description && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
                    )}
                </div>
            )}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={handleClick}
                disabled={disabled}
                className={cn(
                    'relative flex-shrink-0 rounded-full transition-all duration-300 cursor-pointer border-none',
                    disabled && 'opacity-50 cursor-not-allowed',
                    size === 'sm' ? 'w-9 h-5' : 'w-11 h-6',
                )}
                style={{
                    background: checked
                        ? 'linear-gradient(135deg, #3461f5, #5b46ef)'
                        : 'var(--surface-3)',
                }}
            >
                <span
                    className={cn(
                        'absolute top-0.5 rounded-full bg-white shadow transition-all duration-300',
                        size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
                    )}
                    style={{
                        left: checked
                            ? size === 'sm' ? 'calc(100% - 18px)' : 'calc(100% - 22px)'
                            : '2px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    }}
                />
            </button>
        </div>
    )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    options: { value: string; label: string }[]
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {label}
                </label>
            )}
            <select
                className={cn('input cursor-pointer', className)}
                style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%2394a3b8\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25em', paddingRight: '2.5rem' }}
                {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
        </div>
    )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
    hint?: string
}

export function Textarea({ label, error, hint, className, ...props }: TextareaProps) {
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {label}
                </label>
            )}
            <textarea
                className={cn('input resize-none', className)}
                style={{ minHeight: '100px' }}
                {...props}
            />
            {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
            {hint && !error && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
        </div>
    )
}

interface ColorPickerProps {
    value: string
    onChange: (color: string) => void
    label?: string
    presets?: string[]
}

export function ColorPicker({ value, onChange, label, presets = [] }: ColorPickerProps) {
    const [inputVal, setInputVal] = useState(value)

    const defaultPresets = [
        '#3461f5', '#7c3aed', '#db2777', '#059669', '#d97706',
        '#dc2626', '#0891b2', '#7c3aed', '#be185d', '#1d4ed8',
        '#000000', '#374151', '#9ca3af', '#f3f4f6', '#ffffff',
    ]

    const allPresets = presets.length > 0 ? presets : defaultPresets

    return (
        <div className="flex flex-col gap-2">
            {label && (
                <label className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</label>
            )}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => { setInputVal(e.target.value); onChange(e.target.value) }}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                        style={{ padding: '2px' }}
                    />
                </div>
                <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => {
                        setInputVal(e.target.value)
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                            onChange(e.target.value)
                        }
                    }}
                    className="input"
                    style={{ width: '110px', fontFamily: 'monospace' }}
                    placeholder="#000000"
                />
            </div>
            <div className="flex flex-wrap gap-2">
                {allPresets.map(color => (
                    <button
                        key={color}
                        type="button"
                        className="color-swatch"
                        style={{
                            backgroundColor: color,
                            borderColor: value === color ? '#3461f5' : 'transparent',
                            boxShadow: value === color ? '0 0 0 2px #3461f5' : 'none',
                        }}
                        onClick={() => { setInputVal(color); onChange(color) }}
                    />
                ))}
            </div>
        </div>
    )
}

export default Toggle
