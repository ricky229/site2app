import React, { useState } from 'react';
import { Shield, Key, Copy, CheckCircle2, RefreshCw, Code2, Webhook, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
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
        <div className="space-y-6 md:space-y-8 max-w-[1400px] mx-auto p-4 md:p-8 lg:p-10 w-full overflow-x-hidden">
            <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                    <Code2 className="text-[var(--text-muted)] shrink-0" size={32} strokeWidth={2.5} />
                    API & Intégration
                </h1>
                <p className="mt-2 text-[var(--text-muted)] text-sm md:text-lg font-medium">
                    Gérez votre clé API et découvrez comment intégrer Site2App à vos outils (Bubble, Make, Zapier, etc.).
                </p>
            </div>

            {/* API Key Section */}
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-5 md:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-xl shrink-0">
                            <Shield className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)]">Clé API Secrète</h2>
                            <p className="text-xs md:text-sm text-[var(--text-secondary)]">Utilisez cette clé pour authentifier vos requêtes vers l'API Site2App.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between group relative overflow-hidden gap-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
                    
                    <div className="flex items-center gap-2 md:gap-3 font-mono text-xs md:text-sm overflow-hidden">
                        <Key className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                        <span className="text-[var(--text-primary)] select-all break-all md:break-normal">
                            {user?.apiKey ? (
                                <>
                                    <span className="text-blue-500/70">sk_live_</span>
                                    {user.apiKey}
                                </>
                            ) : (
                                <span className="text-[var(--text-muted)] italic">Aucune clé générée. Veuillez régénérer.</span>
                            )}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 relative z-10 w-full md:w-auto">
                        <Button
                            variant="secondary"
                            onClick={handleCopy}
                            className="flex-1 md:flex-none bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--border)]"
                            disabled={!user?.apiKey}
                        >
                            {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            <span className="ml-2">{copied ? 'Copiée' : 'Copier'}</span>
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleRegenerate}
                            disabled={isGenerating}
                            className="flex-1 md:flex-none bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border-0"
                        >
                            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                            <span className="ml-1 md:ml-2 text-sm">Régénérer</span>
                        </Button>
                    </div>
                </div>
                
                <div className="mt-4 text-xs md:text-sm text-amber-600 dark:text-amber-500 flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-200 dark:border-amber-500/20">
                    <Zap className="h-4 w-4 md:h-5 md:w-5 shrink-0 mt-0.5" />
                    <p>Gardez cette clé secrète ! Ne l'exposez jamais dans du code côté client (frontend) ou dans un dépôt public.</p>
                </div>
            </div>

            {/* Documentation Section */}
            <div className="space-y-4 md:space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                    <Webhook className="h-6 w-6 text-[var(--text-muted)] shrink-0" />
                    Documentation de l'API
                </h2>

                {/* Step 1 */}
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-5 md:p-8 shadow-sm">
                    <h3 className="text-base md:text-lg font-bold text-[var(--text-primary)] mb-2">1. Récupérer le Push Token d'un utilisateur</h3>
                    <p className="text-[var(--text-secondary)] text-xs md:text-sm mb-4">
                        Lorsque votre application s'ouvre, elle charge l'URL de votre site web en y ajoutant automatiquement le paramètre <code className="text-blue-500 bg-blue-500/10 px-1 rounded">push_token</code>.
                    </p>
                    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-3 md:p-4 font-mono text-xs md:text-sm text-[var(--text-primary)] overflow-x-auto whitespace-nowrap">
                        https://votre-site.com/accueil<span className="text-blue-500">?push_token=APA91bEX...</span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-xs md:text-sm mt-4">
                        <strong>Dans Bubble :</strong> Utilisez "Get data from page URL" avec le paramètre <code className="text-[var(--text-primary)] bg-[var(--surface-2)] border border-[var(--border)] px-1 rounded">push_token</code> et enregistrez-le dans le champ "Push Token" de votre utilisateur.
                    </p>
                </div>

                {/* Step 2 */}
                <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-[2rem] p-5 md:p-8 shadow-sm">
                    <h3 className="text-base md:text-lg font-bold text-[var(--text-primary)] mb-2">2. Envoyer une notification Push personnalisée</h3>
                    <p className="text-[var(--text-secondary)] text-xs md:text-sm mb-4">
                        Utilisez notre API pour envoyer des notifications à un utilisateur spécifique (par ex: "Votre commande est expédiée").
                    </p>
                    
                    <div className="bg-[var(--surface-0)] rounded-xl overflow-hidden border border-[var(--border)] w-full">
                        <div className="bg-[var(--surface-2)] px-3 py-2 md:px-4 md:py-2 text-[10px] md:text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0 border-b border-[var(--border)]">
                            <span>Requête POST</span>
                            <span className="text-blue-500 font-mono lowercase truncate w-full md:w-auto text-right md:text-left">https://us-central1-site2app-app.cloudfunctions.net/api/api/external/send-push</span>
                        </div>
                        <div className="p-3 md:p-4 overflow-x-auto w-full max-w-full">
                            <pre className="text-xs md:text-sm font-mono text-[var(--text-primary)] w-full">
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
                    
                    <div className="mt-4 md:mt-6">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">Paramètres du Body JSON :</h4>
                        <ul className="space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
                            <li><code className="text-blue-500 font-mono">token</code> (string) : Le token push de l'utilisateur (ou utilisez <code className="text-blue-500">tokens</code> avec un tableau [ ] pour envoi groupé).</li>
                            <li><code className="text-blue-500 font-mono">title</code> (string) : Titre de la notification.</li>
                            <li><code className="text-blue-500 font-mono">body</code> (string) : Texte/message de la notification.</li>
                            <li><code className="text-blue-500 font-mono">actionUrl</code> (string, optionnel) : URL à ouvrir quand l'utilisateur clique sur la notification.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
