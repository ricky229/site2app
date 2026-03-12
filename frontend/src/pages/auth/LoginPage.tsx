import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, Loader2, Zap, Github, Chrome } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { nodeApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

const loginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(6, 'Mot de passe trop court'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
    const navigate = useNavigate()
    const { login } = useAuthStore()
    const [showPass, setShowPass] = useState(false)

    const {
        register, handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

    const onSubmit = async (data: LoginForm) => {
        try {
            const res = await nodeApi.post('/auth/login', data)
            const { user: u, token } = res.data
            login(u, token)
            toast.success(`Bienvenue ${u.name} ! 👋`)
            navigate('/dashboard')
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || 'Email ou mot de passe incorrect'
            toast.error(msg)
        }
    }

    const handleOAuth = (provider: string) => {
        toast.error(`La connexion par ${provider} n'est pas encore activée en production.`)
        // In production: window.location.href = `/node/auth/${provider}`
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-md"
        >
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 mb-8">
                <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
                    <Zap size={18} color="white" />
                </div>
                <span className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Site2App</span>
            </Link>

            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Bon retour ! 👋
            </h1>
            <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                Connectez-vous pour accéder à vos applications.
            </p>

            {/* OAuth */}
            <div className="space-y-3 mb-6">
                <button
                    onClick={() => handleOAuth('google')}
                    className="btn btn-secondary w-full justify-start gap-3"
                >
                    <Chrome size={18} />
                    Continuer avec Google
                </button>
                <button
                    onClick={() => handleOAuth('github')}
                    className="btn btn-secondary w-full justify-start gap-3"
                >
                    <Github size={18} />
                    Continuer avec GitHub
                </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
                <div className="divider flex-1" />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ou</span>
                <div className="divider flex-1" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                    label="Email"
                    type="email"
                    placeholder="vous@exemple.fr"
                    icon={<Mail size={16} />}
                    error={errors.email?.message}
                    {...register('email')}
                />

                <Input
                    label="Mot de passe"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    icon={<Lock size={16} />}
                    iconRight={
                        <button type="button" onClick={() => setShowPass(s => !s)}>
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    }
                    error={errors.password?.message}
                    {...register('password')}
                />

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Se souvenir de moi</span>
                    </label>
                    <Link to="/auth/forgot-password" className="text-sm font-medium" style={{ color: 'var(--brand-500)' }}>
                        Mot de passe oublié ?
                    </Link>
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isSubmitting}
                    className="w-full"
                >
                    Se connecter
                </Button>
            </form>

            <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                Pas encore de compte ?{' '}
                <Link to="/auth/register" className="font-semibold" style={{ color: 'var(--brand-500)' }}>
                    Créer un compte gratuit
                </Link>
            </p>
        </motion.div>
    )
}
