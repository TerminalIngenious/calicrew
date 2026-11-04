import './fonts.css';
import './CardBack.css';

/**
 * Le dos des cartes : un ticket de bus, le même pour toute la saison.
 *
 * Dessiné plutôt qu'affiché en image, comme la face — net à tout zoom, et le
 * jour où une saison 3 arrive, seuls les trois paramètres changent.
 */

function BusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-1 1.7V20a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.3A2 2 0 0 1 3 16V5a2 2 0 0 1 2-2zm0 3v5h14V6H5zm2 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm10 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
    </svg>
  );
}

/** Les correspondances du plan de lignes dessiné en fond. */
const ARRETS: [number, number][] = [
  [45, 35], [25, 55], [75, 55], [60, 95], [35, 105], [80, 90], [70, 45], [30, 85], [70, 110],
];

interface Props {
  saison?: string;
  annee?: string;
  titre?: string;
}

export default function CardBack({ saison = 'S2', annee = '2026', titre = 'LES FOUS DU BUS' }: Props) {
  return (
    <div className="cb">
      <div className="cb-back">
        <div className="cb-inner">
          <svg className="cb-map" viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path d="M-5 20 H30 L45 35 V80 L60 95 H105" />
            <path d="M10 -5 V40 L25 55 H75 L90 70 V155" />
            <path d="M-5 120 H20 L35 105 H65 L80 90 V-5" />
            <path d="M50 -5 V25 L70 45 H105" />
            <path d="M-5 70 H15 L30 85 V155" />
            <path d="M55 155 V125 L70 110 H105" />
            {ARRETS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />)}
          </svg>
          <div className="cb-hazard cb-t" />
          <div className="cb-hazard cb-b" />
          <div className="cb-top-label">RÉSEAU CALICREW</div>
          <div className="cb-bot-label">SAISON {saison.replace('S', '')} · {annee}</div>

          <div className="cb-ticket">
            <div className="cb-t-head">
              <div className="cb-busico"><BusIcon /></div>
              <div className="cb-ht"><small>TITRE DE TRANSPORT</small><b>ALLER SIMPLE</b></div>
              <div className="cb-s2">{saison}<small>SAISON</small></div>
            </div>
            <div className="cb-perf" />
            <div className="cb-t-body">
              <div className="cb-stamp"><div><span>VALIDÉ</span><b>FOU</b><span>03·11·26</span></div></div>
              <div className="cb-logo">CALICREW</div>
              <div className="cb-subtitle"><i /><span>{titre}</span><i /></div>
              <div className="cb-lines">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <b key={n}>{n}</b>)}</div>
              <div className="cb-validity">
                <strong>VALABLE SUR TOUTES LES LIGNES</strong>SANS RETOUR · NI REMBOURSEMENT
              </div>
            </div>
            <div className="cb-t-foot">
              <div className="cb-barcode"><div className="cb-bars" /><small>{saison}·000·049</small></div>
              <div className="cb-punch">
                <i style={{ left: '18%', top: '22%' }} />
                <i style={{ left: '44%', top: '52%' }} />
                <i style={{ left: '70%', top: '24%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
