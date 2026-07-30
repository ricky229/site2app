import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWizardStore } from '../../../store/wizardStore'
import { Loader2, Wifi, Battery, Signal, Smartphone, Settings, ChevronDown } from 'lucide-react'

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

    const showUrl = siteAnalysis?.url

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-transparent">
            {/* Minimalist Floating Device Switcher */}
            <div className="absolute top-4 right-4 z-50 flex bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-1 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50">
                <button 
                    onClick={() => setDevice('iphone')}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${device === 'iphone' ? 'bg-black text-white shadow-md' : 'text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white'}`}
                >
                    iPhone
                </button>
                <button 
                    onClick={() => setDevice('android')}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${device === 'android' ? 'bg-black text-white shadow-md' : 'text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white'}`}
                >
                    Android
                </button>
            </div>

            {/* Phone Container */}
            <div className="relative w-full max-w-[400px] h-full max-h-[850px] p-4 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full bg-black overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-black/10"
                    style={{
                        height: '100%',
                        aspectRatio: device === 'iphone' ? '1170/2532' : '1080/2400',
                        borderRadius: device === 'iphone' ? '44px' : '32px',
                        borderWidth: device === 'iphone' ? '14px' : '10px',
                        borderColor: '#0f0f11',
                    }}
                >
                    {/* Hardware features */}
                    {device === 'iphone' ? (
                        <>
                            {/* Dynamic Island */}
                            <div className="absolute top-[8px] inset-x-0 flex justify-center z-50">
                                <div className="w-[100px] h-[28px] bg-[#0f0f11] rounded-full" />
                            </div>
                            {/* Power Button */}
                            <div className="absolute top-[120px] -right-[14px] w-[3px] h-[50px] bg-[#2a2a2c] rounded-l-md" />
                            {/* Volume Buttons */}
                            <div className="absolute top-[100px] -left-[14px] w-[3px] h-[30px] bg-[#2a2a2c] rounded-r-md" />
                            <div className="absolute top-[140px] -left-[14px] w-[3px] h-[50px] bg-[#2a2a2c] rounded-r-md" />
                            <div className="absolute top-[200px] -left-[14px] w-[3px] h-[50px] bg-[#2a2a2c] rounded-r-md" />
                        </>
                    ) : (
                        <>
                            {/* Punch Hole Camera */}
                            <div className="absolute top-[12px] inset-x-0 flex justify-center z-50">
                                <div className="w-[16px] h-[16px] bg-[#0f0f11] rounded-full ring-1 ring-white/10" />
                            </div>
                        </>
                    )}

                    {/* Status Bar */}
                    <div 
                        className="absolute top-0 inset-x-0 h-12 flex items-center justify-between px-6 pt-1 z-40 transition-colors duration-500"
                        style={{ backgroundColor: statusBarColor, color: statusTextColor }}
                    >
                        <span className="text-[12px] font-semibold tracking-tight">9:41</span>
                        <div className="flex items-center gap-1.5">
                            <Signal size={12} fill="currentColor" />
                            <Wifi size={12} />
                            <Battery size={14} fill="currentColor" />
                        </div>
                    </div>

                    {/* Screen Content */}
                    <div className="relative w-full h-full bg-white pt-12 flex flex-col overflow-hidden transition-colors duration-500" 
                         style={{ 
                             backgroundColor: bg,
                             borderRadius: device === 'iphone' ? '30px' : '22px'
                         }}>
                        <AnimatePresence mode="wait">
                            {currentStep === 1 && !siteAnalysis && (
                                <motion.div 
                                    key="empty"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex-1 flex items-center justify-center text-center p-6 bg-white"
                                >
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 mx-auto bg-zinc-100 rounded-2xl animate-pulse" />
                                        <div className="w-32 h-3 mx-auto bg-zinc-100 rounded-full animate-pulse" />
                                        <p className="text-zinc-400 text-sm font-medium">Entrez une URL pour commencer</p>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 1 && siteAnalysis && (
                                <motion.div 
                                    key="loading"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white"
                                >
                                    <Loader2 size={32} className="animate-spin text-blue-600 mb-4" />
                                    <p className="font-bold text-zinc-800">Analyse en cours...</p>
                                    <p className="text-xs text-zinc-500 mt-1">Extraction du design</p>
                                </motion.div>
                            )}

                            {currentStep > 1 && showUrl && currentStep !== 5 && (
                                <motion.iframe
                                    key="iframe"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                                    src={siteAnalysis.url}
                                    className="w-full h-full bg-white border-0 z-10 relative"
                                    sandbox="allow-same-origin allow-scripts allow-forms"
                                    title="App Preview"
                                />
                            )}

                            {/* Splash screen simulation during build */}
                            {currentStep === 5 && (
                                <motion.div
                                    key="splash"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-30 flex flex-col items-center justify-center"
                                    style={{ backgroundColor: bg }}
                                >
                                    <div 
                                        className="w-24 h-24 rounded-3xl shadow-2xl flex items-center justify-center text-white text-4xl font-bold mb-6"
                                        style={{ backgroundColor: primary }}
                                    >
                                        {(config.name || 'App').charAt(0).toUpperCase()}
                                    </div>
                                    <h2 className="text-2xl font-bold" style={{ color: isDarkStatusBar ? '#000' : '#fff' }}>
                                        {config.name || 'Mon Application'}
                                    </h2>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Home Indicator (iPhone only) */}
                    {device === 'iphone' && (
                        <div className="absolute bottom-2 inset-x-0 flex justify-center z-50">
                            <div className="w-[35%] h-[5px] bg-black/30 dark:bg-white/30 rounded-full" />
                        </div>
                    )}
                </motion.div>
            </div>
            
            {/* Subtle shadow glow under device */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[300px] h-[20px] bg-black/20 blur-2xl rounded-full" />
        </div>
    )
}
