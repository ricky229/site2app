import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
    Zap, ArrowRight, Smartphone, Bell, Wifi, MapPin, Camera,
    Shield, BarChart2, RefreshCw, Download, Globe, CheckCircle,
    Star, Menu, X, Moon, Sun, Play, Code, Palette, Settings,
    TrendingUp, Clock, ChevronRight, DollarSign, Layers, Apple, Sparkles
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const fadeUp: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const stagger = {
    visible: { transition: { staggerChildren: 0.1 } },
}

export default function LandingPage() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [menuOpen, setMenuOpen] = useState(false)
    const [darkMode, setDarkMode] = useState(() => {
        return document.documentElement.classList.contains('dark') || 
               (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    })
    const [scrolled, setScrolled] = useState(false)
    const [urlInput, setUrlInput] = useState('')

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handler)
        return () => window.removeEventListener('scroll', handler)
    }, [])

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }, [darkMode])

    const handleCreate = () => {
        if (urlInput) {
            localStorage.setItem('site2app_initial_url', urlInput)
        }
        navigate(user ? '/dashboard' : '/auth/register')
    }

    return (
        <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] font-sans overflow-hidden selection:bg-blue-500/30">
            
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px] mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[150px] mix-blend-screen" />
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] mix-blend-screen" />
            </div>

            {/* NAVBAR */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-3 backdrop-blur-2xl bg-[var(--surface-0)]/70 shadow-sm border-b border-[var(--border)]' : 'py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                            <Zap size={20} color="white" className="group-hover:rotate-12 transition-transform" />
                        </div>
                        <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)]">Site2App</span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-8 bg-[var(--surface-1)]/50 backdrop-blur-md px-6 py-2 rounded-full border border-[var(--border)]">
                        {[['#features', 'Fonctionnalités'], ['#how-it-works', 'Comment ça marche'], ['#pricing', 'Tarifs']].map(([href, label]) => (
                            <a key={href} href={href} className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                {label}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden lg:flex items-center gap-4">
                        <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors border border-[var(--border)] text-[var(--text-secondary)]">
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        {user ? (
                            <Link to="/dashboard" className="bg-[var(--text-primary)] text-[var(--surface-0)] px-6 py-2.5 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(0,0,0,0.1)] hover:scale-105 transition-all">
                                Mon espace
                            </Link>
                        ) : (
                            <>
                                <Link to="/auth/login" className="text-sm font-bold px-4 hover:text-blue-500 transition-colors">Connexion</Link>
                                <Link to="/auth/register" className="relative group overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all">
                                    <span className="relative z-10">Créer mon App</span>
                                    <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                </Link>
                            </>
                        )}
                    </div>

                    <button className="lg:hidden p-2 text-[var(--text-primary)]" onClick={() => setMenuOpen(!menuOpen)}>
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* MOBILE MENU */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="fixed inset-x-0 top-[72px] p-4 z-40 lg:hidden"
                    >
                        <div className="bg-[var(--surface-0)]/95 backdrop-blur-3xl border border-[var(--border)] p-6 rounded-3xl shadow-2xl flex flex-col gap-4">
                            {[['#features', 'Fonctionnalités'], ['#how-it-works', 'Comment ça marche'], ['#pricing', 'Tarifs']].map(([href, label]) => (
                                <a key={href} href={href} onClick={() => setMenuOpen(false)} className="text-lg font-bold p-2 text-[var(--text-primary)]">{label}</a>
                            ))}
                            <div className="h-px bg-[var(--border)] my-2" />
                            {user ? (
                                <Link to="/dashboard" className="bg-blue-600 text-white font-bold py-3 rounded-xl text-center">Tableau de bord</Link>
                            ) : (
                                <>
                                    <Link to="/auth/login" className="bg-[var(--surface-2)] text-[var(--text-primary)] font-bold py-3 rounded-xl text-center">Connexion</Link>
                                    <Link to="/auth/register" className="bg-blue-600 text-white font-bold py-3 rounded-xl text-center">Commencer gratuitement</Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HERO SECTION */}
            <main className="relative z-10 pt-36 pb-20 lg:pt-48 lg:pb-32 px-6">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <motion.div initial="hidden" animate="visible" variants={stagger} className="flex-1 text-center lg:text-left">
                        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-bold mb-8 backdrop-blur-sm">
                            <Sparkles size={16} className="animate-pulse" />
                            <span>La nouvelle référence en création d'apps</span>
                        </motion.div>

                        <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-[1.05] tracking-tight">
                            Votre site web devient une <br className="hidden lg:block"/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">App Native Premium.</span>
                        </motion.h1>

                        <motion.p variants={fadeUp} className="text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed">
                            Convertissez instantanément votre site web en application iOS et Android. 
                            Activez les Notifications Push, le mode Hors-Ligne et la Monétisation AdMob <strong className="text-[var(--text-primary)]">sans écrire une seule ligne de code</strong>.
                        </motion.p>

                        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full max-w-xl mx-auto lg:mx-0">
                            <div className="relative w-full group">
                                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                    <Globe className="text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" size={22} />
                                </div>
                                <input 
                                    type="url" 
                                    placeholder="https://votre-site.com"
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    className="w-full pl-14 pr-44 py-5 bg-[var(--surface-0)] border-2 border-[var(--border)] hover:border-[var(--text-muted)] rounded-full text-[var(--text-primary)] font-medium text-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-xl shadow-blue-500/5"
                                />
                                <button 
                                    onClick={handleCreate}
                                    className="absolute inset-y-2 right-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Créer <ArrowRight size={18} />
                                </button>
                            </div>
                        </motion.div>

                        <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4 text-sm text-[var(--text-secondary)] font-medium">
                            <div className="flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500" /> Sans carte bancaire</div>
                            <div className="flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500" /> Prêt en 3 minutes</div>
                            <div className="flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500" /> Publiable sur les Stores</div>
                        </motion.div>
                    </motion.div>

                    {/* HERO VISUAL (3D-like Mockup) */}
                    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, ease: "easeOut" }} className="flex-1 relative hidden lg:block w-full">
                        <div className="relative w-[320px] mx-auto perspective-1000">
                            
                            {/* Floating Elements */}
                            <motion.div animate={{ y: [-10, 10, -10] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute -left-16 top-32 bg-[var(--surface-0)] border border-[var(--border)] p-4 rounded-2xl shadow-2xl z-30 flex items-center gap-4 backdrop-blur-xl">
                                <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center"><DollarSign size={24} /></div>
                                <div><p className="font-bold text-[var(--text-primary)]">Monétisation</p><p className="text-xs text-[var(--text-muted)]">AdMob Intégré</p></div>
                            </motion.div>
                            
                            <motion.div animate={{ y: [10, -10, 10] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute -right-20 bottom-40 bg-[var(--surface-0)] border border-[var(--border)] p-4 rounded-2xl shadow-2xl z-30 flex items-center gap-4 backdrop-blur-xl">
                                <div className="w-12 h-12 bg-purple-500/20 text-purple-500 rounded-xl flex items-center justify-center"><Bell size={24} /></div>
                                <div><p className="font-bold text-[var(--text-primary)]">Push Envoyé</p><p className="text-xs text-[var(--text-muted)]">Taux d'ouverture 98%</p></div>
                            </motion.div>

                            {/* Phone Mockup Frame */}
                            <motion.div 
                                className="w-full h-[650px] bg-black rounded-[3rem] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-[1px] border-slate-700/50 relative z-20"
                                style={{ transformStyle: 'preserve-3d', rotateY: -15, rotateX: 5 }}
                            >
                                {/* Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-black rounded-b-[1.5rem] z-30" />
                                
                                {/* Screen */}
                                <div className="w-full h-full bg-[var(--surface-0)] rounded-[2.5rem] overflow-hidden relative border border-white/10 flex flex-col">
                                    {/* Mock App Header */}
                                    <div className="h-24 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex flex-col justify-end relative">
                                        <div className="absolute top-2 right-4 flex gap-1.5">
                                            <div className="w-4 h-4 rounded-full bg-white/20" />
                                            <div className="w-4 h-4 rounded-full bg-white/20" />
                                        </div>
                                        <h3 className="text-white font-bold text-xl">Mon App</h3>
                                    </div>
                                    
                                    {/* Mock App Content */}
                                    <div className="p-4 flex-1 flex flex-col gap-4 bg-[var(--surface-1)]">
                                        <div className="w-full h-32 rounded-2xl bg-[var(--surface-2)] animate-pulse" />
                                        <div className="flex gap-4">
                                            <div className="flex-1 h-24 rounded-2xl bg-[var(--surface-2)] animate-pulse" style={{ animationDelay: '150ms' }} />
                                            <div className="flex-1 h-24 rounded-2xl bg-[var(--surface-2)] animate-pulse" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <div className="w-full h-12 rounded-xl bg-blue-500/20 mt-auto flex items-center justify-center">
                                            <div className="w-1/2 h-2 rounded-full bg-blue-500/50" />
                                        </div>
                                    </div>
                                    
                                    {/* Mock Banner Ad */}
                                    <div className="h-14 bg-[var(--surface-2)] border-t border-[var(--border)] flex items-center justify-center">
                                        <span className="text-xs text-[var(--text-muted)] font-mono">AdMob Banner Space</span>
                                    </div>
                                </div>
                            </motion.div>
                            
                            {/* Shadow under phone */}
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[80%] h-10 bg-black/20 blur-2xl rounded-full" />
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* SOCIAL PROOF */}
            <section className="py-10 border-y border-[var(--border)] bg-[var(--surface-1)]/50 backdrop-blur-sm relative z-10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                    <p className="text-[var(--text-secondary)] font-medium">Rejoignez plus de <strong className="text-[var(--text-primary)] font-black">2,500+</strong> créateurs d'applications</p>
                    <div className="flex gap-8 items-center opacity-50 grayscale">
                        {/* Faux logos de plateformes */}
                        <div className="flex items-center gap-2 font-bold text-xl"><Smartphone size={24} /> Play Store</div>
                        <div className="flex items-center gap-2 font-bold text-xl"><Apple size={24} /> App Store</div>
                    </div>
                </div>
            </section>

            {/* BENTO GRID FEATURES */}
            <section id="features" className="py-24 px-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black mb-4">Des fonctionnalités natives,<br/> sans l'effort.</h2>
                        <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">Tout ce dont vous avez besoin pour offrir une véritable expérience mobile à vos utilisateurs, intégré en un clic.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
                        {/* BENTO ITEM 1: Push */}
                        <div className="md:col-span-2 md:row-span-2 rounded-3xl bg-[var(--surface-1)] border border-[var(--border)] p-8 flex flex-col relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full group-hover:bg-purple-500/20 transition-colors" />
                            <div className="w-14 h-14 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center mb-6">
                                <Bell size={28} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">Notifications Push</h3>
                            <p className="text-[var(--text-secondary)] text-lg max-w-md">Engagez vos utilisateurs avec des alertes riches. Segmentez votre audience et envoyez des messages ciblés instantanément via Firebase.</p>
                            
                            <div className="mt-auto relative w-full max-w-sm ml-auto bg-[var(--surface-0)] rounded-2xl p-4 shadow-2xl border border-[var(--border)] transform group-hover:-translate-y-2 transition-transform">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-xs font-bold"><Zap size={14} className="text-blue-500"/> Site2App</div>
                                    <span className="text-xs text-[var(--text-muted)]">À l'instant</span>
                                </div>
                                <p className="font-bold text-sm mb-1">Nouvelle mise à jour ! 🎉</p>
                                <p className="text-xs text-[var(--text-secondary)]">Découvrez nos nouvelles fonctionnalités premium dès maintenant.</p>
                            </div>
                        </div>

                        {/* BENTO ITEM 2: AdMob */}
                        <div className="md:col-span-1 md:row-span-1 rounded-3xl bg-[var(--surface-1)] border border-[var(--border)] p-8 flex flex-col relative overflow-hidden group hover:border-amber-500/50 transition-colors">
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full group-hover:bg-amber-500/20 transition-colors" />
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                                    <DollarSign size={24} />
                                </div>
                                <span className="bg-amber-500/10 text-amber-600 text-xs font-bold px-3 py-1 rounded-full">Nouveau</span>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Monétisation AdMob</h3>
                            <p className="text-[var(--text-secondary)] text-sm">Intégrez des bannières et interstitiels publicitaires en un clic pour générer des revenus passifs.</p>
                        </div>

                        {/* BENTO ITEM 3: Offline */}
                        <div className="md:col-span-1 md:row-span-1 rounded-3xl bg-[var(--surface-1)] border border-[var(--border)] p-8 flex flex-col relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full group-hover:bg-emerald-500/20 transition-colors" />
                            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                                <Wifi size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Mode Hors-ligne</h3>
                            <p className="text-[var(--text-secondary)] text-sm">Cache intelligent intégré. Votre application reste utilisable même sans connexion internet.</p>
                        </div>

                        {/* BENTO ITEM 4: Face ID / Security */}
                        <div className="md:col-span-1 md:row-span-1 rounded-3xl bg-[var(--surface-1)] border border-[var(--border)] p-8 flex flex-col relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full group-hover:bg-blue-500/20 transition-colors" />
                            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
                                <Shield size={24} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Sécurité Biométrique</h3>
                            <p className="text-[var(--text-secondary)] text-sm">Support natif de Face ID et Touch ID pour protéger les données sensibles.</p>
                        </div>

                        {/* BENTO ITEM 5: Pull to refresh */}
                        <div className="md:col-span-2 md:row-span-1 rounded-3xl bg-[var(--surface-1)] border border-[var(--border)] p-8 flex flex-col sm:flex-row items-center gap-8 relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                            <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[60px] rounded-full group-hover:bg-indigo-500/20 transition-colors" />
                            <div className="flex-1">
                                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-4">
                                    <RefreshCw size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Pull-to-refresh & UI Natives</h3>
                                <p className="text-[var(--text-secondary)] text-sm">Des contrôles de navigation familiers pour une expérience fluide. Barres de progression, menus natifs, et glisser pour rafraîchir.</p>
                            </div>
                            <div className="w-full sm:w-1/3 h-full bg-[var(--surface-2)] rounded-xl border border-[var(--border)] relative overflow-hidden flex items-center justify-center min-h-[100px]">
                                <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-8 h-8 rounded-full bg-[var(--surface-0)] shadow-lg flex items-center justify-center border border-[var(--border)]">
                                    <RefreshCw size={14} className="animate-spin text-blue-500" />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how-it-works" className="py-24 px-6 bg-[var(--surface-1)]/30 border-y border-[var(--border)] relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black mb-4">Comment ça marche ?</h2>
                        <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">Trois étapes simples. Zéro ligne de code. Votre application est prête en quelques minutes.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { step: '01', icon: Globe, title: 'Connectez votre site', desc: 'Entrez simplement l\'URL de votre site web (WordPress, Shopify, React, etc.) et personnalisez le nom et l\'icône.' },
                            { step: '02', icon: Layers, title: 'Activez les modules', desc: 'Cochez les fonctionnalités natives que vous souhaitez : Push, AdMob, Géolocalisation, Mode Sombre...' },
                            { step: '03', icon: Download, title: 'Téléchargez l\'APK', desc: 'Notre moteur cloud compile instantanément votre code. Téléchargez votre application prête pour le Play Store.' }
                        ].map((item, i) => (
                            <div key={i} className="relative p-8 rounded-3xl bg-[var(--surface-0)] border border-[var(--border)] shadow-xl shadow-black/5 hover:-translate-y-2 transition-transform duration-300">
                                <div className="text-[6rem] font-black absolute top-0 right-4 text-[var(--border)]/50 pointer-events-none select-none z-0">{item.step}</div>
                                <div className="relative z-10">
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg">
                                        <item.icon size={28} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                                    <p className="text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="py-32 px-6 relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-blue-600/5 dark:bg-blue-900/20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
                
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black mb-6">Prêt à lancer votre application ?</h2>
                    <p className="text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto">
                        Rejoignez les développeurs et agences qui transforment déjà leurs sites en applications mobiles performantes.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/auth/register" className="w-full sm:w-auto bg-[var(--text-primary)] text-[var(--surface-0)] px-10 py-4 rounded-full text-lg font-bold shadow-2xl hover:scale-105 transition-transform">
                            Créer mon application maintenant
                        </Link>
                        <Link to="/auth/login" className="w-full sm:w-auto bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-primary)] px-10 py-4 rounded-full text-lg font-bold hover:bg-[var(--surface-2)] transition-colors">
                            J'ai déjà un compte
                        </Link>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-[var(--border)] py-12 px-6 bg-[var(--surface-0)] relative z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3 opacity-80">
                        <Zap size={24} className="text-blue-500" />
                        <span className="font-bold text-xl tracking-tight">Site2App</span>
                    </div>
                    <div className="flex gap-8 text-sm text-[var(--text-secondary)] font-medium">
                        <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Conditions Générales</a>
                        <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Confidentialité</a>
                        <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Contact</a>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">© 2026 Site2App. Tous droits réservés.</p>
                </div>
            </footer>
        </div>
    )
}
