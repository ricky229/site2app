import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    Bell, Wifi, MapPin, Camera, Share2, Fingerprint, Maximize2,
    RefreshCw, BarChart2, Download, MessageSquare, Code2,
    DollarSign, BarChart, Zap, Info
} from 'lucide-react'
import { useWizardStore } from '../../../store/wizardStore'
import { useAuthStore } from '../../../store/authStore'
import { Toggle } from '../../../components/ui/FormControls'
import type { AppFeatures } from '../../../types'

interface FeatureItem {
    key: keyof AppFeatures
    icon: typeof Bell
    label: string
    description: string
    color: string
    plan?: 'premium'
    badge?: string
}

const featureGroups: { title: string; features: FeatureItem[] }[] = [
    {
        title: 'Fonctionnalités essentielles',
        features: [
            { key: 'pushNotifications', icon: Bell, label: 'Notifications Push', description: 'Envoyez des notifications ciblées via Firebase FCM.', color: '#f59e0b', plan: 'premium' },
            { key: 'offlineMode', icon: Wifi, label: 'Mode hors-ligne', description: 'L\'app fonctionne sans connexion grâce au cache intelligent.', color: '#10b981', plan: 'premium' },
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
            { key: 'biometrics', icon: Fingerprint, label: 'Biométrie', description: 'Verrouillage de l\'app avec Face ID ou empreinte digitale.', color: '#ef4444', plan: 'premium' },
        ]
    },
    {
        title: 'Expérience utilisateur',
        features: [
            { key: 'fullscreen', icon: Maximize2, label: 'Mode plein écran', description: 'Mode immersif — cachez les barres systèmes pour plus d\'espace.', color: '#f97316' },
            { key: 'fileDownload', icon: Download, label: 'Téléchargements', description: 'Gestion native des téléchargements de fichiers depuis votre site.', color: '#84cc16' },
            { key: 'popupSupport', icon: MessageSquare, label: 'Support des popups', description: 'Gestion des popups et fenêtres secondaires de votre site.', color: '#a855f7' },
            { key: 'deepLinking', icon: Zap, label: 'Deep Linking', description: 'Ouvrez des pages spécifiques depuis des liens externes.', color: '#14b8a6' },
        ]
    },
    {
        title: 'Avancé',
        features: [
            { key: 'customCssJs', icon: Code2, label: 'CSS/JS personnalisé', description: 'Injectez du code CSS/JS pour personnaliser l\'apparence.', color: '#6366f1', plan: 'premium' },
            { key: 'analytics', icon: BarChart2, label: 'Analytics intégré', description: 'Tableau de bord avec pages vues, sessions, rétention.', color: '#3461f5', plan: 'premium' },
            { key: 'otaUpdates', icon: RefreshCw, label: 'OTA Updates', description: 'Mettez à jour votre app sans passer par le store.', color: '#10b981', plan: 'premium' },
            { key: 'admob', icon: DollarSign, label: 'AdMob (monétisation)', description: 'Intégrez des bannières et interstitiels Google AdMob.', color: '#f59e0b', plan: 'premium' },
        ]
    },
]

