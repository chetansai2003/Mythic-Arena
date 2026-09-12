import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { usePresentation } from '../hooks/usePresentation.js';
import ArenaArt from './ArenaArt.jsx';

const Scene = lazy(() => import('./ArenaScene.jsx'));
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn('Optional arena unavailable:', error.message);
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function LobbyArena() {
  const { animate, hidden, graphics, reduced } = usePresentation();
  const [status, setStatus] = useState('loading');
  const [visible, setVisible] = useState(false);
  const root = useRef(null);
  useEffect(() => {
    if (!globalThis.IntersectionObserver) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const enabled = graphics === 'high' && !reduced && status !== 'failed';
  return (
    <div
      ref={root}
      className={`lobby-scenery ${enabled && status === 'ready' ? 'scene-ready' : ''}`}
      data-scene={enabled ? status : 'static'}
    >
      <ArenaArt />
      {enabled && visible && (
        <div className="lobby-canvas" aria-hidden="true">
          <SceneBoundary onFailure={() => setStatus('failed')}>
            <Suspense fallback={null}>
              <Scene
                active={animate && !hidden && visible}
                onReady={() => setStatus('ready')}
                onFailure={() => setStatus('failed')}
              />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
      <span className="scene-label">
        {enabled && status === 'ready'
          ? 'THE CELESTIAL ARENA'
          : 'THE ARENA AWAITS'}
      </span>
    </div>
  );
}
