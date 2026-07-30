import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Zap, ArrowRight, Smartphone, Bell, Wifi,
    Shield, RefreshCw, Globe, CheckCircle, Menu, X, DollarSign,
    Layers, Cpu, Activity
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const fadeUp: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

const stagger = {
    visible: { transition: { staggerChildren: 0.1 } },
}

export default function LandingPage() {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [urlInput, setUrlInput] = useState('')

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handler)
        return () => window.removeEventListener('scroll', handler)
    }, [])

    const handleCreate = () => {
        if (urlInput) {
            localStorage.setItem('site2app_initial_url', urlInput)
        }
        navigate(user ? '/dashboard' : '/auth/register')
    }

    return (
        // Forces dark theme look specifically for the landing page
        <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans overflow-hidden selection:bg-blue-500/30">
            
            {/* Background Glows (Linear/Vercel style) */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
                {/* Top Center Glow */}
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/20 blur-[150px]" />
            </div>

            {/* NAVBAR */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-4 backdrop-blur-xl bg-zinc-950/70 border-b border-white/5 shadow-2xl' : 'py-6'}`}>
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center shadow-lg group-hover:bg-zinc-700 transition-colors">
                            <Zap size={18} className="text-zinc-100" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">Site2App</span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-8">
                        {[['#features', 'Fonctionnalités'], ['#how-it-works', 'Comment ça marche'], ['#pricing', 'Tarifs']].map(([href, label]) => (
                            <a key={href} href={href} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                                {label}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden lg:flex items-center gap-4">
                        {user ? (
                            <Link to="/dashboard" className="bg-white text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-zinc-200 transition-colors">
                                Mon espace
                            </Link>
                        ) : (
                            <>
                                <Link to="/auth/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Connexion</Link>
                                <Link to="/auth/register" className="bg-white text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                                    Démarrer
                                </Link>
                            </>
                        )}
                    </div>

                    <button className="lg:hidden p-2 text-zinc-400" onClick={() => setMenuOpen(!menuOpen)}>
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
                        <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl flex flex-col gap-4">
                            {[['#features', 'Fonctionnalités'], ['#how-it-works', 'Comment ça marche'], ['#pricing', 'Tarifs']].map(([href, label]) => (
                                <a key={href} href={href} onClick={() => setMenuOpen(false)} className="text-base font-semibold p-2 text-zinc-100">{label}</a>
                            ))}
                            <div className="h-px bg-white/10 my-2" />
                            {user ? (
                                <Link to="/dashboard" className="bg-white text-black font-semibold py-3 rounded-xl text-center">Tableau de bord</Link>
                            ) : (
                                <>
                                    <Link to="/auth/login" className="bg-zinc-800 text-white font-semibold py-3 rounded-xl text-center">Connexion</Link>
                                    <Link to="/auth/register" className="bg-white text-black font-semibold py-3 rounded-xl text-center">Commencer gratuitement</Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HERO SECTION */}
            <main className="relative z-10 pt-40 pb-20 lg:pt-52 lg:pb-32 px-4 sm:px-6 flex flex-col items-center justify-center text-center w-full min-w-[100px]">
                <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-4xl mx-auto w-full min-w-[100px]">
                    
                    <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tighter leading-[1.1]">
                        Le moteur natif de <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">votre application web.</span>
                    </motion.h1>

                    <motion.p variants={fadeUp} className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto font-medium">
                        Convertissez n'importe quel site web en application iOS et Android ultra-performante. Push, Mode Hors-Ligne et Monétisation natifs. Zéro code.
                    </motion.p>

                    <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 w-full max-w-md mx-auto min-w-[100px]">
                        <div className="relative w-full group min-w-[100px]">
                            <div className="absolute inset-y-0 left-3 sm:left-4 flex items-center pointer-events-none">
                                <Globe className="text-zinc-500" size={18} />
                            </div>
                            <input 
                                type="url" 
                                placeholder="https://votre-site.com"
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                className="w-full pl-10 sm:pl-12 pr-28 sm:pr-32 py-4 bg-zinc-900 border border-white/10 hover:border-white/20 rounded-full text-white placeholder-zinc-500 font-medium text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xl"
                            />
                            <button 
                                onClick={handleCreate}
                                className="absolute inset-y-1.5 right-1.5 bg-white hover:bg-zinc-200 text-black px-4 sm:px-6 rounded-full font-bold transition-all flex items-center gap-1 sm:gap-2 cursor-pointer text-xs sm:text-sm whitespace-nowrap"
                            >
                                Créer <ArrowRight size={16} />
                            </button>
                        </div>
                    </motion.div>

                    <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center gap-6 text-xs text-zinc-500 font-medium">
                        <div className="flex items-center gap-1.5"><CheckCircle size={14} className="text-zinc-400" /> Pas de carte requise</div>
                        <div className="flex items-center gap-1.5"><CheckCircle size={14} className="text-zinc-400" /> Génération en 3 min</div>
                    </motion.div>
                </motion.div>

                {/* ABSTRACT HERO VISUAL */}
                <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }} className="mt-20 relative w-full max-w-5xl mx-auto h-[400px] rounded-t-3xl border-t border-x border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden flex items-center justify-center">
                    
                    {/* Grid Pattern inside */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                    {/* Floating Abstract UI Cards */}
                    <div className="relative w-full h-full flex items-center justify-center">
                        <motion.div animate={{ y: [-10, 10, -10] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute z-20 left-[20%] top-[25%] w-64 p-5 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-xl shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500"><Bell size={16}/></div>
                                <div className="flex-1">
                                    <div className="h-2 w-1/2 bg-zinc-700 rounded-full mb-2" />
                                    <div className="h-2 w-3/4 bg-zinc-800 rounded-full" />
                                </div>
                            </div>
                            <div className="h-2 w-full bg-zinc-800 rounded-full mb-2" />
                            <div className="h-2 w-5/6 bg-zinc-800 rounded-full" />
                        </motion.div>

                        <motion.div animate={{ y: [10, -10, 10] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute z-10 right-[25%] bottom-[20%] w-56 p-4 rounded-2xl bg-zinc-900/90 border border-white/10 backdrop-blur-xl shadow-2xl">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500"><DollarSign size={16}/></div>
                                <span className="text-xs font-semibold text-zinc-300">AdMob Ready</span>
                            </div>
                            <div className="flex gap-2">
                                <div className="w-full h-12 rounded-lg bg-zinc-800" />
                                <div className="w-full h-12 rounded-lg bg-zinc-800" />
                            </div>
                        </motion.div>

                        <div className="absolute z-0 w-80 h-80 bg-blue-600/20 rounded-full blur-[80px]" />
                    </div>
                    
                    {/* Fade out bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent z-30" />
                </motion.div>
            </main>

            {/* BENTO GRID FEATURES */}
            <section id="features" className="py-24 px-4 sm:px-6 relative z-10 bg-zinc-950 border-t border-white/5">
                <div className="max-w-6xl mx-auto w-full min-w-[100px]">
                    <div className="text-left mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Fonctionnalités natives.</h2>
                        <p className="text-zinc-400 text-lg max-w-xl">Tout l'écosystème mobile, injecté directement dans votre application web existante.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* BENTO 1: PUSH */}
                        <div className="md:col-span-2 rounded-2xl bg-zinc-900/50 border border-white/10 p-8 flex flex-col hover:bg-zinc-900 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                <Bell size={20} className="text-zinc-100" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Push Notifications via Firebase</h3>
                            <p className="text-zinc-400 text-sm max-w-md">Engagez votre audience avec des notifications ciblées, des statistiques de livraison, et une intégration native iOS/Android transparente.</p>
                        </div>

                        {/* BENTO 2: ADMOB */}
                        <div className="md:col-span-1 rounded-2xl bg-zinc-900/50 border border-white/10 p-8 flex flex-col hover:bg-zinc-900 transition-colors">
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                    <DollarSign size={20} className="text-zinc-100" />
                                </div>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Monétisation</h3>
                            <p className="text-zinc-400 text-sm">Bannières et Interstitiels AdMob gérés nativement pour maximiser vos revenus.</p>
                        </div>

                        {/* BENTO 3: OFFLINE */}
                        <div className="md:col-span-1 rounded-2xl bg-zinc-900/50 border border-white/10 p-8 flex flex-col hover:bg-zinc-900 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                <Wifi size={20} className="text-zinc-100" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Mode Hors-Ligne</h3>
                            <p className="text-zinc-400 text-sm">Cache intelligent. L'application reste active même lors des pertes réseau.</p>
                        </div>

                        {/* BENTO 4: PULL TO REFRESH */}
                        <div className="md:col-span-2 rounded-2xl bg-zinc-900/50 border border-white/10 p-8 flex flex-col sm:flex-row items-center gap-8 hover:bg-zinc-900 transition-colors">
                            <div className="flex-1">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                    <RefreshCw size={20} className="text-zinc-100" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Composants Natifs</h3>
                                <p className="text-zinc-400 text-sm">Pull-to-refresh natif, barres de progression système, et navigation gestuelle fluide.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS (Timeline) */}
            <section id="how-it-works" className="py-24 px-4 sm:px-6 relative z-10 border-t border-white/5">
                <div className="max-w-4xl mx-auto w-full min-w-[100px]">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Déploiement en 3 étapes.</h2>
                    </div>

                    <div className="space-y-12 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-[27px] top-4 bottom-4 w-px bg-white/10" />

                        {[
                            { icon: Globe, title: 'Connectez l\'URL', desc: 'Indiquez l\'adresse de votre site web, PWA ou boutique Shopify.' },
                            { icon: Layers, title: 'Configurez les modules', desc: 'Activez les fonctionnalités natives souhaitées depuis votre tableau de bord.' },
                            { icon: Cpu, title: 'Générez & Publiez', desc: 'Obtenez votre fichier APK final, prêt à être déployé sur les stores.' }
                        ].map((item, i) => (
                            <div key={i} className="relative flex gap-8 items-start">
                                <div className="w-14 h-14 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center relative z-10 shadow-lg">
                                    <item.icon size={20} className="text-white" />
                                </div>
                                <div className="pt-3">
                                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                                    <p className="text-zinc-400 text-sm">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING SECTION */}
            <section id="pricing" className="py-24 px-6 relative z-10 border-t border-white/5 bg-zinc-950">
                <div className="max-w-6xl mx-auto w-full min-w-[100px]">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Tarification claire.</h2>
                        <p className="text-zinc-400 text-lg max-w-xl mx-auto">Choisissez le forfait qui correspond le mieux à votre projet.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Plan Gratuit */}
                        <div className="rounded-3xl bg-zinc-900/50 border border-white/10 p-8 flex flex-col hover:border-white/20 transition-all w-full min-w-[100px]">
                            <h3 className="text-xl font-bold mb-2">Test</h3>
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-4xl font-extrabold">0</span>
                                <span className="text-zinc-500 font-medium">FCFA</span>
                            </div>
                            <p className="text-sm text-zinc-400 mb-8">Idéal pour tester l'application générée.</p>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-zinc-300"><CheckCircle size={16} className="text-zinc-500" /> Génération APK</li>
                                <li className="flex items-center gap-3 text-sm text-zinc-300"><CheckCircle size={16} className="text-zinc-500" /> Bannière Publicitaire (Test)</li>
                            </ul>
                            <Link to="/auth/register" className="w-full text-center py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-semibold transition-colors">Commencer gratuitement</Link>
                        </div>

                        {/* Plan Annuel */}
                        <div className="rounded-3xl bg-gradient-to-b from-blue-900/40 to-zinc-900/50 border border-blue-500/30 p-8 flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-blue-900/20 w-full min-w-[100px]">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Populaire</div>
                            <h3 className="text-xl font-bold mb-2 text-white">Annuel</h3>
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-4xl font-extrabold text-white">Abonnement</span>
                            </div>
                            <p className="text-sm text-zinc-400 mb-8">Pour les professionnels sérieux.</p>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-zinc-100"><CheckCircle size={16} className="text-blue-500" /> Génération APK Illimitée</li>
                                <li className="flex items-center gap-3 text-sm text-zinc-100"><CheckCircle size={16} className="text-blue-500" /> Notifications Push natives</li>
                                <li className="flex items-center gap-3 text-sm text-zinc-100"><CheckCircle size={16} className="text-blue-500" /> Sans publicité / Votre AdMob</li>
                                <li className="flex items-center gap-3 text-sm text-zinc-100"><CheckCircle size={16} className="text-blue-500" /> Support prioritaire</li>
                            </ul>
                            <Link to="/auth/register" className="w-full text-center py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/25 transition-all">S'abonner</Link>
                        </div>

                        {/* Plan Lifetime */}
                        <div className="rounded-3xl bg-zinc-900/50 border border-white/10 p-8 flex flex-col hover:border-white/20 transition-all w-full min-w-[100px]">
                            <h3 className="text-xl font-bold mb-2">À Vie</h3>
                            <div className="flex items-baseline gap-2 mb-6">
                                <span className="text-4xl font-extrabold">Unique</span>
                            </div>
                            <p className="text-sm text-zinc-400 mb-8">Payez une fois, profitez à vie.</p>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center gap-3 text-sm text-zinc-300"><CheckCircle size={16} className="text-amber-500" /> Tout le plan Annuel inclus</li>
                                <li className="flex items-center gap-3 text-sm text-zinc-300"><CheckCircle size={16} className="text-amber-500" /> Mises à jour à vie gratuites</li>
                                <li className="flex items-center gap-3 text-sm text-zinc-300"><CheckCircle size={16} className="text-amber-500" /> Zéro abonnement récurrent</li>
                            </ul>
                            <Link to="/auth/register" className="w-full text-center py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-semibold transition-colors">Acheter à vie</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="py-32 px-4 sm:px-6 relative z-10 border-t border-white/5 bg-zinc-900/30">
                <div className="max-w-4xl mx-auto text-center relative z-10 w-full min-w-[100px]">
                    <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight break-words">Passez au niveau supérieur.</h2>
                    <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto font-medium">
                        Offrez à vos utilisateurs l'expérience mobile qu'ils méritent en moins de 3 minutes.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                        <Link to="/auth/register" className="w-full sm:w-auto bg-white text-black px-8 py-3.5 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors text-center">
                            Commencer maintenant
                        </Link>
                        <Link to="/auth/login" className="w-full sm:w-auto bg-zinc-900 border border-white/10 text-white px-8 py-3.5 rounded-full text-sm font-semibold hover:bg-zinc-800 transition-colors text-center">
                            J'ai déjà un compte
                        </Link>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-white/10 py-10 px-4 sm:px-6 relative z-10">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 w-full min-w-[100px]">
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-zinc-500" />
                        <span className="font-bold text-lg tracking-tight text-zinc-500">Site2App</span>
                    </div>
                    <div className="flex gap-6 text-xs text-zinc-600 font-medium">
                        <Link to="/terms" className="hover:text-zinc-300 transition-colors">CGV</Link>
                        <Link to="/privacy" className="hover:text-zinc-300 transition-colors">Confidentialité</Link>
                        <a href="mailto:support@site2app.com" className="hover:text-zinc-300 transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
