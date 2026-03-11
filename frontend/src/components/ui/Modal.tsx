import { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

interface ModalProps {
    open: boolean
    onClose: () => void
    title?: string
    subtitle?: string
    children: React.ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    className?: string
    hideClose?: boolean
}

export function Modal({ open, onClose, title, subtitle, children, size = 'md', className, hideClose }: ModalProps) {
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [open])

    const sizeClass = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-6xl',
    }[size]

    return (
        <AnimatePresence>
            {open && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn('modal-content w-full', sizeClass, className)}
                        style={{ padding: '1.5rem' }}
                    >
                        {(title || !hideClose) && (
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    {title && (
                                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                                    )}
                                    {subtitle && (
                                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
                                    )}
                                </div>
                                {!hideClose && (
                                    <button
                                        onClick={onClose}
                                        className="btn btn-ghost btn-sm ml-4 flex-shrink-0"
                                        style={{ padding: '0.375rem' }}
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        )}
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default Modal
