/* Photographic seasonal foliage and layered atmospheric particles. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'season-atmosphere';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', {alpha: true});
  if (!ctx) return;
  document.body.insertBefore(canvas, document.querySelector('main'));
  const atlas = new Image(); atlas.decoding = 'async';
  let atlasStarted = false, atlasReady = false;
  atlas.onload = () => { atlasReady = true; };
  atlas.onerror = () => { atlasReady = false; };
  const random = (a,b) => a + Math.random() * (b-a), tau = Math.PI * 2;
  let width=0, height=0, particles=[], frame=0, last=0, elapsed=0, activeSeason='';
  function season() { return document.documentElement.dataset.season || 'summer'; }
  function loadAtlas() {
    if (!atlasStarted && season() !== 'winter' && !reduce.matches) {
      atlasStarted=true; atlas.src='assets/season-foliage-v2.png';
    }
  }
  function snowTexture() {
    const tile=document.createElement('canvas'); tile.width=tile.height=64;
    const c=tile.getContext('2d'), g=c.createRadialGradient(32,32,0,32,32,30);
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(.26,'rgba(249,253,255,.97)');
    g.addColorStop(.54,'rgba(234,246,255,.5)');
    g.addColorStop(1,'rgba(234,246,255,0)');
    c.fillStyle=g; c.fillRect(0,0,64,64); return tile;
  }
  function downTexture() {
    const tile=document.createElement('canvas'); tile.width=tile.height=64;
    const c=tile.getContext('2d'); c.strokeStyle='rgba(255,249,221,.72)'; c.lineWidth=1.2;
    for(let i=0;i<11;i++) {
      const a=Math.PI+i*Math.PI/10;
      c.beginPath(); c.moveTo(32,37);
      c.quadraticCurveTo(32+Math.cos(a)*12,26+Math.sin(a)*12,32+Math.cos(a)*23,28+Math.sin(a)*23); c.stroke();
    }
    c.strokeStyle='rgba(228,212,167,.8)'; c.lineWidth=2;
    c.beginPath(); c.moveTo(32,37); c.lineTo(35,52); c.stroke(); return tile;
  }
  const snow=snowTexture(), down=downTexture();
  function makeParticle(initial,index) {
    const s=activeSeason, near=index%5===0, depth=near?random(.78,1):random(.18,.7);
    const foliage=s==='autumn'||s==='spring'||(s==='summer'&&index%4===0);
    let size,sprite=0;
    if(s==='autumn') {size=22+depth*61;sprite=Math.floor(random(0,6));}
    else if(s==='spring') {size=13+depth*28;sprite=8+Math.floor(random(0,4));}
    else if(s==='summer') {size=foliage?19+depth*32:7+depth*10;sprite=6+Math.floor(random(0,2));}
    else size=2+depth*9;
    if(width<600&&foliage) size*=.8;
    let x=random(-60,width+60);
    if(foliage&&Math.random()<.6) x=Math.random()<.5?random(0,width*.24):random(width*.76,width);
    return {x,y:initial?random(-60,height):random(-140,-size),size,depth,foliage,sprite,
      speed:s==='winter'?14+depth*35:s==='summer'?8+depth*12:17+depth*24,
      drift:random(-9,15),phase:random(0,tau),angle:random(-Math.PI,Math.PI),
      tumble:random(.35,.8),swing:random(.35,.75),
      alpha:foliage?random(.9,1):s==='winter'?.38+depth*.55:random(.45,.75)};
  }
  function resize() {
    width=innerWidth;height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    activeSeason=season();
    const counts={winter:76,spring:18,summer:10,autumn:18};
    particles=Array.from({length:Math.round((counts[activeSeason]||10)*(width<600?.58:1))},(_,i)=>makeParticle(true,i));
    particles.sort((a,b)=>a.depth-b.depth);loadAtlas();
  }
  function draw(p) {
    ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=p.alpha;
    if(p.foliage) {
      if(!atlasReady){ctx.restore();return;}
      const flutter=elapsed*p.tumble+p.phase,turn=Math.cos(flutter);
      ctx.rotate(p.angle+Math.sin(flutter*.72)*p.swing);
      ctx.scale((turn<0?-1:1)*Math.max(.13,Math.abs(turn)),.88+Math.sin(flutter+1)*.12);
      const cw=atlas.naturalWidth/4,ch=atlas.naturalHeight/3;
      ctx.drawImage(atlas,(p.sprite%4)*cw,Math.floor(p.sprite/4)*ch,cw,ch,-p.size/2,-p.size/2,p.size,p.size);
    } else if(activeSeason==='winter') {
      ctx.rotate(.18+Math.sin(p.phase)*.12);
      ctx.drawImage(snow,-p.size/2,-p.size*.65,p.size,p.size*1.3);
    } else {
      ctx.rotate(p.angle+Math.sin(p.phase)*.35);
      ctx.drawImage(down,-p.size/2,-p.size/2,p.size,p.size);
    }
    ctx.restore();
  }
  function tick(now) {
    frame=0;
    if(document.hidden||reduce.matches){last=0;return;}
    if(season()!==activeSeason)resize();
    if(last&&now-last<32){frame=requestAnimationFrame(tick);return;}
    const dt=last?Math.min((now-last)/1000,.08):0;last=now;elapsed+=dt;
    ctx.clearRect(0,0,width,height);
    const wind=Math.sin(elapsed*.19)*7+Math.sin(elapsed*.43)*3;
    particles.forEach((p,i)=>{
      p.phase+=dt*.38;
      p.x+=(p.drift+wind*(.4+p.depth)+Math.sin(p.phase)*(p.foliage?17:6))*dt;
      p.y+=p.speed*(p.foliage?.84+Math.sin(p.phase*1.7)*.16:1)*dt;
      if(p.y>height+p.size||p.x>width+150||p.x< -150)particles[i]=makeParticle(false,i);
      else draw(p);
    });
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    if(frame)cancelAnimationFrame(frame);
    frame=0;last=0;canvas.hidden=reduce.matches;loadAtlas();
    if(!document.hidden&&!reduce.matches)frame=requestAnimationFrame(tick);
  }
  let timer;
  window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(resize,150);});
  document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',sync);
  resize();sync();
}());