export default function Step3Features() {
    const { state, updateConfig } = useWizardStore()
    const { user } = useAuthStore()
    const features = state.config.features || {} as AppFeatures
    const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)

    const toggleFeature = (key: keyof AppFeatures, value: boolean) => {
        updateConfig({
            features: { ...features, [key]: value }
        })
    }

    const enabledCount = Object.values(features).filter(Boolean).length

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center font-black text-xl mb-6 shadow-sm border border-blue-500/20">3</div>
                <div className="flex items-end justify-between">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight text-[var(--text-primary)]">Fonctionnalités & Add-ons</h2>
                        <p className="text-lg text-[var(--text-muted)] font-medium">
                            Activez les fonctionnalités natives pour votre application.
                        </p>
                    </div>
                    <div className="text-right pb-1">
                        <div className="text-3xl font-black text-blue-500">{enabledCount}</div>
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">activées</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {featureGroups.map(group => (
                    <div key={group.title} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-lg text-[var(--text-primary)]">
                            {group.title}
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {group.features.map(feature => {
                                const isPremium = feature.plan === 'premium'
                                const isLocked = isPremium && (!user || user.plan === 'free')
                                const isChecked = !!features[feature.key] && !isLocked

                                return (
                                    <motion.div
                                        key={feature.key}
                                        whileHover={isLocked ? {} : { scale: 1.02 }}
                                        onMouseEnter={() => setHoveredFeature(feature.key)}
                                        onMouseLeave={() => setHoveredFeature(null)}
                                        className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                                        style={{
                                            borderColor: isChecked ? feature.color : 'var(--border)',
                                            background: isChecked ? `${feature.color}10` : 'var(--surface-0)',
                                        }}
                                        onClick={() => {
                                            if (isLocked) {
                                                alert("Cette fonctionnalité requiert un forfait Premium (Annuel ou À vie).")
                                                return
                                            }
                                            toggleFeature(feature.key, !features[feature.key])
                                        }}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all"
                                            style={{
                                                background: isChecked ? feature.color : 'var(--surface-2)',
                                                color: isChecked ? '#fff' : 'var(--text-muted)',
                                            }}
                                        >
                                            <feature.icon size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-sm text-[var(--text-primary)]">{feature.label}</span>
                                                <div onClick={e => e.stopPropagation()}>
                                                    <Toggle
                                                        checked={isChecked}
                                                        onChange={v => {
                                                            if (!isLocked) toggleFeature(feature.key, v)
                                                        }}
                                                        size="sm"
                                                        disabled={isLocked}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                {feature.badge && (
                                                    <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        {feature.badge}
                                                    </span>
                                                )}
                                                {isPremium && (
                                                    <span className="bg-amber-500/10 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full">PREMIUM</span>
                                                )}
                                            </div>

                                            <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
                                                {feature.description}
                                            </p>
                                            {isLocked && <span className="block mt-1 text-[10px] font-bold text-amber-500 uppercase tracking-wider">Premium requis</span>}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* AdMob Configuration Panel */}
            {state.config.features?.admob && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 overflow-hidden"
                >
                    <div className="bg-[var(--surface-1)] border-2 border-amber-500/30 rounded-[2rem] p-6 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-amber-600 dark:text-amber-500">
                            <DollarSign size={20} /> Configuration AdMob (Monétisation)
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">App ID AdMob (Obligatoire)</label>
                                <input
                                    type="text"
                                    className="w-full bg-[var(--surface-0)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                                    placeholder="ca-app-pub-xxxxxxxxxxxxxxxx~xxxxxxxxxx"
                                    value={state.config.admobAppId || ''}
                                    onChange={e => updateConfig({ admobAppId: e.target.value })}
                                />
                                <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Nécessaire pour le fonctionnement de l'application Android.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">ID Annonce Bannière</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[var(--surface-0)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                                        placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"
                                        value={state.config.admobBannerId || ''}
                                        onChange={e => updateConfig({ admobBannerId: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">ID Annonce Interstitiel</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[var(--surface-0)] border-2 border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none"
                                        placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx"
                                        value={state.config.admobInterstitialId || ''}
                                        onChange={e => updateConfig({ admobInterstitialId: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Info banner */}
            <div className="mt-8 p-5 rounded-2xl flex items-start gap-4 bg-blue-500/5 border border-blue-500/20">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Info size={18} />
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
                    Chaque fonctionnalité activée ajoute automatiquement les permissions Android/iOS nécessaires
                    dans le manifest, ainsi que le code natif correspondant. <strong className="text-[var(--text-primary)]">Aucune configuration manuelle requise.</strong>
                </p>
            </div>
        </div>
    )
}
