import { motion, AnimatePresence } from 'framer-motion'
import { useWizardStore } from '../../../store/wizardStore'
import { Loader2, Wifi, Battery, Signal } from 'lucide-react'

export default function AppSimulator() {
    const { state } = useWizardStore()
    const { currentStep, siteAnalysis, config } = state

    // The simulator background should be the splash screen color or white
    const bg = config.secondaryColor || '#ffffff'
    const primary = config.primaryColor || '#3461f5'
    const statusBarColor = config.statusBar?.color || primary
    const isDarkStatusBar = config.statusBar?.style === 'dark'
    const statusTextColor = isDarkStatusBar ? 'rgba(0,0,0,0.8)' : '#ffffff'

    const showSplash = currentStep === 2 && !config.name // Just an example logic or when loading
    const showUrl = siteAnalysis?.url

    return (
        <div className="relative w-full max-w-[340px] mx-auto perspective-1000">
            <motion.div
                initial={{ opacity: 0, y: 40, rotateX: 5 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative mx-auto rounded-[3rem] border-[14px] border-zinc-950 shadow-2xl bg-zinc-950 overflow-hidden ring-1 ring-white/10"
                style={{
                    aspectRatio: '9/19.5',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.1)'
                }}
            >
                {/* Dynamic Island (iPhone style) */}
                <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50">
                    <div className="w-32 h-7 bg-zinc-950 rounded-b-3xl" />
                </div>

                {/* Status Bar */}
                <div 
                    className="absolute top-0 inset-x-0 h-12 flex items-center justify-between px-6 pt-2 z-40 transition-colors duration-500"
                    style={{ backgroundColor: statusBarColor, color: statusTextColor }}
                >
                    <span className="text-xs font-bold mt-1">9:41</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Signal size={12} fill="currentColor" />
                        <Wifi size={12} />
                        <Battery size={14} fill="currentColor" />
                    </div>
                </div>

                {/* Screen Content */}
                <div className="relative w-full h-full bg-white pt-12 flex flex-col overflow-hidden transition-colors duration-500" style={{ backgroundColor: bg }}>
                    <AnimatePresence mode="wait">
                        {currentStep === 1 && !siteAnalysis && (
                            <motion.div 
                                key="empty"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex-1 flex items-center justify-center text-center p-6"
                            >
                                <div className="space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-black/5 rounded-2xl animate-pulse" />
                                    <div className="w-32 h-4 mx-auto bg-black/5 rounded-full animate-pulse" />
                                    <p className="text-black/40 text-sm font-medium">Entrez une URL pour commencer</p>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 1 && siteAnalysis && (
                            <motion.div 
                                key="loading"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white"
                            >
                                <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
                                <p className="font-bold text-slate-800">Analyse en cours...</p>
                                <p className="text-xs text-slate-500">Extraction du design</p>
                            </motion.div>
                        )}

                        {currentStep > 1 && showUrl && (
                            <motion.iframe
                                key="iframe"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                                src={siteAnalysis.url}
                                className="w-full h-full bg-white border-0"
                                sandbox="allow-same-origin allow-scripts allow-forms"
                                title="App Preview"
                            />
                        )}

                        {/* Splash screen simulation on demand or if no URL */}
                        {showSplash && (
                            <motion.div
                                key="splash"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 z-30 flex flex-col items-center justify-center"
                                style={{ backgroundColor: bg }}
                            >
                                <div 
                                    className="w-24 h-24 rounded-3xl shadow-2xl flex items-center justify-center text-white text-3xl font-bold mb-4"
                                    style={{ backgroundColor: primary }}
                                >
                                    {(config.name || 'App').charAt(0).toUpperCase()}
                                </div>
                                <h2 className="text-xl font-bold" style={{ color: isDarkStatusBar ? '#000' : '#fff' }}>
                                    {config.name || 'Mon Application'}
                                </h2>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-2 inset-x-0 flex justify-center z-50">
                    <div className="w-1/3 h-1 bg-black/20 rounded-full" />
                </div>
            </motion.div>

            {/* Reflection/Glow underneath */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-zinc-900 blur-2xl opacity-50" />
        </div>
    )
}
