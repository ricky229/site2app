import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useWizardStore } from '../../store/wizardStore'
import { getBuildStatus as getAppById } from '../../lib/api'

// Steps
import Step1Url from './wizard/Step1Url'
import Step2Customization from './wizard/Step2Customization'
import Step3Features from './wizard/Step3Features'
import Step4Preview from './wizard/Step4Preview'
import Step5Build from './wizard/Step5Build'
import AppSimulator from './wizard/AppSimulator'
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
                        primaryColor: data.themeColor || data.config?.primaryColor || '#3461f5',
                        secondaryColor: data.splashBgColor || data.config?.secondaryColor || '#7c3aed',
                        orientation: data.orientation || data.config?.orientation || 'portrait',
                        features: safeFeatures,
                        icon: data.config?.icon || '',
                        splashScreen: data.config?.splashImage || '',
                        statusBar: {
                            color: data.themeColor || data.config?.statusBarColor || '#ffffff',
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
        <div className="h-full flex flex-col bg-[var(--surface-0)] overflow-hidden">
            {/* Minimalist Top Bar */}
            <div className="sticky top-0 z-40 border-b bg-[var(--surface-0)]/80 backdrop-blur-md flex-shrink-0"
                style={{ borderColor: 'var(--border)' }}>
                <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={handleClose} className="btn btn-ghost btn-sm p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors" title="Fermer">
                            <X size={20} />
                        </button>
                        <div className="h-5 w-[1px] bg-[var(--border)]" />
                        <h1 className="font-bold text-sm md:text-base text-[var(--text-primary)]">
                            {id ? 'Modifier l\'application' : 'Créer une application'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        {steps.map((step, i) => (
                            <div key={step.id} className="flex items-center gap-2 md:gap-3">
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all
                                    ${currentStep === step.id ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                                    : currentStep > step.id ? 'bg-emerald-500 text-white' : 'bg-[var(--surface-2)] text-[var(--text-muted)] hidden md:flex'}`}>
                                    {currentStep > step.id ? '✓' : step.id}
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`w-2 md:w-8 h-[2px] rounded-full transition-all ${currentStep > step.id ? 'bg-emerald-500' : 'bg-[var(--surface-2)]'} hidden md:block`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Split View Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1600px] w-full mx-auto relative">
                
                {/* Left Column (Forms) */}
                <div className="w-full lg:w-[55%] flex flex-col h-full bg-[var(--surface-0)] relative z-10">
                    
                    {/* Form Steps (Scrolling area) */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-8 md:px-12 py-6 md:py-10 pb-10">
                        <div className="max-w-2xl mx-auto w-full h-full">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
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
                    </div>

                    {/* Bottom Navigation for Left Column (Fixed at bottom) */}
                    {currentStep < 5 && (
                        <div className="flex-shrink-0 bg-[var(--surface-0)] border-t border-[var(--border)] p-4 md:px-12 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20">
                            <Button
                                variant="ghost"
                                onClick={currentStep === 1 ? handleClose : prevStep}
                                icon={<ChevronLeft size={16} />}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                                {currentStep === 1 ? 'Annuler' : 'Précédent'}
                            </Button>

                            <Button
                                onClick={nextStep}
                                disabled={!canGoNext()}
                                iconRight={<ChevronRight size={16} />}
                                className="shadow-lg shadow-blue-500/20"
                            >
                                {currentStep === 4 ? 'Lancer le build' : 'Continuer'}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Right Column (Simulator) */}
                <div className="hidden lg:flex w-full lg:w-[45%] bg-[var(--surface-1)] border-l border-[var(--border)] items-center justify-center p-8 sticky top-16 h-[calc(100vh-4rem)] overflow-hidden">
                    {currentStep < 5 ? (
                        <AppSimulator />
                    ) : (
                        <div className="text-center opacity-50">
                            <p className="text-lg font-bold">Génération en cours...</p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Mobile floating simulator toggle? (Optional, maybe later) */}
        </div>
    )
}
