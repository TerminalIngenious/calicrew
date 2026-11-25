import { useLayoutEffect, useRef, useState } from 'react';
import { Check, Info, Medal, X } from 'lucide-react';
import { getRarityLabel } from '../lib/cards';
import CoffrePass from './CoffrePass';
import type { CardRarity } from '../types';

/**
 * L'échelle des niveaux de profil.
 *
 * Elle a d'abord réutilisé celle du pass, et c'était une erreur. Le pass
 * donne un coffre à *chaque* palier : ses cent lignes se ressemblent, et
 * c'est très bien, on y défile pour trouver le sien. Les niveaux de profil
 * ne donnent quelque chose qu'un palier sur deux, puis un sur cinq — la même
 * mise en page y produisait une liste en dents de scie, une ligne haute avec
 * un coffre, une ligne basse avec « 288 XP » tout seul, et rien qui dise où
 * regarder.
 *
 * Ici les deux sortes de paliers ne se ressemblent plus du tout :
 *
 *  — un palier sans récompense est un **cran** : 34 px, un point creux, le
 *    numéro en gris, et rien d'autre. On défile devant sans s'arrêter ;
 *  — un palier qui donne quelque chose est une **station** : deux fois plus
 *    haut, un point plein, sa récompense dessinée et nommée.
 *
 * C'est ce rythme qui fait la route. Sans lui, deux cents lignes identiques
 * ne sont pas un chemin, c'est un tableau.
 */

export interface PalierProfil {
  niveau: number;
  coffre?: CardRarity;
  badge?: boolean;
}

export default function PisteProfil({
  paliers,
  niveauActuel,
  seasonId,
  pied,
}: {
  paliers: PalierProfil[];
  niveauActuel: number;
  seasonId: string;
  pied?: React.ReactNode;
}) {
  const [info, setInfo] = useState<CardRarity | null>(null);

  /* On arrive sur son palier, pas sur le premier : celui du bas a été
     franchi il y a des mois. Avant la peinture, pour qu'on ne voie pas la
     page sauter. */
  const prochainRef = useRef<HTMLLIElement>(null);
  useLayoutEffect(() => {
    prochainRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <div className="niv-piste">
      <ol className="niv-rangs">
        {paliers.map((p) => {
          const atteint = niveauActuel >= p.niveau;
          const prochain = niveauActuel === p.niveau - 1;
          const station = !!p.coffre || !!p.badge;
          const garanti = !!p.coffre && p.coffre !== 'commune';
          const label = p.coffre ? getRarityLabel(p.coffre, seasonId) : '';

          return (
            <li
              key={p.niveau}
              ref={prochain ? prochainRef : undefined}
              className={[
                'niv-rang',
                station ? 'station' : 'cran',
                atteint ? 'atteint' : '',
                prochain ? 'prochain' : '',
              ].join(' ')}
            >
              <span className="niv-puce" aria-hidden="true">
                {atteint && station && <Check size={11} />}
              </span>

              <span className="niv-num">{p.niveau}</span>

              {station ? (
                <>
                  <span className="niv-recompense">
                    {p.coffre && <CoffrePass rarity={p.coffre} size={44} />}
                    {p.badge && (
                      <span className="niv-medaille" aria-hidden="true">
                        <Medal size={p.coffre ? 12 : 26} />
                      </span>
                    )}
                  </span>
                  {/* Pas de coût sous la récompense : une station dit ce
                      qu'elle donne, et rien d'autre. Les crans qui l'entourent
                      portent déjà le barème, c'est assez pour situer l'effort. */}
                  <span className="niv-texte">
                    <b>
                      {p.coffre
                        ? garanti ? `Coffre ${label.toLowerCase()}` : 'Coffre'
                        : 'Badge'}
                      {/* Le « i » n'est là que sur les coffres garantis : sur
                          un coffre blanc, il n'y aurait rien à expliquer. */}
                      {garanti && p.coffre && (
                        <button
                          className="niv-info"
                          aria-label={`Ce que garantit un coffre ${label.toLowerCase()}`}
                          onClick={() => setInfo(p.coffre!)}
                        >
                          <Info size={13} />
                        </button>
                      )}
                    </b>
                  </span>
                </>
              ) : null}

              {prochain && <span className="niv-prochain">Prochain</span>}
            </li>
          );
        })}
      </ol>

      {pied}

      {info && (
        <div className="modal-overlay" onClick={() => setInfo(null)}>
          <div className="bp-info-card" onClick={(e) => e.stopPropagation()}>
            <button className="member-modal-close" onClick={() => setInfo(null)}>
              <X size={18} />
            </button>
            <CoffrePass rarity={info} size={104} />
            <h3>Coffre {getRarityLabel(info, seasonId).toLowerCase()}</h3>
            <p>
              Il contient <strong>au minimum une carte {getRarityLabel(info, seasonId).toLowerCase()}</strong>.
              Tu peux y trouver mieux, jamais moins.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
