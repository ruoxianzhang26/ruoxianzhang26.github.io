/* V2 · Night Lab
   Progressive enhancement only: every piece of content is in the HTML and readable without this file. */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  root.classList.add("js");

  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var reduced = !!(motionQuery && motionQuery.matches);
  var hasIO = "IntersectionObserver" in window;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

  initHeader();
  initNavSpy();
  initCards();
  initGlow();
  initPubFilters();
  initCounters();
  initReveal();
  initRig();

  /* ---------------------------------------------------------------- header + menu */
  function initHeader() {
    var header = $(".site-header");
    var toggle = $(".nav-toggle");
    var nav = $("#site-nav");
    var year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
    if (!header) return;

    function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (!toggle || !nav) return;
    var label = $(".nav-toggle-label", toggle);
    function setMenu(open) {
      header.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      if (label) label.textContent = open ? "Close" : "Menu";
    }
    toggle.addEventListener("click", function () { setMenu(!header.classList.contains("nav-open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("nav-open")) { setMenu(false); toggle.focus(); }
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 960) setMenu(false); });
  }

  /* ---------------------------------------------------------------- section highlight */
  function initNavSpy() {
    if (!hasIO) return;
    var links = $$('.site-nav a[href^="#"]');
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    function setActive(id) {
      links.forEach(function (a) {
        var on = a === byId[id];
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
      });
    }
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id === "top" ? "" : entry.target.id);
      });
    }, { rootMargin: "-42% 0px -52% 0px" });
    $$("main section[id]").forEach(function (s) { spy.observe(s); });
  }

  /* ---------------------------------------------------------------- research cards */
  function initCards() {
    $$(".card").forEach(function (card) {
      var btn = $(".card-toggle", card);
      var more = $(".card-more", card);
      if (!btn || !more) return;
      var label = $(".card-toggle-label", btn);
      function set(open) {
        btn.setAttribute("aria-expanded", String(open));
        card.classList.toggle("is-open", open);
        if (label) label.textContent = open ? "Hide details" : "Show details";
      }
      card.classList.add("is-collapsible");
      btn.hidden = false;
      set(false);
      btn.addEventListener("click", function () { set(btn.getAttribute("aria-expanded") !== "true"); });
    });

    // Following an in-page link to a project opens its details
    function openFromHash() {
      var id = window.location.hash.slice(1);
      if (!id) return;
      var card = doc.getElementById(id);
      if (card && card.classList.contains("is-collapsible") && !card.classList.contains("is-open")) {
        var btn = $(".card-toggle", card);
        if (btn) btn.click();
      }
    }
    window.addEventListener("hashchange", openFromHash);
    openFromHash();
  }

  /* ---------------------------------------------------------------- pointer glow */
  function initGlow() {
    $$(".glow").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left).toFixed(1) + "px");
        el.style.setProperty("--my", (e.clientY - r.top).toFixed(1) + "px");
      });
    });
  }

  /* ---------------------------------------------------------------- publication filters */
  function initPubFilters() {
    var wrap = $(".filters");
    if (!wrap) return;
    var buttons = $$(".filter", wrap);
    var groups = $$(".pub-group");
    var status = $("#pub-status");
    var total = $$(".pub").length;
    wrap.hidden = false;

    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-filter");
        var shown = 0;
        buttons.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        groups.forEach(function (g) {
          var on = f === "all" || g.getAttribute("data-group") === f;
          var wasHidden = g.hidden;
          g.hidden = !on;
          if (on) {
            shown += $$(".pub", g).length;
            if (wasHidden && !reduced) {
              g.classList.remove("is-entering");
              void g.offsetWidth;
              g.classList.add("is-entering");
            }
          }
        });
        if (status) status.textContent = "Showing " + shown + " of " + total + " items.";
      });
    });
  }

  /* ---------------------------------------------------------------- count-up numbers */
  function initCounters() {
    var nums = $$("[data-count]");
    if (!nums.length || reduced || !hasIO) return;
    function fmt(el, v) { return v.toFixed(parseInt(el.getAttribute("data-decimals") || "0", 10)); }
    nums.forEach(function (el) { el.textContent = fmt(el, 0); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io.observe(el); });

    function run(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var dur = 1500, t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var e = 1 - Math.pow(1 - p, 4);
        el.textContent = fmt(el, target * e);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
  }

  /* ---------------------------------------------------------------- reveal on scroll */
  function initReveal() {
    if (reduced || !hasIO) return;
    var items = $$(".sec-head, .about-grid, .interests li, .stats, .timeline li, .path, .card, .earlier li, .pub, .course, .teach-lower, .school, .edu-lower > div, .contact-panel");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    var vh = window.innerHeight;
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh * 0.95) return;
      var parent = el.parentElement;
      var idx = parent ? Array.prototype.indexOf.call(parent.children, el) : 0;
      el.style.transitionDelay = (Math.min(idx, 4) * 70) + "ms";
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  /* ================================================================ HERO RIG */
  function initRig() {
    var fig = $("#rig");
    var view = $("#rig-view");
    var canvas = $("#pose-canvas");
    var stripBody = $("#strip-body");
    var sCanvas = $("#strip-canvas");
    if (!fig || !view || !canvas || !stripBody || !sCanvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var sctx = sCanvas.getContext("2d");
    if (!ctx || !sctx) return;

    fig.classList.add("is-live");
    $$("[data-js-only]", fig).forEach(function (el) { el.hidden = false; });

    var MONO = '"Geist Mono", ui-monospace, Menlo, Consolas, monospace';
    var ORANGE = "255,95,5";
    var ORANGE_T = "255,134,64";
    var CYAN = "90,209,230";
    var INK = "232,234,239";

    /* ------------------------------------------------ kinematics
       A standing long jump built from keyframed joint angles (upper body), a keyframed hip path
       with a ballistic flight phase, two-link IK that keeps the feet planted on the ground, and
       keyframed leg angles while airborne. Units: metres, seconds. x forward, y up, z = subject's left. */
    var DEG = Math.PI / 180;
    var T = 2.8;                      // loop length (s)
    var D = 2.4;                      // jump distance (m), a multiple of the 0.4 m floor grid
    var U_TO = 0.48, U_LAND = 0.69;   // take-off and landing, as fractions of the loop
    var LEN = { trunk: 0.5, thigh: 0.43, shank: 0.42, ankle: 0.08, ua: 0.29, fa: 0.27, neck: 0.235, headR: 0.105, shW: 0.185, hipW: 0.095 };

    function makeSpline(keys, cyclic, overrides) {
      var n = keys.length, nc = keys[0].length - 1, tan = [];
      for (var i = 0; i < n; i++) {
        tan[i] = [];
        for (var c = 1; c <= nc; c++) {
          if (overrides && overrides[i] && overrides[i][c] != null) { tan[i][c] = overrides[i][c]; continue; }
          var ip, inx, up, un;
          if (cyclic) {
            ip = i === 0 ? n - 2 : i - 1; inx = i === n - 1 ? 1 : i + 1;
            up = keys[ip][0] - (i === 0 ? 1 : 0); un = keys[inx][0] + (i === n - 1 ? 1 : 0);
          } else {
            ip = Math.max(0, i - 1); inx = Math.min(n - 1, i + 1); up = keys[ip][0]; un = keys[inx][0];
          }
          var u = keys[i][0], p = keys[i][c], pp = keys[ip][c], pn = keys[inx][c], m;
          if (ip === i || inx === i) m = (pn - pp) / (un - up);
          else {
            var s0 = (p - pp) / (u - up), s1 = (pn - p) / (un - u);
            if (s0 * s1 <= 0) m = 0;
            else {
              m = (pn - pp) / (un - up);
              var lim = 3 * Math.min(Math.abs(s0), Math.abs(s1));
              if (Math.abs(m) > lim) m = lim * (m > 0 ? 1 : -1);
            }
          }
          tan[i][c] = m;
        }
      }
      return function (u, out) {
        var i = 0;
        while (i < n - 2 && u >= keys[i + 1][0]) i++;
        var a = keys[i], b = keys[i + 1], du = b[0] - a[0];
        var s = clamp((u - a[0]) / du, 0, 1), s2 = s * s, s3 = s2 * s;
        var h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
        for (var c = 1; c <= nc; c++) out[c - 1] = h00 * a[c] + h10 * du * tan[i][c] + h01 * b[c] + h11 * du * tan[i + 1][c];
        return out;
      };
    }

    // upper body: u, trunk lean, shoulder flexion, elbow flexion, head tilt (degrees)
    var upper = makeSpline([
      [0.00, 4, 4, 12, 0],
      [0.14, 6, -12, 14, -2],
      [0.36, 50, -74, 10, -26],
      [0.43, 46, 70, 10, -18],
      [0.48, 38, 150, 8, -10],
      [0.53, 30, 158, 12, -8],
      [0.60, 26, 104, 20, -6],
      [0.655, 34, 62, 12, -10],
      [0.69, 38, 48, 12, -14],
      [0.77, 50, 76, 22, -22],
      [0.89, 16, 22, 16, -6],
      [1.00, 4, 4, 12, 0]
    ], true);

    // hip centre path; the take-off and landing tangents make the flight segment a true parabola
    var HIP_TO = [0.5, 0.88], HIP_LD = [D - 0.5, 0.62], APEX = 0.36, TF = U_LAND - U_TO;
    var VX = (HIP_LD[0] - HIP_TO[0]) / TF;
    var VY0 = (HIP_LD[1] - HIP_TO[1]) / TF + 4 * APEX / TF;
    var VY1 = (HIP_LD[1] - HIP_TO[1]) / TF - 4 * APEX / TF;
    var hipSpline = makeSpline([
      [0.00, 0.04, 0.925],
      [0.14, 0.03, 0.92],
      [0.36, -0.08, 0.6],
      [0.43, 0.2, 0.74],
      [U_TO, HIP_TO[0], HIP_TO[1]],
      [U_LAND, HIP_LD[0], HIP_LD[1]],
      [0.77, D - 0.12, 0.48],
      [0.89, D + 0.02, 0.86],
      [1.00, D + 0.04, 0.925]
    ], false, { 4: [null, VX, VY0], 5: [null, VX, VY1] });

    function ankleAt(u, out) {
      if (u < U_LAND) { var r = smooth(0.4, U_TO, u); out[0] = 0.03 * r; out[1] = LEN.ankle + 0.1 * r; }
      else { out[0] = D; out[1] = LEN.ankle; }
      return out;
    }

    var ikH = [0, 0], ikA = [0, 0];
    function legIK(u, out) {
      hipSpline(u, ikH); ankleAt(u, ikA);
      var dx = ikA[0] - ikH[0], dy = ikA[1] - ikH[1];
      var l1 = LEN.thigh, l2 = LEN.shank;
      var d = Math.min(Math.sqrt(dx * dx + dy * dy), l1 + l2 - 0.001);
      var base = Math.atan2(dx, -dy);
      var alpha = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
      var inner = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
      out[0] = base + alpha;          // thigh angle from straight down, positive = forward
      out[1] = Math.PI - inner;       // knee flexion
      return out;
    }

    var legFlight = (function () {
      var a = legIK(U_TO, [0, 0]), b = legIK(U_LAND, [0, 0]);
      return makeSpline([
        [U_TO, a[0], a[1]],
        [0.505, -20 * DEG, 12 * DEG],
        [0.55, 22 * DEG, 78 * DEG],
        [0.6, 72 * DEG, 125 * DEG],
        [0.652, 86 * DEG, 54 * DEG],
        [U_LAND, b[0], b[1]]
      ], false);
    })();

    // 21 points: COCO keypoints 0–16, then 17 head centre, 18 Fz, 19 Cz, 20 Pz
    var NP = 21;
    var UP = [0, 0, 0, 0], UPL = [0, 0, 0, 0], UPR = [0, 0, 0, 0], HP = [0, 0], LG = [0, 0];
    var C42 = Math.cos(42 * DEG), S42 = Math.sin(42 * DEG);
    function setP(o, i, x, y, z) { o[i * 3] = x; o[i * 3 + 1] = y; o[i * 3 + 2] = z; }

    function pose(time, out) {
      var cyc = Math.floor(time / T), u = time / T - cyc;
      upper(u, UP);
      upper((u + 0.007) % 1, UPL);
      upper((u + 0.994) % 1, UPR);
      hipSpline(u, HP);
      if (u > U_TO && u < U_LAND) legFlight(u, LG); else legIK(u, LG);
      var hx = HP[0] + cyc * D, hy = HP[1];
      var t = UP[0] * DEG;
      var sx = hx + Math.sin(t) * LEN.trunk, sy = hy + Math.cos(t) * LEN.trunk;
      var th = LG[0], sh = LG[0] - LG[1];
      for (var side = 0; side < 2; side++) {
        var zs = side === 0 ? 1 : -1;
        var kx = hx + LEN.thigh * Math.sin(th), ky = hy - LEN.thigh * Math.cos(th);
        var ax = kx + LEN.shank * Math.sin(sh), ay = ky - LEN.shank * Math.cos(sh);
        setP(out, 11 + side, hx, hy, zs * LEN.hipW);
        setP(out, 13 + side, kx, ky, zs * (LEN.hipW + 0.03));
        setP(out, 15 + side, ax, ay, zs * (LEN.hipW + 0.02));
        var A = side === 0 ? UPL : UPR;
        var al = (A[1] - A[0]) * DEG, el = al + A[2] * DEG;
        var abd = 0.04 + 0.06 * Math.max(0, Math.sin(al));
        var ex = sx + LEN.ua * Math.sin(al), ey = sy - LEN.ua * Math.cos(al);
        var wx = ex + LEN.fa * Math.sin(el), wy = ey - LEN.fa * Math.cos(el);
        setP(out, 5 + side, sx, sy, zs * LEN.shW);
        setP(out, 7 + side, ex, ey, zs * (LEN.shW + abd));
        setP(out, 9 + side, wx, wy, zs * (LEN.shW + abd * 1.3));
      }
      var ha = (UP[0] + UP[3]) * DEG, upx = Math.sin(ha), upy = Math.cos(ha), fx = upy, fy = -upx;
      var cx = sx + upx * LEN.neck, cy = sy + upy * LEN.neck, R = LEN.headR;
      setP(out, 17, cx, cy, 0);
      setP(out, 0, cx + fx * 0.1 - upx * 0.012, cy + fy * 0.1 - upy * 0.012, 0);
      setP(out, 1, cx + fx * 0.085 + upx * 0.03, cy + fy * 0.085 + upy * 0.03, 0.034);
      setP(out, 2, cx + fx * 0.085 + upx * 0.03, cy + fy * 0.085 + upy * 0.03, -0.034);
      setP(out, 3, cx - fx * 0.01 + upx * 0.01, cy - fy * 0.01 + upy * 0.01, 0.078);
      setP(out, 4, cx - fx * 0.01 + upx * 0.01, cy - fy * 0.01 + upy * 0.01, -0.078);
      setP(out, 18, cx + R * (upx * C42 + fx * S42), cy + R * (upy * C42 + fy * S42), 0);
      setP(out, 19, cx + R * upx, cy + R * upy, 0);
      setP(out, 20, cx + R * (upx * C42 - fx * S42), cy + R * (upy * C42 - fy * S42), 0);
      return out;
    }

    /* ------------------------------------------------ signals measured from the skeleton */
    var LUT_N = 720;
    var lutKnee = new Float32Array(LUT_N + 1);
    var lutHipY = new Float32Array(LUT_N + 1);
    var lutHipX = new Float32Array(LUT_N + 1);
    (function () {
      var p = new Float32Array(NP * 3), h = [0, 0];
      function kneeAngle(p, hip, knee, ank) {
        var ax = p[hip * 3] - p[knee * 3], ay = p[hip * 3 + 1] - p[knee * 3 + 1], az = p[hip * 3 + 2] - p[knee * 3 + 2];
        var bx = p[ank * 3] - p[knee * 3], by = p[ank * 3 + 1] - p[knee * 3 + 1], bz = p[ank * 3 + 2] - p[knee * 3 + 2];
        var c = (ax * bx + ay * by + az * bz) / (Math.sqrt(ax * ax + ay * ay + az * az) * Math.sqrt(bx * bx + by * by + bz * bz));
        return Math.acos(clamp(c, -1, 1)) / DEG;
      }
      for (var i = 0; i <= LUT_N; i++) {
        var u = i / LUT_N;
        pose(Math.min(u, 0.99999) * T, p);
        lutKnee[i] = (kneeAngle(p, 11, 13, 15) + kneeAngle(p, 12, 14, 16)) / 2;
        lutHipY[i] = (p[11 * 3 + 1] + p[12 * 3 + 1]) / 2;
        lutHipX[i] = hipSpline(u, h)[0];
      }
    })();
    function lut(arr, u) {
      var f = u * LUT_N, i = Math.floor(f), r = f - i;
      if (i >= LUT_N) return arr[LUT_N];
      return arr[i] + (arr[i + 1] - arr[i]) * r;
    }
    function phaseU(tau) { var u = tau / T; return u - Math.floor(u); }
    function kneeAt(tau) { return lut(lutKnee, phaseU(tau)); }
    function hipYAt(tau) { return lut(lutHipY, phaseU(tau)); }

    // camera drift: constant speed plus a little follow, seamless across loops
    var C0 = 0;
    for (var ci = 0; ci < LUT_N; ci++) C0 += lutHipX[ci] - D * (ci / LUT_N);
    C0 /= LUT_N;
    var FOLLOW = 0.3;

    /* ------------------------------------------------ illustrative EEG (clearly labelled as such) */
    function hash1(n) { var x = Math.sin(n * 12.9898 + 4.1414) * 43758.5453; return x - Math.floor(x); }
    function vnoise(x) {
      var i = Math.floor(x), f = x - i;
      f = f * f * (3 - 2 * f);
      var a = hash1(i), b = hash1(i + 1);
      return a + (b - a) * f;
    }
    var EEG = [
      { seed: 11, fa: 9.6, rp: 0.34, land: 0.34 },
      { seed: 37, fa: 10.2, rp: 0.56, land: 0.24 },
      { seed: 73, fa: 10.8, rp: 0.28, land: 0.44 }
    ];
    // pink-ish background noise from several octaves of value noise
    var OCT_F = [1.9, 5.3, 13, 31, 67], OCT_A = [0.55, 0.45, 0.34, 0.24, 0.14];
    function eeg(c, tau) {
      var p = EEG[c], u = phaseU(tau);
      var moving = smooth(0.26, 0.38, u) * (1 - smooth(0.78, 0.9, u));
      var wax = vnoise(tau * 0.85 + p.seed);
      var alpha = (1 - 0.65 * moving) * (0.15 + 0.85 * wax * wax) * Math.sin(2 * Math.PI * p.fa * tau + p.seed);
      var theta = 0.28 * vnoise(tau * 0.6 + p.seed * 3) * Math.sin(2 * Math.PI * 5.6 * tau + p.seed * 1.3);
      var beta = (0.1 + 0.16 * moving) * Math.sin(2 * Math.PI * 21 * tau + p.seed * 2.1) * vnoise(tau * 2.4 + p.seed);
      var pink = 0;
      for (var o = 0; o < OCT_F.length; o++) pink += (vnoise(tau * OCT_F[o] + p.seed * (o + 2)) - 0.5) * OCT_A[o];
      var build = smooth(0.1, 0.46, u) * (1 - smooth(0.47, 0.57, u));
      var dl = (u - U_LAND) * T;
      var land = dl > 0 ? p.land * Math.exp(-dl / 0.12) * Math.sin(2 * Math.PI * 5 * dl) : 0;
      return clamp((alpha * 0.85 + theta + beta + pink * 1.3) * 0.5 - p.rp * build + land, -1.25, 1.25);
    }

    var CHANNELS = [
      { id: "fz", kind: "eeg", fn: function (t) { return eeg(0, t); } },
      { id: "cz", kind: "eeg", fn: function (t) { return eeg(1, t); } },
      { id: "pz", kind: "eeg", fn: function (t) { return eeg(2, t); } },
      { id: "knee", kind: "move", fn: function (t) { return (kneeAt(t) - 118) / 62; } },
      { id: "hip", kind: "move", fn: function (t) { return (hipYAt(t) - 0.79) / 0.33; } }
    ];
    var EEG_POINT = { fz: 18, cz: 19, pz: 20 };
    var EEG_NAME = { fz: "Fz", cz: "Cz", pz: "Pz" };
    var PHASES = [[0, "Ready"], [0.16, "Load"], [0.4, "Push-off"], [0.48, "Flight"], [0.69, "Landing"], [0.8, "Recover"]];
    function phaseName(u) {
      var name = PHASES[0][1];
      for (var i = 0; i < PHASES.length; i++) if (u >= PHASES[i][0]) name = PHASES[i][1];
      return name;
    }

    /* ------------------------------------------------ state */
    var YAW0 = -0.5, YAW_MIN = -1.15, YAW_MAX = 0.12, AUTO_SPEED = 0.09;
    var state = {
      time: reduced ? T * 1.56 : T * 1.3,
      playing: !reduced,
      speed: 1,
      yaw: YAW0,
      yawVel: 0,
      yawTarget: null,
      autoDir: -1,
      lastInteract: -1e9,
      hover: null,
      pin: null
    };
    var dirty = true;
    function markDirty() { dirty = true; }
    function activeChan() { return state.hover || state.pin; }

    /* ------------------------------------------------ camera + projection */
    var CAM = { x: 0, y: 0.98, dist: 4.2, f: 400, cx: 0, cy: 0, c: 1, s: 0, cp: Math.cos(0.2), sp: Math.sin(0.2) };
    function setCamera(time) {
      var cyc = Math.floor(time / T), u = time / T - cyc;
      var lin = D * u + C0;
      CAM.x = cyc * D + lin + (lut(lutHipX, u) - lin) * FOLLOW;
      CAM.c = Math.cos(state.yaw);
      CAM.s = Math.sin(state.yaw);
    }
    function project(x, y, z, out, o) {
      var dx = x - CAM.x, dy = y - CAM.y;
      var x1 = dx * CAM.c - z * CAM.s;
      var z1 = dx * CAM.s + z * CAM.c;
      var y2 = dy * CAM.cp + z1 * CAM.sp;
      var z2 = -dy * CAM.sp + z1 * CAM.cp;
      var depth = Math.max(0.3, CAM.dist + z2);
      var k = CAM.f / depth;
      out[o] = CAM.cx + x1 * k;
      out[o + 1] = CAM.cy - y2 * k;
      out[o + 2] = k;
    }
    function projectPose(p, out) {
      for (var i = 0; i < NP; i++) project(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], out, i * 3);
    }

    /* ------------------------------------------------ sizes */
    var dpr = 1, vw = 1, vh = 1, sw = 1, sh = 1;
    var lanes = {}, laneX0 = 120, phaseRow = { top: 0, h: 24 }, lanesTop = 0, lanesBottom = 0, brainTextRight = 0, groupBrain = { top: 0, h: 24 };
    var laneBtns = $$(".lane", stripBody);
    var kneeVal = $('.lane[data-chan="knee"] .lane-val', stripBody);
    var hipVal = $('.lane[data-chan="hip"] .lane-val', stripBody);
    var hudPhase = $("#hud-phase"), hudTime = $("#hud-time");

    function measureLanes() {
      var br = stripBody.getBoundingClientRect();
      lanesTop = Infinity; lanesBottom = 0;
      laneBtns.forEach(function (b) {
        var r = b.getBoundingClientRect();
        var top = r.top - br.top;
        lanes[b.getAttribute("data-chan")] = { top: top, h: r.height };
        lanesTop = Math.min(lanesTop, top);
        lanesBottom = Math.max(lanesBottom, top + r.height);
      });
      var lab = $(".lane-label", stripBody);
      if (lab) laneX0 = lab.getBoundingClientRect().right - br.left + 4;
      var ph = $(".lane-phase", stripBody);
      if (ph) { var pr = ph.getBoundingClientRect(); phaseRow = { top: pr.top - br.top, h: pr.height }; }
      var gb = $(".lane-group-brain", stripBody);
      if (gb) {
        var gr = gb.getBoundingClientRect();
        groupBrain = { top: gr.top - br.top, h: gr.height };
        var last = gb.lastElementChild;
        brainTextRight = last ? last.getBoundingClientRect().right - br.left : 0;
      }
    }

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      var r = view.getBoundingClientRect();
      vw = Math.max(1, r.width); vh = Math.max(1, r.height);
      canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
      var s = stripBody.getBoundingClientRect();
      sw = Math.max(1, s.width); sh = Math.max(1, s.height);
      sCanvas.width = Math.round(sw * dpr); sCanvas.height = Math.round(sh * dpr);
      CAM.f = Math.min(vh * 1.5, vw * 0.95);
      CAM.cx = vw * 0.5;
      CAM.cy = vh * 0.52;
      measureLanes();
      draw();
    }

    /* ------------------------------------------------ glow sprites */
    function sprite(rgb) {
      var c = doc.createElement("canvas");
      c.width = c.height = 64;
      var g = c.getContext("2d");
      var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(" + rgb + ",0.95)");
      grad.addColorStop(0.25, "rgba(" + rgb + ",0.4)");
      grad.addColorStop(1, "rgba(" + rgb + ",0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return c;
    }
    var GLOW_O = sprite(ORANGE), GLOW_C = sprite(CYAN);

    /* ------------------------------------------------ pose canvas drawing */
    var cur = new Float32Array(NP * 3), tmp = new Float32Array(NP * 3);
    var scr = new Float32Array(NP * 3), gscr = new Float32Array(NP * 3);
    var P6 = new Float32Array(6);
    var BONES = [[15, 13], [13, 11], [16, 14], [14, 12], [11, 12], [5, 11], [6, 12], [5, 6], [5, 7], [7, 9], [6, 8], [8, 10]];
    var FACE = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6]];
    var TRAIL_J = [9, 10, 15, 16], TRAIL_N = 16, TRAIL_DT = 0.025;
    var trail = new Float32Array(TRAIL_N * TRAIL_J.length * 3);
    var GX = 3.6, GZ = 2.4, GRID = 0.4, SEG = 10;
    var hintGone = false;
    var buckets = [[], [], [], [], []];

    function gridLine(xa, za, xb, zb) {
      for (var i = 0; i < SEG; i++) {
        var t0 = i / SEG, t1 = (i + 1) / SEG;
        var ax = xa + (xb - xa) * t0, az = za + (zb - za) * t0;
        var bx = xa + (xb - xa) * t1, bz = za + (zb - za) * t1;
        var mx = ((ax + bx) / 2 - CAM.x) / GX, mz = ((az + bz) / 2) / GZ;
        var r = Math.sqrt(mx * mx + mz * mz);
        if (r >= 1) continue;
        var a = (1 - r) * (1 - r);
        project(ax, 0, az, P6, 0);
        project(bx, 0, bz, P6, 3);
        buckets[Math.min(4, Math.floor(a * 5))].push(P6[0], P6[1], P6[3], P6[4]);
      }
    }

    function drawFloor() {
      var b, i;
      for (b = 0; b < 5; b++) buckets[b].length = 0;
      var k0 = Math.ceil((CAM.x - GX) / GRID), k1 = Math.floor((CAM.x + GX) / GRID);
      for (var k = k0; k <= k1; k++) gridLine(k * GRID, -GZ, k * GRID, GZ);
      var j0 = Math.round(GZ / GRID);
      for (var j = -j0; j <= j0; j++) gridLine(CAM.x - GX, j * GRID, CAM.x + GX, j * GRID);
      ctx.lineWidth = 1;
      for (b = 0; b < 5; b++) {
        var arr = buckets[b];
        if (!arr.length) continue;
        ctx.strokeStyle = "rgba(" + INK + "," + (0.025 + b * 0.028).toFixed(3) + ")";
        ctx.beginPath();
        for (i = 0; i < arr.length; i += 4) { ctx.moveTo(arr[i], arr[i + 1]); ctx.lineTo(arr[i + 2], arr[i + 3]); }
        ctx.stroke();
      }

      // take-off lines (one per jump; each landing arrives at the next line)
      var m0 = Math.floor((CAM.x - GX) / D), m1 = Math.ceil((CAM.x + GX) / D);
      ctx.font = "500 10px " + MONO;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (var m = m0; m <= m1; m++) {
        var lx = m * D + 0.12;
        var fade = 1 - Math.abs(lx - CAM.x) / GX;
        if (fade <= 0) continue;
        project(lx, 0, -0.55, P6, 0);
        project(lx, 0, 0.55, P6, 3);
        ctx.strokeStyle = "rgba(" + ORANGE + "," + (0.6 * fade).toFixed(3) + ")";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(P6[0], P6[1]); ctx.lineTo(P6[3], P6[4]); ctx.stroke();
        var nearZ = P6[2] > P6[5] ? -0.78 : 0.78;
        project(lx, 0, nearZ, P6, 0);
        var half = ctx.measureText("take-off line").width / 2;
        if (P6[0] - half < 6 || P6[0] + half > vw - 6 || P6[1] > vh - 8) continue;
        if (!hintGone && P6[0] - half < 220 && P6[1] > vh - 52) continue;   // keep clear of the drag hint
        ctx.fillStyle = "rgba(" + ORANGE_T + "," + (0.85 * fade).toFixed(3) + ")";
        ctx.fillText("take-off line", P6[0], P6[1] + 6);
      }
    }

    function drawShadow(p) {
      var hx = (p[33] + p[36]) / 2, hy = (p[34] + p[37]) / 2;
      project(hx, 0, 0, P6, 0);
      var air = clamp((hy - 0.6) / 0.6, 0, 1);
      var r = 0.42 * P6[2] * (1 - 0.35 * air);
      var a = 0.32 * (1 - 0.6 * air);
      ctx.save();
      ctx.translate(P6[0], P6[1]);
      ctx.scale(1, 0.28);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, "rgba(" + ORANGE + "," + (a * 0.55).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + ORANGE + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function addBones(s, list) {
      for (var i = 0; i < list.length; i++) {
        var a = list[i][0] * 3, b = list[i][1] * 3;
        ctx.moveTo(s[a], s[a + 1]);
        ctx.lineTo(s[b], s[b + 1]);
      }
    }

    function strokeBonesByDepth(s, kRef) {
      // two passes: limbs farther from the camera are dimmer, which reads as depth
      for (var pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (var i = 0; i < BONES.length; i++) {
          var a = BONES[i][0] * 3, b = BONES[i][1] * 3;
          var near = (s[a + 2] + s[b + 2]) * 0.5 >= kRef;
          if ((pass === 1) !== near) continue;
          ctx.moveTo(s[a], s[a + 1]);
          ctx.lineTo(s[b], s[b + 1]);
        }
        ctx.strokeStyle = "rgba(" + INK + "," + (pass ? 0.88 : 0.42) + ")";
        ctx.lineWidth = pass ? 1.9 : 1.5;
        ctx.stroke();
      }
      ctx.beginPath();
      addBones(s, FACE);
      ctx.strokeStyle = "rgba(" + INK + ",0.32)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function tag(x, y, text, rgb, dx, dy) {
      ctx.font = "500 11px " + MONO;
      var w = ctx.measureText(text).width + 16, h = 22;
      var tx = x + dx, ty = y + dy - h / 2;
      if (dx < 0) tx -= w;
      if (tx + w > vw - 6) tx = x - Math.abs(dx) - w;
      if (tx < 6) tx = x + Math.abs(dx);
      tx = clamp(tx, 6, vw - w - 6);
      ty = clamp(ty, 6, vh - h - 6);
      var lx = tx < x ? tx + w : tx;
      ctx.strokeStyle = "rgba(" + rgb + ",0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ty + h / 2); ctx.stroke();
      ctx.fillStyle = "rgba(11,15,23,0.9)";
      roundRect(tx, ty, w, h, 6); ctx.fill();
      ctx.strokeStyle = "rgba(" + rgb + ",0.75)";
      roundRect(tx + 0.5, ty + 0.5, w - 1, h - 1, 6); ctx.stroke();
      ctx.fillStyle = "rgb(" + rgb + ")";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, tx + 8, ty + h / 2 + 0.5);
    }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function ring(x, y, r, rgb, a) {
      ctx.strokeStyle = "rgba(" + rgb + "," + a + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }

    function drawPose() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      var t = state.time, act = activeChan();
      var kRef = CAM.f / CAM.dist;
      var i, j, g;

      pose(t, cur);
      drawFloor();
      drawShadow(cur);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // afterimages
      for (g = 3; g >= 1; g--) {
        pose(t - g * 0.11, tmp);
        projectPose(tmp, gscr);
        ctx.beginPath();
        addBones(gscr, BONES);
        ctx.strokeStyle = "rgba(" + ORANGE_T + "," + (0.2 - g * 0.05).toFixed(3) + ")";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // short motion trails for hands and feet
      for (i = 0; i < TRAIL_N; i++) {
        pose(t - i * TRAIL_DT, tmp);
        for (j = 0; j < TRAIL_J.length; j++) {
          var q = TRAIL_J[j] * 3;
          project(tmp[q], tmp[q + 1], tmp[q + 2], trail, (i * TRAIL_J.length + j) * 3);
        }
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "butt";
      for (j = 0; j < TRAIL_J.length; j++) {
        for (i = 1; i < TRAIL_N; i++) {
          var o0 = ((i - 1) * TRAIL_J.length + j) * 3, o1 = (i * TRAIL_J.length + j) * 3;
          var f = 1 - i / TRAIL_N;
          ctx.strokeStyle = "rgba(" + ORANGE + "," + (0.55 * f).toFixed(3) + ")";
          ctx.lineWidth = 0.6 + 2.2 * f;
          ctx.beginPath(); ctx.moveTo(trail[o0], trail[o0 + 1]); ctx.lineTo(trail[o1], trail[o1 + 1]); ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";

      projectPose(cur, scr);
      strokeBonesByDepth(scr, kRef);

      // highlighted limb segments
      if (act === "knee") {
        ctx.beginPath(); addBones(scr, [[11, 13], [13, 15], [12, 14], [14, 16]]);
        ctx.strokeStyle = "rgba(" + ORANGE_T + ",0.95)"; ctx.lineWidth = 2.4; ctx.stroke();
      }

      // head outline
      var hk = scr[17 * 3 + 2];
      ctx.strokeStyle = "rgba(" + INK + ",0.38)";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(scr[51], scr[52], LEN.headR * hk, 0, Math.PI * 2); ctx.stroke();

      // joints: glow then core
      ctx.globalCompositeOperation = "lighter";
      for (i = 0; i < 17; i++) {
        var s = scr[i * 3 + 2] / kRef;
        var gr = (i < 5 ? 7 : 12) * s;
        ctx.globalAlpha = i < 5 ? 0.5 : 0.8;
        ctx.drawImage(GLOW_O, scr[i * 3] - gr, scr[i * 3 + 1] - gr, gr * 2, gr * 2);
      }
      for (i = 18; i <= 20; i++) {
        var gc = 10 * scr[i * 3 + 2] / kRef;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(GLOW_C, scr[i * 3] - gc, scr[i * 3 + 1] - gc, gc * 2, gc * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      for (i = 0; i < 17; i++) {
        var rs = scr[i * 3 + 2] / kRef;
        ctx.fillStyle = i < 5 ? "rgba(255,190,150,0.9)" : "#ffd3b8";
        ctx.beginPath(); ctx.arc(scr[i * 3], scr[i * 3 + 1], (i < 5 ? 1.5 : 2.5) * rs, 0, Math.PI * 2); ctx.fill();
      }
      for (i = 18; i <= 20; i++) {
        ctx.fillStyle = "#c9f3fa";
        ctx.beginPath(); ctx.arc(scr[i * 3], scr[i * 3 + 1], 2.3 * scr[i * 3 + 2] / kRef, 0, Math.PI * 2); ctx.fill();
      }

      if (act) drawHighlight(act, t);
    }

    function drawHighlight(act, t) {
      var pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(performance.now() / 260);
      var x, y;
      if (EEG_POINT[act] !== undefined) {
        var e = EEG_POINT[act] * 3;
        x = scr[e]; y = scr[e + 1];
        ring(x, y, 7 + pulse * 3, CYAN, 0.9);
        ring(x, y, 13 + pulse * 5, CYAN, 0.25 * (1 - pulse) + 0.1);
        tag(x, y, EEG_NAME[act] + " electrode · EEG", CYAN, 30, -30);
      } else if (act === "knee") {
        // angle wedge at the knee nearer the camera
        var kn = scr[13 * 3 + 2] >= scr[14 * 3 + 2] ? 13 : 14;
        var hp = kn - 2, an = kn + 2;
        x = scr[kn * 3]; y = scr[kn * 3 + 1];
        var a1 = Math.atan2(scr[hp * 3 + 1] - y, scr[hp * 3] - x);
        var a2 = Math.atan2(scr[an * 3 + 1] - y, scr[an * 3] - x);
        var d = a2 - a1;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        ctx.fillStyle = "rgba(" + ORANGE + ",0.18)";
        ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 18, a1, a1 + d, d < 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(" + ORANGE_T + ",0.95)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 18, a1, a1 + d, d < 0); ctx.stroke();
        var other = kn === 13 ? 14 : 13;
        ring(scr[other * 3], scr[other * 3 + 1], 6 + pulse * 2, ORANGE_T, 0.6);
        ring(x, y, 6 + pulse * 2, ORANGE_T, 0.9);
        tag(x, y, "Knee angle " + Math.round(kneeAt(t)) + "°", ORANGE_T, 30, 26);
      } else if (act === "hip") {
        var hx = (cur[33] + cur[36]) / 2, hy = (cur[34] + cur[37]) / 2, hz = (cur[35] + cur[38]) / 2;
        project(hx, hy, hz, P6, 0);
        project(hx, 0, hz, P6, 3);
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = "rgba(" + ORANGE_T + ",0.9)";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(P6[0], P6[1]); ctx.lineTo(P6[3], P6[4]); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(P6[3] - 7, P6[4]); ctx.lineTo(P6[3] + 7, P6[4]); ctx.stroke();
        ring(P6[0], P6[1], 7 + pulse * 3, ORANGE_T, 0.9);
        tag(P6[0], (P6[1] + P6[4]) / 2, "Hip height " + hipYAt(t).toFixed(2) + " m", ORANGE_T, -26, 0);
      }
    }

    /* ------------------------------------------------ recording strip drawing */
    var WPAST = 2.9, PLAY_AT = 0.8;

    function drawStrip() {
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.clearRect(0, 0, sw, sh);
      var x0 = laneX0, x1 = sw - 4;
      if (x1 - x0 < 40) return;
      var xp = x0 + (x1 - x0) * PLAY_AT;
      var pps = (xp - x0) / WPAST;
      var t = state.time, tL = t - WPAST, tR = t + (x1 - xp) / pps;
      var act = activeChan();
      var i, c, x;

      // lane guides
      sctx.lineWidth = 1;
      CHANNELS.forEach(function (ch) {
        var L = lanes[ch.id];
        if (!L) return;
        var mid = Math.round(L.top + L.h / 2) + 0.5;
        if (act === ch.id) {
          sctx.fillStyle = ch.kind === "eeg" ? "rgba(" + CYAN + ",0.07)" : "rgba(" + ORANGE + ",0.07)";
          sctx.fillRect(x0, L.top, x1 - x0, L.h);
        }
        sctx.strokeStyle = "rgba(255,255,255,0.05)";
        sctx.beginPath(); sctx.moveTo(x0, mid); sctx.lineTo(x1, mid); sctx.stroke();
      });

      // time ticks every 0.5 s
      sctx.strokeStyle = "rgba(255,255,255,0.045)";
      sctx.beginPath();
      for (var tk = Math.ceil(tL / 0.5) * 0.5; tk <= tR; tk += 0.5) {
        x = Math.round(xp + (tk - t) * pps) + 0.5;
        sctx.moveTo(x, lanesTop); sctx.lineTo(x, lanesBottom);
      }
      sctx.stroke();

      // jump phases
      sctx.font = "500 9.5px " + MONO;
      sctx.textBaseline = "middle";
      sctx.textAlign = "center";
      var c0 = Math.floor(tL / T), c1 = Math.floor(tR / T);
      var py = phaseRow.top + 3, ph = phaseRow.h - 6;
      for (c = c0; c <= c1; c++) {
        for (i = 0; i < PHASES.length; i++) {
          var ua = PHASES[i][0], ub = i + 1 < PHASES.length ? PHASES[i + 1][0] : 1;
          var xa = xp + ((c + ua) * T - t) * pps, xb = xp + ((c + ub) * T - t) * pps;
          var a = Math.max(xa, x0), b = Math.min(xb, x1);
          if (b - a < 1) continue;
          var flight = i === 3;
          sctx.fillStyle = flight ? "rgba(" + ORANGE + ",0.2)" : (i % 2 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)");
          sctx.fillRect(a, py, Math.max(0, b - a - 1), ph);
          var label = PHASES[i][1], tw = sctx.measureText(label).width;
          if (b - a > tw + 8) {
            sctx.fillStyle = flight ? "rgba(" + ORANGE_T + ",0.95)" : "rgba(195,200,210,0.8)";
            sctx.fillText(label, clamp((xa + xb) / 2, a + tw / 2 + 4, b - tw / 2 - 4), py + ph / 2 + 0.5);
          }
        }
        // take-off and landing markers across all lanes
        [U_TO, U_LAND].forEach(function (ev) {
          var xm = Math.round(xp + ((c + ev) * T - t) * pps) + 0.5;
          if (xm < x0 || xm > x1) return;
          sctx.strokeStyle = "rgba(" + ORANGE + ",0.35)";
          sctx.setLineDash([2, 3]);
          sctx.beginPath(); sctx.moveTo(xm, lanesTop); sctx.lineTo(xm, phaseRow.top + phaseRow.h); sctx.stroke();
          sctx.setLineDash([]);
        });
      }

      // traces up to the playhead
      CHANNELS.forEach(function (ch) {
        var L = lanes[ch.id];
        if (!L) return;
        var mid = L.top + L.h / 2, amp = L.h * 0.4;
        var isAct = act === ch.id;
        var rgb = ch.kind === "eeg" ? CYAN : ORANGE;
        var dtau = (ch.kind === "eeg" ? 1 : 2) / pps;
        var k0 = Math.ceil(tL / dtau), k1 = Math.floor(t / dtau);
        sctx.beginPath();
        for (var k = k0; k <= k1; k++) {
          var tau = k * dtau;
          var xx = xp - (t - tau) * pps, yy = mid - ch.fn(tau) * amp;
          if (k === k0) sctx.moveTo(xx, yy); else sctx.lineTo(xx, yy);
        }
        var vNow = ch.fn(t);
        sctx.lineTo(xp, mid - vNow * amp);
        sctx.strokeStyle = "rgba(" + rgb + "," + (act ? (isAct ? 1 : 0.28) : 0.9) + ")";
        sctx.lineWidth = isAct ? 1.9 : (ch.kind === "eeg" ? 1.1 : 1.5);
        sctx.lineJoin = "round";
        sctx.stroke();
        // live point
        sctx.fillStyle = "rgba(" + rgb + "," + (act && !isAct ? 0.4 : 1) + ")";
        sctx.beginPath(); sctx.arc(xp, mid - vNow * amp, isAct ? 3.2 : 2.4, 0, Math.PI * 2); sctx.fill();
      });

      // the not-yet-recorded side of the strip
      sctx.fillStyle = "rgba(11,15,23,0.55)";
      sctx.fillRect(xp + 1, lanesTop, x1 - xp, phaseRow.top + phaseRow.h - lanesTop);

      // playhead
      var top = groupBrain.top + groupBrain.h * 0.5 + 7;
      sctx.strokeStyle = "rgba(" + INK + ",0.8)";
      sctx.lineWidth = 1;
      sctx.beginPath(); sctx.moveTo(Math.round(xp) + 0.5, top); sctx.lineTo(Math.round(xp) + 0.5, phaseRow.top + phaseRow.h); sctx.stroke();
      if (xp - 22 > brainTextRight) {
        sctx.fillStyle = "rgba(" + INK + ",0.85)";
        sctx.font = "500 9.5px " + MONO;
        sctx.textAlign = "center";
        sctx.fillText("now", xp, groupBrain.top + groupBrain.h * 0.5 - 1);
      }
    }

    /* ------------------------------------------------ readouts */
    var lastPhase = "", lastTime = "", lastKnee = "", lastHip = "";
    function updateReadouts() {
      var u = phaseU(state.time);
      var p = phaseName(u);
      if (p !== lastPhase && hudPhase) { hudPhase.textContent = p; lastPhase = p; }
      var ts = (u * T).toFixed(2) + " s of " + T.toFixed(1) + " s";
      if (ts !== lastTime && hudTime) { hudTime.textContent = ts; lastTime = ts; }
      var kv = Math.round(kneeAt(state.time)) + "°";
      if (kv !== lastKnee && kneeVal) { kneeVal.textContent = kv; lastKnee = kv; }
      var hv = hipYAt(state.time).toFixed(2) + " m";
      if (hv !== lastHip && hipVal) { hipVal.textContent = hv; lastHip = hv; }
    }

    function draw() {
      setCamera(state.time);
      drawPose();
      drawStrip();
      updateReadouts();
      dirty = false;
    }

    /* ------------------------------------------------ animation loop */
    var running = false, raf = 0, lastTs = 0, inView = true, pageVisible = !doc.hidden;
    var drag = null;

    function updateCamera(dt, now) {
      var before = state.yaw;
      if (drag) return false;
      if (state.yawTarget !== null) {
        state.yaw += (state.yawTarget - state.yaw) * Math.min(1, dt * 7);
        state.yawVel = 0;
        if (Math.abs(state.yawTarget - state.yaw) < 0.0008) { state.yaw = state.yawTarget; state.yawTarget = null; }
      } else {
        var idle = state.playing && !reduced && now - state.lastInteract > 2600;
        var target = idle ? state.autoDir * AUTO_SPEED : 0;
        state.yawVel += (target - state.yawVel) * Math.min(1, dt * (idle ? 0.7 : 2.6));
        if (Math.abs(state.yawVel) < 1e-4 && !idle) state.yawVel = 0;
        state.yaw += state.yawVel * dt;
        if (idle) {
          if (state.yaw < YAW_MIN) state.autoDir = 1;
          else if (state.yaw > YAW_MAX) state.autoDir = -1;
        }
      }
      return Math.abs(state.yaw - before) > 1e-6;
    }

    function frame(ts) {
      raf = 0;
      if (!running) return;
      var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
      lastTs = ts;
      var changed = false;
      if (state.playing && dt > 0) { state.time += dt * state.speed; changed = true; }
      if (updateCamera(dt, ts)) changed = true;
      if (activeChan() && !reduced) changed = true;   // pulsing highlight ring
      if (changed || dirty) draw();
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running) return;
      running = true; lastTs = 0;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    function sync() { if (inView && pageVisible) start(); else stop(); }

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        inView = entries[entries.length - 1].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(fig);
    }
    doc.addEventListener("visibilitychange", function () { pageVisible = !doc.hidden; sync(); });

    /* ------------------------------------------------ controls */
    var playBtn = $("#ctl-play");
    var playLabel = playBtn ? $(".ctl-label", playBtn) : null;
    var resetBtn = $("#ctl-reset");
    var speedBtns = $$(".seg-btn", fig);

    function setPlaying(p) {
      state.playing = p;
      fig.classList.toggle("is-paused", !p);
      if (playLabel) playLabel.textContent = p ? "Pause" : "Play";
      markDirty();
    }
    function setSpeed(s) {
      state.speed = s;
      speedBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(parseFloat(b.getAttribute("data-speed")) === s)); });
    }
    function rotated() {
      state.lastInteract = performance.now();
      fig.classList.add("has-rotated");
      hintGone = true;
    }

    if (playBtn) playBtn.addEventListener("click", function () { setPlaying(!state.playing); });
    speedBtns.forEach(function (b) {
      b.addEventListener("click", function () { setSpeed(parseFloat(b.getAttribute("data-speed"))); });
    });
    if (resetBtn) resetBtn.addEventListener("click", function () {
      state.yawTarget = YAW0;
      state.yawVel = 0;
      state.lastInteract = performance.now();
      markDirty();
    });

    fig.addEventListener("keydown", function (e) {
      var isSpace = e.key === " " || e.key === "Spacebar";
      if (isSpace && !e.target.closest("button, a, input, select, textarea")) {
        e.preventDefault();
        setPlaying(!state.playing);
      }
    });
    view.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      var base = state.yawTarget !== null ? state.yawTarget : state.yaw;
      state.yawTarget = base + (e.key === "ArrowLeft" ? 0.25 : -0.25);
      rotated();
      markDirty();
    });

    // drag to orbit around the vertical axis
    view.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, t: performance.now(), v: 0 };
      state.yawTarget = null;
      state.yawVel = 0;
      try { view.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
      view.classList.add("is-dragging");
      rotated();
    });
    view.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var now = performance.now();
      var dx = e.clientX - drag.x;
      var dts = Math.max(8, now - drag.t) / 1000;
      drag.x = e.clientX; drag.t = now;
      var dyaw = -dx * 0.0085;
      state.yaw += dyaw;
      drag.v = drag.v * 0.5 + (dyaw / dts) * 0.5;
      rotated();
      markDirty();
      if (!running) draw();
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var idleFor = performance.now() - drag.t;
      state.yawVel = idleFor > 120 ? 0 : clamp(drag.v, -3, 3);
      drag = null;
      view.classList.remove("is-dragging");
      rotated();
    }
    view.addEventListener("pointerup", endDrag);
    view.addEventListener("pointercancel", endDrag);
    view.addEventListener("lostpointercapture", endDrag);

    // channel lanes: hover or focus to highlight, click or tap to pin
    function syncLanes() {
      var act = activeChan();
      laneBtns.forEach(function (b) {
        var id = b.getAttribute("data-chan");
        b.classList.toggle("is-active", id === act);
        b.classList.toggle("is-dim", !!act && id !== act);
        b.setAttribute("aria-pressed", String(state.pin === id));
      });
      markDirty();
      if (!running) draw();
    }
    laneBtns.forEach(function (b) {
      var id = b.getAttribute("data-chan");
      b.addEventListener("pointerenter", function (e) { if (e.pointerType !== "touch") { state.hover = id; syncLanes(); } });
      b.addEventListener("pointerleave", function (e) { if (e.pointerType !== "touch" && state.hover === id) { state.hover = null; syncLanes(); } });
      b.addEventListener("focus", function () {
        var keyboard = true;
        try { keyboard = b.matches(":focus-visible"); } catch (err) { keyboard = true; }
        if (keyboard) { state.hover = id; syncLanes(); }
      });
      b.addEventListener("blur", function () { if (state.hover === id) { state.hover = null; syncLanes(); } });
      b.addEventListener("click", function () { state.pin = state.pin === id ? null : id; syncLanes(); });
    });

    if (motionQuery) {
      var onMotion = function (e) {
        reduced = e.matches;
        if (reduced) setPlaying(false);
        markDirty();
      };
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotion);
      else if (motionQuery.addListener) motionQuery.addListener(onMotion);
    }

    /* ------------------------------------------------ boot */
    setPlaying(state.playing);
    setSpeed(1);
    if ("ResizeObserver" in window) {
      var pending = 0;
      var ro = new ResizeObserver(function () {
        if (pending) return;
        pending = requestAnimationFrame(function () { pending = 0; resize(); });
      });
      ro.observe(view);
      ro.observe(stripBody);
    } else {
      window.addEventListener("resize", resize);
    }
    resize();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { measureLanes(); markDirty(); if (!running) draw(); });
    sync();
  }
})();

