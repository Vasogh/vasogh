/* Seasonal atmospheric particles, drawn locally; no external libraries. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'season-atmosphere';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.querySelector('main'));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let width = 0, height = 0, particles = [], frame = 0, last = 0, activeSeason = '';
  const random = (a, b) => a + Math.random() * (b - a);
  function season() { return document.documentElement.dataset.season || 'summer'; }
  function makeParticle(initial) {
    const s = season();
    const near = Math.random() > .8;
    const depth = near ? random(.75, 1) : random(.2, .65);
    return {x: random(-70, width + 70), y: initial ? random(-height * .15, height) : random(-100, -20),
      size: s === 'winter' ? 1.3 + depth * 4 : s === 'summer' ? 1 + depth * 2.5 : 3 + depth * 12,
      speed: (s === 'summer' ? 5 : s === 'winter' ? 12 : 15) + depth * 24,
      drift: random(6, 18), phase: random(0, Math.PI * 2), angle: random(0, Math.PI * 2),
      spin: random(-.7, .7), depth, near, alpha: random(.25, .65), color: Math.floor(random(0, 4))};
  }
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const counts = {winter: 38, spring: 23, summer: 13, autumn: 19};
    const count = Math.round(counts[season()] * (width < 600 ? .55 : 1));
    particles = Array.from({length: count}, () => makeParticle(true));
    activeSeason = season();
  }
  function draw(p, s) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.globalAlpha = p.alpha;
    ctx.filter = p.near ? 'blur(1.2px)' : 'none';
    if (s === 'winter' || s === 'summer') {
      ctx.fillStyle = s === 'winter' ? '#fff' : '#fff7d4';
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * (s === 'winter' ? 1 : .55), 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.scale(Math.max(.22, Math.abs(Math.cos(p.phase))), 1);
      const r = p.size;
      ctx.fillStyle = s === 'spring' ? ['#fff4f1','#ffd8df','#f4b6c9','#fff8f3'][p.color] : ['#e6a83e','#c76b28','#efbd58','#a84f21'][p.color];
      ctx.beginPath(); ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r, -r * .75, r * .9, r * .5, 0, r);
      ctx.bezierCurveTo(-r * .65, r * .6, -r * .8, -r * .6, 0, -r);
      ctx.fill();
      if (s === 'autumn') {
        ctx.strokeStyle = '#74451a'; ctx.lineWidth = .65; ctx.globalAlpha *= .45;
        ctx.beginPath();ctx.moveTo(0,-r*.8);ctx.quadraticCurveTo(-r*.15,0,0,r*1.2);ctx.stroke();
      }
    }
    ctx.restore();
  }
  function tick(now) {
    frame = 0;
    if (document.hidden || reduce.matches) {last = 0;return;}
    if (season() !== activeSeason) resize();
    // Limit drawing to about 30 fps, also on high-refresh mobile displays.
    if (last && now - last < 32) {frame = requestAnimationFrame(tick);return;}
    const dt = last ? Math.min((now-last)/1000,.08) : 0; last = now;
    ctx.clearRect(0,0,width,height);
    const s = season();
    particles.forEach((p,i) => {
      p.phase += dt * .7; p.angle += p.spin * dt;
      p.x += (p.drift + Math.sin(p.phase) * 13) * dt;
      p.y += p.speed * dt;
      if (p.y > height + 60 || p.x > width + 80) particles[i] = makeParticle(false);
      else draw(p,s);
    });
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    canvas.hidden = reduce.matches;
    if (!document.hidden && !reduce.matches) frame = requestAnimationFrame(tick);
  }
  let resizeTimer;
  window.addEventListener('resize', () => {clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,150);});
  document.addEventListener('visibilitychange',sync);
  reduce.addEventListener('change',sync);
  resize(); sync();
}());
