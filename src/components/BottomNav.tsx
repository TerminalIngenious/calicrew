import { useNavigate, useLocation } from 'react-router-dom';
import { Dumbbell, Users, Swords, TrendingUp, User } from 'lucide-react';

/**
 * Un onglet = un rôle. La collection de cartes a quitté la barre : c'est de la
 * consultation, pas une action régulière, et elle était déjà dupliquée dans le
 * profil. La place libérée revient à Progression, qui n'était accessible
 * depuis nulle part.
 */
const NAV_ITEMS = [
  { path: '/', icon: Dumbbell, label: 'Accueil' },
  { path: '/progress', icon: TrendingUp, label: 'Progrès' },
  { path: '/battlepass', icon: Swords, label: 'Pass' },
  { path: '/group', icon: Users, label: 'Groupe' },
  { path: '/profile', icon: User, label: 'Profil' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
        <button
          key={path}
          className={`nav-btn ${location.pathname === path ? 'active' : ''}`}
          onClick={() => navigate(path)}
        >
          <Icon size={20} /> <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
