/**
 * Le récap du mois, en HTML d'e-mail.
 *
 * Écrit en tables et en styles en ligne, pas en CSS moderne : une boîte mail
 * n'est pas un navigateur. Gmail jette les feuilles de style, Outlook ignore
 * flex et grid, et la plupart des clients coupent ce qu'ils ne comprennent
 * pas sans rien dire. Tout ce qui suit est donc volontairement vieux.
 *
 * La direction artistique est celle de l'app : fond noir, surfaces gris
 * anthracite, orange système, et la pile de polices du système — la même que
 * celle de l'app, qui a l'avantage de n'avoir rien à télécharger.
 */

import { duMois, type Recap } from './recap.js';

const NOIR = '#000000';
const CARTE = '#1c1c1e';
const BORD = '#2c2c2e';
const TEXTE = '#f5f5f7';
const ESTOMPE = '#8e8e93';
const ACCENT = '#ff9f0a';
const VERT = '#30d158';
const POLICE = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const SITE = 'https://calicrew.vercel.app';

function duree(secondes: number): string {
  const h = Math.floor(secondes / 3600);
  const m = Math.round((secondes % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
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

/** Une carte de section, avec son titre et son contenu déjà en HTML. */
function bloc(titre: string, contenu: string): string {
  return `
  <tr><td style="padding:0 0 12px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${CARTE};border-radius:14px;">
      <tr><td style="padding:18px 20px;">
        <div style="font:700 11px ${POLICE};letter-spacing:1.2px;text-transform:uppercase;color:${ESTOMPE};padding-bottom:10px;">${titre}</div>
        ${contenu}
      </td></tr>
    </table>
  </td></tr>`;
}

/** Les trois chiffres du haut, côte à côte. */
function chiffres(r: Recap): string {
  const cellule = (valeur: string, label: string) => `
    <td width="33%" align="center" style="padding:4px 2px;">
      <div style="font:800 26px ${POLICE};color:${ACCENT};">${valeur}</div>
      <div style="font:600 11px ${POLICE};color:${ESTOMPE};text-transform:uppercase;letter-spacing:0.8px;padding-top:4px;">${label}</div>
    </td>`;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    ${cellule(String(r.seances), r.seances > 1 ? 'séances' : 'séance')}
    ${cellule(nombre(r.reps), 'reps')}
    ${cellule(duree(r.secondes), 'de sport')}
  </tr></table>`;
}

/** La comparaison avec le mois d'avant, en une phrase. */
function evolution(r: Recap): string {
  if (r.veille.seances === 0 && r.seances === 0) return '';
  if (r.veille.seances === 0) {
    return `<div style="font:400 14px/1.5 ${POLICE};color:${TEXTE};">Le mois d’avant, tu n’avais rien enregistré. Là, ${r.seances}. On part de loin, mais on part.</div>`;
  }
  const ecart = r.seances - r.veille.seances;
  const couleur = ecart >= 0 ? VERT : ACCENT;
  const signe = ecart > 0 ? `+${ecart}` : String(ecart);
  const phrase = ecart > 0
    ? 'Tu montes. Le mois prochain va être long pour les autres.'
    : ecart === 0
      ? 'Exactement pareil que le mois d’avant. Une régularité de métronome, ou un manque d’imagination.'
      : 'Ça a baissé. Ce n’est pas un drame, c’est une information.';
  return `
  <div style="font:400 14px/1.5 ${POLICE};color:${TEXTE};">
    <span style="font-weight:800;color:${couleur};">${signe} séance${Math.abs(ecart) > 1 ? 's' : ''}</span>
    par rapport à ${nombre(r.veille.seances)} le mois d’avant. ${phrase}
  </div>`;
}

/** Les exercices les plus travaillés, en barres proportionnelles. */
function exercices(r: Recap): string {
  if (r.topExos.length === 0) return '';
  const max = r.topExos[0].valeur;
  const lignes = r.topExos.map((e) => {
    const part = Math.max(6, Math.round((e.valeur / max) * 100));
    return `
    <tr><td style="padding:5px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font:600 13px ${POLICE};color:${TEXTE};padding-bottom:5px;">${protege(e.nom)}</td>
        <td align="right" style="font:700 13px ${POLICE};color:${ACCENT};padding-bottom:5px;">${nombre(e.valeur)} ${e.unite === 'secondes' ? 's' : 'reps'}</td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${BORD};border-radius:4px;">
        <tr><td width="${part}%" style="background:${ACCENT};border-radius:4px;font-size:0;line-height:0;height:6px;">&nbsp;</td>
            <td style="font-size:0;line-height:0;height:6px;">&nbsp;</td></tr>
      </table>
    </td></tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lignes}</table>`;
}

/** Une ligne libellé / valeur, pour les petits blocs. */
function ligne(label: string, valeur: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="font:400 14px ${POLICE};color:${TEXTE};padding:3px 0;">${label}</td>
    <td align="right" style="font:700 14px ${POLICE};color:${ACCENT};padding:3px 0;">${valeur}</td>
  </tr></table>`;
}

export function sujetRecap(r: Recap): string {
  if (r.seances === 0) return `${r.moisNom} : on t’a cherché`;
  return `${r.moisNom} : ${r.seances} séance${r.seances > 1 ? 's' : ''}, ${nombre(r.reps)} reps`;
}

export function rendsRecap(r: Recap): string {
  const sections: string[] = [];

  const evo = evolution(r);
  if (evo) sections.push(bloc('Par rapport au mois d’avant', evo));

  if (r.topExos.length > 0) {
    sections.push(bloc('Ce que tu as le plus fait', exercices(r)));
  }

  if (r.seances > 0) {
    const regularite = [
      ligne('Jours où tu as bougé', `${r.joursActifs} / ${r.joursDuMois}`),
      r.serie > 1 ? ligne('Plus longue série', `${r.serie} jours d’affilée`) : '',
      r.meilleurJour
        ? ligne('Meilleur jour', `${jourLisible(r.meilleurJour.jour)} — ${nombre(r.meilleurJour.reps)} reps`)
        : '',
    ].join('');
    sections.push(bloc('Ta régularité', regularite));
  }

  /* Pour un mois blanc, la dernière séance remplace les statistiques : c'est
     la seule chose qu'il reste à dire, et elle dit tout. */
  if (r.seances === 0 && r.derniere) {
    sections.push(bloc('Ta dernière séance', `
      <div style="font:700 17px ${POLICE};color:${ACCENT};padding-bottom:6px;">${jourLisible(r.derniere)}</div>
      <div style="font:400 13px/1.5 ${POLICE};color:${ESTOMPE};">Elle t\u2019attend toujours, la suivante. Elle n\u2019est pas rancunière.</div>`));
  }

  if (r.place && r.rivaux > 1) {
    const phrase = r.place === 1
      ? 'Personne devant toi. Profite, ça se reprend vite.'
      : r.place <= 3
        ? 'Le podium est à portée de main, et surtout à portée de séance.'
        : 'Il y a de la place devant. Elle ne va pas se libérer toute seule.';
    sections.push(bloc('Dans le groupe', `
      <div style="font:800 22px ${POLICE};color:${ACCENT};padding-bottom:6px;">${r.place}<span style="font-size:14px;color:${ESTOMPE};"> sur ${r.rivaux}</span></div>
      <div style="font:400 13px/1.5 ${POLICE};color:${ESTOMPE};">Au nombre de reps, parmi ceux qui ont bougé ce mois-ci. ${phrase}</div>`));
  }

  if (r.creatine) {
    const detail = r.creatine.gels > 0
      ? ligne('Gels utilisés', `${r.creatine.gels}`)
      : '';
    sections.push(bloc('Créatine', `
      ${ligne('Jours cochés', `${r.creatine.coches} / ${r.joursDuMois}`)}${detail}
      <div style="font:400 13px/1.5 ${POLICE};color:${ESTOMPE};padding-top:8px;">${
        r.creatine.coches >= r.joursDuMois - 1
          ? 'Un sans-faute, ou presque. Le shaker te remercie.'
          : 'La créatine ne se prend pas toute seule. On a essayé.'
      }</div>`));
  }

  if (r.pas) {
    sections.push(bloc('Tes pas', `
      ${ligne('Total du mois', nombre(r.pas.total))}
      ${ligne('Meilleure journée', nombre(r.pas.meilleur))}
      <div style="font:400 13px/1.5 ${POLICE};color:${ESTOMPE};padding-top:8px;">Soit à peu près ${nombre(Math.round(r.pas.total * 0.00075))} km. À pied. Sans s’en rendre compte.</div>`));
  }

  if (r.cartes > 0) {
    sections.push(bloc('Ta collection', ligne('Cartes possédées', String(r.cartes))));
  }

  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Récap ${duMois(r.mois)}</title>
</head>
<body style="margin:0;padding:0;background:${NOIR};">
<!-- L'aperçu dans la liste des mails : sans lui, le client affiche le début
     du HTML, c'est-à-dire n'importe quoi. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${protege(r.titre.nom)} — ton mois ${duMois(r.mois)} en chiffres.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${NOIR};">
<tr><td align="center" style="padding:24px 12px 40px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

    <tr><td align="center" style="padding:8px 0 22px 0;">
      <img src="${SITE}/icon-192.png" width="54" height="54" alt="CaliCrew"
           style="display:block;border-radius:13px;border:0;">
      <div style="font:800 15px ${POLICE};letter-spacing:3px;color:${TEXTE};padding-top:10px;">CALICREW</div>
      <div style="font:600 12px ${POLICE};letter-spacing:1px;color:${ESTOMPE};text-transform:uppercase;padding-top:4px;">Récap ${duMois(r.mois)}</div>
    </td></tr>

    <tr><td style="padding:0 0 12px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${CARTE};border-radius:14px;border-left:3px solid ${ACCENT};">
        <tr><td style="padding:20px;">
          <div style="font:400 14px ${POLICE};color:${ESTOMPE};">${protege(r.nom)}, ce mois-ci tu étais</div>
          <div style="font:800 27px ${POLICE};color:${ACCENT};padding:6px 0 10px 0;">${r.titre.nom}</div>
          <div style="font:400 15px/1.55 ${POLICE};color:${TEXTE};">${r.titre.phrase}</div>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:0 0 12px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${CARTE};border-radius:14px;">
        <tr><td style="padding:20px 12px;">${chiffres(r)}</td></tr>
      </table>
    </td></tr>

    ${sections.join('')}

    <tr><td align="center" style="padding:14px 0 6px 0;">
      <a href="${SITE}" style="display:inline-block;background:${ACCENT};color:${NOIR};font:700 15px ${POLICE};text-decoration:none;padding:13px 30px;border-radius:999px;">Ouvrir CaliCrew</a>
    </td></tr>

    <tr><td align="center" style="padding:18px 10px 0 10px;">
      <div style="font:400 12px/1.6 ${POLICE};color:${ESTOMPE};">
        Un mail par mois, le 1er, et rien d’autre. Celui ${duMois(r.mois)} est derrière toi :
        le suivant est vierge, et c’est la meilleure nouvelle de ce mail.
      </div>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}
