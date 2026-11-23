/**
 * Le récap du mois, en HTML d'e-mail.
 *
 * Écrit en tables et en styles en ligne, pas en CSS moderne : une boîte mail
 * n'est pas un navigateur. Gmail jette les feuilles de style, Outlook ignore
 * flex et grid, et la plupart des clients coupent ce qu'ils ne comprennent
 * pas sans rien dire. Tout ce qui suit est donc volontairement vieux.
 *
 * La mise en page suit une grille d'une seule colonne de 600 pixels, la
 * largeur que tous les clients savent rendre, avec un rythme vertical
 * constant : bandeau, ouverture, chiffres, puis des sections séparées par
 * des filets plutôt que par des boîtes. Une suite de cartes identiques
 * donnait un catalogue ; un filet et un titre suffisent à découper, et
 * l'œil descend au lieu de sauter d'un cadre à l'autre.
 *
 * La direction artistique est celle de l'app : fond noir, orange système,
 * et la pile de polices du système — la même que l'app, et elle a
 * l'avantage de n'avoir rien à télécharger.
 */

import { duMois, type Recap } from './recap.js';

const FOND = '#0a0a0b';
const PANNEAU = '#161618';
const FILET = '#2a2a2d';
const TEXTE = '#f5f5f7';
const ESTOMPE = '#8e8e93';
const SOURDINE = '#5c5c61';
const ACCENT = '#ff9f0a';
const ACCENT_BAS = '#8a5406';
const POLICE = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const SITE = 'https://calicrew.vercel.app';

/** Marge intérieure du contenu, reprise partout pour aligner les colonnes. */
const MARGE = '32px';

