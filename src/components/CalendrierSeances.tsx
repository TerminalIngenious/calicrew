import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '../types';
import { dayKey } from '../lib/creatine';

/**
 * L'année d'entraînement, une case par jour.
 *
 * Le même principe que le calendrier de GitHub : une grille de sept lignes,
 * une colonne par semaine, une couleur d'autant plus franche que la journée
 * a été chargée. Ce qu'on vient y chercher n'est pas le détail d'un jour —
 * il est déjà dans la liste des séances — mais la forme de l'ensemble : les
 * séries de jours tenus, et les trous.
 */

/** Cinquante-trois colonnes : une année pleine, semaine en cours comprise. */
const SEMAINES = 53;

/**
 * Les paliers, en minutes d'entraînement sur la journée.
 *
 * La durée plutôt que les reps, parce qu'elle est la seule mesure que les
 * trois sports partagent : une sortie de course ne fait aucune rep, et se
 * serait affichée comme une journée vide. Une séance sans durée notée
 * compte quand même pour le premier palier — elle a eu lieu.
 */
const PALIERS = [30, 60, 90];

function niveau(minutes: number, seances: number): number {
  if (seances === 0) return 0;
  return 1 + PALIERS.filter((p) => minutes >= p).length;
}

/** Le lundi de la semaine qui contient cette date. */
function lundiDe(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const jour = d.getDay();
  d.setDate(d.getDate() - (jour === 0 ? 6 : jour - 1));
  return d;
}

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
              'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export default function CalendrierSeances({ sessions }: { sessions: Session[] }) {
  // L'heure est lue une fois au montage : lue à chaque rendu, elle ferait
  // changer la grille au milieu d'une journée passée à minuit.
  const [maintenant] = useState(() => Date.now());
  const piste = useRef<HTMLDivElement>(null);

  const { colonnes, total } = useMemo(() => {
    const parJour = new Map<string, { minutes: number; seances: number }>();
    for (const s of sessions) {
      if (!s.completed) continue;
      const cle = dayKey(new Date(s.createdAt));
      const jour = parJour.get(cle) || { minutes: 0, seances: 0 };
      jour.minutes += Math.round((s.duration || 0) / 60);
      jour.seances += 1;
      parJour.set(cle, jour);
    }

    const debut = lundiDe(new Date(maintenant));
    debut.setDate(debut.getDate() - (SEMAINES - 1) * 7);

    const colonnes: {
      mois: number | null;
      jours: { cle: string; n: number; futur: boolean; titre: string }[];
    }[] = [];
    const curseur = new Date(debut);
    let moisPrecedent = -1;
    let total = 0;

    for (let s = 0; s < SEMAINES; s++) {
      const jours = [];
      let moisColonne: number | null = null;
      for (let j = 0; j < 7; j++) {
        const cle = dayKey(curseur);
        const donnee = parJour.get(cle);
        // Le mois est étiqueté sur la colonne où il commence, d'après le
        // premier jour de la semaine qui lui appartient.
        if (j === 0 && curseur.getMonth() !== moisPrecedent) {
          moisColonne = curseur.getMonth();
          moisPrecedent = curseur.getMonth();
        }
        const futur = curseur.getTime() > maintenant;
        if (donnee) total += donnee.seances;
        const date = `${curseur.getDate()} ${MOIS[curseur.getMonth()]}`;
        jours.push({
          cle,
          n: donnee ? niveau(donnee.minutes, donnee.seances) : 0,
          futur,
          titre: donnee
            ? `${date} — ${donnee.seances} séance${donnee.seances > 1 ? 's' : ''}` +
              (donnee.minutes > 0 ? `, ${donnee.minutes} min` : '')
            : date,
        });
        curseur.setDate(curseur.getDate() + 1);
      }
      colonnes.push({ mois: moisColonne, jours });
    }
    return { colonnes, total };
  }, [sessions, maintenant]);

  // La grille s'ouvre sur la semaine en cours : elle est à droite, et une
  // piste qui démarre sur l'année dernière donne l'impression d'un trou.
  useEffect(() => {
    const el = piste.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [colonnes]);

  return (
    <section className="cal">
      <div className="cal-entete">
        <span className="cal-titre">Ton année</span>
        <span className="cal-total">{total} séance{total > 1 ? 's' : ''}</span>
      </div>

      <div className="cal-piste" ref={piste}>
        <div className="cal-grille">
          <div className="cal-mois">
            {colonnes.map((c, i) => (
              <span key={i} className="cal-mois-case">{c.mois !== null ? MOIS[c.mois] : ''}</span>
            ))}
          </div>
          <div className="cal-cases">
            {colonnes.map((c, i) => (
              <div key={i} className="cal-colonne">
                {c.jours.map((j) => (
                  <span
                    key={j.cle}
                    className={`cal-case n${j.n} ${j.futur ? 'futur' : ''}`}
                    title={j.titre}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cal-legende">
        <span>Moins</span>
        <span className="cal-case n0" />
        <span className="cal-case n1" />
        <span className="cal-case n2" />
        <span className="cal-case n3" />
        <span className="cal-case n4" />
        <span>Plus</span>
      </div>
    </section>
  );
}
