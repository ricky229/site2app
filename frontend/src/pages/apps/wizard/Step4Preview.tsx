import { useState } from 'react'
import { motion } from 'framer-motion'
import { Smartphone, Monitor, RotateCcw, RotateCw, Bell, Wifi, MapPin, RefreshCw, Globe } from 'lucide-react'
import { useWizardStore } from '../../../store/wizardStore'

type Device = 'android' | 'iphone'
type Orientation = 'portrait' | 'landscape'

export default function Step4Preview() {
    const { state } = useWizardStore()
    const { config, siteAnalysis } = state
    const [device, setDevice] = useState<Device>('android')
    const [orientation, setOrientation] = useState<Orientation>('portrait')

    const url = config.url || siteAnalysis?.url || 'https://example.com'
    const appName = config.name || siteAnalysis?.title || 'Mon App'
    const primaryColor = config.primaryColor || '#3461f5'

    const isPortrait = orientation === 'portrait'
    const phoneW = isPortrait ? 320 : 580
    const phoneH = isPortrait ? 640 : 340

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center font-black text-xl mb-6 shadow-sm border border-blue-500/20">4</div>
                <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight text-[var(--text-primary)]">Résumé & Confirmation</h2>
                <p className="text-lg text-[var(--text-muted)] font-medium">
                    Vérifiez la configuration de votre application avant de lancer la génération.
                </p>
            </div>

            <div className="space-y-6">
                {/* Config Summary */}
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Monitor size={16} />
                        </div>
                        Informations générales
                    </h3>
                    <div className="space-y-3 p-4 bg-[var(--surface-0)] rounded-2xl border border-[var(--border)] text-sm">
                        {[
                            { label: 'Nom', value: appName },
                            { label: 'URL', value: siteAnalysis?.url || config.url || '—' },
                            { label: 'Package', value: config.packageName || '—' },
                            { label: 'Thème', value: config.theme || 'auto' },
                            { label: 'Orientation', value: config.orientation || 'portrait' },
                        ].map(item => (
                            <div key={item.label} className="flex justify-between items-center py-2 border-b border-[var(--border)] last:border-0 last:pb-0">
                                <span className="font-medium text-[var(--text-secondary)]">{item.label}</span>
                                <span className="font-bold text-[var(--text-primary)] truncate ml-4 max-w-[200px] text-right">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Colors preview */}
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <Smartphone size={16} />
                        </div>
                        Identité Visuelle
                    </h3>
                    <div className="flex flex-wrap gap-6 p-4 bg-[var(--surface-0)] rounded-2xl border border-[var(--border)]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl shadow-sm border border-[var(--border)]" style={{ background: config.primaryColor || '#3461f5' }} />
                            <div>
                                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Principale</p>
                                <p className="text-sm font-bold font-mono text-[var(--text-primary)]">{config.primaryColor || '#3461f5'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl shadow-sm border border-[var(--border)]" style={{ background: config.secondaryColor || '#7c3aed' }} />
                            <div>
                                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Secondaire</p>
                                <p className="text-sm font-bold font-mono text-[var(--text-primary)]">{config.secondaryColor || '#7c3aed'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active features */}
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <RefreshCw size={16} />
                        </div>
                        Fonctionnalités natives actives ({Object.values(config.features || {}).filter(Boolean).length})
                    </h3>
                    <div className="flex flex-wrap gap-2 p-4 bg-[var(--surface-0)] rounded-2xl border border-[var(--border)]">
                        {Object.entries(config.features || {})
                            .filter(([, v]) => v)
                            .map(([key]) => {
                                const labels: Record<string, string> = {
                                    pushNotifications: 'Push Notifications',
                                    offlineMode: 'Mode hors-ligne',
                                    deepLinking: 'Deep Linking',
                                    geolocation: 'Géolocalisation',
                                    camera: 'Caméra',
                                    nativeShare: 'Partage natif',
                                    biometrics: 'Biométrie',
                                    fullscreen: 'Plein écran',
                                    pullToRefresh: 'Pull-to-refresh',
                                    progressBar: 'Barre de chargement',
                                    fileDownload: 'Téléchargements',
                                    popupSupport: 'Popups',
                                    customCssJs: 'CSS/JS custom',
                                    admob: 'AdMob',
                                    analytics: 'Analytics',
                                    otaUpdates: 'OTA Updates',
                                }
                                return (
                                    <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                        {labels[key] || key}
                                    </div>
                                )
                            })
                        }
                        {Object.values(config.features || {}).filter(Boolean).length === 0 && (
                            <span className="text-sm text-[var(--text-muted)] italic">Aucune fonctionnalité avancée activée. L'application restera simple et légère.</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
