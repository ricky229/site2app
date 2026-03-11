import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    Zap, ArrowRight, Smartphone, Bell, Wifi, MapPin, Camera,
    Shield, BarChart2, RefreshCw, Download, Globe, CheckCircle,
    Star, ChevronRight, Play, Code, Palette, Settings,
    Users, TrendingUp, Clock, Award, Menu, X, Moon, Sun
} from 'lucide-react'

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
}

const stagger = {
    visible: { transition: { staggerChildren: 0.1 } },
}

const features = [
    { icon: Bell, title: 'Notifications Push', description: 'Envoyez des notifications ciblées à vos utilisateurs via Firebase FCM — gratuitement.', color: '#f59e0b' },
    { icon: Wifi, title: 'Mode Hors-ligne', description: 'Votre app fonctionne même sans connexion grâce au cache intelligent.', color: '#10b981' },
    { icon: MapPin, title: 'Géolocalisation', description: 'Accédez à la position GPS de vos utilisateurs pour des expériences localisées.', color: '#3b82f6' },
    { icon: Camera, title: 'Caméra & Galerie', description: 'Permettez à vos utilisateurs de prendre des photos et accéder à leur galerie.', color: '#8b5cf6' },
    { icon: Shield, title: 'Biométrie', description: 'Sécurisez votre app avec Face ID ou empreinte digitale.', color: '#ef4444' },
    { icon: BarChart2, title: 'Analytics Intégré', description: 'Dashboard analytics avec pages vues, rétention, et statistiques en temps réel.', color: '#06b6d4' },
    { icon: Code, title: 'CSS/JS Custom', description: 'Injectez du CSS et JavaScript personnalisé pour adapter l\'apparence.', color: '#f97316' },
    { icon: RefreshCw, title: 'OTA Updates', description: 'Mettez à jour votre app sans repasser par le store.', color: '#84cc16' },
    { icon: Download, title: 'Téléchargements', description: 'Gestion native des téléchargements de fichiers depuis votre site.', color: '#ec4899' },
    { icon: Globe, title: 'Deep Linking', description: 'Ouvrez des pages spécifiques de votre app depuis des liens web.', color: '#14b8a6' },
    { icon: Palette, title: 'Design Natif', description: 'Splash screen, icônes adaptatives, couleurs — tout personnalisable.', color: '#a855f7' },
    { icon: Settings, title: 'AdMob', description: 'Monétisez votre app avec des bannières et interstitiels Google AdMob.', color: '#6366f1' },
]

const steps = [
    { num: '01', icon: Globe, title: 'Collez votre URL', desc: 'Entrez l\'URL de votre site web. Notre IA analyse automatiquement les couleurs, le logo, et les performances.', color: '#3461f5' },
    { num: '02', icon: Palette, title: 'Personnalisez', desc: 'Choisissez l\'icône, les couleurs, le thème, et activez les fonctionnalités natives que vous voulez.', color: '#7c3aed' },
    { num: '03', icon: Download, title: 'Téléchargez', desc: 'Votre APK Android ou IPA iOS est généré en quelques minutes. Prêt à publier sur les stores.', color: '#10b981' },
]

const testimonials = [
    { name: 'Marie Dupont', role: 'Fondatrice, ShopLocal.fr', avatar: 'MD', text: 'En 10 minutes, mon site e-commerce est devenu une vraie app mobile avec push notifications. Mes ventes ont augmenté de 35%.', stars: 5 },
    { name: 'Thomas Laurent', role: 'Dev Freelance', avatar: 'TL', text: 'Je l\'utilise pour tous mes clients. La qualité du WebView est impressionnante, et les notifications push marchent parfaitement.', stars: 5 },
    { name: 'Sarah Benali', role: 'CEO, RestauPro', avatar: 'SB', text: 'Notre app restaurant avec commandes en ligne, géolocalisation et notifications de livraison. Mes clients adorent.', stars: 5 },
    { name: 'Pierre Martin', role: 'Blogueur Tech', avatar: 'PM', text: 'J\'ai converti mon blog en app en 5 minutes. Le mode hors-ligne et les notifications push ont triplé mon engagement.', stars: 5 },
]

