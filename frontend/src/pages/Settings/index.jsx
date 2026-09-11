import { Link } from 'react-router-dom';
import {
  ArrowRight,
  History,
  Crown,
  Swords,
  Sparkles,
  WandSparkles,
  Volume2,
} from 'lucide-react';
import { EmptyState, Toast } from '../../components/index.jsx';
import PageHeading from '../../components/PageHeading.jsx';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setGraphics, setMuted, setReducedMotion } from '../../store/index.js';
export default function SettingsPage() {
  const prefs = useSelector((state) => state.preferences);
  const dispatch = useDispatch();
  const [message, setMessage] = useState('');
  function update(action) {
    dispatch(action);
    setMessage('Preference updated for this device.');
  }
  return (
    <div className="page">
      <PageHeading eyebrow="MAKE IT YOURS" title="Settings">
        A comfortable arena is a better arena.
      </PageHeading>
      <div className="settings-panel content-panel">
        <div className="settings-header">
          <WandSparkles size={22} />
          <div>
            <h2>Your experience</h2>
            <p>Preferences apply on this device. No account needed.</p>
          </div>
        </div>
        <div className="setting-row">
          <div>
            <h3>Graphics quality</h3>
            <p>
              Low removes ambient scenery motion. Future 3D scenes will respect
              this choice.
            </p>
          </div>
          <select
            aria-label="Graphics quality"
            value={prefs.graphics}
            onChange={(e) => update(setGraphics(e.target.value))}
          >
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <h3>Reduce motion</h3>
            <p>
              Use a calmer, still experience. Your system’s reduced-motion
              setting is always respected.
            </p>
          </div>
          <input
            className="switch"
            type="checkbox"
            role="switch"
            aria-label="Reduce motion"
            checked={prefs.reduceMotion}
            onChange={(e) => update(setReducedMotion(e.target.checked))}
          />
        </div>
        <div className="setting-row">
          <div>
            <h3>
              <Volume2 size={16} /> Mute sound
            </h3>
            <p>
              Sound is off by default. Audio effects will arrive in a later
              milestone.
            </p>
          </div>
          <input
            className="switch"
            type="checkbox"
            role="switch"
            aria-label="Mute sound"
            checked={prefs.muted}
            onChange={(e) => update(setMuted(e.target.checked))}
          />
        </div>
      </div>
      {message && <Toast message={message} onDismiss={() => setMessage('')} />}
    </div>
  );
}
