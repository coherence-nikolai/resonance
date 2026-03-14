// ═══════════════════════════════════════
// FIELD v2
// Notice · Hold · Anchor · Integrate
// A training ground for 5D consciousness
// ═══════════════════════════════════════

// ── SAFE STORAGE ──
const lsGet = (k, def='') => { try { return localStorage.getItem(k) ?? def; } catch(e) { return def; } };
const lsSet = (k, v)      => { try { localStorage.setItem(k, v); } catch(e) {} };
const lsDel = (k)          => { try { localStorage.removeItem(k); } catch(e) {} };

// ── STATE ──
let lang = (() => {
  const stored = lsGet('f2_lang');
  if (stored) return stored;
  return (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en';
})();

let audioCtx    = null;
let droneNodes  = [];
let audioEnabled = true;
let fontLarge    = lsGet('f2_font_large') === '1';

// Activity token — invalidates stale async callbacks on navigation
let activityToken = 0;
const nextToken = () => ++activityToken;
const isAlive   = t  => t === activityToken;

// Session state
let currentContraction = ''; // what they're carrying
let currentBodyZone    = ''; // where it lives
let chosenFrequency    = ''; // what they're anchoring
let sessionToken       = 0;  // unique per session for logging

// Screen transition token
let screenToken = 0;

// ── CANVAS ──
const cv = document.getElementById('cv');
const cx = cv.getContext('2d');

function rsz() {
  const dpr = window.devicePixelRatio || 1;
  cv.width  = innerWidth  * dpr;
  cv.height = innerHeight * dpr;
  cv.style.width  = innerWidth  + 'px';
  cv.style.height = innerHeight + 'px';
  cx.resetTransform();
  cx.scale(dpr, dpr);
}
window.addEventListener('resize', rsz);
rsz();

// ── WAVE INTERFERENCE ENGINE ──
// Two waves — rose and violet — meeting to form a standing interference field
// This IS the practice: two truths held simultaneously

// Wave system state
let waveState = 'home'; // home | notice | hold | anchor | breath | integrate
let waveCoherence = 0;  // 0–1: how ordered the interference pattern is
let waveCoherenceTgt = 0;
let waveTime = 0;

// Rose wave (heavy / what is carried)
const wRose = {
  freq: 0.0018,
  amp: 0.11,
  targetAmp: 0.11,
  phase: 0,
  phaseV: 0.0018,
  y: 0.52,        // vertical centre as fraction of height
  targetY: 0.52,
  color: '200,130,110',
  alpha: 0.55,
  targetAlpha: 0.55,
  thickness: 2.2,
};

// Violet wave (complement / what is also true)
const wViolet = {
  freq: 0.0024,
  amp: 0.09,
  targetAmp: 0.09,
  phase: Math.PI * 0.7,
  phaseV: 0.0022,
  y: 0.48,
  targetY: 0.48,
  color: '152,128,184',
  alpha: 0.45,
  targetAlpha: 0.45,
  thickness: 1.8,
};

// Interference zone particles — appear at wave intersection
const iParticles = [];
const MAX_IPART = 28;

class IParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.r = 0.8 + Math.random() * 1.4;
    this.alpha = 0;
    this.targetAlpha = 0.5 + Math.random() * 0.4;
    this.life = 0;
    this.maxLife = 120 + Math.random() * 180;
    // blend of rose and violet
    this.isRose = Math.random() < 0.5;
  }
  update() {
    this.life++;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.992;
    this.vy *= 0.992;
    const lifeP = this.life / this.maxLife;
    const fade = lifeP < 0.15 ? lifeP / 0.15 : lifeP > 0.7 ? 1 - (lifeP - 0.7) / 0.3 : 1;
    this.alpha = this.targetAlpha * fade * waveCoherence;
  }
  draw() {
    if (this.alpha < 0.01) return;
    const col = this.isRose ? '200,160,130' : '180,155,210';
    cx.save();
    cx.globalAlpha = this.alpha;
    const g = cx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 3);
    g.addColorStop(0, `rgba(${col},1)`);
    g.addColorStop(1, `rgba(${col},0)`);
    cx.fillStyle = g;
    cx.beginPath();
    cx.arc(this.x, this.y, this.r * 3, 0, Math.PI * 2);
    cx.fill();
    cx.restore();
  }
  isDead() { return this.life >= this.maxLife; }
}

// Spawn interference particles where waves intersect
function spawnInterferenceParticles() {
  if (waveCoherence < 0.15) return;
  if (iParticles.length >= MAX_IPART) return;
  if (Math.random() > 0.18 * waveCoherence) return;

  const w = innerWidth;
  const h = innerHeight;
  // Find approximate intersection zone — between the two wave centres
  const rY = wRose.y * h;
  const vY = wViolet.y * h;
  const midY = (rY + vY) / 2;
  const x = Math.random() * w;
  // y near intersection, with spread based on coherence
  const spread = (1 - waveCoherence) * 60 + 10;
  const y = midY + (Math.random() - 0.5) * spread;
  iParticles.push(new IParticle(x, y));
}

// Draw a single wave
function drawWave(wave, coherence) {
  const w = innerWidth;
  const h = innerHeight;
  const centreY = wave.y * h;
  const amp = wave.amp * h;

  cx.save();
  cx.beginPath();

  const steps = Math.ceil(w / 3);
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    // Primary frequency + harmonic for organic feel
    const primary = Math.sin(x * wave.freq * (w / 400) + wave.phase) * amp;
    const harmonic = Math.sin(x * wave.freq * 2.3 * (w / 400) + wave.phase * 1.4) * amp * 0.28;
    const y = centreY + primary + harmonic;
    i === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
  }

  // Glow intensifies with coherence
  const glowA = (wave.alpha * (0.6 + coherence * 0.4)).toFixed(3);
  cx.strokeStyle = `rgba(${wave.color},${glowA})`;
  cx.lineWidth = wave.thickness + coherence * 1.8;
  cx.lineCap = 'round';

  // Shadow glow
  if (coherence > 0.1) {
    cx.shadowColor = `rgba(${wave.color},${(coherence * 0.5).toFixed(2)})`;
    cx.shadowBlur = 8 + coherence * 20;
  }
  cx.stroke();

  // Fill under wave — very faint ambient
  cx.beginPath();
  cx.moveTo(0, centreY);
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const primary = Math.sin(x * wave.freq * (w / 400) + wave.phase) * amp;
    const harmonic = Math.sin(x * wave.freq * 2.3 * (w / 400) + wave.phase * 1.4) * amp * 0.28;
    cx.lineTo(x, centreY + primary + harmonic);
  }
  cx.lineTo(w, centreY);
  cx.closePath();
  const fillA = (wave.alpha * 0.04 * (1 + coherence)).toFixed(3);
  cx.fillStyle = `rgba(${wave.color},${fillA})`;
  cx.fill();

  cx.restore();
}

