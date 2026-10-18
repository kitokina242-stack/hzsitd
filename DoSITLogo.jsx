import React, { useState } from 'react';

/**
 * DoSITLogo - Scalable Vector Logo Component for Hadiya Zone Science & IT Department
 * 
 * @param {Object} props
 * @param {boolean} [props.animated=true] - Toggle all animations
 * @param {number} [props.speed=1] - Speed multiplier (1 = normal, 2 = fast, 0.5 = slow)
 * @param {string} [props.className='w-full max-w-md h-auto'] - Tailwind / CSS classes
 * @param {boolean} [props.showGear=true] - Toggle gear rotation
 * @param {boolean} [props.showSun=true] - Toggle sun flaring
 * @param {boolean} [props.showBinary=true] - Toggle binary data stream
 * @param {boolean} [props.showLeaf=true] - Toggle leaf breathing motion
 * @param {boolean} [props.showOrbit=true] - Toggle electron orbital loop
 * @param {boolean} [props.showWifi=true] - Toggle Wi-Fi broadcast waves
 */
export function DoSITLogo({
  animated = true,
  speed = 1,
  className = "w-full max-w-md h-auto",
  showGear = true,
  showSun = true,
  showBinary = true,
  showLeaf = true,
  showOrbit = true,
  showWifi = true,
  ...rest
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Dynamic animation speeds
  const gearDuration = `${24 / speed}s`;
  const sunDuration = `${3.2 / speed}s`;
  const binaryDuration = `${4 / speed}s`;
  const leafDuration = `${6 / speed}s`;
  const orbitDuration = `${6 / speed}s`;
  const wifiDuration = `${1.8 / speed}s`;

  return (
    <svg
      viewBox="0 0 560 440"
      className={`select-none transition-transform duration-300 ${isHovered ? 'scale-[1.02]' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Hadiya Zone Science and Information Technology Department Logo"
      {...rest}
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="reactCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00BAF2" />
          <stop offset="100%" stopColor="#0084C9" />
        </linearGradient>

        <linearGradient id="reactGear" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E5B562" />
          <stop offset="50%" stopColor="#CCA047" />
          <stop offset="100%" stopColor="#B28532" />
        </linearGradient>

        <radialGradient id="reactSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFA834" />
          <stop offset="70%" stopColor="#F57C00" />
          <stop offset="100%" stopColor="#D86000" />
        </radialGradient>

        <linearGradient id="reactBinary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E5DA3" />
          <stop offset="100%" stopColor="#0F3868" />
        </linearGradient>

        <linearGradient id="reactLeafDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E7A2E" />
          <stop offset="100%" stopColor="#114C1C" />
        </linearGradient>

        <linearGradient id="reactLeafMid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4CAF50" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>

        <linearGradient id="reactLeafLime" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C0CA33" />
          <stop offset="50%" stopColor="#9CCC65" />
          <stop offset="100%" stopColor="#7CB342" />
        </linearGradient>

        <clipPath id="reactCoreClip">
          <circle cx="330" cy="210" r="78" />
        </clipPath>

        <filter id="reactGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00BAF2" floodOpacity="0.4" />
        </filter>

        <style>{`
          @keyframes rSpinGear { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes rPulseSun { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
          @keyframes rLeafBreathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02) rotate(-0.5deg); } }
          @keyframes rBinaryFlow { 0% { transform: translateY(0); } 100% { transform: translateY(-40px); } }
          @keyframes rWifi1 { 0%, 100% { opacity: 0.2; } 20%, 60% { opacity: 1; } }
          @keyframes rWifi2 { 0%, 15% { opacity: 0.2; } 35%, 75% { opacity: 1; } 100% { opacity: 0.2; } }
          @keyframes rWifi3 { 0%, 30% { opacity: 0.2; } 50%, 90% { opacity: 1; } 100% { opacity: 0.2; } }
          @keyframes rOrbit {
            0% { offset-distance: 0%; transform: scale(0.85); }
            25% { offset-distance: 25%; transform: scale(1.2); }
            50% { offset-distance: 50%; transform: scale(1); }
            75% { offset-distance: 75%; transform: scale(0.75); }
            100% { offset-distance: 100%; transform: scale(0.85); }
          }
        `}</style>
      </defs>

      {/* Typography: DoSIT */}
      <g fill="url(#reactCyan)" filter="url(#reactGlow)">
        {/* D */}
        <path d="M 22 25 L 22 90 L 54 90 C 76 90 92 76 92 57.5 C 92 39 76 25 54 25 Z M 36 38 L 51 38 C 66 38 76 46 76 57.5 C 76 69 66 77 51 77 L 36 77 Z" />
        {/* O */}
        <path d="M 124 25 C 103 25 90 39 90 57.5 C 90 76 103 90 124 90 C 145 90 158 76 158 57.5 C 158 39 145 25 124 25 Z M 124 38 C 137 38 143 46.5 143 57.5 C 143 68.5 137 77 124 77 C 111 77 105 68.5 105 57.5 C 105 46.5 111 38 124 38 Z" />
        {/* S */}
        <path d="M 206 38 C 201 30 192 25 181 25 C 168 25 159 32 159 42 C 159 51 168 56 182 60 L 187 61 C 203 66 212 72 212 83 C 212 95 199 101 183 101 C 170 101 159 96 151 86 L 161 76 C 167 83 175 87 183 87 C 192 87 198 83 198 77 C 198 70 191 66 178 62 L 173 60 C 157 55 147 49 147 38 C 147 26 159 15 180 15 C 192 15 202 20 210 28 Z" />
        {/* i & Wifi */}
        <g>
          <rect x="226" y="44" width="13" height="46" rx="2" />
          <circle cx="232.5" cy="33" r="3.5" />
          <path d="M 223 25 A 11 11 0 0 1 242 25" fill="none" stroke="#00BAF2" strokeWidth="3" strokeLinecap="round" 
                style={{ animation: animated && showWifi ? `rWifi1 ${wifiDuration} infinite` : 'none' }} />
          <path d="M 217 17 A 18 18 0 0 1 248 17" fill="none" stroke="#00BAF2" strokeWidth="3.2" strokeLinecap="round" 
                style={{ animation: animated && showWifi ? `rWifi2 ${wifiDuration} infinite` : 'none' }} />
          <path d="M 211 9 A 25 25 0 0 1 254 9" fill="none" stroke="#00BAF2" strokeWidth="3.5" strokeLinecap="round" 
                style={{ animation: animated && showWifi ? `rWifi3 ${wifiDuration} infinite` : 'none' }} />
        </g>
        {/* T */}
        <path d="M 260 35 L 260 47 L 275 47 L 275 90 L 289 90 L 289 47 L 304 47 L 310 35 Z" />
      </g>

      {/* Industrial Cog Wheel */}
      <g
        style={{
          transformOrigin: '330px 210px',
          animation: animated && showGear ? `rSpinGear ${gearDuration} linear infinite` : 'none'
        }}
      >
        <path d="
          M 330 85
          L 343 85 L 346 98 L 360 102 L 370 93 L 382 99 L 379 113 L 391 121 L 404 116 L 411 126 L 402 137 L 410 150 L 425 151 L 428 164 L 416 172 L 420 186 L 435 191 L 434 205 L 419 209 L 415 223 L 426 233 L 420 245 L 406 244 L 398 256 L 405 269 L 395 278 L 382 272 L 370 281 L 372 296 L 360 300 L 350 290 L 336 293 L 332 308 L 319 308 L 315 293 L 301 290 L 291 300 L 279 296 L 281 281 L 269 272 L 256 278 L 246 269 L 253 256 L 245 244 L 231 245 L 225 233 L 236 223 L 232 209 L 217 205 L 216 191 L 231 186 L 235 172 L 223 164 L 226 151 L 241 150 L 249 137 L 240 126 L 247 116 L 260 121 L 272 113 L 269 99 L 281 93 L 291 102 L 305 98 L 308 85 Z
        " fill="url(#reactGear)" stroke="#7A4E0E" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="330" cy="210" r="80" fill="none" stroke="#7A4E0E" strokeWidth="3" />
      </g>

      {/* Inner Portal: Rising Sun & Binary */}
      <g clipPath="url(#reactCoreClip)">
        <rect x="230" y="110" width="200" height="200" fill="url(#reactBinary)" />
        
        {/* Sun */}
        <g style={{
          transformOrigin: '340px 190px',
          animation: animated && showSun ? `rPulseSun ${sunDuration} ease-in-out infinite` : 'none'
        }}>
          <circle cx="340" cy="190" r="34" fill="url(#reactSun)" stroke="#D86000" strokeWidth="1.5" />
          <g fill="#FFA834" stroke="#D86000" strokeWidth="1">
            <polygon points="340,144 335,157 345,157" />
            <polygon points="365,150 354,161 362,167" />
            <polygon points="380,171 366,177 372,185" />
            <polygon points="384,195 369,197 371,206" />
            <polygon points="315,150 318,161 326,161" />
            <polygon points="300,171 308,177 314,171" />
          </g>
        </g>

        {/* Binary stream */}
        <g
          fontFamily="monospace"
          fontWeight="bold"
          fontSize="22"
          fill="#FFFFFF"
          opacity="0.95"
          letterSpacing="4"
          style={{
            animation: animated && showBinary ? `rBinaryFlow ${binaryDuration} linear infinite` : 'none'
          }}
        >
          <text x="260" y="165">1 0 0</text>
          <text x="272" y="200">0 1 0 1</text>
          <text x="256" y="235">1 0 0 1</text>
          <text x="268" y="270">0 1 1 0</text>
          <text x="260" y="305">1 0 0</text>
          <text x="272" y="340">0 1 0 1</text>
        </g>
      </g>

      {/* Layered Green Leaf */}
      <g
        style={{
          transformOrigin: '270px 260px',
          animation: animated && showLeaf ? `rLeafBreathe ${leafDuration} ease-in-out infinite` : 'none'
        }}
      >
        <path d="
          M 262 78
          C 225 118 188 180 188 245
          C 188 310 226 355 295 385
          C 273 358 258 320 258 280
          C 258 208 295 165 342 140
          C 300 120 275 100 262 78 Z
        " fill="url(#reactLeafDark)" stroke="#0E3D17" strokeWidth="2.5" />

        <path d="
          M 262 78
          C 220 142 198 205 198 258
          C 198 322 250 372 310 388
          C 283 358 263 315 263 270
          C 263 198 305 152 342 140
          C 305 120 278 100 262 78 Z
        " fill="url(#reactLeafMid)" stroke="#165B23" strokeWidth="1.8" />

        <path d="
          M 262 78
          C 235 142 215 210 220 268
          C 225 328 268 372 328 390
          C 300 362 284 325 284 285
          C 284 222 316 178 342 140
          C 305 118 280 96 262 78 Z
        " fill="url(#reactLeafLime)" stroke="#4A7513" strokeWidth="1.5" />
      </g>

      {/* Atomic Orbit & Electron */}
      <g>
        <path d="M 145 315 C 95 380 65 345 120 280 C 185 195 330 100 455 85 C 525 75 555 120 490 195 C 405 290 230 395 145 315 Z" 
              fill="none" stroke="#0F172A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 145 315 C 95 380 65 345 120 280 C 185 195 330 100 455 85 C 525 75 555 120 490 195 C 405 290 230 395 145 315 Z" 
              fill="none" stroke="#38BDF8" strokeWidth="1.2" opacity="0.4" />
        
        <circle
          r="14"
          fill="#0B132B"
          stroke="#38BDF8"
          strokeWidth="2.5"
          style={{
            offsetPath: 'path("M 145 315 C 95 380 65 345 120 280 C 185 195 330 100 455 85 C 525 75 555 120 490 195 C 405 290 230 395 145 315 Z")',
            animation: animated && showOrbit ? `rOrbit ${orbitDuration} linear infinite` : 'none'
          }}
        />
      </g>
    </svg>
  );
}

export default DoSITLogo;
