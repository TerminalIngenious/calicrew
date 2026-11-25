import { useMemo, useState } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getRarityLabel, RARITY_COLORS, getCardDisplayName, RARITY_ORDER } from '../lib/cards';
import { getCurrentSeason } from '../lib/passes';
import { doublons, appliqueEchange, XP_PAR_RARETE } from '../lib/echangeXp';
import { useScrollLock } from '../lib/useScrollLock';
import type { UserProgress } from '../types';
import { X, Minus, Plus, Sparkles } from 'lucide-react';

interface Props {
  uid: string;
  progress: UserProgress;
  onClose: () => void;
}

/**
 * L'écran d'échange des doublons contre du CaliPass.
 *
 * La sélection est locale et ne part qu'à la confirmation : on détruit des
 * cartes, personne ne doit pouvoir le faire d'un seul geste par mégarde.
 */
export default function EchangeDoublons({ uid, progress, onClose }: Props) {
  useScrollLock(true);
  const lot = useMemo(() => doublons(progress.ownedCards), [progress.ownedCards]);

  /** Combien d'exemplaires sont sélectionnés, par carte. */
  const [choix, setChoix] = useState<Record<string, number>>({});
  const [confirme, setConfirme] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [gain, setGain] = useState<{ xp: number; cartes: number } | null>(null);

  const cartes = Object.values(choix).reduce((t, n) => t + n, 0);
  const xp = lot.reduce((t, d) => t + (choix[d.card.id] || 0) * d.xpUnitaire, 0);

  function bouge(cardId: string, delta: number, max: number) {
    setConfirme(false);
    setChoix((prev) => {
      const n = Math.max(0, Math.min(max, (prev[cardId] || 0) + delta));
      return { ...prev, [cardId]: n };
    });
  }

  function tout() {
    setConfirme(false);
    setChoix(Object.fromEntries(lot.map((d) => [d.card.id, d.extra])));
  }

  async function echange() {
    if (cartes === 0 || envoi) return;
    if (!confirme) {
      setConfirme(true);
      return;
    }
    setEnvoi(true);
    setErreur(false);
    const saison = getCurrentSeason();
    try {
      /* En transaction : l'échange lit la collection avant de la réduire, et
         un coffre ouvert au même moment sur un autre appareil écrirait sur la
         même ligne. C'est le seul endroit de l'app qui détruit des cartes. */
      const resultat = await runTransaction(db, async (tx) => {
        const ref = doc(db, 'userProgress', uid);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('progression absente');
        const stored = snap.data() as UserProgress;
        const suite = appliqueEchange(stored, choix, saison);
        if (suite.rendus === 0) return suite;
        tx.update(ref, {
          ownedCards: suite.ownedCards,
          passXp: suite.passXp,
          chestsToOpen: suite.chestsToOpen,
          currentSeasonId: suite.currentSeasonId,
        });
        return suite;
      });
      setGain({ xp: resultat.xpGagne, cartes: resultat.rendus });
      setChoix({});
      setConfirme(false);
    } catch (err) {
      console.error('Échange impossible :', err);
      setErreur(true);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="echange-modal" onClick={(e) => e.stopPropagation()}>
        <div className="echange-tete">
          <h3>Échanger des doublons</h3>
          <button className="echange-fermer" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        {gain ? (
          <div className="echange-fini">
            <Sparkles size={28} />
            <strong>+{gain.xp} CaliPass</strong>
            <span>
              {gain.cartes} carte{gain.cartes > 1 ? 's' : ''} échangée{gain.cartes > 1 ? 's' : ''}
            </span>
            <button className="primary-btn" onClick={onClose}>Terminé</button>
          </div>
        ) : lot.length === 0 ? (
          <p className="echange-vide">
            Aucun doublon pour l'instant. Reviens quand un coffre t'aura donné deux fois la même.
          </p>
        ) : (
          <>
            <p className="echange-intro">
              Tu gardes toujours un exemplaire de chaque carte. Les suivants se rendent contre
              du CaliPass.
            </p>

            <div className="echange-tarifs">
              {RARITY_ORDER.filter((r) => XP_PAR_RARETE[r] > 0).map((r) => (
                <span key={r} className="echange-tarif" style={{ color: RARITY_COLORS[r] }}>
                  {getRarityLabel(r)} · {XP_PAR_RARETE[r]}
                </span>
              ))}
            </div>

            <button className="echange-tout" onClick={tout}>Tout sélectionner</button>

            <div className="echange-liste">
              {lot.map((d) => {
                const pris = choix[d.card.id] || 0;
                return (
                  <div key={d.card.id} className={`echange-ligne ${pris > 0 ? 'prise' : ''}`}>
                    <span
                      className="echange-vignette"
                      style={{ borderColor: RARITY_COLORS[d.card.rarity] }}
                    >
                      {d.card.emoji}
                    </span>
                    <div className="echange-nom">
                      <strong>{getCardDisplayName(d.card)}</strong>
                      <span style={{ color: RARITY_COLORS[d.card.rarity] }}>
                        {getRarityLabel(d.card.rarity, d.card.set)} · {d.xpUnitaire} CaliPass · {d.extra} en trop
                      </span>
                    </div>
                    <div className="echange-compteur">
                      <button
                        onClick={() => bouge(d.card.id, -1, d.extra)}
                        disabled={pris === 0}
                        aria-label="Un de moins"
                      >
                        <Minus size={14} />
                      </button>
                      <span>{pris}</span>
                      <button
                        onClick={() => bouge(d.card.id, 1, d.extra)}
                        disabled={pris >= d.extra}
                        aria-label="Un de plus"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Un échec doit se voir : la transaction peut échouer hors ligne,
                et les cartes sont alors toujours là. */}
            {erreur && (
              <p className="echange-erreur">
                L'échange n'a pas pu se faire. Tes cartes sont intactes, réessaie.
              </p>
            )}

            <div className="echange-pied">
              {/* Le pied dit ce qui part, le bouton ne dit que l'acte : un
                  libellé long passait à la ligne sur un écran de téléphone. */}
              <span className={`echange-total ${confirme ? 'avertit' : ''}`}>
                {confirme
                  ? `${cartes} carte${cartes > 1 ? 's' : ''} partent définitivement`
                  : cartes === 0
                    ? 'Aucune carte sélectionnée'
                    : `${cartes} carte${cartes > 1 ? 's' : ''} → +${xp} CaliPass`}
              </span>
              <button
                className={`primary-btn ${confirme ? 'danger' : ''}`}
                onClick={echange}
                disabled={cartes === 0 || envoi}
              >
                {envoi ? 'Échange…' : confirme ? 'Confirmer' : 'Échanger'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
