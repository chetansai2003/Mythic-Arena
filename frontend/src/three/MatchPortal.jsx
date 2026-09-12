import { useEffect, useRef, useState } from 'react';
import { usePresentation } from '../hooks/usePresentation.js';

export default function MatchPortal({ self, opponent, gameId }) {
  const { animate } = usePresentation();
  const [skipped, setSkipped] = useState(false);
  const root = useRef(null);
  useEffect(() => {
    if (!animate || skipped) return;
    let disposed = false;
    let context;
    const started = performance.now();
    void import('gsap')
      .then(({ gsap }) => {
        if (disposed || performance.now() - started > 1000) return;
        context = gsap.context(() => {
          gsap
            .timeline()
            .fromTo(
              '.portal-ring',
              { rotationY: -65, scale: 0.65, opacity: 0.3 },
              {
                rotationY: 0,
                scale: 1,
                opacity: 1,
                duration: 0.65,
                ease: 'power2.out',
              },
            )
            .fromTo(
              '.player-crest',
              { y: 12, opacity: 0.6 },
              { y: 0, opacity: 1, duration: 0.3, stagger: 0.08 },
              0.15,
            );
        }, root);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      context?.revert();
    };
  }, [animate, skipped, gameId]);
  return (
    <div
      ref={root}
      className={`match-portal ${skipped ? 'portal-skipped' : ''}`}
    >
      <div className="portal-ring" aria-hidden="true">
        <span>✧</span>
      </div>
      <div className="portal-players">
        <div className="player-crest">
          <span aria-hidden="true">◇</span>
          <strong>{self}</strong>
        </div>
        <span className="portal-versus">VS</span>
        <div className="player-crest">
          <span aria-hidden="true">◇</span>
          <strong>{opponent}</strong>
        </div>
      </div>
      {animate && !skipped && (
        <button className="text-link" onClick={() => setSkipped(true)}>
          Skip intro
        </button>
      )}
    </div>
  );
}
