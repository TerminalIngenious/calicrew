import { Swords } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function BattlePass() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Battle Pass</h1>
      </header>

      <div className="coming-soon">
        <Swords size={56} />
        <h2>Bientôt disponible</h2>
        <p>Le Battle Pass arrive très bientôt... Prépare-toi à grind tes quêtes et débloquer des récompenses de fou.</p>
        <span className="coming-soon-sub">Reste connecté 👀</span>
      </div>

      <BottomNav />
    </div>
  );
}
