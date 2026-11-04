/**
 * Saison 2 — les données que la carte dessine en plus de son identité.
 *
 * La face est dessinée en direct par <CardFront> plutôt qu'affichée en image :
 * la girouette défile, la pluie tombe, et le tout reste net à n'importe quel
 * zoom. Il lui faut donc le contenu imprimé sur la carte, que le type `Card` ne
 * porte pas.
 *
 * On ne répète pas ici le surnom, la famille ni la rareté : <CardFront> les lit
 * sur la carte, pour qu'il n'y ait qu'un seul endroit à corriger. Le prénom et
 * le nom font exception — la carte les dessine sur deux lignes de tailles
 * différentes, alors que `Card` ne porte que le nom complet.
 *
 * `photo` est nul quand on n'a pas encore de portrait : la carte affiche une
 * silhouette à la place.
 */

export interface CardStat {
  nom: string;
  valeur: number;
}

export interface CardSkill {
  icone: string;
  nom: string;
  description: string;
  bonus: string;
}

export interface CardInfo {
  label: string;
  valeur: string;
  /** Code pays à deux lettres, dessiné en drapeau. */
  drapeau: string | null;
  /** Met la valeur en avant — « Recherché », « Mort », etc. */
  surligne: boolean;
}

export interface CardArt {
  /** Rang de la carte dans la saison, imprimé en bas à droite (« 003/050 »). */
  numero: string;
  prenom: string;
  nom: string;
  /** La ligne de bus, c'est-à-dire le rang de la famille. */
  ligne: number;
  valeur: number;
  citation: string;
  photo: string | null;
  stats: CardStat[];
  competences: CardSkill[];
  infos: CardInfo[];
}

