import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProgress } from '../lib/useUserProgress';
import { sortBadges, badgeTitle, badgeMonthLabel, BADGE_RANKS } from '../lib/badges';
import RankBadgeIcon from '../components/RankBadgeIcon';
import BottomNav from '../components/BottomNav';
import Loader from '../components/Loader';
import type { RankBadge } from '../types';

/**
 * Les badges d'un joueur.
 *
 * Ils occupaient une grille dans le profil, qui grandissait d'un rang tous les
 * trois mois gagnés. Ils ont leur page, comme les cartes d'une saison, et le
 * profil n'en garde qu'un bandeau.
 */
export default function Badges() {
  const { uid } = useParams<{ uid?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const targetUid = uid || user?.uid;
  const { progress, loading } = useUserProgress(targetUid);
  const badges = sortBadges(progress?.badges || []);
  const [selectedBadge, setSelectedBadge] = useState<RankBadge | null>(null);

  if (loading) return <div className="page loading"><Loader /></div>;

  return (
    <div className="page">
      <div className="page-head-row">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="season-page-title">
          <span className="season-slab-kicker">Récompenses</span>
          <h1>Badges</h1>
        </div>
      </div>

      <div className="season-page-bar">
        <span className="season-page-count">
          {badges.length} badge{badges.length > 1 ? 's' : ''}
        </span>
      </div>

      {badges.length === 0 ? (
        <p className="empty">Aucun badge pour l'instant. Finis le mois sur le podium.</p>
      ) : (
        <div className="badges-grid">
          {badges.map((badge) => (
            <div key={badge.id} className="badge-cell" onClick={() => setSelectedBadge(badge)}>
              <RankBadgeIcon badge={badge} size={64} />
              <span className="badge-cell-title">{badgeTitle(badge)}</span>
              <span className="badge-cell-season">{badge.seasonName}</span>
            </div>
          ))}
        </div>
      )}

      {selectedBadge && (
        <div className="modal-overlay" onClick={() => setSelectedBadge(null)}>
          <div
            className="badge-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              '--metal-from': BADGE_RANKS[selectedBadge.rank]?.from,
              '--metal-to': BADGE_RANKS[selectedBadge.rank]?.to,
            } as React.CSSProperties}
          >
            <button className="member-modal-close" onClick={() => setSelectedBadge(null)}>
              <X size={18} />
            </button>
            <RankBadgeIcon badge={selectedBadge} size={112} />
            <h3 className="badge-modal-title">{badgeTitle(selectedBadge)}</h3>
            <span className="badge-modal-metal">{BADGE_RANKS[selectedBadge.rank]?.name}</span>
            <div className="badge-modal-meta">
              <span>{selectedBadge.seasonName}</span>
              <span>{badgeMonthLabel(selectedBadge.monthKey)}</span>
              <span>Groupe {selectedBadge.groupName}</span>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
