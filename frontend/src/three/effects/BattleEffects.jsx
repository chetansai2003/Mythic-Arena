import { useEffect, useRef, useState } from 'react';
import { usePresentation } from '../../hooks/usePresentation.js';
import { createEffectDirector } from './director.js';
import { playCue } from './audio.js';

export default function BattleEffects({ feed, catalog }) {
  const { animate, muted, hidden } = usePresentation();
  const [director] = useState(createEffectDirector);
  const [cue, setCue] = useState(null);
  const root = useRef(null);
  useEffect(() => {
    if (!animate) setCue(null);
  }, [animate]);
  useEffect(() => {
    const next = director.consume(feed);
    if (!next || hidden) return;
    if (!muted) playCue(next.kind);
    if (animate) setCue(next);
  }, [feed, director, animate, muted, hidden]);
  useEffect(() => {
    if (!cue || !animate) return;
    let disposed = false;
    let context;
    const timeout = setTimeout(() => setCue(null), 700);
    const started = performance.now();
    void import('gsap')
      .then(({ gsap }) => {
        if (disposed || performance.now() - started > 200) return;
        context = gsap.context(() => {
          gsap.fromTo(
            '.effect-spark',
            { scale: 0.2, opacity: 0 },
            { scale: 1.1, opacity: 0.8, duration: 0.18, stagger: 0.012 },
          );
          gsap.to('.effect-spark', {
            opacity: 0,
            scale: 1.5,
            duration: 0.3,
            delay: 0.3,
          });
          gsap.fromTo(
            '.effect-rune',
            { scale: 0.85, rotate: -12 },
            { scale: 1, rotate: 0, duration: 0.25 },
          );
        }, root);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      clearTimeout(timeout);
      context?.revert();
    };
  }, [cue, animate]);
  const definition = catalog.find((card) => card.id === cue?.definitionId);
  const legendary =
    definition?.rarity === 'LEGENDARY' || (definition?.cost ?? 0) >= 4;
  return (
    <div
      ref={root}
      className={`battle-effects ${legendary ? 'legendary-effect' : ''}`}
      aria-hidden="true"
      data-effect={animate ? (cue?.kind ?? 'none') : 'none'}
    >
      {animate && cue && (
        <>
          <span className="effect-rune">
            {cue.kind === 'SUMMON' ? '✧' : cue.kind === 'IMPACT' ? 'ϟ' : '◇'}
          </span>
          {Array.from({ length: legendary ? 12 : 6 }, (_, i) => (
            <i
              key={`${cue.id}-${i}`}
              className="effect-spark"
              style={{ '--angle': `${i * (legendary ? 30 : 60)}deg` }}
            />
          ))}
        </>
      )}
    </div>
  );
}
