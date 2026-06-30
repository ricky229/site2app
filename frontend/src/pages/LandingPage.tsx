import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
    Zap, ArrowRight, Smartphone, Bell, Wifi, MapPin, Camera,
    Shield, BarChart2, RefreshCw, Download, Globe, CheckCircle,
    Star, Menu, X, Moon, Sun, Play, Code, Palette, Settings,
    TrendingUp, Clock, ChevronRight
} from 'lucide-react'

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
}

const stagger = {
    visible: { transition: { staggerChildren: 0.15 } },
}

const features = [
    { icon: Bell, title: 'Notifications Push', description: 'Envoyez des alertes instantanées. 100% gratuit.', color: 'f59e0b', span: 'col-span-1 md:col-span-2' },
    { icon: Wifi, title: 'Mode Hors-ligne', description: 'Vos apps fonctionnent sans connexion via cache.', color: '10b981', span: 'col-span-1' },
    { icon: MapPin, title: 'Géolocalisation', description: 'Expériences localisées et GPS en temps réel.', color: '3b82f6', span: 'col-span-1' },
    { icon: Shield, title: 'Face ID', description: 'Sécurité biométrique native intégrée.', color: 'ef4444', span: 'col-span-1 md:col-span-2' },
]

export default function LandingPage() {
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const [darkMode, setDarkMode] = useState(() => {
        return document.documentElement.classList.contains('dark') || 
               (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    })
    const [scrolled, setScrolled] = useState(false)
    const [urlInput, setUrlInput] = useState('')
    const { scrollY } = useScroll()
    const y1 = useTransform(scrollY, [0, 1000], [0, 200])
    const y2 = useTransform(scrollY, [0, 1000], [0, -100])

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

    return (
        <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)] font-sans overflow-hidden selection:bg-blue-500/30">
            
            {/* Background Orbs */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px] mix-blend-screen" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-purple-500/20 blur-[120px] mix-blend-screen" />
            </div>

            {/* NAVBAR */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'py-3 backdrop-blur-xl bg-[var(--surface-0)]/80 shadow-sm border-b border-[var(--border)]' : 'py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <Zap size={20} color="white" />
                        </div>
                        <span className="font-black text-xl tracking-tight">Site2App</span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-8">
                        {[['#how', 'Comment ça marche'], ['#features', 'Fonctionnalités'], ['#pricing', 'Tarifs']].map(([href, label]) => (
                            <a key={href} href={href} className="text-sm font-bold text-[var(--text-secondary)] hover:text-blue-500 transition-colors">
                                {label}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden lg:flex items-center gap-4">
                        <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors border border-[var(--border)]">
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <Link to="/auth/login" className="text-sm font-bold px-4 hover:text-blue-500 transition-colors">Connexion</Link>
                        <Link to="/auth/register" className="bg-[var(--text-primary)] text-[var(--surface-0)] px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:scale-105 transition-all">
                            Démarrer
                        </Link>
                    </div>

                    <button className="lg:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* MOBILE MENU */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-x-0 top-[72px] p-4 z-40 lg:hidden"
                    >
                        <div className="bg-[var(--surface-0)]/90 backdrop-blur-2xl border border-[var(--border)] p-6 rounded-3xl shadow-2xl flex flex-col gap-4">
                            {[['#how', 'Comment ça marche'], ['#features', 'Fonctionnalités'], ['#pricing', 'Tarifs']].map(([href, label]) => (
                                <a key={href} href={href} onClick={() => setMenuOpen(false)} className="text-lg font-bold p-2">{label}</a>
                            ))}
                            <div className="h-px bg-[var(--border)] my-2" />
                            <Link to="/auth/login" className="btn btn-secondary w-full">Connexion</Link>
                            <Link to="/auth/register" className="btn btn-primary w-full">Démarrer gratuitement</Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HERO SECTION */}
            <main className="relative z-10 pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <motion.div initial="hidden" animate="visible" variants={stagger} className="flex-1 text-center lg:text-left">
                        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm font-bold mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            v2.0 est en ligne
                        </motion.div>

                        <motion.h1 variants={fadeUp} className="text-2xl md:text-4xl font-black mb-6 leading-[1.1] tracking-tight">
                            Transformez votre site en <br className="hidden lg:block"/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">App Native.</span>
                        </motion.h1>

                        <motion.p variants={fadeUp} className="text-lg lg:text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed">
                            Passez du Web aux Stores (iOS & Android) en quelques clics. 
                            Intégrez Push Notifications, Face ID, et mode Hors-Ligne sans écrire une seule ligne de code.
                        </motion.p>

                        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            <div className="relative w-full max-w-md group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Globe className="text-blue-500" size={20} />
                                </div>
                                <input 
                                    type="url" 
                                    placeholder="https://votre-site.com"
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    className="w-full pl-12 pr-40 py-4 bg-[var(--surface-1)] border-2 border-[var(--border)] rounded-full text-[var(--text-primary)] font-medium focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                                />
                                <button 
                                    onClick={() => navigate('/auth/register')}
                                    className="absolute inset-y-1.5 right-1.5 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-full font-bold shadow-md transition-all flex items-center gap-2"
                                >
                                    Créer <ArrowRight size={16} />
                                </button>
                            </div>
                        </motion.div>

                        <motion.div variants={fadeUp} className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm text-[var(--text-muted)] font-semibold">
                            <div className="flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-500" /> Pas de carte bancaire</div>
                            <div className="flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-500" /> Génération en 3 min</div>
                        </motion.div>
                    </motion.div>

                    {/* HERO VISUAL */}
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2 }} className="flex-1 relative hidden md:block">
                        <div className="relative w-full max-w-[400px] mx-auto aspect-[1/2]">
                            <motion.div style={{ y: y1 }} className="absolute -left-12 top-20 bg-[var(--surface-0)] border border-[var(--border)] p-4 rounded-2xl shadow-xl z-20 flex items-center gap-4 backdrop-blur-xl">
                                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center"><Download size={24} /></div>
                                <div><p className="font-bold">APK Généré</p><p className="text-xs text-[var(--text-muted)]">Prêt pour le Play Store</p></div>
                            </motion.div>
                            
                            <motion.div style={{ y: y2 }} className="absolute -right-12 bottom-32 bg-[var(--surface-0)] border border-[var(--border)] p-4 rounded-2xl shadow-xl z-20 flex items-center gap-4 backdrop-blur-xl">
                                <div className="w-12 h-12 bg-purple-500/20 text-purple-500 rounded-xl flex items-center justify-center"><Bell size={24} /></div>
                                <div><p className="font-bold">Push Envoyé</p><p className="text-xs text-[var(--text-muted)]">12,403 livrés</p></div>
                            </motion.div>

                            {/* Main Phone Mockup */}
                            <div className="w-full h-full bg-black rounded-[3rem] p-3 shadow-2xl border-[4px] border-slate-800 relative z-10">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-7 bg-black rounded-b-3xl z-30" />
                                <div className="w-full h-full bg-[var(--surface-1)] rounded-[2.5rem] overflow-hidden relative border border-white/5">
                                    <div className="h-48 bg-gradient-to-br from-blue-600 to-indigo-900 p-6 flex flex-col justify-end relative overflow-hidden">
                                        <div className="absolute top-[-50%] right-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                                        <h2 className="text-white font-black text-2xl relative z-10">Analytics</h2>
                                        <p className="text-blue-200 font-medium relative z-10">Aperçu en temps réel</p>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="bg-[var(--surface-0)] rounded-2xl p-4 shadow-sm border border-[var(--border)]">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="text-xs font-bold text-[var(--text-muted)] uppercase">Utilisateurs Actifs</div>
                                                <div className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg text-xs font-bold">+24%</div>
                                            </div>
                                            <div className="text-3xl font-black">12,845</div>
                                            <div className="mt-4 flex items-end gap-1 h-12">
                                                {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
                                                    <div key={i} className="flex-1 bg-blue-500 rounded-t-sm" style={{ height: `${h}%`, opacity: 0.5 + (i * 0.1) }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* BENTO GRID FEATURES */}
            <section id="features" className="py-24 bg-[var(--surface-1)] relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-2xl md:text-4xl font-black mb-4">La puissance du Natif. <br className="hidden md:block"/> La simplicité du Web.</h2>
                        <p className="text-lg text-[var(--text-secondary)] font-medium max-w-2xl mx-auto">Toutes les fonctionnalités dont vous avez besoin pour engager vos utilisateurs.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <motion.div 
                                key={f.title}
                                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                                className={`bg-[var(--surface-0)] border border-[var(--border)] rounded-[2rem] p-8 shadow-sm hover:shadow-lg transition-all group ${f.span}`}
                            >
                                <div className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center transition-transform group-hover:scale-110`} style={{ backgroundColor: `#${f.color}15`, color: `#${f.color}` }}>
                                    <f.icon size={28} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-2xl font-black mb-3">{f.title}</h3>
                                <p className="text-[var(--text-secondary)] font-medium text-lg leading-relaxed">{f.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-32 relative z-10">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-black mb-6 tracking-tight">Prêt à lancer <br/>votre app ?</h2>
                            <p className="text-xl text-blue-100 font-medium max-w-2xl mx-auto mb-10">Rejoignez des milliers de créateurs. Créez votre compte gratuitement et générez votre première application en 3 minutes.</p>
                            <Link to="/auth/register" className="inline-block bg-white text-blue-900 px-10 py-5 rounded-full font-black text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform">
                                Démarrer gratuitement
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-[var(--border)] bg-[var(--surface-1)] py-12 relative z-10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <Zap size={20} className="text-blue-500" />
                        <span className="font-black text-xl">Site2App</span>
                    </div>
                    <div className="text-[var(--text-muted)] font-medium text-sm">
                        © 2026 Site2App. Tous droits réservés. Construit avec ❤️.
                    </div>
                </div>
            </footer>
        </div>
    )
}
