import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserProgress } from '../lib/useUserProgress';
import { sortBadges, badgeTitle, badgeMonthLabel, BADGE_RANKS, estEvenement, eventStyle } from '../lib/badges';
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
  /* Les badges d'événement n'ont pas de rang : les compter avec les métaux
     ferait trois « 0 or » chez quelqu'un qui n'a que des événements. */
  const evenements = badges.filter(estEvenement);
  const podium = badges.filter((b) => !estEvenement(b));

  if (loading) return <div className="page loading"><Loader /></div>;

  return (
    <div className="page bdg-page">
      {/* Le bandeau porte le compte, et la répartition des métaux : c'est ce
          qu'on vient vérifier, et c'était une ligne grise de 0,9 rem posée
          sous le titre. Or, argent et bronze gardent leurs couleurs — elles
          disent le rang, elles ne décorent pas. */}
      <header className="bdg-entete">
        <div className="bdg-entete-fond" />
        <div className="bdg-entete-contenu">
          <div className="bdg-haut">
            <button className="bdg-retour" onClick={() => navigate(-1)} aria-label="Revenir en arrière">
              <ArrowLeft size={20} />
            </button>
            <span className="bdg-kicker">Récompenses</span>
          </div>
          <h1 className="bdg-titre">Badges</h1>
          <div className="bdg-mesures">
            <span className="bdg-compte">{badges.length}</span>
            <span className="bdg-legende">
              badge{badges.length > 1 ? 's' : ''} gagné{badges.length > 1 ? 's' : ''}
            </span>
          </div>
          {badges.length > 0 && (
            <div className="bdg-metaux">
              {BADGE_RANKS.map((rang, i) => {
                const combien = podium.filter((b) => b.rank === i).length;
                if (combien === 0) return null;
                return (
                  <span key={rang.name} className="bdg-metal" style={{ color: rang.mid }}>
                    <i style={{ background: rang.mid }} />
                    {combien} {rang.name.toLowerCase()}
                  </span>
                );
              })}
              {evenements.length > 0 && (
                <span className="bdg-metal bdg-metal-event">
                  <i />
                  {evenements.length} événement{evenements.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {badges.length === 0 ? (
        <p className="empty">Aucun badge pour l'instant. Finis le mois sur le podium.</p>
      ) : (
        <div className="badges-grid">
          {badges.map((badge) => (
            <div key={badge.id} className="badge-cell" onClick={() => setSelectedBadge(badge)}>
              <RankBadgeIcon badge={badge} size={64} />
              <span className="badge-cell-title">{badgeTitle(badge)}</span>
              {/* Le mois, et pas la saison : ces classements se jouent du 1er
                  au dernier jour du mois, sans aucun rapport avec la saison
                  en cours. Un badge daté « Casier Judiciaire » ne disait rien
                  de quand il avait été gagné. */}
              <span className="badge-cell-mois">
                {estEvenement(badge)
                  ? eventStyle(badge)?.rubrique ?? 'Événement'
                  : badgeMonthLabel(badge.monthKey)}
              </span>
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
              '--metal-from': eventStyle(selectedBadge)?.from ?? BADGE_RANKS[selectedBadge.rank]?.from,
              '--metal-to': eventStyle(selectedBadge)?.to ?? BADGE_RANKS[selectedBadge.rank]?.to,
            } as React.CSSProperties}
          >
            <button className="member-modal-close" onClick={() => setSelectedBadge(null)}>
              <X size={18} />
            </button>
            <RankBadgeIcon badge={selectedBadge} size={112} />
            <h3 className="badge-modal-title">{badgeTitle(selectedBadge)}</h3>
            {estEvenement(selectedBadge) ? (
              <>
                <span className="badge-modal-metal">{eventStyle(selectedBadge)?.soustitre}</span>
                <div className="badge-modal-meta">
                  <span>{eventStyle(selectedBadge)?.rubrique ?? 'Événement'}</span>
                  {/* Créatine et pas n'ont pas de mois : ils ne se jouent pas
                      du 1er au dernier jour comme un classement. Sans ce
                      garde-fou, la fenêtre affichait « undefined ». */}
                  {selectedBadge.monthKey && <span>{badgeMonthLabel(selectedBadge.monthKey)}</span>}
                </div>
              </>
            ) : (
              <>
                <span className="badge-modal-metal">{BADGE_RANKS[selectedBadge.rank]?.name}</span>
                <div className="badge-modal-meta">
                  <span>{badgeMonthLabel(selectedBadge.monthKey)}</span>
                  <span>Groupe {selectedBadge.groupName}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
