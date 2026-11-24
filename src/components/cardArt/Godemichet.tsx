/**
 * L'objet de l'event, dessiné une fois pour toutes.
 *
 * Il apparaît au recto des cartes, en grand au dos, et sur le sachet : trois
 * copies du même tracé auraient divergé à la première retouche. Le décor du
 * calendrier en garde une version en data-URI dans Avent.css, qui ne peut
 * pas importer de composant — c'est la seule copie, et elle est signalée
 * là-bas.
 *
 * Les formes sont peintes à plat avec la couleur passée, sans dégradé SVG :
 * un <linearGradient> porte un id, et quarante-cinq cartes dans une grille
 * partageraient le même — toutes auraient pris la teinte de la première. Le
 * volume vient donc de calques posés par-dessus.
 */
export default function Godemichet({ className, couleur = 'var(--teinte)' }: {
  className?: string;
  couleur?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 60 120" aria-hidden="true">
      {/* La silhouette : deux bourses, une hampe légèrement cintrée, et un
          gland plus large qu'elle. C'est cette rupture de largeur au col
          qui fait lire l'objet — une hampe à bout rond reste un crayon. */}
      <g fill={couleur}>
        <ellipse cx="19.5" cy="104.5" rx="13.5" ry="12.5" />
        <ellipse cx="40.5" cy="106" rx="12.5" ry="11.5" />
        <path d="M18.6 99.5c-3-19.5-4.2-39.5-2.8-57.5.5-6.3 1.2-11.3 1.8-15.3-5.4-3-6.5-13.4-1.7-18.7C19.7 3.6 25.6 1.8 30 1.8s10.3 1.8 14.1 6.2c4.8 5.3 3.7 15.7-1.7 18.7.6 4 1.3 9 1.8 15.3 1.4 18 .2 38-2.8 57.5z" />
      </g>

      <g fill="none" strokeLinecap="round">
        {/* Le col et la couronne du gland, puis l'ombre qui court juste en
            dessous : sans elle, le gland est posé sur la hampe au lieu de
            la coiffer. */}
        <path d="M17.6 26.7c4.2 2.8 20.6 2.8 24.8 0" stroke="rgba(0,0,0,0.34)" strokeWidth="2.2" />
        <path d="M18.4 30.4c4.4 2 18.8 2 23.2 0" stroke="rgba(0,0,0,0.13)" strokeWidth="3.4" />
        {/* La fente, au bout. */}
        <path d="M30.4 3.6c-.3 1.6-.3 3.2 0 4.6" stroke="rgba(0,0,0,0.3)" strokeWidth="2.2" />
        {/* Trois veines, dont une qui serpente : c'est ce détail-là qui fait
            basculer le dessin du pictogramme vers l'objet. */}
        <path d="M24 95c-2.4-9-3-19-2.6-28.5.2-6 .6-12 1-17" stroke="rgba(0,0,0,0.17)" strokeWidth="2.3" />
        <path d="M37.6 92.5c1.4-8 1.8-17 1.6-25.5" stroke="rgba(0,0,0,0.13)" strokeWidth="2" />
        <path d="M31.5 88c-2.2-5-1-11 .8-15.5 1.6-4 2-8.5 1.2-13" stroke="rgba(0,0,0,0.1)" strokeWidth="1.8" />
        {/* La couture entre les bourses. */}
        <path d="M30 95.5c-1.3 6-1.3 12.5 0 18.5" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />
        {/* Le bord droit dans l'ombre, le bord gauche dans la lumière. Sans
            ces deux-là, la forme est plate et ne se lit plus en tout petit. */}
        <path d="M41.8 31c1.4 6.5 2 16 1.8 27 -.2 14-1 27.5-2.2 39" stroke="rgba(0,0,0,0.26)" strokeWidth="5" />
        <path d="M22.4 33c-1.5 10.5-1.8 24.5-1.5 38 .2 9.5.6 18 1.1 24.5" stroke="rgba(255,255,255,0.28)" strokeWidth="4" />
        <path d="M30.6 99c-4.2 2.6-9 3-12.6 1.2" stroke="rgba(255,255,255,0.16)" strokeWidth="3" />
      </g>

      {/* Le point de lumière sur le gland : une surface bombée renvoie un
          reflet net, pas un dégradé. */}
      <ellipse cx="22.8" cy="15.4" rx="4" ry="6.4" transform="rotate(-14 22.8 15.4)" fill="rgba(255,255,255,0.3)" />
      <ellipse cx="21.8" cy="12.6" rx="1.9" ry="2.6" transform="rotate(-14 21.8 12.6)" fill="rgba(255,255,255,0.34)" />
      <ellipse cx="46" cy="108" rx="6.2" ry="5.4" fill="rgba(0,0,0,0.2)" />
    </svg>
  );
}