export const S2_ART: Record<string, CardArt> = {
  's2-ciao-energy': {
    numero: '001/049', prenom: '', nom: 'Ciao Energy',
    ligne: 1, valeur: 95,
    citation: 'Ce n\'est pas un partenariat.',
    photo: '/photos/s2-ciao-energy.webp',
    stats: [{ nom: 'Hype', valeur: 99 }, { nom: 'Marge', valeur: 96 }, { nom: 'Caféine', valeur: 93 }, { nom: 'Placement', valeur: 98 }, { nom: 'Prix', valeur: 91 }],
    competences: [
      { icone: '★', nom: 'Trio infernal', description: 'Trois youtubeurs, une canette, zéro partenariat.', bonus: '+30 Hype' },
      { icone: '$', nom: 'Rayons vidés', description: 'Ruptures de stock dès le lancement.', bonus: '+20 Marge' },
      { icone: '!', nom: 'Convoqué', description: 'Squeezie auditionné à l\'Assemblée sur les boissons énergisantes.', bonus: '+15 Placement' },
    ],
    infos: [
      { label: 'Origine', valeur: 'France', drapeau: 'FR', surligne: false },
      { label: 'Lancement', valeur: 'Juin 2026', drapeau: null, surligne: false },
      { label: 'Créateurs', valeur: 'Squeezie, Léna, Inox', drapeau: null, surligne: false },
      { label: 'Rayon', valeur: 'Énergisant', drapeau: null, surligne: true },
    ],
  },
  's2-p-diddy': {
    numero: '002/049', prenom: 'P.', nom: 'Diddy',
    ligne: 4, valeur: 96,
    citation: 'You need locks on the doors.',
    photo: '/photos/s2-p-diddy.webp',
    stats: [{ nom: 'Huile', valeur: 100 }, { nom: 'Fêtes', valeur: 97 }, { nom: 'Avocats', valeur: 94 }, { nom: 'Label', valeur: 90 }, { nom: 'Discrétion', valeur: 12 }],
    competences: [
      { icone: '☂', nom: 'Stock d\'huile', description: 'Des centaines de bouteilles saisies lors des perquisitions.', bonus: '+100 Huile' },
      { icone: '♪', nom: 'Bad Boy Records', description: 'Fondateur du label de Notorious B.I.G.', bonus: '+20 Label' },
      { icone: '⚖', nom: 'Verdict partiel', description: 'Acquitté des chefs les plus lourds, condamné quand même (2025).', bonus: '+10 Avocats' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Américaine', drapeau: 'US', surligne: false },
      { label: 'Âge', valeur: '56 ans', drapeau: null, surligne: false },
      { label: 'Statut', valeur: 'En prison', drapeau: null, surligne: true },
      { label: 'Libération', valeur: 'Prévue en 2028', drapeau: null, surligne: false },
    ],
  },
  's2-xddl': {
    numero: '003/049', prenom: 'Xavier', nom: 'Dupont de Ligonnès',
    ligne: 3, valeur: 91,
    citation: 'Nous partons vivre en Australie.',
    photo: '/photos/s2-xddl.webp',
    stats: [{ nom: 'Discrétion', valeur: 99 }, { nom: 'Cavale', valeur: 97 }, { nom: 'Mythomanie', valeur: 94 }, { nom: 'Sang-froid', valeur: 88 }, { nom: 'Mystère', valeur: 100 }],
    competences: [
      { icone: '007', nom: 'Agent de la DEA', description: 'Fait croire à ses proches qu\'il est un agent infiltré.', bonus: '+20 Mythomanie' },
      { icone: '✈', nom: 'Sosie de Glasgow', description: 'Un innocent se fait arrêter à sa place.', bonus: '+30% Cavale' },
      { icone: '?', nom: 'Mode fantôme', description: 'Immunisé aux avis de recherche depuis 2011.', bonus: '+100 Mystère' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Âge', valeur: '65 ans', drapeau: null, surligne: false },
      { label: 'Statut', valeur: 'Recherché', drapeau: null, surligne: true },
      { label: 'Disparu', valeur: 'Avril 2011', drapeau: null, surligne: false },
    ],
  },
  's2-hitler': {
    numero: '004/049', prenom: 'Adolf', nom: 'Hitler',
    ligne: 2, valeur: 90,
    citation: 'Je voulais devenir peintre.',
    photo: '/photos/s2-hitler.webp',
    stats: [{ nom: 'Peinture', valeur: 11 }, { nom: 'Stratégie', valeur: 23 }, { nom: 'Moustache', valeur: 99 }, { nom: 'Colère', valeur: 97 }, { nom: 'Testicules', valeur: 50 }],
    competences: [
      { icone: '✎', nom: 'Recalé', description: 'Refusé deux fois par l\'Académie des beaux-arts de Vienne.', bonus: '-100 Peinture' },
      { icone: '❄', nom: 'Hiver russe', description: 'Attaque l\'URSS sans prévoir l\'hiver.', bonus: '-50 Stratégie' },
      { icone: '☠', nom: 'Fin au bunker', description: 'Termine la partie dans un bunker à Berlin.', bonus: 'Game over' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Autrichienne', drapeau: 'AT', surligne: false },
      { label: 'Mort', valeur: 'À 56 ans', drapeau: null, surligne: false },
      { label: 'Régime', valeur: 'IIIe Reich', drapeau: null, surligne: false },
      { label: 'Fin', valeur: 'Avril 1945', drapeau: null, surligne: true },
    ],
  },
  's2-elon-musk': {
    numero: '005/049', prenom: 'Elon', nom: 'Musk',
    ligne: 5, valeur: 92,
    citation: 'My heart goes out to you.',
    photo: '/photos/s2-elon-musk.webp',
    stats: [{ nom: 'Fortune', valeur: 100 }, { nom: 'Tweets', valeur: 99 }, { nom: 'Fusées', valeur: 90 }, { nom: 'Enfants', valeur: 94 }, { nom: 'Humilité', valeur: 3 }],
    competences: [
      { icone: 'X', nom: 'Rachat de Twitter', description: '44 milliards pour renommer un oiseau en X.', bonus: '+44 Tweets' },
      { icone: '♥', nom: 'Famille XXL', description: 'Plus d\'une dizaine d\'enfants, dont un nommé X Æ A-12.', bonus: '+12 Enfants' },
      { icone: '⚡', nom: 'DOGE', description: 'Passage éclair au gouvernement Trump en 2025.', bonus: '+10 Chaos' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Américaine', drapeau: 'US', surligne: false },
      { label: 'Âge', valeur: '55 ans', drapeau: null, surligne: false },
      { label: 'Empire', valeur: 'Tesla, SpaceX, X', drapeau: null, surligne: false },
      { label: 'Geste', valeur: 'Janvier 2025', drapeau: null, surligne: true },
    ],
  },
  's2-zeus': {
    numero: '006/049', prenom: '', nom: 'Zeus',
    ligne: 9, valeur: 89,
    citation: 'C\'est pas moi, c\'est le cygne.',
    photo: '/photos/s2-zeus.webp',
    stats: [{ nom: 'Foudre', valeur: 99 }, { nom: 'Infidélité', valeur: 100 }, { nom: 'Déguisement', valeur: 95 }, { nom: 'Enfants', valeur: 98 }, { nom: 'Fidélité', valeur: 1 }],
    competences: [
      { icone: '✦', nom: 'Métamorphose', description: 'Cygne, taureau ou pluie d\'or : tout est bon pour séduire.', bonus: '+30 Déguisement' },
      { icone: '⚡', nom: 'Foudre divine', description: 'Règle les disputes à coups d\'éclairs.', bonus: '+25 Foudre' },
      { icone: '!', nom: 'Héra surveille', description: 'Sa femme est toujours au courant.', bonus: '-40 Discrétion' },
    ],
    infos: [
      { label: 'Origine', valeur: 'Grèce antique', drapeau: null, surligne: false },
      { label: 'Âge', valeur: 'Immortel', drapeau: null, surligne: false },
      { label: 'Poste', valeur: 'Roi de l\'Olympe', drapeau: null, surligne: true },
      { label: 'Épouse', valeur: 'Héra', drapeau: null, surligne: false },
    ],
  },
  's2-einstein': {
    numero: '007/049', prenom: 'Albert', nom: 'Einstein',
    ligne: 8, valeur: 88,
    citation: 'Dieu ne joue pas aux dés.',
    photo: '/photos/s2-einstein.webp',
    stats: [{ nom: 'Physique', valeur: 100 }, { nom: 'QI', valeur: 99 }, { nom: 'Coiffure', valeur: 97 }, { nom: 'Grimaces', valeur: 95 }, { nom: 'Chaussettes', valeur: 0 }],
    competences: [
      { icone: '∞', nom: 'Relativité', description: 'Le temps passe plus vite quand on s\'amuse.', bonus: '+50 Physique' },
      { icone: '☺', nom: 'Photo culte', description: 'La langue tirée la plus célèbre de l\'histoire.', bonus: '+30 Grimaces' },
      { icone: '★', nom: 'Nobel 1921', description: 'Récompensé pour l\'effet photoélectrique, pas pour la relativité.', bonus: '+20 QI' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Allemande', drapeau: 'DE', surligne: false },
      { label: 'Mort', valeur: 'À 76 ans', drapeau: null, surligne: false },
      { label: 'Prix', valeur: 'Nobel 1921', drapeau: null, surligne: true },
      { label: 'Cerveau', valeur: 'Conservé', drapeau: null, surligne: false },
    ],
  },
  's2-mister-v': {
    numero: '008/049', prenom: 'Mister', nom: 'V',
    ligne: 1, valeur: 84,
    citation: 'La vraie pizza de la mama… surgelée.',
    photo: '/photos/s2-mister-v.webp',
    stats: [{ nom: 'Pizza', valeur: 96 }, { nom: 'Surgelés', valeur: 92 }, { nom: 'Prix', valeur: 88 }, { nom: 'Humour', valeur: 85 }, { nom: 'Rap', valeur: 70 }],
    competences: [
      { icone: '◔', nom: 'Delamama', description: 'Sa marque de pizzas surgelées squatte les supermarchés.', bonus: '+30 Pizza' },
      { icone: '♪', nom: 'Rappeur à mi-temps', description: 'Sort des albums entre deux sketchs.', bonus: '+15 Rap' },
      { icone: '★', nom: 'Vétéran', description: 'Sur YouTube depuis le début des années 2010.', bonus: '+20 Humour' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Âge', valeur: '33 ans', drapeau: null, surligne: false },
      { label: 'Vrai nom', valeur: 'Yvick Letexier', drapeau: null, surligne: false },
      { label: 'Marque', valeur: 'Delamama', drapeau: null, surligne: true },
    ],
  },
  's2-ed-gein': {
    numero: '009/049', prenom: 'Ed', nom: 'Gein',
    ligne: 3, valeur: 83,
    citation: 'Maman avait toujours raison.',
    photo: '/photos/s2-ed-gein.webp',
    stats: [{ nom: 'Inspiration', valeur: 99 }, { nom: 'Lien maternel', valeur: 100 }, { nom: 'Isolement', valeur: 95 }, { nom: 'Discrétion', valeur: 70 }, { nom: 'Sociabilité', valeur: 5 }],
    competences: [
      { icone: '✇', nom: 'Muse d\'Hollywood', description: 'Inspire Psychose, Massacre à la tronçonneuse et Le Silence des agneaux.', bonus: '+50 Inspiration' },
      { icone: '♥', nom: 'Fils à maman', description: 'Obsédé par sa mère, même après sa mort.', bonus: '+30 Lien maternel' },
      { icone: '⌂', nom: 'Ferme isolée', description: 'Vit seul au fin fond du Wisconsin.', bonus: '+20 Isolement' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Américaine', drapeau: 'US', surligne: false },
      { label: 'Mort', valeur: 'À 77 ans', drapeau: null, surligne: false },
      { label: 'Statut', valeur: 'Interné à vie', drapeau: null, surligne: true },
      { label: 'Lieu', valeur: 'Wisconsin', drapeau: null, surligne: false },
    ],
  },
  's2-jack-eventreur': {
    numero: '010/049', prenom: '', nom: 'Jack l\'Éventreur',
    ligne: 3, valeur: 85,
    citation: 'Catch me when you can.',
    photo: '/photos/s2-jack-eventreur.webp',
    stats: [{ nom: 'Mystère', valeur: 100 }, { nom: 'Discrétion', valeur: 98 }, { nom: 'Brouillard', valeur: 95 }, { nom: 'Courrier', valeur: 90 }, { nom: 'Identité', valeur: 0 }],
    competences: [
      { icone: '✉', nom: 'Lettres à la police', description: 'Envoie des courriers signés « From Hell ».', bonus: '+20 Courrier' },
      { icone: '?', nom: 'Jamais identifié', description: 'Plus de 130 ans de suspects, aucun coupable.', bonus: '+50 Mystère' },
      { icone: '☁', nom: 'Brouillard londonien', description: 'Disparaît dans les ruelles de Whitechapel.', bonus: '+30 Discrétion' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Britannique ?', drapeau: 'GB', surligne: false },
      { label: 'Âge', valeur: 'Inconnu', drapeau: null, surligne: false },
      { label: 'Statut', valeur: 'Jamais identifié', drapeau: null, surligne: true },
      { label: 'Lieu', valeur: 'Whitechapel, 1888', drapeau: null, surligne: false },
    ],
  },
  's2-jeffrey-dahmer': {
    numero: '011/049', prenom: 'Jeffrey', nom: 'Dahmer',
    ligne: 3, valeur: 86,
    citation: 'Vous avez vu ma série ?',
    photo: '/photos/s2-jeffrey-dahmer.webp',
    stats: [{ nom: 'Audience Netflix', valeur: 99 }, { nom: 'Calme', valeur: 92 }, { nom: 'Lunettes', valeur: 90 }, { nom: 'Discrétion', valeur: 80 }, { nom: 'Sociabilité', valeur: 10 }],
    competences: [
      { icone: '▶', nom: 'Série Netflix', description: 'Sa série de 2022 explose les compteurs de la plateforme.', bonus: '+50 Audience' },
      { icone: '⚖', nom: '15 perpétuités', description: 'Condamné à 15 peines de prison à vie en 1992.', bonus: '+15 Prison' },
      { icone: '◎', nom: 'Lunettes iconiques', description: 'Ses lunettes de prison deviennent un objet de collection.', bonus: '+20 Lunettes' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Américaine', drapeau: 'US', surligne: false },
      { label: 'Mort', valeur: 'À 34 ans', drapeau: null, surligne: false },
      { label: 'Peine', valeur: '15 perpétuités', drapeau: null, surligne: true },
      { label: 'Ville', valeur: 'Milwaukee', drapeau: null, surligne: false },
    ],
  },
  's2-kanye-west': {
    numero: '012/049', prenom: 'Kanye', nom: 'West',
    ligne: 4, valeur: 87,
    citation: 'I am a god.',
    photo: '/photos/s2-kanye-west.webp',
    stats: [{ nom: 'Ego', valeur: 100 }, { nom: 'Production', valeur: 96 }, { nom: 'Tweets', valeur: 95 }, { nom: 'Mode', valeur: 90 }, { nom: 'Stabilité', valeur: 8 }],
    competences: [
      { icone: '✂', nom: 'Collection douteuse', description: 'Vend en 2025 un t-shirt à croix gammée sur son site.', bonus: '+100 Polémique' },
      { icone: 'Ye', nom: 'Nouveau nom', description: 'Devient officiellement « Ye » en 2021.', bonus: '+10 Ego' },
      { icone: '♪', nom: 'Génie du beat', description: '24 Grammy Awards au compteur.', bonus: '+24 Production' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Américaine', drapeau: 'US', surligne: false },
      { label: 'Âge', valeur: '49 ans', drapeau: null, surligne: false },
      { label: 'Nom légal', valeur: 'Ye', drapeau: null, surligne: true },
      { label: 'Grammys', valeur: '24', drapeau: null, surligne: false },
    ],
  },
  's2-drake': {
    numero: '013/049', prenom: '', nom: 'Drake',
    ligne: 4, valeur: 82,
    citation: 'Started from the bottom, now we\'re here.',
    photo: '/photos/s2-drake.webp',
    stats: [{ nom: 'Hits', valeur: 97 }, { nom: 'Paris', valeur: 99 }, { nom: 'Émotions', valeur: 95 }, { nom: 'Chance', valeur: 15 }, { nom: 'Clash', valeur: 20 }],
    competences: [
      { icone: '⚔', nom: 'Clash perdu', description: 'Écrasé par Kendrick Lamar en 2024.', bonus: '-50 Clash' },
      { icone: '$', nom: 'Parieur fou', description: 'Mise des millions sur le sport… et perd souvent.', bonus: '+30 Paris' },
      { icone: '☠', nom: 'Malédiction Drake', description: 'Les équipes qu\'il soutient finissent par perdre.', bonus: '-20 Chance' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Canadienne', drapeau: 'CA', surligne: false },
      { label: 'Âge', valeur: '40 ans', drapeau: null, surligne: false },
      { label: 'Ville', valeur: 'Toronto', drapeau: null, surligne: false },
      { label: 'Ennemi', valeur: 'Kendrick Lamar', drapeau: null, surligne: true },
    ],
  },
  's2-loki': {
    numero: '014/049', prenom: '', nom: 'Loki',
    ligne: 9, valeur: 81,
    citation: 'Je peux tout expliquer.',
    photo: '/photos/s2-loki.webp',
    stats: [{ nom: 'Ruse', valeur: 100 }, { nom: 'Chaos', valeur: 99 }, { nom: 'Métamorphose', valeur: 97 }, { nom: 'Paternité', valeur: 95 }, { nom: 'Loyauté', valeur: 5 }],
    competences: [
      { icone: '♞', nom: 'Mère de Sleipnir', description: 'Se change en jument et accouche d\'un cheval à huit pattes.', bonus: '+40 Métamorphose' },
      { icone: '♥', nom: 'Papa poule', description: 'Père d\'un loup géant, d\'un serpent-monde et de la déesse des morts.', bonus: '+30 Paternité' },
      { icone: '☠', nom: 'Ragnarök', description: 'Déclenche la fin du monde, rien que ça.', bonus: '+50 Chaos' },
    ],
    infos: [
      { label: 'Origine', valeur: 'Asgard', drapeau: null, surligne: false },
      { label: 'Âge', valeur: 'Immortel', drapeau: null, surligne: false },
      { label: 'Statut', valeur: 'Enchaîné', drapeau: null, surligne: true },
      { label: 'Épouse', valeur: 'Sigyn', drapeau: null, surligne: false },
    ],
  },
  's2-ricky-ross': {
    numero: '015/049', prenom: 'Ricky Donnell', nom: 'Ross',
    ligne: 6, valeur: 80,
    citation: 'Le vrai Rick Ross, c\'est moi.',
    photo: '/photos/s2-ricky-ross.webp',
    stats: [{ nom: 'Business', valeur: 96 }, { nom: 'Réseau', valeur: 95 }, { nom: 'Autoroutes', valeur: 90 }, { nom: 'Reconversion', valeur: 88 }, { nom: 'Lecture', valeur: 70 }],
    competences: [
      { icone: '⛟', nom: 'Freeway', description: 'Bâtit un empire le long des autoroutes de Los Angeles.', bonus: '+30 Réseau' },
      { icone: '✎', nom: 'Lecteur tardif', description: 'Apprend à lire en prison et étudie son propre dossier.', bonus: '+40 Lecture' },
      { icone: '⚖', nom: 'Vol de nom', description: 'Attaque le rappeur Rick Ross en justice pour son nom… et perd.', bonus: '-10 Avocats' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Américaine', drapeau: 'US', surligne: false },
      { label: 'Âge', valeur: '66 ans', drapeau: null, surligne: false },
      { label: 'Statut', valeur: 'Libéré', drapeau: null, surligne: true },
      { label: 'Surnom', valeur: 'Freeway Rick', drapeau: null, surligne: false },
    ],
  },
  's2-tibo-inshape': {
    numero: '016/049', prenom: 'Tibo', nom: 'InShape',
    ligne: 1, valeur: 70,
    citation: 'Il faut bien payer les charges.',
    photo: '/photos/s2-tibo-inshape.webp',
    stats: [{ nom: 'Dédicaces', valeur: 99 }, { nom: 'Muscle', valeur: 95 }, { nom: 'Vues', valeur: 93 }, { nom: 'Business', valeur: 92 }, { nom: 'Image', valeur: 40 }],
    competences: [
      { icone: '✍', nom: 'Dédicace à 36 €', description: 'Vidéos personnalisées vendues à ses abonnés.', bonus: '+36 Business' },
      { icone: '!', nom: 'Recadré', description: 'Se fait tacler par Squeezie en vidéo sur le sujet.', bonus: '-20 Image' },
      { icone: '♣', nom: 'Whey maison', description: 'Vend sa propre whey à 39,90 € le sachet.', bonus: '+20 Muscle' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Vrai nom', valeur: 'Thibault Delapart', drapeau: null, surligne: false },
      { label: 'Domaine', valeur: 'Fitness', drapeau: null, surligne: false },
      { label: 'Copine', valeur: 'Juju Fitcats', drapeau: null, surligne: true },
    ],
  },
  's2-petain': {
    numero: '017/049', prenom: 'Philippe', nom: 'Pétain',
    ligne: 2, valeur: 72,
    citation: 'Je fais à la France le don de ma personne.',
    photo: '/photos/s2-petain.webp',
    stats: [{ nom: 'Collaboration', valeur: 99 }, { nom: 'Âge', valeur: 95 }, { nom: 'Verdun', valeur: 90 }, { nom: 'Moustache', valeur: 85 }, { nom: 'Popularité', valeur: 10 }],
    competences: [
      { icone: '★', nom: 'Héros de Verdun', description: 'Gloire de 14-18… gâchée en 1940.', bonus: '+30 Verdun' },
      { icone: '✋', nom: 'Montoire', description: 'Serre la main d\'Hitler en octobre 1940.', bonus: '-80 Honneur' },
      { icone: '⚓', nom: 'Île d\'Yeu', description: 'Finit ses jours en détention sur l\'île d\'Yeu.', bonus: '-50 Liberté' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Mort', valeur: 'À 95 ans', drapeau: null, surligne: false },
      { label: 'Régime', valeur: 'Vichy', drapeau: null, surligne: false },
      { label: 'Peine', valeur: 'Mort, commuée', drapeau: null, surligne: true },
    ],
  },
  's2-pouyanne': {
    numero: '018/049', prenom: 'Patrick', nom: 'Pouyanné',
    ligne: 5, valeur: 64,
    citation: '13 milliards ? C\'est en baisse.',
    photo: '/photos/s2-pouyanne.webp',
    stats: [{ nom: 'Pétrole', valeur: 99 }, { nom: 'Dividendes', valeur: 97 }, { nom: 'Greenwashing', valeur: 90 }, { nom: 'Écologie', valeur: 8 }, { nom: 'Impôts FR', valeur: 5 }],
    competences: [
      { icone: '$', nom: 'Méga-bénéfices', description: '13,1 milliards de dollars de bénéfice en 2025… « en baisse ».', bonus: '+13 Dividendes' },
      { icone: '%', nom: 'Zéro en France', description: 'Échappe à la surtaxe 2025 faute de bénéfices en France.', bonus: '+30 Fiscalité' },
      { icone: '♣', nom: 'Total → Energies', description: 'Ajoute « Energies » au nom en 2021 pour faire plus vert.', bonus: '+20 Greenwashing' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Âge', valeur: '63 ans', drapeau: null, surligne: false },
      { label: 'Poste', valeur: 'PDG TotalEnergies', drapeau: null, surligne: true },
      { label: 'Depuis', valeur: '2014', drapeau: null, surligne: false },
    ],
  },
  's2-cronos': {
    numero: '019/049', prenom: '', nom: 'Cronos',
    ligne: 9, valeur: 76,
    citation: 'Je les ai tous avalés… sauf un.',
    photo: '/photos/s2-cronos.webp',
    stats: [{ nom: 'Appétit', valeur: 99 }, { nom: 'Paranoïa', valeur: 95 }, { nom: 'Faux', valeur: 90 }, { nom: 'Vigilance', valeur: 30 }, { nom: 'Paternité', valeur: 2 }],
    competences: [
      { icone: '⚔', nom: 'Coup de faux', description: 'Castre son père Ouranos pour lui piquer le trône.', bonus: '+30 Ambition' },
      { icone: '◉', nom: 'Régime spécial', description: 'Avale ses enfants à la naissance.', bonus: '+50 Appétit' },
      { icone: '●', nom: 'Arnaque au caillou', description: 'Rhéa lui fait avaler une pierre à la place de Zeus.', bonus: '-40 Vigilance' },
    ],
    infos: [
      { label: 'Origine', valeur: 'Grèce antique', drapeau: null, surligne: false },
      { label: 'Âge', valeur: 'Immortel', drapeau: null, surligne: false },
      { label: 'Rang', valeur: 'Titan', drapeau: null, surligne: false },
      { label: 'Destin', valeur: 'Détrôné par Zeus', drapeau: null, surligne: true },
    ],
  },
  's2-minotaure': {
    numero: '020/049', prenom: '', nom: 'Le Minotaure',
    ligne: 9, valeur: 69,
    citation: 'C\'est combien ça ? Prix misérable.',
    photo: '/photos/s2-minotaure.webp',
    stats: [{ nom: 'Force', valeur: 95 }, { nom: 'Orientation', valeur: 99 }, { nom: 'Appétit', valeur: 90 }, { nom: 'Défense', valeur: 30 }, { nom: 'Pedigree', valeur: 10 }],
    competences: [
      { icone: '?', nom: 'Origine douteuse', description: 'Fils de la reine Pasiphaé… et d\'un taureau.', bonus: '+40 Mystère' },
      { icone: '▦', nom: 'Maître du labyrinthe', description: 'Vit dans un labyrinthe construit par Dédale.', bonus: '+30 Orientation' },
      { icone: '⚔', nom: 'Thésée en approche', description: 'Battu par un héros guidé par une pelote de fil.', bonus: '-50 Défense' },
    ],
    infos: [
      { label: 'Origine', valeur: 'Crète', drapeau: null, surligne: false },
      { label: 'Âge', valeur: 'Inconnu', drapeau: null, surligne: false },
      { label: 'Domicile', valeur: 'Labyrinthe', drapeau: null, surligne: true },
      { label: 'Mère', valeur: 'Pasiphaé', drapeau: null, surligne: false },
    ],
  },
  's2-atoum': {
    numero: '021/049', prenom: '', nom: 'Atoum',
    ligne: 9, valeur: 66,
    citation: 'J\'ai tout fait tout seul.',
    photo: '/photos/s2-atoum.webp',
    stats: [{ nom: 'Autonomie', valeur: 100 }, { nom: 'Création', valeur: 99 }, { nom: 'Main droite', valeur: 98 }, { nom: 'Solitude', valeur: 95 }, { nom: 'Sociabilité', valeur: 10 }],
    competences: [
      { icone: '✋', nom: 'Création solo', description: 'Crée les premiers dieux tout seul, sans aide.', bonus: '+50 Autonomie' },
      { icone: '✦', nom: 'Éternuement divin', description: 'Selon une autre version, il les a éternués.', bonus: '+20 Création' },
      { icone: '♛', nom: 'Père de tous', description: 'Ancêtre de toute la famille divine égyptienne.', bonus: '+30 Prestige' },
    ],
    infos: [
      { label: 'Origine', valeur: 'Égypte antique', drapeau: null, surligne: false },
      { label: 'Âge', valeur: 'Immortel', drapeau: null, surligne: false },
      { label: 'Rôle', valeur: 'Dieu créateur', drapeau: null, surligne: true },
      { label: 'Ville', valeur: 'Héliopolis', drapeau: null, surligne: false },
    ],
  },
  's2-freud': {
    numero: '022/049', prenom: 'Sigmund', nom: 'Freud',
    ligne: 7, valeur: 75,
    citation: 'Parfois, un cigare n\'est qu\'un cigare.',
    photo: '/photos/s2-freud.webp',
    stats: [{ nom: 'Obsession maman', valeur: 100 }, { nom: 'Psychanalyse', valeur: 99 }, { nom: 'Cigares', valeur: 97 }, { nom: 'Divan', valeur: 95 }, { nom: 'Rigueur', valeur: 35 }],
    competences: [
      { icone: '♥', nom: 'C\'est ta mère', description: 'Tout problème vient de l\'enfance. Toujours.', bonus: '+40 Psychanalyse' },
      { icone: '❄', nom: 'Cocaïne thérapeutique', description: 'Vante la cocaïne dans un article de 1884.', bonus: '+20 Énergie' },
      { icone: '✎', nom: 'Lapsus révélateur', description: 'Chaque erreur devient une confession.', bonus: '+30 Divan' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Autrichienne', drapeau: 'AT', surligne: false },
      { label: 'Mort', valeur: 'À 83 ans', drapeau: null, surligne: false },
      { label: 'Métier', valeur: 'Psychanalyste', drapeau: null, surligne: true },
      { label: 'Ville', valeur: 'Vienne', drapeau: null, surligne: false },
    ],
  },
  's2-aristote': {
    numero: '023/049', prenom: '', nom: 'Aristote',
    ligne: 7, valeur: 74,
    citation: 'La femme est un homme incomplet.',
    photo: '/photos/s2-aristote.webp',
    stats: [{ nom: 'Logique', valeur: 99 }, { nom: 'Sexisme', valeur: 95 }, { nom: 'Pédagogie', valeur: 92 }, { nom: 'Barbe', valeur: 90 }, { nom: 'Physique', valeur: 20 }],
    competences: [
      { icone: '♛', nom: 'Prof d\'Alexandre', description: 'Précepteur d\'Alexandre le Grand.', bonus: '+30 Pédagogie' },
      { icone: '●', nom: 'Théories à revoir', description: 'Pense que les objets lourds tombent plus vite.', bonus: '-40 Physique' },
      { icone: '!', nom: 'Mode miso', description: 'Affirme que les femmes ont moins de dents que les hommes.', bonus: '+50 Sexisme' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Grecque', drapeau: 'GR', surligne: false },
      { label: 'Mort', valeur: 'À 62 ans', drapeau: null, surligne: false },
      { label: 'Maître', valeur: 'Platon', drapeau: null, surligne: false },
      { label: 'École', valeur: 'Le Lycée', drapeau: null, surligne: true },
    ],
  },
  's2-hannibal-lecter': {
    numero: '024/049', prenom: 'Hannibal', nom: 'Lecter',
    ligne: 3, valeur: 79,
    citation: 'Bonsoir, Clarice.',
    photo: '/photos/s2-hannibal-lecter.webp',
    stats: [{ nom: 'Raffinement', valeur: 99 }, { nom: 'Psychiatrie', valeur: 97 }, { nom: 'Cuisine', valeur: 95 }, { nom: 'Masque', valeur: 90 }, { nom: 'Sociabilité', valeur: 40 }],
    competences: [
      { icone: '♨', nom: 'Chef étoilé', description: 'Cuisine des plats très… personnels.', bonus: '+40 Cuisine' },
      { icone: '✦', nom: 'Psy de génie', description: 'Lit dans votre tête mieux que vous.', bonus: '+30 Psychiatrie' },
      { icone: '▣', nom: 'Muselière', description: 'Porte un masque de sécurité à chaque transfert.', bonus: '+20 Style' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Lituanienne', drapeau: 'LT', surligne: false },
      { label: 'Âge', valeur: 'Fictif', drapeau: null, surligne: true },
      { label: 'Créateur', valeur: 'Thomas Harris', drapeau: null, surligne: false },
      { label: 'Interprète', valeur: 'Anthony Hopkins', drapeau: null, surligne: false },
    ],
  },
  's2-newton': {
    numero: '025/049', prenom: 'Isaac', nom: 'Newton',
    ligne: 8, valeur: 77,
    citation: 'Si j\'ai vu plus loin, c\'est en montant sur des épaules de géants.',
    photo: '/photos/s2-newton.webp',
    stats: [{ nom: 'Gravité', valeur: 99 }, { nom: 'Rancune', valeur: 98 }, { nom: 'Calcul', valeur: 97 }, { nom: 'Pommes', valeur: 95 }, { nom: 'Sociabilité', valeur: 15 }],
    competences: [
      { icone: '●', nom: 'Pomme sur la tête', description: 'Comprend la gravité grâce à une pomme (selon la légende).', bonus: '+30 Gravité' },
      { icone: '◎', nom: 'Aiguille dans l\'œil', description: 'Se glisse une aiguille sous l\'œil pour une expérience d\'optique.', bonus: '+20 Optique' },
      { icone: '⚔', nom: 'Guerre du calcul', description: 'Se déchire avec Leibniz sur l\'invention du calcul.', bonus: '+40 Rancune' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Anglaise', drapeau: 'GB', surligne: false },
      { label: 'Mort', valeur: 'À 84 ans', drapeau: null, surligne: false },
      { label: 'Poste', valeur: 'Maître de la Monnaie', drapeau: null, surligne: false },
      { label: 'Livre', valeur: 'Principia', drapeau: null, surligne: true },
    ],
  },
  's2-staline': {
    numero: '026/049', prenom: 'Joseph', nom: 'Staline',
    ligne: 2, valeur: 78,
    citation: 'Pas d\'homme, pas de problème.',
    photo: '/photos/s2-staline.webp',
    stats: [{ nom: 'Paranoïa', valeur: 100 }, { nom: 'Moustache', valeur: 98 }, { nom: 'Retouches', valeur: 95 }, { nom: 'Pipe', valeur: 90 }, { nom: 'Confiance', valeur: 2 }],
    competences: [
      { icone: '▣', nom: 'Retouche photo', description: 'Fait effacer ses anciens alliés des photos officielles.', bonus: '+40 Retouches' },
      { icone: '⚒', nom: 'Homme d\'acier', description: '« Staline » veut dire « l\'homme d\'acier ».', bonus: '+20 Prestige' },
      { icone: '✚', nom: 'Porte fermée', description: 'Fait un AVC en 1953 : ses gardes n\'osent pas entrer.', bonus: '-30 Santé' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Soviétique', drapeau: 'SU', surligne: false },
      { label: 'Mort', valeur: 'À 74 ans', drapeau: null, surligne: false },
      { label: 'Vrai nom', valeur: 'Iossif Djougachvili', drapeau: null, surligne: false },
      { label: 'Pays', valeur: 'URSS', drapeau: null, surligne: true },
    ],
  },
  's2-netanyahou': {
    numero: '027/049', prenom: 'Benyamin', nom: 'Netanyahou',
    ligne: 2, valeur: 73,
    citation: 'Le magicien revient toujours.',
    photo: '/photos/s2-netanyahou.webp',
    stats: [{ nom: 'Longévité', valeur: 99 }, { nom: 'Survie', valeur: 97 }, { nom: 'Coalitions', valeur: 92 }, { nom: 'Avocats', valeur: 90 }, { nom: 'Popularité', valeur: 45 }],
    competences: [
      { icone: '✦', nom: 'Le Magicien', description: 'Surnommé ainsi parce qu\'il revient toujours au pouvoir.', bonus: '+40 Survie' },
      { icone: '★', nom: 'Record de mandats', description: 'Premier ministre resté le plus longtemps en poste en Israël.', bonus: '+30 Longévité' },
      { icone: '⚖', nom: 'Procès sans fin', description: 'Jugé pour corruption depuis 2020.', bonus: '+20 Avocats' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Israélienne', drapeau: 'IL', surligne: false },
      { label: 'Âge', valeur: '77 ans', drapeau: null, surligne: false },
      { label: 'Parti', valeur: 'Likoud', drapeau: null, surligne: false },
      { label: 'Surnom', valeur: 'Bibi', drapeau: null, surligne: true },
    ],
  },
  's2-bezos': {
    numero: '028/049', prenom: 'Jeff', nom: 'Bezos',
    ligne: 5, valeur: 71,
    citation: 'Your margin is my opportunity.',
    photo: '/photos/s2-bezos.webp',
    stats: [{ nom: 'Calvitie', valeur: 100 }, { nom: 'Livraison', valeur: 99 }, { nom: 'Fortune', valeur: 98 }, { nom: 'Fusée', valeur: 95 }, { nom: 'Syndicats', valeur: 5 }],
    competences: [
      { icone: '▲', nom: 'Fusée suspecte', description: 'Sa fusée Blue Origin a une forme… discutable.', bonus: '+30 Fusée' },
      { icone: '⌂', nom: 'Garage startup', description: 'Commence en vendant des livres depuis un garage.', bonus: '+20 Business' },
      { icone: '♥', nom: 'Mariage à Venise', description: 'S\'offre un mariage XXL à Venise en 2025.', bonus: '+40 Paillettes' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Américaine', drapeau: 'US', surligne: false },
      { label: 'Âge', valeur: '62 ans', drapeau: null, surligne: false },
      { label: 'Entreprise', valeur: 'Amazon', drapeau: null, surligne: true },
      { label: 'Espace', valeur: 'Blue Origin', drapeau: null, surligne: false },
    ],
  },
  's2-bruel': {
    numero: '029/049', prenom: 'Patrick', nom: 'Bruel',
    ligne: 4, valeur: 67,
    citation: 'Tapis !',
    photo: '/photos/s2-bruel.webp',
    stats: [{ nom: 'Bluff', valeur: 97 }, { nom: 'Poker', valeur: 95 }, { nom: 'Chanson', valeur: 85 }, { nom: 'Cinéma', valeur: 75 }, { nom: 'Popularité', valeur: 50 }],
    competences: [
      { icone: '♠', nom: 'Bracelet WSOP', description: 'Remporte un bracelet aux championnats du monde de poker en 1998.', bonus: '+40 Poker' },
      { icone: '♪', nom: 'Casser la voix', description: 'Fait chanter les salles depuis les années 80.', bonus: '+20 Chanson' },
      { icone: '?', nom: 'Bluff', description: 'Impossible de savoir s\'il a une bonne main.', bonus: '+30 Bluff' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Âge', valeur: '67 ans', drapeau: null, surligne: false },
      { label: 'Vrai nom', valeur: 'Patrick Benguigui', drapeau: null, surligne: false },
      { label: 'Titre', valeur: 'WSOP 1998', drapeau: null, surligne: true },
    ],
  },
  's2-claude-francois': {
    numero: '030/049', prenom: 'Claude', nom: 'François',
    ligne: 4, valeur: 68,
    citation: 'Comme d\'habitude…',
    photo: '/photos/s2-claude-francois.webp',
    stats: [{ nom: 'Électricité', valeur: 100 }, { nom: 'Claudettes', valeur: 99 }, { nom: 'Danse', valeur: 97 }, { nom: 'Exigence', valeur: 95 }, { nom: 'Bain', valeur: 10 }],
    competences: [
      { icone: '♛', nom: 'Les Claudettes', description: 'Toujours entouré de ses danseuses.', bonus: '+30 Show' },
      { icone: '!', nom: 'Perfectionniste', description: 'Réputé intraitable avec ses équipes.', bonus: '+20 Exigence' },
      { icone: '⚡', nom: 'Ampoule fatale', description: 'Touche une applique les pieds dans le bain (1978).', bonus: 'Game over' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Mort', valeur: 'À 39 ans', drapeau: null, surligne: false },
      { label: 'Tube', valeur: 'Comme d\'habitude', drapeau: null, surligne: true },
      { label: 'Né en', valeur: 'Égypte', drapeau: null, surligne: false },
    ],
  },
  's2-schopenhauer': {
    numero: '031/049', prenom: 'Arthur', nom: 'Schopenhauer',
    ligne: 7, valeur: 58,
    citation: 'La vie oscille, comme un pendule, de la souffrance à l\'ennui.',
    photo: '/photos/s2-schopenhauer.webp',
    stats: [{ nom: 'Pessimisme', valeur: 100 }, { nom: 'Caniches', valeur: 95 }, { nom: 'Favoris', valeur: 92 }, { nom: 'Misogynie', valeur: 90 }, { nom: 'Optimisme', valeur: 0 }],
    competences: [
      { icone: '♣', nom: 'Le caniche Atma', description: 'Préfère ses caniches à la compagnie des humains.', bonus: '+30 Caniches' },
      { icone: '▢', nom: 'Salle vide', description: 'Place ses cours à la même heure que Hegel : personne ne vient.', bonus: '-40 Popularité' },
      { icone: '☁', nom: 'Philo du malheur', description: 'La vie est une souffrance. Merci, au revoir.', bonus: '+50 Pessimisme' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Allemande', drapeau: 'DE', surligne: false },
      { label: 'Mort', valeur: 'À 72 ans', drapeau: null, surligne: false },
      { label: 'Rival', valeur: 'Hegel', drapeau: null, surligne: true },
      { label: 'Chien', valeur: 'Atma', drapeau: null, surligne: false },
    ],
  },
  's2-le-peuple': {
    numero: '032/049', prenom: '', nom: 'Le peuple',
    ligne: 7, valeur: 45,
    citation: 'J\'ai vu une vidéo sur TikTok.',
    photo: '/photos/s2-le-peuple.webp',
    stats: [{ nom: 'Nombre', valeur: 100 }, { nom: 'Râlage', valeur: 99 }, { nom: 'Scroll', valeur: 97 }, { nom: 'Mémoire', valeur: 5 }, { nom: 'Réflexion', valeur: 3 }],
    competences: [
      { icone: '⚑', nom: 'Effet de foule', description: 'Pense comme le voisin, en plus fort.', bonus: '+40 Nombre' },
      { icone: '!', nom: 'Râleur pro', description: 'Se plaint de tout, ne change rien.', bonus: '+30 Râlage' },
      { icone: '~', nom: 'Mémoire de poisson', description: 'Oublie tout au scandale suivant.', bonus: '-50 Mémoire' },
    ],
    infos: [
      { label: 'Origine', valeur: 'Partout', drapeau: null, surligne: false },
      { label: 'Âge', valeur: 'Éternel', drapeau: null, surligne: false },
      { label: 'Statut', valeur: 'Distrait', drapeau: null, surligne: true },
      { label: 'Effectif', valeur: '8 milliards', drapeau: null, surligne: false },
    ],
  },
  's2-fourniret': {
    numero: '033/049', prenom: 'Michel', nom: 'Fourniret',
    ligne: 3, valeur: 63,
    citation: 'Je ne parlerai qu\'à mon avocat.',
    photo: null,
    stats: [{ nom: 'Condamnations', valeur: 95 }, { nom: 'Aveux tardifs', valeur: 90 }, { nom: 'Discrétion', valeur: 70 }, { nom: 'Calme', valeur: 60 }, { nom: 'Remords', valeur: 0 }],
    competences: [
      { icone: '⚖', nom: 'Perpétuité réelle', description: 'Condamné à la perpétuité incompressible en 2008.', bonus: '+50 Prison' },
      { icone: '✎', nom: 'Aveux en série', description: 'Avoue de nouvelles affaires des années après son procès.', bonus: '+20 Aveux' },
      { icone: '☠', nom: 'Fin de partie', description: 'Meurt en 2021, avant d\'être rejugé.', bonus: 'Game over' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Mort', valeur: 'À 79 ans', drapeau: null, surligne: false },
      { label: 'Peine', valeur: 'Perpétuité réelle', drapeau: null, surligne: true },
      { label: 'Région', valeur: 'Ardennes', drapeau: null, surligne: false },
    ],
  },
  's2-natoo': {
    numero: '034/049', prenom: '', nom: 'Natoo',
    ligne: 1, valeur: 54,
    citation: 'Abonnez-vous, c\'est gratuit.',
    photo: '/photos/s2-natoo.webp',
    stats: [{ nom: 'Ancienneté', valeur: 95 }, { nom: 'Placements', valeur: 92 }, { nom: 'Humour', valeur: 90 }, { nom: 'Vidéos', valeur: 86 }, { nom: 'Polémiques', valeur: 30 }],
    competences: [
      { icone: '★', nom: 'Pionnière', description: 'Une des premières grosses youtubeuses françaises.', bonus: '+30 Ancienneté' },
      { icone: '☺', nom: 'Sketchs', description: 'Des années de vidéos humoristiques.', bonus: '+20 Humour' },
      { icone: '$', nom: 'Placement produit', description: 'Vend un produit entre deux vannes.', bonus: '+25 Placements' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Vrai nom', valeur: 'Nathalie Odzierejko', drapeau: null, surligne: false },
      { label: 'Métier', valeur: 'Youtubeuse', drapeau: null, surligne: false },
      { label: 'Spécialité', valeur: 'Humour', drapeau: null, surligne: true },
    ],
  },
  's2-joyca': {
    numero: '035/049', prenom: '', nom: 'Joyca',
    ligne: 1, valeur: 52,
    citation: 'Ça sent bon ? C\'est mon parfum.',
    photo: '/photos/s2-joyca.webp',
    stats: [{ nom: 'Parfums', valeur: 95 }, { nom: 'Concepts', valeur: 90 }, { nom: 'Vues', valeur: 88 }, { nom: 'Hype', valeur: 85 }, { nom: 'Prix', valeur: 80 }],
    competences: [
      { icone: '✿', nom: 'Le nez', description: 'Lance ses propres parfums.', bonus: '+30 Parfums' },
      { icone: '▶', nom: 'Concepts vidéo', description: 'Défis et concepts en série avec ses potes.', bonus: '+20 Concepts' },
      { icone: '$', nom: 'Chasse aux marques', description: 'Une vidéo entière à récolter un max de sponsors.', bonus: '+30 Placements' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Métier', valeur: 'Youtubeur', drapeau: null, surligne: false },
      { label: 'Spécialité', valeur: 'Concepts', drapeau: null, surligne: false },
      { label: 'Produit', valeur: 'Parfums', drapeau: null, surligne: true },
    ],
  },
  's2-maghla': {
    numero: '036/049', prenom: '', nom: 'Maghla',
    ligne: 1, valeur: 51,
    citation: '100 % polyester, 100 % amour.',
    photo: '/photos/s2-maghla.webp',
    stats: [{ nom: 'Polyester', valeur: 99 }, { nom: 'Stream', valeur: 92 }, { nom: 'Chat', valeur: 90 }, { nom: 'Gaming', valeur: 85 }, { nom: 'Merch', valeur: 80 }],
    competences: [
      { icone: '✂', nom: 'Merch polyester', description: 'Des sweats dans une matière… discutable.', bonus: '+40 Polyester' },
      { icone: '▶', nom: 'Streameuse', description: 'Des heures de live sur Twitch.', bonus: '+20 Stream' },
      { icone: '♥', nom: 'Communauté', description: 'Un chat très, très actif.', bonus: '+20 Chat' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Métier', valeur: 'Streameuse', drapeau: null, surligne: false },
      { label: 'Plateforme', valeur: 'Twitch', drapeau: null, surligne: false },
      { label: 'Matière', valeur: 'Polyester', drapeau: null, surligne: true },
    ],
  },
  's2-mussolini': {
    numero: '037/049', prenom: 'Benito', nom: 'Mussolini',
    ligne: 2, valeur: 62,
    citation: 'Mieux vaut vivre un jour comme un lion que cent ans comme un mouton.',
    photo: '/photos/s2-mussolini.webp',
    stats: [{ nom: 'Balcon', valeur: 99 }, { nom: 'Mâchoire', valeur: 97 }, { nom: 'Uniformes', valeur: 92 }, { nom: 'Stratégie', valeur: 25 }, { nom: 'Fin heureuse', valeur: 0 }],
    competences: [
      { icone: '▔', nom: 'Discours au balcon', description: 'Harangue les foules menton levé.', bonus: '+40 Balcon' },
      { icone: '⚑', nom: 'Marche sur Rome', description: 'Prend le pouvoir en 1922.', bonus: '+20 Pouvoir' },
      { icone: '?', nom: 'Déguisement raté', description: 'Arrêté en 1945 déguisé en soldat allemand.', bonus: '-50 Discrétion' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Italienne', drapeau: 'IT', surligne: false },
      { label: 'Mort', valeur: 'À 61 ans', drapeau: null, surligne: false },
      { label: 'Titre', valeur: 'Il Duce', drapeau: null, surligne: false },
      { label: 'Fin', valeur: 'Avril 1945', drapeau: null, surligne: true },
    ],
  },
  's2-franco': {
    numero: '038/049', prenom: 'Francisco', nom: 'Franco',
    ligne: 2, valeur: 60,
    citation: 'Je suis toujours mort.',
    photo: '/photos/s2-franco.webp',
    stats: [{ nom: 'Longévité', valeur: 98 }, { nom: 'Censure', valeur: 95 }, { nom: 'Ennui', valeur: 90 }, { nom: 'Taille', valeur: 30 }, { nom: 'Charisme', valeur: 20 }],
    competences: [
      { icone: '⌛', nom: 'Pouvoir XXL', description: 'Dirige l\'Espagne de 1939 à 1975.', bonus: '+40 Longévité' },
      { icone: '☂', nom: 'Neutre de façade', description: 'Reste à l\'écart de la Seconde Guerre mondiale.', bonus: '+20 Prudence' },
      { icone: '⚰', nom: 'Déménagement', description: 'Ses restes sont sortis de son mausolée en 2019.', bonus: '-30 Prestige' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Espagnole', drapeau: 'ES', surligne: false },
      { label: 'Mort', valeur: 'À 82 ans', drapeau: null, surligne: false },
      { label: 'Titre', valeur: 'Caudillo', drapeau: null, surligne: false },
      { label: 'Règne', valeur: '1939–1975', drapeau: null, surligne: true },
    ],
  },
  's2-castro': {
    numero: '039/049', prenom: 'Fidel', nom: 'Castro',
    ligne: 2, valeur: 59,
    citation: 'L\'histoire m\'acquittera.',
    photo: '/photos/s2-castro.webp',
    stats: [{ nom: 'Discours', valeur: 100 }, { nom: 'Barbe', valeur: 99 }, { nom: 'Survie', valeur: 99 }, { nom: 'Cigares', valeur: 98 }, { nom: 'Élections', valeur: 0 }],
    competences: [
      { icone: '✚', nom: '638 tentatives', description: 'Aurait survécu à 638 tentatives d\'assassinat.', bonus: '+50 Survie' },
      { icone: '✎', nom: 'Discours fleuve', description: 'Record du plus long discours à l\'ONU (4 h 29).', bonus: '+40 Discours' },
      { icone: '✦', nom: 'Barbe révolutionnaire', description: 'Jamais rasé depuis la guérilla.', bonus: '+20 Barbe' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Cubaine', drapeau: 'CU', surligne: false },
      { label: 'Mort', valeur: 'À 90 ans', drapeau: null, surligne: false },
      { label: 'Règne', valeur: '1959–2008', drapeau: null, surligne: true },
      { label: 'Frère', valeur: 'Raúl', drapeau: null, surligne: false },
    ],
  },
  's2-6ix9ine': {
    numero: '040/049', prenom: '', nom: '6ix9ine',
    ligne: 4, valeur: 48,
    citation: 'Snitches get riches.',
    photo: '/photos/s2-6ix9ine.webp',
    stats: [{ nom: 'Cheveux', valeur: 100 }, { nom: 'Balance', valeur: 99 }, { nom: 'Tatouages', valeur: 95 }, { nom: 'Sécurité', valeur: 30 }, { nom: 'Crédibilité', valeur: 5 }],
    competences: [
      { icone: '⚖', nom: 'La balance', description: 'Témoigne contre son propre gang en 2019.', bonus: '+60 Balance' },
      { icone: '✦', nom: 'Arc-en-ciel', description: 'Cheveux de toutes les couleurs.', bonus: '+30 Style' },
      { icone: '69', nom: 'Visage tatoué', description: 'Des « 69 » partout sur la figure.', bonus: '+20 Tatouages' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Américaine', drapeau: 'US', surligne: false },
      { label: 'Âge', valeur: '30 ans', drapeau: null, surligne: false },
      { label: 'Vrai nom', valeur: 'Daniel Hernandez', drapeau: null, surligne: false },
      { label: 'Talent', valeur: 'Témoigner', drapeau: null, surligne: true },
    ],
  },
  's2-booba-kaaris': {
    numero: '041/049', prenom: '', nom: 'Booba & Kaaris',
    ligne: 4, valeur: 57,
    citation: 'On se retrouve au duty free.',
    photo: '/photos/s2-booba-kaaris.webp',
    stats: [{ nom: 'Clash', valeur: 100 }, { nom: 'Bagarre', valeur: 95 }, { nom: 'Tweets', valeur: 92 }, { nom: 'Duty free', valeur: 90 }, { nom: 'Réconciliation', valeur: 5 }],
    competences: [
      { icone: '✈', nom: 'Bagarre d\'Orly', description: 'Se battent dans le hall de l\'aéroport en 2018.', bonus: '+50 Bagarre' },
      { icone: '✿', nom: 'Duty free', description: 'Les parfums de la boutique y laissent des plumes.', bonus: '+20 Chaos' },
      { icone: '⚖', nom: 'Condamnés', description: '18 mois avec sursis chacun.', bonus: '+10 Casier' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Date', valeur: '1er août 2018', drapeau: null, surligne: false },
      { label: 'Lieu', valeur: 'Orly', drapeau: null, surligne: true },
      { label: 'Peine', valeur: '18 mois sursis', drapeau: null, surligne: false },
    ],
  },
  's2-freeze-corleone': {
    numero: '042/049', prenom: '', nom: 'Freeze Corleone',
    ligne: 4, valeur: 56,
    citation: '667, demande pas.',
    photo: '/photos/s2-freeze-corleone.webp',
    stats: [{ nom: 'Références', valeur: 99 }, { nom: 'Polémique', valeur: 97 }, { nom: 'Flow', valeur: 95 }, { nom: 'Complot', valeur: 90 }, { nom: 'Tournée', valeur: 30 }],
    competences: [
      { icone: '✕', nom: 'Concerts annulés', description: 'Plusieurs dates annulées après des polémiques sur ses paroles.', bonus: '-30 Tournée' },
      { icone: '✎', nom: 'Encyclopédie', description: 'Des références dans chaque mesure.', bonus: '+30 Références' },
      { icone: '♪', nom: 'Album culte', description: 'LMF cartonne en 2020 malgré tout.', bonus: '+20 Flow' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Française', drapeau: 'FR', surligne: false },
      { label: 'Crew', valeur: '667', drapeau: null, surligne: true },
      { label: 'Album', valeur: 'LMF (2020)', drapeau: null, surligne: false },
      { label: 'Style', valeur: 'Drill', drapeau: null, surligne: false },
    ],
  },
  's2-zuckerberg': {
    numero: '043/049', prenom: 'Mark', nom: 'Zuckerberg',
    ligne: 5, valeur: 55,
    citation: 'Senator, we run ads.',
    photo: '/photos/s2-zuckerberg.webp',
    stats: [{ nom: 'Données', valeur: 99 }, { nom: 'Fortune', valeur: 95 }, { nom: 'Combat', valeur: 80 }, { nom: 'Émotions', valeur: 5 }, { nom: 'Vie privée', valeur: 0 }],
    competences: [
      { icone: '⚙', nom: 'Mode robot', description: 'Témoigne au Congrès avec l\'émotion d\'un grille-pain (2018).', bonus: '+40 Robot' },
      { icone: '◐', nom: 'Métavers', description: 'Investit des dizaines de milliards dans un monde virtuel vide.', bonus: '-30 Flair' },
      { icone: '✊', nom: 'Jiu-jitsu', description: 'Remporte des médailles en compétition.', bonus: '+20 Combat' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Américaine', drapeau: 'US', surligne: false },
      { label: 'Âge', valeur: '42 ans', drapeau: null, surligne: false },
      { label: 'Entreprise', valeur: 'Meta', drapeau: null, surligne: true },
      { label: 'Création', valeur: 'Facebook, 2004', drapeau: null, surligne: false },
    ],
  },
  's2-escobar': {
    numero: '044/049', prenom: 'Pablo', nom: 'Escobar',
    ligne: 6, valeur: 61,
    citation: 'Plata o plomo.',
    photo: '/photos/s2-escobar.webp',
    stats: [{ nom: 'Hippopotames', valeur: 100 }, { nom: 'Fortune', valeur: 98 }, { nom: 'Confort', valeur: 95 }, { nom: 'Évasion', valeur: 90 }, { nom: 'Discrétion', valeur: 30 }],
    competences: [
      { icone: '♞', nom: 'Les hippos de Pablo', description: 'Ses hippopotames envahissent la Colombie après sa mort.', bonus: '+50 Hippopotames' },
      { icone: '⌂', nom: 'Prison 5 étoiles', description: 'Construit sa propre prison : La Catedral.', bonus: '+40 Confort' },
      { icone: '$', nom: 'Billets rongés', description: 'Des millions dévorés par les rats dans ses planques.', bonus: '-10 Fortune' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Colombienne', drapeau: 'CO', surligne: false },
      { label: 'Mort', valeur: 'À 44 ans', drapeau: null, surligne: false },
      { label: 'Cartel', valeur: 'Medellín', drapeau: null, surligne: true },
      { label: 'Animal', valeur: 'Hippopotame', drapeau: null, surligne: false },
    ],
  },
  's2-tesla': {
    numero: '045/049', prenom: 'Nikola', nom: 'Tesla',
    ligne: 8, valeur: 53,
    citation: 'Le présent est à eux ; le futur est à moi.',
    photo: '/photos/s2-tesla.webp',
    stats: [{ nom: 'Pigeons', valeur: 100 }, { nom: 'Électricité', valeur: 99 }, { nom: 'Génie', valeur: 98 }, { nom: 'Manies', valeur: 90 }, { nom: 'Business', valeur: 10 }],
    competences: [
      { icone: '♥', nom: 'Amour pigeon', description: 'Déclare son amour à une pigeonne blanche.', bonus: '+50 Pigeons' },
      { icone: '⚡', nom: 'Guerre des courants', description: 'Gagne face à Edison avec le courant alternatif.', bonus: '+40 Électricité' },
      { icone: '$', nom: 'Ruiné', description: 'Meurt sans le sou dans un hôtel de New York.', bonus: '-40 Business' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Serbo-américaine', drapeau: 'RS', surligne: false },
      { label: 'Mort', valeur: 'À 86 ans', drapeau: null, surligne: false },
      { label: 'Rival', valeur: 'Edison', drapeau: null, surligne: true },
      { label: 'Unité', valeur: 'Le tesla', drapeau: null, surligne: false },
    ],
  },
  's2-mengele': {
    numero: '046/049', prenom: 'Josef', nom: 'Mengele',
    ligne: 8, valeur: 50,
    citation: 'Ce n\'est pas mon vrai nom.',
    photo: '/photos/s2-mengele.webp',
    stats: [{ nom: 'Faux noms', valeur: 97 }, { nom: 'Fuite', valeur: 95 }, { nom: 'Brésil', valeur: 90 }, { nom: 'Natation', valeur: 5 }, { nom: 'Justice', valeur: 0 }],
    competences: [
      { icone: '✈', nom: 'Cavale', description: 'Échappe à la justice pendant 34 ans en Amérique du Sud.', bonus: '+40 Fuite' },
      { icone: '?', nom: 'Faux papiers', description: 'Vit sous plusieurs fausses identités.', bonus: '+30 Faux noms' },
      { icone: '~', nom: 'Noyade', description: 'Meurt en se baignant au Brésil, sans jamais être jugé.', bonus: '-100 Natation' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Allemande', drapeau: 'DE', surligne: false },
      { label: 'Mort', valeur: 'À 67 ans', drapeau: null, surligne: false },
      { label: 'Statut', valeur: 'Jamais jugé', drapeau: null, surligne: true },
      { label: 'Mort au', valeur: 'Brésil, 1979', drapeau: null, surligne: false },
    ],
  },
  's2-maduro': {
    numero: '047/049', prenom: 'Nicolás', nom: 'Maduro',
    ligne: 2, valeur: 47,
    citation: 'J\'ai été kidnappé.',
    photo: '/photos/s2-maduro.webp',
    stats: [{ nom: 'Conduite de bus', valeur: 99 }, { nom: 'Moustache', valeur: 92 }, { nom: 'Mysticisme', valeur: 85 }, { nom: 'Élections', valeur: 10 }, { nom: 'Liberté', valeur: 0 }],
    competences: [
      { icone: '⛟', nom: 'Chauffeur de bus', description: 'Conduisait des bus à Caracas avant la politique.', bonus: '+50 Conduite' },
      { icone: '✦', nom: 'Petit oiseau', description: 'Affirme que Chávez lui est apparu en petit oiseau.', bonus: '+30 Mysticisme' },
      { icone: '⛓', nom: 'Capturé', description: 'Arrêté par les forces américaines en janvier 2026.', bonus: '-100 Liberté' },
    ],
    infos: [
      { label: 'Nationalité', valeur: 'Vénézuélienne', drapeau: 'VE', surligne: false },
      { label: 'Âge', valeur: '63 ans', drapeau: null, surligne: false },
      { label: 'Statut', valeur: 'Détenu aux USA', drapeau: null, surligne: true },
      { label: 'Ex-métier', valeur: 'Chauffeur de bus', drapeau: null, surligne: false },
    ],
  },
  's2-poseidon': {
    numero: '048/049', prenom: '', nom: 'Poséidon',
    ligne: 9, valeur: 49,
    citation: 'Ça va secouer.',
    photo: '/photos/s2-poseidon.webp',
    stats: [{ nom: 'Chevaux', valeur: 99 }, { nom: 'Trident', valeur: 97 }, { nom: 'Séismes', valeur: 95 }, { nom: 'Humeur', valeur: 30 }, { nom: 'Fidélité', valeur: 5 }],
    competences: [
      { icone: '♞', nom: 'Mode étalon', description: 'Se change en cheval pour séduire Déméter.', bonus: '+40 Chevaux' },
      { icone: 'Ψ', nom: 'Trident', description: 'Déclenche séismes et tempêtes d\'un coup de fourche.', bonus: '+30 Trident' },
      { icone: '⚓', nom: 'Rancunier', description: 'Pourchasse Ulysse pendant dix ans.', bonus: '+20 Rancune' },
    ],
    infos: [
      { label: 'Origine', valeur: 'Grèce antique', drapeau: null, surligne: false },
      { label: 'Âge', valeur: 'Immortel', drapeau: null, surligne: false },
      { label: 'Royaume', valeur: 'Les mers', drapeau: null, surligne: true },
      { label: 'Frères', valeur: 'Zeus, Hadès', drapeau: null, surligne: false },
    ],
  },
  's2-thor': {
    numero: '049/049', prenom: '', nom: 'Thor',
    ligne: 9, valeur: 46,
    citation: 'Il est où mon marteau ?',
    photo: '/photos/s2-thor.webp',
    stats: [{ nom: 'Force', valeur: 100 }, { nom: 'Marteau', valeur: 99 }, { nom: 'Appétit', valeur: 95 }, { nom: 'Déguisement', valeur: 60 }, { nom: 'QI', valeur: 25 }],
    competences: [
      { icone: '♛', nom: 'Mariée improvisée', description: 'Se déguise en mariée pour récupérer son marteau.', bonus: '+30 Déguisement' },
      { icone: '◉', nom: 'Ventre sur pattes', description: 'Avale un bœuf et huit saumons au banquet.', bonus: '+40 Appétit' },
      { icone: '~', nom: 'Pêche au serpent', description: 'Tente de pêcher Jörmungandr avec une tête de bœuf.', bonus: '+20 Force' },
    ],
    infos: [
      { label: 'Origine', valeur: 'Asgard', drapeau: null, surligne: false },
      { label: 'Âge', valeur: 'Immortel', drapeau: null, surligne: false },
      { label: 'Arme', valeur: 'Mjöllnir', drapeau: null, surligne: true },
      { label: 'Père', valeur: 'Odin', drapeau: null, surligne: false },
    ],
  },
};

export function getCardArt(cardId: string): CardArt | undefined {
  return S2_ART[cardId];
}
