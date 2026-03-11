import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Smartphone, Apple, CheckCircle, Download, Share2,
    AlertCircle, Loader2, Clock, QrCode, ExternalLink,
    BookOpen, Star
} from 'lucide-react'
import { useWizardStore } from '../../../store/wizardStore'
import Button from '../../../components/ui/Button'
import { platformLabel } from '../../../lib/utils'
import toast from 'react-hot-toast'
import api from '../../../lib/api'

type BuildStepStatus = 'pending' | 'running' | 'done' | 'failed'

interface BuildStepItem {
    id: string
    label: string
    duration: number
    emoji: string
}

const BUILD_STEPS: BuildStepItem[] = [
    { id: 'prepare', label: 'Préparation de l\'environnement', duration: 1500, emoji: '🔧' },
    { id: 'config', label: 'Configuration du projet', duration: 2000, emoji: '⚙️' },
    { id: 'icons', label: 'Génération des icônes adaptatives', duration: 1800, emoji: '🎨' },
    { id: 'compile', label: 'Compilation du code source', duration: 3000, emoji: '🔨' },
    { id: 'sign', label: 'Signature cryptographique', duration: 2000, emoji: '🔐' },
    { id: 'upload', label: 'Upload vers le serveur', duration: 1500, emoji: '☁️' },
]

type BuildPhase = 'select' | 'building' | 'done' | 'error'

