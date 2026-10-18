'use client';

import React, { useEffect, useRef, useState, useId } from 'react';

/**
 * HZSITDLoaderLogo — The exact official animated logo from the homepage intro & loader.
 * 
 * Features:
 * - DOSIT wordmark with animated Wi-Fi wave pulses
 * - Rotating golden gear (16s cycle) & counter-rotating sun rays (12s cycle)
 * - Real-time green concentric radio wave pulse
 * - Dynamic binary digit stream inside blue globe band
 * - 3D tilted orbit ring with metallic electron ball that orbits in front and behind
 * - Optional alternating English ("Hossana Zone Science...") / Amharic ("ሆሳዕና ዞን ሳይንስና...") typography
 */

interface HZSITDLoaderLogoProps {
  height?: number | string;
  className?: string;
  showText?: boolean;
}

// Fixed geometry constants from intro.js
const GX = 547, GY = 405, GR = 265;
const rad = (d: number) => (d * Math.PI) / 180;
const globePt = (r: number, deg: number): [number, number] => [
  GX + r * Math.cos(rad(deg)),
  GY + r * Math.sin(rad(deg)),
];

const A_T = -105, A_U = 63;
const T = globePt(GR, A_T);
const U = globePt(GR, A_U);

const R = 255, TOOTH_H = 28;
const SUN_DX = 23, SUN_DY = -23;

const mx = (T[0] + U[0]) / 2;
const my = (T[1] + U[1]) / 2;
const dx = U[0] - T[0];
const dy = U[1] - T[1];
const len = Math.hypot(dx, dy);
const px = dy / len;
const py = -dx / len;
const s = (577 - mx) * px + (375 - my) * py;
const CX = mx + px * s;
const CY = my + py * s;

