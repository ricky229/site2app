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
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center font-black text-xl mb-6 shadow-sm border border-blue-500/20">2</div>
                <h2 className="text-2xl md:text-3xl font-black mb-3 tracking-tight text-[var(--text-primary)]">Personnalisation</h2>
                <p className="text-base md:text-lg text-[var(--text-muted)] font-medium">
                    Ajustez le design, les couleurs et les paramètres de votre app.
                </p>
            </div>

            <div className="space-y-6">
                {/* App Identity */}
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm">
                    <h3 className="font-bold mb-5 flex items-center gap-2 text-[var(--text-primary)]">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Smartphone size={16} />
                        </div>
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
                            hint="Identifiant unique"
                        />
                    </div>
                </div>

                {/* Icon & Splash */}
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm">
                    <h3 className="font-bold mb-5 flex items-center gap-2 text-[var(--text-primary)]">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <Image size={16} />
                        </div>
                        Icône & Splash Screen
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-8">
                        {/* Icon */}
                        <div>
                            <label className="text-sm font-semibold mb-3 block text-[var(--text-primary)]">
                                Icône de l'application
                            </label>
                            <div className="flex flex-col xl:flex-row items-center xl:items-start gap-4">
                                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--border)] bg-[var(--surface-2)] shrink-0 flex items-center justify-center shadow-inner">
                                    {iconPreview ? (
                                        <img src={iconPreview} alt="Icône" className="w-full h-full object-cover" />
                                    ) : (
                                        <Image size={24} className="text-[var(--text-muted)]" />
                                    )}
                                </div>

                                <div className="flex-1 w-full">
                                    <div
                                        {...getRootProps()}
                                        className={`dropzone ${isDragActive ? 'active' : ''} p-3 text-center border-dashed border-2 rounded-xl bg-[var(--surface-0)] cursor-pointer hover:border-blue-500/50 transition-colors`}
                                    >
                                        <input {...getInputProps()} />
                                        <Upload size={18} className="mx-auto mb-1 text-[var(--text-muted)]" />
                                        <p className="text-xs text-[var(--text-secondary)] font-medium">
                                            PNG/JPG 512×512<br />
                                            {isDragActive ? 'Déposez ici' : 'Cliquez ou glissez'}
                                        </p>
                                    </div>
                                    {siteAnalysis?.favicon && (
                                        <button
                                            className="mt-2 text-xs text-blue-500 font-semibold hover:underline w-full text-center"
                                            onClick={async () => {
                                                try {
                                                    const faviconUrl = siteAnalysis.favicon!
                                                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(faviconUrl)}`
                                                    const res = await fetch(proxyUrl)
                                                    const blob = await res.blob()
                                                    const reader = new FileReader()
                                                    reader.onloadend = () => {
                                                        const base64 = reader.result as string
                                                        if (base64 && base64.startsWith('data:')) {
                                                            setIconPreview(base64)
                                                            updateConfig({ icon: base64 })
                                                        } else {
                                                            setIconPreview(faviconUrl)
                                                            updateConfig({ icon: faviconUrl })
                                                        }
                                                    }
                                                    reader.readAsDataURL(blob)
                                                } catch (e) {
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
                            <label className="text-sm font-semibold mb-3 block text-[var(--text-primary)]">
                                Image de démarrage (Optionnelle)
                            </label>
                            <div
                                {...getSplashRootProps()}
                                className={`dropzone text-center p-4 border-dashed border-2 rounded-xl bg-[var(--surface-0)] cursor-pointer hover:border-blue-500/50 transition-colors ${isSplashDragActive ? 'active' : ''}`}
                            >
                                <input {...getSplashInputProps()} />
                                {splashPreview ? (
                                    <div className="relative">
                                        <img src={splashPreview} alt="Splash" className="w-full h-24 object-contain rounded-lg mb-2" />
                                        <p className="text-xs text-[var(--text-muted)]">Cliquez pour changer</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={20} className="mx-auto mb-2 text-[var(--text-muted)]" />
                                        <p className="text-xs font-medium text-[var(--text-secondary)]">
                                            {isSplashDragActive ? 'Déposez ici' : 'Uploader une image (2048x2048)'}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Colors & Theme */}
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm">
                    <h3 className="font-bold mb-5 flex items-center gap-2 text-[var(--text-primary)]">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <Sun size={16} />
                        </div>
                        Couleurs & Thème
                    </h3>

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
                    <div className="mb-6 p-5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)]">
                        <p className="text-sm font-semibold mb-3 text-[var(--text-primary)]">
                            Barre d'état (Status Bar)
                        </p>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <ColorPicker
                                label="Couleur de fond"
                                value={config.statusBar?.color || config.primaryColor || '#3461f5'}
                                onChange={c => updateConfig({ statusBar: { ...config.statusBar!, color: c, style: config.statusBar?.style || 'light' } })}
                            />
                            <div>
                                <label className="text-xs font-semibold mb-2 block text-[var(--text-secondary)]">
                                    Style des icônes
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'light', label: 'Claires' },
                                        { value: 'dark', label: 'Sombres' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => updateConfig({ statusBar: { ...config.statusBar!, style: opt.value as 'light' | 'dark' } })}
                                            className="py-2 px-1 rounded-lg border text-xs font-bold transition-all text-center"
                                            style={{
                                                borderColor: config.statusBar?.style === opt.value ? 'var(--brand-500)' : 'var(--border)',
                                                background: config.statusBar?.style === opt.value ? 'rgba(52,97,245,0.08)' : 'transparent',
                                                color: config.statusBar?.style === opt.value ? 'var(--brand-500)' : 'var(--text-muted)'
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Theme */}
                    <div>
                        <label className="text-sm font-semibold mb-3 block text-[var(--text-primary)]">
                            Thème par défaut (Mode sombre)
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
                                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all bg-[var(--surface-0)]"
                                    style={{
                                        borderColor: config.theme === option.value ? 'var(--brand-500)' : 'transparent',
                                    }}
                                >
                                    <option.icon size={20} style={{ color: config.theme === option.value ? 'var(--brand-500)' : 'var(--text-secondary)' }} />
                                    <span className={`text-sm font-medium ${config.theme === option.value ? 'text-[var(--brand-500)]' : 'text-[var(--text-secondary)]'}`}>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Orientation & Navigation */}
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-6 shadow-sm">
                    <h3 className="font-bold mb-5 flex items-center gap-2 text-[var(--text-primary)]">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <RotateCcw size={16} />
                        </div>
                        Orientation & Navigation
                    </h3>

                    <div className="mb-6">
                        <label className="text-sm font-semibold mb-3 block text-[var(--text-primary)]">
                            Orientation de l'écran
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: 'portrait', label: 'Portrait', icon: RotateCcw },
                                { value: 'landscape', label: 'Paysage', icon: RotateCw },
                                { value: 'both', label: 'Libre', icon: Smartphone },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => updateConfig({ orientation: opt.value as any })}
                                    className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all bg-[var(--surface-0)]"
                                    style={{
                                        borderColor: config.orientation === opt.value ? 'var(--brand-500)' : 'transparent',
                                    }}
                                >
                                    <opt.icon size={20} style={{ color: config.orientation === opt.value ? 'var(--brand-500)' : 'var(--text-secondary)' }} />
                                    <span className={`text-sm font-medium ${config.orientation === opt.value ? 'text-[var(--brand-500)]' : 'text-[var(--text-secondary)]'}`}>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Navbar Config */}
                    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5">
                        <p className="text-sm font-semibold mb-4 text-[var(--text-primary)]">Barre de navigation native (Optionnelle)</p>
                        <div className="space-y-4">
                            <Toggle
                                label="Afficher la barre de navigation"
                                checked={config.navbar?.show ?? true}
                                onChange={v => updateConfig({ navbar: { ...config.navbar!, show: v } })}
                            />
                            {config.navbar?.show && (
                                <div className="pl-4 pt-4 border-t border-[var(--border)] space-y-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
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
                                    </div>
                                    <div className="pt-2">
                                        <ColorPicker
                                            label="Couleur de la navbar"
                                            value={config.navbar?.color || '#ffffff'}
                                            onChange={c => updateConfig({ navbar: { ...config.navbar!, color: c } })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
