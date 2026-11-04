import { useEffect, useRef } from 'react';
import type { CardRarity } from '../types';

/**
 * Une carte qu'on retourne au doigt : glisser = faire tourner, tap = retourner.
 *
 * Tout passe par des refs et une boucle `requestAnimationFrame` plutôt que par
 * un state : la rotation change à chaque image, un `setState` par frame ferait
 * re-rendre l'arbre 60 fois par seconde pour rien.
 *
 * Porté du kit de la saison 2. Face et dos sont de simples URL d'images, donc
 * rien à dessiner ici — la carte est déjà un visuel complet.
 */

/** Teinte du reflet selon la rareté. `rainbow` = dégradé holographique. */
const HOLO: Record<CardRarity, string> = {
  commune: 'rgba(255,255,255,.18)',
  rare: 'rgba(90,170,255,.30)',
  epique: 'rgba(190,120,255,.32)',
  legendaire: 'rgba(255,205,60,.38)',
  historique: 'rainbow',
};

interface Props {
  front: string;
  back: string;
  rarity: CardRarity;
  alt?: string;
}

export default function Card3D({ front, back, rarity, alt = '' }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const s = useRef({ rx: 0, ry: 0, vx: 0, vy: 0, drag: false, lx: 0, ly: 0, moved: 0, t0: 0 });

  useEffect(() => {
    const st = s.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;

    const render = () => {
      const card = cardRef.current;
      const glare = glareRef.current;
      if (!card || !glare) return;
      const { rx, ry } = st;
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;

      // Le reflet suit l'inclinaison. `face` vaut 0 côté recto, 1 côté verso :
      // le dos est moins brillant, sinon le reflet paraît traverser la carte.
      const face = ((Math.round(ry / 180) % 2) + 2) % 2;
      const k = ((ry % 180) + 180) % 180;
      const gx = 50 + (k > 90 ? k - 180 : k) * 1.6;
      const gy = 50 - rx * 2.2;
      const holo = HOLO[rarity];
      glare.style.opacity = face === 0 ? '1' : '0.6';
      glare.style.background =
        holo === 'rainbow'
          ? `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,.45), transparent 45%),
             linear-gradient(${115 + ry * 0.6}deg, rgba(255,0,90,.22), rgba(255,200,0,.22), rgba(0,255,170,.22), rgba(0,140,255,.22), rgba(200,0,255,.22))`
          : `radial-gradient(circle at ${gx}% ${gy}%, ${holo}, transparent 55%)`;
    };

    const loop = (t: number) => {
      if (!st.drag) {
        // Inertie, puis recalage sur la face la plus proche : la carte ne
        // s'immobilise jamais de biais, elle retombe toujours à plat.
        st.ry += st.vy;
        st.rx += st.vx;
        st.vy *= 0.94;
        st.vx *= 0.9;
        if (Math.abs(st.vy) < 0.4) {
          const target = Math.round(st.ry / 180) * 180;
          const idle = reduce ? 0 : Math.sin(t / 1400) * 4;
          st.ry += (target + idle - st.ry) * 0.08;
          st.rx += ((reduce ? 0 : Math.cos(t / 1700) * 3) - st.rx) * 0.08;
          st.vy = 0;
        }
      }
      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rarity]);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    Object.assign(s.current, {
      drag: true,
      lx: e.clientX,
      ly: e.clientY,
      moved: 0,
      vx: 0,
      vy: 0,
      t0: performance.now(),
    });
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = s.current;
    if (!st.drag) return;
    const dx = e.clientX - st.lx;
    const dy = e.clientY - st.ly;
    st.lx = e.clientX;
    st.ly = e.clientY;
    st.moved += Math.abs(dx) + Math.abs(dy);
    st.vy = dx * 0.6;
    st.vx = -dy * 0.35;
    st.ry += st.vy;
    // L'axe vertical reste bridé : au-delà on verrait la carte par la tranche.
    st.rx = Math.max(-28, Math.min(28, st.rx + st.vx));
  };

  const onUp = () => {
    const st = s.current;
    if (!st.drag) return;
    st.drag = false;
    // Un tap court, sans vrai glissement, retourne la carte d'un demi-tour.
    if (st.moved < 8 && performance.now() - st.t0 < 300) st.vy = 14.5;
  };

  return (
    <div
      className="c3d"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="img"
      aria-label={alt}
    >
      <div className="c3d-card" ref={cardRef}>
        <img className="c3d-face" src={front} alt="" draggable={false} />
        <img className="c3d-face c3d-back" src={back} alt="" draggable={false} />
        <div className="c3d-glare" ref={glareRef} />
      </div>
      <div className="c3d-shadow" />
    </div>
  );
}
