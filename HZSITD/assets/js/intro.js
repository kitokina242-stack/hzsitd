;(function () {
  'use strict';

  /* ===================================================================
   * HZSITD — Intro Loader Animation
   * ===================================================================
   *
   *  1. SVG Path Generation  (gear, globe, sun, orbit, digits, waves)
   *  2. SVG Frame Loop        (requestAnimationFrame for live elements)
   *  3. Intro Timeline        (logo → English → Amharic → smooth exit)
   *
   * Timings are intentionally slow and elegant (lenis.dev aesthetic).
   * =================================================================== */

  const _el  = (id) => document.getElementById(id);
  const NS   = 'http://www.w3.org/2000/svg';
  const rand = (n) => Math.floor(Math.random() * n);
  const rad  = (d) => d * Math.PI / 180;
  const fmt  = (p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2);

  /* ==================================================================
   * 1. SVG PATH GENERATION
   * ================================================================== */

  // ---- globe circle ----
  const GX = 547, GY = 405, GR = 265;
  const globePt = (r, deg) => [GX + r * Math.cos(rad(deg)), GY + r * Math.sin(rad(deg))];

  const A_T = -105, A_U = 63;
  const T = globePt(GR, A_T), U = globePt(GR, A_U);

  // ---- gear circle ----
  const R = 255, TOOTH_H = 28;
  const SUN_DX = 23, SUN_DY = -23;
  const [CX, CY] = (function () {
    const mx = (T[0] + U[0]) / 2, my = (T[1] + U[1]) / 2;
    const dx = U[0] - T[0], dy = U[1] - T[1], len = Math.hypot(dx, dy);
    const px = dy / len, py = -dx / len;
    const s = (577 - mx) * px + (375 - my) * py;
    return [mx + px * s, my + py * s];
  })();

  var prefixes = [''];
  if (_el('m-intro-svg')) {
    prefixes.push('m-');
  }

  prefixes.forEach(function (pfx) {
    var gs = _el(pfx + 'gearSpin');
    if (gs) {
      gs.setAttribute('from', '0 ' + CX.toFixed(2) + ' ' + CY.toFixed(2));
      gs.setAttribute('to',  '360 ' + CX.toFixed(2) + ' ' + CY.toFixed(2));
    }
    var ss = _el(pfx + 'sunSpin');
    if (ss) {
      ss.setAttribute('from', '0 ' + (CX + SUN_DX).toFixed(2) + ' ' + (CY + SUN_DY).toFixed(2));
      ss.setAttribute('to',  '-360 ' + (CX + SUN_DX).toFixed(2) + ' ' + (CY + SUN_DY).toFixed(2));
    }
    var gh = _el(pfx + 'gearHole');
    if (gh) {
      gh.setAttribute('cx', CX.toFixed(2));
      gh.setAttribute('cy', CY.toFixed(2));
    }
  });

  // ---- Catmull-Rom spline ----
  function splinePath(pts) {
    var n = pts.length, d = '';
    for (var i = 0; i < n - 1; i++) {
      var p1 = pts[i], p2 = pts[i + 1];
      var p0 = i > 0 ? pts[i - 1] : [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
      var p3 = i < n - 2 ? pts[i + 2] : [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += 'C' + fmt(c1) + ' ' + fmt(c2) + ' ' + fmt(p2) + ' ';
    }
    return d;
  }

  // ---- globe band curves ----
  var C1pts = [T,[459.5,200],[471,252],[507,305],[560,355],[619,391],[673,412],[716,436],[742,480],[747,523],[737,566],[710,606],U];
  var C2pts = [T,[421.8,204],[391.7,255],[386.5,302],[405,345],[443,386],[488,420],[538,450],[590,480],[630,511],[665,555],[682,602],U];

  var C1 = splinePath(C1pts);
  var C2fwd = splinePath(C2pts);
  var C2rev = splinePath(C2pts.slice().reverse());
  var OUTER = 'A' + GR + ' ' + GR + ' 0 1 1 ' + fmt(T);

  var blueD  = 'M' + fmt(T) + ' ' + C1 + ' ' + C2rev + 'Z';
  var greenD = 'M' + fmt(T) + ' ' + C2fwd + ' ' + OUTER + ' Z';

  document.querySelectorAll('.blueD, .m-blueD').forEach(function (p) { p.setAttribute('d', blueD); });
  document.querySelectorAll('.greenD, .m-greenD').forEach(function (p) { p.setAttribute('d', greenD); });

  prefixes.forEach(function (pfx) {
    var oo = _el(pfx + 'outlineOuter');
    if (oo) oo.setAttribute('d', 'M' + fmt(U) + ' ' + OUTER);
    var oc1 = _el(pfx + 'outlineC1');
    if (oc1) oc1.setAttribute('d', 'M' + fmt(T) + ' ' + C1);
    var oc2 = _el(pfx + 'outlineC2');
    if (oc2) oc2.setAttribute('d', 'M' + fmt(T) + ' ' + C2fwd);

    var top = globePt(420, A_T), bot = globePt(420, A_U);
    var gcp = _el(pfx + 'gearClipPath');
    if (gcp) {
      gcp.setAttribute('d',
        'M' + fmt(top) + ' L' + fmt(T) + ' ' + C1 + ' L' + fmt(bot) +
        ' L1100 800 L1100 -100 L' + top[0].toFixed(2) + ' -100 Z');
    }

    var gp = _el(pfx + 'gearPath');
    if (gp) {
      var rootR = R, tipR = R + TOOTH_H, teeth = 12;
      var pitch = rad(360 / teeth), baseHalf = rad(10.5), tipHalf = rad(8);
      var first = rad(-101);
      var pt = function (r, a) { return (CX + r * Math.cos(a)).toFixed(2) + ' ' + (CY + r * Math.sin(a)).toFixed(2); };
      var gd = 'M' + pt(rootR, first - baseHalf) + ' ';
      for (var i = 0; i < teeth; i++) {
        var a = first + i * pitch;
        gd += 'L' + pt(tipR, a - tipHalf) +
              ' A' + tipR + ' ' + tipR + ' 0 0 1 ' + pt(tipR, a + tipHalf) +
              ' L' + pt(rootR, a + baseHalf) +
              ' A' + rootR + ' ' + rootR + ' 0 0 1 ' + pt(rootR, a + pitch - baseHalf) + ' ';
      }
      gp.setAttribute('d', gd + 'Z');
    }

    var sp = _el(pfx + 'sunPath');
    if (sp) {
      var scx = CX + SUN_DX, scy = CY + SUN_DY, spikes = 12, stipR = 118, sbaseR = 72;
      var shalf = (Math.PI / spikes) / 2;
      var spt = function (r, a) { return (scx + r * Math.cos(a)).toFixed(2) + ' ' + (scy + r * Math.sin(a)).toFixed(2); };
      var sd = '';
      for (var si = 0; si < spikes; si++) {
        var sa = si * 2 * Math.PI / spikes - Math.PI / 2;
        sd += (si ? 'L' : 'M') + spt(sbaseR, sa - shalf) + ' L' + spt(stipR, sa) + ' L' + spt(sbaseR, sa + shalf) + ' ';
      }
      sp.setAttribute('d', sd + 'Z');
    }

    var wifi = _el(pfx + 'wifi');
    if (wifi) {
      var cx = 343, cy = 51;
      [21, 33, 45].forEach(function (r, i) {
        var k = r * 0.7071;
        var p = document.createElementNS(NS, 'path');
        p.setAttribute('d', 'M' + (cx - k).toFixed(2) + ' ' + (cy - k).toFixed(2) +
          ' A' + r + ' ' + r + ' 0 0 1 ' + (cx + k).toFixed(2) + ' ' + (cy - k).toFixed(2));
        var an = document.createElementNS(NS, 'animate');
        an.setAttribute('attributeName', 'opacity');
        an.setAttribute('values', '0.2;1;0.2');
        an.setAttribute('dur', '1.6s');
        an.setAttribute('begin', (i * 0.25) + 's');
        an.setAttribute('repeatCount', 'indefinite');
        p.appendChild(an);
        wifi.appendChild(p);
      });
    }
  });

  // ---- green waves ----
  var WAVE_CX = 300, WAVE_CY = 700, WAVE_STEP = 57, WAVE_RINGS = 14;
  var WAVE_STEP_MS = 750;
  var waveCols = ['#c4e80a','#a6dc00','#8ed100','#6cbf00','#47a700','#3b9a08','#2e8c12','#8ed100'];
  var waveCirclesMap = {};
  prefixes.forEach(function (pfx) {
    var wContainer = _el(pfx + 'waves');
    if (!wContainer) return;
    waveCirclesMap[pfx] = [];
    for (var j = WAVE_RINGS - 1; j >= 0; j--) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', WAVE_CX);
      c.setAttribute('cy', WAVE_CY);
      wContainer.appendChild(c);
      waveCirclesMap[pfx][j] = c;
    }
  });
  function updateWaves(now) {
    var p = now / WAVE_STEP_MS, n = Math.floor(p), f = p - n, len = waveCols.length;
    prefixes.forEach(function (pfx) {
      var circles = waveCirclesMap[pfx];
      if (!circles) return;
      for (var j = 0; j < WAVE_RINGS; j++) {
        if (circles[j]) {
          var idx = (((j - 1 - n) % len) + len) % len;
          circles[j].setAttribute('r', ((j + f) * WAVE_STEP).toFixed(2));
          circles[j].setAttribute('fill', waveCols[idx]);
        }
      }
    });
  }
  updateWaves(0);

  // ---- binary digits ----
  var DIGIT_ROW_STEP = 46, COL_GAP = 32, DIGIT_HALF_W = 16, DIGIT_HALF_H = 16;
  var bluePoly = (function () {
    var path = document.querySelector('.blueD');
    var total = path.getTotalLength(), n = 900, pts = [];
    for (var i = 0; i < n; i++) {
      var p = path.getPointAtLength(total * i / n);
      pts.push([p.x, p.y]);
    }
    return pts;
  })();
  function insideBlue(x, y) {
    var inside = false;
    for (var i = 0, j = bluePoly.length - 1; i < bluePoly.length; j = i++) {
      var xi = bluePoly[i][0], yi = bluePoly[i][1], xj = bluePoly[j][0], yj = bluePoly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function digitFits(cx, cy) {
    var w = DIGIT_HALF_W, h = DIGIT_HALF_H;
    return insideBlue(cx, cy) &&
           insideBlue(cx - w, cy - h) && insideBlue(cx + w, cy - h) &&
           insideBlue(cx - w, cy + h) && insideBlue(cx + w, cy + h) &&
           insideBlue(cx - w, cy) && insideBlue(cx + w, cy) &&
           insideBlue(cx, cy - h) && insideBlue(cx, cy + h);
  }
  var rowDefs = (function () {
    var defs = [];
    for (var y = 190; y <= 640; y += DIGIT_ROW_STEP) {
      var best = null, start = null, prev = null;
      for (var x = 340; x <= 800; x += 2) {
        if (digitFits(x, y)) { if (start === null) start = x; prev = x; }
        else if (start !== null) { if (!best || prev - start > best[1] - best[0]) best = [start, prev]; start = null; }
      }
      if (start !== null && (!best || prev - start > best[1] - best[0])) best = [start, prev];
      if (!best) continue;
      var span = best[1] - best[0], count = Math.floor(span / COL_GAP) + 1;
      var x0 = best[0] + (span - (count - 1) * COL_GAP) / 2;
      var s = '';
      for (var i = 0; i < count; i++) s += Math.random() < 0.5 ? '0' : '1';
      defs.push({ y: y, x0: x0, s: s });
    }
    return defs;
  })();
  var rows = [], cells = [];
  prefixes.forEach(function (pfx) {
    var digitsEl = _el(pfx + 'digits');
    if (!digitsEl) return;
    rowDefs.forEach(function (def) {
      var g = document.createElementNS(NS, 'g');
      var row = { g: g, cells: [], hold: 0 };
      def.s.split('').forEach(function (ch, i) {
        var t = document.createElementNS(NS, 'text');
        t.setAttribute('x', (def.x0 + i * COL_GAP).toFixed(2));
        t.setAttribute('y', def.y);
        t.setAttribute('dy', '.36em');
        t.textContent = ch;
        g.appendChild(t);
        var c = { el: t, hold: 0 };
        row.cells.push(c);
        cells.push(c);
      });
      digitsEl.appendChild(g);
      rows.push(row);
    });
  });

  var colors = ['#ffffff','#ffffff','#ffffff','#9fe4ff','#d6f3ff'];
  function resetCell(c) { c.el.removeAttribute('transform'); c.el.setAttribute('fill','#ffffff'); c.el.setAttribute('opacity','1'); }
  var lastTick = 0;
  function glitchTick(now) {
    if (now - lastTick > 70) {
      lastTick = now;
      cells.forEach(function (c) {
        if (c.hold > 0) { c.hold--; if (c.hold === 0) resetCell(c); return; }
        if (Math.random() < 0.05) {
          c.el.textContent = Math.random() < 0.5 ? '0' : '1';
          if (Math.random() < 0.5) {
            c.el.setAttribute('transform', 'translate(' + (rand(8) - 4) + ' ' + (rand(5) - 2) + ')');
            c.el.setAttribute('fill', colors[rand(colors.length)]);
            c.el.setAttribute('opacity', (0.25 + Math.random() * 0.75).toFixed(2));
            c.hold = 1 + rand(3);
          }
        }
      });
      rows.forEach(function (r) {
        if (r.hold > 0) { r.hold--; if (r.hold === 0) r.g.removeAttribute('transform'); return; }
        if (Math.random() < 0.035) {
          r.g.setAttribute('transform', 'translate(' + (rand(9) - 4) + ' 0)');
          r.hold = 1 + rand(2);
        }
      });
    }
  }

  // ---- orbit ring ----
  var ORB = { cx: 594.6, cy: 389.8, a: 454.3, b: 148.7, rot: -0.526, egg: 0.06 };
  var THK = { base: 11.66, left: 22.13, leftK: 6.56, right: 14.1, rightK: 10.52, rightAt: 0.076, near: 2.41 };
  var TAU = Math.PI * 2;
  var ORB_COS = Math.cos(ORB.rot), ORB_SIN = Math.sin(ORB.rot);

  function ringPoint(t) {
    var u = ORB.a * Math.cos(t), v = ORB.b * Math.sin(t) * (1 + ORB.egg * Math.cos(t));
    return [ORB.cx + ORB_COS * u - ORB_SIN * v, ORB.cy + ORB_SIN * u + ORB_COS * v];
  }
  function ringWidth(t) {
    return THK.base
      + THK.left * Math.exp(THK.leftK * (Math.cos(t - Math.PI) - 1))
      + THK.right * Math.exp(THK.rightK * (Math.cos(t - THK.rightAt) - 1))
      + THK.near * Math.sin(t);
  }
  var RN = 1440, RH = RN / 2;
  var ringT = function (i) { return TAU * i / RN; };
  function ringEdges(i) {
    var t = ringT(i), e = 1e-4;
    var p = ringPoint(t), a = ringPoint(t - e), b = ringPoint(t + e);
    var tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1;
    var h = ringWidth(t) / 2, nx = -ty / len, ny = tx / len;
    return [[p[0] + nx * h, p[1] + ny * h], [p[0] - nx * h, p[1] - ny * h]];
  }
  function ringPath(i0, i1) {
    var outer = [], inner = [];
    for (var i = i0; i <= i1; i++) { var e = ringEdges(i); outer.push(e[0]); inner.push(e[1]); }
    return 'M' + outer.map(fmt).join(' L') + ' L' + inner.reverse().map(fmt).join(' L') + ' Z';
  }
  var OVERLAP = 3;
  prefixes.forEach(function (pfx) {
    var rf = _el(pfx + 'ringFront');
    if (rf) rf.setAttribute('d', ringPath(-OVERLAP, RH + OVERLAP));
    var rb = _el(pfx + 'ringBack');
    if (rb) rb.setAttribute('d', ringPath(RH - OVERLAP, RN + OVERLAP));
  });

  // arc-length table for constant-speed ball
  var ringCum = [0], prevPt = ringPoint(0);
  for (var i = 1; i <= RN; i++) {
    var q = ringPoint(ringT(i));
    ringCum.push(ringCum[i - 1] + Math.hypot(q[0] - prevPt[0], q[1] - prevPt[1]));
    prevPt = q;
  }
  var RING_LEN = ringCum[RN];

  // ---- ball orbit ----
  var ballMap = {}, frontMap = {}, backMap = {};
  prefixes.forEach(function (pfx) {
    ballMap[pfx] = _el(pfx + 'ball');
    frontMap[pfx] = _el(pfx + 'frontLayer');
    backMap[pfx] = _el(pfx + 'backLayer');
  });

  var PERIOD = 6500;
  function placeBall(now) {
    var d = ((now / PERIOD) % 1) * RING_LEN;
    var lo = 0, hi = RN;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (ringCum[m] <= d) lo = m; else hi = m; }
    var k = (d - ringCum[lo]) / ((ringCum[lo + 1] - ringCum[lo]) || 1);
    var t = ringT(lo + k), pos = ringPoint(t);
    var depth = Math.sin(t), s = 1 + 0.1 * depth;
    prefixes.forEach(function (pfx) {
      var ball = ballMap[pfx], frontLayer = frontMap[pfx], backLayer = backMap[pfx];
      if (!ball || !frontLayer || !backLayer) return;
      ball.setAttribute('transform', 'translate(' + pos[0].toFixed(2) + ' ' + pos[1].toFixed(2) + ') scale(' + s.toFixed(3) + ')');
      var target = depth >= 0 ? frontLayer : backLayer;
      if (ball.parentNode !== target) target.appendChild(ball);
    });
  }
  placeBall(0);

  /* ==================================================================
   * 2. SVG FRAME LOOP
   * ================================================================== */

  var svgRunning = true;
  function svgFrame(now) {
    if (!svgRunning) return;
    glitchTick(now);
    updateWaves(now);
    placeBall(now);
    requestAnimationFrame(svgFrame);
  }
  requestAnimationFrame(svgFrame);

  /* ==================================================================
   * 3. INTRO ANIMATION TIMELINE
   * ==================================================================
   *
   *  Phase 1  (  0 — 2200 ms)  Logo fades in + rises
   *  Phase 2  (2200 — 3800 ms)  English text halves reveal from center
   *  Phase 3  (3800 — 5200 ms)  Hold (English visible)
   *  Phase 4  (5200 — 6600 ms)  English text hides back to center
   *  Phase 5  (6600 — 8200 ms)  Amharic text halves reveal from center
   *  Phase 6  (8200 — 9600 ms)  Hold (Amharic visible)
   *  Phase 7  (9600 — 12200ms)  Smooth exit: logo glides to header, text fades
   *  Phase 8  (12200 — 13400ms) Overlay fades, cleanup
   *
   * ================================================================== */

  // Elements
  var overlay  = _el('intro-overlay');
  var group    = _el('intro-group');
  var logoWrap = _el('intro-logo-wrap');
  var enTop    = _el('en-top');
  var enBottom = _el('en-bottom');
  var amTop    = _el('am-top');
  var amBottom = _el('am-bottom');

  // Easing — ultra-smooth exponential ease-out (lenis.dev feel)
  function expoOut(t) { return t === 1 ? 1 : 1 - Math.pow(2, -12 * t); }
  function cubicIn(t) { return t * t * t; }

  // Generic tween helper
  function tween(duration, onUpdate, easing, onDone) {
    var start = performance.now();
    function tick(now) {
      var elapsed = now - start;
      var raw = Math.min(elapsed / duration, 1);
      var t = easing ? easing(raw) : raw;
      onUpdate(t, raw);
      if (raw < 1) requestAnimationFrame(tick);
      else if (onDone) onDone();
    }
    requestAnimationFrame(tick);
  }

  // Text split-reveal animation helpers
  function showTextGroup(topEl, bottomEl, duration, onDone) {
    tween(duration || 1400, function (t) {
      topEl.style.transform    = 'translateY(' + (115 * (1 - t)).toFixed(2) + '%)';
      bottomEl.style.transform = 'translateY(' + (-115 * (1 - t)).toFixed(2) + '%)';
    }, expoOut, onDone);
  }

  function hideTextGroup(topEl, bottomEl, duration, onDone) {
    tween(duration || 1200, function (t) {
      topEl.style.transform    = 'translateY(' + (115 * t).toFixed(2) + '%)';
      bottomEl.style.transform = 'translateY(' + (-115 * t).toFixed(2) + '%)';
    }, cubicIn, onDone);
  }

  // ===================================================================
  // 3D Model Readiness & Dynamic Intro Gate (Option 3: Strict Hold)
  // Loader continues animating its logo and bilingual cycle until
  // the 3D model is 100% downloaded and ready in WebGL.
  // ===================================================================
  var is3DReady = !!window.__hzsitd3DReady;
  var minTimePassed = false;
  var exitStarted = false;
  var currentShowingLang = 'en'; // 'en' | 'am'
  var textTransitioning = false;
  var activeHoldTimeout = null;

  function checkReadyAndExit() {
    if (exitStarted) return;
    if (is3DReady && minTimePassed) {
      if (textTransitioning) {
        // Allow the current short text motion to finish cleanly (<1s)
        return;
      }
      if (activeHoldTimeout) {
        clearTimeout(activeHoldTimeout);
        activeHoldTimeout = null;
      }
      exitStarted = true;
      triggerExitAnimation();
    }
  }

  window.addEventListener('hzsitd:3d-ready', function () {
    is3DReady = true;
    checkReadyAndExit();
  });

  // Text cycle routines while waiting for 3D model download
  function cycleToAmharic() {
    if (exitStarted) return;
    textTransitioning = true;
    showTextGroup(amTop, amBottom, 1400, function () {
      textTransitioning = false;
      currentShowingLang = 'am';
      minTimePassed = true; // Minimum intro display achieved
      if (is3DReady) {
        checkReadyAndExit();
        return;
      }
      activeHoldTimeout = setTimeout(function () {
        if (exitStarted) return;
        textTransitioning = true;
        hideTextGroup(amTop, amBottom, 1200, function () {
          textTransitioning = false;
          if (is3DReady) {
            checkReadyAndExit();
            return;
          }
          setTimeout(cycleToEnglish, 300);
        });
      }, 2800);
    });
  }

  function cycleToEnglish() {
    if (exitStarted) return;
    textTransitioning = true;
    showTextGroup(enTop, enBottom, 1400, function () {
      textTransitioning = false;
      currentShowingLang = 'en';
      if (is3DReady && minTimePassed) {
        checkReadyAndExit();
        return;
      }
      activeHoldTimeout = setTimeout(function () {
        if (exitStarted) return;
        textTransitioning = true;
        hideTextGroup(enTop, enBottom, 1200, function () {
          textTransitioning = false;
          if (is3DReady && minTimePassed) {
            checkReadyAndExit();
            return;
          }
          setTimeout(cycleToAmharic, 300);
        });
      }, 2800);
    });
  }

  // Continuous language loop (runs in header after landing)
  function loopLanguageSwitch() {
    showTextGroup(enTop, enBottom, 1400, function () {
      setTimeout(function () {
        hideTextGroup(enTop, enBottom, 1200, function () {
          setTimeout(function () {
            showTextGroup(amTop, amBottom, 1400, function () {
              setTimeout(function () {
                hideTextGroup(amTop, amBottom, 1200, function () {
                  setTimeout(loopLanguageSwitch, 350);
                });
              }, 2800);
            });
          }, 300);
        });
      }, 2800);
    });
  }

  function triggerExitAnimation() {
    // Trigger Hero Headline and 3D Object animations simultaneously as the loader journeys to the header!
    window.__heroShouldReveal = true;
    var heroBanner = document.getElementById('hero-banner');
    if (heroBanner) heroBanner.classList.add('hero-revealed');

    var hero3d = document.getElementById('hero-3d-wrap');
    if (hero3d) hero3d.classList.add('appeared');

    var targetEl = _el('header-brand-placeholder');
    var headerLogoDiv = document.querySelector('.header .logo');

    // Exact pixel coordinates where the brand element should land in the header
    var targetRect = targetEl ? targetEl.getBoundingClientRect() : null;
    if (!targetRect || targetRect.width === 0) {
      var headerEl = document.querySelector('.header');
      var contEl = document.querySelector('.header .container');
      var cRect = contEl ? contEl.getBoundingClientRect() : { left: 24, top: 20 };
      var hRect = headerEl ? headerEl.getBoundingClientRect() : { top: 0, height: 90 };
      targetRect = { left: cRect.left + 12, top: hRect.top + Math.max(0, (hRect.height - 92) / 2), width: 280, height: 92 };
    }

    var groupRect = group.getBoundingClientRect();
    group.style.transformOrigin = '0 0';

    var currentH = groupRect.height || 140;
    var targetH = targetRect.height || 92;
    var scaleRatio = targetH / currentH;

    var dx = targetRect.left - groupRect.left;
    var dy = targetRect.top - groupRect.top;

    var duration = 2200;

    // Smooth deceleration curve
    function smoothDecel(t) {
      var p = 1 - t;
      return 1 - p * p * p;
    }

    overlay.style.pointerEvents = 'none';

    tween(duration, function (t) {
      var curScale = 1 + (scaleRatio - 1) * t;
      group.style.transform =
        'translate(' + (dx * t).toFixed(2) + 'px, ' + (dy * t).toFixed(2) + 'px) scale(' + curScale.toFixed(4) + ')';

      // Dissolve overlay background smoothly from the very start of travel
      overlay.style.background = 'rgba(255,255,255,' + Math.max(0, 1 - t).toFixed(3) + ')';
    }, smoothDecel, function () {
      // Phase 8: Seamless zero-jump handoff into target header position
      var brandLink = document.createElement('a');
      brandLink.href = 'index.html';
      brandLink.className = 'header-intro-logo';
      brandLink.id = 'header-brand-link';

      brandLink.appendChild(group);

      if (targetEl && targetEl.parentNode) {
        targetEl.parentNode.replaceChild(brandLink, targetEl);
      } else if (headerLogoDiv) {
        headerLogoDiv.insertBefore(brandLink, headerLogoDiv.firstChild);
      }

      // Clear inline transforms so native CSS takes over cleanly
      group.style.transform = '';
      group.style.transformOrigin = '';
      group.style.opacity = '';
      logoWrap.style.transform = '';
      logoWrap.style.opacity = '';

      // Unlock scroll & remove overlay
      document.body.classList.remove('intro-active');
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);

      // Reveal Hero Headline & 3D Object (already fully downloaded!)
      var heroBanner = document.getElementById('hero-banner');
      if (heroBanner) heroBanner.classList.add('hero-revealed');

      var hero3d = document.getElementById('hero-3d-wrap');
      if (hero3d) hero3d.classList.add('appeared');

      // Continue alternating language switch in header
      setTimeout(function () {
        if (currentShowingLang === 'am') {
          hideTextGroup(amTop, amBottom, 1200, function () {
            setTimeout(loopLanguageSwitch, 350);
          });
        } else {
          hideTextGroup(enTop, enBottom, 1200, function () {
            setTimeout(function () {
              showTextGroup(amTop, amBottom, 1400, function () {
                setTimeout(function () {
                  hideTextGroup(amTop, amBottom, 1200, function () {
                    setTimeout(loopLanguageSwitch, 350);
                  });
                }, 2800);
              });
            }, 300);
          });
        }
      }, 1200);
    });
  }

  function isMobilePhone() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var isLandscapePhone = (h <= 500 && w <= 950 && window.matchMedia && window.matchMedia('(orientation: landscape)').matches);
    var isPortraitPhone = (w < 768);
    var ua = navigator.userAgent || '';
    var isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (w >= 768 && h >= 501);
    return !isTablet && (isPortraitPhone || isLandscapePhone || /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua));
  }

  function startTimeline() {
    // If on a mobile phone (< 768px or landscape phone), do not run the desktop intro timeline.
    // The mobile blocker overlay remains active to show the desktop workstation notice.
    // Tablets (>= 768px, like iPads) and desktops proceed normally with full intro & website execution.
    if (isMobilePhone()) {
      return;
    }

    /* ---- Phase 1: Logo entrance (fades in + rises) ---- */
    setTimeout(function () {
      tween(2000, function (t) {
        logoWrap.style.opacity = t;
        logoWrap.style.transform = 'translateY(' + (35 * (1 - t)).toFixed(2) + 'px)';
      }, expoOut);
    }, 300);

    /* ---- Phase 2: English text reveal (simultaneous with logo) ---- */
    setTimeout(function () {
      textTransitioning = true;
      showTextGroup(enTop, enBottom, 1600, function () {
        textTransitioning = false;
        currentShowingLang = 'en';
        activeHoldTimeout = setTimeout(function () {
          if (exitStarted) return;
          textTransitioning = true;
          hideTextGroup(enTop, enBottom, 1200, function () {
            textTransitioning = false;
            setTimeout(cycleToAmharic, 300);
          });
        }, 2400);
      });
    }, 300);
  }

  // Wait for custom fonts to load, then fire the timeline
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(startTimeline);
  } else {
    setTimeout(startTimeline, 600);
  }

})();

