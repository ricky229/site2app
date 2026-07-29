import { useState, useEffect } from 'react'
import { Check, X, Shield, Zap, Infinity, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'

const COUNTRIES = [
    { id: 'senegal', flag: 'sn', name: 'Sénégal', methods: [ 
        { id: 'wave_senegal', name: 'Wave', color: 'bg-blue-50 text-blue-700 border-blue-200', logoImg: '/logos/wave.svg', logoText: 'W', logoBg: '#1c3faa' }, 
        { id: 'new_orange_money_senegal', name: 'Orange Money', color: 'bg-orange-50 text-orange-700 border-orange-200', logoImg: '/logos/orange.svg', logoText: 'OM', logoBg: '#ff7900' }, 
        { id: 'free_money_senegal', name: 'Free Money', color: 'bg-red-50 text-red-700 border-red-200', logoImg: '/logos/free.svg', logoText: 'F', logoBg: '#da291c' }, 
        { id: 'expresso_senegal', name: 'Expresso', color: 'bg-gray-100 text-gray-700 border-gray-300', logoImg: '/logos/expresso.svg', logoText: 'EX', logoBg: '#595959' } 
    ] },
    { id: 'ci', flag: 'ci', name: 'Côte d\'Ivoire', methods: [ 
        { id: 'wave_ci', name: 'Wave', color: 'bg-blue-50 text-blue-700 border-blue-200', logoImg: '/logos/wave.svg', logoText: 'W', logoBg: '#1c3faa' }, 
        { id: 'orange_money_ci', name: 'Orange Money', color: 'bg-orange-50 text-orange-700 border-orange-200', logoImg: '/logos/orange.svg', logoText: 'OM', logoBg: '#ff7900' }, 
        { id: 'mtn_ci', name: 'MTN', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', logoImg: '/logos/mtn.svg', logoText: 'MTN', logoBg: '#ffcc00', logoColor: '#000' }, 
        { id: 'moov_ci', name: 'Moov', color: 'bg-blue-50 text-blue-800 border-blue-300', logoImg: '/logos/moov.svg', logoText: 'M', logoBg: '#0054a6' } 
    ] },
    { id: 'burkina', flag: 'bf', name: 'Burkina Faso', methods: [ 
        { id: 'orange_money_burkina', name: 'Orange Money', color: 'bg-orange-50 text-orange-700 border-orange-200', logoImg: '/logos/orange.svg', logoText: 'OM', logoBg: '#ff7900' }, 
        { id: 'moov_burkina', name: 'Moov', color: 'bg-blue-50 text-blue-800 border-blue-300', logoImg: '/logos/moov.svg', logoText: 'M', logoBg: '#0054a6' } 
    ] },
    { id: 'benin', flag: 'bj', name: 'Bénin', methods: [ 
        { id: 'mtn_benin', name: 'MTN', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', logoImg: '/logos/mtn.svg', logoText: 'MTN', logoBg: '#ffcc00', logoColor: '#000' }, 
        { id: 'moov_benin', name: 'Moov', color: 'bg-blue-50 text-blue-800 border-blue-300', logoImg: '/logos/moov.svg', logoText: 'M', logoBg: '#0054a6' }, 
        { id: 'celtiis_cash', name: 'Celtiis', color: 'bg-green-50 text-green-700 border-green-200', logoImg: '/logos/celtiis.svg', logoText: 'C', logoBg: '#008b45' } 
    ] },
    { id: 'togo', flag: 'tg', name: 'Togo', methods: [ 
        { id: 'moov_togo', name: 'Moov', color: 'bg-blue-50 text-blue-800 border-blue-300', logoImg: '/logos/moov.svg', logoText: 'M', logoBg: '#0054a6' } 
    ] },
    { id: 'mali', flag: 'ml', name: 'Mali', methods: [ 
        { id: 'orange_money_mali', name: 'Orange Money', color: 'bg-orange-50 text-orange-700 border-orange-200', logoImg: '/logos/orange.svg', logoText: 'OM', logoBg: '#ff7900' }, 
        { id: 'moov_mali', name: 'Moov', color: 'bg-blue-50 text-blue-800 border-blue-300', logoImg: '/logos/moov.svg', logoText: 'M', logoBg: '#0054a6' } 
    ] },
    { id: 'cameroun', flag: 'cm', name: 'Cameroun', methods: [ 
        { id: 'mtn_cameroun', name: 'MTN', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', logoImg: '/logos/mtn.svg', logoText: 'MTN', logoBg: '#ffcc00', logoColor: '#000' } 
    ] }
]

export default function PricingPage() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(null)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [selectedPlanForModal, setSelectedPlanForModal] = useState<string | null>(null)
    const [selectedCountry, setSelectedCountry] = useState('senegal')
    const [paymentMethod, setPaymentMethod] = useState('wave_senegal')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [fullName, setFullName] = useState((user as any)?.fullName || (user as any)?.name || (user as any)?.displayName || '')
    const [email, setEmail] = useState(user?.email || '')
    const [softpayMessage, setSoftpayMessage] = useState<string | null>(null)
    const [softpayUrl, setSoftpayUrl] = useState<string | null>(null)
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
    const [validationCountdown, setValidationCountdown] = useState<number | null>(null)

    useEffect(() => {
        let interval: any;
        if (validationCountdown !== null && validationCountdown > 0) {
            interval = setInterval(() => {
                setValidationCountdown(prev => prev! - 1)
            }, 1000)
        } else if (validationCountdown === 0) {
            setValidationCountdown(null)
            setPaymentStatus('cancelled')
            setSoftpayMessage("Le délai de paiement est expiré. Veuillez réessayer.")
        }
        return () => clearInterval(interval)
    }, [validationCountdown])

    useEffect(() => {
        const status = searchParams.get('payment')
        if (status === 'success') {
            setPaymentStatus('success')
            setValidationCountdown(null)
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#3b82f6', '#10b981', '#fbbf24']
            })
        } else if (status === 'cancelled') {
            setPaymentStatus('cancelled')
        }
    }, [searchParams])

    useEffect(() => {
        if (user && user.plan && user.plan !== 'free') {
            if (isPaymentModalOpen || validationCountdown !== null) {
                setPaymentStatus('success')
                setValidationCountdown(null)
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#3b82f6', '#10b981', '#fbbf24']
                })
            }
        }
    }, [user?.plan])

    const handleSubscribe = async (plan: string) => {
        if (!user) {
            navigate('/register')
            return
        }
        setSelectedPlanForModal(plan)
        setIsPaymentModalOpen(true)
        setSoftpayMessage(null)
    }

    const submitSoftPay = async () => {
        if (!phoneNumber) {
            alert('Veuillez entrer un numéro de téléphone valide.')
            return
        }
        setIsLoading(selectedPlanForModal)
        setSoftpayMessage(null)
        try {
            const res = await api.post('/payment/softpay', {
                plan: selectedPlanForModal,
                paymentMethod,
                phoneNumber
            })

            const data = res.data
            
            // Regardless of URL or message, we start the validation countdown
            setValidationCountdown(180)
            
            if (data.url) {
                setSoftpayUrl(data.url)
                setIsLoading(null)
            } else if (data.message) {
                setSoftpayMessage(data.message)
                setIsLoading(null)
            } else {
                setSoftpayMessage('Paiement initié, veuillez vérifier votre téléphone.')
                setIsLoading(null)
            }
        } catch (e: any) {
            const serverMsg = e.response?.data?.error || e.message;
            const details = e.response?.data?.details ? JSON.stringify(e.response.data.details) : '';
            alert('Erreur: ' + serverMsg + (details ? '\nDétails: ' + details : ''));
            setIsLoading(null);
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pt-32 pb-20 px-6 relative overflow-hidden">
            <AnimatePresence>
                {isLoading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-zinc-900 border border-white/10 p-10 rounded-3xl flex flex-col items-center max-w-sm text-center shadow-2xl shadow-blue-500/20"
                        >
                            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
                            <h3 className="text-2xl font-bold mb-2">Préparation du paiement</h3>
                            <p className="text-zinc-400">Connexion sécurisée à PayDunya en cours. Veuillez patienter pour la redirection...</p>
                        </motion.div>
                    </motion.div>
                )}

                {paymentStatus === 'success' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-zinc-900 border border-green-500/30 p-10 rounded-3xl flex flex-col items-center max-w-sm text-center shadow-2xl shadow-green-500/20 relative"
                        >
                            <button onClick={() => { setPaymentStatus(null); navigate('/dashboard/pricing', { replace: true }) }} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                                <X size={20} />
                            </button>
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                <Check className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-3xl font-extrabold mb-3 text-white">Félicitations !</h3>
                            <p className="text-zinc-400 mb-8">Votre paiement a été traité avec succès. Votre nouveau forfait est désormais actif.</p>
                            <button 
                                onClick={() => navigate('/dashboard')}
                                className="w-full py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
                            >
                                Commencer à créer
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {paymentStatus === 'cancelled' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-zinc-900 border border-red-500/30 p-10 rounded-3xl flex flex-col items-center max-w-sm text-center shadow-2xl shadow-red-500/20 relative"
                        >
                            <button onClick={() => { setPaymentStatus(null); navigate('/dashboard/pricing', { replace: true }) }} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                                <X size={20} />
                            </button>
                            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                                <X className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-3xl font-extrabold mb-3 text-white">Paiement Annulé</h3>
                            <p className="text-zinc-400 mb-8">La transaction a été annulée ou a échoué. Aucun montant ne vous a été débité.</p>
                            <button 
                                onClick={() => { setPaymentStatus(null); navigate('/dashboard/pricing', { replace: true }) }}
                                className="w-full py-3 rounded-xl bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-colors"
                            >
                                Réessayer
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">Tarification simple & transparente</h1>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Choisissez le forfait qui correspond le mieux à vos besoins. Aucun frais caché.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {/* Free Plan */}
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 flex flex-col relative">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold mb-2">Gratuit</h3>
                            <div className="text-4xl font-extrabold mb-2">0 FCFA</div>
                            <p className="text-zinc-400 text-sm">Pour tester la plateforme.</p>
                        </div>
                        
                        <div className="flex-1 space-y-4 mb-8">
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm">1 Application</span></div>
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm">Watermark Site2App inclus</span></div>
                            <div className="flex items-center gap-3"><X size={18} className="text-zinc-600" /><span className="text-zinc-500 text-sm">Notifications Push</span></div>
                            <div className="flex items-center gap-3"><X size={18} className="text-zinc-600" /><span className="text-zinc-500 text-sm">Monétisation AdMob</span></div>
                            <div className="flex items-center gap-3"><X size={18} className="text-zinc-600" /><span className="text-zinc-500 text-sm">Mode hors-ligne</span></div>
                            <div className="flex items-center gap-3"><X size={18} className="text-zinc-600" /><span className="text-zinc-500 text-sm">Biométrie & Analytics</span></div>
                        </div>

                        <button 
                            disabled
                            className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold cursor-not-allowed"
                        >
                            Forfait actuel
                        </button>
                    </div>

                    {/* Yearly Plan */}
                    <div className="bg-blue-600/10 border border-blue-500/50 rounded-2xl p-8 flex flex-col relative transform scale-105 shadow-2xl shadow-blue-900/20">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            Populaire
                        </div>
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold mb-2 text-blue-400">Annuel</h3>
                            <div className="text-4xl font-extrabold mb-2">25 000 FCFA <span className="text-lg text-zinc-400 font-normal">/an</span></div>
                            <p className="text-zinc-400 text-sm">Pour les professionnels.</p>
                        </div>
                        
                        <div className="flex-1 space-y-4 mb-8">
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm font-semibold">Jusqu'à 10 Applications</span></div>
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm">Marque Blanche (Sans filigrane)</span></div>
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm font-semibold">Notifications Push Illimitées</span></div>
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm font-semibold">Monétisation AdMob</span></div>
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm">Mode hors-ligne, Biométrie</span></div>
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm">Analytics intégré</span></div>
                        </div>

                        <button 
                            onClick={() => handleSubscribe('yearly')}
                            disabled={isLoading === 'yearly'}
                            className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading === 'yearly' ? 'Redirection...' : 'Choisir ce forfait'}
                        </button>
                    </div>

                    {/* Lifetime Plan */}
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 flex flex-col relative">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold mb-2">À Vie</h3>
                            <div className="text-4xl font-extrabold mb-2">75 000 FCFA</div>
                            <p className="text-zinc-400 text-sm">Paiement unique. Accès à vie.</p>
                        </div>
                        
                        <div className="flex-1 space-y-4 mb-8">
                            <div className="flex items-center gap-3"><Check size={18} className="text-amber-500" /><span className="text-sm font-bold text-amber-500">Création d'Apps Illimitée</span></div>
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm">Marque Blanche Complète</span></div>
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm">Toutes les options Premium</span></div>
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm">Support prioritaire VIP</span></div>
                            <div className="flex items-center gap-3"><Check size={18} className="text-blue-500" /><span className="text-sm">Mises à jour garanties à vie</span></div>
                        </div>

                        <button 
                            onClick={() => handleSubscribe('lifetime')}
                            disabled={isLoading === 'lifetime'}
                            className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading === 'lifetime' ? 'Redirection...' : 'Payer une seule fois'}
                        </button>
                    </div>
                </div>
                
                {/* PayDunya Logos */}
                <div className="mt-16 text-center">
                    <p className="text-zinc-500 text-sm mb-4">Paiements sécurisés avec PayDunya (Orange Money, Wave, Free Money, etc.)</p>
                </div>
            </div>
            {/* Payment Modal */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <span>Paiement sécurisé</span>
                                </h3>
                                <button
                                    onClick={() => { setIsPaymentModalOpen(false); setSoftpayMessage(null); setPaymentStatus('cancelled'); setSoftpayUrl(null); }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {validationCountdown !== null ? (
                                    <div className="text-center py-8 space-y-6">
                                        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                                            <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-ping opacity-20"></div>
                                            <div className="absolute inset-0 border-4 border-blue-100 dark:border-blue-900 rounded-full animate-pulse"></div>
                                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                                {Math.floor(validationCountdown / 60)}:{(validationCountdown % 60).toString().padStart(2, '0')}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-xl font-bold text-gray-900 dark:text-white">Validation en cours</h4>
                                            <p className="text-gray-600 dark:text-gray-300 px-4">
                                                Consultez votre téléphone et entrez votre code secret pour valider le paiement.
                                            </p>
                                        </div>
                                        {softpayUrl && (
                                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                                <a 
                                                    href={softpayUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center justify-center w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg transition-colors"
                                                >
                                                    Ouvrir l'application de paiement
                                                    <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                                                    Si vous n'avez pas reçu de notification, cliquez sur ce bouton (ex: Wave).
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : softpayMessage ? (
                                    <div className="text-center py-8 space-y-4">
                                        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">Validation en cours</h4>
                                        <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl font-medium">
                                            {softpayMessage}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Ne fermez pas cette fenêtre. La page se mettra à jour automatiquement une fois le paiement confirmé.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Nom et Prénom
                                                </label>
                                                <input
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="John Doe"
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="john@email.com"
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Pays
                                            </label>
                                            <div className="relative">
                                                <div 
                                                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)} 
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <img src={`https://flagcdn.com/w20/${COUNTRIES.find(c => c.id === selectedCountry)?.flag}.png`} alt="" className="w-6 rounded-sm shadow-sm" />
                                                        <span className="text-gray-900 dark:text-white">{COUNTRIES.find(c => c.id === selectedCountry)?.name}</span>
                                                    </div>
                                                    <svg className={`w-5 h-5 text-gray-500 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                                {isCountryDropdownOpen && (
                                                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                                        {COUNTRIES.map(country => (
                                                            <div 
                                                                key={country.id} 
                                                                onClick={() => { 
                                                                    setSelectedCountry(country.id); 
                                                                    setPaymentMethod(country.methods[0].id); 
                                                                    setIsCountryDropdownOpen(false); 
                                                                }} 
                                                                className={`flex items-center space-x-3 px-4 py-3 cursor-pointer transition-colors ${selectedCountry === country.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                                            >
                                                                <img src={`https://flagcdn.com/w20/${country.flag}.png`} alt="" className="w-6 rounded-sm shadow-sm" />
                                                                <span className={`text-gray-900 dark:text-white ${selectedCountry === country.id ? 'font-medium' : ''}`}>{country.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Moyen de paiement
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {COUNTRIES.find(c => c.id === selectedCountry)?.methods.map(method => (
                                                    <button
                                                        key={method.id}
                                                        onClick={() => setPaymentMethod(method.id as any)}
                                                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${paymentMethod === method.id ? method.color + ' ring-2 ring-offset-2 ring-current' : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300'}`}
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            {(method as any).logoImg ? (
                                                                <div className="w-8 h-8 rounded-full bg-white shadow-sm overflow-hidden flex items-center justify-center p-0.5 relative">
                                                                    <img 
                                                                        src={(method as any).logoImg} 
                                                                        alt="" 
                                                                        className="w-full h-full object-contain"
                                                                        onError={(e) => {
                                                                            (e.target as any).style.display = 'none';
                                                                            if ((e.target as any).nextElementSibling) {
                                                                                (e.target as any).nextElementSibling.style.display = 'flex';
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div 
                                                                        className="absolute inset-0 items-center justify-center text-xs font-bold hidden"
                                                                        style={{ backgroundColor: (method as any).logoBg, color: (method as any).logoColor || '#fff' }}
                                                                    >
                                                                        {(method as any).logoText}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div 
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                                                                    style={{ backgroundColor: (method as any).logoBg, color: (method as any).logoColor || '#fff' }}
                                                                >
                                                                    {(method as any).logoText}
                                                                </div>
                                                            )}
                                                            <span className="font-semibold text-sm">{method.name}</span>
                                                        </div>
                                                        {paymentMethod === method.id && (
                                                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Numéro de téléphone
                                            </label>
                                            <input
                                                type="tel"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                placeholder="Ex: 77 123 45 67"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-shadow"
                                            />
                                        </div>

                                        <button
                                            onClick={submitSoftPay}
                                            disabled={isLoading !== null || !phoneNumber || !fullName || !email}
                                            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isLoading === selectedPlanForModal ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Préparation...
                                                </>
                                            ) : (
                                                'Confirmer le paiement'
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
