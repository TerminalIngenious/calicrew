import { Layers } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function Collection() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Collection</h1>
      </header>

      <div className="coming-soon">
        <Layers size={56} />
        <h2>Bientôt disponible</h2>
        <p>Ta collection de cartes arrive bientôt... Des légendes du sport à débloquer, de commune à historique.</p>
        <span className="coming-soon-sub">Patience jeune padawan 🃏</span>
      </div>

      <BottomNav />
    </div>
  );
}
