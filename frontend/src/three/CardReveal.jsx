import { useEffect, useRef } from 'react';
import { usePresentation } from '../hooks/usePresentation.js';

export function useCardTilt() {
  const { animate } = usePresentation();
  return {
    onPointerMove: (event) => {
      if (!animate || event.pointerType !== 'mouse') return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      event.currentTarget.style.transform = `perspective(800px) rotateX(${-y * 7}deg) rotateY(${x * 9}deg)`;
    },
    onPointerLeave: (event) => {
      event.currentTarget.style.transform = '';
    },
    onBlur: (event) => {
      event.currentTarget.style.transform = '';
    },
  };
}
export default function CardReveal({ card, children }) {
  const { animate } = usePresentation();
  const root = useRef(null);
  useEffect(() => {
    if (!animate) return;
    let disposed = false;
    let context;
    const started = performance.now();
    void import('gsap')
      .then(({ gsap }) => {
        if (disposed || performance.now() - started > 800) return;
        context = gsap.context(() => {
          gsap.fromTo(
            root.current,
            { rotationY: -75, scale: 0.96 },
            { rotationY: 0, scale: 1, duration: 0.35, ease: 'power2.out' },
          );
        });
      })
      .catch(() => {});
    return () => {
      disposed = true;
      context?.revert();
    };
  }, [animate, card.id]);
  return (
    <div className="card-reveal" ref={root} {...useCardTilt()}>
      {children}
    </div>
  );
}