// Draw the interference zone — glowing band between waves
function drawInterferenceZone(coherence) {
  if (coherence < 0.05) return;
  const w = innerWidth;
  const h = innerHeight;
  const rY = wRose.y * h;
  const vY = wViolet.y * h;
  const midY = (rY + vY) / 2;
  const spread = Math.abs(rY - vY) * 0.5 + 20;

  cx.save();
  const g = cx.createLinearGradient(0, midY - spread * 2, 0, midY + spread * 2);
  const a = (coherence * 0.12).toFixed(3);
  g.addColorStop(0,   'rgba(200,160,200,0)');
  g.addColorStop(0.3, `rgba(200,155,190,${a})`);
  g.addColorStop(0.5, `rgba(220,170,200,${(coherence * 0.18).toFixed(3)})`);
  g.addColorStop(0.7, `rgba(200,155,190,${a})`);
  g.addColorStop(1,   'rgba(200,160,200,0)');
  cx.fillStyle = g;
  cx.fillRect(0, midY - spread * 2, w, spread * 4);

  // Luminous thread at exact midpoint when coherence high
  if (coherence > 0.5) {
    cx.globalAlpha = (coherence - 0.5) * 0.7;
    cx.strokeStyle = `rgba(230,200,240,${((coherence - 0.5) * 0.8).toFixed(2)})`;
    cx.lineWidth = 0.5;
    cx.shadowColor = 'rgba(200,160,230,0.9)';
    cx.shadowBlur = 12;
    cx.beginPath();
    cx.moveTo(0, midY);
    cx.lineTo(w, midY);
    cx.stroke();
  }
  cx.restore();
}

// Update wave physics
function updateWaves() {
  waveTime++;

  // Ease coherence
  waveCoherence += (waveCoherenceTgt - waveCoherence) * 0.012;

  // Phase advance — slower when more coherent (waves synchronising)
  const slowFactor = 1 - waveCoherence * 0.55;
  wRose.phase   += wRose.phaseV   * slowFactor;
  wViolet.phase += wViolet.phaseV * slowFactor;

  // Ease wave positions and amplitudes
  wRose.y      += (wRose.targetY      - wRose.y)      * 0.018;
  wRose.amp    += (wRose.targetAmp    - wRose.amp)     * 0.02;
  wRose.alpha  += (wRose.targetAlpha  - wRose.alpha)   * 0.025;
  wViolet.y    += (wViolet.targetY    - wViolet.y)     * 0.018;
  wViolet.amp  += (wViolet.targetAmp  - wViolet.amp)   * 0.02;
  wViolet.alpha+= (wViolet.targetAlpha- wViolet.alpha) * 0.025;

  // Spawn and update interference particles
  spawnInterferenceParticles();
  for (let i = iParticles.length - 1; i >= 0; i--) {
    iParticles[i].update();
    if (iParticles[i].isDead()) iParticles.splice(i, 1);
  }
}

// Set wave state per phase
function setWaveState(state) {
  waveState = state;
  if (state === 'home') {
    // Two waves moving independently — 3D state
    wRose.targetY   = 0.54; wViolet.targetY = 0.46;
    wRose.targetAmp = 0.10; wViolet.targetAmp = 0.09;
    wRose.targetAlpha = 0.45; wViolet.targetAlpha = 0.38;
    wRose.phaseV    = 0.0022; wViolet.phaseV = 0.0026;
    waveCoherenceTgt = 0;

  } else if (state === 'notice') {
    // Slightly more present, starting to slow
    wRose.targetY   = 0.55; wViolet.targetY = 0.45;
    wRose.targetAmp = 0.12; wViolet.targetAmp = 0.10;
    wRose.targetAlpha = 0.55; wViolet.targetAlpha = 0.48;
    wRose.phaseV    = 0.0018; wViolet.phaseV = 0.0020;
    waveCoherenceTgt = 0.15;

  } else if (state === 'hold') {
    // Waves slow, moving toward each other
    wRose.targetY   = 0.54; wViolet.targetY = 0.46;
    wRose.targetAmp = 0.10; wViolet.targetAmp = 0.09;
    wRose.targetAlpha = 0.60; wViolet.targetAlpha = 0.55;
    wRose.phaseV    = 0.0012; wViolet.phaseV = 0.0014;
    waveCoherenceTgt = 0.35;

  } else if (state === 'anchor') {
    // Interference pattern emerging — waves converge
    wRose.targetY   = 0.52; wViolet.targetY = 0.48;
    wRose.targetAmp = 0.08; wViolet.targetAmp = 0.08;
    wRose.targetAlpha = 0.70; wViolet.targetAlpha = 0.65;
    wRose.phaseV    = 0.0009; wViolet.phaseV = 0.0010;
    waveCoherenceTgt = 0.65;

  } else if (state === 'breath') {
    // Standing wave — maximum coherence
    wRose.targetY   = 0.50; wViolet.targetY = 0.50;
    wRose.targetAmp = 0.06; wViolet.targetAmp = 0.06;
    wRose.targetAlpha = 0.75; wViolet.targetAlpha = 0.72;
    wRose.phaseV    = 0.0006; wViolet.phaseV = 0.0006;
    waveCoherenceTgt = 1.0;

  } else if (state === 'integrate') {
    // Settled — slow coherent pulse
    wRose.targetY   = 0.52; wViolet.targetY = 0.48;
    wRose.targetAmp = 0.07; wViolet.targetAmp = 0.07;
    wRose.targetAlpha = 0.55; wViolet.targetAlpha = 0.50;
    wRose.phaseV    = 0.0008; wViolet.phaseV = 0.0008;
    waveCoherenceTgt = 0.75;
  }
}

// Background grain — organic texture
const grainCanvas = document.createElement('canvas');
grainCanvas.width  = 256;
grainCanvas.height = 256;
(function buildGrain() {
  const gc = grainCanvas.getContext('2d');
  const id = gc.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.random() * 18;
    id.data[i]   = v + 6;
    id.data[i+1] = v + 4;
    id.data[i+2] = v + 8;
    id.data[i+3] = Math.random() * 22;
  }
  gc.putImageData(id, 0, 0);
})();
let grainPattern = null;