// ---------------------------------------------------------------
// Fig. 2: pose-keypoint figure performing the standing long jump
// (scrub with the pointer, play/pause, phase labels, layer chips)
// ---------------------------------------------------------------
(function () {
  "use strict";

  function initJump() {
    var fig = document.getElementById("jump");
    var dataEl = document.getElementById("jump-data");
    if (!fig || !dataEl || !window.requestAnimationFrame) return;
    var D = JSON.parse(dataEl.textContent);
    var Lg = D.L, F = D.frames, N = F.length, GROUND = D.ground, W = D.W;
    var svg = fig.querySelector(".jump-svg");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var controls = fig.querySelector(".jump-controls");
    var playBtn = fig.querySelector(".jump-play");
    var scrub = fig.querySelector(".jump-scrub");
    var out = fig.querySelector(".jump-phase");
    controls.hidden = false;

    var trail = svg.querySelectorAll(".jf");
    var phases = svg.querySelectorAll(".j-phase");
    var bone = svg.querySelector("#j-live-bone");
    var head = svg.querySelector("#j-live-head");
    var kp = {};
    Array.prototype.forEach.call(svg.querySelectorAll(".j-live-kp"), function (el) { kp[el.getAttribute("data-k")] = el; });
    var eegs = svg.querySelectorAll(".j-live-eeg");
    var dimLine = svg.querySelector("#j-dim");
    var dimGroup = svg.querySelector(".a-behav");
    var dimLabel = dimGroup ? dimGroup.querySelectorAll(".j-tagbg, .j-dimtext") : [];
    var KEYS = ["t", "h", "s", "ua", "fa", "foot"];
    var R = Math.PI / 180;

    function tagParts(id) {
      var g = svg.querySelector(id);
      return { g: g, lead: g.querySelector(".j-lead"), target: g.querySelector(".j-target"), bg: g.querySelector(".j-tagbg"),
               kick: g.querySelector(".j-kick"), desc: g.querySelector(".j-desc"), w: parseFloat(g.querySelector(".j-tagbg").getAttribute("width")),
               ax: null, ay: null };
    }
    var tags = { brain: tagParts("#j-tag-brain"), move: tagParts("#j-tag-move") };

    // --- kinematics (mirrors the generator) ---
    function vd(a, len) { return [len * Math.sin(a * R), len * Math.cos(a * R)]; }   // from straight down
    function vu(a, len) { return [len * Math.sin(a * R), -len * Math.cos(a * R)]; }  // from straight up
    function add(p, d) { return [p[0] + d[0], p[1] + d[1]]; }
    function pose(hip, q) {
      var neck = add(hip, vu(q.t, Lg.trunk));
      var hd = add(neck, vu(q.t * 0.55, Lg.neck + Lg.head_r));
      var sh = add(neck, vu(q.t, -Lg.shoulder_drop));
      var el = add(sh, vd(q.ua, Lg.ua));
      var wr = add(el, vd(q.fa, Lg.fa));
      var kn = add(hip, vd(q.h, Lg.th));
      var an = add(kn, vd(q.s, Lg.sh));
      var toe = [an[0] + Lg.foot * Math.cos(q.foot * R), an[1] + Lg.foot * Math.sin(q.foot * R)];
      return { hip: hip, neck: neck, head: hd, sh: sh, el: el, wr: wr, kn: kn, an: an, toe: toe };
    }
    function cr(p0, p1, p2, p3, t) {
      return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    }
    function sample(u) {
      var i = Math.min(Math.floor(u), N - 2), t = u - i;
      var a = F[Math.max(i - 1, 0)], b = F[i], c = F[i + 1], d = F[Math.min(i + 2, N - 1)];
      var q = {};
      KEYS.forEach(function (k) { q[k] = cr(a[k], b[k], c[k], d[k], t); });
      var hx = cr(a.hip[0], b.hip[0], c.hip[0], d.hip[0], t);
      var hy = cr(a.hip[1], b.hip[1], c.hip[1], d.hip[1], t);
      var p = pose([0, 0], q);
      var low = Math.max(p.an[1] + Lg.ankle, p.toe[1]);
      var groundedY = GROUND - low;
      var inContact = u <= 2 || u >= N - 1.02;
      return pose([hx, inContact ? groundedY : Math.min(hy, groundedY)], q);
    }

    // --- timeline: seconds per transition, then a hold on landing ---
    var SEG = [0.8, 0.45, 0.3, 0.28, 0.3, 0.36];
    var HOLD_START = 0.45, HOLD_END = 1.2;
    var MOVE_T = SEG.reduce(function (s, x) { return s + x; }, 0);
    var CYCLE = HOLD_START + MOVE_T + HOLD_END;
    function uAt(time) {
      var tm = time - HOLD_START;
      if (tm <= 0) return 0;
      for (var i = 0; i < SEG.length; i++) {
        if (tm <= SEG[i]) return i + tm / SEG[i];
        tm -= SEG[i];
      }
      return N - 1;
    }
    function timeAt(u) {
      var tm = HOLD_START, i = 0;
      for (; i < Math.floor(u) && i < SEG.length; i++) tm += SEG[i];
      if (i < SEG.length) tm += (u - i) * SEG[i];
      return tm;
    }

    function f1(n) { return n.toFixed(1); }
    function seg(a, b) { return "M" + f1(a[0]) + " " + f1(a[1]) + "L" + f1(b[0]) + " " + f1(b[1]); }
    function setC(el, p) { el.setAttribute("cx", f1(p[0])); el.setAttribute("cy", f1(p[1])); }

    function placeTag(tg, target, want, snap) {
      if (tg.ax === null || snap) { tg.ax = want[0]; tg.ay = want[1]; }
      tg.ax += (want[0] - tg.ax) * 0.2;
      tg.ay += (want[1] - tg.ay) * 0.2;
      var ax = tg.ax, ay = tg.ay;
      tg.lead.setAttribute("d", "M" + f1(target[0]) + " " + f1(target[1]) + " L" + f1(ax + (ax > target[0] ? 0 : tg.w - 12)) + " " + f1(ay + 14));
      setC(tg.target, target);
      tg.bg.setAttribute("x", f1(ax - 6)); tg.bg.setAttribute("y", f1(ay - 12));
      tg.kick.setAttribute("x", f1(ax)); tg.kick.setAttribute("y", f1(ay + 2));
      tg.desc.setAttribute("x", f1(ax)); tg.desc.setAttribute("y", f1(ay + 19));
    }
    function wantPos(target, dx, dy, w, minY, maxY) {
      var x = target[0] + dx;
      if (x + w > W - 8) x = target[0] - Math.abs(dx) - w;   // flip to the left near the edge
      var y = Math.max(minY, Math.min(maxY, target[1] + dy));
      return [x, y];
    }

    var lastPhase = -1;
    function render(u, snap) {
      var p = sample(u);
      bone.setAttribute("d", [seg(p.hip, p.neck), seg(p.sh, p.el), seg(p.el, p.wr), seg(p.hip, p.kn), seg(p.kn, p.an), seg(p.an, p.toe)].join(" "));
      setC(head, p.head);
      for (var k in kp) setC(kp[k], p[k]);
      var r = Lg.head_r;
      [-70, -35, 0, 35, 70].forEach(function (a, n) {
        setC(eegs[n], [p.head[0] + r * Math.sin(a * R), p.head[1] - r * Math.cos(a * R)]);
      });

      // trail frames: faint before the figure arrives, exposed after it passes
      Array.prototype.forEach.call(trail, function (g, i) {
        var near = Math.exp(-((u - i) * (u - i)) / 0.16);
        var base = u + 0.15 >= i ? 0.4 : 0.2;
        g.style.opacity = String(base + (0.85 - base) * near);
      });

      var ph = Math.min(N - 1, Math.round(u));
      if (ph !== lastPhase) {
        Array.prototype.forEach.call(phases, function (t, i) { t.classList.toggle("on", i === ph); });
        out.textContent = "0" + (ph + 1) + " " + D.names[ph];
        lastPhase = ph;
      }

      var headTop = [p.head[0], p.head[1] - r - 1];
      placeTag(tags.brain, headTop, wantPos(headTop, 34, -62, tags.brain.w, 16, GROUND - 120), snap);
      placeTag(tags.move, p.kn, wantPos(p.kn, 30, 36, tags.move.w, 120, GROUND - 46), snap);

      // behaviour: the distance line grows during flight
      var prog = Math.max(0, Math.min(1, (u - 2) / (N - 3)));
      dimLine.setAttribute("x2", f1(D.dim[0] + (D.dim[1] - D.dim[0]) * prog));
      dimLine.style.opacity = u < 2 ? "0" : "1";
      var lab = Math.max(0, Math.min(1, (u - 4.6) / 1.2));
      Array.prototype.forEach.call(dimLabel, function (el) { el.style.opacity = String(0.25 + 0.75 * lab); });
      scrub.value = String(Math.round(u * 100));
      follow(p.hip[0]);
    }

    // on narrow screens the figure scrolls sideways; keep the jumper in view
    var stage = fig.querySelector(".jump-stage");
    var userScrollUntil = 0;
    ["touchstart", "wheel"].forEach(function (ev) {
      stage.addEventListener(ev, function () { userScrollUntil = Date.now() + 4000; }, { passive: true });
    });
    function follow(x) {
      if (stage.scrollWidth <= stage.clientWidth + 2 || Date.now() < userScrollUntil || hovering) return;
      var scale = svg.clientWidth / W;
      var target = Math.max(0, Math.min(stage.scrollWidth - stage.clientWidth, x * scale - stage.clientWidth * 0.45));
      stage.scrollLeft += (target - stage.scrollLeft) * 0.12;
    }

    // --- state & loop ---
    var playing = !reduce, visible = false, hovering = false, clock = 0, last = 0, rafId = 0, started = false;
    var u = reduce ? 4 : 0;
    function setPlaying(v) {
      playing = v;
      playBtn.setAttribute("aria-pressed", String(v));
      playBtn.setAttribute("aria-label", v ? "Pause animation" : "Play animation");
      if (v) { clock = u >= N - 1 ? 0 : timeAt(u); kick(); }
    }
    function tick(now) {
      rafId = 0;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (playing && !hovering && visible) {
        clock = (clock + dt) % CYCLE;
        u = uAt(clock);
      }
      render(u, false);
      if (visible && (playing || hovering || needsSettle())) rafId = requestAnimationFrame(tick);
      else last = 0;
    }
    function needsSettle() {
      // keep animating briefly while labels ease into place
      return Math.abs(tags.brain.ax - (tags.brain._lastX || 0)) > 0.3 && (tags.brain._lastX = tags.brain.ax, true);
    }
    function kick() { if (!rafId && visible) { last = 0; rafId = requestAnimationFrame(tick); } }

    render(u, true);

    // pointer scrubbing (mouse/pen; touch scrolls the figure instead)
    function uFromEvent(e) {
      var rect = svg.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width * W;
      return Math.max(0, Math.min(N - 1, (x - D.xs[0]) / (D.xs[N - 1] - D.xs[0]) * (N - 1)));
    }
    svg.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      hovering = true; svg.classList.add("scrubbing");
      u = uFromEvent(e); kick();
    });
    svg.addEventListener("pointerleave", function () {
      if (!hovering) return;
      hovering = false; svg.classList.remove("scrubbing");
      clock = timeAt(u); kick();
    });
    scrub.addEventListener("input", function () {
      setPlaying(false);
      u = Number(scrub.value) / 100; kick();
    });
    playBtn.addEventListener("click", function () { setPlaying(!playing); });

    // phase labels jump to that frame
    Array.prototype.forEach.call(phases, function (t) {
      t.setAttribute("tabindex", "0");
      t.setAttribute("role", "button");
      t.setAttribute("aria-label", "Show phase " + t.textContent.trim());
      function go() { setPlaying(false); u = Number(t.getAttribute("data-i")); kick(); }
      t.addEventListener("click", go);
      t.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });

    // layer chips
    var sticky = null;
    var chips = fig.querySelectorAll(".jchip");
    function focusLayer(layer) {
      ["brain", "move", "behav"].forEach(function (l) { svg.classList.toggle("focus-" + l, l === layer); });
      Array.prototype.forEach.call(chips, function (c) { c.classList.toggle("on", c.getAttribute("data-layer") === layer); });
    }
    Array.prototype.forEach.call(chips, function (c) {
      var layer = c.getAttribute("data-layer");
      c.setAttribute("aria-pressed", "false");
      c.addEventListener("mouseenter", function () { focusLayer(layer); });
      c.addEventListener("mouseleave", function () { focusLayer(sticky); });
      c.addEventListener("focus", function () { focusLayer(layer); });
      c.addEventListener("blur", function () { focusLayer(sticky); });
      c.addEventListener("click", function () {
        sticky = sticky === layer ? null : layer;
        Array.prototype.forEach.call(chips, function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-layer") === sticky)); });
        focusLayer(sticky || layer);
      });
    });

    // run only while on screen; entrance sweep the first time
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible = en.isIntersecting;
          if (visible && !started) {
            started = true;
            fig.classList.add("in");
            setTimeout(function () { clock = 0; kick(); }, reduce ? 0 : 1300);
          } else if (visible) { kick(); }
        });
      }, { threshold: 0.15 }).observe(fig);
    } else { visible = true; fig.classList.add("in"); kick(); }
    // fail-safe: never leave the figure hidden if the observer is slow to report
    setTimeout(function () { if (!started) { started = true; visible = true; fig.classList.add("in"); kick(); } }, 2500);
    if (reduce) setPlaying(false);
  }

  initJump();
})();
