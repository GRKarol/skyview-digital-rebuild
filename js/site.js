(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- nav ---------- */
  var nav = document.querySelector('.nav');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });

  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');
  if (burger) burger.addEventListener('click', function () { mobileMenu.classList.add('open'); });
  document.querySelectorAll('#mobileMenu a, #mobileMenu .close').forEach(function (el) {
    el.addEventListener('click', function () { mobileMenu.classList.remove('open'); });
  });

  /* ---------- custom cursor: smoke trail ---------- */
  var trail = document.getElementById('trail');
  if (trail && !reduced && !window.matchMedia('(hover: none)').matches) {
    var tctx = trail.getContext('2d');
    var tW, tH, tDPR;
    function resizeTrail() {
      tDPR = Math.min(window.devicePixelRatio || 1, 2);
      tW = window.innerWidth; tH = window.innerHeight;
      trail.width = tW * tDPR; trail.height = tH * tDPR;
      trail.style.width = tW + 'px'; trail.style.height = tH + 'px';
      tctx.setTransform(tDPR, 0, 0, tDPR, 0, 0);
    }
    resizeTrail();
    window.addEventListener('resize', resizeTrail);
    document.body.classList.add('cursor-hidden');

    var puffs = [];
    var lastSpawn = 0;
    var big = false;
    var curX = -100, curY = -100, haveMouse = false;

    window.addEventListener('mousemove', function (e) {
      curX = e.clientX; curY = e.clientY; haveMouse = true;
      var now = performance.now();
      if (now - lastSpawn > 55) {
        lastSpawn = now;
        puffs.push({
          x: e.clientX + (Math.random() - 0.5) * 4,
          y: e.clientY + (Math.random() - 0.5) * 4,
          driftX: (Math.random() - 0.5) * 22,
          riseY: 22 + Math.random() * 20,
          r: (big ? 9 : 5.5) + Math.random() * 6,
          born: now,
          life: 1300 + Math.random() * 700,
          hue: Math.random() < 0.45 ? 'gold' : 'smoke'
        });
        if (puffs.length > 90) puffs.splice(0, puffs.length - 90);
      }
    });
    window.addEventListener('mouseleave', function () { haveMouse = false; });

    document.querySelectorAll('a, button, .chip, .calendar-day, .time-slot').forEach(function (el) {
      el.addEventListener('mouseenter', function () { big = true; });
      el.addEventListener('mouseleave', function () { big = false; });
    });

    (function loop(now) {
      tctx.clearRect(0, 0, tW, tH);

      for (var i = puffs.length - 1; i >= 0; i--) {
        var p = puffs[i];
        var age = now - p.born;
        if (age > p.life) { puffs.splice(i, 1); continue; }
        var t = age / p.life;
        var ease = t * t * (3 - 2 * t); // smoothstep — lingers, then eases into the rise
        var x = p.x + p.driftX * ease;
        var y = p.y - p.riseY * ease;
        var r = p.r * (0.7 + t * 0.8);
        var alpha = (1 - t) * (1 - t) * 0.38;
        var g = tctx.createRadialGradient(x, y, 0, x, y, r);
        if (p.hue === 'gold') {
          g.addColorStop(0, 'rgba(255,212,138,' + alpha + ')');
          g.addColorStop(1, 'rgba(242,178,90,0)');
        } else {
          g.addColorStop(0, 'rgba(198,190,208,' + (alpha * 0.7) + ')');
          g.addColorStop(1, 'rgba(140,132,152,0)');
        }
        tctx.fillStyle = g;
        tctx.beginPath(); tctx.arc(x, y, r, 0, Math.PI * 2); tctx.fill();
      }

      if (haveMouse) {
        var cr = big ? 9 : 6;
        var halo = tctx.createRadialGradient(curX, curY, 0, curX, curY, cr * 2.6);
        halo.addColorStop(0, 'rgba(255,212,138,0.35)');
        halo.addColorStop(1, 'rgba(255,212,138,0)');
        tctx.fillStyle = halo;
        tctx.beginPath(); tctx.arc(curX, curY, cr * 2.6, 0, Math.PI * 2); tctx.fill();

        tctx.fillStyle = '#fff2d9';
        tctx.beginPath(); tctx.arc(curX, curY, cr * 0.32, 0, Math.PI * 2); tctx.fill();
        tctx.strokeStyle = 'rgba(255,212,138,0.85)';
        tctx.lineWidth = 1;
        tctx.beginPath(); tctx.arc(curX, curY, cr, 0, Math.PI * 2); tctx.stroke();
      }

      requestAnimationFrame(loop);
    })(performance.now());
  }

  /* ---------- hero canvas: generative dusk / coastline ---------- */
  var canvas = document.getElementById('sky');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var W, H, DPR;
    var mouseX = 0.5, mouseY = 0.5, targetX = 0.5, targetY = 0.5;

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildRidges();
    }

    function seeded(seed) {
      var s = seed;
      return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    }
    function ridge(rand, points, baseY, amp) {
      var pts = []; var x = -0.1 * W; var step = 1.3 * W / points; var y = baseY;
      for (var i = 0; i <= points; i++) {
        y += (rand() - 0.5) * amp;
        y = Math.max(baseY - amp * 2.2, Math.min(baseY + amp * 0.6, y));
        pts.push([x, y]); x += step;
      }
      return pts;
    }

    var horizonY = 0.62, farRidge, nearRidge, lights = [], stars = [];
    function buildRidges() {
      var r1 = seeded(11), r2 = seeded(42);
      farRidge = ridge(r1, 22, H * horizonY - 10, H * 0.05);
      nearRidge = ridge(r2, 16, H * horizonY + 6, H * 0.08);
      lights = [];
      for (var i = 0; i < 40; i++) lights.push({ x: Math.random(), y: H * horizonY + Math.random() * H * 0.05, blink: Math.random() * Math.PI * 2 });
      if (!stars.length) {
        var rs = seeded(77);
        for (var s = 0; s < 70; s++) stars.push({ x: rs(), y: rs() * 0.8, r: 0.6 + rs() * 1.2, blink: rs() * Math.PI * 2 });
      }
    }

    /* ---- real time of day: sun by day, moon by night ---- */
    function hexToRgb(hex) {
      var n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function lerpColor(a, b, t) {
      var ca = hexToRgb(a), cb = hexToRgb(b);
      var r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
      var g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
      var bch = Math.round(ca[2] + (cb[2] - ca[2]) * t);
      return 'rgb(' + r + ',' + g + ',' + bch + ')';
    }
    function getSunState() {
      var now = new Date();
      var hour = now.getHours() + now.getMinutes() / 60;
      var riseH = 5.5, setH = 20.5;
      var isNight = hour < riseH || hour >= setH;
      var frac, elevation;
      if (isNight) {
        var nightLen = 24 - (setH - riseH);
        var nightPos = hour >= setH ? hour - setH : hour + (24 - setH);
        frac = nightPos / nightLen;
        elevation = Math.sin(Math.PI * Math.min(1, Math.max(0, frac)));
      } else {
        frac = (hour - riseH) / (setH - riseH);
        elevation = Math.sin(Math.PI * Math.min(1, Math.max(0, frac)));
      }
      return { isNight: isNight, frac: frac, elevation: elevation };
    }
    function applyBrightness() {
      var bright = !sunState.isNight && sunState.elevation > 0.5;
      document.documentElement.classList.toggle('sky-bright', bright);
    }
    var sunState = getSunState();
    applyBrightness();
    setInterval(function () { sunState = getSunState(); applyBrightness(); }, 60000);

    function drawRidge(pts, offsetX, offsetY, color) {
      ctx.beginPath(); ctx.moveTo(pts[0][0] + offsetX, H + 10);
      for (var i = 0; i < pts.length; i++) ctx.lineTo(pts[i][0] + offsetX, pts[i][1] + offsetY);
      ctx.lineTo(pts[pts.length - 1][0] + offsetX, H + 10);
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    }

    resize();
    window.addEventListener('resize', resize);
    var t0 = performance.now();

    function frame(now) {
      var t = (now - t0) / 1000;
      if (!reduced) { targetX += (mouseX - targetX) * 0.04; targetY += (mouseY - targetY) * 0.04; }
      else { targetX = 0.5; targetY = 0.5; }

      ctx.clearRect(0, 0, W, H);

      var isNight = sunState.isNight;
      var elevation = sunState.elevation; // 0 = at horizon, 1 = zenith
      var dayLift = isNight ? 0 : elevation;

      var sky = ctx.createLinearGradient(0, 0, 0, H * horizonY);
      if (isNight) {
        sky.addColorStop(0, lerpColor('#0c0d18', '#141428', elevation));
        sky.addColorStop(0.45, lerpColor('#171a2c', '#20233d', elevation));
        sky.addColorStop(0.78, '#2c2a44');
        sky.addColorStop(1, '#3d3a54');
      } else {
        sky.addColorStop(0, lerpColor('#2a2438', '#4d6e9c', dayLift));
        sky.addColorStop(0.45, lerpColor('#3d2f4f', '#7fa4c6', dayLift));
        sky.addColorStop(0.78, lerpColor('#6b3f5c', '#e3ab7a', dayLift));
        sky.addColorStop(1, lerpColor('#f2b25a', '#ffd48a', dayLift));
      }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * horizonY + 2);

      if (isNight) {
        for (var s = 0; s < stars.length; s++) {
          var st = stars[s];
          var sb = 0.4 + 0.6 * Math.sin(t * 1.1 + st.blink);
          ctx.fillStyle = 'rgba(240,238,255,' + (0.25 + sb * 0.55) + ')';
          ctx.beginPath(); ctx.arc(st.x * W + (targetX - 0.5) * -10, st.y * H, st.r, 0, Math.PI * 2); ctx.fill();
        }
      }

      var maxRise = H * 0.4;
      var orbX = W * (0.18 + sunState.frac * 0.64) + (targetX - 0.5) * W * 0.08;
      var orbY = H * horizonY - elevation * maxRise + (targetY - 0.5) * H * 0.03;
      var glowR = W * (isNight ? 0.16 : 0.30);
      var orbColor = isNight ? '224,222,240' : '255,212,138';
      var glow = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, glowR);
      glow.addColorStop(0, 'rgba(' + orbColor + ',' + (isNight ? 0.5 : 0.85) + ')');
      glow.addColorStop(0.35, 'rgba(' + orbColor + ',' + (isNight ? 0.18 : 0.35) + ')');
      glow.addColorStop(1, 'rgba(' + orbColor + ',0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(orbX, orbY, glowR, 0, Math.PI * 2); ctx.fill();

      var orbR = H * (isNight ? 0.05 : 0.09);
      var orbCore = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbR);
      orbCore.addColorStop(0, isNight ? '#f4f2ff' : '#fff2d9');
      orbCore.addColorStop(1, 'rgba(' + orbColor + ',0)');
      ctx.fillStyle = orbCore; ctx.beginPath(); ctx.arc(orbX, orbY, orbR, 0, Math.PI * 2); ctx.fill();

      drawRidge(farRidge, (targetX - 0.5) * -18, (targetY - 0.5) * -6, isNight ? '#242438' : lerpColor('#41344f', '#5c6f8f', dayLift));
      drawRidge(nearRidge, (targetX - 0.5) * -34, (targetY - 0.5) * -10, isNight ? '#15151f' : '#241f31');

      if (!isNight) {
        for (var i = 0; i < lights.length; i++) {
          var L = lights[i]; var lx = L.x * W + (targetX - 0.5) * -34;
          var b = 0.5 + 0.5 * Math.sin(t * 1.4 + L.blink);
          ctx.fillStyle = 'rgba(255,212,138,' + (0.15 + b * 0.35) + ')';
          ctx.fillRect(lx, L.y, 1.5, 1.5);
        }
      }

      var waterY = H * horizonY;
      var water = ctx.createLinearGradient(0, waterY, 0, H);
      water.addColorStop(0, isNight ? '#1c2233' : lerpColor('#2d3f52', '#3a5872', dayLift));
      water.addColorStop(0.5, isNight ? '#141826' : '#243347');
      water.addColorStop(1, '#1c1926');
      ctx.fillStyle = water; ctx.fillRect(0, waterY, W, H - waterY);

      // horizontal water ripple lines so the surface reads as water, not a flat panel
      ctx.save(); ctx.globalAlpha = 0.22;
      ctx.strokeStyle = isNight ? 'rgba(180,190,220,0.5)' : 'rgba(255,224,180,0.5)';
      ctx.lineWidth = 1;
      for (var rl = 0; rl < 14; rl++) {
        var rly = waterY + 10 + rl * ((H - waterY) / 14);
        var wobble = Math.sin(t * 0.5 + rl * 0.9) * 10;
        ctx.beginPath(); ctx.moveTo(0, rly); ctx.lineTo(W * 0.3 + wobble, rly + 2); ctx.lineTo(W * 0.7 - wobble, rly - 1); ctx.lineTo(W, rly + 1); ctx.stroke();
      }
      ctx.restore();

      ctx.save(); ctx.globalAlpha = 0.55;
      for (var r = 0; r < 26; r++) {
        var ry = waterY + 6 + r * ((H - waterY) / 26);
        var jitter = Math.sin(t * 0.6 + r * 0.7) * 8 * (r / 26);
        var reflW = Math.max(0, glowR * 0.9 * (1 - r / 30));
        var rg = ctx.createLinearGradient(orbX - reflW, ry, orbX + reflW, ry);
        rg.addColorStop(0, 'rgba(' + orbColor + ',0)'); rg.addColorStop(0.5, 'rgba(' + orbColor + ',' + (0.28 - r * 0.007) + ')'); rg.addColorStop(1, 'rgba(' + orbColor + ',0)');
        ctx.fillStyle = rg; ctx.fillRect(orbX - reflW + jitter, ry, reflW * 2, 1.6);
      }
      ctx.restore();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    window.addEventListener('mousemove', function (e) { mouseX = e.clientX / W; mouseY = e.clientY / H; });

    var altEl = document.getElementById('altnum');
    if (altEl) {
      var altStart = performance.now();
      (function tickAlt(now) {
        var p = Math.min(1, (now - altStart) / 1400);
        var eased = 1 - Math.pow(1 - p, 3);
        altEl.textContent = String(Math.round(eased * 120)).padStart(3, '0');
        if (p < 1 && !reduced) requestAnimationFrame(tickAlt); else altEl.textContent = '120';
      })(performance.now());
    }
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('.faq-q');
    var panel = item.querySelector('.faq-a');
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (o) {
        o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) { item.classList.add('open'); panel.style.maxHeight = panel.scrollHeight + 'px'; }
    });
  });

  /* ---------- video modal (placeholder-safe) ---------- */
  var videoModal = document.getElementById('videoModal');
  var playBtn = document.getElementById('playDemoBtn');
  var closeVideo = document.getElementById('closeVideoModal');
  var VIDEO_SRC = ''; // TODO: podepnij realny materiał wideo z realizacji
  if (playBtn) {
    playBtn.addEventListener('click', function () {
      var video = document.getElementById('modalVideo');
      var placeholder = document.getElementById('modalPlaceholder');
      if (VIDEO_SRC) {
        video.querySelector('source').src = VIDEO_SRC;
        video.load(); video.style.display = 'block'; placeholder.style.display = 'none';
        video.play();
      } else {
        video.style.display = 'none'; placeholder.style.display = 'block';
      }
      videoModal.classList.add('open');
    });
  }
  if (closeVideo) closeVideo.addEventListener('click', function () {
    videoModal.classList.remove('open');
    var video = document.getElementById('modalVideo');
    video.pause();
  });

  /* ---------- services configurator ---------- */
  var configState = { need: null, size: null };
  var recommendations = {
    'strona': { small: 'pierwszy-lot', big: 'wznoszenie' },
    'film': { small: 'wznoszenie', big: 'pelny-zasieg' },
    'oba': { small: 'wznoszenie', big: 'pelny-zasieg' }
  };
  var routeNames = { 'pierwszy-lot': 'Pierwszy Lot', 'wznoszenie': 'Wznoszenie', 'pelny-zasieg': 'Pełen Zasięg' };
  var routeText = {
    'pierwszy-lot': 'Jedna lokalizacja, jeden dzień nagrań, strona do 90 sek. filmu. Sensowny start, jeśli testujesz, czy obecność online w ogóle się opłaca.',
    'wznoszenie': 'Dwie lokalizacje, profesjonalny montaż, rozbudowana strona z integracją analityki. Wybór większości klientów.',
    'pelny-zasieg': 'Wielolokacyjne nagrania 4K, platforma z rezerwacjami, dedykowany opiekun projektu. Dla firm, które chcą wyznaczać standard w branży.'
  };
  function updateConfigResult() {
    var result = document.getElementById('configResult');
    if (!configState.need || !configState.size) return;
    var key = recommendations[configState.need][configState.size];
    result.querySelector('.r-name').textContent = routeNames[key];
    result.querySelector('.r-text').textContent = routeText[key];
    result.classList.add('show');
  }
  document.querySelectorAll('#configNeed .chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('#configNeed .chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active'); configState.need = chip.dataset.value; updateConfigResult();
    });
  });
  document.querySelectorAll('#configSize .chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('#configSize .chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active'); configState.size = chip.dataset.value; updateConfigResult();
    });
  });

  /* ---------- flight conditions (real weather, Open-Meteo, no key needed) ---------- */
  var condEl = document.getElementById('conditions-text');
  if (condEl) {
    // TODO: współrzędne do potwierdzenia — obecnie Kłobuck (jedyny potwierdzony adres), patrz brief / pytania otwarte
    var LAT = 50.9214, LON = 18.9508;
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON + '&current=wind_speed_10m,weather_code&wind_speed_unit=kmh')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var wind = Math.round(data.current.wind_speed_10m);
        var good = wind < 25;
        condEl.querySelector('.w-speed').textContent = wind + ' km/h';
        condEl.querySelector('.w-verdict').textContent = good
          ? 'Dziś dobre warunki do lotu.'
          : 'Dziś za silny wiatr na spokojny lot — w razie potrzeby przekładamy nagranie, bez dodatkowych kosztów.';
      })
      .catch(function () {
        condEl.querySelector('.w-speed').textContent = '—';
        condEl.querySelector('.w-verdict').textContent = 'Sprawdzamy warunki lotu na bieżąco przed każdym nagraniem.';
      });
  }

  /* ---------- scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- card tilt ---------- */
  if (!reduced) {
    document.querySelectorAll('.card, .route').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        var rx = (py - 0.5) * -8;
        var ry = (px - 0.5) * 8;
        el.style.transform = 'perspective(700px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-2px)';
        el.style.setProperty('--mx', (px * 100) + '%');
        el.style.setProperty('--my', (py * 100) + '%');
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- compare slider ---------- */
  var compare = document.getElementById('compareSlider');
  if (compare) {
    var after = compare.querySelector('.cmp-after');
    var handle = document.getElementById('compareHandle');
    var dragging = false;

    function setSplit(clientX) {
      var rect = compare.getBoundingClientRect();
      var pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      after.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
      handle.style.left = pct + '%';
    }
    handle.style.left = '50%';

    compare.addEventListener('pointerdown', function (e) { dragging = true; compare.setPointerCapture(e.pointerId); setSplit(e.clientX); });
    compare.addEventListener('pointermove', function (e) { if (dragging) setSplit(e.clientX); });
    compare.addEventListener('pointerup', function () { dragging = false; });
    compare.addEventListener('pointercancel', function () { dragging = false; });

    /* mini living preview inside the "after" panel */
    var cmpCanvas = document.getElementById('cmpCanvas');
    if (cmpCanvas) {
      var cctx = cmpCanvas.getContext('2d');
      var cW, cH, cDPR;
      function resizeCmp() {
        cDPR = Math.min(window.devicePixelRatio || 1, 2);
        cW = compare.clientWidth; cH = compare.clientHeight;
        cmpCanvas.width = cW * cDPR; cmpCanvas.height = cH * cDPR;
        cmpCanvas.style.width = cW + 'px'; cmpCanvas.style.height = cH + 'px';
        cctx.setTransform(cDPR, 0, 0, cDPR, 0, 0);
      }
      resizeCmp();
      window.addEventListener('resize', resizeCmp);

      var sparks = [];
      for (var sp = 0; sp < 16; sp++) sparks.push({ x: Math.random(), y: Math.random(), phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.6 });
      var c0 = performance.now();

      (function cmpFrame(now) {
        var ct = (now - c0) / 1000;
        cctx.clearRect(0, 0, cW, cH);
        var sky = cctx.createLinearGradient(0, 0, 0, cH);
        sky.addColorStop(0, '#241f31'); sky.addColorStop(0.55, '#4a2f4a'); sky.addColorStop(1, '#c9793f');
        cctx.fillStyle = sky; cctx.fillRect(0, 0, cW, cH);

        var sx = cW * 0.62, sy = cH * (reduced ? 0.42 : 0.42 + Math.sin(ct * 0.5) * 0.03);
        var pulse = reduced ? 1 : 1 + Math.sin(ct * 1.6) * 0.08;
        var gr = cH * 0.5 * pulse;
        var glow = cctx.createRadialGradient(sx, sy, 0, sx, sy, gr);
        glow.addColorStop(0, 'rgba(255,212,138,0.9)'); glow.addColorStop(0.4, 'rgba(242,178,90,0.4)'); glow.addColorStop(1, 'rgba(242,178,90,0)');
        cctx.fillStyle = glow; cctx.beginPath(); cctx.arc(sx, sy, gr, 0, Math.PI * 2); cctx.fill();
        cctx.fillStyle = '#fff6e0'; cctx.beginPath(); cctx.arc(sx, sy, cH * 0.09, 0, Math.PI * 2); cctx.fill();

        if (!reduced) {
          for (var i = 0; i < sparks.length; i++) {
            var sk = sparks[i];
            var b = 0.3 + 0.7 * Math.abs(Math.sin(ct * sk.speed + sk.phase));
            cctx.fillStyle = 'rgba(255,224,180,' + b + ')';
            cctx.beginPath(); cctx.arc(sk.x * cW, sk.y * cH * 0.7, 1.4, 0, Math.PI * 2); cctx.fill();
          }
        }
        requestAnimationFrame(cmpFrame);
      })(performance.now());
    }
  }
})();
