import { useState } from 'react';
import { LazyMotion, domAnimation, m } from 'motion/react';
import { usePresentation } from '../../hooks/usePresentation.js';
export default function FirstMatchGuide() {
  const { animate } = usePresentation();
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('mythic.guide.v1') !== 'dismissed';
    } catch {
      return true;
    }
  });
  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem('mythic.guide.v1', 'dismissed');
    } catch {
      /* Per-match fallback. */
    }
  }
  return (
    <LazyMotion features={domAnimation}>
      {open ? (
        <m.aside
          className="first-match-guide"
          aria-label="First match guidance"
          initial={animate ? { opacity: 0.7, y: 3 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: animate ? 0.2 : 0 }}
        >
          <div>
            <strong>Three things to know</strong>
            <p>
              Spend energy to play cards. Select a card or unit, then a
              highlighted target. Choose End turn when you are ready; new units
              attack next turn.
            </p>
          </div>
          <button className="button button-secondary" onClick={dismiss}>
            Dismiss tips
          </button>
        </m.aside>
      ) : (
        <button
          className="text-link battle-tips-toggle"
          onClick={() => setOpen(true)}
        >
          Show battle tips
        </button>
      )}
    </LazyMotion>
  );
}