function duree(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.round((secondes % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

function nombre(n: number): string {
  // Le séparateur de milliers français est une espace insécable fine, que
  // certaines boîtes mail affichent en losange : on la ramène à une espace.
  return n.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');
}

/** Échappe ce qui vient de la base : un pseudo peut contenir n'importe quoi. */
function protege(texte: string): string {
  return texte
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jourLisible(jour: string): string {
  const [a, m, j] = jour.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(Date.UTC(a, m - 1, j)));
}

/** Le titre d'une section : un carré orange, un libellé, un filet. */
function titre(texte: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td width="8" style="font-size:0;line-height:0;padding:0 8px 0 0;" valign="middle">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="8" height="8" style="background:${ACCENT};font-size:0;line-height:0;">&nbsp;</td>
        </tr></table>
      </td>
      <td style="font:700 11px ${POLICE};letter-spacing:1.6px;text-transform:uppercase;color:${TEXTE};" valign="middle">${texte}</td>
    </tr>
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td height="1" style="background:${FILET};font-size:0;line-height:0;padding:0;">&nbsp;</td></tr>
  </table>`;
}

/** Une section complète : son titre, puis son contenu, avec le rythme commun. */
function section(nom: string, contenu: string): string {
  return `
  <tr><td style="padding:30px ${MARGE} 0 ${MARGE};">
    ${titre(nom)}
    <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
    ${contenu}
  </td></tr>`;
}

/** Une ligne de données : libellé à gauche, valeur à droite, filet dessous. */
function ligne(label: string, valeur: string, dernier = false): string {
  return `
  <tr>
    <td style="font:400 15px ${POLICE};color:${ESTOMPE};padding:11px 0;">${label}</td>
    <td align="right" style="font:700 15px ${POLICE};color:${TEXTE};padding:11px 0;">${valeur}</td>
  </tr>
  ${dernier ? '' : `<tr><td colspan="2" height="1" style="background:${FILET};font-size:0;line-height:0;">&nbsp;</td></tr>`}`;
}

function tableau(lignes: string[]): string {
  const vraies = lignes.filter(Boolean);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${vraies.join('')}</table>`;
}

/**
 * Le calendrier du mois.
 *
 * C'est la seule image du mail, et elle est faite de cases : un mois se lit
 * d'un coup d'œil sous cette forme, là où une liste de dates demande un
 * effort. Deux tons d'orange selon l'intensité du jour — une case pleine
 * partout aurait aplati un mois à deux séances et un mois à vingt.
 */
function calendrier(r: Recap): string {
  const an = Number(r.mois.slice(0, 4));
  const mois = Number(r.mois.slice(5, 7));
  // Lundi en tête : getUTCDay() rend 0 pour dimanche, qui finit la semaine.
  const premier = (new Date(Date.UTC(an, mois - 1, 1)).getUTCDay() + 6) % 7;
  const max = Math.max(1, ...Object.values(r.calendrier));

  const cases: string[] = [];
  for (let i = 0; i < premier; i++) cases.push('<td width="30" height="30" style="font-size:0;line-height:0;">&nbsp;</td>');
  for (let j = 1; j <= r.joursDuMois; j++) {
    const cle = `${r.mois}-${String(j).padStart(2, '0')}`;
    const reps = r.calendrier[cle] || 0;
    const actif = cle in r.calendrier;
    const fort = reps >= max * 0.6;
    const fond = actif ? (fort ? ACCENT : ACCENT_BAS) : PANNEAU;
    const encre = actif && fort ? '#0a0a0b' : actif ? TEXTE : SOURDINE;
    cases.push(`<td width="30" height="30" align="center" valign="middle"
      style="background:${fond};border-radius:7px;font:${actif ? 700 : 400} 12px ${POLICE};color:${encre};">${j}</td>`);
  }
  while (cases.length % 7 !== 0) cases.push('<td width="30" height="30" style="font-size:0;line-height:0;">&nbsp;</td>');

  const semaines: string[] = [];
  for (let i = 0; i < cases.length; i += 7) {
    semaines.push(`<tr>${cases.slice(i, i + 7).join('')}</tr>`);
  }

  const entete = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
    .map((d) => `<td width="30" align="center" style="font:600 10px ${POLICE};color:${SOURDINE};padding-bottom:6px;">${d}</td>`)
    .join('');

  return `
  <table role="presentation" align="center" cellpadding="0" cellspacing="4" border="0" style="margin:0 auto;">
    <tr>${entete}</tr>
    ${semaines.join('')}
  </table>
  <div style="font:400 12px ${POLICE};color:${SOURDINE};text-align:center;padding-top:14px;">
    ${r.joursActifs} jour${r.joursActifs > 1 ? 's' : ''} d’entraînement sur ${r.joursDuMois}
  </div>`;
}

/** Les exercices les plus travaillés, en barres proportionnelles. */
function exercices(r: Recap): string {
  const max = r.topExos[0].valeur;
  const lignes = r.topExos.map((e, i) => `
    <tr><td style="padding:${i === 0 ? '0' : '14px'} 0 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font:600 14px ${POLICE};color:${TEXTE};padding-bottom:7px;">${protege(e.nom)}</td>
        <td align="right" style="font:700 14px ${POLICE};color:${ACCENT};padding-bottom:7px;">${nombre(e.valeur)}<span style="color:${SOURDINE};font-weight:400;"> ${e.unite === 'secondes' ? 's' : 'reps'}</span></td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${FILET};border-radius:3px;">
        <tr>
          <td width="${Math.max(5, Math.round((e.valeur / max) * 100))}%" height="5"
              style="background:${ACCENT};border-radius:3px;font-size:0;line-height:0;">&nbsp;</td>
          <td height="5" style="font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>
    </td></tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lignes}</table>`;
}

/** La pastille d'écart avec le mois précédent, et sa phrase. */
function evolution(r: Recap): string {
  if (r.veille.seances === 0) {
    return `<div style="font:400 15px/1.6 ${POLICE};color:${ESTOMPE};">Le mois d’avant, rien n’était enregistré. Là, ${r.seances}. On part de loin, mais on part.</div>`;
  }
  const ecart = r.seances - r.veille.seances;
  const monte = ecart >= 0;
  const phrase = ecart > 0
    ? 'Tu montes. Le mois prochain va être long pour les autres.'
    : ecart === 0
      ? 'Exactement pareil que le mois d’avant. Métronome, ou manque d’imagination.'
      : 'Ça a baissé. Ce n’est pas un drame, c’est une information.';
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="86" valign="top" style="padding-top:2px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="background:${monte ? ACCENT : PANNEAU};border-radius:999px;padding:7px 14px;
                       font:800 15px ${POLICE};color:${monte ? '#0a0a0b' : ESTOMPE};white-space:nowrap;">
          ${ecart > 0 ? '+' : ''}${ecart}
        </td></tr>
      </table>
    </td>
    <td valign="top" style="font:400 14px/1.6 ${POLICE};color:${ESTOMPE};padding-top:6px;">
      séance${Math.abs(ecart) > 1 ? 's' : ''} par rapport aux ${nombre(r.veille.seances)} du mois d’avant. ${phrase}
    </td>
  </tr></table>`;
}

export function sujetRecap(r: Recap): string {
  if (r.seances === 0) return `${r.moisNom} : on t’a cherché`;
  return `${r.moisNom} : ${r.seances} séance${r.seances > 1 ? 's' : ''}, ${nombre(r.reps)} reps`;
}

export function rendsRecap(r: Recap): string {
  const sections: string[] = [];

  if (r.seances > 0) {
    sections.push(section(`${r.moisNom} jour par jour`, calendrier(r)));

    sections.push(section('Le mois en chiffres', tableau([
      ligne('Séances', String(r.seances)),
      ligne('Répétitions', nombre(r.reps)),
      ligne('Temps de sport', duree(r.secondes)),
      r.serie > 1 ? ligne('Plus longue série', `${r.serie} jours d’affilée`) : '',
      r.meilleurJour
        ? ligne('Meilleur jour', `${jourLisible(r.meilleurJour.jour)}`, true)
        : ligne('Jours actifs', `${r.joursActifs} / ${r.joursDuMois}`, true),
    ])));

    if (r.topExos.length > 0) {
      sections.push(section('Ce que tu as le plus travaillé', exercices(r)));
    }

    sections.push(section('Face au mois d’avant', evolution(r)));
  }

  if (r.seances === 0 && r.derniere) {
    sections.push(section('Ta dernière séance', `
      <div style="font:700 20px ${POLICE};color:${ACCENT};padding-bottom:8px;">${jourLisible(r.derniere)}</div>
      <div style="font:400 14px/1.6 ${POLICE};color:${ESTOMPE};">Elle t’attend toujours, la suivante. Elle n’est pas rancunière.</div>`));
  }

  if (r.place && r.rivaux > 1) {
    const phrase = r.place === 1
      ? 'Personne devant toi. Profite, ça se reprend vite.'
      : r.place <= 3
        ? 'Le podium est à portée de main, et surtout à portée de séance.'
        : 'Il y a de la place devant. Elle ne se libérera pas toute seule.';
    sections.push(section('Dans le groupe', `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="96" valign="top" style="line-height:1;padding-top:2px;">
          <span style="font:800 44px/1 ${POLICE};color:${ACCENT};">${r.place}</span>
          <span style="font:600 14px ${POLICE};color:${SOURDINE};"> / ${r.rivaux}</span>
        </td>
        <td valign="top" style="font:400 14px/1.6 ${POLICE};color:${ESTOMPE};">
          Au nombre de répétitions, parmi ceux qui ont bougé ce mois-ci. ${phrase}
        </td>
      </tr></table>`));
  }

  const cotes: string[] = [];
  if (r.creatine) {
    cotes.push(`
      <div style="font:700 11px ${POLICE};letter-spacing:1.4px;text-transform:uppercase;color:${SOURDINE};padding-bottom:10px;">Créatine</div>
      <div style="font:800 26px ${POLICE};color:${TEXTE};">${r.creatine.coches}<span style="font-size:14px;color:${SOURDINE};font-weight:600;"> / ${r.joursDuMois}</span></div>
      <div style="font:400 12px/1.5 ${POLICE};color:${ESTOMPE};padding-top:8px;">${
        r.creatine.gels > 0
          ? `jours cochés, dont ${r.creatine.gels} rattrapé${r.creatine.gels > 1 ? 's' : ''} au gel.`
          : 'jours cochés. Le shaker tient les comptes.'
      }</div>`);
  }
  if (r.pas) {
    cotes.push(`
      <div style="font:700 11px ${POLICE};letter-spacing:1.4px;text-transform:uppercase;color:${SOURDINE};padding-bottom:10px;">Pas</div>
      <div style="font:800 26px ${POLICE};color:${TEXTE};">${nombre(r.pas.total)}</div>
      <div style="font:400 12px/1.5 ${POLICE};color:${ESTOMPE};padding-top:8px;">soit environ ${nombre(Math.round(r.pas.total * 0.00075))} km, sans y penser.</div>`);
  }
  if (cotes.length > 0) {
    const cellule = (contenu: string) => `
      <td width="48%" valign="top" style="background:${PANNEAU};border-radius:12px;padding:18px;">${contenu}</td>`;
    const corps = cotes.length === 2
      ? `<tr>${cellule(cotes[0])}<td width="4%" style="font-size:0;line-height:0;">&nbsp;</td>${cellule(cotes[1])}</tr>`
      : `<tr><td valign="top" style="background:${PANNEAU};border-radius:12px;padding:18px;">${cotes[0]}</td></tr>`;
    sections.push(`
      <tr><td style="padding:30px ${MARGE} 0 ${MARGE};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${corps}</table>
      </td></tr>`);
  }

  if (r.cartes > 0) {
    sections.push(section('Ta collection', tableau([
      ligne('Cartes possédées', String(r.cartes), true),
    ])));
  }

  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Récap ${duMois(r.mois)}</title>
</head>
<body style="margin:0;padding:0;background:${FOND};-webkit-text-size-adjust:100%;">
<!-- L'aperçu dans la liste des mails : sans lui, le client affiche le début
     du HTML, c'est-à-dire n'importe quoi. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${protege(r.titre.nom)} — ton mois ${duMois(r.mois)}, en chiffres et jour par jour.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${FOND};">
<tr><td align="center" style="padding:28px 10px 48px 10px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
         style="max-width:600px;width:100%;background:#0f0f11;border-radius:18px;overflow:hidden;">

    <!-- Bandeau : marque à gauche, mois à droite, comme une couverture. -->
    <tr><td style="padding:22px ${MARGE};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" width="34">
          <img src="${SITE}/icon-192.png" width="34" height="34" alt=""
               style="display:block;border-radius:9px;border:0;">
        </td>
        <td valign="middle" style="padding-left:12px;font:800 14px ${POLICE};letter-spacing:2.4px;color:${TEXTE};">CALICREW</td>
        <td valign="middle" align="right" style="font:600 11px ${POLICE};letter-spacing:1.6px;text-transform:uppercase;color:${SOURDINE};">
          ${r.moisNom} ${r.mois.slice(0, 4)}
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 ${MARGE};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td height="1" style="background:${FILET};font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>

    <!-- L'ouverture : le titre du mois, en grand, et sa phrase. -->
    <tr><td style="padding:34px ${MARGE} 30px ${MARGE};">
      <div style="font:600 12px ${POLICE};letter-spacing:1.6px;text-transform:uppercase;color:${ACCENT};padding-bottom:12px;">
        ${protege(r.nom)}, ce mois-ci tu étais
      </div>
      <div style="font:800 38px/1.1 ${POLICE};color:${TEXTE};padding-bottom:16px;">${r.titre.nom}</div>
      <div style="font:400 16px/1.65 ${POLICE};color:${ESTOMPE};">${r.titre.phrase}</div>
    </td></tr>

    <!-- Les trois chiffres, séparés par des filets verticaux et non par des
         cadres : une bande de données, pas trois boîtes. -->
    <tr><td style="padding:0 ${MARGE};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${PANNEAU};border-radius:14px;">
        <tr>
          <td width="33%" align="center" style="padding:20px 6px;">
            <div style="font:800 28px ${POLICE};color:${TEXTE};">${r.seances}</div>
            <div style="font:600 10px ${POLICE};letter-spacing:1.4px;text-transform:uppercase;color:${SOURDINE};padding-top:6px;">${r.seances > 1 ? 'séances' : 'séance'}</div>
          </td>
          <td width="1" style="background:${FILET};font-size:0;line-height:0;">&nbsp;</td>
          <td width="33%" align="center" style="padding:20px 6px;">
            <div style="font:800 28px ${POLICE};color:${TEXTE};">${nombre(r.reps)}</div>
            <div style="font:600 10px ${POLICE};letter-spacing:1.4px;text-transform:uppercase;color:${SOURDINE};padding-top:6px;">reps</div>
          </td>
          <td width="1" style="background:${FILET};font-size:0;line-height:0;">&nbsp;</td>
          <td width="33%" align="center" style="padding:20px 6px;">
            <div style="font:800 28px ${POLICE};color:${TEXTE};">${duree(r.secondes)}</div>
            <div style="font:600 10px ${POLICE};letter-spacing:1.4px;text-transform:uppercase;color:${SOURDINE};padding-top:6px;">de sport</div>
          </td>
        </tr>
      </table>
    </td></tr>

    ${sections.join('')}

    <!-- L'appel, détaché du contenu par un filet : on a fini de raconter. -->
    <tr><td style="padding:34px ${MARGE} 0 ${MARGE};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td height="1" style="background:${FILET};font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:28px ${MARGE} 34px ${MARGE};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr><td style="background:${ACCENT};border-radius:999px;">
          <a href="${SITE}" style="display:block;padding:15px 38px;font:700 15px ${POLICE};color:#0a0a0b;text-decoration:none;">Ouvrir CaliCrew</a>
        </td></tr>
      </table>
      <div style="font:400 13px ${POLICE};color:${SOURDINE};padding-top:16px;">Le mois qui commence est vierge. C’est la meilleure nouvelle de ce mail.</div>
    </td></tr>

  </table>

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
    <tr><td align="center" style="padding:20px 24px 0 24px;font:400 11px/1.7 ${POLICE};color:${SOURDINE};">
      CaliCrew — un mail par mois, le 1er, et rien d’autre.
    </td></tr>
  </table>

</td></tr></table>
</body></html>`;
}