export default function Step5Build() {
    const navigate = useNavigate()
    const { state, reset } = useWizardStore()
    const { config, platform: wizardPlatform, siteAnalysis } = state

    const [platform, setPlatform] = useState<'android' | 'ios' | 'both'>(wizardPlatform || 'android')
    const [phase, setPhase] = useState<BuildPhase>('select')
    const [stepStatuses, setStepStatuses] = useState<Record<string, BuildStepStatus>>({})
    const [currentStepIdx, setCurrentStepIdx] = useState(-1)
    const [totalProgress, setTotalProgress] = useState(0)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [buildId, setBuildId] = useState<string | null>(null)
    const [buildError, setBuildError] = useState<string | null>(null)

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>
        if (phase === 'building') {
            interval = setInterval(() => {
                setElapsedTime(t => t + 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [phase])

    const runBuild = async () => {
        setPhase('building')
        setCurrentStepIdx(0)
        setStepStatuses({})
        setElapsedTime(0)
        setTotalProgress(0)
        setBuildError(null)

        let newBuildId = null;

        try {
            // Start build on backend
            const response = await api.post('/build', {
                appName: config.name || siteAnalysis?.title || 'MonApp',
                url: config.url || siteAnalysis?.url || 'https://example.com',
                platform: platform,
                packageName: config.packageName || undefined,
                statusBarColor: config.statusBar?.color || config.primaryColor,
                themeColor: config.statusBar?.color || config.primaryColor,
                splashBgColor: config.statusBar?.color || config.primaryColor,
                primaryColor: config.primaryColor,
                secondaryColor: config.secondaryColor,
                enableFullscreen: config.features?.fullscreen || false,
                orientation: config.orientation || 'portrait',
                features: config.features || {},
                icon: config.icon || undefined,
                splashImage: config.splashScreen || undefined,
            })

            newBuildId = response.data.buildId
            setBuildId(newBuildId)
            console.log('[Build] Started with ID:', newBuildId)
        } catch (error: any) {
            console.error('Build start error:', error)
            setPhase('error')
            setBuildError(error.response?.data?.error || "Impossible de contacter le serveur de compilation.")
            return
        }

        // Wait for backend to finish (Real Polling)
        let isDone = false
        const startTime = Date.now()

        while (!isDone) {
            try {
                const { data: statusData } = await api.get(`/build/${newBuildId}/status`)

                if (statusData.status === 'completed') {
                    isDone = true
                    setTotalProgress(100)
                    setStepStatuses(s => {
                        const next = { ...s }
                        BUILD_STEPS.forEach(step => next[step.id] = 'done')
                        return next
                    })
                } else if (statusData.status === 'failed') {
                    setPhase('error')
                    setBuildError(statusData.error || 'Erreur inconnue')
                    toast.error('Échec de la compilation')
                    return
                } else {
                    // Update UI based on elapsed time relative to expected duration
                    const now = Date.now()
                    const totalEstimated = 180000 // 3 minutes max estimate for Gradle
                    const currentProgress = Math.min(95, Math.round(((now - startTime) / totalEstimated) * 100))
                    setTotalProgress(currentProgress)

                    // Update steps based on progress
                    const stepIdx = Math.floor((currentProgress / 100) * BUILD_STEPS.length)
                    setCurrentStepIdx(stepIdx)
                    BUILD_STEPS.forEach((step, idx) => {
                        if (idx < stepIdx) setStepStatuses(s => ({ ...s, [step.id]: 'done' }))
                        else if (idx === stepIdx) setStepStatuses(s => ({ ...s, [step.id]: 'running' }))
                    })
                }
            } catch (e) {
                console.warn('Status poll failed', e)
            }

            if (!isDone) await new Promise(r => setTimeout(r, 3000))
        }

        setPhase('done')
        toast.success('🎉 Votre application est prête !')
    }

    const handleDownload = () => {
        if (!buildId) return
        const url = `${api.defaults.baseURL}/download/${buildId}`
        const a = document.createElement('a')
        a.href = url
        a.download = `${config.name || 'app'}.apk`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success('Téléchargement lancé !')
    }

    const handleCopyLink = () => {
        if (!buildId) return
        const url = `${window.location.origin}${api.defaults.baseURL}/download/${buildId}`
        navigator.clipboard.writeText(url)
        toast.success('Lien copié !')
    }

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

    return (
        <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6 pb-20">
            {phase !== 'done' && phase !== 'error' && (
                <div className="mb-8">
                    <div className="step-bubble mb-4">5</div>
                    <h2 className="text-3xl font-bold mb-2">Build & Téléchargement</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Choisissez la plateforme cible et lancez la génération de votre application.
                    </p>
                </div>
            )}

            <AnimatePresence mode="wait">
                {phase === 'select' && (
                    <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="card p-6 mb-5">
                            <h3 className="font-bold mb-5">Choisissez votre plateforme</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { id: 'android' as const, icon: Smartphone, label: 'Android', sublabel: 'APK/AAB', color: '#3ddc84', desc: 'Compatible tous Android 5.0+' },
                                    { id: 'ios' as const, icon: Apple, label: 'iOS', sublabel: 'IPA', color: '#555', desc: 'iPhone et iPad' },
                                    { id: 'both' as const, icon: null, label: 'Les deux', sublabel: 'APK + IPA', color: '#3461f5', desc: 'Meilleure couverture' },
                                ].map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => setPlatform(option.id)}
                                        className="p-5 rounded-2xl border-2 text-center transition-all"
                                        style={{
                                            borderColor: platform === option.id ? option.color : 'var(--border)',
                                            background: platform === option.id ? `${option.color}10` : 'var(--surface-1)',
                                        }}
                                    >
                                        {option.id === 'both' ? (
                                            <div className="flex justify-center gap-1 mb-2">
                                                <Smartphone size={22} style={{ color: '#3ddc84' }} />
                                                <Apple size={22} style={{ color: '#555' }} />
                                            </div>
                                        ) : option.icon ? (
                                            <option.icon size={28} className="mx-auto mb-2" style={{ color: option.color }} />
                                        ) : null}
                                        <p className="font-bold">{option.label}</p>
                                        <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>{option.sublabel}</p>
                                        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{option.desc}</p>
                                        {platform === option.id && (
                                            <div className="mt-2 text-brand-500">
                                                <CheckCircle size={16} className="mx-auto" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="card p-5 mb-6">
                            <h3 className="font-bold mb-4">Résumé avant build</h3>
                            <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                <div className="flex gap-2"><span className="w-24 text-muted">Application :</span><span className="font-semibold">{config.name || siteAnalysis?.title}</span></div>
                                <div className="flex gap-2"><span className="w-24 text-muted">URL :</span><span className="font-semibold truncate">{config.url || siteAnalysis?.url}</span></div>
                                <div className="flex gap-2"><span className="w-24 text-muted">Package :</span><span className="font-semibold">{config.packageName}</span></div>
                                <div className="flex gap-2"><span className="w-24 text-muted">Plateforme :</span><span className="font-semibold">{platformLabel(platform)}</span></div>
                            </div>
                        </div>

                        <div className="text-center">
                            <Button onClick={runBuild} size="xl" icon={<Smartphone size={20} />} className="mx-auto">
                                🚀 Générer mon application
                            </Button>
                        </div>
                    </motion.div>
                )}

                {phase === 'building' && (
                    <motion.div key="building" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="card p-6 mb-5">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <Loader2 size={22} className="animate-spin text-brand-500" />
                                    <div>
                                        <p className="font-bold">Build en cours...</p>
                                        <p className="text-sm text-secondary">{platformLabel(platform)} — {config.name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-brand-500">{totalProgress}%</p>
                                    <div className="flex items-center gap-1 text-xs text-muted">
                                        <Clock size={11} /> {formatTime(elapsedTime)}
                                    </div>
                                </div>
                            </div>

                            <div className="progress-bar mb-6 h-2">
                                <div className="progress-fill" style={{ width: `${totalProgress}%` }} />
                            </div>

                            <div className="space-y-2">
                                {BUILD_STEPS.map((step, i) => {
                                    const status = stepStatuses[step.id] || 'pending'
                                    return (
                                        <div key={step.id} className="flex items-center gap-3 p-3 rounded-xl border border-transparent bg-surface-1" style={{ opacity: status === 'pending' ? 0.5 : 1 }}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status === 'done' ? 'bg-green-100 text-green-600' : status === 'running' ? 'bg-brand-100 text-brand-600' : 'bg-surface-2'}`}>
                                                {status === 'done' ? '✓' : status === 'running' ? <Loader2 size={14} className="animate-spin" /> : step.emoji}
                                            </div>
                                            <p className="text-sm font-medium flex-1">{step.label}</p>
                                            <span className="text-xs">{status === 'done' ? 'Prêt' : status === 'running' ? 'En cours' : 'Attente'}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}

                {phase === 'done' && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={40} className="text-green-600" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">🎉 Application prête !</h2>
                        <p className="mb-8 text-secondary">Votre APK a été générée avec succès.</p>

                        <div className="max-w-md mx-auto card p-6 mb-8">
                            <Smartphone size={32} className="mx-auto mb-4 text-brand-500" />
                            <h3 className="font-bold mb-6">{config.name}.apk</h3>
                            <Button variant="primary" size="xl" className="w-full" icon={<Download size={20} />} onClick={handleDownload}>
                                Télécharger l'APK
                            </Button>
                        </div>

                        <div className="flex gap-3 justify-center">
                            <Button variant="secondary" onClick={() => navigate('/dashboard')}>Tableau de bord</Button>
                            <Button variant="ghost" onClick={handleCopyLink} icon={<Share2 size={16} />}>Copier le lien</Button>
                        </div>
                    </motion.div>
                )}

                {phase === 'error' && (
                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6 text-red-600">
                            <AlertCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-red-700">La compilation a échoué</h2>
                        <p className="mb-8 text-red-600 max-w-md mx-auto">{buildError}</p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="secondary" onClick={() => setPhase('select')}>Réessayer</Button>
                            <Button variant="ghost" onClick={() => navigate('/dashboard')}>Dashboard</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
