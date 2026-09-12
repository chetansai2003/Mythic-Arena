import { m, LazyMotion, domAnimation } from 'motion/react';
import { usePresentation } from '../hooks/usePresentation.js';
export default function VictoryCrest({ victory }) {
  const { animate } = usePresentation();
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className={`victory-crest ${victory ? 'is-victory' : ''}`}
        aria-hidden="true"
        initial={animate ? { scale: 0.85, opacity: 0.6 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: animate ? 0.25 : 0 }}
      >
        <span>{victory ? '♜' : '◇'}</span>
      </m.div>
    </LazyMotion>
  );
}
