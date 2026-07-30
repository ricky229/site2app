import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWizardStore } from '../../../store/wizardStore'
import { Loader2, Wifi, Battery, Signal, Smartphone } from 'lucide-react'

type DeviceType = 'iphone' | 'android'

export default function AppSimulator() {
    const { state } = useWizardStore()
    const { currentStep, siteAnalysis, config } = state
    const [device, setDevice] = useState<DeviceType>('iphone')

    // The simulator background should be the splash screen color or white
    const bg = config.secondaryColor || '#ffffff'
    const primary = config.primaryColor || '#3461f5'
    const statusBarColor = config.statusBar?.color || primary
    const isDarkStatusBar = config.statusBar?.style === 'dark'
    const statusTextColor = isDarkStatusBar ? 'rgba(0,0,0,0.8)' : '#ffffff'

    const showSplash = currentStep === 2 && !config.name // Just an example logic or when loading
    const showUrl = siteAnalysis?.url

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center perspective-1000">
            {/* Device Switcher */}
            <div className="absolute top-4 right-4 z-50 flex bg-white/20 p-1 rounded-xl backdrop-blur-md shadow-sm border border-black/5">
                <button 
                    onClick={() => setDevice('iphone')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${device === 'iphone' ? 'bg-white text-black shadow-sm' : 'text-black/60 hover:text-black'}`}
                >
                    iPhone
                </button>
                <button 
                    onClick={() => setDevice('android')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${device === 'android' ? 'bg-white text-black shadow-sm' : 'text-black/60 hover:text-black'}`}
                >
                    Android
                </button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 40, rotateX: 5 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative mx-auto bg-zinc-950 overflow-hidden ring-1 ring-white/10"
                style={{
                    height: '90%',
                    maxHeight: '800px',
                    aspectRatio: device === 'iphone' ? '9/19.5' : '9/19',
                    borderRadius: device === 'iphone' ? 'min(3rem, 10%)' : 'min(2rem, 8%)',
                    borderWidth: 'min(14px, 3vh)',
                    borderColor: '#09090b',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.1)'
                }}
            >
                {/* Notch / Dynamic Island */}
                {device === 'iphone' ? (
                    <div className="absolute top-0 inset-x-0 h-[3vh] min-h-[24px] max-h-[30px] flex justify-center z-50">
                        <div className="w-[35%] h-full bg-zinc-950 rounded-b-3xl" />
                    </div>
                ) : (
                    <div className="absolute top-2 inset-x-0 flex justify-center z-50">
                        <div className="w-[3%] aspect-square bg-zinc-950 rounded-full" />
                    </div>
                )}

                {/* Status Bar */}
                <div 
                    className="absolute top-0 inset-x-0 h-10 md:h-12 flex items-center justify-between px-5 md:px-6 pt-1 z-40 transition-colors duration-500"
                    style={{ backgroundColor: statusBarColor, color: statusTextColor }}
                >
                    <span className="text-[10px] md:text-xs font-bold mt-1">9:41</span>
                    <div className="flex items-center gap-1 mt-1">
                        <Signal size={10} fill="currentColor" />
                        <Wifi size={10} />
                        <Battery size={12} fill="currentColor" />
                    </div>
                </div>

                {/* Screen Content */}
                <div className="relative w-full h-full bg-white pt-10 md:pt-12 flex flex-col overflow-hidden transition-colors duration-500" style={{ backgroundColor: bg }}>
                    <AnimatePresence mode="wait">
                        {currentStep === 1 && !siteAnalysis && (
                            <motion.div 
                                key="empty"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex-1 flex items-center justify-center text-center p-6"
                            >
                                <div className="space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-black/5 rounded-2xl animate-pulse" />
                                    <div className="w-24 h-4 mx-auto bg-black/5 rounded-full animate-pulse" />
                                    <p className="text-black/40 text-xs md:text-sm font-medium">Entrez une URL pour commencer</p>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 1 && siteAnalysis && (
                            <motion.div 
                                key="loading"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white"
                            >
                                <Loader2 size={24} className="animate-spin text-blue-500 mb-4 md:w-8 md:h-8" />
                                <p className="font-bold text-slate-800 text-sm md:text-base">Analyse en cours...</p>
                                <p className="text-[10px] md:text-xs text-slate-500">Extraction du design</p>
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
                                    className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl shadow-2xl flex items-center justify-center text-white text-2xl md:text-3xl font-bold mb-4"
                                    style={{ backgroundColor: primary }}
                                >
                                    {(config.name || 'App').charAt(0).toUpperCase()}
                                </div>
                                <h2 className="text-lg md:text-xl font-bold" style={{ color: isDarkStatusBar ? '#000' : '#fff' }}>
                                    {config.name || 'Mon Application'}
                                </h2>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Home Indicator (iPhone only) */}
                {device === 'iphone' && (
                    <div className="absolute bottom-2 inset-x-0 flex justify-center z-50">
                        <div className="w-1/3 h-1 bg-black/20 rounded-full" />
                    </div>
                )}
            </motion.div>

            {/* Reflection/Glow underneath */}
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-1/2 h-8 bg-zinc-900 blur-2xl opacity-50" />
        </div>
    )
}
