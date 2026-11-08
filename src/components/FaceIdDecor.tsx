/**
 * Le décor de l'event FaceID, posé derrière toute l'app.
 *
 * Même grille et même ligne de balayage que la page de l'event, mais
 * atténuées : ici elles passent sous des écrans qui ne parlent pas de
 * l'event, et un scanner à pleine force rendrait le tableau de bord
 * illisible. C'est le rappel qui compte, pas l'effet.
 *
 * Les quatre crochets de visée sont fixes aux angles : c'est le signe de
 * l'event, le même que sur le badge, le sachet et les cartes.
 */
export default function FaceIdDecor() {
  return (
    <div className="fid-decor" aria-hidden="true">
      <div className="fid-decor-lueur" />
      <div className="fid-decor-grille" />
      <div className="fid-decor-balayage" />
      <span className="fid-decor-crochet tl" />
      <span className="fid-decor-crochet tr" />
      <span className="fid-decor-crochet bl" />
      <span className="fid-decor-crochet br" />
    </div>
  );
}