// ── BREATH ORB — carried from v1 with v2 palette ──
class BreathOrb {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.targetX = innerWidth  * 0.5;
    this.targetY = innerHeight * 0.5;
    this.alpha      = 1;
    this.cycleCount = 0;
    this.maxCycles  = 3;
    this.phase      = 'settling';
    this.phaseStart = performance.now();
    this.onCyclesDone  = null;
    this.onPhaseChange = null;
    this.onMorphDone   = null;
    this.dispRadius = 9;
    this.dispBlur   = 0;
    this.dispGlow   = 1;
    this.MAX_RADIUS = Math.min(innerWidth, innerHeight) * 0.34;
    this.SETTLE  = 8000;
    this.INHALE  = 5000;
    this.HOLD    = 1200;
    this.EXHALE  = 5500;
    this.REST    = 700;
    this.ripples = [];
    this.flickPh = 0;
    this.wordText         = '';
    this.wordAlpha        = 0;
    this.wordTargetAlpha  = 0;
    this.wordGlowIntensity= 0;
    this.wordColorPhase   = 0;
    this.wordScale        = 1;
    this.morphStartY      = 0;
    this.MORPH_DURATION   = 2600;
    this.MORPH_LIFT       = innerHeight * 0.52;
    // v2 palette: violet-rose
    this.c1 = '200,160,230'; this.c2 = '170,130,200';
    this.c3 = '180,140,210'; this.c4 = '220,200,240'; this.c5 = '200,170,225';
  }
  get elapsed() { return performance.now() - this.phaseStart; }
  startPhase(name) {
    this.phase = name;
    this.phaseStart = performance.now();
    if (this.onPhaseChange) this.onPhaseChange(name, this.cycleCount);
  }
  update() {
    const t = this.elapsed;
    this.flickPh += 0.3;
    this.x += (this.targetX - this.x) * 0.04;
    this.y += (this.targetY - this.y) * 0.04;
    let tR, tB, tG;

    if (this.phase === 'settling') {
      const p = Math.min(t / this.SETTLE, 1);
      tR = 9 + 4 * Math.sin(p * Math.PI * 1.5);
      tB = 0; tG = 0.6 + 0.2 * Math.sin(p * Math.PI);
      if (t > this.SETTLE) this.startPhase('inhale');

    } else if (this.phase === 'inhale') {
      const p    = Math.min(t / this.INHALE, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      tR = 9 + (this.MAX_RADIUS - 9) * ease;
      tB = 0 + 14 * ease; tG = 1 - 0.5 * ease;
      if (t > this.INHALE) { this.ripples.push({r: this.dispRadius * 0.8, alpha: 0.5}); this.startPhase('hold'); }

    } else if (this.phase === 'hold') {
      tR = this.MAX_RADIUS; tB = 13; tG = 0.48;
      if (t > this.HOLD) this.startPhase('exhale');

    } else if (this.phase === 'exhale') {
      const p    = Math.min(t / this.EXHALE, 1);
      const ease = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2;
      tR = this.MAX_RADIUS - (this.MAX_RADIUS - 12) * ease;
      tB = 13 - 13 * ease;
      tG = 0.48 + (1.2 + this.cycleCount * (this.cycleCount === 2 ? 1.1 : 0.35)) * ease;
      if (t < 60 && this.ripples.length === 0) this.ripples.push({r: 18, alpha: 0.7});
      if (t > this.EXHALE) {
        this.cycleCount++;
        if (this.cycleCount >= this.maxCycles) {
          this.startPhase('crystallised');
          if (this.onCyclesDone) setTimeout(() => this.onCyclesDone(), 600);
        } else { this.startPhase('rest'); }
      }

    } else if (this.phase === 'rest') {
      tR = 12; tB = 0; tG = 1.4;
      if (t > this.REST) this.startPhase('inhale');

    } else if (this.phase === 'crystallised') {
      tR = 12 + 5 * Math.sin(t * 0.002);
      tB = 0; tG = 1.8 + 0.4 * Math.sin(t * 0.003);
      this.wordGlowIntensity = 1;

    } else if (this.phase === 'morph') {
      const p    = Math.min(t / this.MORPH_DURATION, 1);
      const ease = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2;
      tR = 12 * (1 - ease * 0.85); tB = 0; tG = 1.5 + ease * 2.2;
      this.wordScale = 1 - ease;
      this.y = this.morphStartY - Math.pow(p, 2) * this.MORPH_LIFT;
      if (t > this.MORPH_DURATION) { this.phase = 'done'; if (this.onMorphDone) this.onMorphDone(); }
    }

    const ls = this.phase === 'exhale' ? 0.055 : 0.045;
    this.dispRadius += ((tR||9)  - this.dispRadius) * ls;
    this.dispBlur   += ((tB||0)  - this.dispBlur)   * ls;
    this.dispGlow   += ((tG||1)  - this.dispGlow)   * ls;
    this.wordAlpha  += (this.wordTargetAlpha - this.wordAlpha) * 0.03;

    this.ripples = this.ripples.filter(rp => {
      rp.r += 2; rp.alpha -= 0.011;
      return rp.alpha > 0;
    });
  }
  draw() {
    const px = this.x, py = this.y;
    const r  = Math.max(0.1, this.dispRadius);
    const bl = Math.max(0, this.dispBlur);
    const gl = this.dispGlow;
    const flk = 0.92 + 0.08 * Math.sin(this.flickPh);
    const {c1,c2,c3,c4,c5} = this;
    cx.save();

    // Ripples
    this.ripples.forEach(rp => {
      cx.globalAlpha = rp.alpha;
      cx.strokeStyle = `rgba(${c3},1)`;
      cx.lineWidth   = 1;
      cx.beginPath(); cx.arc(px, py, rp.r, 0, Math.PI * 2); cx.stroke();
    });

    // Corona
    const coronaR = r * 3 + bl * 9;
    if (coronaR > 1) {
      const cg = cx.createRadialGradient(px,py,r*.5,px,py,coronaR);
      cg.addColorStop(0, `rgba(${c2},${(0.16*gl*this.alpha).toFixed(3)})`);
      cg.addColorStop(1, `rgba(${c2},0)`);
      cx.fillStyle = cg;
      cx.beginPath(); cx.arc(px,py,coronaR,0,Math.PI*2); cx.fill();
    }

    // Blurry expansion
    if (bl > 0.5) {
      cx.filter = `blur(${bl.toFixed(1)}px)`;
      const eg = cx.createRadialGradient(px,py,0,px,py,r*1.3);
      eg.addColorStop(0, `rgba(${c1},${(0.5*this.alpha).toFixed(3)})`);
      eg.addColorStop(1, `rgba(${c2},0)`);
      cx.fillStyle = eg;
      cx.beginPath(); cx.arc(px,py,r*1.3,0,Math.PI*2); cx.fill();
      cx.filter = 'none';
    }

    // Inner glow
    const ir = r * 1.7 + (1 - bl/20) * 28 * gl;
    const ig = cx.createRadialGradient(px,py,0,px,py,ir);
    ig.addColorStop(0, `rgba(${c4},${(0.82*gl*this.alpha*flk).toFixed(3)})`);
    ig.addColorStop(0.4, `rgba(${c2},${(0.38*gl*this.alpha).toFixed(3)})`);
    ig.addColorStop(1, `rgba(${c2},0)`);
    cx.fillStyle = ig;
    cx.beginPath(); cx.arc(px,py,ir,0,Math.PI*2); cx.fill();

    // Core
    const coreA = Math.max(0, 1 - bl/14) * this.alpha;
    if (coreA > 0.01 && r > 0.1) {
      cx.globalAlpha = coreA * flk;
      cx.fillStyle = `rgba(${c4},1)`;
      cx.beginPath(); cx.arc(px,py,r,0,Math.PI*2); cx.fill();
      cx.globalAlpha = coreA;
      cx.fillStyle = 'rgba(255,248,252,1)';
      cx.beginPath(); cx.arc(px,py,r*.38,0,Math.PI*2); cx.fill();
    }
    cx.globalAlpha = 1;
    cx.restore();

    // Word inside orb
    if (this.wordText && this.wordAlpha > 0.01) {
      const wA  = this.wordAlpha * this.alpha;
      const gi  = this.wordGlowIntensity;
      const bs  = Math.max(18, Math.min(this.MAX_RADIUS * 0.5, innerWidth * 0.11));
      const sc  = 0.72 + (this.dispRadius / Math.max(this.MAX_RADIUS, 1)) * 0.42;
      const fs  = bs * sc * (this.wordScale || 1);
      if (fs < 2) return;

      cx.save();
      const glR = 10 + gi * 30;
      cx.shadowColor = `rgba(200,160,230,${(wA * (0.25 + gi * 0.7)).toFixed(2)})`;
      cx.shadowBlur  = glR;
      const bright = Math.round(200 + gi * 50);
      cx.globalAlpha = wA;
      cx.font = `300 ${fs.toFixed(1)}px 'Cormorant Garamond', Georgia, serif`;
      cx.textAlign    = 'center';
      cx.textBaseline = 'middle';
      cx.fillStyle = `rgba(${bright+10},${bright-10},${bright+30},${wA.toFixed(3)})`;
      cx.fillText(this.wordText, px, py);
      cx.shadowBlur = 0;
      cx.restore();
    }
  }
}

