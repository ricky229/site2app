import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    Bell, Wifi, MapPin, Camera, Share2, Fingerprint, Maximize2,
    RefreshCw, BarChart2, Download, MessageSquare, Code2,
    DollarSign, BarChart, Zap, Info
} from 'lucide-react'
import { useWizardStore } from '../../../store/wizardStore'
import { Toggle } from '../../../components/ui/FormControls'
import type { AppFeatures } from '../../../types'

interface FeatureItem {
    key: keyof AppFeatures
    icon: typeof Bell
    label: string
    description: string
    color: string
    plan?: 'free' | 'starter' | 'pro'
    badge?: string
}

const featureGroups: { title: string; features: FeatureItem[] }[] = [
    {
        title: 'Fonctionnalités essentielles',
        features: [
            { key: 'pushNotifications', icon: Bell, label: 'Notifications Push', description: 'Envoyez des notifications ciblées via Firebase FCM — 100% gratuit.', color: '#f59e0b', badge: 'GRATUIT' },
            { key: 'offlineMode', icon: Wifi, label: 'Mode hors-ligne', description: 'L\'app fonctionne sans connexion grâce au cache intelligent.', color: '#10b981' },
            { key: 'pullToRefresh', icon: RefreshCw, label: 'Pull-to-refresh', description: 'L\'utilisateur tire vers le bas pour actualiser le contenu.', color: '#3b82f6' },
            { key: 'progressBar', icon: BarChart, label: 'Barre de progression', description: 'Barre de chargement visible lors de la navigation.', color: '#6366f1' },
        ]
    },
    {
        title: 'APIs natives',
        features: [
            { key: 'geolocation', icon: MapPin, label: 'Géolocalisation', description: 'Accès au GPS de l\'appareil pour services basés sur la position.', color: '#3461f5' },
            { key: 'camera', icon: Camera, label: 'Caméra & Galerie', description: 'Accès à l\'appareil photo et à la bibliothèque de photos.', color: '#7c3aed' },
            { key: 'nativeShare', icon: Share2, label: 'Partage natif', description: 'Share sheet natif Android/iOS pour partager du contenu.', color: '#06b6d4' },
            { key: 'biometrics', icon: Fingerprint, label: 'Biométrie', description: 'Verrouillage de l\'app avec Face ID ou empreinte digitale.', color: '#ef4444' },
        ]
    },
    {
        title: 'Expérience utilisateur',
        features: [
            { key: 'fullscreen', icon: Maximize2, label: 'Mode plein écran', description: 'Mode immersif — cachezles barres systèmes pour plus d\'espace.', color: '#f97316' },
            { key: 'fileDownload', icon: Download, label: 'Téléchargements', description: 'Gestion native des téléchargements de fichiers depuis votre site.', color: '#84cc16' },
            { key: 'popupSupport', icon: MessageSquare, label: 'Support des popups', description: 'Gestion des popups et fenêtres secondaires de votre site.', color: '#a855f7' },
            { key: 'deepLinking', icon: Zap, label: 'Deep Linking', description: 'Ouvrez des pages spécifiques depuis des liens externes.', color: '#14b8a6' },
        ]
    },
    {
        title: 'Avancé',
        features: [
            { key: 'customCssJs', icon: Code2, label: 'CSS/JS personnalisé', description: 'Injectez du code CSS/JS pour personnaliser l\'apparence.', color: '#6366f1', plan: 'starter' },
            { key: 'analytics', icon: BarChart2, label: 'Analytics intégré', description: 'Tableau de bord avec pages vues, sessions, rétention.', color: '#3461f5', plan: 'starter' },
            { key: 'otaUpdates', icon: RefreshCw, label: 'OTA Updates', description: 'Mettez à jour votre app sans passer par le store.', color: '#10b981', plan: 'starter' },
            { key: 'admob', icon: DollarSign, label: 'AdMob (monétisation)', description: 'Intégrez des bannières et interstitiels Google AdMob.', color: '#f59e0b', plan: 'pro' },
        ]
    },
]

export default function Step3Features() {
    const { state, updateConfig } = useWizardStore()
    const features = state.config.features || {} as AppFeatures
    const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)

    const toggleFeature = (key: keyof AppFeatures, value: boolean) => {
        updateConfig({
            features: { ...features, [key]: value }
        })
    }

    const enabledCount = Object.values(features).filter(Boolean).length

    return (
        <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6">
            <div className="mb-8">
                <div className="step-bubble mb-4">3</div>
                <div className="flex items-end justify-between">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-2 break-words">Fonctionnalités & Add-ons</h2>
                        <p className="text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
                            Activez les fonctionnalités natives pour votre application.
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold" style={{ color: 'var(--brand-500)' }}>{enabledCount}</div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>activées</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {featureGroups.map(group => (
                    <div key={group.title} className="card p-5">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-base">
                            {group.title}
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {group.features.map(feature => (
                                <motion.div
                                    key={feature.key}
                                    whileHover={{ scale: 1.01 }}
                                    onMouseEnter={() => setHoveredFeature(feature.key)}
                                    onMouseLeave={() => setHoveredFeature(null)}
                                    className="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all"
                                    style={{
                                        borderColor: features[feature.key] ? feature.color + '40' : 'var(--border)',
                                        background: features[feature.key] ? `${feature.color}08` : 'var(--surface-1)',
                                    }}
                                    onClick={() => toggleFeature(feature.key, !features[feature.key])}
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                                        style={{
                                            background: features[feature.key] ? `${feature.color}20` : 'var(--surface-2)',
                                            color: features[feature.key] ? feature.color : 'var(--text-muted)',
                                        }}
                                    >
                                        <feature.icon size={19} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">{feature.label}</span>
                                            {feature.badge && (
                                                <span className="badge badge-success text-xs" style={{ fontSize: '0.65rem' }}>
                                                    {feature.badge}
                                                </span>
                                            )}
                                            {feature.plan === 'pro' && (
                                                <span className="badge badge-warning text-xs" style={{ fontSize: '0.65rem' }}>PRO</span>
                                            )}
                                            {feature.plan === 'starter' && (
                                                <span className="badge badge-brand text-xs" style={{ fontSize: '0.65rem' }}>STARTER+</span>
                                            )}
                                        </div>
                                        {hoveredFeature === feature.key && (
                                            <motion.p
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="text-xs mt-1"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                {feature.description}
                                            </motion.p>
                                        )}
                                    </div>
                                    <div onClick={e => e.stopPropagation()}>
                                        <Toggle
                                            checked={!!features[feature.key]}
                                            onChange={v => toggleFeature(feature.key, v)}
                                            size="sm"
                                        />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Info banner */}
            <div className="mt-6 p-4 rounded-xl flex items-start gap-3"
                style={{ background: 'rgba(52,97,245,0.08)', border: '1px solid rgba(52,97,245,0.2)' }}>
                <Info size={16} style={{ color: 'var(--brand-500)', flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Chaque fonctionnalité activée ajoute automatiquement les permissions Android/iOS nécessaires
                    dans le manifest, ainsi que le code natif correspondant. Aucune configuration manuelle requise.
                </p>
            </div>
        </div>
    )
}
