import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Upload, Image, Smartphone, Sun, Moon, Monitor, RotateCcw, RotateCw } from 'lucide-react'
import { useWizardStore } from '../../../store/wizardStore'
import { generatePackageName } from '../../../lib/utils'
import Input from '../../../components/ui/Input'
import { Select, ColorPicker } from '../../../components/ui/FormControls'
import { Toggle } from '../../../components/ui/FormControls'

export default function Step2Customization() {
    const { state, updateConfig } = useWizardStore()
    const { config, siteAnalysis } = state
    const [iconPreview, setIconPreview] = useState<string | null>(config.icon as string || siteAnalysis?.favicon || null)

    const onDropIcon = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = () => {
                const base64 = reader.result as string
                setIconPreview(base64)
                updateConfig({ icon: base64 })
            }
            reader.readAsDataURL(file)
        }
    }, [updateConfig])

    const [splashPreview, setSplashPreview] = useState<string | null>(config.splashScreen as string || null)

    const onDropSplash = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = () => {
                const base64 = reader.result as string
                setSplashPreview(base64)
                updateConfig({ splashScreen: base64 })
            }
            reader.readAsDataURL(file)
        }
    }, [updateConfig])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: onDropIcon,
        accept: { 'image/*': [] },
        maxSize: 5 * 1024 * 1024,
        multiple: false,
    })

    const { getRootProps: getSplashRootProps, getInputProps: getSplashInputProps, isDragActive: isSplashDragActive } = useDropzone({
        onDrop: onDropSplash,
        accept: { 'image/*': [] },
        maxSize: 10 * 1024 * 1024,
        multiple: false,
    })

    const handleNameChange = (name: string) => {
        updateConfig({
            name,
            packageName: generatePackageName(name),
        })
    }

    return (
        <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6">
            <div className="mb-8">
                <div className="step-bubble mb-4">2</div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2 break-words">Personnalisez votre application</h2>
                <p className="text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
                    Ajustez le design, les couleurs et les paramètres de votre app.
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Config */}
                <div className="lg:col-span-2 space-y-5">
                    {/* App Identity */}
                    <div className="card p-4 md:p-6">
                        <h3 className="font-bold mb-5 flex items-center gap-2">
                            <Smartphone size={18} style={{ color: 'var(--brand-500)' }} />
                            Identité de l'application
                        </h3>

                        <div className="grid sm:grid-cols-2 gap-5">
                            <Input
                                label="Nom de l'application"
                                value={config.name || ''}
                                onChange={e => handleNameChange(e.target.value)}
                                placeholder="Mon Application"
                                required
                            />
                            <Input
                                label="Package name"
                                value={config.packageName || ''}
                                onChange={e => updateConfig({ packageName: e.target.value })}
                                placeholder="com.example.monapp"
                                hint="Identifiant unique Android/iOS"
                            />
                        </div>
                    </div>

                    {/* Icon & Splash */}
                    <div className="card p-4 md:p-6">
                        <h3 className="font-bold mb-5 flex items-center gap-2">
                            <Image size={18} style={{ color: 'var(--brand-500)' }} />
                            Icône & Splash Screen
                        </h3>

                        <div className="grid sm:grid-cols-2 gap-6">
                            {/* Icon */}
                            <div>
                                <label className="text-sm font-semibold mb-3 block" style={{ color: 'var(--text-primary)' }}>
                                    Icône de l'application
                                </label>
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                    {/* Preview */}
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0"
                                        style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
                                        {iconPreview ? (
                                            <img src={iconPreview} alt="Icône" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Image size={24} style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 w-full">
                                        <div
                                            {...getRootProps()}
                                            className={`dropzone ${isDragActive ? 'active' : ''} p-3 text-center`}
                                            style={{ minHeight: 'auto' }}
                                        >
                                            <input {...getInputProps()} />
                                            <Upload size={18} className="mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                PNG/JPG 512×512<br />
                                                {isDragActive ? 'Déposez ici !' : 'ou glissez'}
                                            </p>
                                        </div>

                                        {siteAnalysis?.favicon && (
                                            <button
                                                className="mt-2 text-xs btn btn-ghost btn-sm w-full"
                                                onClick={async () => {
                                                    try {
                                                        // Use CORS proxy to fetch the favicon as blob
                                                        const faviconUrl = siteAnalysis.favicon!
                                                        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(faviconUrl)}`
                                                        const res = await fetch(proxyUrl)
                                                        const blob = await res.blob()
                                                        
                                                        // Convert blob to base64 data URL
                                                        const reader = new FileReader()
                                                        reader.onloadend = () => {
                                                            const base64 = reader.result as string
                                                            if (base64 && base64.startsWith('data:')) {
                                                                setIconPreview(base64)
                                                                updateConfig({ icon: base64 })
                                                            } else {
                                                                // Fallback: use URL directly
                                                                setIconPreview(faviconUrl)
                                                                updateConfig({ icon: faviconUrl })
                                                            }
                                                        }
                                                        reader.readAsDataURL(blob)
                                                    } catch (e) {
                                                        console.warn('Failed to convert favicon to base64:', e)
                                                        // Fallback: use URL directly
                                                        setIconPreview(siteAnalysis.favicon!)
                                                        updateConfig({ icon: siteAnalysis.favicon })
                                                    }
                                                }}
                                            >
                                                Utiliser la favicon détectée
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Splash */}
                            <div>
                                <label className="text-sm font-semibold mb-3 block" style={{ color: 'var(--text-primary)' }}>
                                    Splash Screen
                                </label>
                                <div
                                    {...getSplashRootProps()}
                                    className={`dropzone text-center p-4 ${isSplashDragActive ? 'active' : ''}`}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <input {...getSplashInputProps()} />
                                    {splashPreview ? (
                                        <div className="relative">
                                            <img src={splashPreview} alt="Splash" className="w-full h-32 object-contain rounded-lg mb-2" />
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cliquez pour changer</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload size={22} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                                            <p className="text-xs font-medium">
                                                {isSplashDragActive ? 'Déposez ici !' : 'Uploader une image'}
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                Ou généré automatiquement
                                            </p>
                                        </>
                                    )}
                                </div>
                                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                    Format recommandé : 2048×2048px
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Colors & Theme */}
                    <div className="card p-4 md:p-6">
                        <h3 className="font-bold mb-5">Couleurs & Thème</h3>

                        <div className="grid sm:grid-cols-2 gap-6 mb-6">
                            <ColorPicker
                                label="Couleur principale"
                                value={config.primaryColor || '#3461f5'}
                                onChange={c => updateConfig({ primaryColor: c })}
                                presets={siteAnalysis?.colors || []}
                            />
                            <ColorPicker
                                label="Couleur secondaire"
                                value={config.secondaryColor || '#7c3aed'}
                                onChange={c => updateConfig({ secondaryColor: c })}
                                presets={siteAnalysis?.colors || []}
                            />
                        </div>

                        {/* Status Bar Color */}
                        <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                                Barre d'état du téléphone
                            </p>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <ColorPicker
                                    label="Couleur de la status bar"
                                    value={config.statusBar?.color || config.primaryColor || '#3461f5'}
                                    onChange={c => updateConfig({ statusBar: { ...config.statusBar!, color: c, style: config.statusBar?.style || 'light' } })}
                                />
                                <div>
                                    <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                                        Style des icônes
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: 'light', label: '☀ Icônes claires' },
                                            { value: 'dark', label: '🌙 Icônes sombres' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => updateConfig({ statusBar: { ...config.statusBar!, style: opt.value as 'light' | 'dark' } })}
                                                className="p-2 rounded-lg border text-xs font-medium transition-all text-center"
                                                style={{
                                                    borderColor: config.statusBar?.style === opt.value ? 'var(--brand-500)' : 'var(--border)',
                                                    background: config.statusBar?.style === opt.value ? 'rgba(52,97,245,0.08)' : 'transparent',
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                        Choisissez selon la luminosité de la barre
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Theme */}
                        <div>
                            <label className="text-sm font-semibold mb-3 block" style={{ color: 'var(--text-primary)' }}>
                                Thème de l'application
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'light', label: 'Clair', icon: Sun },
                                    { value: 'dark', label: 'Sombre', icon: Moon },
                                    { value: 'auto', label: 'Auto', icon: Monitor },
                                ].map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => updateConfig({ theme: option.value as any })}
                                        className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all"
                                        style={{
                                            borderColor: config.theme === option.value ? 'var(--brand-500)' : 'var(--border)',
                                            background: config.theme === option.value ? 'rgba(52,97,245,0.08)' : 'var(--surface-1)',
                                        }}
                                    >
                                        <option.icon size={20} style={{ color: config.theme === option.value ? 'var(--brand-500)' : 'var(--text-secondary)' }} />
                                        <span className="text-sm font-medium">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Orientation & Navigation */}
                    <div className="card p-6">
                        <h3 className="font-bold mb-5">Orientation & Navigation</h3>

                        <div className="mb-5">
                            <label className="text-sm font-semibold mb-3 block" style={{ color: 'var(--text-primary)' }}>
                                Orientation de l'écran
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'portrait', label: 'Portrait', icon: RotateCcw },
                                    { value: 'landscape', label: 'Paysage', icon: RotateCw },
                                    { value: 'both', label: 'Les deux', icon: Smartphone },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => updateConfig({ orientation: opt.value as any })}
                                        className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all"
                                        style={{
                                            borderColor: config.orientation === opt.value ? 'var(--brand-500)' : 'var(--border)',
                                            background: config.orientation === opt.value ? 'rgba(52,97,245,0.08)' : 'var(--surface-1)',
                                        }}
                                    >
                                        <opt.icon size={20} style={{ color: config.orientation === opt.value ? 'var(--brand-500)' : 'var(--text-secondary)' }} />
                                        <span className="text-sm font-medium">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Navbar Config */}
                        <div>
                            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Barre de navigation</p>
                            <div className="space-y-3 p-4 rounded-xl" style={{ background: 'var(--surface-1)' }}>
                                <Toggle
                                    label="Afficher la barre de navigation"
                                    checked={config.navbar?.show ?? true}
                                    onChange={v => updateConfig({ navbar: { ...config.navbar!, show: v } })}
                                />
                                {config.navbar?.show && (
                                    <>
                                        <div className="divider" />
                                        <Toggle
                                            label="Bouton Retour"
                                            checked={config.navbar?.showBack ?? true}
                                            onChange={v => updateConfig({ navbar: { ...config.navbar!, showBack: v } })}
                                        />
                                        <Toggle
                                            label="Bouton Accueil"
                                            checked={config.navbar?.showHome ?? true}
                                            onChange={v => updateConfig({ navbar: { ...config.navbar!, showHome: v } })}
                                        />
                                        <Toggle
                                            label="Bouton Actualiser"
                                            checked={config.navbar?.showRefresh ?? true}
                                            onChange={v => updateConfig({ navbar: { ...config.navbar!, showRefresh: v } })}
                                        />
                                        <Toggle
                                            label="Bouton Partager"
                                            checked={config.navbar?.showShare ?? true}
                                            onChange={v => updateConfig({ navbar: { ...config.navbar!, showShare: v } })}
                                        />
                                        <div className="divider" />
                                        <ColorPicker
                                            label="Couleur de la navbar"
                                            value={config.navbar?.color || '#ffffff'}
                                            onChange={c => updateConfig({ navbar: { ...config.navbar!, color: c } })}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Live Preview */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24">
                        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
                            Aperçu en direct
                        </p>

                        {/* Mini phone mockup */}
                        <div className="flex justify-center">
                            <div className="phone-mockup" style={{ width: 200, height: 420, padding: '8px' }}>
                                <div className="phone-notch" style={{ top: '8px', width: '60px', height: '18px', borderRadius: '0 0 12px 12px' }} />
                                <div className="phone-screen overflow-hidden">
                                    {/* Status bar */}
                                    <div className="h-7 flex items-center justify-between px-4 text-xs text-white"
                                        style={{ background: config.primaryColor || '#3461f5' }}>
                                        <span>9:41</span>
                                        <span>●●●</span>
                                    </div>

                                    {/* Navbar */}
                                    {config.navbar?.show && (
                                        <div className="flex items-center px-3 h-9 border-b"
                                            style={{
                                                background: config.navbar.color || '#fff',
                                                borderColor: 'var(--border)',
                                            }}>
                                            <div className="flex gap-2">
                                                {config.navbar.showBack && (
                                                    <div className="w-5 h-5 rounded flex items-center justify-center text-xs"
                                                        style={{ background: 'var(--surface-2)' }}>←</div>
                                                )}
                                                {config.navbar.showHome && (
                                                    <div className="w-5 h-5 rounded flex items-center justify-center text-xs"
                                                        style={{ background: 'var(--surface-2)' }}>⌂</div>
                                                )}
                                            </div>
                                            <div className="flex-1 text-center text-xs font-semibold truncate px-2"
                                                style={{ color: config.primaryColor || '#3461f5' }}>
                                                {config.name || 'Mon App'}
                                            </div>
                                            {config.navbar.showRefresh && (
                                                <div className="w-5 h-5 rounded flex items-center justify-center text-xs"
                                                    style={{ background: 'var(--surface-2)' }}>↻</div>
                                            )}
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="flex-1 relative" style={{ background: config.theme === 'dark' ? '#111' : '#fff' }}>
                                        <div className="p-3">
                                            <div className="rounded-lg p-3 mb-2"
                                                style={{ background: config.primaryColor ? `${config.primaryColor}18` : 'rgba(52,97,245,0.1)' }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    {iconPreview && (
                                                        <img src={iconPreview} alt="icon" className="w-6 h-6 rounded" />
                                                    )}
                                                    <span className="text-xs font-bold" style={{ color: config.primaryColor || '#3461f5' }}>
                                                        {config.name || 'Mon App'}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 rounded-full mb-1" style={{ background: config.primaryColor || '#3461f5', width: '80%' }} />
                                                <div className="h-1.5 rounded-full" style={{ background: `${config.primaryColor || '#3461f5'}60`, width: '60%' }} />
                                            </div>

                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex gap-2 mb-2">
                                                    <div className="w-8 h-8 rounded-lg flex-shrink-0"
                                                        style={{ background: i % 2 === 0 ? config.secondaryColor || '#7c3aed' : config.primaryColor || '#3461f5', opacity: 0.15 + i * 0.1 }} />
                                                    <div className="flex-1 py-1">
                                                        <div className="h-1.5 rounded mb-1" style={{ background: 'var(--surface-3)', width: `${60 + i * 15}%` }} />
                                                        <div className="h-1 rounded" style={{ background: 'var(--surface-3)', width: `${40 + i * 10}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* App info summary */}
                        <div className="card p-4 mt-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--text-muted)' }}>Nom :</span>
                                    <span className="font-semibold truncate ml-2">{config.name || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--text-muted)' }}>Thème :</span>
                                    <span className="font-semibold capitalize">{config.theme || 'auto'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--text-muted)' }}>Orientation :</span>
                                    <span className="font-semibold capitalize">{config.orientation || 'portrait'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