const fmt = (p: [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;

function splinePath(pts: [number, number][]) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p0 = i > 0 ? pts[i - 1] : ([2 * p1[0] - p2[0], 2 * p1[1] - p2[1]] as [number, number]);
    const p3 = i < n - 2 ? pts[i + 2] : ([2 * p2[0] - p1[0], 2 * p2[1] - p1[1]] as [number, number]);
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${fmt(c1)} ${fmt(c2)} ${fmt(p2)} `;
  }
  return d;
}

const C1pts: [number, number][] = [
  T,
  [459.5, 200],
  [471, 252],
  [507, 305],
  [560, 355],
  [619, 391],
  [673, 412],
  [716, 436],
  [742, 480],
  [747, 523],
  [737, 566],
  [710, 606],
  U,
];

const C2pts: [number, number][] = [
  T,
  [421.8, 204],
  [391.7, 255],
  [386.5, 302],
  [405, 345],
  [443, 386],
  [488, 420],
  [538, 450],
  [590, 480],
  [630, 511],
  [665, 555],
  [682, 602],
  U,
];

const C1 = splinePath(C1pts);
const C2fwd = splinePath(C2pts);
const C2rev = splinePath([...C2pts].reverse());
const OUTER = `A${GR} ${GR} 0 1 1 ${fmt(T)}`;

const blueD = `M${fmt(T)} ${C1} ${C2rev}Z`;
const greenD = `M${fmt(T)} ${C2fwd} ${OUTER} Z`;
const outlineOuterD = `M${fmt(U)} ${OUTER}`;
const outlineC1D = `M${fmt(T)} ${C1}`;
const outlineC2D = `M${fmt(T)} ${C2fwd}`;

const topPt = globePt(420, A_T);
const botPt = globePt(420, A_U);
const gearClipPathD = `M${fmt(topPt)} L${fmt(T)} ${C1} L${fmt(botPt)} L1100 800 L1100 -100 L${topPt[0].toFixed(2)} -100 Z`;

// Gear teeth path
const rootR = R;
const tipR = R + TOOTH_H;
const teeth = 12;
const pitch = rad(360 / teeth);
const baseHalf = rad(10.5);
const tipHalf = rad(8);
const firstAngle = rad(-101);
const pt = (r: number, a: number) => `${(CX + r * Math.cos(a)).toFixed(2)} ${(CY + r * Math.sin(a)).toFixed(2)}`;
let gearPathD = `M${pt(rootR, firstAngle - baseHalf)} `;
for (let i = 0; i < teeth; i++) {
  const a = firstAngle + i * pitch;
  gearPathD += `L${pt(tipR, a - tipHalf)} A${tipR} ${tipR} 0 0 1 ${pt(tipR, a + tipHalf)} L${pt(rootR, a + baseHalf)} A${rootR} ${rootR} 0 0 1 ${pt(rootR, a + pitch - baseHalf)} `;
}
gearPathD += 'Z';

// Sun rays path
const sunCx = CX + SUN_DX;
const sunCy = CY + SUN_DY;
const spikes = 12;
const sunTipR = 118;
const sunBaseR = 72;
const halfAngle = Math.PI / spikes / 2;
const sunPt = (r: number, a: number) => `${(sunCx + r * Math.cos(a)).toFixed(2)} ${(sunCy + r * Math.sin(a)).toFixed(2)}`;
let sunPathD = '';
for (let i = 0; i < spikes; i++) {
  const a = (i * 2 * Math.PI) / spikes - Math.PI / 2;
  sunPathD += `${i ? 'L' : 'M'}${sunPt(sunBaseR, a - halfAngle)} L${sunPt(sunTipR, a)} L${sunPt(sunBaseR, a + halfAngle)} `;
}
sunPathD += 'Z';

// Orbit ring
const ORB = { cx: 594.6, cy: 389.8, a: 454.3, b: 148.7, rot: -0.526, egg: 0.06 };
const THK = { base: 11.66, left: 22.13, leftK: 6.56, right: 14.1, rightK: 10.52, rightAt: 0.076, near: 2.41 };
const TAU = Math.PI * 2;
const ORB_COS = Math.cos(ORB.rot);
const ORB_SIN = Math.sin(ORB.rot);

function ringPoint(t: number): [number, number] {
  const u = ORB.a * Math.cos(t);
  const v = ORB.b * Math.sin(t) * (1 + ORB.egg * Math.cos(t));
  return [ORB.cx + ORB_COS * u - ORB_SIN * v, ORB.cy + ORB_SIN * u + ORB_COS * v];
}

function ringWidth(t: number) {
  return (
    THK.base +
    THK.left * Math.exp(THK.leftK * (Math.cos(t - Math.PI) - 1)) +
    THK.right * Math.exp(THK.rightK * (Math.cos(t - THK.rightAt) - 1)) +
    THK.near * Math.sin(t)
  );
}

const RN = 1440;
const RH = RN / 2;
const ringT = (i: number) => (TAU * i) / RN;

function ringEdges(i: number): [[number, number], [number, number]] {
  const t = ringT(i);
  const e = 1e-4;
  const p = ringPoint(t);
  const a = ringPoint(t - e);
  const b = ringPoint(t + e);
  const tx = b[0] - a[0];
  const ty = b[1] - a[1];
  const len = Math.hypot(tx, ty) || 1;
  const h = ringWidth(t) / 2;
  const nxx = -ty / len;
  const nyy = tx / len;
  return [
    [p[0] + nxx * h, p[1] + nyy * h],
    [p[0] - nxx * h, p[1] - nyy * h],
  ];
}

function ringPath(i0: number, i1: number) {
  const outer: [number, number][] = [];
  const inner: [number, number][] = [];
  for (let i = i0; i <= i1; i++) {
    const e = ringEdges(i);
    outer.push(e[0]);
    inner.push(e[1]);
  }
  return 'M' + outer.map(fmt).join(' L') + ' L' + inner.reverse().map(fmt).join(' L') + ' Z';
}

const OVERLAP = 3;
const ringFrontD = ringPath(-OVERLAP, RH + OVERLAP);
const ringBackD = ringPath(RH - OVERLAP, RN + OVERLAP);

// Arc-length table for constant-speed electron ball
const ringCum: number[] = [0];
let prevRingPt = ringPoint(0);
for (let i = 1; i <= RN; i++) {
  const q = ringPoint(ringT(i));
  ringCum.push(ringCum[i - 1] + Math.hypot(q[0] - prevRingPt[0], q[1] - prevRingPt[1]));
  prevRingPt = q;
}
const RING_LEN = ringCum[RN];
const PERIOD = 6500;

// Precomputed binary matrix rows
const INITIAL_BINARY_ROWS = [
  { y: 236, x0: 440, text: '10100110' },
  { y: 282, x0: 410, text: '0110100110' },
  { y: 328, x0: 420, text: '1100101011' },
  { y: 374, x0: 460, text: '01011010' },
  { y: 420, x0: 510, text: '100101' },
  { y: 466, x0: 560, text: '0110' },
];

export const HZSITDLoaderLogo: React.FC<HZSITDLoaderLogoProps> = ({
  height = 92,
  className = '',
  showText = false,
}) => {
  const uniqueId = useId().replace(/:/g, '_');
  const ballRef = useRef<SVGGElement | null>(null);
  const frontLayerRef = useRef<SVGGElement | null>(null);
  const backLayerRef = useRef<SVGGElement | null>(null);
  const wavesGroupRef = useRef<SVGGElement | null>(null);
  const digitsGroupRef = useRef<SVGGElement | null>(null);

  const [activeLang, setActiveLang] = useState<'en' | 'am'>('en');

  // Wave colors and animation
  const WAVE_CX = 300, WAVE_CY = 700, WAVE_STEP = 57, WAVE_RINGS = 14;
  const WAVE_STEP_MS = 750;
  const waveCols = ['#c4e80a', '#a6dc00', '#8ed100', '#6cbf00', '#47a700', '#3b9a08', '#2e8c12', '#8ed100'];

  // Language cycle (if showText is true)
  useEffect(() => {
    if (!showText) return;
    const interval = setInterval(() => {
      setActiveLang((prev) => (prev === 'en' ? 'am' : 'en'));
    }, 4000);
    return () => clearInterval(interval);
  }, [showText]);

  // Main SVG animation frame loop (ball, waves, binary flicker)
  useEffect(() => {
    let animId: number;
    let lastGlitch = 0;

    // Create wave circles once
    if (wavesGroupRef.current && wavesGroupRef.current.children.length === 0) {
      for (let j = WAVE_RINGS - 1; j >= 0; j--) {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', String(WAVE_CX));
        c.setAttribute('cy', String(WAVE_CY));
        wavesGroupRef.current.appendChild(c);
      }
    }

    const frame = (now: number) => {
      // 1. Electron ball orbit
      if (ballRef.current && frontLayerRef.current && backLayerRef.current) {
        const d = ((now / PERIOD) % 1) * RING_LEN;
        let lo = 0;
        let hi = RN;
        while (hi - lo > 1) {
          const m = (lo + hi) >> 1;
          if (ringCum[m] <= d) lo = m;
          else hi = m;
        }
        const k = (d - ringCum[lo]) / ((ringCum[lo + 1] - ringCum[lo]) || 1);
        const t = ringT(lo + k);
        const pos = ringPoint(t);
        const depth = Math.sin(t);
        const scaleVal = 1 + 0.1 * depth;
        ballRef.current.setAttribute(
          'transform',
          `translate(${pos[0].toFixed(2)} ${pos[1].toFixed(2)}) scale(${scaleVal.toFixed(3)})`
        );
        const targetLayer = depth >= 0 ? frontLayerRef.current : backLayerRef.current;
        if (ballRef.current.parentNode !== targetLayer) {
          targetLayer.appendChild(ballRef.current);
        }
      }

      // 2. Green wave pulses
      if (wavesGroupRef.current) {
        const p = now / WAVE_STEP_MS;
        const n = Math.floor(p);
        const f = p - n;
        const lenCols = waveCols.length;
        const circles = wavesGroupRef.current.children;
        for (let j = 0; j < circles.length; j++) {
          const idx = (((j - 1 - n) % lenCols) + lenCols) % lenCols;
          circles[j].setAttribute('r', ((j + f) * WAVE_STEP).toFixed(2));
          circles[j].setAttribute('fill', waveCols[idx]);
        }
      }

      // 3. Binary digits random flicker
      if (digitsGroupRef.current && now - lastGlitch > 100) {
        lastGlitch = now;
        const textNodes = digitsGroupRef.current.querySelectorAll('text');
        textNodes.forEach((node) => {
          if (Math.random() < 0.1) {
            node.textContent = Math.random() < 0.5 ? '0' : '1';
          }
        });
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <svg
        viewBox="0 0 1024 703"
        style={{ height, width: 'auto' }}
        className="block flex-shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <linearGradient id={`gearGrad_${uniqueId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#bb8a12" />
            <stop offset="1" stopColor="#ac7c10" />
          </linearGradient>

          <linearGradient id={`blueGrad_${uniqueId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2178d8" />
            <stop offset="1" stopColor="#1769c6" />
          </linearGradient>

          <radialGradient id={`ballGrad_${uniqueId}`} cx="0.36" cy="0.32" r="0.8">
            <stop offset="0" stopColor="#505050" />
            <stop offset="0.4" stopColor="#171717" />
            <stop offset="1" stopColor="#000000" />
          </radialGradient>

          <clipPath id={`blueClip_${uniqueId}`}>
            <path d={blueD} />
          </clipPath>

          <clipPath id={`greenClip_${uniqueId}`}>
            <path d={greenD} />
          </clipPath>

          <clipPath id={`gearClip_${uniqueId}`}>
            <path d={gearClipPathD} />
          </clipPath>
        </defs>

        {/* DOSIT Wordmark Typography */}
        <g fill="#0e9be6">
          <path fillRule="evenodd" d="M5 62 H58 A52 51.5 0 0 1 58 165 H5 Z M30 87 V140 H58 A27 26.5 0 0 0 58 87 Z" />
          <path
            fillRule="evenodd"
            d="M117 113.5 a52 52 0 1 0 104 0 a52 52 0 1 0 -104 0 Z M145 113.5 a24 26 0 1 0 48 0 a24 26 0 1 0 -48 0 Z"
          />
          <path
            d="M318 74.5 H258 A19.5 19.5 0 0 0 258 113.5 H292 A19.5 19.5 0 0 1 292 152.5 H232"
            fill="none"
            stroke="#0e9be6"
            strokeWidth="25"
          />
          <rect x="330" y="78" width="26" height="87" />
          <circle cx="343" cy="51" r="11.5" />

          {/* Wi-Fi Pulse Radiations on the letter 'I' */}
          <g fill="none" stroke="#0e9be6" strokeWidth="6" strokeLinecap="round">
            {[21, 33, 45].map((r, i) => {
              const k = r * 0.7071;
              return (
                <path
                  key={r}
                  d={`M${(343 - k).toFixed(2)} ${(51 - k).toFixed(2)} A${r} ${r} 0 0 1 ${(343 + k).toFixed(2)} ${(51 - k).toFixed(2)}`}
                >
                  <animate
                    attributeName="opacity"
                    values="0.2;1;0.2"
                    dur="1.6s"
                    begin={`${i * 0.25}s`}
                    repeatCount="indefinite"
                  />
                </path>
              );
            })}
          </g>

          <path d="M365 62 H478 L462 88 H434 V165 H409 V88 H381 Z" />
        </g>

        {/* Orbit Ring (Back Half) */}
        <path d={ringBackD} fill="#0d0d0d" stroke="#0d0d0d" strokeWidth=".5" strokeLinejoin="round" />
        <g ref={backLayerRef} />

        {/* Gear and Sun Group (Clipped by inner contour) */}
        <g clipPath={`url(#gearClip_${uniqueId})`}>
          {/* Rotating Gear */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${CX.toFixed(2)} ${CY.toFixed(2)}`}
              to={`360 ${CX.toFixed(2)} ${CY.toFixed(2)}`}
              dur="16s"
              repeatCount="indefinite"
            />
            <path d={gearPathD} fill={`url(#gearGrad_${uniqueId})`} />
          </g>

          <circle cx={CX.toFixed(2)} cy={CY.toFixed(2)} r="205" fill="#ffffff" />

          {/* Rotating Sun */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${sunCx.toFixed(2)} ${sunCy.toFixed(2)}`}
              to={`-360 ${sunCx.toFixed(2)} ${sunCy.toFixed(2)}`}
              dur="12s"
              repeatCount="indefinite"
            />
            <path d={sunPathD} fill="#ff9d0a" />
          </g>
        </g>

        {/* Blue Globe Band with Dynamic Binary Stream */}
        <path d={blueD} fill={`url(#blueGrad_${uniqueId})`} />
        <g clipPath={`url(#blueClip_${uniqueId})`}>
          <g
            ref={digitsGroupRef}
            fontFamily="'Arial Black', Arial, Helvetica, sans-serif"
            fontWeight="900"
            fontSize="38"
            fill="#ffffff"
            textAnchor="middle"
          >
            {INITIAL_BINARY_ROWS.map((row, rIdx) => (
              <g key={rIdx}>
                {row.text.split('').map((char, cIdx) => (
                  <text key={cIdx} x={row.x0 + cIdx * 32} y={row.y} dy=".36em">
                    {char}
                  </text>
                ))}
              </g>
            ))}
          </g>
        </g>

        {/* Green Field with Concentric Pulse Waves */}
        <path d={greenD} fill="#8ed100" />
        <g clipPath={`url(#greenClip_${uniqueId})`}>
          <g ref={wavesGroupRef} />
        </g>

        {/* Structural Contours */}
        <g fill="none" stroke="#111111" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
          <path d={outlineOuterD} />
          <path d={outlineC1D} />
          <path d={outlineC2D} />
        </g>

        {/* Orbit Ring (Front Half) */}
        <path d={ringFrontD} fill="#0d0d0d" stroke="#0d0d0d" strokeWidth=".5" strokeLinejoin="round" />
        <g ref={frontLayerRef}>
          {/* Electron Ball (dynamically swapped between front & back layer) */}
          <g ref={ballRef}>
            <circle r="46" fill={`url(#ballGrad_${uniqueId})`} />
            <path
              d="M-31 -13 A33 33 0 0 1 -10 -31"
              fill="none"
              stroke="#ffffff"
              strokeOpacity=".8"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>

      {/* Persistent Brand Typography matching the Homepage Header & Loader */}
      {showText && (
        <div className="relative min-h-[2.7em] flex-shrink-0 select-none">
          {/* English Group */}
          <div
            className={`flex flex-col justify-center transition-all duration-1000 ${
              activeLang === 'en'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2 pointer-events-none absolute inset-0'
            }`}
          >
            <div className="overflow-hidden leading-snug">
              <span
                style={{ fontFamily: "'Elegant', Georgia, serif", fontSize: '13.5px' }}
                className="block text-slate-900 font-normal whitespace-nowrap tracking-wide"
              >
                Hadiya Zone Science
              </span>
            </div>
            <div className="overflow-hidden leading-snug mt-0.5">
              <span
                style={{ fontFamily: "'Elegant', Georgia, serif", fontSize: '13.5px' }}
                className="block text-slate-900 font-normal whitespace-nowrap tracking-wide"
              >
                and Information Technology Dept
              </span>
            </div>
          </div>

          {/* Amharic Group */}
          <div
            className={`flex flex-col justify-center transition-all duration-1000 ${
              activeLang === 'am'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2 pointer-events-none absolute inset-0'
            }`}
          >
            <div className="overflow-hidden leading-snug">
              <span
                style={{ fontFamily: "'LogaDisplay', Nyala, sans-serif", fontSize: '13.5px' }}
                className="block text-slate-900 font-normal whitespace-nowrap tracking-normal"
              >
                ሃዲያ ዞን ሳይንስና
              </span>
            </div>
            <div className="overflow-hidden leading-snug mt-0.5">
              <span
                style={{ fontFamily: "'LogaDisplay', Nyala, sans-serif", fontSize: '13.5px' }}
                className="block text-slate-900 font-normal whitespace-nowrap tracking-normal"
              >
                ኢንፎርሜሽን ቴክኖሎጂ መምሪያ
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