let breathOrb = null;

// ── RENDER LOOP ──
function loop() {
  cx.clearRect(0, 0, cv.width, cv.height);

  // Grain texture
  if (!grainPattern) {
    try { grainPattern = cx.createPattern(grainCanvas, 'repeat'); } catch(e) {}
  }
  if (grainPattern) {
    cx.save();
    cx.globalAlpha = 0.28;
    cx.fillStyle = grainPattern;
    cx.fillRect(0, 0, innerWidth, innerHeight);
    cx.restore();
  }

  updateWaves();
  drawInterferenceZone(waveCoherence);
  drawWave(wRose,   waveCoherence);
  drawWave(wViolet, waveCoherence);
  iParticles.forEach(p => p.draw());

  if (breathOrb) { breathOrb.update(); breathOrb.draw(); drawBreathRing(); }
  requestAnimationFrame(loop);
}

function drawBreathRing() {
  if (!breathOrb) return;
  const isIn  = breathOrb.phase === 'inhale' || breathOrb.phase === 'hold';
  const isOut = breathOrb.phase === 'exhale';
  if (!isIn && !isOut) return;
  const dur   = isIn ? breathOrb.INHALE : breathOrb.EXHALE;
  const progT = Math.min(breathOrb.elapsed / dur, 1);
  const arc   = isIn ? progT * Math.PI * 2 : (1 - progT) * Math.PI * 2;
  const ringR = breathOrb.dispRadius * 2.6 + 16;
  const alpha = 0.15 + 0.10 * Math.sin(breathOrb.flickPh * 0.4);
  cx.save();
  cx.globalAlpha  = alpha;
  cx.strokeStyle  = 'rgba(200,160,230,1)';
  cx.lineWidth    = 1;
  cx.lineCap      = 'round';
  cx.beginPath();
  cx.arc(breathOrb.x, breathOrb.y, ringR, -Math.PI/2, -Math.PI/2 + arc);
  cx.stroke();
  cx.restore();
}

loop();

// ── AUDIO ──
function initAudio() {
  if (audioCtx && audioCtx.state !== 'closed') return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function resumeAudio() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return;
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
}
document.addEventListener('touchstart', resumeAudio, {passive:true, capture:true});
document.addEventListener('click',      resumeAudio, {passive:true, capture:true});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) resumeAudio();
  else if (audioCtx && audioCtx.state !== 'closed') audioCtx.suspend().catch(() => {});
});

function tryDrone() {
  if (!audioEnabled) return;
  initAudio(); if (!audioCtx) return;
  if (droneNodes.length) return;
  // V2 drone: warmer, deeper — 396Hz root + 174Hz liberation + subtle violet harmonic
  if (audioCtx.state === 'suspended') { audioCtx.resume().then(startDrone); return; }
  startDrone();
}
function startDrone() {
  if (droneNodes.length) return;
  [[396,0.018],[198,0.012],[174,0.009],[792,0.006]].forEach(([f,g]) => {
    const o = audioCtx.createOscillator();
    const gn = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    gn.gain.setValueAtTime(0, audioCtx.currentTime);
    gn.gain.linearRampToValueAtTime(g, audioCtx.currentTime + 4);
    o.connect(gn); gn.connect(audioCtx.destination); o.start();
    droneNodes.push({o, gn});
  });
}
function fadeDrone(out = true, dur = 2) {
  if (!audioCtx || !droneNodes.length) return;
  droneNodes.forEach(({gn}) => {
    const now = audioCtx.currentTime;
    gn.gain.cancelScheduledValues(now);
    gn.gain.setValueAtTime(gn.gain.value, now);
    gn.gain.linearRampToValueAtTime(out ? 0 : 0.018, now + dur);
  });
  if (out) setTimeout(() => {
    droneNodes.forEach(({o}) => { try { o.stop(); } catch(e) {} });
    droneNodes = [];
  }, (dur + 0.2) * 1000);
}

// Phase signature tones
function playTone(freqs) {
  if (!audioCtx) return;
  freqs.forEach(([f, delay, gain]) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t0 = audioCtx.currentTime + delay;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.5);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + 4);
  });
}
const playNoticeSound   = () => playTone([[396,0,.035],[528,.25,.022],[792,.5,.012]]);
const playHoldSound     = () => playTone([[288,0,.040],[216,.3,.025],[174,.6,.015]]);
const playAnchorSound   = () => playTone([[528,0,.045],[660,.2,.028],[440,.4,.018]]);
const playIntegrateSound= () => playTone([[432,0,.038],[648,.3,.022],[864,.6,.012]]);
const playSelectTone    = () => playTone([[528,0,.030],[660,.1,.018]]);
const playBackNav       = () => {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(440, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.4);
  g.gain.setValueAtTime(0, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0.028, audioCtx.currentTime + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.7);
};

// Breath tones
function playBreathInhale() {
  if (!audioCtx) return;
  [[220,0],[330,.08],[440,.16]].forEach(([f,d]) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.85, audioCtx.currentTime + d);
    o.frequency.linearRampToValueAtTime(f, audioCtx.currentTime + d + 3.5);
    const t0 = audioCtx.currentTime + d;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.025, t0 + .6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.8);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + 5.2);
  });
}
function playBreathExhale() {
  if (!audioCtx) return;
  [[440,0],[330,.1],[220,.2]].forEach(([f,d]) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, audioCtx.currentTime + d);
    o.frequency.exponentialRampToValueAtTime(f * 0.72, audioCtx.currentTime + d + 4.5);
    const t0 = audioCtx.currentTime + d;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.030, t0 + .3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 5.5);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + 6);
  });
}

// ── SCREEN TRANSITIONS ──
function showScreen(id, cb) {
  resumeAudio();
  const token = ++screenToken;
  const next  = document.getElementById(id);
  if (!next) { if (cb) cb(); return; }

  const active = Array.from(document.querySelectorAll('.screen.active'))
                      .filter(el => el !== next);

  const activate = () => {
    if (token !== screenToken) return;
    active.forEach(el => { el.classList.remove('active'); el.style.opacity=''; el.style.transition=''; });
    next.classList.add('active');
    next.style.opacity    = '0';
    next.style.transition = 'none';
    requestAnimationFrame(() => {
      if (token !== screenToken) return;
      next.style.transition = 'opacity 0.68s ease';
      next.style.opacity    = '1';
      setTimeout(() => {
        if (token !== screenToken) return;
        next.style.opacity = ''; next.style.transition = '';
        if (cb) cb();
      }, 700);
    });
  };

  if (active.length) {
    active[0].style.transition = 'opacity 0.38s ease';
    active[0].style.opacity    = '0';
    setTimeout(() => {
      if (token !== screenToken) return;
      activate();
    }, 390);
  } else { activate(); }
}

// ── CHROME ──
function showBackBtn(fn) {
  const btn = document.getElementById('backBtn');
  btn.style.opacity = '1'; btn.style.pointerEvents = 'all';
  btn.onclick = () => { if (audioCtx) playBackNav(); fn(); };
}
function hideBackBtn() {
  const btn = document.getElementById('backBtn');
  btn.style.opacity = '0'; btn.style.pointerEvents = 'none';
}

