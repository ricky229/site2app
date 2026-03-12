import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useWizardStore } from '../../store/wizardStore'
import { getAppById } from '../../lib/api'

// Steps
import Step1Url from './wizard/Step1Url'
import Step2Customization from './wizard/Step2Customization'
import Step3Features from './wizard/Step3Features'
import Step4Preview from './wizard/Step4Preview'
import Step5Build from './wizard/Step5Build'
import Button from '../../components/ui/Button'

const steps = [
    { id: 1, label: 'URL & Analyse', short: 'URL' },
    { id: 2, label: 'Personnalisation', short: 'Design' },
    { id: 3, label: 'Fonctionnalités', short: 'Features' },
    { id: 4, label: 'Aperçu', short: 'Preview' },
    { id: 5, label: 'Build', short: 'Build' },
]

export default function CreateAppPage() {
    const navigate = useNavigate()
    const { id } = useParams()
    const { state, nextStep, prevStep, reset, setState } = useWizardStore()
    const { currentStep, siteAnalysis } = state
    const [isFetching, setIsFetching] = useState(!!id)

    useEffect(() => {
        if (!id) {
            reset()
            return
        }

        // Fetch app from Bubble Data API
        getAppById(id).then((data: any) => {
            if (data) {
                const safeFeatures = data.features || state.config.features || {}
                setState({
                    currentStep: 2, // Start at customization
                    platform: data.platform || 'android',
                    siteAnalysis: {
                        url: data.url || '',
                        title: data.appName || data.name || '',
                        description: '',
                        colors: [data.themeColor || '', data.splashBgColor || ''],
                        pages: [],
                        ssl: (data.url || '').startsWith('https'),
                        responsive: true,
                        performanceScore: 100,
                        loadTime: 1,
                    },
                    config: {
                        ...state.config,
                        name: data.appName || data.name || '',
                        url: data.url || '',
                        packageName: data.packageName || '',
                        primaryColor: data.themeColor || '#3461f5',
                        secondaryColor: data.splashBgColor || '#7c3aed',
                        orientation: data.orientation || 'portrait',
                        features: safeFeatures,
                        statusBar: {
                            color: data.themeColor || '#ffffff',
                            style: 'dark' as const,
                        },
                    }
                })
            }
        }).catch(err => {
            console.error('Failed to load app from Bubble', err)
            navigate('/apps')
        }).finally(() => {
            setIsFetching(false)
        })
    }, [id])

    if (isFetching) {
        return <div className="min-h-screen flex items-center justify-center p-20 text-center flex-col gap-4" style={{ background: 'var(--surface-1)' }}><div className="loader"></div><p>Chargement de l'app...</p></div>
    }

    const canGoNext = () => {
        if (currentStep === 1) return !!siteAnalysis
        if (currentStep === 2) return !!(state.config.name)
        return true
    }

    const handleClose = () => {
        if (confirm('Abandonner la création de l\'application ?')) {
            reset()
            navigate('/apps')
        }
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface-1)' }}>
            {/* Top Bar */}
            <div className="sticky top-0 z-30 border-b flex-shrink-0"
                style={{ background: 'var(--surface-0)', borderColor: 'var(--border)' }}>
                <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center gap-2 md:gap-4">
                    <button onClick={handleClose} className="btn btn-ghost btn-sm p-1 md:p-2 -ml-2" title="Fermer">
                        <X size={20} />
                    </button>
                    <div className="h-5 w-[1px]" style={{ background: 'var(--border)' }} />
                    <h1 className="font-semibold text-sm md:text-base truncate min-w-0" style={{ maxWidth: '60%' }}>
                        {id ? 'Modifier l\'application' : 'Créer une application'}
                    </h1>

                    <div className="flex-1 hidden md:block">
                        {/* Progress connector */}
                        <div className="flex items-center justify-center gap-2">
                            {steps.map((step, i) => (
                                <div key={step.id} className="flex items-center gap-2">
                                    <div className="wizard-step">
                                        <div className={`wizard-step-number w-8 h-8 text-sm ${currentStep === step.id ? 'active' : currentStep > step.id ? 'completed' : ''}`}>
                                            {currentStep > step.id ? '✓' : step.id}
                                        </div>
                                        <span className="text-xs whitespace-nowrap" style={{
                                            color: currentStep === step.id ? 'var(--brand-500)' : currentStep > step.id ? '#10b981' : 'var(--text-muted)',
                                            fontWeight: currentStep === step.id ? 600 : 400,
                                        }}>{step.short}</span>
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className={`wizard-connector ${currentStep > step.id ? 'completed' : ''}`}
                                            style={{ width: 32 }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="md:hidden ml-auto flex-shrink-0">
                        <span className="badge badge-brand text-xs">Étape {currentStep}/{steps.length}</span>
                    </div>
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}
                        className="h-full"
                    >
                        {currentStep === 1 && <Step1Url />}
                        {currentStep === 2 && <Step2Customization />}
                        {currentStep === 3 && <Step3Features />}
                        {currentStep === 4 && <Step4Preview />}
                        {currentStep === 5 && <Step5Build />}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Navigation (hide on step 5) */}
            {currentStep < 5 && (
                <div className="sticky bottom-0 border-t flex-shrink-0"
                    style={{ background: 'var(--surface-0)', borderColor: 'var(--border)' }}>
                    <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                        <Button
                            variant="ghost"
                            onClick={currentStep === 1 ? handleClose : prevStep}
                            icon={<ChevronLeft size={16} />}
                        >
                            {currentStep === 1 ? 'Annuler' : 'Précédent'}
                        </Button>

                        <div className="flex items-center gap-2">
                            {steps.map(s => (
                                <div
                                    key={s.id}
                                    className="w-2 h-2 rounded-full transition-all"
                                    style={{
                                        background: currentStep >= s.id ? 'var(--brand-500)' : 'var(--surface-3)',
                                        width: currentStep === s.id ? '20px' : '8px',
                                    }}
                                />
                            ))}
                        </div>

                        <Button
                            onClick={nextStep}
                            disabled={!canGoNext()}
                            iconRight={<ChevronRight size={16} />}
                        >
                            {currentStep === 4 ? 'Lancer le build' : 'Continuer'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
