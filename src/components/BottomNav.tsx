import { useNavigate, useLocation } from 'react-router-dom';
import { Dumbbell, Users, Swords, Layers, User } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: Dumbbell, label: 'Accueil' },
  { path: '/battlepass', icon: Swords, label: 'Pass' },
  { path: '/collection', icon: Layers, label: 'Cartes' },
  { path: '/profile', icon: User, label: 'Profil' },
  { path: '/group', icon: Users, label: 'Groupe' },
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
