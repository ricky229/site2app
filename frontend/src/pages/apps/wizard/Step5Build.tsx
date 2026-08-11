import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Smartphone, Apple, CheckCircle, Download, Share2,
    AlertCircle, Loader2, Clock, QrCode, ExternalLink,
    BookOpen, Star, Monitor
} from 'lucide-react'
import { useWizardStore } from '../../../store/wizardStore'
import { useAuthStore } from '../../../store/authStore'
import Button from '../../../components/ui/Button'
import { platformLabel } from '../../../lib/utils'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import api, { startBuild, getBuildStatus, apiGetMe, getBuilds, startDesktopBuild, getDesktopBuildStatus } from '../../../lib/api'
import type { DesktopPlatform } from '../../../types'

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


/**
 * Compress an image (data URL or URL) to a small size via Canvas.
 * Returns a raw base64 string (no data: prefix) small enough
 * to fit in the GitHub Actions client_payload (max ~65KB total).
 * @param size - target width/height in pixels
 * @param format - 'image/png' or 'image/jpeg'
 * @param quality - JPEG quality (0-1), ignored for PNG
 */
const compressImageForPayload = (
    imageSource: string | undefined | null,
    size: number = 192,
    format: string = 'image/png',
    quality: number = 0.7
): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!imageSource) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                let width = img.width;
                let height = img.height;
                
                // Preserve aspect ratio
                if (width > height) {
                    if (width > size) {
                        height = Math.round(height * (size / width));
                        width = size;
                    }
                } else {
                    if (height > size) {
                        width = Math.round(width * (size / height));
                        height = size;
                    }
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);
                
                if (size === 192) {
                    // For icon, force square canvas with padding
                    canvas.width = size;
                    canvas.height = size;
                    const padding = Math.round(size * 0.1);
                    const scale = (size - padding * 2) / Math.max(width, height);
                    const drawW = Math.round(width * scale);
                    const drawH = Math.round(height * scale);
                    const offsetX = (size - drawW) / 2;
                    const offsetY = (size - drawH) / 2;
                    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
                } else {
                    // For splash screen, preserve exact aspect ratio without padding
                    ctx.drawImage(img, 0, 0, width, height);
                }
                
                const dataUrl = canvas.toDataURL(format, quality);
                const base64 = dataUrl.split(',')[1] || null;
                console.log(`[Build] Image compressed to ${width}x${height} ${format}: ${base64 ? base64.length : 0} chars`);
                resolve(base64);
            } catch (e) {
                console.warn('[Build] Failed to compress image:', e);
                resolve(null);
            }
        };
        img.onerror = () => {
            console.warn('[Build] Failed to load image for compression');
            resolve(null);
        };
        img.src = imageSource;
    });
}

