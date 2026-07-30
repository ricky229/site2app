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
        <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            {/* Simulator Toolbar */}
            <div className="flex flex-col border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between p-3 md:px-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 tracking-widest uppercase">
                        <span>Simulator</span>
                        <Settings size={14} className="opacity-50" />
                    </div>
                    
                    <div className="flex bg-white dark:bg-zinc-950 rounded-lg p-1 shadow-sm border border-zinc-200 dark:border-zinc-800">
                        <button 
                            onClick={() => setDevice('iphone')} 
                            className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${device === 'iphone' ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' : 'text-zinc-500 hover:text-black dark:hover:text-white'}`}
                        >
                            iPhone
                        </button>
                        <button 
                            onClick={() => setDevice('android')} 
                            className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${device === 'android' ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' : 'text-zinc-500 hover:text-black dark:hover:text-white'}`}
                        >
                            Android Phone
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center justify-between p-3 md:px-4">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900">
                            <span className="font-bold">100%</span>
                            <ChevronDown size={14} className="opacity-50" />
                        </div>
                        <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-zinc-950 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400">
                            <button className="p-1 hover:text-black dark:hover:text-white"><Smartphone size={16} /></button>
                        </div>
                    </div>
                    <button className="bg-black text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-zinc-800 transition-colors">
                        Rebuild {device === 'iphone' ? 'iOS' : 'Android'}
                    </button>
                </div>
            </div>

            {/* Simulator Body */}
            <div className="flex-1 relative flex items-center justify-center p-6 sm:p-10 bg-zinc-100 dark:bg-zinc-950/50 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="relative mx-auto bg-black overflow-hidden ring-1 ring-black/10 shadow-2xl"
                    style={{
                        height: '100%',
                        maxHeight: '750px',
                        aspectRatio: device === 'iphone' ? '1170/2532' : '1080/2400',
                        borderRadius: device === 'iphone' ? 'clamp(32px, 5vh, 55px)' : 'clamp(24px, 4vh, 40px)',
                        borderWidth: device === 'iphone' ? 'clamp(10px, 1.5vh, 16px)' : 'clamp(8px, 1.2vh, 12px)',
                        borderColor: '#09090b',
                    }}
                >
                    {/* Hardware features */}
                    {device === 'iphone' ? (
                        <>
                            {/* Dynamic Island */}
                            <div className="absolute top-2 inset-x-0 flex justify-center z-50">
                                <div className="w-[100px] h-[28px] bg-black rounded-full" />
                            </div>
                            {/* Power Button */}
                            <div className="absolute top-[120px] -right-[16px] w-[3px] h-[50px] bg-black rounded-r-md" />
                            {/* Volume Buttons */}
                            <div className="absolute top-[100px] -left-[16px] w-[3px] h-[30px] bg-black rounded-l-md" />
                            <div className="absolute top-[140px] -left-[16px] w-[3px] h-[50px] bg-black rounded-l-md" />
                            <div className="absolute top-[200px] -left-[16px] w-[3px] h-[50px] bg-black rounded-l-md" />
                        </>
                    ) : (
                        <>
                            {/* Punch Hole Camera */}
                            <div className="absolute top-[12px] inset-x-0 flex justify-center z-50">
                                <div className="w-[18px] h-[18px] bg-black rounded-full ring-1 ring-white/5" />
                            </div>
                            {/* Power & Volume Buttons */}
                            <div className="absolute top-[140px] -right-[12px] w-[2px] h-[40px] bg-black rounded-r-sm" />
                            <div className="absolute top-[200px] -right-[12px] w-[2px] h-[80px] bg-black rounded-r-sm" />
                        </>
                    )}

                    {/* Status Bar */}
                    <div 
                        className="absolute top-0 inset-x-0 h-12 flex items-center justify-between px-6 pt-2 z-40 transition-colors duration-500"
                        style={{ backgroundColor: statusBarColor, color: statusTextColor }}
                    >
                        <span className="text-[12px] font-bold tracking-tight">9:41</span>
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
                             borderRadius: device === 'iphone' ? 'calc(clamp(32px,5vh,55px) - clamp(10px,1.5vh,16px))' : 'calc(clamp(24px,4vh,40px) - clamp(8px,1.2vh,12px))'
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
                        <div className="absolute bottom-1.5 inset-x-0 flex justify-center z-50">
                            <div className="w-1/3 h-1.5 bg-black/30 dark:bg-white/30 rounded-full" />
                        </div>
                    )}
                </motion.div>
                
                {/* Subtle shadow glow under device */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-2/3 h-12 bg-black/20 blur-3xl rounded-full" />
            </div>
        </div>
    )
}