// ── SETTINGS ──
(function initSettingsSwipe() {
  const panel = document.getElementById('settings-panel');
  if (!panel) return;
  let startY = 0, dragging = false;
  panel.addEventListener('touchstart', e => { startY = e.touches[0].clientY; dragging = false; }, {passive:true});
  panel.addEventListener('touchmove',  e => {
    const dy = e.touches[0].clientY - startY;
    if (dy > 8) { dragging = true; panel.style.transition='none'; panel.style.transform=`translateY(${Math.max(0,dy)}px)`; }
  }, {passive:true});
  panel.addEventListener('touchend', e => {
    panel.style.transition = ''; panel.style.transform = '';
    if (dragging && e.changedTouches[0].clientY - startY > 80) closeSettings();
    dragging = false;
  });
})();

function toggleSettings()  { document.getElementById('settings-panel').classList.contains('open') ? closeSettings() : openSettings(); }
function openSettings()    {
  updateSettingsUI();
  document.getElementById('settings-panel').classList.add('open');
  document.getElementById('settings-backdrop').classList.add('open');
}
function closeSettings()   {
  document.getElementById('settings-panel').classList.remove('open');
  document.getElementById('settings-backdrop').classList.remove('open');
}
function updateSettingsUI() {
  const apiKey = lsGet('f2_api_key');
  const inp    = document.getElementById('st-api-input');
  const sta    = document.getElementById('st-api-status');
  const note   = document.getElementById('st-api-note');
  const t      = TRANSLATIONS[lang];
  if (inp) inp.value = apiKey ? '••••••••••••••••••••••' : '';
  if (inp) inp.placeholder = apiKey ? '' : 'sk-ant-...';
  if (sta) { sta.textContent = apiKey ? 'key saved ·' : 'no key'; sta.style.color = apiKey ? 'rgba(200,130,110,.8)' : 'rgba(237,224,212,.25)'; }
  if (note) note.textContent = t.apiNote;
  document.getElementById('st-audio').classList.toggle('active', audioEnabled);
  document.getElementById('st-font') .classList.toggle('active', fontLarge);
  document.getElementById('st-lang') .textContent = lang === 'en' ? 'EN' : 'ES';
}
function saveApiKey() {
  const inp = document.getElementById('st-api-input');
  if (!inp) return;
  const val = inp.value.trim();
  if (val && val !== '••••••••••••••••••••••') lsSet('f2_api_key', val);
  inp.value = ''; inp.placeholder = 'saved';
  setTimeout(() => { inp.placeholder = ''; updateSettingsUI(); }, 1500);
  updateSettingsUI();
}
function clearApiKey()           { lsDel('f2_api_key'); updateSettingsUI(); }
function settingsToggleAudio()   { audioEnabled = !audioEnabled; if (audioEnabled) tryDrone(); else fadeDrone(true, .8); updateSettingsUI(); }
function settingsToggleFont()    { fontLarge = !fontLarge; lsSet('f2_font_large', fontLarge?'1':'0'); document.body.classList.toggle('fs-large', fontLarge); updateSettingsUI(); }
function settingsToggleLang()    { setLang(lang === 'en' ? 'es' : 'en'); }

// ── LANG ──
function setLang(l) {
  if (l !== 'en' && l !== 'es') return;
  lang = l;
  lsSet('f2_lang', lang);
  applyLang();
  updateSettingsUI();
}
function applyLang() {
  document.documentElement.lang = lang;
  const t = TRANSLATIONS[lang];
  // Home
  const ha  = document.getElementById('homeArrival');
  const hsub= document.getElementById('homeArrivalSub');
  if (ha)   ha.textContent   = t.arrival;
  if (hsub) hsub.textContent = t.arrivalSub;
  // Lang segs
  const en = document.getElementById('langEn');
  const es = document.getElementById('langEs');
  if (en) en.classList.toggle('active', lang === 'en');
  if (es) es.classList.toggle('active', lang === 'es');
  updateHomeCount();
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function updateHomeCount() {
  const n    = parseInt(lsGet('f2_sessions') || '0');
  const el   = document.getElementById('homeCount');
  const t    = TRANSLATIONS[lang];
  if (!el) return;
  if (n > 0) {
    const today     = new Date().toDateString();
    const lastVisit = lsGet('f2_last_visit');
    const streak    = parseInt(lsGet('f2_streak') || '0');
    let s = streak;
    if (lastVisit !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      s = (lastVisit === yesterday) ? streak + 1 : 1;
      lsSet('f2_streak', s); lsSet('f2_last_visit', today);
    }
    let txt = t.sessionCount(n);
    if (s >= 2) txt += `  ·  ${t.streakLabel(s)}`;
    el.textContent = txt;
  } else { el.textContent = ''; }
}

// ── HOME ──
function goHome() {
  nextToken();
  breathOrb = null;
  fadeDrone(true, 1.5);
  clearBreathTimers();
  hideBackBtn();
  setWaveState('home');
  document.querySelectorAll('.al').forEach(a => a.classList.remove('on'));
  ['dec-breathe-cta'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });

  showScreen('s-home', () => {
    document.querySelectorAll('.al').forEach(a => a.classList.add('on'));
    setTimeout(tryDrone, 300);
  });
  applyLang();
  applyDawnPalette();
}

// ── ENTER — what are you holding? ──
function startEnter(fromPhase) {
  const tok = nextToken();
  const t   = TRANSLATIONS[lang];
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});

  // Title based on which phase initiated
  const titles = {
    notice:    t.noticeLabel,
    hold:      t.holdLabel,
    anchor:    t.anchorLabel,
    integrate: t.integrateLabel,
  };

  setText('enterTitle',    titles[fromPhase] || t.noticeLabel);
  setText('enterOr',       lang === 'en' ? '· or choose ·' : '· o elige ·');

  const qEl = document.getElementById('enterQuestion');
  if (qEl) qEl.textContent = t.arrival;

  const inp = document.getElementById('enterInput');
  if (inp) {
    inp.value = '';
    inp.placeholder = lang === 'en' ? 'name it...' : 'nómbralo...';
  }

  // Populate contractions
  const grid = document.getElementById('contractionGrid');
  if (grid) {
    grid.innerHTML = '';
    const items = CONTRACTIONS[lang];
    items.forEach((name, i) => {
      const btn = document.createElement('button');
      btn.className = 'contraction-pill';
      btn.textContent = name;
      const dur = (2.4 + Math.random() * 1.6).toFixed(2);
      btn.style.setProperty('--drift-dur', dur + 's');
      btn.style.animationDelay = (Math.random() * -2).toFixed(2) + 's';
      btn.addEventListener('click', () => {
        if (!isAlive(tok)) return;
        currentContraction = CONTRACTIONS.en[i]; // always store EN key
        if (inp) inp.value = name;
        showContinue();
        if (audioCtx) playSelectTone();
        if (navigator.vibrate) navigator.vibrate(10);
      });
      btn.addEventListener('touchend', e => { e.preventDefault(); btn.click(); });
      grid.appendChild(btn);
    });
  }

  const contBtn = document.getElementById('enterContinue');
  if (contBtn) {
    contBtn.textContent = t.continueBtn;
    contBtn.classList.remove('ready');
  }

  // Input listener
  if (inp) {
    inp.oninput = () => {
      if (inp.value.trim().length > 1) showContinue();
      else hideContinue();
    };
    inp.onkeydown = e => {
      if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); confirmEntry(fromPhase); }
    };
  }

  showBackBtn(() => goHome());
  showScreen('s-enter', () => {
    if (isAlive(tok)) setTimeout(() => inp && inp.focus(), 400);
  });

  window._enterFromPhase = fromPhase;
}

