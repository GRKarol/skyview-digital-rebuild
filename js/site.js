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

  /* ---------- custom cursor ring ---------- */
  var ring = document.getElementById('ring');
  if (ring) {
    window.addEventListener('mousemove', function (e) {
      ring.style.opacity = 1;
      ring.style.left = e.clientX + 'px';
      ring.style.top = e.clientY + 'px';
    });
    document.querySelectorAll('a, button, .chip, .calendar-day, .time-slot').forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.style.width = '46px'; ring.style.height = '46px'; });
      el.addEventListener('mouseleave', function () { ring.style.width = '26px'; ring.style.height = '26px'; });
    });
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

    var horizonY = 0.62, farRidge, nearRidge, lights = [];
    function buildRidges() {
      var r1 = seeded(11), r2 = seeded(42);
      farRidge = ridge(r1, 22, H * horizonY - 10, H * 0.05);
      nearRidge = ridge(r2, 16, H * horizonY + 6, H * 0.08);
      lights = [];
      for (var i = 0; i < 40; i++) lights.push({ x: Math.random(), y: H * horizonY + Math.random() * H * 0.05, blink: Math.random() * Math.PI * 2 });
    }

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
      var sky = ctx.createLinearGradient(0, 0, 0, H * horizonY);
      sky.addColorStop(0, '#0a0716'); sky.addColorStop(0.45, '#1c1030');
      sky.addColorStop(0.78, '#4a1f3c'); sky.addColorStop(1, '#f2b25a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * horizonY + 2);

      var sunX = W * (0.5 + (targetX - 0.5) * 0.5);
      var sunY = H * horizonY - H * 0.02 + (targetY - 0.5) * H * 0.03;
      var glowR = W * 0.30;
      var glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
      glow.addColorStop(0, 'rgba(255,212,138,0.85)'); glow.addColorStop(0.35, 'rgba(242,178,90,0.35)'); glow.addColorStop(1, 'rgba(242,178,90,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sunX, sunY, glowR, 0, Math.PI * 2); ctx.fill();

      var sunCore = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.09);
      sunCore.addColorStop(0, '#fff2d9'); sunCore.addColorStop(1, 'rgba(255,212,138,0)');
      ctx.fillStyle = sunCore; ctx.beginPath(); ctx.arc(sunX, sunY, H * 0.09, 0, Math.PI * 2); ctx.fill();

      drawRidge(farRidge, (targetX - 0.5) * -18, (targetY - 0.5) * -6, '#170e29');
      drawRidge(nearRidge, (targetX - 0.5) * -34, (targetY - 0.5) * -10, '#05070b');

      for (var i = 0; i < lights.length; i++) {
        var L = lights[i]; var lx = L.x * W + (targetX - 0.5) * -34;
        var b = 0.5 + 0.5 * Math.sin(t * 1.4 + L.blink);
        ctx.fillStyle = 'rgba(255,212,138,' + (0.15 + b * 0.35) + ')';
        ctx.fillRect(lx, L.y, 1.5, 1.5);
      }

      var waterY = H * horizonY;
      var water = ctx.createLinearGradient(0, waterY, 0, H);
      water.addColorStop(0, '#150a1e'); water.addColorStop(1, '#05070b');
      ctx.fillStyle = water; ctx.fillRect(0, waterY, W, H - waterY);

      ctx.save(); ctx.globalAlpha = 0.5;
      for (var r = 0; r < 26; r++) {
        var ry = waterY + 6 + r * ((H - waterY) / 26);
        var jitter = Math.sin(t * 0.6 + r * 0.7) * 8 * (r / 26);
        var reflW = Math.max(0, glowR * 0.9 * (1 - r / 30));
        var rg = ctx.createLinearGradient(sunX - reflW, ry, sunX + reflW, ry);
        rg.addColorStop(0, 'rgba(242,178,90,0)'); rg.addColorStop(0.5, 'rgba(255,212,138,' + (0.22 - r * 0.006) + ')'); rg.addColorStop(1, 'rgba(242,178,90,0)');
        ctx.fillStyle = rg; ctx.fillRect(sunX - reflW + jitter, ry, reflW * 2, 1.4);
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
    // TODO: współrzędne do potwierdzenia — obecnie Gdańsk (Trójmiasto), patrz brief / pytania otwarte
    var LAT = 54.352, LON = 18.6466;
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON + '&current=wind_speed_10m,weather_code&wind_speed_unit=kmh')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var wind = Math.round(data.current.wind_speed_10m);
        var good = wind < 25;
        condEl.querySelector('.w-speed').textContent = wind + ' km/h';
        condEl.querySelector('.w-verdict').textContent = good
          ? 'Dziś dobre warunki do lotu w Trójmieście.'
          : 'Dziś za silny wiatr na spokojny lot — w razie potrzeby przekładamy nagranie, bez dodatkowych kosztów.';
      })
      .catch(function () {
        condEl.querySelector('.w-speed').textContent = '—';
        condEl.querySelector('.w-verdict').textContent = 'Sprawdzamy warunki lotu na bieżąco przed każdym nagraniem.';
      });
  }
})();
