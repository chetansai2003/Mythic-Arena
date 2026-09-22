import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  HelpCircle,
  History,
  Layers,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Wifi,
  Zap,
} from 'lucide-react';
import PageHeading from '../../components/PageHeading.jsx';
import '../../styles/rules.css';

export default function HowToPlay() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Combat simulator state
  const [simAttackerAtk, setSimAttackerAtk] = useState(5);
  const [simAttackerHp, setSimAttackerHp] = useState(4);
  const [simDefenderAtk, setSimDefenderAtk] = useState(3);
  const [simDefenderHp, setSimDefenderHp] = useState(2);
  const [simTargetType, setSimTargetType] = useState('unit'); // 'unit' | 'hero'

  // Categories for fast filtering
  const categories = [
    { id: 'all', label: 'All Rules (1–26)' },
    { id: 'core', label: 'Core & Energy' },
    { id: 'combat', label: 'Units & Attacking' },
    { id: 'keywords', label: 'Guard vs Shield' },
    { id: 'spells', label: 'Spells & Healing' },
    { id: 'systems', label: 'Deck & System Rules' },
    { id: 'walkthrough', label: 'Example Battle' },
    { id: 'golden', label: '13 Golden Rules' },
  ];

  // Simulator calculations
  const attackerRemainingHp =
    simTargetType === 'hero'
      ? simAttackerHp // Heroes do not retaliate!
      : simAttackerHp - simDefenderAtk;
  const defenderRemainingHp =
    simTargetType === 'hero'
      ? 20 - simAttackerAtk
      : simDefenderHp - simAttackerAtk;

  const matchesCategory = (cat) => {
    if (activeCategory === 'all') return true;
    return activeCategory === cat;
  };

  const matchesSearch = (text) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="page rules-page">
      <div className="rules-hero-banner">
        <PageHeading
          eyebrow="COMBAT ACADEMY & RULEBOOK"
          title="How to Play Mythic Arena"
        >
          Master the fundamentals of spellcraft, unit combat, and hero duels.
        </PageHeading>

        <div className="rules-quick-actions">
          <Link to="/practice" className="rules-action-btn primary">
            <Bot size={16} />
            Try in Practice Mode
          </Link>
          <Link to="/decks" className="rules-action-btn secondary">
            <Layers size={16} />
            Build a 30-Card Deck
          </Link>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="rules-stats-bar">
        <div className="stat-pill-card">
          <div className="stat-pill-icon hp">
            <Heart size={20} />
          </div>
          <div>
            <div className="stat-pill-value">20 HP</div>
            <div className="stat-pill-label">Starting Health</div>
          </div>
        </div>
        <div className="stat-pill-card">
          <div className="stat-pill-icon cards">
            <Layers size={20} />
          </div>
          <div>
            <div className="stat-pill-value">30 Cards</div>
            <div className="stat-pill-label">Deck (Max 2 Copies)</div>
          </div>
        </div>
        <div className="stat-pill-card">
          <div className="stat-pill-icon energy">
            <Zap size={20} />
          </div>
          <div>
            <div className="stat-pill-value">1 → 10</div>
            <div className="stat-pill-label">Energy (+1 / Turn)</div>
          </div>
        </div>
        <div className="stat-pill-card">
          <div className="stat-pill-icon timer">
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-pill-value">30 Sec</div>
            <div className="stat-pill-label">Turn Deadline</div>
          </div>
        </div>
        <div className="stat-pill-card">
          <div className="stat-pill-icon board">
            <Swords size={20} />
          </div>
          <div>
            <div className="stat-pill-value">5 Slots</div>
            <div className="stat-pill-label">Max Board Units</div>
          </div>
        </div>
      </div>

      {/* Category Navigation & Search */}
      <div className="rules-nav-sticky">
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              position: 'relative',
              flex: '1',
              maxWidth: '380px',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search rules (e.g. Guard, Shield, Fatigue, Retaliate)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: 'rgba(18, 24, 38, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '20px',
                color: '#f8fafc',
                fontSize: '13px',
              }}
            />
          </div>
          {searchQuery && (
            <button
              className="category-tab-btn"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </button>
          )}
        </div>

        <div className="rules-categories">
          {categories.map((c) => (
            <button
              key={c.id}
              className={`category-tab-btn ${activeCategory === c.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: YOUR GOAL */}
      {matchesCategory('core') &&
        matchesSearch('goal health hero win draw 20') && (
          <article className="rule-card" id="rule-1">
            <div className="rule-card-header">
              <span className="rule-index-badge">01</span>
              <h2 className="rule-card-title">
                <Heart size={20} color="#f87171" />
                Your Goal
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                <strong>Mythic Arena</strong> is a tactical turn-based 1v1 card
                battle. Each player commands a Hero who begins the match with:
              </p>
              <ul>
                <li>
                  ❤️ <strong>20 Health</strong>
                </li>
                <li>
                  🃏 <strong>5 cards</strong> in opening hand
                </li>
                <li>
                  ⚡ <strong>0 Energy</strong> (increases on your first turn)
                </li>
                <li>
                  🛡️ <strong>No Shield</strong>
                </li>
                <li>
                  🏟️ <strong>An empty 5-slot battlefield</strong>
                </li>
              </ul>
              <div className="rule-alert success">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Primary Objective:</strong> Reduce your rival Hero to{' '}
                  <strong>0 Health</strong> before they defeat yours! If both
                  Heroes reach 0 Health in the exact same combat resolution, the
                  match results in a <strong>Draw</strong>.
                </div>
              </div>
            </div>
          </article>
        )}

      {/* SECTION 2: BUILD YOUR DECK */}
      {matchesCategory('core') &&
        matchesSearch('build deck 30 cards catalog copies shuffle') && (
          <article className="rule-card" id="rule-2">
            <div className="rule-card-header">
              <span className="rule-index-badge">02</span>
              <h2 className="rule-card-title">
                <Layers size={20} color="#818cf8" />
                Build Your Deck
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                Before entering the arena, prepare a battle-tested deck
                conforming to official tournament standards:
              </p>
              <ul>
                <li>
                  <strong>Exactly 30 cards</strong> — no more, no less.
                </li>
                <li>
                  <strong>Maximum 2 copies</strong> of any single card
                  definition.
                </li>
                <li>
                  <strong>Universal Catalog:</strong> Every player has full,
                  unrestricted access to all available cards. No paywalls or card
                  rarity locks.
                </li>
                <li>
                  <strong>Cross-faction freedom:</strong> Combine cards from
                  different traditions and mythical schools to forge your unique
                  synergy.
                </li>
                <li>
                  Decks are shuffled securely using seeded randomness when the
                  match initializes.
                </li>
              </ul>
              <div className="rule-alert info">
                <Sparkles size={18} />
                <div>
                  Head over to the{' '}
                  <Link
                    to="/decks"
                    style={{ color: '#f5c469', fontWeight: 600 }}
                  >
                    Deck Builder
                  </Link>{' '}
                  to assemble, customize, and save multiple deck profiles.
                </div>
              </div>
            </div>
          </article>
        )}

      {/* SECTION 3: YOUR CARDS */}
      {(matchesCategory('core') ||
        matchesCategory('combat') ||
        matchesCategory('spells')) &&
        matchesSearch(
          'cards unit spell marble warden sunlance keywords damage heal shield',
        ) && (
          <article className="rule-card" id="rule-3">
            <div className="rule-card-header">
              <span className="rule-index-badge">03</span>
              <h2 className="rule-card-title">
                <Sparkles size={20} color="#facc15" />
                Your Cards: Units & Spells
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                Every card in Mythic Arena falls into one of two fundamental
                categories:
              </p>

              <div className="comparison-grid">
                <div className="comparison-box guard">
                  <div className="comparison-header">
                    <Swords size={18} color="#818cf8" />
                    Unit Cards
                  </div>
                  <div className="comparison-tagline">
                    Summoned creatures that remain on the battlefield.
                  </div>
                  <p>A Unit possesses three core attributes:</p>
                  <ul>
                    <li>
                      ⚡ <strong>Energy Cost:</strong> Required energy to summon
                    </li>
                    <li>
                      ⚔️ <strong>Attack (ATK):</strong> Damage dealt in combat
                    </li>
                    <li>
                      ❤️ <strong>Health (HP):</strong> Damage required to defeat
                      it
                    </li>
                    <li>
                      Optional keywords: <strong>Guard</strong> or{' '}
                      <strong>Shield</strong>
                    </li>
                  </ul>
                  <div className="card-example-preview">
                    <div className="card-example-title">Marble Warden</div>
                    <div className="card-example-stats">
                      <span className="card-example-cost">⚡ 3 Cost</span>
                      <span className="card-example-atk">⚔️ 2 ATK</span>
                      <span className="card-example-hp">❤️ 5 HP</span>
                    </div>
                    <span className="card-example-keyword">🛡️ GUARD</span>
                  </div>
                </div>

                <div className="comparison-box shield">
                  <div className="comparison-header">
                    <Sparkles size={18} color="#facc15" />
                    Spell Cards
                  </div>
                  <div className="comparison-tagline">
                    Instant magical effects that go to discard immediately upon
                    cast.
                  </div>
                  <p>There are three spell archetypes:</p>
                  <ul>
                    <li>
                      💥 <strong>Damage Spells:</strong> Deals direct damage to
                      an enemy Hero or Unit (e.g., <em>Sunlance: 3 Energy, Deal 4 Damage</em>).
                    </li>
                    <li>
                      ❤️ <strong>Heal Spells:</strong> Restores health to your
                      Hero or a friendly Unit (cannot exceed initial max HP, cannot
                      revive).
                    </li>
                    <li>
                      🛡️ <strong>Shield Spells:</strong> Bestows a divine Shield
                      that absorbs the next positive damage instance.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </article>
        )}

      {/* SECTION 4: ENERGY */}
      {matchesCategory('core') &&
        matchesSearch('energy refill maximum turn cost 10') && (
          <article className="rule-card" id="rule-4">
            <div className="rule-card-header">
              <span className="rule-index-badge">04</span>
              <h2 className="rule-card-title">
                <Zap size={20} color="#facc15" />
                Energy: Gathering Your Power
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                Energy is your lifeblood resource used to summon Units and cast
                Spells.
              </p>
              <ul>
                <li>
                  At the beginning of your turn, your{' '}
                  <strong>Maximum Energy increases by +1</strong>, capped at 10.
                </li>
                <li>
                  Your current Energy is then{' '}
                  <strong>completely refilled</strong> to your new maximum.
                </li>
                <li>
                  Unspent energy does not carry over between turns (use it or lose
                  it).
                </li>
              </ul>
              <div className="combat-flow">
                <div className="flow-step">
                  <span>Turn 1:</span> <span className="flow-arrow">→</span>{' '}
                  <strong>1 Energy</strong>
                </div>
                <div className="flow-step">
                  <span>Turn 2:</span> <span className="flow-arrow">→</span>{' '}
                  <strong>2 Energy</strong>
                </div>
                <div className="flow-step">
                  <span>Turn 3:</span> <span className="flow-arrow">→</span>{' '}
                  <strong>3 Energy</strong>
                </div>
                <div className="flow-step">
                  <span>...</span>
                </div>
                <div className="flow-step">
                  <span>Turn 10+:</span> <span className="flow-arrow">→</span>{' '}
                  <strong>10 / 10 Maximum Energy Cap</strong>
                </div>
              </div>
              <p>
                <em>Example:</em> If you have 5/5 Energy and play a 3-cost card,
                you have 2 Energy remaining. When your next turn begins, you
                increase to 6 Maximum Energy and refill to 6/6!
              </p>
            </div>
          </article>
        )}

      {/* SECTION 5: STARTING THE BATTLE */}
      {matchesCategory('core') &&
        matchesSearch('start starting first player skip draw coin toss') && (
          <article className="rule-card" id="rule-5">
            <div className="rule-card-header">
              <span className="rule-index-badge">05</span>
              <h2 className="rule-card-title">
                <Swords size={20} color="#d4a359" />
                Starting the Battle & First Player Balance
              </h2>
            </div>
            <div className="rule-card-body">
              <p>When the arena gates open:</p>
              <ul>
                <li>Both players begin with 20 HP, 5 cards, and 0 Energy.</li>
                <li>The server randomly decides who takes the first turn.</li>
                <li>The First Player begins Turn 1 with 1 Energy.</li>
              </ul>
              <div className="rule-alert warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>First Turn Draw Skip:</strong> To maintain perfect
                  competitive balance, <strong>the first player does NOT draw a card on Turn 1</strong>.
                  From Turn 2 onwards (and for Player 2 starting on their first
                  turn), normal card draws occur at turn start.
                </div>
              </div>
            </div>
          </article>
        )}

      {/* SECTION 6: YOUR TURN */}
      {matchesCategory('core') &&
        matchesSearch('turn flow 30 seconds timer steps actions end') && (
          <article className="rule-card" id="rule-6">
            <div className="rule-card-header">
              <span className="rule-index-badge">06</span>
              <h2 className="rule-card-title">
                <Clock size={20} color="#38bdf8" />
                Your Turn Flow & 30-Second Timer
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                Each turn has a strict deadline of{' '}
                <strong>⏱️ 30 seconds</strong>. Watch the clock!
              </p>
              <ol>
                <li>
                  <strong>Start Phase (Automatic):</strong>
                  <ul>
                    <li>Max Energy +1 (up to 10) & refilled to full.</li>
                    <li>
                      Existing friendly Units wake up and become ready to
                      attack.
                    </li>
                    <li>
                      Draw 1 card from your deck (except First Player Turn 1).
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Action Phase:</strong> In any order you desire, you
                  may:
                  <ul>
                    <li>Summon Units into open board slots.</li>
                    <li>Cast damage, healing, or shield Spells.</li>
                    <li>Declare attacks with your ready Units.</li>
                  </ul>
                </li>
                <li>
                  <strong>End Phase:</strong> Press <strong>End Turn</strong> or
                  let the 30-second timer expire. Control immediately passes to
                  your opponent.
                </li>
              </ol>
            </div>
          </article>
        )}

      {/* SECTION 7: SUMMONING UNITS */}
      {matchesCategory('combat') &&
        matchesSearch('summon summoning slots 5 board') && (
          <article className="rule-card" id="rule-7">
            <div className="rule-card-header">
              <span className="rule-index-badge">07</span>
              <h2 className="rule-card-title">
                <Swords size={20} color="#4ade80" />
                Summoning Units (5-Slot Limit)
              </h2>
            </div>
            <div className="rule-card-body">
              <p>To summon a unit onto the battlefield:</p>
              <ol>
                <li>Select the Unit card in your hand.</li>
                <li>
                  Verify you have sufficient current Energy to pay its cost.
                </li>
                <li>
                  Ensure you have an empty board slot (each hero has{' '}
                  <strong>5 unit slots maximum</strong>).
                </li>
                <li>Place the card on the board.</li>
              </ol>
              <div className="rule-alert warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>Full Board Restriction:</strong> You cannot summon
                  another Unit if all five slots are occupied. You must wait
                  until a friendly unit falls in battle to free up a slot.
                </div>
              </div>
            </div>
          </article>
        )}

      {/* SECTION 8: SUMMONING SICKNESS */}
      {matchesCategory('combat') &&
        matchesSearch('newly summoned cannot attack wait turn sickness') && (
          <article className="rule-card" id="rule-8">
            <div className="rule-card-header">
              <span className="rule-index-badge">08</span>
              <h2 className="rule-card-title">
                <Clock size={20} color="#f59e0b" />
                Summoning Rest: Wait One Turn Before Attacking
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                Newly summoned Units arrive on the battlefield and must catch
                their breath. They <strong>cannot attack on the turn they enter play</strong>.
              </p>
              <div className="combat-flow">
                <div className="flow-step">
                  <span>Your Turn:</span> Summon <em>Aurora Wolf</em>{' '}
                  <span className="flow-arrow">→</span> Cannot attack yet (Sleeping)
                </div>
                <div className="flow-step">
                  <span>Opponent&apos;s Turn:</span> Enemy makes their moves...
                </div>
                <div className="flow-step">
                  <span>Your Next Turn:</span> <em>Aurora Wolf</em> wakes up{' '}
                  <span className="flow-arrow">→</span>{' '}
                  <strong style={{ color: '#4ade80' }}>Ready to attack!</strong>
                </div>
              </div>
              <p>
                Once ready, a Unit may attack <strong>once per personal turn</strong>.
              </p>
            </div>
          </article>
        )}

      {/* SECTION 9: ATTACKING */}
      {matchesCategory('combat') &&
        matchesSearch('attacking targets guard enemy hero legal') && (
          <article className="rule-card" id="rule-9">
            <div className="rule-card-header">
              <span className="rule-index-badge">09</span>
              <h2 className="rule-card-title">
                <Swords size={20} color="#ef4444" />
                Attacking & Targeting Rules
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                Select one of your ready Units, then choose an enemy target:
              </p>
              <ul>
                <li>Enemy Hero</li>
                <li>Enemy Unit</li>
              </ul>
              <div className="rule-alert warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>The Guard Rule:</strong> If your opponent controls one
                  or more Units with the <strong>🛡️ Guard</strong> keyword,{' '}
                  <strong>you MUST attack a Guard Unit first</strong>! You cannot
                  attack the enemy Hero or non-Guard units until all enemy Guard
                  units have been defeated.
                </div>
              </div>
              <p>
                <em>Note:</em> Guard belongs exclusively to Units. Heroes cannot
                gain Guard directly.
              </p>
            </div>
          </article>
        )}

      {/* SECTION 10: GUARD VS SHIELD */}
      {(matchesCategory('combat') || matchesCategory('keywords')) &&
        matchesSearch('guard vs shield keywords difference comparison') && (
          <article className="rule-card" id="rule-10">
            <div className="rule-card-header">
              <span className="rule-index-badge">10</span>
              <h2 className="rule-card-title">
                <Shield size={20} color="#facc15" />
                Guard vs. Shield: The Key Distinction
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                These two keywords do completely different things. Do not confuse
                them!
              </p>

              <div className="comparison-grid">
                <div className="comparison-box guard">
                  <div className="comparison-header">
                    <Shield size={18} color="#818cf8" />
                    🛡️ GUARD
                  </div>
                  <div className="comparison-tagline">&quot;Attack me first!&quot;</div>
                  <p>
                    <strong>Controls TARGETING.</strong>
                  </p>
                  <ul>
                    <li>
                      Forces enemy Units to target this Unit before attacking
                      other enemy targets or the Hero.
                    </li>
                    <li>Does NOT reduce incoming damage.</li>
                    <li>Does NOT block damage spells (spells ignore Guard).</li>
                    <li>Belongs strictly to Units.</li>
                  </ul>
                </div>

                <div className="comparison-box shield">
                  <div className="comparison-header">
                    <Sparkles size={18} color="#facc15" />
                    🔰 SHIELD
                  </div>
                  <div className="comparison-tagline">&quot;Block the next damage!&quot;</div>
                  <p>
                    <strong>Controls DAMAGE ABSORPTION.</strong>
                  </p>
                  <ul>
                    <li>
                      Completely absorbs the next positive damage instance, then
                      disappears.
                    </li>
                    <li>Does NOT force enemy targeting.</li>
                    <li>Non-stacking (only 1 Shield at a time).</li>
                    <li>Available to both Heroes and Units.</li>
                  </ul>
                </div>
              </div>
            </div>
          </article>
        )}

      {/* SECTION 11: SHIELD RULES */}
      {(matchesCategory('combat') || matchesCategory('keywords')) &&
        matchesSearch('shield rules non stacking zero positive damage') && (
          <article className="rule-card" id="rule-11">
            <div className="rule-card-header">
              <span className="rule-index-badge">11</span>
              <h2 className="rule-card-title">
                <Shield size={20} color="#38bdf8" />
                Shield Nuances & Rules
              </h2>
            </div>
            <div className="rule-card-body">
              <ul>
                <li>
                  <strong>Non-stacking:</strong> Applying a second Shield to a
                  character that already has a Shield refreshes it, but does not
                  create two layers.
                </li>
                <li>
                  <strong>Consumed on next positive damage:</strong> Whether the
                  incoming strike is 1 damage, 5 damage, or 20 damage, the
                  Shield absorbs the entire single hit and breaks.
                </li>
                <li>
                  <strong>Zero Damage Safe:</strong> If an attack or effect deals
                  0 damage, the Shield is NOT consumed.
                </li>
              </ul>
              <div className="combat-flow">
                <div>Hero: 15 / 20 HP with ACTIVE SHIELD</div>
                <div>Enemy casts 4-damage Sunlance...</div>
                <div style={{ color: '#4ade80', fontWeight: 600 }}>
                  Shield breaks → Hero absorbs 0 damage → Hero remains 15 / 20 HP!
                </div>
              </div>
            </div>
          </article>
        )}

      {/* SECTION 12: UNIT COMBAT */}
      {matchesCategory('combat') &&
        matchesSearch('unit combat simultaneous retaliation math example') && (
          <article className="rule-card" id="rule-12">
            <div className="rule-card-header">
              <span className="rule-index-badge">12</span>
              <h2 className="rule-card-title">
                <Swords size={20} color="#f87171" />
                Unit Combat: Simultaneous Damage
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                When a Unit attacks another Unit,{' '}
                <strong>both Units strike each other simultaneously!</strong>
              </p>

              <div className="combat-flow">
                <div className="flow-step">
                  <strong>Your Unit:</strong> 5 ATK / 4 HP ⚔️{' '}
                  <strong>Enemy Unit:</strong> 3 ATK / 2 HP
                </div>
                <div className="flow-step">
                  <span>Resolution:</span> Your unit deals 5 damage to Enemy.
                  Enemy deals 3 damage to Your unit.
                </div>
                <div className="flow-step">
                  <span>Enemy Unit:</span> 2 HP - 5 Damage = 0 HP{' '}
                  <span className="flow-arrow">→</span>{' '}
                  <strong style={{ color: '#ef4444' }}>Defeated!</strong>
                </div>
                <div className="flow-step">
                  <span>Your Unit:</span> 4 HP - 3 Damage = 1 HP{' '}
                  <span className="flow-arrow">→</span>{' '}
                  <strong style={{ color: '#4ade80' }}>
                    Survives with 1 HP!
                  </strong>
                </div>
              </div>

              {/* Interactive Combat Calculator */}
              <div
                style={{
                  background: 'rgba(14, 20, 32, 0.8)',
                  border: '1px solid rgba(212, 163, 89, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginTop: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 700,
                    color: '#f5c469',
                    marginBottom: '12px',
                  }}
                >
                  <RefreshCw size={16} />
                  Interactive Combat Simulator
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: '#94a3b8',
                      }}
                    >
                      Target Type:
                    </label>
                    <select
                      value={simTargetType}
                      onChange={(e) => setSimTargetType(e.target.value)}
                      style={{
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '4px 8px',
                      }}
                    >
                      <option value="unit">Enemy Unit</option>
                      <option value="hero">Enemy Hero (No Retaliation)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: '#94a3b8',
                      }}
                    >
                      Attacker ATK:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={simAttackerAtk}
                      onChange={(e) =>
                        setSimAttackerAtk(Number(e.target.value))
                      }
                      style={{
                        width: '60px',
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '4px 8px',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: '#94a3b8',
                      }}
                    >
                      Attacker HP:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={simAttackerHp}
                      onChange={(e) => setSimAttackerHp(Number(e.target.value))}
                      style={{
                        width: '60px',
                        background: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '4px 8px',
                      }}
                    />
                  </div>

                  {simTargetType === 'unit' && (
                    <>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '11px',
                            color: '#94a3b8',
                          }}
                        >
                          Defender ATK:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={simDefenderAtk}
                          onChange={(e) =>
                            setSimDefenderAtk(Number(e.target.value))
                          }
                          style={{
                            width: '60px',
                            background: '#1e293b',
                            color: '#f8fafc',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            padding: '4px 8px',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '11px',
                            color: '#94a3b8',
                          }}
                        >
                          Defender HP:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={simDefenderHp}
                          onChange={(e) =>
                            setSimDefenderHp(Number(e.target.value))
                          }
                          style={{
                            width: '60px',
                            background: '#1e293b',
                            color: '#f8fafc',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            padding: '4px 8px',
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.4)',
                  }}
                >
                  <strong>Result:</strong>{' '}
                  {simTargetType === 'hero' ? (
                    <span>
                      Enemy Hero takes <strong>{simAttackerAtk} damage</strong>{' '}
                      (Remaining: {defenderRemainingHp}/20 HP). Your unit takes{' '}
                      <strong>0 damage</strong> (Hero doesn&apos;t retaliate!).
                    </span>
                  ) : (
                    <span>
                      Enemy Unit takes {simAttackerAtk} damage (Remaining:{' '}
                      {defenderRemainingHp <= 0 ? '0 (Defeated)' : defenderRemainingHp}
                      ). Your Unit takes {simDefenderAtk} retaliation damage
                      (Remaining:{' '}
                      {attackerRemainingHp <= 0 ? '0 (Defeated)' : attackerRemainingHp}
                      ).
                    </span>
                  )}
                </div>
              </div>
            </div>
          </article>
        )}

      {/* SECTION 13: ATTACKING A HERO */}
      {matchesCategory('combat') &&
        matchesSearch('attacking hero retaliate retaliation') && (
          <article className="rule-card" id="rule-13">
            <div className="rule-card-header">
              <span className="rule-index-badge">13</span>
              <h2 className="rule-card-title">
                <Heart size={20} color="#f87171" />
                Attacking a Hero: No Retaliation
              </h2>
            </div>
            <div className="rule-card-body">
              <p>When one of your Units attacks the enemy Hero directly:</p>
              <ul>
                <li>The Hero takes damage equal to the Unit&apos;s Attack.</li>
                <li>
                  <strong>Heroes do NOT retaliate!</strong> Your attacking Unit
                  takes 0 counter damage when striking a Hero.
                </li>
              </ul>
              <div className="rule-alert info">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Key Takeaway:</strong> Fighting enemy Units incurs
                  mutual damage, but striking the rival Hero is completely free
                  of counter-damage!
                </div>
              </div>
            </div>
          </article>
        )}

      {/* SECTION 14: CASTING DAMAGE SPELLS */}
      {matchesCategory('spells') &&
        matchesSearch('casting damage spells guard ignore bypass') && (
          <article className="rule-card" id="rule-14">
            <div className="rule-card-header">
              <span className="rule-index-badge">14</span>
              <h2 className="rule-card-title">
                <Flame size={20} color="#f97316" />
                Damage Spells: Bypassing Guard
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                Damage spells target either an enemy Hero or an enemy Unit (e.g.{' '}
                <em>Winter Spark: 2 Energy, 3 Damage</em>).
              </p>
              <div className="rule-alert success">
                <Sparkles size={18} />
                <div>
                  <strong>Crucial Tactical Exception:</strong>{' '}
                  <strong>Guard does NOT affect spell targeting!</strong> Even if
                  your opponent has a powerful Guard unit on the board, you can
                  still cast a damage spell directly onto their Hero or another
                  vulnerable unit. Guard only restricts physical unit attacks.
                </div>
              </div>
            </div>
          </article>
        )}

      {/* SECTION 15: HEALING */}
      {matchesCategory('spells') &&
        matchesSearch('healing maximum revive defeated health') && (
          <article className="rule-card" id="rule-15">
            <div className="rule-card-header">
              <span className="rule-index-badge">15</span>
              <h2 className="rule-card-title">
                <Heart size={20} color="#4ade80" />
                Healing Rules & Restrictions
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                Healing spells (such as <em>Hearthsong: Heal 4</em>) restore
                health to your Hero or friendly Units.
              </p>
              <ul>
                <li>
                  <strong>Maximum Health Cap:</strong> Healing can never exceed
                  a target&apos;s initial maximum health (20 for Heroes, printed HP
                  for Units).
                </li>
                <li>
                  <strong>No Resurrections:</strong> Defeated Units are removed
                  to the discard pile and cannot be revived by healing spells.
                </li>
              </ul>
            </div>
          </article>
        )}

      {/* SECTION 16: HAND LIMIT */}
      {matchesCategory('systems') &&
        matchesSearch('hand limit 10 cards overflow discard burn') && (
          <article className="rule-card" id="rule-16">
            <div className="rule-card-header">
              <span className="rule-index-badge">16</span>
              <h2 className="rule-card-title">
                <Layers size={20} color="#a855f7" />
                Hand Limit: Maximum 10 Cards
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                Your hand can hold a maximum of <strong>🃏 10 cards</strong>.
              </p>
              <p>
                If you already have 10 cards in your hand and attempt to draw
                another card, the drawn card is{' '}
                <strong>immediately discarded (burned)</strong> without entering
                your hand. Manage your hand size wisely!
              </p>
            </div>
          </article>
        )}

      {/* SECTION 17: EMPTY DECK & FATIGUE */}
      {matchesCategory('systems') &&
        matchesSearch('empty deck fatigue escalating damage') && (
          <article className="rule-card" id="rule-17">
            <div className="rule-card-header">
              <span className="rule-index-badge">17</span>
              <h2 className="rule-card-title">
                <AlertTriangle size={20} color="#ef4444" />
                Empty Deck & Escalating Fatigue
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                If you must draw a card but your 30-card deck has run out, you
                suffer <strong>Fatigue Damage</strong> directly to your Hero:
              </p>
              <div className="combat-flow">
                <div>1st empty draw: 1 damage</div>
                <div>2nd empty draw: 2 damage</div>
                <div>3rd empty draw: 3 damage</div>
                <div>4th empty draw: 4 damage... escalating indefinitely!</div>
              </div>
              <p>
                <em>Pro Tip:</em> Fatigue counts as a standard damage instance,
                meaning an active <strong>Shield</strong> on your Hero will
                absorb a fatigue hit!
              </p>
            </div>
          </article>
        )}

      {/* SECTION 18-20: WINNING, DRAWS, SURRENDER */}
      {matchesCategory('systems') &&
        matchesSearch('winning draws surrender turn 100 limit') && (
          <article className="rule-card" id="rule-18">
            <div className="rule-card-header">
              <span className="rule-index-badge">18–20</span>
              <h2 className="rule-card-title">
                <Trophy size={20} color="#f5c469" />
                Victory, Draws & Surrender
              </h2>
            </div>
            <div className="rule-card-body">
              <ul>
                <li>
                  <strong>Victory:</strong> When an enemy Hero&apos;s health reaches
                  0 or below, you instantly win the match!
                </li>
                <li>
                  <strong>Draw Conditions:</strong>
                  <ul>
                    <li>
                      Both Heroes reach 0 HP during the exact same damage
                      resolution.
                    </li>
                    <li>
                      The battle reaches the <strong>Turn 100 cutoff</strong>{' '}
                      without a decisive victor.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Surrender:</strong> You may concede at any time using
                  the Surrender action on the board. The opponent is immediately
                  awarded the victory.
                </li>
              </ul>
            </div>
          </article>
        )}

      {/* SECTION 21: PRACTICE MODE */}
      {matchesCategory('systems') &&
        matchesSearch('practice mode bot apprentice ai safe') && (
          <article className="rule-card" id="rule-21">
            <div className="rule-card-header">
              <span className="rule-index-badge">21</span>
              <h2 className="rule-card-title">
                <Bot size={20} color="#38bdf8" />
                Practice Mode: The Safe Training Grounds
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                In Practice Mode, you face off against the{' '}
                <strong>🤖 Arena Apprentice</strong> AI bot.
              </p>
              <ul>
                <li>
                  Operates under the exact same deterministic rules as live
                  online battles.
                </li>
                <li>
                  <strong>Zero rank risk:</strong> Practice games do not affect
                  your account&apos;s wins leaderboard.
                </li>
                <li>
                  Ideal for testing new deck synergies, learning keyword
                  timings, and mastering turn management.
                </li>
              </ul>
              <Link to="/practice" className="rules-action-btn primary" style={{ marginTop: '10px' }}>
                <Bot size={16} /> Enter Practice Arena Now
              </Link>
            </div>
          </article>
        )}

      {/* SECTION 22: ONLINE MATCHES */}
      {matchesCategory('systems') &&
        matchesSearch('online matchmaking lobby ready check 10 seconds') && (
          <article className="rule-card" id="rule-22">
            <div className="rule-card-header">
              <span className="rule-index-badge">22</span>
              <h2 className="rule-card-title">
                <Wifi size={20} color="#4ade80" />
                Online Matchmaking & 10s Ready Check
              </h2>
            </div>
            <div className="rule-card-body">
              <div className="combat-flow">
                <div>1. Select an eligible 30-card deck in the Lobby.</div>
                <div>2. Click &quot;Find Match&quot; to enter the matchmaking queue.</div>
                <div>3. Match found! Both duelists enter a 10-second Ready Check.</div>
                <div>4. Both confirm ready → Match portals open and duel begins!</div>
              </div>
              <p>
                If a player fails to ready up within 10 seconds, the match is
                aborted cleanly without any penalty or leaderboard record.
              </p>
            </div>
          </article>
        )}

      {/* SECTION 23: DISCONNECTS */}
      {matchesCategory('systems') &&
        matchesSearch('disconnect reconnect 30 seconds forfeit') && (
          <article className="rule-card" id="rule-23">
            <div className="rule-card-header">
              <span className="rule-index-badge">23</span>
              <h2 className="rule-card-title">
                <Clock size={20} color="#f59e0b" />
                Disconnects & 30-Second Grace Window
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                If an unexpected network drop occurs during an active online
                match:
              </p>
              <ul>
                <li>
                  The server grants a <strong>⏱️ 30-second reconnect grace period</strong>.
                </li>
                <li>
                  <strong>Turns do NOT pause:</strong> The game continues in the
                  background so active opponents are never stalled.
                </li>
                <li>
                  Reconnecting within the window automatically synchronizes the
                  latest match state.
                </li>
                <li>
                  If the disconnected player fails to return before the 30s
                  timer expires, they automatically forfeit.
                </li>
                <li>
                  If both players are offline when the deadline resolves, the
                  match is aborted without leaderboard credit.
                </li>
              </ul>
            </div>
          </article>
        )}

      {/* SECTION 24: MATCH HISTORY & LEADERBOARD */}
      {matchesCategory('systems') &&
        matchesSearch('match history leaderboard hall of legends ranked') && (
          <article className="rule-card" id="rule-24">
            <div className="rule-card-header">
              <span className="rule-index-badge">24</span>
              <h2 className="rule-card-title">
                <Trophy size={20} color="#d4a359" />
                Match History & Hall of Legends
              </h2>
            </div>
            <div className="rule-card-body">
              <p>
                All completed online duels are permanently recorded on your
                account:
              </p>
              <ul>
                <li>
                  📜{' '}
                  <Link to="/history" style={{ color: '#f5c469', fontWeight: 600 }}>
                    Match History:
                  </Link>{' '}
                  Review your past duels, deck names, turn counts, and outcomes.
                </li>
                <li>
                  🏆{' '}
                  <Link to="/leaderboard" style={{ color: '#f5c469', fontWeight: 600 }}>
                    Leaderboard:
                  </Link>{' '}
                  Earn wins from completed online matches to climb the Hall of
                  Legends.
                </li>
                <li>
                  <em>Note:</em> Practice games, aborted matches, and draws do
                  not grant leaderboard win points.
                </li>
              </ul>
            </div>
          </article>
        )}

      {/* SECTION 25: QUICK EXAMPLE BATTLE */}
      {(matchesCategory('all') || matchesCategory('walkthrough')) &&
        matchesSearch('example battle walkthrough turn 1 2 3 victory wolf warden') && (
          <article className="rule-card" id="rule-25">
            <div className="rule-card-header">
              <span className="rule-index-badge">25</span>
              <h2 className="rule-card-title">
                <BookOpen size={20} color="#f5c469" />
                Quick Example Battle (Step-by-Step)
              </h2>
            </div>
            <div className="rule-card-body">
              <p>Here is an illustrative walkthrough of how an actual duel unfolds:</p>

              <div className="combat-flow">
                <div style={{ color: '#f5c469', fontWeight: 700 }}>
                  TURN 1 (You have 1 Energy)
                </div>
                <div className="flow-step">
                  <span>You summon:</span> <strong>Aurora Wolf</strong> (1 Energy, 2 ATK / 1 HP).
                </div>
                <div className="flow-step">
                  <em>Aurora Wolf arrives sleeping and cannot attack yet. Opponent takes their turn.</em>
                </div>

                <div style={{ color: '#f5c469', fontWeight: 700, marginTop: '12px' }}>
                  TURN 2 (You have 2/2 Energy)
                </div>
                <div className="flow-step">
                  <span>Aurora Wolf is now READY to strike!</span>
                </div>
                <div className="flow-step">
                  <span>You declare an attack on Enemy Hero:</span> Enemy Hero 20 HP - 2 ATK ={' '}
                  <strong style={{ color: '#f87171' }}>18 HP remaining</strong>!
                </div>

                <div style={{ color: '#f5c469', fontWeight: 700, marginTop: '12px' }}>
                  OPPONENT&apos;S TURN 2
                </div>
                <div className="flow-step">
                  <span>Opponent plays:</span> <strong>Marble Warden</strong> (3 Energy, 2 ATK / 5 HP, 🛡️ GUARD).
                </div>

                <div style={{ color: '#f5c469', fontWeight: 700, marginTop: '12px' }}>
                  TURN 3 (Guard Restricts Targeting!)
                </div>
                <div className="flow-step">
                  <span>You can no longer hit Enemy Hero directly:</span> Marble Warden&apos;s Guard forces all unit attacks onto it!
                </div>
                <div className="flow-step">
                  <span>Once the Guard unit is destroyed:</span> Enemy Hero is once again vulnerable to direct strikes.
                </div>

                <div style={{ color: '#4ade80', fontWeight: 700, marginTop: '12px' }}>
                  FINAL STRIKE
                </div>
                <div className="flow-step">
                  <span>Enemy Hero is down to 3 HP:</span> You attack with a 5 ATK unit → Hero HP drops to 0 →{' '}
                  <strong style={{ color: '#f5c469' }}>🏆 VICTORY!</strong>
                </div>
              </div>
            </div>
          </article>
        )}

      {/* SECTION 26: THE 13 GOLDEN RULES */}
      {(matchesCategory('all') || matchesCategory('golden')) &&
        matchesSearch('golden rules summary checklist') && (
          <section className="golden-rules-section" id="golden-rules">
            <div className="golden-rules-header">
              <h2>⚔️ The 13 Golden Rules</h2>
              <p>Remember these fundamental laws and you are ready for any battle in the arena.</p>
            </div>

            <div className="golden-rules-grid">
              <div className="golden-rule-item">
                <span className="golden-rule-num">1</span>
                <div className="golden-rule-text">
                  <strong>Reduce Enemy Hero to 0 HP:</strong> That is your primary path to victory.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">2</span>
                <div className="golden-rule-text">
                  <strong>30-Card Decks:</strong> Exactly 30 cards, maximum 2 copies of any single card.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">3</span>
                <div className="golden-rule-text">
                  <strong>Energy Progression:</strong> Energy increases by +1 each turn up to a maximum of 10.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">4</span>
                <div className="golden-rule-text">
                  <strong>30-Second Turn Clock:</strong> Plan and execute your moves before the timer runs out.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">5</span>
                <div className="golden-rule-text">
                  <strong>5-Slot Board Limit:</strong> You can command a maximum of 5 Units on your side simultaneously.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">6</span>
                <div className="golden-rule-text">
                  <strong>Summoning Rest:</strong> Newly summoned units cannot attack until your next turn.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">7</span>
                <div className="golden-rule-text">
                  <strong>Guard Forces Attacks:</strong> Enemy Guard units must be attacked before other targets.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">8</span>
                <div className="golden-rule-text">
                  <strong>Shield Absorbs 1 Hit:</strong> Blocks the next positive damage instance completely.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">9</span>
                <div className="golden-rule-text">
                  <strong>Spells Ignore Guard:</strong> Guard only restricts unit attacks; spells can target freely.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">10</span>
                <div className="golden-rule-text">
                  <strong>Healing Restrictions:</strong> Cannot exceed initial max HP, and cannot revive defeated units.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">11</span>
                <div className="golden-rule-text">
                  <strong>10-Card Hand Limit:</strong> Cards drawn when your hand is full are burned to discard.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">12</span>
                <div className="golden-rule-text">
                  <strong>Fatigue Escalates:</strong> Drawing from an empty deck inflicts 1, 2, 3... escalating damage.
                </div>
              </div>

              <div className="golden-rule-item">
                <span className="golden-rule-num">13</span>
                <div className="golden-rule-text">
                  <strong>Practice is Risk-Free:</strong> Test strategies against the AI bot without risking your rank!
                </div>
              </div>
            </div>
          </section>
        )}
    </div>
  );
}
