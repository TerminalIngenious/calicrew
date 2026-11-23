import { useEffect, useRef } from 'react';

/**
 * Le ciel de l'arrivée : un champ d'étoiles en 3D, puis l'éclat.
 *
 * En canvas et non en CSS. Deux cents étoiles en DOM feraient deux cents
 * couches à composer à chaque image, et le téléphone décroche bien avant.
 * Ici tout tient dans un seul élément et une boucle de rendu.
 *
 * La séquence est pilotée par le temps écoulé depuis `depart`, et non par
 * des classes posées de l'extérieur : le fond doit rester d'accord à la
 * milliseconde avec l'animation CSS de la carte, qui suit la même horloge.
 */

/** Les repères, en secondes, alignés sur la feuille de style de l'arrivée. */
const T_ACCELERE = 2.0;
const T_WARP = 3.2;
const T_COUPURE = 7.3;
const T_ECLAT = 7.8;

interface Etoile { x: number; y: number; z: number; }
interface Particule { x: number; y: number; vx: number; vy: number; vie: number; teinte: number; }

/** Combien d'étoiles. Moins sur un petit écran : c'est aussi le moins puissant. */
function combien(largeur: number): number {
  return largeur < 500 ? 150 : 260;
}

export default function CielArrivee({ depart }: { depart: number }) {
  const toile = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = toile.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let L = 0;
    let H = 0;
    let etoiles: Etoile[] = [];
    const particules: Particule[] = [];
    let eclatFait = false;
    let image = 0;

    /* Le canvas est dimensionné en pixels réels puis remis à l'échelle :
       sans ça, tout est flou sur un écran à forte densité. */
    function redimensionne() {
      if (!c || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      L = c.clientWidth;
      H = c.clientHeight;
      c.width = Math.round(L * dpr);
      c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (etoiles.length !== combien(L)) {
        etoiles = Array.from({ length: combien(L) }, () => neuve(true));
      }
    }

    /** Une étoile, quelque part dans le volume. */
    function neuve(partout: boolean): Etoile {
      return {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: partout ? Math.random() : 1,
      };
    }

    /**
     * La vitesse à un instant donné.
     *
     * Une dérive à peine perceptible, puis la montée, puis le saut — et
     * zéro net à la coupure. C'est l'arrêt brutal qui donne le silence, pas
     * un ralentissement.
     */
    function vitesse(t: number): number {
      if (t >= T_COUPURE) return 0;
      if (t >= T_WARP) {
        const p = (t - T_WARP) / (T_COUPURE - T_WARP);
        return 0.0022 + p * p * 0.055;
      }
      if (t >= T_ACCELERE) {
        return 0.0006 + ((t - T_ACCELERE) / (T_WARP - T_ACCELERE)) * 0.0016;
      }
      return 0.0006;
    }

    function eclat() {
      // Les particules partent du centre, à des vitesses très inégales :
      // une gerbe régulière ressemble à une roue de vélo.
      for (let i = 0; i < 90; i++) {
        const angle = Math.random() * Math.PI * 2;
        const force = 2 + Math.random() * Math.random() * 13;
        particules.push({
          x: L / 2,
          y: H / 2,
          vx: Math.cos(angle) * force,
          vy: Math.sin(angle) * force,
          vie: 1,
          teinte: 205 + Math.random() * 55,
        });
      }
    }

    function dessine() {
      if (!ctx) return;
      const t = (Date.now() - depart) / 1000;
      const v = vitesse(t);

      ctx.clearRect(0, 0, L, H);

      // Les étoiles, en traînées d'autant plus longues qu'on va vite.
      const traine = Math.min(v * 2600, 34);
      for (const e of etoiles) {
        e.z -= v;
        if (e.z <= 0.02) {
          Object.assign(e, neuve(false));
          continue;
        }
        const k = 0.62 / e.z;
        const x = L / 2 + e.x * k * L;
        const y = H / 2 + e.y * k * H;
        if (x < -60 || x > L + 60 || y < -60 || y > H + 60) continue;

        const proche = 1 - e.z;
        const opacite = Math.min(1, proche * proche * 1.5) * (t >= T_COUPURE ? 0.25 : 1);
        const taille = 0.5 + proche * 2.1;

        if (traine > 1.5) {
          const kp = 0.62 / Math.min(1, e.z + v * 2.2);
          ctx.strokeStyle = `rgba(214, 233, 255, ${opacite * 0.85})`;
          ctx.lineWidth = taille;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(L / 2 + e.x * kp * L, H / 2 + e.y * kp * H);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(226, 238, 255, ${opacite})`;
          ctx.beginPath();
          ctx.arc(x, y, taille, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!eclatFait && t >= T_ECLAT) {
        eclatFait = true;
        eclat();
      }

      for (let i = particules.length - 1; i >= 0; i--) {
        const p = particules[i];
        p.x += p.vx;
        p.y += p.vy;
        // Frottement : elles partent vite et s'étouffent, comme des braises.
        p.vx *= 0.955;
        p.vy *= 0.955;
        p.vie -= 0.012;
        if (p.vie <= 0) {
          particules.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `hsla(${p.teinte}, 90%, 82%, ${p.vie})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1 + p.vie * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      image = requestAnimationFrame(dessine);
    }

    redimensionne();
    window.addEventListener('resize', redimensionne);
    image = requestAnimationFrame(dessine);

    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener('resize', redimensionne);
    };
  }, [depart]);

  return <canvas ref={toile} className="arr-ciel" aria-hidden="true" />;
}
