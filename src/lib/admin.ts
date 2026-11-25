/**
 * Les comptes qui voient et font plus que les autres.
 *
 * Par identifiant et non par pseudo, qui se change. La liste vivait dans
 * App.tsx du temps où elle ne servait qu'aux routes d'administration ; elle
 * sert maintenant aussi à masquer des morceaux d'écran, et deux copies de
 * la même liste finissent toujours par diverger.
 */
/*
 * Cette liste est recopiée dans `api/_lib/admins.ts`, pour les routes
 * serveur qui sont compilées à part et ne peuvent pas l'importer d'ici.
 * Toucher à l'une, c'est toucher à l'autre.
 */
export const ADMIN_UIDS = ['bhH01VzturU9rgVVopKbFe5edoO2'];

export function estAdmin(uid: string | undefined): boolean {
  return !!uid && ADMIN_UIDS.includes(uid);
}