function showContinue() {
  const btn = document.getElementById('enterContinue');
  if (btn) btn.classList.add('ready');
}
function hideContinue() {
  const btn = document.getElementById('enterContinue');
  if (btn) btn.classList.remove('ready');
}

function confirmEntry(fromPhase) {
  const phase = fromPhase || window._enterFromPhase || 'notice';
  const inp   = document.getElementById('enterInput');
  const raw   = inp ? inp.value.trim() : '';
  if (!raw) return;

  // Map display name to English key if it's a contraction
  const enIdx = CONTRACTIONS[lang].indexOf(raw);
  currentContraction = enIdx >= 0 ? CONTRACTIONS.en[enIdx] : raw;

  if (audioCtx) { if      (phase === 'notice')    playNoticeSound();
                  else if (phase === 'hold')      playHoldSound();
                  else if (phase === 'anchor')    playAnchorSound();
                  else if (phase === 'integrate') playIntegrateSound(); }

  if      (phase === 'notice')    launchNotice();
  else if (phase === 'hold')      launchHold();
  else if (phase === 'anchor')    launchAnchor();
  else if (phase === 'integrate') launchIntegrate();
  else                            launchNotice();
}

// Direct phase entry from home — each can start solo or as part of the river
function startNotice()    { lsSet('f2_cnt_notice',    parseInt(lsGet('f2_cnt_notice')    ||'0')+1); startEnter('notice');    }
function startHold()      { lsSet('f2_cnt_hold',      parseInt(lsGet('f2_cnt_hold')      ||'0')+1); startEnter('hold');      }
function startAnchor()    { lsSet('f2_cnt_anchor',    parseInt(lsGet('f2_cnt_anchor')    ||'0')+1); startEnter('anchor');    }
function startIntegrate() { lsSet('f2_cnt_integrate', parseInt(lsGet('f2_cnt_integrate') ||'0')+1); startEnter('integrate'); }

// ── NOTICE PHASE ──
let breathTimers = [];
function bDelay(fn, ms) {
  const id = setTimeout(fn, ms);
  breathTimers.push(id);
  return id;
}
function clearBreathTimers() {
  breathTimers.forEach(clearTimeout);
  breathTimers = [];
}

function launchNotice() {
  const tok = nextToken();
  const t   = TRANSLATIONS[lang];
  bgDimTgt  = 0.6;

  setText('pname-notice',    t.noticeLabel.toUpperCase());
  setText('carrying-notice', currentContraction);
  setText('prompt-notice',   t.noticePrompt);

  // Body zones
  const bpEl = document.getElementById('bodyPrompt');
  const bzEl = document.getElementById('bodyZones');
  if (bpEl) bpEl.textContent = lang === 'en' ? 'where does it live?' : '¿dónde vive?';
  if (bzEl) {
    bzEl.innerHTML = '';
    BODY_ZONES[lang].forEach((zone, i) => {
      const btn = document.createElement('button');
      btn.className = 'body-zone';
      btn.textContent = zone;
      btn.addEventListener('click', () => {
        if (!isAlive(tok)) return;
        document.querySelectorAll('.body-zone').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentBodyZone = BODY_ZONES.en[i];
        if (audioCtx) playSelectTone();
        if (navigator.vibrate) navigator.vibrate(8);
        // Trigger AI thread
        fetchNoticeReflection(tok);
      });
      bzEl.appendChild(btn);
    });
  }

  // Reset AI thread
  const aiEl = document.getElementById('aiNotice');
  if (aiEl) { aiEl.textContent = ''; aiEl.classList.remove('visible'); }

  setText('fwdNotice',  t.continueBtn);
  setText('skipNotice', t.skipBtn);

  setWaveState('notice');
  showBackBtn(() => goHome());
  showScreen('s-notice', () => {
    document.querySelectorAll('.al').forEach(a => a.classList.add('on'));
  });
}

async function fetchNoticeReflection(tok) {
  const apiKey = lsGet('f2_api_key');
  if (!apiKey) return;
  const aiEl = document.getElementById('aiNotice');
  if (!aiEl) return;
  const zone = currentBodyZone ? ` in the ${currentBodyZone}` : '';
  const prompt = `The person is noticing "${currentContraction}"${zone}. Offer one quiet sentence — not advice, just presence. 12 words maximum.`;
  try {
    const res = await callClaude(prompt, NOTICE_SYSTEM);
    if (!isAlive(tok)) return;
    if (res) {
      aiEl.textContent = res;
      aiEl.classList.add('visible');
    }
  } catch(e) {}
}

function advanceToHold() {
  if (audioCtx) playHoldSound();
  launchHold();
}

// ── HOLD PHASE ──
function launchHold() {
  const tok = nextToken();
  const t   = TRANSLATIONS[lang];
  bgDimTgt  = 0.45;

  setText('pname-hold',    t.holdLabel.toUpperCase());
  setText('carrying-hold', currentContraction);
  setText('prompt-hold',   t.holdPrompt);

  const aiEl = document.getElementById('aiHold');
  if (aiEl) { aiEl.textContent = ''; aiEl.classList.remove('visible'); }

  setText('fwdHold',  t.continueBtn);
  setText('skipHold', t.skipBtn);

  setWaveState('hold');
  showBackBtn(() => goHome());
  showScreen('s-hold', () => {
    setTimeout(() => fetchHoldReflection(tok), 2800);
  });
}

async function fetchHoldReflection(tok) {
  const apiKey = lsGet('f2_api_key');
  if (!apiKey) return;
  const aiEl = document.getElementById('aiHold');
  if (!aiEl) return;
  const zone = currentBodyZone ? ` They feel it in the ${currentBodyZone}.` : '';
  const prompt = `Person is holding "${currentContraction}" without trying to fix it.${zone} Offer one witnessing sentence — not advice. 12 words max.`;
  try {
    const res = await callClaude(prompt, HOLD_SYSTEM);
    if (!isAlive(tok)) return;
    if (res) { aiEl.textContent = res; aiEl.classList.add('visible'); }
  } catch(e) {}
}

function advanceToAnchor() {
  if (audioCtx) playAnchorSound();
  launchAnchor();
}

