import { estInstallee } from '../lib/install';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { isConfigured } from '../lib/firebase';

export default function Login() {
  const { signIn, signUp, user, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lienEnvoye, setLienEnvoye] = useState(false);

  // La vitrine renvoie ici pour « ouvrir l'app » : sans cette garde, un
  // membre déjà connecté retomberait sur le formulaire de connexion.
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Mot de passe oublié.
   *
   * Le message de confirmation est le même que l'adresse ait un compte ou
   * non, et les erreurs de Firebase sont avalées : répondre « ce compte
   * n'existe pas » permettrait à n'importe qui de vérifier, une adresse après
   * l'autre, qui est inscrit.
   */
  async function motDePasseOublie() {
    if (!email.trim()) {
      setError('Entre ton adresse mail au-dessus, puis reclique ici.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
    } catch (err: unknown) {
      // Seule une adresse mal écrite mérite d'être signalée : c'est une faute
      // de frappe, pas une information sur quelqu'un d'autre.
      const code = (err as { code?: string }).code;
      if (code === 'auth/invalid-email') {
        setError('Cette adresse n\'a pas l\'air valide.');
        setLoading(false);
        return;
      }
    }
    setLienEnvoye(true);
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Dumbbell size={40} />
          <h1>CaliCrew</h1>
          <p>Track tes perfs, challenge tes potes</p>
        </div>
        {!isConfigured && (
          <div className="warning-banner">
            Firebase non configuré. Crée un fichier <code>.env</code> à la racine du projet avec tes clés Firebase.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <input
              type="text"
              placeholder="Ton prénom / pseudo"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? '...' : isSignUp ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>

        {/* Seulement à la connexion : à l'inscription, il n'y a pas encore de
            mot de passe à oublier. */}
        {!isSignUp &&
          (lienEnvoye ? (
            <p className="login-reset-ok">
              Si un compte existe avec cette adresse, le lien vient de partir. Regarde tes
              mails, et le dossier indésirables.
            </p>
          ) : (
            <button type="button" className="login-reset" onClick={motDePasseOublie} disabled={loading}>
              Mot de passe oublié ?
            </button>
          ))}
        <p className="toggle-auth" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? En créer un'}
        </p>
        {/* Beaucoup arrivent ici par un lien et repartent sans savoir que
            l'app s'installe. La vitrine explique et propose l'installation. */}
        {!estInstallee() && (
          <p className="login-install">
            <Link to="/decouvrir">Installer CaliCrew sur cet appareil</Link>
          </p>
        )}
      </div>
    </div>
  );
}