const pricingPlans = [
    {
        name: 'Gratuit',
        price: 0,
        desc: 'Pour commencer',
        features: ['1 application', '2 builds/mois', 'Android uniquement', 'Notifications push basiques', 'Branding Site2App'],
        cta: 'Commencer gratuitement',
    },
    {
        name: 'Starter',
        price: 19,
        desc: 'Pour les indépendants',
        features: ['5 applications', '20 builds/mois', 'Android & iOS', 'Notifications push avancées', 'Sans branding', 'Analytics de base', 'Support email'],
        cta: 'Essai gratuit 14 jours',
        highlighted: true,
        badge: '🔥 Populaire',
    },
    {
        name: 'Pro',
        price: 49,
        desc: 'Pour les équipes',
        features: ['Apps illimitées', 'Builds illimités', 'Android & iOS', 'Toutes les fonctionnalités', 'Analytics avancés', 'API access', 'Support prioritaire', 'OTA Updates', 'AdMob'],
        cta: 'Essai gratuit 14 jours',
    },
    {
        name: 'Enterprise',
        price: 149,
        desc: 'Pour les grandes entreprises',
        features: ['Tout Pro inclus', 'Builds dédiés', 'SLA 99.9%', 'Onboarding personnalisé', 'Manager dédié', 'SSO', 'Audit logs', 'Contract sur mesure'],
        cta: 'Contacter commercial',
    },
]

