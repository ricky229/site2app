import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, User, Loader2, Zap, Github, Chrome, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { nodeApi } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

const registerSchema = z.object({
    name: z.string().min(2, 'Nom trop court'),
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Au moins 8 caractères').regex(/[A-Z]/, 'Une majuscule requise').regex(/[0-9]/, 'Un chiffre requis'),
    confirmPassword: z.string(),
    terms: z.boolean().refine(v => v, 'Vous devez accepter les CGU'),
}).refine(d => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

const passwordStrength = (pass: string) => {
    let score = 0
    if (pass.length >= 8) score++
    if (/[A-Z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++
    return score
}

export default function RegisterPage() {
    const navigate = useNavigate()
    const { login } = useAuthStore()
    const [showPass, setShowPass] = useState(false)
    const [passValue, setPassValue] = useState('')

    const {
        register, handleSubmit, watch,
        formState: { errors, isSubmitting }
    } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

    const onSubmit = async (data: RegisterForm) => {
        try {
            const res = await nodeApi.post('/auth/register', {
                name: data.name,
                email: data.email,
                password: data.password
            })
            const { user: u, token } = res.data
            login(u, token)
            toast.success('Compte créé avec succès ! 🎉')
            navigate('/dashboard')
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || 'Erreur lors de la création du compte'
            toast.error(msg)
        }
    }

    const strength = passwordStrength(passValue)
    const strengthColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']
    const strengthLabels = ['Très faible', 'Faible', 'Bon', 'Excellent']

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-md"
        >
            <Link to="/" className="flex items-center gap-2 mb-8">
                <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
                    <Zap size={18} color="white" />
                </div>
                <span className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Site2App</span>
            </Link>

            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Créer un compte 🚀
            </h1>
            <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
                Gratuit pour toujours. Pas de carte bancaire requise.
            </p>

            <div className="space-y-3 mb-6">
                <button type="button" onClick={() => toast.error("La connexion OAuth n'est pas encore activée en production.")} className="btn btn-secondary w-full justify-start gap-3">
                    <Chrome size={18} />
                    S'inscrire avec Google
                </button>
                <button type="button" onClick={() => toast.error("La connexion OAuth n'est pas encore activée en production.")} className="btn btn-secondary w-full justify-start gap-3">
                    <Github size={18} />
                    S'inscrire avec GitHub
                </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
                <div className="divider flex-1" />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>ou avec email</span>
                <div className="divider flex-1" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                    label="Nom complet"
                    placeholder="Jean Dupont"
                    icon={<User size={16} />}
                    error={errors.name?.message}
                    {...register('name')}
                />

                <Input
                    label="Email"
                    type="email"
                    placeholder="vous@exemple.fr"
                    icon={<Mail size={16} />}
                    error={errors.email?.message}
                    {...register('email')}
                />

                <div>
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
                        {...register('password', { onChange: (e) => setPassValue(e.target.value) })}
                    />
                    {passValue && (
                        <div className="mt-2">
                            <div className="flex gap-1 mb-1">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-1.5 flex-1 rounded-full transition-all"
                                        style={{ background: i <= strength ? strengthColors[strength - 1] : 'var(--surface-3)' }} />
                                ))}
                            </div>
                            <p className="text-xs" style={{ color: strength > 0 ? strengthColors[strength - 1] : 'var(--text-muted)' }}>
                                {strength > 0 ? strengthLabels[strength - 1] : ''}
                            </p>
                        </div>
                    )}
                </div>

                <Input
                    label="Confirmer le mot de passe"
                    type="password"
                    placeholder="••••••••"
                    icon={<Lock size={16} />}
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                />

                <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" {...register('terms')} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        J'accepte les{' '}
                        <Link to="/terms" className="underline" style={{ color: 'var(--brand-500)' }}>conditions générales</Link>
                        {' '}et la{' '}
                        <Link to="/privacy" className="underline" style={{ color: 'var(--brand-500)' }}>politique de confidentialité</Link>
                    </span>
                </label>
                {errors.terms && <p className="text-sm -mt-2" style={{ color: '#ef4444' }}>{errors.terms.message}</p>}

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isSubmitting}
                    className="w-full"
                >
                    Créer mon compte gratuit
                </Button>
            </form>

            <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Plan gratuit inclut :</p>
                {['1 application Android', '2 builds par mois', 'Push notifications', 'Mode hors-ligne'].map(f => (
                    <div key={f} className="flex items-center gap-2 mb-1">
                        <CheckCircle size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                    </div>
                ))}
            </div>

            <p className="mt-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                Déjà un compte ?{' '}
                <Link to="/auth/login" className="font-semibold" style={{ color: 'var(--brand-500)' }}>
                    Se connecter
                </Link>
            </p>
        </motion.div>
    )
}
