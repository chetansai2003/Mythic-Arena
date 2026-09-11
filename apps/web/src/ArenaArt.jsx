// Original SVG/CSS scenery: accessible HTML owns every interaction.
export default function ArenaArt() {
  return (
    <div className="arena-art" aria-hidden="true">
      <div className="arena-halo" />
      <svg viewBox="0 0 660 520" fill="none">
        <defs>
          <linearGradient
            id="stone"
            x1="100"
            y1="240"
            x2="460"
            y2="440"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#535266" />
            <stop offset=".45" stopColor="#242b3b" />
            <stop offset="1" stopColor="#111827" />
          </linearGradient>
          <linearGradient
            id="floor"
            x1="150"
            y1="160"
            x2="500"
            y2="370"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#56516b" />
            <stop offset="1" stopColor="#1c2335" />
          </linearGradient>
          <linearGradient
            id="gold"
            x1="100"
            y1="150"
            x2="540"
            y2="340"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fde0a0" />
            <stop offset="1" stopColor="#9c7445" />
          </linearGradient>
          <radialGradient id="portal">
            <stop stopColor="#e8caff" stopOpacity=".45" />
            <stop offset="1" stopColor="#a47aee" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="floating-arena">
          <ellipse
            cx="330"
            cy="262"
            rx="238"
            ry="133"
            stroke="#9875cd"
            strokeOpacity=".18"
          />
          <ellipse
            cx="330"
            cy="262"
            rx="213"
            ry="118"
            stroke="#bea06b"
            strokeOpacity=".26"
            strokeDasharray="3 16"
          />
          <path
            d="m145 296 51 104 47-19 48 92 62-51 53 20 49-104-118-73Z"
            fill="url(#stone)"
            stroke="#64617c"
            strokeOpacity=".35"
          />
          <path
            d="m196 310 28 67 19 4 20 49 28 43 9-137m69-6-16 92m80-94-27 114"
            stroke="#9290ac"
            strokeOpacity=".19"
          />
          <path
            d="m121 262 65-73 143-43 145 43 65 73-65 73-145 44-143-44Z"
            fill="url(#stone)"
            stroke="#716283"
          />
          <path
            d="m121 247 65-73 143-43 145 43 65 73-65 73-145 44-143-44Z"
            fill="url(#floor)"
            stroke="url(#gold)"
            strokeWidth="2"
          />
          <path
            d="m157 247 54-53 118-36 119 36 54 53-54 54-119 34-118-34Z"
            stroke="#b29a76"
            strokeOpacity=".55"
          />
          <ellipse
            cx="329"
            cy="247"
            rx="133"
            ry="72"
            stroke="#c2a579"
            strokeOpacity=".5"
          />
          <ellipse
            cx="329"
            cy="247"
            rx="102"
            ry="54"
            stroke="#b297d5"
            strokeOpacity=".5"
          />
          <path
            d="m329 207 48 40-48 40-48-40Z"
            stroke="#e0c099"
            strokeWidth="2"
          />
          <path
            d="m329 222 28 25-28 25-28-25Z"
            fill="#b192d8"
            fillOpacity=".2"
            stroke="#ccb3ef"
          />
          {[
            { x: 186, y: 174 },
            { x: 474, y: 174 },
            { x: 145, y: 270 },
            { x: 513, y: 270 },
          ].map(({ x, y }, i) => (
            <g key={i}>
              <path
                d={`m${x - 14} ${y + 14} 14 8 14-8v-81l-14-8-14 8Z`}
                fill="url(#stone)"
                stroke="#b19b77"
                strokeOpacity=".7"
              />
              <path
                d={`m${x} ${y + 21}v-88m-14 0 14 8 14-8`}
                stroke="#d3b58b"
                strokeOpacity=".65"
              />
              <path d={`m${x - 9} ${y - 82} 9-17 9 17-9 12Z`} fill="#d7b3fc" />
              <ellipse cx={x} cy={y - 82} rx="34" ry="38" fill="url(#portal)" />
            </g>
          ))}
          <ellipse cx="329" cy="210" rx="84" ry="104" fill="url(#portal)" />
          <ellipse
            cx="329"
            cy="194"
            rx="49"
            ry="77"
            stroke="#cfb6ef"
            strokeWidth="2"
            strokeOpacity=".7"
          />
          <ellipse
            cx="329"
            cy="194"
            rx="57"
            ry="88"
            stroke="#b995e2"
            strokeOpacity=".3"
            strokeDasharray="4 9"
          />
          <path
            d="m329 153 13 31-13 31-13-31Z"
            fill="#f1d3ff"
            fillOpacity=".7"
          />
        </g>
        <g fill="#e7c584">
          <circle cx="99" cy="131" r="2" />
          <circle cx="563" cy="173" r="2" />
          <circle cx="420" cy="75" r="2" />
          <circle cx="205" cy="91" r="1.5" />
          <circle cx="558" cy="358" r="1.5" />
        </g>
      </svg>
      <span className="art-caption">
        THE CELESTIAL ARENA <span> / </span> CONCEPT 001
      </span>
    </div>
  );
}