export default function LandingPage() {
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)
    const [darkMode, setDarkMode] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [urlInput, setUrlInput] = useState('')

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 10)
        window.addEventListener('scroll', handler)
        return () => window.removeEventListener('scroll', handler)
    }, [])

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode)
    }, [darkMode])

    const handleTryNow = () => {
        navigate('/auth/register')
    }

    return (
        <div style={{ background: 'var(--surface-0)', color: 'var(--text-primary)' }}>
            {/* ===== NAVBAR ===== */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'navbar-scrolled' : ''}`}
                style={{
                    borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
                }}
            >
                <div className="container flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
                            <Zap size={16} color="white" />
                        </div>
                        <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Site2App</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-1">
                        {[['#features', 'Fonctionnalités'], ['#how', 'Comment ça marche'], ['#pricing', 'Tarifs'], ['#testimonials', 'Témoignages']].map(([href, label]) => (
                            <a key={href} href={href} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--surface-2)]" style={{ color: 'var(--text-secondary)' }}>
                                {label}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center gap-3">
                        <button onClick={() => setDarkMode(d => !d)} className="btn btn-ghost btn-sm p-2">
                            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        <Link to="/auth/login" className="btn btn-ghost btn-sm">Connexion</Link>
                        <Link to="/auth/register" className="btn btn-primary btn-sm">
                            Commencer gratuitement <ArrowRight size={14} />
                        </Link>
                    </div>

                    <button className="md:hidden btn btn-ghost btn-sm p-2" onClick={() => setMenuOpen(!menuOpen)}>
                        {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
                {/* Remove duplicate hamburger that appeared on the far right */}

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden border-t p-4 space-y-2" style={{ background: 'var(--surface-0)', borderColor: 'var(--border)' }}>
                        {[['#features', 'Fonctionnalités'], ['#how', 'Comment ça marche'], ['#pricing', 'Tarifs']].map(([href, label]) => (
                            <a key={href} href={href} className="block px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>{label}</a>
                        ))}
                        <div className="pt-2 flex flex-col gap-2">
                            <Link to="/auth/login" className="btn btn-secondary w-full">Connexion</Link>
                            <Link to="/auth/register" className="btn btn-primary w-full">Créer un compte</Link>
                        </div>
                    </div>
                )}
            </header>

            {/* ===== HERO ===== */}
            <section className="hero-bg min-h-screen flex items-center" style={{ paddingTop: '5rem' }}>
                <div className="hero-grid" />
                <div className="container text-center relative z-10">
                    <motion.div initial="hidden" animate="visible" variants={stagger}>
                        <motion.div variants={fadeUp} className="mb-6">
                            <span className="badge badge-brand text-sm px-4 py-1.5">
                                🚀 Nouveau — iOS & Android en quelques minutes
                            </span>
                        </motion.div>

                        <motion.h1 variants={fadeUp} className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
                            Convertissez votre site<br />
                            <span className="text-gradient">en app mobile native</span>
                        </motion.h1>

                        <motion.p variants={fadeUp} className="text-base sm:text-xl md:text-2xl mb-6 sm:mb-10 max-w-3xl mx-auto px-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            Sans code. En quelques minutes. Avec push notifications, mode hors-ligne,
                            géolocalisation et bien plus — prêt à publier sur Google Play et l'App Store.
                        </motion.p>

                        {/* URL Input Hero */}
                        <motion.div variants={fadeUp} className="max-w-2xl mx-auto mb-8">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-2 rounded-2xl" style={{ background: 'var(--surface-0)', border: '2px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>
                                <div className="flex items-center gap-2 px-3">
                                    <Globe size={20} style={{ color: 'var(--text-muted)' }} />
                                </div>
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    placeholder="https://monsite.fr"
                                    className="flex-1 bg-transparent outline-none text-lg"
                                    style={{ color: 'var(--text-primary)' }}
                                />
                                <button
                                    onClick={handleTryNow}
                                    className="btn btn-primary btn-lg flex-shrink-0"
                                    style={{ padding: '0.75rem 1.5rem' }}
                                >
                                    Convertir → <ArrowRight size={16} />
                                </button>
                            </div>
                            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                                Aucune carte bancaire requise • Plan gratuit disponible • Génération en ~3 minutes
                            </p>
                        </motion.div>

                        {/* Social proof */}
                        <motion.div variants={fadeUp} className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    {['#3461f5', '#7c3aed', '#10b981', '#f59e0b'].map((c, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white" style={{ background: c }}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                    ))}
                                </div>
                                <span><strong style={{ color: 'var(--text-primary)' }}>12,000+</strong> apps créées</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />)}
                                <span><strong style={{ color: 'var(--text-primary)' }}>4.9/5</strong> satisfaction</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle size={14} style={{ color: '#10b981' }} />
                                <span>98.7% taux de succès des builds</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Hero Visual - Phone Mockup */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="mt-16 flex justify-center"
                    >
                        <div className="relative">
                            {/* Glow */}
                            <div className="absolute inset-0 blur-3xl opacity-30 gradient-brand rounded-full scale-75" />

                            {/* Phone */}
                            <div className="phone-mockup relative z-10 animate-float">
                                <div className="phone-notch" />
                                <div className="phone-screen" style={{ background: 'linear-gradient(to bottom, #2563eb, #7e22ce)' }}>
                                    {/* Status bar */}
                                    <div className="flex justify-between px-6 pt-8 pb-2">
                                        <span className="text-white text-xs font-semibold">9:41</span>
                                        <div className="flex gap-1 items-center">
                                            <div className="w-4 h-2 border border-white rounded-sm opacity-80">
                                                <div className="w-3/4 h-full bg-white rounded-sm" />
                                            </div>
                                        </div>
                                    </div>
                                    {/* App content */}
                                    <div className="p-4 mt-2">
                                        <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                            <div className="w-12 h-12 rounded-xl bg-white mb-3 flex items-center justify-center">
                                                <Zap size={22} color="#3461f5" />
                                            </div>
                                            <div className="h-3 rounded mb-2 w-3/4" style={{ background: 'rgba(255,255,255,0.6)' }} />
                                            <div className="h-2 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.4)' }} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['#10b981', '#f59e0b', '#3461f5', '#ec4899'].map((c, i) => (
                                                <div key={i} className="rounded-xl p-3" style={{ background: `${c}20` }}>
                                                    <div className="w-6 h-6 rounded-lg mb-2" style={{ background: c }} />
                                                    <div className="h-2 rounded" style={{ background: `${c}60`, width: '80%' }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Notification bubble */}
                                    <div className="absolute top-20 -right-4 card p-2 w-40 animate-bounce-subtle hidden sm:block" style={{ animationDelay: '1s' }}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full" style={{ background: '#3461f5' }}>
                                                <Bell size={12} color="white" style={{ margin: 'auto', marginTop: '3px' }} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Nouvelle offre !</p>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.2 }}>-20% ce weekend</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats floating */}
                            <div className="absolute -left-28 top-20 card p-3 animate-float hidden lg:block" style={{ animationDelay: '0.7s', minWidth: '140px' }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp size={14} style={{ color: '#10b981' }} />
                                    <span className="text-xs font-semibold" style={{ color: '#10b981' }}>+127%</span>
                                </div>
                                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Engagement</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>vs site mobile</p>
                            </div>

                            <div className="absolute -right-28 bottom-20 card p-3 animate-float hidden lg:block" style={{ animationDelay: '1.2s', minWidth: '140px' }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock size={14} style={{ color: '#f59e0b' }} />
                                    <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>~3 min</span>
                                </div>
                                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Temps de build</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>APK & IPA</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ===== HOW IT WORKS ===== */}
            <section id="how" className="section">
                <div className="container">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={stagger}
                        className="text-center mb-16"
                    >
                        <motion.p variants={fadeUp} className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--brand-500)' }}>
                            Simple comme bonjour
                        </motion.p>
                        <motion.h2 variants={fadeUp} className="text-2xl sm:text-4xl font-bold mb-4">Comment ça marche ?</motion.h2>
                        <motion.p variants={fadeUp} className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                            De votre URL à l'APK prête à publier en 3 étapes et quelques minutes.
                        </motion.p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Connectors */}
                        <div className="hidden md:block absolute top-16 left-1/3 right-1/3 h-0.5" style={{ background: 'linear-gradient(90deg, #3461f5, #7c3aed)' }} />

                        {steps.map((step, i) => (
                            <motion.div
                                key={step.num}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: i * 0.15 }}
                                viewport={{ once: true }}
                                className="card p-8 text-center card-hover"
                            >
                                <div className="relative w-16 h-16 mx-auto mb-6">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                                        style={{ background: `${step.color}18` }}>
                                        <step.icon size={28} style={{ color: step.color }} />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                        style={{ background: step.color }}>
                                        {i + 1}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== FEATURES ===== */}
            <section id="features" className="section" style={{ background: 'var(--surface-1)' }}>
                <div className="container">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={stagger}
                        className="text-center mb-16"
                    >
                        <motion.p variants={fadeUp} className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--brand-500)' }}>
                            Tout ce dont vous avez besoin
                        </motion.p>
                        <motion.h2 variants={fadeUp} className="text-2xl sm:text-4xl font-bold mb-4">Fonctionnalités natives</motion.h2>
                        <motion.p variants={fadeUp} className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                            Activez ou désactivez chaque fonctionnalité selon vos besoins.
                            Aucune connaissance en développement requise.
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={stagger}
                        className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5"
                    >
                        {features.map((f, i) => (
                            <motion.div
                                key={f.title}
                                variants={fadeUp}
                                className="feature-card"
                            >
                                <div
                                    className="feature-icon-wrapper"
                                    style={{ background: `${f.color}18`, color: f.color }}
                                >
                                    <f.icon size={22} />
                                </div>
                                <h3 className="font-semibold mb-2">{f.title}</h3>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.description}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ===== TESTIMONIALS ===== */}
            <section id="testimonials" className="section">
                <div className="container">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={stagger}
                        className="text-center mb-16"
                    >
                        <motion.p variants={fadeUp} className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--brand-500)' }}>
                            Ils nous font confiance
                        </motion.p>
                        <motion.h2 variants={fadeUp} className="text-2xl sm:text-4xl font-bold mb-4">Ce que disent nos clients</motion.h2>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={stagger}
                        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {testimonials.map((t, i) => (
                            <motion.div key={t.name} variants={fadeUp} className="card p-6 card-hover">
                                <div className="flex gap-1 mb-4">
                                    {Array.from({ length: t.stars }).map((_, j) => (
                                        <Star key={j} size={14} fill="#f59e0b" color="#f59e0b" />
                                    ))}
                                </div>
                                <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="avatar w-9 h-9 text-sm"
                                        style={{ background: ['#3461f5', '#7c3aed', '#10b981', '#f59e0b'][i] }}>
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{t.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.role}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ===== PRICING ===== */}
            <section id="pricing" className="section" style={{ background: 'var(--surface-1)' }}>
                <div className="container">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={stagger}
                        className="text-center mb-16"
                    >
                        <motion.p variants={fadeUp} className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--brand-500)' }}>
                            Transparent et sans surprise
                        </motion.p>
                        <motion.h2 variants={fadeUp} className="text-2xl sm:text-4xl font-bold mb-4">Tarifs simples</motion.h2>
                        <motion.p variants={fadeUp} className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                            Commencez gratuitement. Upgradez quand vous êtes prêt.
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={stagger}
                        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
                    >
                        {pricingPlans.map((plan, i) => (
                            <motion.div
                                key={plan.name}
                                variants={fadeUp}
                                className={`pricing-card ${plan.highlighted ? 'featured' : ''}`}
                            >
                                {plan.badge && (
                                    <div className="absolute top-4 right-4">
                                        <span className="badge badge-brand text-xs">{plan.badge}</span>
                                    </div>
                                )}
                                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{plan.desc}</p>
                                <div className="mb-5">
                                    <span className="text-4xl font-bold">{plan.price === 0 ? 'Gratuit' : `${plan.price}€`}</span>
                                    {plan.price > 0 && <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>/mois</span>}
                                </div>
                                <ul className="space-y-2.5 mb-6">
                                    {plan.features.map(f => (
                                        <li key={f} className="flex items-center gap-2 text-sm">
                                            <CheckCircle size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                                            <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    to="/auth/register"
                                    className={`btn w-full ${plan.highlighted ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    {plan.cta}
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ===== CTA BANNER ===== */}
            <section className="section">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true }}
                        className="rounded-3xl p-5 sm:p-8 md:p-12 text-center text-white relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #1e40af 0%, #6d28d9 50%, #be185d 100%)' }}
                    >
                        <div className="absolute inset-0 hero-grid opacity-20" />
                        <div className="relative z-10">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                                style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <Zap size={32} color="white" />
                            </div>
                            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4">
                                Prêt à créer votre app ?
                            </h2>
                            <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
                                Rejoignez 12,000+ créateurs qui ont déjà transformé leur site en application mobile native.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <Link to="/auth/register" className="btn btn-xl text-white"
                                    style={{ background: 'white', color: '#1e40af', fontWeight: 700 }}>
                                    Commencer gratuitement <ArrowRight size={18} />
                                </Link>
                                <a href="#how" className="btn btn-xl" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                                    <Play size={16} /> Voir la démo
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--border)', padding: '3rem 1.5rem 2rem' }}>
                <div className="container">
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
                                    <Zap size={16} color="white" />
                                </div>
                                <span className="font-bold">Site2App</span>
                            </div>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                La plateforme No-Code pour convertir votre site web en application mobile native.
                            </p>
                            <div className="flex gap-3">
                                {['twitter', 'github', 'linkedin'].map(s => (
                                    <a key={s} href="#" className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold uppercase"
                                        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                                        {s[0]}
                                    </a>
                                ))}
                            </div>
                        </div>
                        {[
                            { title: 'Produit', links: ['Fonctionnalités', 'Tarifs', 'Changelog', 'Roadmap', 'API'] },
                            { title: 'Entreprise', links: ['À propos', 'Blog', 'Carrières', 'Presse', 'Contact'] },
                            { title: 'Légal', links: ['CGU', 'Politique de confidentialité', 'Cookies', 'RGPD', 'Sécurité'] },
                        ].map(col => (
                            <div key={col.title}>
                                <h4 className="font-semibold mb-4 text-sm">{col.title}</h4>
                                <ul className="space-y-2.5">
                                    {col.links.map(l => (
                                        <li key={l}><a href="#" className="text-sm hover:text-[var(--brand-500)] transition-colors" style={{ color: 'var(--text-secondary)' }}>{l}</a></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="divider mb-6" />
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            © 2026 Site2App. Tous droits réservés.
                        </p>
                        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <span>🇫🇷 Français</span>
                            <span>•</span>
                            <span>Made with ❤️ in France</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