export default function Step5Build() {
    const navigate = useNavigate()
    const { state, reset } = useWizardStore()
    const { user } = useAuthStore()
    const { config, platform: wizardPlatform, siteAnalysis } = state

    const [platform, setPlatform] = useState<'android' | 'ios' | 'both' | 'desktop'>(wizardPlatform as any || 'android')
    const [desktopSubPlatform, setDesktopSubPlatform] = useState<DesktopPlatform>('windows')
    const [phase, setPhase] = useState<BuildPhase>('select')
    const [stepStatuses, setStepStatuses] = useState<Record<string, BuildStepStatus>>({})
    const [currentStepIdx, setCurrentStepIdx] = useState(-1)
    const [totalProgress, setTotalProgress] = useState(0)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [buildId, setBuildId] = useState<string | null>(null)
    const [buildError, setBuildError] = useState<string | null>(null)
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
    const [desktopUrls, setDesktopUrls] = useState<{ windows?: string, macos?: string }>({})

    const { data: userProfile } = useQuery({
        queryKey: ['userProfile', user?.id],
        queryFn: () => user?.id ? apiGetMe() : null,
        enabled: !!user?.id
    })

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

        // Ensure we know if we are editing an existing app
        const isEdit = window.location.hash.includes('/apps/') && !window.location.hash.endsWith('/create')
        const existingAppId = isEdit ? window.location.hash.split('/').pop()?.split('?')[0] : null
        let appId: string | null = existingAppId || null

        try {
            const sanitizedNameForPackage = (config.name || 'app')
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '.')
                .replace(/\.+/g, '.')
                .replace(/^\.+|\.+$/g, '');
            const generatedPackageName = config.packageName || `com.site2app.${sanitizedNameForPackage}`;
            
            const compressedIconBase64 = await compressImageForPayload(config.icon, 192, 'image/png');
            
            // Preserve aspect ratio for splash screen. 800px max dimension ensures high quality while keeping size reasonable.
            const compressedSplashBase64 = await compressImageForPayload(config.splashScreen, 800, 'image/jpeg', 0.5);
            
            // If icon is already a URL (from a previous build), keep it
            const iconIsUrl = config.icon && (config.icon.startsWith('http') || config.icon.startsWith('//'));
            const splashIsUrl = config.splashScreen && (config.splashScreen.startsWith('http') || config.splashScreen.startsWith('//'));

            // Determine versionCode: CRITICAL for updates.
            // We search across ALL apps of the user to find the highest versionCode for this packageName
            let currentVersionCode = 1;
            try {
                if (user?.id) {
                    const userApps = await getBuilds(user.id);
                    const matchingApps = userApps.filter((a: any) => a.packageName === generatedPackageName);
                    const maxCode = matchingApps.reduce((max: number, a: any) => Math.max(max, parseInt(a.versionCode) || 0), 0);
                    
                    if (maxCode > 0) {
                        currentVersionCode = maxCode + 1;
                        console.log(`[Build] Found existing version ${maxCode} for package ${generatedPackageName}. Incrementing to ${currentVersionCode}`);
                    } else if (appId) {
                        // If it's an edit but no other apps found, use a safe high number to "jump" over potential ghost versions
                        currentVersionCode = 10; 
                    }
                }
            } catch (err) {
                console.warn('[Build] Failed to calculate global max version, using fallback');
                currentVersionCode = appId ? 20 : 1;
            }

            const appData: any = {
                appName: config.name || siteAnalysis?.title || 'MonApp',
                url: config.url || siteAnalysis?.url || 'https://example.com',
                platform: platform,
                packageName: generatedPackageName,
                statusBarColor: config.statusBar?.color || config.primaryColor || '#3461f5',
                themeColor: config.statusBar?.color || config.primaryColor || '#3461f5',
                splashBgColor: config.statusBar?.color || config.primaryColor || '#3461f5',
                primaryColor: config.primaryColor || '#3461f5',
                secondaryColor: config.secondaryColor || '#3461f5',
                orientation: config.orientation || 'portrait',
                enableFullscreen: config.features?.fullscreen || false,
                versionCode: currentVersionCode,
                versionName: `1.${currentVersionCode}`,
                icon: compressedIconBase64 || (iconIsUrl ? config.icon : null),
                splashImage: compressedSplashBase64 || (splashIsUrl ? config.splashScreen : null),
                features: config.features || {},
            }
            if (user?.id) appData.owner = user.id;

            let createRes: any
            if (appId) {
                // Update existing app - use startBuild to re-trigger
                createRes = await startBuild({ ...appData, buildId: appId })
                appId = createRes.buildId || appId
                setBuildId(appId)
                console.log('[Build] App rebuild triggered:', appId)
            } else {
                // Create new app
                createRes = await startBuild(appData)
                appId = createRes.buildId || createRes.id || createRes._id
                setBuildId(appId)
                console.log('[Build] App created:', appId)
            }

            // Check if the Cloud Function reported an immediate failure
            if (createRes.status === 'failed') {
                setPhase('error')
                setBuildError(createRes.error || 'Le serveur n\'a pas pu lancer la compilation.')
                toast.error('Échec du lancement de la compilation')
                return
            }

            // The Cloud Function has already triggered the GitHub Action.
            // No need to trigger it again from the frontend.
            console.log('[Build] GitHub Action triggered by Cloud Function. Polling for status...')

        } catch (error: any) {
            console.error('Build start error:', error)
            console.error('Error response data:', error?.response?.data)
            setPhase('error')
            const detailedError = error?.response?.data ? JSON.stringify(error.response.data) : error?.message
            setBuildError(detailedError || "Impossible de démarrer la compilation.")
            return
        }

        // Step 3: Poll for build status
        let isDone = false
        const startTime = Date.now()

        while (!isDone) {
            try {
                const appStatus = await getBuildStatus(appId!)

                if (appStatus?.status === 'completed') {
                    isDone = true
                    setTotalProgress(100)
                    setStepStatuses(s => {
                        const next = { ...s }
                        BUILD_STEPS.forEach(step => next[step.id] = 'done')
                        return next
                    })
                    if (appStatus.downloadUrl || appStatus.apkFile) {
                        setDownloadUrl(appStatus.downloadUrl || appStatus.apkFile)
                    }
                } else if (appStatus?.status === 'failed') {
                    setPhase('error')
                    setBuildError(appStatus.error || appStatus.errorMessage || 'Erreur inconnue')
                    toast.error('Échec de la compilation')
                    return
                } else {
                    const now = Date.now()
                    const totalEstimated = 300000 // 5 minutes
                    const currentProgress = Math.min(95, Math.round(((now - startTime) / totalEstimated) * 100))
                    setTotalProgress(currentProgress)

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

            if (!isDone) await new Promise(r => setTimeout(r, 5000))
        }

        setPhase('done')
        toast.success('🎉 Votre application est prête !')
    }

    const runDesktopBuild = async () => {
        setPhase('building')
        setCurrentStepIdx(0)
        setStepStatuses({})
        setElapsedTime(0)
        setTotalProgress(0)
        setBuildError(null)

        const isEdit = window.location.hash.includes('/apps/') && !window.location.hash.endsWith('/create')
        const existingAppId = isEdit ? window.location.hash.split('/').pop()?.split('?')[0] : null
        let appId: string | null = existingAppId || null

        try {
            const compressedIconBase64 = await compressImageForPayload(config.icon, 192, 'image/png');
            const iconIsUrl = config.icon && (config.icon.startsWith('http') || config.icon.startsWith('//'));
            
            const appName = config.name || siteAnalysis?.title || 'MonApp'
            const appData = {
                name: appName,
                appName: appName,
                url: config.url || siteAnalysis?.url || 'https://example.com',
                platforms: desktopSubPlatform === 'both' ? ['windows', 'macos'] : [desktopSubPlatform],
                icon: compressedIconBase64 || (iconIsUrl ? config.icon : null)
            }

            let createRes;
            if (appId) {
                createRes = await startDesktopBuild({ ...appData, buildId: appId })
                console.log('[Desktop Build] App rebuild triggered:', appId)
            } else {
                createRes = await startDesktopBuild(appData)
                console.log('[Desktop Build] App created:', createRes.id || createRes.buildId)
            }
            const currentBuildId = createRes.id || createRes.buildId
            setBuildId(currentBuildId)

            let isDone = false
            const startTime = Date.now()

            while (!isDone) {
                try {
                    const statusRes = await getDesktopBuildStatus(currentBuildId)
                    
                    if (statusRes.status === 'completed' || statusRes.status === 'success') {
                        isDone = true
                        setTotalProgress(100)
                        setStepStatuses(s => {
                            const next = { ...s }
                            BUILD_STEPS.forEach(step => next[step.id] = 'done')
                            return next
                        })
                        
                        setDesktopUrls({
                            windows: statusRes.downloads?.windows || statusRes.windows?.downloadUrl,
                            macos: statusRes.downloads?.macos || statusRes.macos?.downloadUrl
                        })
                    } else if (statusRes.status === 'failed') {
                        setPhase('error')
                        setBuildError(statusRes.error || 'Erreur inconnue')
                        toast.error('Échec de la compilation')
                        return
                    } else {
                        const now = Date.now()
                        const totalEstimated = 300000 // 5 minutes
                        const currentProgress = Math.min(95, Math.round(((now - startTime) / totalEstimated) * 100))
                        setTotalProgress(currentProgress)

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

                if (!isDone) await new Promise(r => setTimeout(r, 5000))
            }

            setPhase('done')
            toast.success('🎉 Votre application bureau est prête !')
            
        } catch (error: any) {
            console.error('Build start error:', error)
            setPhase('error')
            setBuildError(error?.message || "Impossible de démarrer la compilation.")
            return
        }
    }

    const handleStartBuild = () => {
        if (platform === 'desktop') {
            runDesktopBuild()
        } else {
            runBuild()
        }
    }

    const handleDownload = () => {
        if (!downloadUrl) {
            toast.error('Le fichier APK n\'est pas encore disponible.')
            return
        }
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `${config.name || 'app'}.apk`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success('Téléchargement lancé !')
    }

    const handleCopyLink = () => {
        if (!downloadUrl) return
        navigator.clipboard.writeText(downloadUrl)
        toast.success('Lien copié !')
    }

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

    return (
        <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6 pb-20">
            {phase !== 'done' && phase !== 'error' && (
                <div className="mb-8">
                    <div className="step-bubble mb-4">5</div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">Build & Téléchargement</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Choisissez la plateforme cible et lancez la génération de votre application.
                    </p>
                </div>
            )}

            <AnimatePresence mode="wait">
                {phase === 'select' && (
                    <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="card p-6 mb-5">
                            <h3 className="font-bold mb-5">Plateforme sélectionnée</h3>
                            {platform !== 'desktop' ? (
                                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
                                    <div className="flex items-center gap-3">
                                        <Smartphone size={24} className="text-brand-500" />
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)]">Application Mobile</p>
                                            <p className="text-sm text-[var(--text-muted)]">Android (APK)</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Monitor size={24} className="text-purple-500" />
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)]">Application Bureau</p>
                                            <p className="text-sm text-[var(--text-muted)]">Windows / macOS</p>
                                        </div>
                                    </div>
                                    <h4 className="font-semibold mb-3 text-sm">Système d'exploitation cible :</h4>
                                    <div className="flex gap-3">
                                        {[
                                            { id: 'windows', label: 'Windows', ext: '.exe' },
                                            { id: 'macos', label: 'macOS', ext: '.dmg' },
                                            { id: 'both', label: 'Les deux', ext: '.exe + .dmg' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setDesktopSubPlatform(opt.id as DesktopPlatform)}
                                                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${desktopSubPlatform === opt.id ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold' : 'border-[var(--border)] hover:border-purple-300 bg-[var(--surface-0)]'}`}
                                            >
                                                <div className="block">{opt.label}</div>
                                                <div className="text-[10px] font-normal text-[var(--text-muted)]">{opt.ext}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="card p-5 mb-6">
                            <h3 className="font-bold mb-4">Résumé avant build</h3>
                            <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                <div className="flex gap-2"><span className="w-24 text-muted">Application :</span><span className="font-semibold">{config.name || siteAnalysis?.title}</span></div>
                                <div className="flex gap-2"><span className="w-24 text-muted">URL :</span><span className="font-semibold truncate">{config.url || siteAnalysis?.url}</span></div>
                                <div className="flex gap-2"><span className="w-24 text-muted">Package :</span><span className="font-semibold">{config.packageName}</span></div>
                                <div className="flex gap-2"><span className="w-24 text-muted">Plateforme :</span><span className="font-semibold">{platform === 'desktop' ? `Desktop (${desktopSubPlatform})` : platformLabel(platform)}</span></div>
                            </div>
                        </div>

                        <div className="text-center">
                            <Button onClick={handleStartBuild} size="xl" icon={platform === 'desktop' ? <Monitor size={20} /> : <Smartphone size={20} />} className="mx-auto">
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
                                        <p className="text-sm text-secondary">{platform === 'desktop' ? 'Desktop' : platformLabel(platform)} — {config.name}</p>
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
                        <h2 className="text-2xl md:text-3xl font-bold mb-2">🎉 Application prête !</h2>
                        <p className="mb-8 text-secondary">Votre application a été générée avec succès.</p>

                        <div className="max-w-md mx-auto card p-6 mb-8">
                            {platform === 'desktop' ? (
                                <Monitor size={32} className="mx-auto mb-4 text-purple-500" />
                            ) : (
                                <Smartphone size={32} className="mx-auto mb-4 text-brand-500" />
                            )}
                            <h3 className="font-bold mb-6">{config.name}{platform === 'desktop' ? '' : '.apk'}</h3>
                            
                            {platform !== 'desktop' && (
                                <Button variant="primary" size="xl" className="w-full" icon={<Download size={20} />} onClick={handleDownload}>
                                    Télécharger l'APK
                                </Button>
                            )}

                            {platform === 'desktop' && (
                                <div className="space-y-3">
                                    {desktopUrls.windows && (
                                        <Button variant="primary" size="lg" className="w-full bg-blue-600 hover:bg-blue-700" icon={<Download size={18} />} onClick={() => {
                                            const a = document.createElement('a')
                                            a.href = desktopUrls.windows!
                                            a.download = `${config.name}.exe`
                                            document.body.appendChild(a)
                                            a.click()
                                            document.body.removeChild(a)
                                        }}>
                                            Télécharger .exe (Windows)
                                        </Button>
                                    )}
                                    {desktopUrls.macos && (
                                        <Button variant="primary" size="lg" className="w-full bg-gray-800 hover:bg-gray-900" icon={<Download size={18} />} onClick={() => {
                                            const a = document.createElement('a')
                                            a.href = desktopUrls.macos!
                                            a.download = `${config.name}.dmg`
                                            document.body.appendChild(a)
                                            a.click()
                                            document.body.removeChild(a)
                                        }}>
                                            Télécharger .dmg (macOS)
                                        </Button>
                                    )}
                                </div>
                            )}
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
