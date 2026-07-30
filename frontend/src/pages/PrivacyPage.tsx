import { Link } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-blue-500/30">
            <div className="max-w-4xl mx-auto px-6 py-16">
                <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12">
                    <ArrowLeft size={16} /> Retour à l'accueil
                </Link>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Lock className="text-purple-500" size={24} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Politique de Confidentialité</h1>
                </div>

                <div className="prose prose-invert prose-zinc max-w-none prose-headings:text-white prose-a:text-purple-400 hover:prose-a:text-purple-300 space-y-8 text-zinc-400">
                    <p className="text-lg">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
                        <p>
                            La présente Politique de Confidentialité décrit la manière dont Site2App collecte, utilise, protège et partage les données personnelles de ses utilisateurs dans le cadre de l'utilisation de nos services. La protection de votre vie privée est au cœur de nos priorités.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">2. Données Collectées</h2>
                        <p>
                            Lors de l'utilisation de Site2App, nous pouvons collecter les données suivantes :
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-4">
                            <li><strong>Informations d'identification :</strong> Nom, adresse e-mail, informations de connexion (via Google ou e-mail/mot de passe).</li>
                            <li><strong>Informations techniques :</strong> URL de votre site web, logo, paramètres de l'application (couleurs, ID AdMob, clés Firebase).</li>
                            <li><strong>Données d'utilisation :</strong> Statistiques anonymisées sur la génération des builds et l'utilisation de notre tableau de bord.</li>
                        </ul>
                        <p className="mt-4">
                            Nous ne collectons ni ne stockons directement les numéros de cartes bancaires. Les transactions financières sont entièrement gérées et sécurisées par nos prestataires de paiement tiers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">3. Utilisation des Données</h2>
                        <p>
                            Vos données sont utilisées exclusivement pour :
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-4">
                            <li>Créer, gérer et authentifier votre compte.</li>
                            <li>Générer vos applications mobiles (le code source, les certificats et les fichiers APK/AAB).</li>
                            <li>Fournir un support technique et répondre à vos demandes.</li>
                            <li>Vous envoyer des notifications importantes liées à votre compte (erreurs de build, expirations, nouveautés).</li>
                            <li>Améliorer en continu nos systèmes de génération et nos interfaces.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">4. Partage des Données</h2>
                        <p>
                            Vos données personnelles ne sont <strong>jamais</strong> vendues à des tiers. Elles peuvent être partagées uniquement avec des prestataires de confiance nécessaires au fonctionnement du service (ex: fournisseurs d'infrastructure cloud comme Google Cloud/Firebase).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">5. Sécurité et Stockage</h2>
                        <p>
                            Les mots de passe sont hachés cryptographiquement. Toutes les communications entre votre navigateur et nos serveurs sont chiffrées via TLS/SSL. Vos fichiers de certificats de signature d'application (keystores) sont stockés de manière sécurisée et ne sont utilisés que par les serveurs de build automatisés.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">6. Vos Droits (RGPD)</h2>
                        <p>
                            Conformément à la réglementation applicable (notamment le RGPD européen), vous disposez des droits suivants concernant vos données personnelles :
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-4">
                            <li>Droit d'accès et de rectification.</li>
                            <li>Droit à l'effacement (suppression complète de votre compte et de toutes vos applications liées).</li>
                            <li>Droit à la portabilité de vos données.</li>
                        </ul>
                        <p className="mt-4">
                            Pour exercer ces droits, vous pouvez supprimer votre compte depuis l'espace "Paramètres" ou nous contacter via notre support.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">7. Cookies</h2>
                        <p>
                            Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement de la plateforme (gestion de la session utilisateur, authentification sécurisée). Nous n'utilisons aucun traceur publicitaire intrusif sur le tableau de bord de l'application.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
