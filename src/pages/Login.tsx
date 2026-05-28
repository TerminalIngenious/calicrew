import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { isConfigured } from '../lib/firebase';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        <p className="toggle-auth" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? En créer un'}
        </p>
      </div>
    </div>
  );
}
