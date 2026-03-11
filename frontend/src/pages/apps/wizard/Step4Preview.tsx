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
        <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6">
            <div className="mb-8">
                <div className="step-bubble mb-4">4</div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2 break-words">Aperçu final</h2>
                <p className="text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
                    Voici à quoi ressemblera votre application sur le téléphone de vos utilisateurs.
                </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-8">
                {/* Device selector */}
                <div className="card p-1 flex gap-1">
                    {[
                        { id: 'android' as Device, label: 'Android', icon: '🤖' },
                        { id: 'iphone' as Device, label: 'iPhone', icon: '📱' },
                    ].map(d => (
                        <button
                            key={d.id}
                            onClick={() => setDevice(d.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                                background: device === d.id ? 'var(--brand-500)' : 'transparent',
                                color: device === d.id ? 'white' : 'var(--text-secondary)',
                            }}
                        >
                            <span>{d.icon}</span> {d.label}
                        </button>
                    ))}
                </div>

                {/* Orientation */}
                <div className="card p-1 flex gap-1">
                    {[
                        { id: 'portrait' as Orientation, icon: RotateCcw, label: 'Portrait' },
                        { id: 'landscape' as Orientation, icon: RotateCw, label: 'Paysage' },
                    ].map(o => (
                        <button
                            key={o.id}
                            onClick={() => setOrientation(o.id)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                                background: orientation === o.id ? 'var(--brand-500)' : 'transparent',
                                color: orientation === o.id ? 'white' : 'var(--text-secondary)',
                            }}
                        >
                            <o.icon size={14} /> {o.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Phone Mockup */}
                <div className="flex-1 flex justify-center">
                    <motion.div
                        animate={{ width: phoneW, height: phoneH }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        className="relative"
                        style={{
                            background: device === 'iphone' ? '#1a1a2e' : '#1a1a1a',
                            borderRadius: isPortrait ? '40px' : '24px',
                            padding: '12px',
                            boxShadow: '0 0 0 2px #333, 0 30px 60px rgba(0,0,0,0.4)',
                        }}
                    >
                        {/* Notch / Dynamic Island */}
                        {device === 'iphone' ? (
                            <div style={{
                                position: 'absolute',
                                top: '14px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '100px',
                                height: '28px',
                                background: '#1a1a2e',
                                borderRadius: '0 0 20px 20px',
                                zIndex: 10,
                            }} />
                        ) : (
                            <div style={{
                                position: 'absolute',
                                top: '16px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '12px',
                                height: '12px',
                                background: '#1a1a1a',
                                borderRadius: '50%',
                                zIndex: 10,
                            }} />
                        )}

                        {/* Screen */}
                        <div style={{
                            width: '100%',
                            height: '100%',
                            background: '#fff',
                            borderRadius: isPortrait ? '30px' : '14px',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            {/* Status Bar */}
                            <div style={{
                                height: device === 'iphone' ? '44px' : '28px',
                                background: primaryColor,
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'space-between',
                                padding: '0 16px 4px',
                                flexShrink: 0,
                            }}>
                                <span style={{ color: 'white', fontSize: '11px', fontWeight: 600 }}>9:41</span>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <Wifi size={10} color="white" />
                                    <div style={{ width: '16px', height: '8px', border: '1.5px solid white', borderRadius: '2px', display: 'flex', alignItems: 'center' }}>
                                        <div style={{ width: '70%', height: '100%', background: 'white', borderRadius: '1px' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Navbar */}
                            {config.navbar?.show && (
                                <div style={{
                                    height: '44px',
                                    background: config.navbar.color || 'white',
                                    borderBottom: '1px solid #f0f0f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 12px',
                                    flexShrink: 0,
                                }}>
                                    {config.navbar.showBack && (
                                        <span style={{ fontSize: '18px', color: primaryColor, marginRight: '8px', cursor: 'pointer' }}>‹</span>
                                    )}
                                    <div style={{ flex: 1, textAlign: 'center', fontSize: '14px', fontWeight: 600, color: primaryColor }}>
                                        {appName}
                                    </div>
                                    {config.navbar.showRefresh && (
                                        <RefreshCw size={14} color={primaryColor} />
                                    )}
                                </div>
                            )}

                            {/* WebView Simulation */}
                            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column',
                                    padding: '16px',
                                }}>
                                    {/* URL bar simulation */}
                                    <div style={{
                                        width: '100%',
                                        background: 'white',
                                        borderRadius: '8px',
                                        padding: '6px 10px',
                                        marginBottom: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                    }}>
                                        <Globe size={10} color="#94a3b8" />
                                        <span style={{ fontSize: '9px', color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {url}
                                        </span>
                                    </div>

                                    {/* Content simulation */}
                                    <div style={{ width: '100%', background: 'white', borderRadius: '12px', padding: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                        <div style={{ height: '8px', background: primaryColor, borderRadius: '4px', width: '70%', marginBottom: '8px' }} />
                                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '4px', width: '90%', marginBottom: '6px' }} />
                                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '4px', width: '75%', marginBottom: '12px' }} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} style={{
                                                    height: '36px', borderRadius: '8px',
                                                    background: i % 2 === 0 ? `${primaryColor}15` : '#f8fafc',
                                                    border: `1px solid ${i % 2 === 0 ? primaryColor + '25' : '#e2e8f0'}`
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Home indicator (iPhone) */}
                            {device === 'iphone' && (
                                <div style={{
                                    height: '20px',
                                    background: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <div style={{ width: '100px', height: '4px', background: '#1a1a2e', borderRadius: '2px', opacity: 0.3 }} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Config Summary */}
                <div className="lg:w-72 space-y-4">
                    <div className="card p-5">
                        <h3 className="font-bold mb-4">Récapitulatif</h3>
                        <div className="space-y-3 text-sm">
                            {[
                                { label: 'Nom', value: appName },
                                { label: 'URL', value: siteAnalysis?.url || config.url || '—' },
                                { label: 'Package', value: config.packageName || '—' },
                                { label: 'Thème', value: config.theme || 'auto' },
                                { label: 'Orientation', value: config.orientation || 'portrait' },
                            ].map(item => (
                                <div key={item.label} className="flex justify-between">
                                    <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                                    <span className="font-semibold truncate ml-2 max-w-36 text-right" style={{ fontSize: '0.8125rem' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Active features */}
                    <div className="card p-5">
                        <h3 className="font-bold mb-4">Fonctionnalités actives</h3>
                        <div className="space-y-2">
                            {Object.entries(config.features || {})
                                .filter(([, v]) => v)
                                .map(([key]) => {
                                    const labels: Record<string, string> = {
                                        pushNotifications: '🔔 Push Notifications',
                                        offlineMode: '📡 Mode hors-ligne',
                                        deepLinking: '🔗 Deep Linking',
                                        geolocation: '📍 Géolocalisation',
                                        camera: '📷 Caméra',
                                        nativeShare: '📤 Partage natif',
                                        biometrics: '🔐 Biométrie',
                                        fullscreen: '⛶ Plein écran',
                                        pullToRefresh: '↻ Pull-to-refresh',
                                        progressBar: '━ Barre de chargement',
                                        fileDownload: '⬇ Téléchargements',
                                        popupSupport: '💬 Popups',
                                        customCssJs: '💻 CSS/JS custom',
                                        admob: '💰 AdMob',
                                        analytics: '📊 Analytics',
                                        otaUpdates: '🔄 OTA Updates',
                                    }
                                    return (
                                        <div key={key} className="flex items-center gap-2 text-sm">
                                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#10b981' }} />
                                            {labels[key] || key}
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>

                    {/* Colors preview */}
                    <div className="card p-5">
                        <h3 className="font-bold mb-3">Couleurs</h3>
                        <div className="flex gap-3">
                            <div>
                                <div className="w-10 h-10 rounded-xl mb-1 border" style={{ background: config.primaryColor || '#3461f5', borderColor: 'var(--border)' }} />
                                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{config.primaryColor || '#3461f5'}</p>
                            </div>
                            <div>
                                <div className="w-10 h-10 rounded-xl mb-1 border" style={{ background: config.secondaryColor || '#7c3aed', borderColor: 'var(--border)' }} />
                                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{config.secondaryColor || '#7c3aed'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