// ── ANCHOR PHASE — the polarity reveal ──
function launchAnchor() {
  const tok = nextToken();
  const t   = TRANSLATIONS[lang];
  bgDimTgt  = 0.35;

  setText('pname-anchor', t.anchorLabel.toUpperCase());

  // Find complementary truth
  const seedKey      = currentContraction;
  const seedEN       = POLARITY_SEEDS.en[seedKey] || '';
  const seedES       = POLARITY_SEEDS.es[seedKey] || '';
  const complementTxt= lang === 'en' ? seedEN : seedES;

  // Reset polarity elements
  const pH  = document.getElementById('polarityHeavy');
  const pAnd= document.getElementById('polarityAnd');
  const pL  = document.getElementById('polarityLight');
  const pB  = document.getElementById('polarityBoth');
  [pH,pAnd,pL,pB].forEach(el => { if(el) el.classList.remove('visible'); });

  const contrastDisplayName = CONTRACTIONS[lang][CONTRACTIONS.en.indexOf(currentContraction)] || currentContraction;
  if (pH)  pH.textContent  = lang === 'en' ? `I am carrying ${contrastDisplayName}.` : `Estoy cargando ${contrastDisplayName}.`;
  if (pAnd) pAnd.textContent = lang === 'en' ? 'and' : 'y';
  if (pL)  pL.textContent  = complementTxt;
  if (pB)  pB.textContent  = TRANSLATIONS[lang].bothTrue;

  // Frequency selection
  setText('freqLabel', lang === 'en' ? 'which frequency calls you?' : '¿qué frecuencia te llama?');
  const freqGrid = document.getElementById('freqGrid');
  if (freqGrid) {
    freqGrid.innerHTML = '';
    FREQUENCIES[lang].forEach((f, i) => {
      const btn = document.createElement('button');
      btn.className = 'freq-btn';
      btn.innerHTML = `<div class="freq-name">${f.name}</div><div class="freq-hint">${f.hint}</div>`;
      btn.addEventListener('click', () => {
        if (!isAlive(tok)) return;
        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('chosen'));
        btn.classList.add('chosen');
        chosenFrequency = FREQUENCIES.en[i].name;
        if (audioCtx) playSelectTone();
        if (navigator.vibrate) navigator.vibrate(10);
        // Show forward button
        const fwd = document.getElementById('fwdAnchor');
        if (fwd) { fwd.style.opacity='1'; fwd.style.pointerEvents='all'; fwd.textContent = t.continueBtn; }
      });
      freqGrid.appendChild(btn);
    });
  }

  const fwd = document.getElementById('fwdAnchor');
  if (fwd) { fwd.style.opacity='0'; fwd.style.pointerEvents='none'; }

  setWaveState('anchor');
  showBackBtn(() => goHome());
  showScreen('s-anchor', () => {
    // Stagger polarity reveal
    setTimeout(() => pH  && pH.classList.add('visible'),  300);
    setTimeout(() => pAnd && pAnd.classList.add('visible'), 1200);
    setTimeout(() => {
      if (!isAlive(tok)) return;
      // If no seed, fetch from AI
      if (!complementTxt && lsGet('f2_api_key')) {
        fetchPolarityComplement(tok, pL, pB);
      } else {
        setTimeout(() => pL && pL.classList.add('visible'), 400);
        setTimeout(() => pB && pB.classList.add('visible'), 1600);
      }
    }, 1400);
  });
}

async function fetchPolarityComplement(tok, pL, pB) {
  const apiKey = lsGet('f2_api_key');
  if (!apiKey) return;
  const prompt = `The person is carrying "${currentContraction}". Find the complementary truth — not the opposite, the thing that is ALSO true from lived experience. One sentence, starting with "And". Max 20 words.`;
  try {
    const res = await callClaude(prompt, POLARITY_SYSTEM);
    if (!isAlive(tok)) return;
    if (res && pL) {
      pL.textContent = res;
      pL.classList.add('visible');
      setTimeout(() => { if (isAlive(tok) && pB) pB.classList.add('visible'); }, 1400);
    }
  } catch(e) {
    if (pL) pL.classList.add('visible');
    setTimeout(() => { if (pB) pB.classList.add('visible'); }, 1000);
  }
}

// ── BREATH — inside Anchor ──
let breathRunning = false;

function startBreath() {
  const tok = nextToken();
  const t   = TRANSLATIONS[lang];
  clearBreathTimers();
  breathRunning = true;
  bgDimTgt = 0.25;

  // Orb starts at centre
  const startX = innerWidth  * 0.5;
  const startY = innerHeight * 0.5;

  setWaveState('breath');

  breathOrb = new BreathOrb(startX, startY);
  breathOrb.wordText        = chosenFrequency || currentContraction;
  breathOrb.wordTargetAlpha = 0;
  breathOrb.wordGlowIntensity = 0;

  const btext = document.getElementById('breathWord');
  const cues  = BREATH_CUES[lang];

  function showBtext(txt) {
    if (!btext) return;
    if (parseFloat(btext.style.opacity || '0') > 0.05) {
      btext.style.opacity = '0';
      bDelay(() => { btext.textContent = txt; btext.style.opacity = '1'; }, 500);
    } else { btext.textContent = txt; btext.style.opacity = '1'; }
  }
  function hideBtext(delay) {
    bDelay(() => { if (btext) btext.style.opacity = '0'; }, delay);
  }

  // Pre-breath instructions during SETTLE
  const both = lang === 'en'
    ? `${currentContraction}  ·  ${chosenFrequency || ''}`
    : `${CONTRACTIONS[lang][CONTRACTIONS.en.indexOf(currentContraction)] || currentContraction}  ·  ${chosenFrequency || ''}`;

  bDelay(() => {
    if (btext) { btext.textContent = lang === 'en' ? 'breathe in all of it' : 'inhala todo ello'; btext.style.opacity = '1'; }
  }, 600);
  hideBtext(4200);
  bDelay(() => {
    if (btext) { btext.textContent = lang === 'en' ? `hold both  ·  breathe` : `sostén ambos  ·  respira`; btext.style.opacity = '1'; }
    if (breathOrb) breathOrb.wordTargetAlpha = 0.22;
  }, 5000);
  hideBtext(8800);

  breathOrb.onPhaseChange = (phase, cycle) => {
    if (phase === 'inhale') {
      if (breathOrb) breathOrb.wordTargetAlpha = [0.15, 0.22, 0.30][Math.min(cycle, 2)];
      bDelay(() => showBtext(cues.inhale), 300);
      hideBtext(breathOrb.INHALE - 700);
      playBreathInhale();
    } else if (phase === 'hold') {
      if (breathOrb) breathOrb.wordTargetAlpha = 0.5;
      bDelay(() => showBtext(cues.hold), 100);
    } else if (phase === 'exhale') {
      if (breathOrb) {
        breathOrb.wordTargetAlpha    = [0.35, 0.55, 1.0][Math.min(cycle, 2)];
        breathOrb.wordGlowIntensity  = [0.05, 0.12, 1.0][Math.min(cycle, 2)];
      }
      showBtext(cues.exhale);
      hideBtext(breathOrb.EXHALE - 700);
      playBreathExhale();
    } else if (phase === 'rest') {
      const dot = document.getElementById('bdot' + (cycle - 1));
      if (dot) dot.classList.add('done');
    } else if (phase === 'crystallised') {
      if (breathOrb) { breathOrb.wordTargetAlpha = 1; breathOrb.wordGlowIntensity = 1; }
      const dot = document.getElementById('bdot2');
      if (dot) dot.classList.add('done');
    }
  };

  breathOrb.onCyclesDone = () => {
    breathRunning = false;
    if (btext) btext.style.opacity = '0';
    bDelay(() => {
      if (!breathOrb) return;
      breathOrb.morphStartY    = breathOrb.y;
      breathOrb.wordTargetAlpha = 0;
      breathOrb.startPhase('morph');
      breathOrb.onMorphDone = () => {
        requestAnimationFrame(() => { breathOrb = null; });
        bDelay(() => launchIntegrate(), 400);
      };
    }, 600);
  };

  // Reset breath dots
  ['bdot0','bdot1','bdot2'].forEach(id => {
    const d = document.getElementById(id);
    if (d) d.classList.remove('done');
  });

  showBackBtn(() => goHome());
  showScreen('s-breath');
}

