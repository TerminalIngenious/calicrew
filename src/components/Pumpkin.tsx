/** Citrouille, dans le style de trait des icônes de l'app. */
export default function Pumpkin({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 7c-1.2-1.6-3.6-1.9-5.3-.5C4.6 8.2 4 11.3 4 13.6 4 17.7 7.2 21 11 21h2c3.8 0 7-3.3 7-7.4 0-2.3-.6-5.4-2.7-7.1C15.6 5.1 13.2 5.4 12 7Z" />
      <path d="M9.2 7.4C8 9.4 7.7 11.5 7.7 13.6s.3 4.2 1.5 6.2" />
      <path d="M14.8 7.4c1.2 2 1.5 4.1 1.5 6.2s-.3 4.2-1.5 6.2" />
      <path d="M12 6.8V4.5c0-1 .8-1.9 1.9-1.9" />
    </svg>
  );
}
