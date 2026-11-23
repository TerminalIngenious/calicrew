import { useNavigate, useLocation } from 'react-router-dom';
import { Dumbbell, Users, Swords, TrendingUp, User,
  BedDouble, Sofa, Clapperboard, Flame, Banana } from 'lucide-react';
import { getSeasonalTheme } from '../lib/seasonalTheme';

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
 * Le jeu d'icônes de décembre.
 *
 * Les libellés ne changent pas : une barre de navigation dont les cinq mots
 * deviennent des blagues n'est plus une barre de navigation. Seuls les
 * pictogrammes basculent, et chacun garde la place de celui qu'il remplace —
 * on retrouve ses onglets au doigt, sans les lire.
 */
const ICONES_FETE: Record<string, typeof Dumbbell> = {
  '/': BedDouble,
  '/progress': Flame,
  '/battlepass': Clapperboard,
  '/group': Sofa,
  '/profile': Banana,
};

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const fete = getSeasonalTheme() === 'noel';

  return (
    <nav className="bottom-nav">
      {/* Uniquement visible sur ordinateur, où la barre devient une colonne :
          une app de bureau sans son nom en haut de la colonne fait page web. */}
      <div className="nav-brand">
        <img src="/icon.svg" alt="" width={28} height={28} />
        <span>CaliCrew</span>
      </div>
      {NAV_ITEMS.map(({ path, icon: Normale, label }) => {
        const Icon = (fete && ICONES_FETE[path]) || Normale;
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
