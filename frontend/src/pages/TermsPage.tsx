import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-blue-500/30">
            <div className="max-w-4xl mx-auto px-6 py-16">
                <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12">
                    <ArrowLeft size={16} /> Retour à l'accueil
                </Link>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Shield className="text-blue-500" size={24} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Conditions Générales de Vente (CGV)</h1>
                </div>

                <div className="prose prose-invert prose-zinc max-w-none prose-headings:text-white prose-a:text-blue-400 hover:prose-a:text-blue-300 space-y-8 text-zinc-400">
                    <p className="text-lg">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">1. Objet</h2>
                        <p>
                            Les présentes Conditions Générales de Vente (ci-après "CGV") ont pour objet de définir les conditions dans lesquelles Site2App (ci-après "le Prestataire") fournit à ses clients (ci-après "le Client") son service de conversion de sites web en applications mobiles natives (iOS et Android).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">2. Description des Services</h2>
                        <p>
                            Site2App est une plateforme SaaS (Software as a Service) permettant de générer automatiquement des applications mobiles à partir de l'URL d'un site web existant. Le service inclut, selon le forfait choisi, des fonctionnalités natives telles que les notifications Push, l'intégration publicitaire (AdMob) et un mode hors-ligne.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">3. Accès au Service et Tarification</h2>
                        <p>
                            L'accès au service nécessite la création d'un compte. Site2App propose plusieurs forfaits, incluant un accès gratuit limité à des fins de test, un abonnement annuel et un forfait à vie (paiement unique). Les tarifs en vigueur sont affichés sur la page de tarification du site.
                        </p>
                        <p>
                            Le paiement des abonnements et forfaits s'effectue via les moyens de paiement sécurisés proposés sur la plateforme (ex: agrégateurs de paiement locaux et cartes bancaires).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">4. Obligations du Client</h2>
                        <p>
                            Le Client s'engage à utiliser le service de manière légale. Il est strictement interdit d'utiliser Site2App pour convertir des sites web contenant :
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-4">
                            <li>Du contenu illégal, diffamatoire ou incitant à la haine.</li>
                            <li>Du contenu violant les droits de propriété intellectuelle de tiers.</li>
                            <li>Des malwares, virus ou tout programme conçu pour endommager un système.</li>
                            <li>Du contenu pour adultes non conforme aux politiques des stores (Google Play, App Store).</li>
                        </ul>
                        <p className="mt-4">
                            Le Prestataire se réserve le droit de suspendre ou de supprimer immédiatement tout compte enfreignant ces règles, sans aucun remboursement.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">5. Responsabilité</h2>
                        <p>
                            Le Prestataire s'efforce d'assurer une disponibilité maximale du service. Toutefois, le Prestataire ne saurait être tenu responsable des éventuelles interruptions de service, bugs ou de l'incompatibilité de l'application générée avec des modifications ultérieures du site web source du Client.
                        </p>
                        <p>
                            La validation et la publication des applications générées sur l'App Store d'Apple et le Google Play Store relèvent de la responsabilité exclusive du Client et des règles imposées par ces plateformes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">6. Rétractation et Remboursement</h2>
                        <p>
                            En raison de la nature numérique des services et de la génération immédiate du produit (l'application APK/AAB), le droit de rétractation ne s'applique pas une fois que le processus de génération de l'application a été initié, conformément à la législation sur les produits numériques personnalisés.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">7. Propriété Intellectuelle</h2>
                        <p>
                            Le Client conserve la propriété entière du contenu de son site web. Le Prestataire détient les droits de propriété intellectuelle sur l'infrastructure, le code source du moteur de conversion natif et l'interface de Site2App.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">8. Modification des CGV</h2>
                        <p>
                            Le Prestataire se réserve le droit de modifier les présentes CGV à tout moment. Les Clients seront informés de toute modification substantielle par e-mail ou via une notification sur leur tableau de bord.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
