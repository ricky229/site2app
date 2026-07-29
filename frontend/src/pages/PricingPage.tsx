import { useState } from 'react'
import { Check, X, Shield, Zap, Infinity } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function PricingPage() {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState<string | null>(null)

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
        } finally {
            setIsLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pt-32 pb-20 px-6">
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
