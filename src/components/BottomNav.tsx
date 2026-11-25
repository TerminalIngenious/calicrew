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

/*
 * Le jeu d'icônes de décembre a été retiré.
 *
 * Il tenait parce que les libellés restaient lisibles sous les pictogrammes :
 * un lit, un canapé et une banane se comprenaient parce que « Accueil »,
 * « Groupe » et « Profil » étaient écrits dessous. La barre n'affiche plus
 * ses libellés sur téléphone depuis la refonte — il ne restait donc que la
 * blague, et plus rien pour la rattraper.
 */

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <nav className="bottom-nav">
      {/* Uniquement visible sur ordinateur, où la barre devient une colonne :
          une app de bureau sans son nom en haut de la colonne fait page web. */}
      <div className="nav-brand">
        <img src="/icon.svg" alt="" width={28} height={28} />
        <span>CaliCrew</span>
      </div>
      {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
        return (
          <button
            key={path}
            className={`nav-btn ${location.pathname === path ? 'active' : ''}`}
            onClick={() => navigate(path)}
          >
            <Icon size={20} /> <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
