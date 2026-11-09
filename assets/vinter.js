/*
 * Vinter: julscen för önskelistorna.
 * Soluppgång över snöklädda åkrar, röda stugor med rök ur skorstenen, granar,
 * tomtenissar (en med lykta, en med kälke), en räv, en vinterhare, fåglar och fallande snö.
 *
 *   Vinter.scene(canvas, { horizon, band, bigSnow, seed })  helsides- eller bandscen
 *   Vinter.snow(canvas, { density })                       snö som faller över en hel sida
 *
 * Respekterar prefers-reduced-motion (ritar en stillbild, ingen snö över sidan)
 * och pausar när fliken är dold eller scenen är utanför skärmen.
 */
(function (global) {
  "use strict";

  var TAU = Math.PI * 2;
  var reduceMotion = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i] || {};
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function ell(g, x, y, rx, ry, rot) {
    g.beginPath();
    g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU);
    g.fill();
  }

  function fit(canvas) {
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    return { w: w, h: h, dpr: dpr };
  }

  /* ---------------- Snöflingor ---------------- */

  function Flakes(rand, big) { this.rand = rand; this.big = big; this.list = []; this.W = 1; this.H = 1; }
  Flakes.prototype.reset = function (W, H, n) {
    this.W = W; this.H = H; this.list = [];
    for (var i = 0; i < n; i++) this.list.push(this.make(true));
  };
  Flakes.prototype.make = function (anywhere) {
    var r = this.rand, z = r(), big = this.big;
    var size = (big ? 1.1 : 0.8) + z * z * (big ? 3.4 : 2.3);
    return {
      x: r() * this.W, y: anywhere ? r() * this.H : -size * 3, r: size,
      vy: 16 + z * 48, sway: 5 + z * 16, ph: r() * TAU, a: 0.4 + z * 0.55
    };
  };
  Flakes.prototype.draw = function (g, t, dt, wind) {
    var W = this.W, H = this.H;
    g.fillStyle = "#ffffff";
    for (var i = 0; i < this.list.length; i++) {
      var f = this.list[i];
      if (dt > 0) {
        f.y += f.vy * dt;
        f.x += (wind + Math.cos(t * 0.8 + f.ph) * f.sway) * dt;
        if (f.y > H + 8) f = this.list[i] = this.make(false);
        if (f.x > W + 8) f.x -= W + 16; else if (f.x < -8) f.x += W + 16;
      }
      g.globalAlpha = f.a;
      g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  };

  /* ---------------- Rök ---------------- */

  function Smoke(rand) { this.rand = rand; this.p = []; }
  Smoke.prototype.update = function (dt, emitters) {
    if (!(dt > 0)) return;
    var r = this.rand, i;
    for (i = 0; i < emitters.length; i++) {
      var em = emitters[i];
      em.acc = (em.acc || 0) + dt;
      while (em.acc > 0.16) {
        em.acc -= 0.16;
        this.p.push({
          x: em.x + (r() - 0.5) * em.s * 2, y: em.y, r: em.s * (1.2 + r() * 0.6),
          vx: em.s * (3 + r() * 2.5), vy: -em.s * (6 + r() * 3),
          age: 0, life: 4 + r() * 1.5, ph: r() * TAU, grow: em.s * 1.8
        });
      }
    }
    for (i = this.p.length - 1; i >= 0; i--) {
      var q = this.p[i];
      q.age += dt;
      if (q.age > q.life) { this.p.splice(i, 1); continue; }
      q.x += (q.vx + Math.sin(q.age * 1.6 + q.ph) * q.grow * 0.6) * dt;
      q.y += q.vy * dt;
      q.vy *= 1 - 0.15 * dt;
      q.r += q.grow * dt;
    }
  };
  Smoke.prototype.draw = function (g) {
    for (var i = 0; i < this.p.length; i++) {
      var q = this.p[i], k = q.age / q.life;
      var a = 0.34 * (1 - k) * Math.min(1, q.age * 3);
      g.fillStyle = "rgba(226,229,242," + a.toFixed(3) + ")";
      g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill();
    }
  };

  /* ---------------- Statiska delar ---------------- */

  function drawPine(g, x, y, h) {
    var hw0 = h * 0.42;
    g.fillStyle = "#4b3428";
    g.fillRect(x - h * 0.03, y - h * 0.12, h * 0.06, h * 0.13);
    for (var i = 3; i >= 0; i--) {
      var ya = y - h + i * h * 0.18, yb = ya + h * 0.38 + i * h * 0.02;
      var hw = hw0 * (0.34 + i * 0.22);
      g.fillStyle = i % 2 ? "#1c3a35" : "#173230";
      g.beginPath();
      g.moveTo(x, ya); g.lineTo(x + hw, yb);
      g.quadraticCurveTo(x, yb + h * 0.05, x - hw, yb);
      g.closePath(); g.fill();
      var ys = ya + (yb - ya) * 0.58, hs = hw * 0.62;
      g.fillStyle = "rgba(244,247,253,0.95)";
      g.beginPath();
      g.moveTo(x, ya - h * 0.01);
      g.lineTo(x + hs, ys);
      g.quadraticCurveTo(x + hs * 0.5, ys - h * 0.035, x + hs * 0.15, ys + h * 0.01);
      g.quadraticCurveTo(x - hs * 0.3, ys - h * 0.03, x - hs, ys);
      g.closePath(); g.fill();
    }
  }

  function drawCottage(g, c) {
    var w = c.w, h = c.h, x0 = c.x - w / 2, x1 = c.x + w / 2, top = c.y - h;
    var roofH = h * 0.6, over = w * 0.07, rt = top - roofH, i;

    // Lång skugga åt vänster: solen står till höger.
    g.fillStyle = "rgba(96,110,170,0.2)";
    ell(g, c.x - w * 0.32, c.y + h * 0.05, w * 0.75, h * 0.13, -0.05);

    // Faluröd vägg med panelränder och vita knutar.
    g.fillStyle = "#9b2c23"; g.fillRect(x0, top, w, h);
    g.strokeStyle = "rgba(70,12,8,0.28)"; g.lineWidth = Math.max(0.8, w * 0.005);
    for (var px = x0 + w * 0.05; px < x1 - w * 0.03; px += w * 0.045) {
      g.beginPath(); g.moveTo(px, top); g.lineTo(px, c.y); g.stroke();
    }
    g.fillStyle = "#f6f1e7";
    g.fillRect(x0, top, w * 0.04, h);
    g.fillRect(x1 - w * 0.04, top, w * 0.04, h);

    // Dörr.
    var dw = w * 0.14, dh = h * 0.7, dx = x0 + w * 0.44;
    g.fillStyle = "#f6f1e7"; g.fillRect(dx - dw * 0.14, c.y - dh - dw * 0.14, dw * 1.28, dh + dw * 0.14);
    g.fillStyle = "#4d1913"; g.fillRect(dx, c.y - dh, dw, dh);
    g.fillStyle = "#f3c86b"; ell(g, dx + dw * 0.8, c.y - dh * 0.45, dw * 0.06, dw * 0.06);

    // Fönster med varmt ljus inifrån.
    var ww = w * 0.14, wh = h * 0.34, wy = top + h * 0.24, wins = [x0 + w * 0.14, x0 + w * 0.72];
    for (i = 0; i < wins.length; i++) {
      var wx = wins[i], cx = wx + ww / 2, cy = wy + wh / 2;
      var gl = g.createRadialGradient(cx, cy, 0, cx, cy, ww * 1.7);
      gl.addColorStop(0, "rgba(255,205,120,0.5)"); gl.addColorStop(1, "rgba(255,205,120,0)");
      g.fillStyle = gl; g.fillRect(cx - ww * 1.7, cy - ww * 1.7, ww * 3.4, ww * 3.4);
      g.fillStyle = "#f6f1e7"; g.fillRect(wx - ww * 0.14, wy - ww * 0.14, ww * 1.28, wh + ww * 0.28);
      g.fillStyle = "#ffd57e"; g.fillRect(wx, wy, ww, wh);
      g.fillStyle = "#f6f1e7";
      g.fillRect(cx - ww * 0.05, wy, ww * 0.1, wh);
      g.fillRect(wx, cy - ww * 0.05, ww, ww * 0.1);
      g.fillStyle = "#f4f7fd"; ell(g, cx, wy + wh + ww * 0.16, ww * 0.72, ww * 0.12);
    }

    // Skorsten, sedan taket som täcker dess nedre del.
    var chx = x0 + w * 0.68, chw = w * 0.075, chTop = rt - roofH * 0.35;
    g.fillStyle = "#6f2a22"; g.fillRect(chx, chTop, chw, roofH * 0.9);
    g.fillStyle = "#3b2b2a";
    g.beginPath();
    g.moveTo(x0 - over, top); g.lineTo(x0 + w * 0.1, rt); g.lineTo(x1 - w * 0.1, rt); g.lineTo(x1 + over, top);
    g.closePath(); g.fill();

    // Tjockt snötäcke på taket med kanter som hänger ner.
    var sy0 = top - h * 0.03, sTop = rt - roofH * 0.1, left = x0 - over * 1.15, right = x1 + over * 1.15;
    g.fillStyle = "#f4f7fd";
    g.beginPath();
    g.moveTo(left, sy0);
    g.quadraticCurveTo(x0 + w * 0.02, rt + roofH * 0.1, x0 + w * 0.1, sTop);
    g.quadraticCurveTo(c.x, sTop - roofH * 0.12, x1 - w * 0.1, sTop);
    g.quadraticCurveTo(x1 - w * 0.02, rt + roofH * 0.1, right, sy0);
    var n = 7, span = right - left;
    for (var k = n; k > 0; k--) {
      var xa = left + span * k / n, xb = left + span * (k - 1) / n;
      g.quadraticCurveTo((xa + xb) / 2, sy0 + h * (0.07 + 0.05 * ((k * 37) % 5) / 4), xb, sy0);
    }
    g.closePath(); g.fill();

    g.fillStyle = "#f4f7fd";
    ell(g, chx + chw / 2, chTop, chw * 0.75, chw * 0.32);
    ell(g, c.x, c.y + h * 0.02, w * 0.62, h * 0.09);

    return { x: chx + chw / 2, y: chTop - chw * 0.2 };
  }

  function drawFence(g, f) {
    var s = f.sc * f.U, ph = 13 * s, gap = 24 * s, x;
    function fy(xx) { return f.y + Math.sin((xx - f.x0) / (90 * f.U)) * 3 * f.U; }
    g.strokeStyle = "#5c4a42"; g.lineWidth = Math.max(1, 1.6 * s);
    [0.72, 0.38].forEach(function (k) {
      g.beginPath();
      for (var xx = f.x0; xx <= f.x1; xx += 6) {
        var yy = fy(xx) - ph * k;
        if (xx === f.x0) g.moveTo(xx, yy); else g.lineTo(xx, yy);
      }
      g.stroke();
    });
    for (x = f.x0; x <= f.x1; x += gap) {
      g.fillStyle = "#5c4a42"; g.fillRect(x - 1.3 * s, fy(x) - ph, 2.6 * s, ph);
      g.fillStyle = "#f4f7fd"; ell(g, x, fy(x) - ph, 2.4 * s, 1.3 * s);
    }
  }

  function drawFields(g, L) {
    var W = L.W, GH = L.GH, U = L.U, i, d, y, s;
    g.lineCap = "round";
    for (i = 0; i < 8; i++) {
      d = 0.07 + i * 0.05; y = L.dy(d); s = L.ds(d);
      g.strokeStyle = "rgba(125,145,198," + (0.14 + d * 0.22).toFixed(3) + ")";
      g.lineWidth = Math.max(0.8, 1.2 * U * s);
      g.beginPath();
      g.moveTo(W * (0.52 - d * 0.2), y + GH * 0.015);
      g.quadraticCurveTo(W * 0.8, y - GH * 0.012, W * 1.02, y + GH * 0.008);
      g.stroke();
    }
    for (i = 0; i < 6; i++) {
      d = 0.36 + i * 0.05; y = L.dy(d); s = L.ds(d);
      g.strokeStyle = "rgba(125,145,198," + (0.14 + d * 0.2).toFixed(3) + ")";
      g.lineWidth = Math.max(0.8, 1.2 * U * s);
      g.beginPath();
      g.moveTo(-W * 0.02, y - GH * 0.01);
      g.quadraticCurveTo(W * 0.2, y + GH * 0.012, W * (0.42 + i * 0.01), y - GH * 0.005);
      g.stroke();
    }
  }

  function drawStatic(g, fg, L) {
    var W = L.W, H = L.H, hy = L.hy, U = L.U, GH = L.GH, i, x;

    // Himmel i soluppgång.
    var sky = g.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, "#131c40");
    sky.addColorStop(0.42, "#3d3a78");
    sky.addColorStop(0.72, "#b9708f");
    sky.addColorStop(0.9, "#f2a27e");
    sky.addColorStop(1, "#ffd49a");
    g.fillStyle = sky; g.fillRect(0, 0, W, hy + 1);

    // Solen precis över horisonten.
    var sx = L.sun.x, sy = L.sun.y, sr = L.sun.r;
    var glow = g.createRadialGradient(sx, sy, sr * 0.5, sx, sy, Math.max(W, H) * 0.55);
    glow.addColorStop(0, "rgba(255,226,170,0.75)");
    glow.addColorStop(0.25, "rgba(255,190,140,0.28)");
    glow.addColorStop(1, "rgba(255,170,140,0)");
    g.fillStyle = glow; g.fillRect(0, 0, W, hy + 1);
    g.fillStyle = "#fff4d6"; ell(g, sx, sy, sr, sr);

    // Avlägsna fjäll i morgonljus.
    g.beginPath(); g.moveTo(0, hy + 1);
    for (x = 0; x <= W + 4; x += 4) {
      var fx = x / W;
      g.lineTo(x, hy - H * (0.05 + 0.03 * Math.sin(fx * 2.6 + 0.8) + 0.016 * Math.sin(fx * 6.9 + 2.1) + 0.007 * Math.sin(fx * 15 + 0.3)));
    }
    g.lineTo(W, hy + 1); g.closePath();
    var hg = g.createLinearGradient(0, hy - H * 0.11, 0, hy);
    hg.addColorStop(0, "#f1cad3"); hg.addColorStop(0.5, "#b8a6cc"); hg.addColorStop(1, "#7f7cb2");
    g.fillStyle = hg; g.fill();

    // Skogsås längs horisonten.
    function ridge(f) { return hy - H * (0.016 + 0.011 * Math.sin(f * 4.2 + 2.5) + 0.006 * Math.sin(f * 9.7 + 1.2)); }
    g.fillStyle = "#2a3c5b";
    var tr = rng(31);
    for (x = -4; x < W + 6; x += (3 + tr() * 4) * U) {
      var th = (5 + tr() * 9) * U, by = ridge(x / W);
      g.beginPath(); g.moveTo(x - th * 0.32, by + 1); g.lineTo(x, by - th); g.lineTo(x + th * 0.32, by + 1); g.closePath(); g.fill();
    }
    g.beginPath(); g.moveTo(0, hy + 1);
    for (x = 0; x <= W + 4; x += 4) g.lineTo(x, ridge(x / W));
    g.lineTo(W, hy + 1); g.closePath(); g.fill();

    // Snöklädd mark, varm där solen når.
    var gg = g.createLinearGradient(0, hy, 0, H);
    gg.addColorStop(0, "#f6dcd8"); gg.addColorStop(0.2, "#eef0f9"); gg.addColorStop(1, "#c9d6ee");
    g.fillStyle = gg; g.fillRect(0, hy, W, GH);
    var warm = g.createRadialGradient(sx, hy, 0, sx, hy, W * 0.55);
    warm.addColorStop(0, "rgba(255,214,176,0.55)"); warm.addColorStop(1, "rgba(255,214,176,0)");
    g.fillStyle = warm; g.fillRect(0, hy, W, GH);

    // Mjuka snövallar.
    for (i = 0; i < 3; i++) {
      var y0 = hy + [0.28, 0.5, 0.74][i] * GH;
      g.fillStyle = "rgba(150,170,215,0.14)";
      g.beginPath(); g.moveTo(0, y0 + GH * 0.1);
      for (x = 0; x <= W + 8; x += 8) g.lineTo(x, y0 + Math.sin(x / W * (3 + i) + i * 1.7) * GH * 0.04);
      g.lineTo(W, y0 + GH * 0.1); g.closePath(); g.fill();
    }

    drawFields(g, L);

    for (i = 0; i < L.items.length; i++) {
      var it = L.items[i], tg = it.d > 0.9 ? fg : g;
      if (it.type === "pine") drawPine(tg, it.x, it.y, it.h);
      else if (it.type === "cottage") it.chim = drawCottage(tg, it);
      else if (it.type === "fence") drawFence(tg, it);
    }
  }

  function buildLayout(W, H, opts) {
    var r = rng(opts.seed), hy = Math.round(H * opts.horizon), GH = H - hy, i, dd;
    var U = Math.max(0.35, Math.min(W / 700, H / (opts.band ? 300 : 520)));
    function dy(d) { return hy + d * GH; }
    function ds(d) { return 0.5 + d * 1.6; }
    var items = [];
    [{ fx: 0.15, d: 0.14, s: 0.95 }, { fx: 0.48, d: 0.03, s: 0.72 }, { fx: 0.83, d: 0.2, s: 1.05 }].forEach(function (c) {
      var sc = ds(c.d) * c.s, w = 110 * U * sc, h = 56 * U * sc, x = c.fx * W;
      items.push({ type: "cottage", x: x, y: dy(c.d), w: w, h: h, d: c.d });
      var n = 2 + Math.floor(r() * 3);
      for (var j = 0; j < n; j++) {
        var side = j % 2 ? 1 : -1, d2 = c.d - 0.015 + r() * 0.025;
        items.push({ type: "pine", x: x + side * w * (0.62 + r() * 0.5), y: dy(d2), h: (52 + r() * 46) * U * ds(d2), d: d2 });
      }
    });
    for (i = 0; i < 6; i++) { dd = 0.01 + r() * 0.1; items.push({ type: "pine", x: r() * W * 0.08, y: dy(dd), h: (40 + r() * 40) * U * ds(dd), d: dd }); }
    for (i = 0; i < 6; i++) { dd = 0.01 + r() * 0.1; items.push({ type: "pine", x: W * (0.92 + r() * 0.08), y: dy(dd), h: (40 + r() * 40) * U * ds(dd), d: dd }); }
    if (!opts.band) items.push({ type: "pine", x: W * 0.035, y: dy(1.03), h: 170 * U, d: 1.03 });
    items.push({ type: "pine", x: W * 0.975, y: dy(0.99), h: (opts.band ? 120 : 150) * U, d: 0.99 });
    items.push({ type: "fence", x0: W * 0.02, x1: W * 0.44, y: dy(0.3), sc: ds(0.3), U: U, d: 0.3 });
    items.sort(function (a, b) { return a.d - b.d; });
    return {
      W: W, H: H, hy: hy, GH: GH, U: U, dy: dy, ds: ds, items: items,
      sun: { x: W * 0.68, y: hy - H * 0.06, r: Math.max(10, 22 * U) }
    };
  }

  /* ---------------- Rörliga figurer ---------------- */

  function drawSled(g, s) {
    var bx = -s * 0.95;
    g.strokeStyle = "#6b4a36"; g.lineWidth = s * 0.03; g.lineCap = "round";
    g.beginPath(); g.moveTo(-s * 0.05, -s * 0.36); g.quadraticCurveTo(-s * 0.35, -s * 0.12, bx + s * 0.35, -s * 0.1); g.stroke();
    g.beginPath(); g.moveTo(bx - s * 0.32, -s * 0.02); g.lineTo(bx + s * 0.3, -s * 0.02);
    g.quadraticCurveTo(bx + s * 0.4, -s * 0.03, bx + s * 0.38, -s * 0.12); g.stroke();
    g.fillStyle = "#8a5a3c"; g.fillRect(bx - s * 0.3, -s * 0.12, s * 0.6, s * 0.05);
    g.fillStyle = "#c7232c"; g.fillRect(bx - s * 0.2, -s * 0.38, s * 0.38, s * 0.26);
    g.fillStyle = "#f2c14e";
    g.fillRect(bx - s * 0.02, -s * 0.38, s * 0.05, s * 0.26);
    g.fillRect(bx - s * 0.2, -s * 0.27, s * 0.38, s * 0.045);
    ell(g, bx - s * 0.04, -s * 0.41, s * 0.06, s * 0.035, -0.5);
    ell(g, bx + s * 0.05, -s * 0.41, s * 0.06, s * 0.035, 0.5);
    g.fillStyle = "#f4f7fd"; ell(g, bx + s * 0.1, -s * 0.385, s * 0.06, s * 0.02);
  }

  function drawNisse(g, a, t) {
    var s = a.size, step = t * a.stepRate + a.ph;
    var bob = Math.abs(Math.sin(step)) * s * 0.025, l = Math.sin(step) * s * 0.07;
    g.save(); g.translate(a.x, a.y); g.scale(a.dir, 1);
    g.fillStyle = "rgba(90,105,160,0.22)"; ell(g, 0, 0, s * 0.3, s * 0.05);
    if (a.sled) drawSled(g, s);
    g.translate(0, -bob);

    g.fillStyle = "#3a2e2a";
    g.fillRect(-s * 0.1 + l, -s * 0.17, s * 0.075, s * 0.16);
    g.fillRect(s * 0.03 - l, -s * 0.17, s * 0.075, s * 0.16);
    g.fillStyle = "#231a17";
    ell(g, -s * 0.055 + l, -s * 0.012, s * 0.065, s * 0.03);
    ell(g, s * 0.075 - l, -s * 0.012, s * 0.065, s * 0.03);

    g.fillStyle = a.coat;
    g.beginPath();
    g.moveTo(-s * 0.19, -s * 0.15);
    g.quadraticCurveTo(-s * 0.21, -s * 0.5, 0, -s * 0.57);
    g.quadraticCurveTo(s * 0.21, -s * 0.5, s * 0.19, -s * 0.15);
    g.closePath(); g.fill();
    g.fillStyle = "#3a2e2a"; g.fillRect(-s * 0.19, -s * 0.31, s * 0.38, s * 0.035);

    g.strokeStyle = a.coat; g.lineWidth = s * 0.07; g.lineCap = "round";
    g.beginPath(); g.moveTo(s * 0.08, -s * 0.44); g.lineTo(s * 0.24, -s * 0.33 + (a.lantern ? 0 : l * 0.3)); g.stroke();

    g.fillStyle = "#f3efe6";
    g.beginPath();
    g.moveTo(-s * 0.14, -s * 0.6);
    g.quadraticCurveTo(-s * 0.12, -s * 0.33, s * 0.05, -s * 0.31);
    g.quadraticCurveTo(s * 0.18, -s * 0.42, s * 0.16, -s * 0.6);
    g.closePath(); g.fill();
    g.fillStyle = "#e79a86"; ell(g, s * 0.13, -s * 0.61, s * 0.05, s * 0.045);

    var tip = Math.sin(step * 0.5) * s * 0.04;
    g.fillStyle = "#c7232c";
    g.beginPath();
    g.moveTo(-s * 0.19, -s * 0.6);
    g.quadraticCurveTo(-s * 0.13, -s * 0.92, -s * 0.24 + tip, -s * 1.0);
    g.quadraticCurveTo(s * 0.06, -s * 0.9, s * 0.19, -s * 0.6);
    g.closePath(); g.fill();
    g.fillStyle = "#a81c24"; g.fillRect(-s * 0.2, -s * 0.63, s * 0.4, s * 0.05);

    if (a.lantern) {
      var lx = s * 0.27, ly = -s * 0.28;
      var gl = g.createRadialGradient(lx, ly, 0, lx, ly, s * 0.55);
      gl.addColorStop(0, "rgba(255,206,120,0.55)"); gl.addColorStop(1, "rgba(255,206,120,0)");
      g.fillStyle = gl; g.fillRect(lx - s * 0.55, ly - s * 0.55, s * 1.1, s * 1.1);
      g.strokeStyle = "#3a2e2a"; g.lineWidth = s * 0.015;
      g.beginPath(); g.moveTo(s * 0.25, -s * 0.33); g.lineTo(lx, ly - s * 0.06); g.stroke();
      g.fillStyle = "#3a2e2a"; g.fillRect(lx - s * 0.04, ly - s * 0.06, s * 0.08, s * 0.012);
      g.fillStyle = "#ffd67e"; g.fillRect(lx - s * 0.035, ly - s * 0.05, s * 0.07, s * 0.09);
    }
    g.restore();
  }

  function drawFox(g, a, t) {
    var s = a.size, step = t * a.stepRate + a.ph, l = Math.sin(step) * s * 0.07, sw = Math.sin(step * 0.5) * s * 0.02;
    g.save(); g.translate(a.x, a.y); g.scale(a.dir, 1);
    g.fillStyle = "rgba(90,105,160,0.2)"; ell(g, 0, 0, s * 0.5, s * 0.06);
    g.fillStyle = "#cf6428"; ell(g, -s * 0.55, -s * 0.3 + sw, s * 0.28, s * 0.1, -0.3);
    g.fillStyle = "#f6efe6"; ell(g, -s * 0.8, -s * 0.38 + sw, s * 0.08, s * 0.065, -0.3);
    g.strokeStyle = "#3b2418"; g.lineWidth = s * 0.05; g.lineCap = "round";
    var legs = [[-s * 0.28, l], [-s * 0.18, -l], [s * 0.16, -l], [s * 0.26, l]];
    for (var i = 0; i < 4; i++) {
      g.beginPath(); g.moveTo(legs[i][0], -s * 0.22); g.lineTo(legs[i][0] + legs[i][1], -s * 0.01); g.stroke();
    }
    g.fillStyle = "#cf6428"; ell(g, 0, -s * 0.3, s * 0.38, s * 0.13);
    g.fillStyle = "#f6efe6"; ell(g, s * 0.27, -s * 0.25, s * 0.1, s * 0.08);
    g.fillStyle = "#cf6428"; ell(g, s * 0.42, -s * 0.43, s * 0.11, s * 0.095);
    g.beginPath(); g.moveTo(s * 0.48, -s * 0.47); g.lineTo(s * 0.66, -s * 0.4); g.lineTo(s * 0.47, -s * 0.36); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(s * 0.34, -s * 0.48); g.lineTo(s * 0.36, -s * 0.62); g.lineTo(s * 0.42, -s * 0.5); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(s * 0.42, -s * 0.5); g.lineTo(s * 0.46, -s * 0.63); g.lineTo(s * 0.5, -s * 0.5); g.closePath(); g.fill();
    g.fillStyle = "#2a1a12";
    ell(g, s * 0.66, -s * 0.4, s * 0.018, s * 0.016);
    ell(g, s * 0.49, -s * 0.45, s * 0.014, s * 0.014);
    g.restore();
  }

  // Skogshare i vinterpäls: vit med svarta örontoppar.
  function drawHare(g, a) {
    var s = a.size, lift = a.lift || 0, hop = lift > 0, i;
    g.save(); g.translate(a.x, a.y); g.scale(a.dir, 1);
    g.fillStyle = "rgba(90,105,160," + (0.22 - Math.min(0.15, lift / s * 0.2)).toFixed(3) + ")";
    ell(g, 0, 0, s * 0.42, s * 0.07);
    g.translate(0, -lift);
    g.strokeStyle = "rgba(120,135,175,0.55)"; g.lineWidth = Math.max(0.8, s * 0.03);
    g.fillStyle = "#f7f8fc";
    ell(g, -s * 0.18, -s * 0.12, s * 0.2, s * 0.1, hop ? 0.5 : 0); g.stroke();
    ell(g, 0, -s * 0.3, s * 0.34, s * 0.22, hop ? -0.25 : -0.1); g.stroke();
    ell(g, -s * 0.33, -s * 0.36, s * 0.07, s * 0.07);
    ell(g, s * 0.3, -s * 0.5, s * 0.14, s * 0.12); g.stroke();
    for (i = 0; i < 2; i++) {
      g.save();
      g.translate(s * (0.24 + i * 0.07), -s * 0.58);
      g.rotate(-0.5 + i * 0.15 - (hop ? 0.25 : 0));
      g.fillStyle = "#f7f8fc"; ell(g, 0, -s * 0.17, s * 0.045, s * 0.18); g.stroke();
      g.fillStyle = "#26262e"; ell(g, 0, -s * 0.31, s * 0.035, s * 0.05);
      g.restore();
    }
    g.fillStyle = "#26262e"; ell(g, s * 0.35, -s * 0.52, s * 0.022, s * 0.022);
    g.restore();
  }

  function drawBird(g, b, t) {
    var flap = Math.sin(t * b.rate + b.ph), s = b.size;
    g.strokeStyle = "rgba(35,32,60,0.7)"; g.lineWidth = Math.max(1, s * 0.13); g.lineCap = "round";
    g.beginPath();
    g.moveTo(b.x - s, b.y - flap * s * 0.5);
    g.quadraticCurveTo(b.x - s * 0.4, b.y - s * 0.1 - flap * s * 0.2, b.x, b.y);
    g.quadraticCurveTo(b.x + s * 0.4, b.y - s * 0.1 - flap * s * 0.2, b.x + s, b.y - flap * s * 0.5);
    g.stroke();
  }

  function updateActor(a, dt, W) {
    if (a.type === "hare") {
      a.cyc += dt;
      var ph = (a.cyc % 1.6) / 1.6;
      if (ph < 0.3) { a.lift = Math.sin(ph / 0.3 * Math.PI) * a.size * 0.45; a.x += a.dir * a.size * 3.4 * dt; }
      else a.lift = 0;
    } else {
      a.x += a.dir * a.speed * dt;
    }
    var m = a.size * 1.6;
    if (a.dir > 0 && a.x > W + m) a.x = -m;
    else if (a.dir < 0 && a.x < -m) a.x = W + m;
  }

  /* ---------------- Scen ---------------- */

  function scene(canvas, options) {
    if (!canvas || !canvas.getContext) return;
    var opts = assign({ horizon: 0.6, seed: 2026, band: false, bigSnow: false }, options);
    var g = canvas.getContext("2d");
    var bg = document.createElement("canvas"), bgc = bg.getContext("2d");
    var fg = document.createElement("canvas"), fgc = fg.getContext("2d");
    var rand = rng(opts.seed + 99);
    var flakes = new Flakes(rand, opts.bigSnow), smoke = new Smoke(rand);
    var L = null, dpr = 1, t = 0, last = 0, raf = 0, visible = !document.hidden, onScreen = true;
    var stars = [], birds = [], actors = [], emitters = [];

    function rebuild() {
      var f = fit(canvas);
      dpr = f.dpr;
      bg.width = fg.width = canvas.width;
      bg.height = fg.height = canvas.height;
      bgc.setTransform(dpr, 0, 0, dpr, 0, 0);
      fgc.setTransform(dpr, 0, 0, dpr, 0, 0);
      fgc.clearRect(0, 0, f.w, f.h);
      L = buildLayout(f.w, f.h, opts);
      drawStatic(bgc, fgc, L);

      var W = L.W, H = L.H, U = L.U, i, r = rng(opts.seed + 5);
      stars = [];
      var skyTop = Math.max(10, (L.hy - H * 0.2) * 0.75);
      for (i = 0; i < clamp(Math.round(W * skyTop / 9000), 12, 60); i++) {
        var sy = r() * skyTop;
        stars.push({ x: r() * W, y: sy, r: 0.5 + r() * 1.1, a: (0.35 + r() * 0.6) * (1 - sy / skyTop * 0.7), sp: 1 + r() * 2.5, ph: r() * TAU });
      }
      birds = [];
      for (i = 0; i < 5; i++) {
        birds.push({ x: r() * W, y: L.hy * (0.3 + r() * 0.25), v: (24 + r() * 16) * U, size: (5 + r() * 3) * U, rate: 7 + r() * 3, ph: r() * TAU, wob: r() * TAU });
      }
      var defs = [
        { type: "fox", d: 0.36, fx: 0.62, dir: -1, speed: 20, size: 62, stepRate: 9 },
        { type: "nisse", d: 0.56, fx: 0.32, dir: 1, speed: 15, size: 50, stepRate: 6.5, coat: "#7a7f90", lantern: true },
        { type: "nisse", d: 0.6, fx: 0.12, dir: 1, speed: 15, size: 50, stepRate: 6.5, coat: "#8a6f5c", sled: true },
        { type: "hare", d: 0.72, fx: 0.5, dir: -1, size: 30 },
        { type: "nisse", d: 0.84, fx: 0.78, dir: -1, speed: 12, size: 50, stepRate: 6, coat: "#6f7b6a" }
      ];
      actors = defs.map(function (d) {
        var sc = L.ds(d.d);
        return assign({}, d, { x: d.fx * W, y: L.dy(d.d), size: d.size * U * sc, speed: (d.speed || 0) * U * sc, ph: r() * TAU, cyc: r() * 1.6, lift: 0 });
      }).sort(function (a, b) { return a.d - b.d; });

      emitters = L.items.filter(function (it) { return it.type === "cottage"; }).map(function (c) {
        return { x: c.chim.x, y: c.chim.y, s: Math.max(0.8, c.w * 0.02) };
      });
      smoke.p = [];
      for (i = 0; i < 120; i++) smoke.update(0.05, emitters);
      flakes.reset(W, H, clamp(Math.round(W * H / 6500), 40, 340));
      render(0);
    }

    function render(dt) {
      if (!L) return;
      var i;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(bg, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      g.fillStyle = "#ffffff";
      for (i = 0; i < stars.length; i++) {
        var st = stars[i];
        g.globalAlpha = st.a * (0.55 + 0.45 * Math.sin(t * st.sp + st.ph));
        g.beginPath(); g.arc(st.x, st.y, st.r, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;

      for (i = 0; i < birds.length; i++) {
        var b = birds[i];
        if (dt > 0) {
          b.x += b.v * dt;
          if (b.x > L.W + 20 * L.U) { b.x = -20 * L.U; }
        }
        var by = b.y + Math.sin(t * 0.7 + b.wob) * 6 * L.U;
        drawBird(g, { x: b.x, y: by, size: b.size, rate: b.rate, ph: b.ph }, t);
      }

      smoke.update(dt, emitters);
      smoke.draw(g);

      for (i = 0; i < actors.length; i++) {
        var a = actors[i];
        if (dt > 0) updateActor(a, dt, L.W);
        if (a.type === "nisse") drawNisse(g, a, t);
        else if (a.type === "fox") drawFox(g, a, t);
        else if (a.type === "hare") drawHare(g, a);
      }

      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(fg, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      flakes.draw(g, t, dt, 8 * L.U);
    }

    function tick(now) {
      raf = 0;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now; t += dt;
      render(dt);
      schedule();
    }
    function schedule() {
      if (!reduceMotion && visible && onScreen && !raf) raf = global.requestAnimationFrame(tick);
    }

    document.addEventListener("visibilitychange", function () { visible = !document.hidden; last = 0; schedule(); });
    if ("IntersectionObserver" in global) {
      new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; last = 0; schedule(); }).observe(canvas);
    }
    var timer = 0, lastSize = "";
    function onResize() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var r = canvas.getBoundingClientRect(), key = Math.round(r.width) + "x" + Math.round(r.height);
        if (key !== lastSize) { lastSize = key; rebuild(); }
      }, 120);
    }
    if ("ResizeObserver" in global) new ResizeObserver(onResize).observe(canvas);
    else global.addEventListener("resize", onResize);

    var r0 = canvas.getBoundingClientRect();
    lastSize = Math.round(r0.width) + "x" + Math.round(r0.height);
    rebuild();
    schedule();
  }

  /* ---------------- Snö över en hel sida ---------------- */

  function snow(canvas, options) {
    if (!canvas || !canvas.getContext) return;
    if (reduceMotion) { canvas.style.display = "none"; return; }
    var opts = assign({ density: 1 }, options);
    var g = canvas.getContext("2d"), dpr = 1, W = 0, H = 0, t = 0, last = 0, raf = 0, visible = !document.hidden;
    var flakes = new Flakes(rng(4711), false);

    function rebuild() {
      var prevW = W, f = fit(canvas);
      dpr = f.dpr; W = f.w; H = f.h;
      if (flakes.list.length && prevW === W) { flakes.W = W; flakes.H = H; return; }
      flakes.reset(W, H, clamp(Math.round(W * H / 12000 * opts.density), 20, 180));
    }
    function tick(now) {
      raf = 0;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now; t += dt;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      flakes.draw(g, t, dt, 6);
      if (visible) raf = global.requestAnimationFrame(tick);
    }
    document.addEventListener("visibilitychange", function () {
      visible = !document.hidden; last = 0;
      if (visible && !raf) raf = global.requestAnimationFrame(tick);
    });
    var timer = 0;
    global.addEventListener("resize", function () { clearTimeout(timer); timer = setTimeout(rebuild, 150); });
    rebuild();
    raf = global.requestAnimationFrame(tick);
  }

  global.Vinter = { scene: scene, snow: snow };
})(window);
