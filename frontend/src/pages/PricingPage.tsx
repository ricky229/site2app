import { useState, useEffect } from 'react'
import { Check, X, Shield, Zap, Infinity, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'

export default function PricingPage() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(null)

    useEffect(() => {
        const status = searchParams.get('payment')
        if (status === 'success') {
            setPaymentStatus('success')
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

    const handleSubscribe = async (plan: string) => {
        if (!user) {
            navigate('/auth/login')
            return
        }

        setIsLoading(plan)
        try {
            const res = await api.post('/payment/create-invoice', { plan })
            
            if (res.data && res.data.invoiceUrl) {
                window.location.href = res.data.invoiceUrl
            } else {
                alert('Erreur lors de la création de la facture.')
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
        </div>
    )
}
