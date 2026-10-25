import React, { useEffect, useRef } from 'react';

interface StarParticle {
  x: number;
  y: number;
  baseSize: number;
  size: number;
  vx: number;
  vy: number;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  tint: 'white' | 'amber' | 'rose';
  isBright: boolean;
}

export const StarBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let isMounted = true;
    let animationFrameId: number | null = null;
    let stars: StarParticle[] = [];
    let isVisible = !document.hidden;

    // Check operating system reduced-motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Calculate dynamic density and sizing based on screen dimensions and device pixel ratio
    const getMetrics = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const isMobile = width < 768;

      // Density calculation
      const area = width * height;
      const count = isMobile
        ? Math.min(Math.max(Math.floor(area / 16000), 45), 90)
        : Math.min(Math.max(Math.floor(area / 11000), 80), 175);

      return { width, height, dpr, isMobile, count };
    };

    const initCanvas = () => {
      const { width, height, dpr, isMobile, count } = getMetrics();

      // Sharp canvas scaling for high-DPI / Retina displays
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Re-populate stars preserving distributed field
      stars = [];
      for (let i = 0; i < count; i++) {
        // Star sizes: majority fine distant stars (0.7px - 1.4px), a few prominent stars (1.8px - 2.4px)
        const isBright = Math.random() < 0.14;
        const baseSize = isBright
          ? (Math.random() * 0.7 + 1.8) * (isMobile ? 0.9 : 1.0)
          : (Math.random() * 0.8 + 0.7) * (isMobile ? 0.85 : 1.0);

        // Literary INOKORA color palette: pure starlight, warm amber gold, ethereal soft rose
        const randTint = Math.random();
        const tint: 'white' | 'amber' | 'rose' =
          randTint < 0.65 ? 'white' : randTint < 0.85 ? 'amber' : 'rose';

        // Base opacity: sufficiently luminous to glow clearly over dark #09090b
        const baseAlpha = isBright
          ? Math.random() * 0.25 + 0.65 // 0.65 - 0.90
          : Math.random() * 0.35 + 0.30; // 0.30 - 0.65

        // Gentle diagonal night-sky drift (drifting slowly up and right)
        const baseDriftSpeed = isMobile ? 0.08 : 0.12;
        const vx = (baseDriftSpeed * 0.8) + (Math.random() - 0.5) * 0.06;
        const vy = (-baseDriftSpeed * 0.5) + (Math.random() - 0.5) * 0.06;

        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          baseSize,
          size: baseSize,
          vx: prefersReducedMotion ? 0 : vx,
          vy: prefersReducedMotion ? 0 : vy,
          alpha: baseAlpha,
          baseAlpha,
          twinkleSpeed: Math.random() * 0.018 + 0.007,
          twinklePhase: Math.random() * Math.PI * 2,
          tint,
          isBright,
        });
      }
    };

    initCanvas();

    let lastTime = performance.now();

    const render = (time: number) => {
      if (!isMounted) return;
      if (!isVisible) return;

      const delta = Math.min(time - lastTime, 40);
      lastTime = time;

      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      const len = stars.length;
      const dtFactor = delta / 16.6;

      // 1. Draw occasional subtle connecting lines between close stars (constellation filaments)
      ctx.lineWidth = 0.5;
      for (let i = 0; i < len; i++) {
        const s1 = stars[i];
        let connections = 0;

        for (let j = i + 1; j < len; j++) {
          if (connections >= 2) break; // Limit lines per star for clean, serene visual
          const s2 = stars[j];
          const dx = s1.x - s2.x;
          const dy = s1.y - s2.y;
          const distSq = dx * dx + dy * dy;

          // Only connect if distance is under 75px
          if (distSq < 5625) {
            const dist = Math.sqrt(distSq);
            const lineAlpha = (1 - dist / 75) * Math.min(s1.alpha, s2.alpha) * 0.18;
            if (lineAlpha > 0.015) {
              ctx.beginPath();
              ctx.moveTo(s1.x, s1.y);
              ctx.lineTo(s2.x, s2.y);
              ctx.strokeStyle = `rgba(251, 191, 36, ${lineAlpha})`;
              ctx.stroke();
              connections++;
            }
          }
        }
      }

      // 2. Render each star with soft radiant glow and core
      for (let i = 0; i < len; i++) {
        const star = stars[i];

        if (!prefersReducedMotion) {
          // Dynamic organic twinkling
          star.twinklePhase += star.twinkleSpeed * dtFactor;
          const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
          star.alpha = star.baseAlpha * (0.45 + 0.55 * twinkle);
          star.size = star.baseSize * (0.85 + 0.25 * twinkle);

          // Diagonal slow drift
          star.x += star.vx * dtFactor;
          star.y += star.vy * dtFactor;

          // Seamless edge wrapping
          if (star.x < -10) star.x = width + 10;
          else if (star.x > width + 10) star.x = -10;
          if (star.y < -10) star.y = height + 10;
          else if (star.y > height + 10) star.y = -10;
        }

        const currentAlpha = Math.min(Math.max(star.alpha, 0), 1);

        // Determine starlight colors
        let coreColor = `rgba(255, 255, 255, ${currentAlpha})`;
        let glowColor = `rgba(255, 255, 255, ${currentAlpha * 0.22})`;

        if (star.tint === 'amber') {
          coreColor = `rgba(254, 240, 138, ${currentAlpha})`;
          glowColor = `rgba(251, 191, 36, ${currentAlpha * 0.28})`;
        } else if (star.tint === 'rose') {
          coreColor = `rgba(254, 205, 211, ${currentAlpha})`;
          glowColor = `rgba(244, 63, 94, ${currentAlpha * 0.25})`;
        }

        // Soft outer luminous halo for prominent stars
        if (star.isBright) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = glowColor;
          ctx.fill();
        }

        // Core star point
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render(performance.now());
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    // Debounced resize handler
    let resizeTimer: any = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!isMounted) return;
        initCanvas();
        if (prefersReducedMotion) {
          render(performance.now());
        }
      }, 120);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Handle tab visibility to pause animation when inactive
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible && !prefersReducedMotion && isMounted) {
        lastTime = performance.now();
        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(render);
        }
      } else if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Gentle atmospheric vignette gradient behind the stars */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-950/20 via-stone-950/40 to-[#09090b] pointer-events-none" />

      {/* Floating star field canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full pointer-events-none"
      />
    </div>
  );
};
