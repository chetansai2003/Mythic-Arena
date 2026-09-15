# Asset inventory through Part 5

- `frontend/src/three/ArenaArt.jsx`: original project SVG geometry and CSS scenery; no external artwork or copyrighted franchise characters.
- `frontend/public/favicon.svg`: original project mark.
- `frontend/src/pages/DeckBuilder/index.jsx` and `decks.css`: original faction card-frame, rune-ring, and color compositions using the licensed interface icons. Definitions use null art references until dedicated card artwork is added.
- Interface icons: `lucide-react`, ISC license; version pinned in the web manifest and lockfile.
- Fonts: installed system fonts (Segoe UI/Georgia fallbacks); no remote font tracking or downloaded font files.

This is the static fallback. No video, 3D scene, external image request, or audio asset is required to use the shell.

## Step 5 additions

| Asset/library                                            | Source and license                                                                  | Loading                                                                           |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Floating island, rune rings, pillars, crystals           | Original project geometry in `ArenaScene.jsx`; no external model                    | Optional lazy JavaScript, reused/instanced primitives                             |
| Portal, player crests, card sheet, sparks, victory crest | Original HTML/CSS and Unicode ornamentation; system fonts                           | Local components; no image/font requests                                          |
| Move tones                                               | Original short Web Audio oscillator envelopes in `effects/audio.js`                 | No audio files; muted until explicitly enabled and user interaction unlocks audio |
| Three.js 0.186.0                                         | MIT, installed package license                                                      | Lazy scene bundle                                                                 |
| React Three Fiber 9.7.0                                  | MIT, installed package license                                                      | Lazy scene bundle                                                                 |
| Drei 10.7.8                                              | MIT, installed package license; Stars and Edges helpers only                        | Lazy scene bundle                                                                 |
| Motion 13.2.0                                            | MIT, installed package license                                                      | Battle UI transitions                                                             |
| GSAP 3.15.0                                              | [Standard No Charge license](https://gsap.com/community/standard-license/), not MIT | Lazy cinematic module                                                             |

No purchased assets, proprietary franchise artwork, external model hosts, environment maps, textures, remote fonts or sampled music are used. Library versions and notices remain in the manifests, lockfile and installed distributions. The GSAP license page was checked September 12, 2026.
