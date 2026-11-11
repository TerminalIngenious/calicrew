import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
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

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function CalendrierSeances({ sessions }: { sessions: Session[] }) {
  // L'heure est lue une fois au montage : lue à chaque rendu, elle ferait
  // changer la grille au milieu d'une journée passée à minuit.
  const [maintenant] = useState(() => Date.now());
  /*
   * Deux lectures de la même chose, et le titre fait l'interrupteur.
   *
   * L'année montre la forme d'ensemble, les séries et les trous ; le mois
   * montre où on en est maintenant, avec les dates lisibles. Mettre les deux
   * l'une sous l'autre aurait doublé la hauteur d'un écran qui doit
   * s'ouvrir sur le bouton « Nouvelle séance ».
   */
  const [vue, setVue] = useState<'annee' | 'mois'>('annee');
  const piste = useRef<HTMLDivElement>(null);

  const { colonnes, total, mois, totalMois, titreMois } = useMemo(() => {
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

    // Le mois en cours : une grille de sept colonnes, du lundi au dimanche.
    const ref = new Date(maintenant);
    const premier = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const dernier = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    // Le décalage du 1er : getDay() compte à partir du dimanche, la grille
    // commence au lundi.
    const decalage = (premier.getDay() + 6) % 7;
    const mois: ({ cle: string; jour: number; n: number; futur: boolean; titre: string } | null)[] =
      Array(decalage).fill(null);
    let totalMois = 0;
    for (let d = 1; d <= dernier; d++) {
      const date = new Date(ref.getFullYear(), ref.getMonth(), d);
      const cle = dayKey(date);
      const donnee = parJour.get(cle);
      if (donnee) totalMois += donnee.seances;
      mois.push({
        cle,
        jour: d,
        n: donnee ? niveau(donnee.minutes, donnee.seances) : 0,
        futur: date.getTime() > maintenant,
        titre: donnee
          ? `${donnee.seances} séance${donnee.seances > 1 ? 's' : ''}` +
            (donnee.minutes > 0 ? `, ${donnee.minutes} min` : '')
          : '',
      });
    }
    const titreMois = `${MOIS[ref.getMonth()]} ${ref.getFullYear()}`;

    return { colonnes, total, mois, totalMois, titreMois };
  }, [sessions, maintenant]);

  // La grille s'ouvre sur la semaine en cours : elle est à droite, et une
  // piste qui démarre sur l'année dernière donne l'impression d'un trou.
  // Refait à chaque retour sur la vue année, sinon la piste rouvre là où
  // elle avait été laissée après un aller-retour par le mois.
  useEffect(() => {
    if (vue !== 'annee') return;
    const el = piste.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [colonnes, vue]);

  return (
    <section className="cal">
      <button
        type="button"
        className="cal-entete"
        onClick={() => setVue((v) => (v === 'annee' ? 'mois' : 'annee'))}
        aria-label={vue === 'annee' ? 'Voir le mois' : 'Voir l\'année'}
      >
        <span className="cal-titre">
          {vue === 'annee' ? 'Ton année' : `Ton mois · ${titreMois}`}
          <ChevronDown size={13} />
        </span>
        <span className="cal-total">
          {vue === 'annee' ? total : totalMois} séance{(vue === 'annee' ? total : totalMois) > 1 ? 's' : ''}
        </span>
      </button>

      {vue === 'annee' ? (
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
      ) : (
        <div className="cal-mois-grille">
          {JOURS.map((j, i) => (
            <span key={i} className="cal-jour-nom">{j}</span>
          ))}
          {mois.map((j, i) =>
            j === null ? (
              <span key={`vide-${i}`} />
            ) : (
              <span
                key={j.cle}
                className={`cal-case cal-case-mois n${j.n} ${j.futur ? 'futur' : ''}`}
                title={j.titre}
              >
                {j.jour}
              </span>
            )
          )}
        </div>
      )}

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
