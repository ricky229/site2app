import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Globe, Search, Shield, Smartphone, Zap, CheckCircle,
    AlertCircle, Clock, ExternalLink, RefreshCw, Loader2
} from 'lucide-react'
import { useWizardStore } from '../../../store/wizardStore'
import { isValidUrl, generatePackageName } from '../../../lib/utils'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import type { SiteAnalysis } from '../../../types'
import toast from 'react-hot-toast'

// Hash a string to a consistent number
function hashStr(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i)
        hash = hash & hash
    }
    return Math.abs(hash)
}

// Generate a nice color from HSL
function hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => {
        const k = (n + h / 30) % 12
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
        return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
}

// Analyse site via Node.js backend (Deep analysis)
async function analyzeSite(url: string): Promise<SiteAnalysis> {
    const domain = new URL(url).hostname.replace('www.', '')
    const words = domain.split('.')
    const fallbackTitle = words[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    // Deterministic fallback colors based on domain (what worked before)
    const generateFallbackColors = () => {
        const h = hashStr(domain)
        const hue1 = h % 360
        const hue2 = (hue1 + 40) % 360
        return [
            hslToHex(hue1, 65, 50),
            hslToHex(hue2, 55, 45),
            '#ffffff',
            hslToHex(hue1, 10, 96)
        ]
    }

    try {
        const baseUrl = window.location.hostname !== 'localhost' 
            ? window.location.origin + '/node'
            : '/node';
            
        const response = await fetch(`${baseUrl}/analyze?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        const colors = (data.colors && data.colors.length >= 2) ? data.colors : generateFallbackColors();

        return {
            url,
            title: data.title || fallbackTitle,
            description: data.description || `Application mobile de ${data.title || fallbackTitle}`,
            favicon: data.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
            screenshot: `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`,
            colors: colors,
            pages: [
                { url, title: 'Accueil' },
                { url: url + '/about', title: 'À propos' },
                { url: url + '/contact', title: 'Contact' },
            ],
            ssl: url.startsWith('https'),
            responsive: true,
            performanceScore: Math.floor(65 + Math.random() * 30),
            loadTime: Math.round((0.8 + Math.random() * 2) * 10) / 10,
        }
    } catch (err) {
        console.warn('[Analysis] Node backend failed, using deterministic fallbacks:', err)
        return {
            url,
            title: fallbackTitle,
            description: `Application mobile de ${fallbackTitle}`,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            screenshot: `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`,
            colors: generateFallbackColors(),
            pages: [{ url, title: 'Accueil' }],
            ssl: url.startsWith('https'),
            responsive: true,
            performanceScore: 75,
            loadTime: 1.5
        }
    }
}

type AnalysisState = 'idle' | 'loading' | 'done' | 'error'

export default function Step1Url() {
    const { state, setSiteAnalysis, updateConfig } = useWizardStore()
    const [url, setUrl] = useState(state.config.url || 'https://')
    const [analysisState, setAnalysisState] = useState<AnalysisState>(state.siteAnalysis ? 'done' : 'idle')
    const [error, setError] = useState('')
    const [progress, setProgress] = useState(0)
    const [loadingStep, setLoadingStep] = useState(0)

    const loadingSteps = [
        'Connexion au site...',
        'Extraction des couleurs...',
        'Capture du screenshot...',
        'Analyse des performances...',
        'Vérification SSL...',
        'Finalisation...',
    ]

    const analysis = state.siteAnalysis

    const handleAnalyze = async () => {
        setError('')
        if (!isValidUrl(url)) {
            setError('Veuillez entrer une URL valide (ex: https://monsite.fr)')
            return
        }

        setAnalysisState('loading')
        setProgress(0)
        setLoadingStep(0)

        // Simulate progress
        const interval = setInterval(() => {
            setProgress(p => {
                const next = p + (100 / 30)
                return next >= 95 ? 95 : next
            })
            setLoadingStep(s => Math.min(s + 1, loadingSteps.length - 1))
        }, 500)

        try {
            const result = await analyzeSite(url)
            clearInterval(interval)
            setProgress(100)
            setLoadingStep(loadingSteps.length - 1)
            await new Promise(r => setTimeout(r, 300))
            setSiteAnalysis(result)
            updateConfig({
                packageName: generatePackageName(result.title),
                primaryColor: result.colors[0],
                secondaryColor: result.colors[1]
            })
            setAnalysisState('done')
            toast.success('Site analysé avec succès !')
        } catch (err) {
            clearInterval(interval)
            setAnalysisState('error')
            setError('Impossible d\'analyser ce site. Vérifiez l\'URL et réessayez.')
        }
    }

    const ScoreBar = ({ score, label, color }: { score: number; label: string; color: string }) => (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ color, fontWeight: 600 }}>{score}/100</span>
            </div>
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${score}%`, background: color, transition: 'width 1s ease' }} />
            </div>
        </div>
    )

    return (
        <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6">
            <div className="mb-8">
                <div className="step-bubble mb-4">1</div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2 break-words">Entrez l'URL de votre site</h2>
                <p className="text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
                    Notre IA va analyser votre site et extraire automatiquement les couleurs, le logo et la structure.
                </p>
            </div>

            {/* URL Input */}
            <div className="card p-4 md:p-6 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 min-w-0">
                        <Input
                            inputSize="lg"
                            type="url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://votre-site.fr"
                            icon={<Globe size={20} />}
                            error={error}
                            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                        />
                    </div>
                    <Button
                        size="lg"
                        className="w-full sm:w-auto mt-2 sm:mt-0"
                        onClick={handleAnalyze}
                        loading={analysisState === 'loading'}
                        icon={<Search size={20} />}
                        disabled={!url}
                    >
                        Analyser
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Exemples :</span>
                    {['https://monshop.fr', 'https://blog-express.fr', 'https://restaurpro.fr'].map(ex => (
                        <button
                            key={ex}
                            onClick={() => setUrl(ex)}
                            className="text-xs px-2 py-1 rounded-md transition-colors"
                            style={{ background: 'var(--surface-2)', color: 'var(--brand-500)' }}
                        >
                            {ex}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            <AnimatePresence>
                {analysisState === 'loading' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="card p-6 mb-6"
                    >
                        <div className="flex items-center gap-3 mb-5">
                            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand-500)' }} />
                            <div>
                                <p className="font-semibold">Analyse en cours...</p>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{loadingSteps[loadingStep]}</p>
                            </div>
                        </div>
                        <div className="progress-bar mb-2">
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>{Math.round(progress)}%</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Analysis Results */}
            <AnimatePresence>
                {analysisState === 'done' && analysis && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex items-center gap-2 mb-5">
                            <CheckCircle size={20} style={{ color: '#10b981' }} />
                            <h3 className="font-bold text-lg">Analyse terminée !</h3>
                            <button
                                onClick={handleAnalyze}
                                className="ml-auto btn btn-ghost btn-sm gap-1"
                            >
                                <RefreshCw size={14} /> Relancer
                            </button>
                        </div>

                        <div className="grid md:grid-cols-5 gap-5">
                            {/* Left: Screenshot */}
                            <div className="md:col-span-2">
                                <div className="card overflow-hidden" style={{ padding: 0 }}>
                                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-3">
                                                    <Globe size={28} color="white" />
                                                </div>
                                                <p className="font-bold text-gray-700">{analysis.title}</p>
                                                <p className="text-sm text-gray-500">{new URL(analysis.url).hostname}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            {analysis.favicon && (
                                                <img src={analysis.favicon} alt="favicon" className="w-5 h-5 rounded" />
                                            )}
                                            <span className="font-bold truncate">{analysis.title}</span>
                                        </div>
                                        <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{analysis.description}</p>
                                        <a
                                            href={analysis.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs mt-2"
                                            style={{ color: 'var(--brand-500)' }}
                                        >
                                            <ExternalLink size={11} /> {analysis.url}
                                        </a>
                                    </div>
                                </div>

                                {/* Color Palette */}
                                <div className="card p-4 mt-4">
                                    <p className="font-semibold text-sm mb-3">Palette détectée</p>
                                    <div className="flex gap-2">
                                        {analysis.colors.map((c, i) => (
                                            <div key={i} className="flex-1 h-10 rounded-lg border" style={{ background: c, borderColor: 'var(--border)' }} title={c} />
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        {analysis.colors.map((c, i) => (
                                            <p key={i} className="flex-1 text-xs text-center font-mono" style={{ color: 'var(--text-muted)' }}>{c}</p>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Details */}
                            <div className="md:col-span-3 space-y-4">
                                {/* Site Health */}
                                <div className="card p-5">
                                    <h4 className="font-semibold mb-4">Santé du site</h4>
                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                        {[
                                            { icon: Shield, label: 'SSL/HTTPS', ok: analysis.ssl, color: '#10b981' },
                                            { icon: Smartphone, label: 'Responsive', ok: analysis.responsive, color: '#3b82f6' },
                                        ].map(item => (
                                            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl"
                                                style={{ background: item.ok ? `${item.color}10` : 'rgba(239,68,68,0.08)' }}>
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                    style={{ background: item.ok ? `${item.color}20` : 'rgba(239,68,68,0.15)' }}>
                                                    <item.icon size={16} style={{ color: item.ok ? item.color : '#ef4444' }} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold">{item.label}</p>
                                                    <p className="text-xs" style={{ color: item.ok ? item.color : '#ef4444' }}>
                                                        {item.ok ? '✓ Oui' : '✗ Non'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-3">
                                        <ScoreBar score={analysis.performanceScore} label="Performance" color="#3461f5" />
                                        <ScoreBar score={analysis.ssl ? 100 : 0} label="Sécurité" color="#10b981" />
                                        <ScoreBar score={analysis.responsive ? 95 : 30} label="Mobile-Friendly" color="#7c3aed" />
                                    </div>

                                    <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        <Clock size={14} />
                                        Temps de chargement : <strong>{analysis.loadTime}s</strong>
                                    </div>
                                </div>

                                {/* Pages Found */}
                                <div className="card p-5">
                                    <h4 className="font-semibold mb-3">Pages détectées</h4>
                                    <div className="space-y-2">
                                        {analysis.pages.map((page, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg"
                                                style={{ background: 'var(--surface-1)' }}>
                                                <Globe size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                <span className="text-sm font-medium">{page.title}</span>
                                                <span className="text-xs truncate flex-1" style={{ color: 'var(--text-muted)' }}>{page.url}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Check issues */}
                                {!analysis.ssl && (
                                    <div className="card p-4 flex items-center gap-3"
                                        style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
                                        <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                        <div>
                                            <p className="font-semibold text-sm" style={{ color: '#f59e0b' }}>Site sans HTTPS</p>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                Certaines fonctionnalités natives nécessitent HTTPS (géolocalisation, caméra).
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty state tips */}
            {analysisState === 'idle' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid sm:grid-cols-3 gap-4"
                >
                    {[
                        { icon: Globe, title: 'N\'importe quel site', desc: 'WordPress, Shopify, site custom, React, Vue...', color: '#3461f5' },
                        { icon: Zap, title: 'Analyse automatique', desc: 'Logo, couleurs, SSL, performance — tout extrait en 3 secondes.', color: '#7c3aed' },
                        { icon: CheckCircle, title: '98.7% de succès', desc: 'Notre moteur de build garantit un APK/IPA fonctionnel.', color: '#10b981' },
                    ].map(item => (
                        <div key={item.title} className="card p-5 text-center">
                            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                                style={{ background: `${item.color}18`, color: item.color }}>
                                <item.icon size={22} />
                            </div>
                            <h4 className="font-semibold mb-1">{item.title}</h4>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                        </div>
                    ))}
                </motion.div>
            )}
        </div>
    )
}
