/**
 * Le calcul est en JavaScript : il est partagé entre la route Vercel, en
 * TypeScript, et le serveur local, en .mjs — qui ne sait pas lire du
 * TypeScript. Cette déclaration donne juste de quoi l'importer sans que le
 * compilateur se plaigne.
 */
export interface DonneesBrutes {
  users: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  groups: Record<string, unknown>[];
  progress: Record<string, unknown>[];
}

export function calcule(brut: DonneesBrutes): Record<string, unknown>;
