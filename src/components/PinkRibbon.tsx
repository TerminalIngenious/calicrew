/**
 * Ruban rose générique, symbole universel de sensibilisation.
 * Dessin original : le logo officiel « Ruban Rose » de l'association est une
 * marque déposée et ne peut pas être repris sans autorisation.
 */
export default function PinkRibbon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8.5 21.5C11.5 16 13.3 12 13.8 8.2 14.3 4.6 12.8 2.5 11.2 2.5" />
      <path d="M15.5 21.5C12.5 16 10.7 12 10.2 8.2 9.7 4.6 11.2 2.5 12.8 2.5" />
    </svg>
  );
}
