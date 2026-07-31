import React, { useState } from 'react';
import { Shield, Key, Copy, CheckCircle2, RefreshCw, Code2, Webhook, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../api';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

export default function DeveloperPage() {
    const { user, updateUser } = useAuthStore();
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleCopy = () => {
        if (user?.apiKey) {
            navigator.clipboard.writeText(user.apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Clé API copiée !');
        }
    };

    const handleRegenerate = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir régénérer votre clé API ? Vos intégrations actuelles cesseront de fonctionner immédiatement.')) return;
        
        setIsGenerating(true);
        try {
            const res = await api.post('/user/regenerate-api-key');
            if (res.data.success && res.data.apiKey) {
                updateUser({ apiKey: res.data.apiKey });
                toast.success('Nouvelle clé API générée avec succès');
            }
        } catch (error) {
            toast.error('Erreur lors de la génération de la clé');
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <Code2 className="h-8 w-8 text-primary" />
                    API & Intégration
                </h1>
                <p className="mt-2 text-slate-400">
                    Gérez votre clé API et découvrez comment intégrer Site2App à vos outils (Bubble, Make, Zapier, etc.).
                </p>
            </div>

            {/* API Key Section */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">Clé API Secrète</h2>
                            <p className="text-sm text-slate-400">Utilisez cette clé pour authentifier vos requêtes vers l'API Site2App.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-center gap-3 font-mono text-sm">
                        <Key className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-300 select-all">
                            {user?.apiKey ? (
                                <>
                                    <span className="text-primary/70">sk_live_</span>
                                    {user.apiKey}
                                </>
                            ) : (
                                <span className="text-slate-500 italic">Aucune clé générée. Veuillez vous reconnecter ou régénérer.</span>
                            )}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 relative z-10">
                        <Button
                            variant="secondary"
                            onClick={handleCopy}
                            className="bg-slate-800 hover:bg-slate-700"
                            disabled={!user?.apiKey}
                        >
                            {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            <span className="ml-2">{copied ? 'Copiée' : 'Copier'}</span>
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleRegenerate}
                            disabled={isGenerating}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0"
                        >
                            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                            <span className="ml-2">Régénérer</span>
                        </Button>
                    </div>
                </div>
                
                <div className="mt-4 text-sm text-amber-500/80 flex items-start gap-2 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                    <Zap className="h-5 w-5 shrink-0" />
                    <p>Gardez cette clé secrète ! Ne l'exposez jamais dans du code côté client (frontend) ou dans un dépôt public.</p>
                </div>
            </div>

            {/* Documentation Section */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Webhook className="h-6 w-6 text-primary" />
                    Documentation de l'API
                </h2>

                {/* Step 1 */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">1. Récupérer le Push Token d'un utilisateur</h3>
                    <p className="text-slate-400 text-sm mb-4">
                        Lorsque votre application s'ouvre, elle charge l'URL de votre site web en y ajoutant automatiquement le paramètre <code className="text-primary bg-primary/10 px-1 rounded">push_token</code>.
                    </p>
                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-300">
                        https://votre-site.com/accueil<span className="text-primary">?push_token=APA91bEX...</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-4">
                        <strong>Dans Bubble :</strong> Utilisez "Get data from page URL" avec le paramètre <code className="text-slate-300 bg-slate-700 px-1 rounded">push_token</code> et enregistrez-le dans le champ "Push Token" de votre utilisateur.
                    </p>
                </div>

                {/* Step 2 */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">2. Envoyer une notification Push personnalisée</h3>
                    <p className="text-slate-400 text-sm mb-4">
                        Utilisez notre API pour envoyer des notifications à un utilisateur spécifique (par ex: "Votre commande est expédiée").
                    </p>
                    
                    <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700/50">
                        <div className="bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>Requête POST</span>
                            <span className="text-primary font-mono lowercase">https://us-central1-site2app-app.cloudfunctions.net/api/api/external/send-push</span>
                        </div>
                        <div className="p-4 overflow-x-auto">
                            <pre className="text-sm font-mono text-slate-300">
{`curl -X POST https://us-central1-site2app-app.cloudfunctions.net/api/api/external/send-push \\
  -H "Authorization: Bearer sk_live_${user?.apiKey || 'VOTRE_CLE_API'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "LE_PUSH_TOKEN_DE_LUTILISATEUR",
    "title": "Commande Expédiée 📦",
    "body": "Votre colis est en route. Cliquez ici pour le suivi.",
    "actionUrl": "https://votre-site.com/suivi/12345"
  }'`}
                            </pre>
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <h4 className="text-sm font-semibold text-white mb-2">Paramètres du Body JSON :</h4>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><code className="text-primary">token</code> (string) : Le token push de l'utilisateur (ou utilisez <code className="text-primary">tokens</code> avec un tableau [ ] pour envoi groupé).</li>
                            <li><code className="text-primary">title</code> (string) : Titre de la notification.</li>
                            <li><code className="text-primary">body</code> (string) : Texte/message de la notification.</li>
                            <li><code className="text-primary">actionUrl</code> (string, optionnel) : URL à ouvrir quand l'utilisateur clique sur la notification.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