// ── INTEGRATE PHASE ──
function launchIntegrate() {
  const tok = nextToken();
  const t   = TRANSLATIONS[lang];
  bgDimTgt  = 0.5;

  breathOrb = null;
  clearBreathTimers();

  setWaveState('integrate');
  setText('pname-integrate', t.integrateLabel.toUpperCase());

  // Witnessed sentence
  const witnessedEl = document.getElementById('integrateWitnessed');
  const wKey        = currentContraction;
  const witnessed   = (WITNESSED[lang] && WITNESSED[lang][wKey]) || '';
  if (witnessedEl) { witnessedEl.textContent = witnessed; witnessedEl.classList.remove('visible'); }

  // Whisper — past session thread
  const whisperEl = document.getElementById('integrateWhisper');
  const lastThread = lsGet('f2_thread');
  if (whisperEl) {
    if (lastThread) {
      const prefix = lang === 'en' ? 'last time:' : 'la última vez:';
      whisperEl.innerHTML = `<span style="font-size:.8em;letter-spacing:.14em;opacity:.6;">${prefix}</span><br>&#8220;${lastThread}&#8221;`;
      whisperEl.classList.remove('visible');
    } else { whisperEl.style.display = 'none'; }
  }

  // Thread input
  const threadWrap = document.getElementById('integrateThreadWrap');
  const threadInp  = document.getElementById('integrateInput');
  const aiResp     = document.getElementById('integrateAI');
  const returnBtn  = document.getElementById('integrateReturn');

  if (threadWrap) { threadWrap.classList.remove('visible'); }
  if (aiResp)     { aiResp.textContent = ''; aiResp.classList.remove('visible'); }
  if (returnBtn)  { returnBtn.classList.remove('visible'); returnBtn.textContent = t.retBtn; }
  setText('integratePromptLbl', t.threadPrompt);

  if (threadInp) {
    threadInp.value       = '';
    threadInp.placeholder = lang === 'en' ? 'speak it or write it...' : 'dilo o escríbelo...';
    threadInp.onkeydown   = e => {
      if (e.key === 'Enter' && threadInp.value.trim()) { e.preventDefault(); submitThread(tok); }
    };
    threadInp.onblur = () => {
      if (threadInp.value.trim()) submitThread(tok);
    };
  }

  // Log session
  const n = parseInt(lsGet('f2_sessions') || '0') + 1;
  lsSet('f2_sessions', n);
  logSession({ contraction: currentContraction, frequency: chosenFrequency, zone: currentBodyZone, ts: Date.now() });

  showBackBtn(() => goHome());
  showScreen('s-integrate', () => {
    setTimeout(() => { if (isAlive(tok) && witnessedEl) witnessedEl.classList.add('visible'); }, 600);
    setTimeout(() => { if (isAlive(tok) && whisperEl && lastThread) whisperEl.classList.add('visible'); }, 1800);
    setTimeout(() => { if (isAlive(tok) && threadWrap) { threadWrap.classList.add('visible'); setTimeout(() => threadInp && threadInp.focus(), 200); } }, 3500);
    setTimeout(() => { if (isAlive(tok) && returnBtn) returnBtn.classList.add('visible'); }, 7000);
  });

  updateHomeCount();
}

async function submitThread(tok) {
  const threadInp = document.getElementById('integrateInput');
  const aiResp    = document.getElementById('integrateAI');
  const returnBtn = document.getElementById('integrateReturn');
  const val       = threadInp ? threadInp.value.trim() : '';
  if (!val) return;

  lsSet('f2_thread', val);
  if (threadInp) { threadInp.disabled = true; threadInp.style.opacity = '.45'; }

  const apiKey = lsGet('f2_api_key');
  if (apiKey && aiResp) {
    const prompt = `Person completed a session carrying "${currentContraction}", anchoring "${chosenFrequency}". They wrote: "${val}". Offer one line of quiet affirmation — not praise, just presence. The field acknowledging them. Max 15 words.`;
    try {
      const res = await callClaude(prompt, INTEGRATE_SYSTEM);
      if (!isAlive(tok)) return;
      if (res && aiResp) {
        aiResp.textContent = res;
        aiResp.classList.add('visible');
      }
    } catch(e) {}
  }

  setTimeout(() => {
    if (!isAlive(tok)) return;
    if (returnBtn) returnBtn.classList.add('visible');
  }, apiKey ? 3200 : 600);
}

// ── SESSION LOG ──
function logSession(entry) {
  try {
    const raw = lsGet('f2_sessions_log');
    const log = raw ? JSON.parse(raw) : [];
    log.push(entry);
    if (log.length > 30) log.splice(0, log.length - 30);
    lsSet('f2_sessions_log', JSON.stringify(log));
  } catch(e) {}
}

// ── AI INTEGRATION ──
// System prompts — sparse, field-language, polarity-aware
const NOTICE_SYSTEM = `You are a quiet field presence. The person is noticing something in their body. Your role: one sentence of gentle acknowledgement. Not advice. Not analysis. Speak to what's present in the body. Field language: sensation, present, located, here, felt. Max 12 words.`;

const HOLD_SYSTEM = `You are a witnessing presence. The person is staying with something difficult without trying to fix it. Your role: one sentence that says — I see you holding this. Not guidance. Pure witnessing. Max 12 words.`;

const POLARITY_SYSTEM = `You are a field mirror specialising in polarity work. The person is carrying a heavy state. Your role: find the complementary truth — not the opposite, the thing that is also TRUE from lived human experience. Start with "And". One sentence. Max 20 words. No bypassing. The heavy state is real. The complement is also real.`;

const ANCHOR_SYSTEM = `You are a somatic anchor presence. The person has chosen a frequency state to embody. Your role: one sentence that helps locate this frequency in the body right now. Not "you should" — "this is already here". Max 12 words.`;

const INTEGRATE_SYSTEM = `You are the field at rest. The person completed a session and wrote one true thing. Your role: one line of quiet affirmation — not praise, not analysis. Just presence acknowledging presence. Speak as if the field itself is recognising them. Max 14 words. Never begin with "I". No exclamation marks.`;

async function callClaude(userMsg, system, maxTokens = 80) {
  const apiKey = lsGet('f2_api_key');
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userMsg }]
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch(e) { return null; }
}

// ── CIRCADIAN / DAWN PALETTE ──
function applyDawnPalette() {
  const h    = new Date().getHours();
  const root = document.documentElement.style;
  if (h >= 5 && h < 9) {
    // Early dawn — rose-gold, warmest
    root.setProperty('--bg',    '#0c0810');
    root.setProperty('--rose',  '#d48878');
    root.setProperty('--violet','#a890c0');
  } else if (h >= 9 && h < 17) {
    // Day — default
    root.removeProperty('--bg');
    root.removeProperty('--rose');
    root.removeProperty('--violet');
  } else if (h >= 17 && h < 21) {
    // Dusk — deeper rose
    root.setProperty('--bg',    '#0e0a10');
    root.setProperty('--rose',  '#b87868');
    root.setProperty('--violet','#9070a8');
  } else {
    // Night — cooler violet
    root.setProperty('--bg',    '#060510');
    root.setProperty('--rose',  '#a87868');
    root.setProperty('--violet','#8870a8');
  }
}

// ── INIT ──
if (fontLarge) document.body.classList.add('fs-large');
applyDawnPalette();
applyLang();
setWaveState('home');
tryDrone();
document.querySelectorAll('.al').forEach(a => a.classList.add('on'));
updateHomeCount();
