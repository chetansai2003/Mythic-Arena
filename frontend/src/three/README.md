# Arena visuals

`LobbyArena.jsx` progressively loads `ArenaScene.jsx` behind the HTML lobby. `ArenaArt.jsx` remains visible while loading and in Low, reduced-motion or failed-WebGL states. The original low-poly scene uses React Three Fiber and Drei, instanced geometry, bounded parallax and a capped pixel ratio. Hidden tabs pause rendering; offscreen scenes unmount.

`MatchPortal.jsx` and `CardReveal.jsx` use cancellable GSAP contexts. `VictoryCrest.jsx` and first-match guidance use Motion. No animation promise gates a socket command, readiness, turn timer or result persistence. Every signature moment has an HTML/static equivalent.

`effects/director.js` consumes public snapshots and unique accepted event IDs. It rejects gaps, duplicates and events over 1.2 seconds late. `BattleEffects.jsx` renders one bounded effect in the divider between unit rows; it never covers targets or status bars. Optional Web Audio tones are synthesized locally and muted by default.

See [event map](../../../docs/part-5-animation-map.md), [asset inventory](../../../docs/assets.md), and [delivery report](../../../docs/part-5-report.md).
