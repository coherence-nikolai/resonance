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
let bgDimTgt = 1;
let interferenceFlashVal = 0;
let interferenceFlashTgt = 0;

// ── CANVAS ──
const cv = document.getElementById('cv');
if (!cv) { console.error('FIELD: canvas #cv not found'); }
const cx = cv ? cv.getContext('2d') : null;

function rsz() {
  if (!cv || !cx) return;
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
// Rose wave: reserved strip just below chrome
// Violet wave: reserved strip just above nav
// Content zone always clear between them

// Fixed vertical positions — must be declared first
const WAVE_TOP_FRAC = 0.13;
const WAVE_BOT_FRAC = 0.87;

let waveState = 'home';
let waveCoherence = 0;
let waveCoherenceTgt = 0;
let waveTime = 0;
let waveBreathAmp = 0;
let waveRoseY       = WAVE_TOP_FRAC;
let waveVioletY     = WAVE_BOT_FRAC;
let waveRoseYTgt    = WAVE_TOP_FRAC;
let waveVioletYTgt  = WAVE_BOT_FRAC;

const wRose = {
  freq: 0.0016, amp: 0.058, targetAmp: 0.058,
  phase: 0, phaseV: 0.022,
  color: '200,130,110', alpha: 0.52, targetAlpha: 0.52, thickness: 2.5,
};
const wViolet = {
  freq: 0.0022, amp: 0.052, targetAmp: 0.052,
  phase: Math.PI * 0.6, phaseV: 0.026,
  color: '152,128,184', alpha: 0.45, targetAlpha: 0.45, thickness: 2.0,
};

const iParticles = [];
const MAX_IPART = 22;

class IParticle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = (Math.random()-0.5)*0.5; this.vy = (Math.random()-0.5)*0.4;
    this.r = 0.8 + Math.random()*1.6;
    this.alpha = 0; this.targetAlpha = 0.45 + Math.random()*0.35;
    this.life = 0; this.maxLife = 100 + Math.random()*160;
    this.isRose = Math.random() < 0.5;
  }
  update() {
    this.life++;
    this.x += this.vx; this.y += this.vy;
    this.vx *= 0.993; this.vy *= 0.993;
    const p = this.life / this.maxLife;
    const fade = p < 0.15 ? p/0.15 : p > 0.7 ? 1-(p-0.7)/0.3 : 1;
    this.alpha = this.targetAlpha * fade * waveCoherence;
  }
  draw() {
    if (this.alpha < 0.01 || !cx) return;
    const col = this.isRose ? '210,165,140' : '180,155,210';
    cx.save();
    cx.globalAlpha = this.alpha;
    const g = cx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r*3.5);
    g.addColorStop(0,`rgba(${col},1)`); g.addColorStop(1,`rgba(${col},0)`);
    cx.fillStyle = g;
    cx.beginPath(); cx.arc(this.x,this.y,this.r*3.5,0,Math.PI*2); cx.fill();
    cx.restore();
  }
  isDead() { return this.life >= this.maxLife; }
}

function spawnInterferenceParticles() {
  if (waveCoherence < 0.30 || iParticles.length >= MAX_IPART) return;
  if (Math.random() > 0.12 * waveCoherence) return;
  const h = innerHeight;
  iParticles.push(new IParticle(Math.random()*innerWidth, h*0.38 + Math.random()*h*0.24));
}

function drawWave(wave, yFrac, breathAmp) {
  if (!cx) return;
  const w = innerWidth, h = innerHeight;
  const centreY = yFrac * h;
  const totalAmp = (wave.amp + breathAmp) * h;

  // Build wave path points
  const steps = Math.ceil(w / 2);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i/steps)*w;
    const p  = Math.sin(x*wave.freq*(w/380)+wave.phase)*totalAmp;
    const h2 = Math.sin(x*wave.freq*2.1*(w/380)+wave.phase*1.3)*totalAmp*0.32;
    const h3 = Math.sin(x*wave.freq*3.7*(w/380)+wave.phase*0.8)*totalAmp*0.14;
    pts.push([x, centreY+p+h2+h3]);
  }

  // Layer 1: wide soft glow corona — thread back to v1
  cx.save();
  cx.beginPath();
  pts.forEach(([x,y],i) => i===0 ? cx.moveTo(x,y) : cx.lineTo(x,y));
  cx.strokeStyle = `rgba(${wave.color},${(wave.alpha*0.25).toFixed(3)})`;
  cx.lineWidth = 18 + waveCoherence * 28 + breathAmp * h * 1.2;
  cx.lineCap = 'round';
  cx.filter = 'blur(8px)';
  cx.stroke();
  cx.filter = 'none';
  cx.restore();

  // Layer 2: mid glow
  cx.save();
  cx.beginPath();
  pts.forEach(([x,y],i) => i===0 ? cx.moveTo(x,y) : cx.lineTo(x,y));
  cx.strokeStyle = `rgba(${wave.color},${(wave.alpha*0.45).toFixed(3)})`;
  cx.lineWidth = 7 + waveCoherence * 12 + breathAmp * h * 0.6;
  cx.lineCap = 'round';
  cx.shadowColor = `rgba(${wave.color},${(waveCoherence*0.6+breathAmp*2.5).toFixed(2)})`;
  cx.shadowBlur = 14 + waveCoherence * 20 + breathAmp * h * 0.4;
  cx.stroke();
  cx.restore();

  // Layer 3: bright core line
  cx.save();
  cx.beginPath();
  pts.forEach(([x,y],i) => i===0 ? cx.moveTo(x,y) : cx.lineTo(x,y));
  const glowA = (wave.alpha*(0.75+waveCoherence*0.25)).toFixed(3);
  cx.strokeStyle = `rgba(${wave.color},${glowA})`;
  cx.lineWidth = wave.thickness + waveCoherence*1.8 + breathAmp*h*0.4;
  cx.lineCap = 'round';
  cx.shadowColor = `rgba(${wave.color},${(0.3+waveCoherence*0.4).toFixed(2)})`;
  cx.shadowBlur = 6 + waveCoherence * 12;
  cx.stroke();
  cx.restore();
}

function drawInterferenceZone(coherence) {
  if (!cx || coherence < 0.08) return;
  const w = innerWidth, h = innerHeight;
  cx.save();
  const g = cx.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,Math.min(w,h)*(0.28+coherence*0.38));
  g.addColorStop(0,`rgba(210,170,220,${(coherence*0.09).toFixed(3)})`);
  g.addColorStop(.5,`rgba(185,145,200,${(coherence*0.05).toFixed(3)})`);
  g.addColorStop(1,'rgba(152,128,184,0)');
  cx.fillStyle = g; cx.fillRect(0,0,w,h);
  if (coherence > 0.65) {
    cx.globalAlpha = (coherence-0.65)*0.35;
    cx.strokeStyle = `rgba(230,205,245,${((coherence-0.65)*0.5).toFixed(3)})`;
    cx.lineWidth = 0.5; cx.shadowColor = 'rgba(210,180,240,0.7)'; cx.shadowBlur = 14;
    cx.beginPath(); cx.moveTo(0,h*.5); cx.lineTo(w,h*.5); cx.stroke();
  }
  cx.restore();
}

function updateWaves() {
  waveTime++;
  waveCoherence += (waveCoherenceTgt - waveCoherence) * 0.010;
  waveBreathAmp += (0 - waveBreathAmp) * 0.045;
  waveRoseY   += (waveRoseYTgt   - waveRoseY)   * 0.022;
  waveVioletY += (waveVioletYTgt - waveVioletY)  * 0.022;
  const slow = 1 - waveCoherence * 0.72;
  wRose.phase   += wRose.phaseV   * slow;
  wViolet.phase += wViolet.phaseV * slow;
  wRose.amp   += (wRose.targetAmp   - wRose.amp)   * 0.018;
  wViolet.amp += (wViolet.targetAmp - wViolet.amp)  * 0.018;
  wRose.alpha   += (wRose.targetAlpha   - wRose.alpha)   * 0.022;
  wViolet.alpha += (wViolet.targetAlpha - wViolet.alpha)  * 0.022;
  spawnInterferenceParticles();
  for (let i = iParticles.length-1; i >= 0; i--) {
    iParticles[i].update();
    if (iParticles[i].isDead()) iParticles.splice(i,1);
  }
}

function setWaveState(state) {
  waveState = state;
  if (state === 'home') {
    wRose.targetAmp=0.062; wViolet.targetAmp=0.056;
    wRose.targetAlpha=0.50; wViolet.targetAlpha=0.42;
    wRose.phaseV=0.022; wViolet.phaseV=0.028; // independent rhythms
    waveCoherenceTgt=0.05;
  } else if (state === 'notice') {
    wRose.targetAmp=0.066; wViolet.targetAmp=0.060;
    wRose.targetAlpha=0.58; wViolet.targetAlpha=0.50;
    wRose.phaseV=0.018; wViolet.phaseV=0.022; // slowing
    waveCoherenceTgt=0.22;
  } else if (state === 'hold') {
    wRose.targetAmp=0.058; wViolet.targetAmp=0.054;
    wRose.targetAlpha=0.62; wViolet.targetAlpha=0.55;
    wRose.phaseV=0.013; wViolet.phaseV=0.015; // slowing further
    waveCoherenceTgt=0.45;
  } else if (state === 'anchor') {
    wRose.targetAmp=0.050; wViolet.targetAmp=0.048;
    wRose.targetAlpha=0.68; wViolet.targetAlpha=0.62;
    wRose.phaseV=0.009; wViolet.phaseV=0.010; // nearly same speed
    waveCoherenceTgt=0.72;
  } else if (state === 'breath') {
    wRose.targetAmp=0.040; wViolet.targetAmp=0.040;
    wRose.targetAlpha=0.75; wViolet.targetAlpha=0.72;
    wRose.phaseV=0.006; wViolet.phaseV=0.006; // synchronised
    waveCoherenceTgt=1.0;
  } else if (state === 'integrate') {
    wRose.targetAmp=0.044; wViolet.targetAmp=0.042;
    wRose.targetAlpha=0.52; wViolet.targetAlpha=0.46;
    wRose.phaseV=0.007; wViolet.phaseV=0.007; // settled
    waveCoherenceTgt=0.82;
  }
}

// Move waves positionally — smooth, no spikes
function setWaveBreathPosition(phase, cycle) {
  if (phase === 'inhale') {
    // Waves move inward toward orb — gentle draw
    const depth = 0.12 + cycle * 0.04;
    waveRoseYTgt   = WAVE_TOP_FRAC + depth;
    waveVioletYTgt = WAVE_BOT_FRAC - depth;
  } else if (phase === 'hold') {
    // Hold position — flanking the orb
    const depth = 0.15 + cycle * 0.04;
    waveRoseYTgt   = WAVE_TOP_FRAC + depth;
    waveVioletYTgt = WAVE_BOT_FRAC - depth;
  } else if (phase === 'exhale') {
    // Waves release outward
    waveRoseYTgt   = WAVE_TOP_FRAC + 0.04;
    waveVioletYTgt = WAVE_BOT_FRAC - 0.04;
  } else {
    // Return to home positions
    waveRoseYTgt   = WAVE_TOP_FRAC;
    waveVioletYTgt = WAVE_BOT_FRAC;
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
    this.MORPH_DURATION   = 3500; // longer for full-screen bloom
    this.MORPH_LIFT       = innerHeight * 0.52;
    // Rose/warm palette — orb holds what you carry
    this.c1 = '220,150,120'; this.c2 = '200,120,90';
    this.c3 = '210,135,105'; this.c4 = '240,195,170'; this.c5 = '225,160,135';
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
      if (t > this.SETTLE) {
        this.breathClock = 0;
        this.startPhase('inhale');
      }

    } else if (this.phase === 'inhale' || this.phase === 'hold' ||
               this.phase === 'exhale' || this.phase === 'rest') {
      // ── CONTINUOUS BREATH — clean, simple, warm throughout ──
      const CYCLE = this.INHALE + this.HOLD + this.EXHALE + this.REST;
      if (this.breathClock === undefined) this.breathClock = 0;
      this.breathClock += 16;

      const cyclesSoFar = Math.floor(this.breathClock / CYCLE);
      const ct  = this.breathClock - cyclesSoFar * CYCLE;
      const cp  = ct / CYCLE;
      const iP  = this.INHALE / CYCLE;
      const hP  = (this.INHALE + this.HOLD)  / CYCLE;
      const eP  = (this.INHALE + this.HOLD + this.EXHALE) / CYCLE;

      // breathP: 0=small/contracted, 1=large/expanded
      let breathP;
      if (cp < iP) {
        const x = cp / iP;
        breathP = 1 - Math.pow(1 - x, 2.5);      // ease in
      } else if (cp < hP) {
        breathP = 1.0;                              // hold at full
      } else if (cp < eP) {
        const x = (cp - hP) / (eP - hP);
        breathP = 1 - (x < 0.5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2); // ease out
      } else {
        breathP = 0.0;                              // rest — small
      }

      // Radius follows breathP
      tR = 9 + (this.MAX_RADIUS - 9) * breathP;
      // Blur kept very low — just enough for softness, never muddy
      tB = breathP * 3;
      // Glow stays warm throughout — peaks on exhale arc, never below 1.1
      let exhaleGlow = 0;
      if (cp >= hP && cp < eP) {
        const x = (cp - hP) / (eP - hP);
        exhaleGlow = Math.sin(x * Math.PI);
      }
      const cycleBonus = Math.min(this.cycleCount / this.maxCycles, 1) * 0.7;
      tG = 1.1 + (0.8 + cycleBonus) * exhaleGlow;

      // Drive wave positions directly from breathP — no phase change events needed
      if (typeof waveRoseYTgt !== 'undefined') {
        const depth = 0.10 + (this.cycleCount * 0.02);
        waveRoseYTgt   = WAVE_TOP_FRAC + depth * breathP;
        waveVioletYTgt = WAVE_BOT_FRAC - depth * breathP;
      }

      // Phase crossings for audio/text/dots
      const prevCt = Math.max(0, this.breathClock - 16) - cyclesSoFar * CYCLE;
      const prevCp = Math.max(0, prevCt) / CYCLE;

      if (prevCp > 0.96 && cp < 0.04) {
        if (this.onPhaseChange) this.onPhaseChange('inhale', this.cycleCount);
      }
      if (prevCp < hP && cp >= hP) {
        this.ripples.push({r: this.dispRadius * 0.8, alpha: 0.5});
        if (this.onPhaseChange) this.onPhaseChange('hold', this.cycleCount);
      }
      if (prevCp < hP + 0.01 && cp >= hP + 0.01 && cp < hP + 0.03) {
        if (this.onPhaseChange) this.onPhaseChange('exhale', this.cycleCount);
      }
      if (prevCp < eP && cp >= eP) {
        this.cycleCount++;
        if (this.onPhaseChange) this.onPhaseChange('rest', this.cycleCount - 1);
        if (this.cycleCount >= this.maxCycles) {
          this.startPhase('crystallised');
          if (this.onCyclesDone) setTimeout(() => this.onCyclesDone(), 600);
        }
      }

    } else if (this.phase === 'crystallised') {
      tR = 12 + 5 * Math.sin(t * 0.002);
      tB = 0; tG = 1.8 + 0.4 * Math.sin(t * 0.003);
      this.wordGlowIntensity = 1;

    } else if (this.phase === 'morph') {
      const p    = Math.min(t / this.MORPH_DURATION, 1);
      const ease = p < 0.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
      const FULL = Math.max(innerWidth, innerHeight) * 0.85;
      tR = 12 + (FULL - 12) * ease;
      tB = ease * 28;
      tG = p < 0.7 ? 1.8 : 1.8 * (1 - (p - 0.7) / 0.3);
      this.alpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
      this.wordScale = Math.max(0, 1 - ease * 1.4);
      if (t > this.MORPH_DURATION) {
        this.phase = 'done';
        if (this.onMorphDone) this.onMorphDone();
      }
    }

    const ls = 0.022;
    this.dispRadius += ((tR||9)  - this.dispRadius) * ls;
    this.dispBlur   += ((tB||0)  - this.dispBlur)   * ls;
    this.dispGlow   += ((tG||0.9) - this.dispGlow)  * 0.015; // slower lerp = smoother
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
  if (!cx) { requestAnimationFrame(loop); return; }
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
  const renderCoherence = getFlashCoherence();
  drawInterferenceZone(renderCoherence);
  drawWave(wRose,   waveRoseY,   waveBreathAmp);
  drawWave(wViolet, waveVioletY, waveBreathAmp);
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
  try {
    if (audioCtx && audioCtx.state !== 'closed') return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) { console.warn('initAudio failed:', e.message); }
}
function resumeAudio() {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      return;
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  } catch(e) { console.warn('resumeAudio failed:', e.message); }
}
document.addEventListener('touchstart', resumeAudio, {passive:true, capture:true});
document.addEventListener('click',      resumeAudio, {passive:true, capture:true});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    resumeAudio();
    // Safari iOS: if context was killed, restart drone
    setTimeout(() => {
      if (audioEnabled && (!audioCtx || audioCtx.state === 'closed')) {
        audioCtx = null; droneNodes = []; tryDrone();
      } else if (audioEnabled && audioCtx && audioCtx.state !== 'closed' && !droneNodes.length) {
        tryDrone();
      }
    }, 400);
  } else if (audioCtx && audioCtx.state !== 'closed') {
    audioCtx.suspend().catch(() => {});
  }
});
// Safari: pageshow fires when returning from background/bfcache
window.addEventListener('pageshow', () => {
  resumeAudio();
  setTimeout(() => {
    if (audioEnabled && droneNodes.length === 0) tryDrone();
  }, 600);
});
window.addEventListener('focus', () => {
  resumeAudio();
  setTimeout(() => {
    if (audioEnabled && droneNodes.length === 0) tryDrone();
  }, 400);
});

function tryDrone() {
  if (!audioEnabled) return;
  initAudio(); if (!audioCtx) return;
  if (droneNodes.length) return;
  if (audioCtx.state === 'suspended') { audioCtx.resume().then(startDrone); return; }
  startDrone();
}

function startDrone() {
  if (droneNodes.length) return;
  // Two-tone drone: rose wave = warm 396Hz, violet wave = cool 528Hz
  const roseFreqs   = [[396,0.014],[198,0.008],[99,0.005]];
  const violetFreqs = [[528,0.011],[264,0.007],[792,0.004]];
  [...roseFreqs, ...violetFreqs].forEach(([f,g]) => {
    const o = audioCtx.createOscillator();
    const gn = audioCtx.createGain();
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    o.type = 'sine'; o.frequency.value = f;
    gn.gain.setValueAtTime(0, audioCtx.currentTime);
    gn.gain.linearRampToValueAtTime(g, audioCtx.currentTime + 6);
    o.connect(lp); lp.connect(gn); gn.connect(audioCtx.destination); o.start();
    droneNodes.push({o, gn});
  });

  // Harmonic drift — a third quiet tone that slowly moves between harmonics
  // Creates a living, breathing quality to the drone without being distracting
  try {
    const driftOsc = audioCtx.createOscillator();
    const driftGain = audioCtx.createGain();
    const driftLp = audioCtx.createBiquadFilter();
    driftLp.type = 'lowpass'; driftLp.frequency.value = 600;
    driftOsc.type = 'sine';
    driftOsc.frequency.value = 462; // between rose and violet harmonics

    // Very slow frequency drift — 40 second cycle, nearly imperceptible
    const now = audioCtx.currentTime;
    driftOsc.frequency.setValueAtTime(462, now);
    driftOsc.frequency.linearRampToValueAtTime(396, now + 20);
    driftOsc.frequency.linearRampToValueAtTime(528, now + 40);
    driftOsc.frequency.linearRampToValueAtTime(462, now + 60);
    driftOsc.frequency.linearRampToValueAtTime(396, now + 80);
    driftOsc.frequency.linearRampToValueAtTime(528, now + 100);
    driftOsc.frequency.linearRampToValueAtTime(462, now + 120);

    driftGain.gain.setValueAtTime(0, now);
    driftGain.gain.linearRampToValueAtTime(0.006, now + 8); // very quiet
    driftOsc.connect(driftLp); driftLp.connect(driftGain);
    driftGain.connect(audioCtx.destination);
    driftOsc.start();
    droneNodes.push({o: driftOsc, gn: driftGain});
  } catch(e) {}
}

function fadeDrone(out = true, dur = 2) {
  if (!audioCtx || !droneNodes.length) return;
  droneNodes.forEach(({gn}) => {
    const now = audioCtx.currentTime;
    gn.gain.cancelScheduledValues(now);
    gn.gain.setValueAtTime(gn.gain.value, now);
    gn.gain.linearRampToValueAtTime(out ? 0 : 0.014, now + dur);
  });
  if (out) setTimeout(() => {
    droneNodes.forEach(({o}) => { try { o.stop(); } catch(e) {} });
    droneNodes = [];
  }, (dur + 0.2) * 1000);
}

// Play convergence chord at integrate — both tones align to 432Hz
function playConvergenceChord() {
  if (!audioEnabled || !audioCtx) return;
  try {
    [[432,0.022],[864,0.012],[216,0.010],[648,0.008]].forEach(([f,g],i) => {
      const o = audioCtx.createOscillator();
      const gn = audioCtx.createGain();
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1200;
      o.type = 'sine'; o.frequency.value = f;
      const t0 = audioCtx.currentTime + i * 0.12;
      gn.gain.setValueAtTime(0, t0);
      gn.gain.linearRampToValueAtTime(g, t0 + 1.2);
      gn.gain.setValueAtTime(g, t0 + 3);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 9);
      o.connect(lp); lp.connect(gn); gn.connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + 10);
    });
  } catch(e) {}
}

// ── LANDING AMBIENT ──
let landingPlayed = false;
function playLandingAmbient() {
  // Now handled by two-tone drone starting immediately
  tryDrone();
}

// ── PHASE SWELLS — harmonic pads, not chimes ──
// Each phase: solfeggio-rooted frequency swell, like a breath of sound
function playPhaseSwell(baseFreq, duration = 4.5) {
  if (!audioEnabled || !audioCtx) return;
  // Three harmonics form a warm chord
  const ratios = [1, 1.5, 2, 2.5];
  const gains  = [0.028, 0.018, 0.012, 0.007];
  ratios.forEach((r, i) => {
    const o  = audioCtx.createOscillator();
    const g  = audioCtx.createGain();
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    o.type = 'sine';
    o.frequency.value = baseFreq * r;
    const t0 = audioCtx.currentTime;
    const attack  = 0.8;
    const sustain = duration * 0.5;
    const release = duration - attack - sustain;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gains[i], t0 + attack);
    g.gain.setValueAtTime(gains[i], t0 + attack + sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    o.connect(lp); lp.connect(g); g.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + duration + 0.1);
  });
}

// Solfeggio frequencies per phase
const playNoticeSound    = () => playPhaseSwell(396);  // releasing fear
const playHoldSound      = () => playPhaseSwell(432);  // grounding
const playAnchorSound    = () => playPhaseSwell(528);  // transformation
const playIntegrateSound = () => playPhaseSwell(639);  // connection

// Soft continue tap — warm brief acknowledgement, not UI click
function playContinueTone() {
  if (!audioEnabled || !audioCtx) return;
  try {
    [[528,0.016],[660,0.010]].forEach(([f,g],i) => {
      const o=audioCtx.createOscillator(), gn=audioCtx.createGain();
      const lp=audioCtx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1100;
      o.type='sine'; o.frequency.value=f;
      const t0=audioCtx.currentTime+i*0.05;
      gn.gain.setValueAtTime(0,t0); gn.gain.linearRampToValueAtTime(g,t0+0.09);
      gn.gain.exponentialRampToValueAtTime(0.0001,t0+1.1);
      o.connect(lp); lp.connect(gn); gn.connect(audioCtx.destination);
      o.start(t0); o.stop(t0+1.3);
    });
  } catch(e) {}
}

// Breath tones — binaural-style beating between left/right harmonics
function playBreathInhale() {
  if (!audioEnabled || !audioCtx) return;
  // Rising swell — 432Hz base, slight frequency spread creates beating
  [[216, 0.018],[432, 0.022],[217, 0.012]].forEach(([f, g], i) => {
    const o = audioCtx.createOscillator();
    const gn = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.92, audioCtx.currentTime);
    o.frequency.linearRampToValueAtTime(f, audioCtx.currentTime + 4);
    const t0 = audioCtx.currentTime + i * 0.06;
    gn.gain.setValueAtTime(0, t0);
    gn.gain.linearRampToValueAtTime(g, t0 + 0.7);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 5);
    o.connect(gn); gn.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + 5.2);
  });
}
function playBreathExhale() {
  if (!audioEnabled || !audioCtx) return;
  // Descending swell — 528Hz into 432Hz
  [[528, 0.020],[264, 0.014],[529, 0.010]].forEach(([f, g], i) => {
    const o = audioCtx.createOscillator();
    const gn = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, audioCtx.currentTime + i * 0.08);
    o.frequency.exponentialRampToValueAtTime(f * 0.78, audioCtx.currentTime + 5.5);
    const t0 = audioCtx.currentTime + i * 0.08;
    gn.gain.setValueAtTime(0, t0);
    gn.gain.linearRampToValueAtTime(g, t0 + 0.4);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 5.8);
    o.connect(gn); gn.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + 6);
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
let _backFn = null;
function showBackBtn(fn) {
  _backFn = fn;
  const btn = document.getElementById('backBtn');
  btn.style.opacity = '1'; btn.style.pointerEvents = 'all';
  btn.onclick = () => { if (_backFn) _backFn(); };
}
function hideBackBtn() {
  _backFn = null;
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
  updateIntroLang();
}
function applyLang() {
  document.documentElement.lang = lang;
  const t = TRANSLATIONS[lang];

  // Home
  const ha = document.getElementById('homeArrival');
  if (ha) ha.textContent = t.arrival;

  // Lang toggles
  ['langEn','langEs','introLangEn','introLangEs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active',
      (id === 'langEn' || id === 'introLangEn') ? lang === 'en' : lang === 'es');
  });

  updateHomeCount();

  // Re-render active phase screen
  const active = document.querySelector('.screen.active');
  if (!active) return;
  const id = active.id;

  if (id === 's-enter') {
    // Re-render pill grid
    const grid = document.getElementById('contractionGrid');
    if (grid) {
      grid.innerHTML = '';
      CONTRACTIONS[lang].forEach((c, i) => {
        const enKey = CONTRACTIONS.en[i];
        const btn = document.createElement('button');
        btn.className = 'contraction-pill al';
        btn.textContent = c;
        btn.style.setProperty('--drift-dur', (2.8 + Math.random() * 2).toFixed(2) + 's');
        btn.onclick = () => selectContraction(enKey, btn);
        grid.appendChild(btn);
      });
    }
    // Update placeholder and continue button
    const inp = document.getElementById('somethingElseInput');
    if (inp) inp.placeholder = lang === 'en' ? 'name it here...' : 'nómbralo aquí...';
    setText('enterContinue', t.continueBtn);
  }

  else if (id === 's-notice') {
    setText('pname-notice', t.noticeLabel.toUpperCase());
    setText('notice-prompt', t.noticePrompt);
    setText('fwdNotice', t.continueBtn);
  }

  else if (id === 's-hold') {
    setText('pname-hold', t.holdLabel.toUpperCase());
    setText('hold-prompt', t.holdPrompt);
    setText('fwdHold', t.continueBtn);
  }

  else if (id === 's-anchor') {
    setText('pname-anchor', t.anchorLabel.toUpperCase());
    // Re-render heavy truth with translated contraction name
    const idx = CONTRACTIONS.en.indexOf(currentContraction);
    const displayName = idx >= 0 ? CONTRACTIONS[lang][idx] : currentContraction;
    const pH = document.getElementById('polarityHeavy');
    if (pH && pH.textContent) {
      pH.textContent = lang === 'en'
        ? `I am carrying ${displayName}.`
        : `Estoy cargando ${displayName}.`;
    }
    const pAnd = document.getElementById('polarityAnd');
    if (pAnd && pAnd.textContent) pAnd.textContent = lang === 'en' ? 'and' : 'y';
    const pH2 = document.getElementById('polarityHold');
    if (pH2 && pH2.textContent) {
      pH2.textContent = lang === 'en'
        ? 'hold both · neither needs resolving'
        : 'sostén ambos · ninguno necesita resolverse';
    }
    setText('fwdAnchor1', t.continueBtn);
  }

  else if (id === 's-freq') {
    setText('freqLabel', lang === 'en' ? 'which frequency calls you?' : '¿qué frecuencia te llama?');
    // Re-render frequency pills
    const freqGrid = document.getElementById('freqGrid');
    if (freqGrid) {
      const smartKeys = FREQ_MAP[currentContraction] || ['Steady','Open','Clear','Present'];
      freqGrid.innerHTML = '';
      smartKeys.forEach(key => {
        const freqData = FREQUENCIES[lang].find((f,i) => FREQUENCIES.en[i]?.name === key);
        if (!freqData) return;
        const btn = document.createElement('button');
        btn.className = 'freq-pill';
        btn.innerHTML = `<span class="freq-name">${freqData.name}</span><span class="freq-hint">${freqData.hint}</span>`;
        btn.onclick = () => selectFrequency(key, btn);
        freqGrid.appendChild(btn);
      });
    }
  }

  else if (id === 's-breath') {
    // Update breath cues if visible
    const btext = document.getElementById('breathText');
    // Just update the phase label — live cues update on next phase change
    setText('pname-breath', t.holdLabel.toUpperCase());
  }

  else if (id === 's-integrate') {
    setText('pname-integrate', t.integrateLabel.toUpperCase());
    setText('integratePromptLbl', t.threadPrompt);
    const inp = document.getElementById('integrateInput');
    if (inp) inp.placeholder = lang === 'en' ? 'write it here...' : 'escríbelo aquí...';
    const retBtn = document.getElementById('integrateReturn');
    if (retBtn) retBtn.textContent = t.retBtn;
  }
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
  if (n >= 3) {
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
    if (s >= 3) txt += `  ·  ${t.streakLabel(s)}`;
    el.textContent = txt;
  } else { el.textContent = ''; }
  // Update pattern mirror
  setTimeout(updatePatternMirror, 800);
}

function updatePatternMirror() {
  const el = document.getElementById('homePattern');
  if (!el) return;
  try {
    const raw = lsGet('f2_sessions_log');
    if (!raw) return;
    const log = JSON.parse(raw);
    if (log.length < 3) return;

    // Count contraction frequency
    const counts = {};
    log.forEach(s => {
      if (s.contraction) counts[s.contraction] = (counts[s.contraction]||0) + 1;
    });

    // Find most visited
    const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    if (!sorted.length) return;

    const [top, topCount] = sorted[0];
    const displayName = CONTRACTIONS[lang][CONTRACTIONS.en.indexOf(top)] || top;

    // Find something that's shifted — was frequent, now absent
    const recent = log.slice(-3).map(s => s.contraction);
    const shifted = Object.entries(counts).find(([k,v]) => v >= 3 && !recent.includes(k));

    let msg = '';
    if (shifted) {
      const shiftedName = CONTRACTIONS[lang][CONTRACTIONS.en.indexOf(shifted[0])] || shifted[0];
      msg = lang === 'en'
        ? `${shiftedName} has been quiet lately.`
        : `${shiftedName} ha estado callado últimamente.`;
    } else if (topCount >= 3) {
      msg = lang === 'en'
        ? `you've brought ${displayName} here ${topCount} times.`
        : `has traído ${displayName} aquí ${topCount} veces.`;
    }

    if (msg) {
      el.textContent = msg;
      setTimeout(() => el.classList.add('visible'), 100);
    }
  } catch(e) {}
}

// ── HOME ──
function goHome() {
  if (voiceActive) stopVoiceNote(false);
  bgDimTgt = 0; // reset background dim fully
  nextToken();
  breathOrb = null;
  fadeDrone(true, 1.5);
  clearBreathTimers();
  hideBackBtn();
  setWaveState('home');
  waveRoseYTgt   = WAVE_TOP_FRAC;
  waveVioletYTgt = WAVE_BOT_FRAC;
  document.querySelectorAll('.al').forEach(a => a.classList.remove('on'));
  ['dec-breathe-cta'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });

  showScreen('s-home', () => {
    document.querySelectorAll('.al').forEach(a => a.classList.add('on'));
    setTimeout(tryDrone, 300);
    setTimeout(playLandingAmbient, 800);
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

  const qEl = document.getElementById('enterQuestion');
  if (qEl) qEl.textContent = t.arrival;

  const inp = document.getElementById('enterInput');
  if (inp) {
    inp.value = '';
    inp.placeholder = lang === 'en' ? 'name it...' : 'nómbralo...';
    inp.style.display = 'none'; // hidden by default
  }

  const seb = document.getElementById('somethingElseBtn');
  if (seb) seb.textContent = lang === 'en' ? 'something else...' : 'algo más...';

  // Clear previous whisper
  const whisperEl2 = document.getElementById('enterWhisper');
  if (whisperEl2) { whisperEl2.textContent = ''; whisperEl2.classList.remove('visible'); }

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
        currentContraction = CONTRACTIONS.en[i];
        if (inp) { inp.value = name; }
        showContinue();
        if (navigator.vibrate) navigator.vibrate(10);
        // Interference flash — field recognises what was named
        triggerInterferenceFlash();
        // AI whisper beneath the pill
        fetchEnterWhisper(tok, CONTRACTIONS.en[i]);
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
  showScreen('s-enter', () => {});
  window._enterFromPhase = fromPhase;
}

function toggleSomethingElse() {
  const inp = document.getElementById('enterInput');
  const seb = document.getElementById('somethingElseBtn');
  if (!inp) return;
  if (inp.style.display === 'none') {
    inp.style.display = 'block';
    setTimeout(() => inp.focus(), 100);
    if (seb) seb.style.opacity = '0.4';
  } else {
    inp.style.display = 'none';
    inp.value = '';
    hideContinue();
    if (seb) seb.style.opacity = '1';
  }
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

  // If input hidden (pill selected), use currentContraction directly
  if (!raw && !currentContraction) return;

  if (raw) {
    const enIdx = CONTRACTIONS[lang].indexOf(raw);
    currentContraction = enIdx >= 0 ? CONTRACTIONS.en[enIdx] : raw;
  }
  // currentContraction already set by pill click if raw is empty

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
function startNotice() {
  try {
    lsSet('f2_cnt_notice', parseInt(lsGet('f2_cnt_notice')||'0')+1);
    startEnter('notice');
  } catch(e) { console.error('startNotice:', e); }
}
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
        if (navigator.vibrate) navigator.vibrate(8);
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
  playContinueTone();
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
  showBackBtn(() => launchNotice());
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
  playContinueTone();
  if (audioCtx) playAnchorSound();
  launchAnchor();
}

// ── ANCHOR SCREEN 1 — polarity reveal only ──
function launchAnchor() {
  const tok = nextToken();
  const t   = TRANSLATIONS[lang];

  setText('pname-anchor', t.anchorLabel.toUpperCase());

  const seedKey      = currentContraction;
  const seedEN       = POLARITY_SEEDS.en[seedKey] || '';
  const seedES       = POLARITY_SEEDS.es[seedKey] || '';
  const complementTxt= lang === 'en' ? seedEN : seedES;

  const pH  = document.getElementById('polarityHeavy');
  const pAnd= document.getElementById('polarityAnd');
  const pL  = document.getElementById('polarityLight');
  const pH2 = document.getElementById('polarityHold');
  [pH, pAnd, pL, pH2].forEach(el => { if (el) el.classList.remove('visible'); });

  const displayName = CONTRACTIONS[lang][CONTRACTIONS.en.indexOf(currentContraction)] || currentContraction;
  if (pH)   pH.textContent  = lang === 'en' ? `I am carrying ${displayName}.` : `Estoy cargando ${displayName}.`;
  if (pAnd) pAnd.textContent = lang === 'en' ? 'and' : 'y';
  if (pL)   pL.textContent  = complementTxt;
  if (pH2)  pH2.textContent = lang === 'en' ? 'hold both · neither needs resolving' : 'sostén ambos · ninguno necesita resolverse';

  const fwd = document.getElementById('fwdAnchor1');
  if (fwd) { fwd.style.opacity = '0'; fwd.style.pointerEvents = 'none'; fwd.textContent = t.continueBtn; }

  setWaveState('anchor');
  showBackBtn(() => launchHold());
  showScreen('s-anchor', () => {
    setTimeout(() => { if (!isAlive(tok)) return; if (pH) pH.classList.add('visible'); }, 700);
    setTimeout(() => { if (!isAlive(tok)) return; if (pAnd) pAnd.classList.add('visible'); }, 2400);
    setTimeout(() => {
      if (!isAlive(tok)) return;
      if (!complementTxt && lsGet('f2_api_key')) {
        fetchPolarityComplement(tok, pL, fwd, pH2);
      } else {
        if (pL) pL.classList.add('visible');
        setTimeout(() => {
          if (!isAlive(tok)) return;
          if (pH2) pH2.classList.add('visible'); // long pause — let both truths land first
          setTimeout(() => {
            if (!isAlive(tok) || !fwd) return;
            fwd.style.opacity = '1'; fwd.style.pointerEvents = 'all';
          }, 2000);
        }, 2500); // 2.5s after light truth appears
      }
    }, 4000);
  });
}

async function fetchPolarityComplement(tok, pL, fwd, pH2) {
  const apiKey = lsGet('f2_api_key');
  if (!apiKey) {
    if (pL) pL.classList.add('visible');
    setTimeout(() => {
      if (!isAlive(tok)) return;
      if (pH2) pH2.classList.add('visible');
      setTimeout(() => { if (fwd) { fwd.style.opacity='1'; fwd.style.pointerEvents='all'; }}, 2000);
    }, 2500);
    return;
  }
  const prompt = `The person is carrying "${currentContraction}". Find the complementary truth — not the opposite, the thing that is ALSO true from lived experience. One sentence, starting with "And". Max 20 words.`;
  try {
    const res = await callClaude(prompt, POLARITY_SYSTEM);
    if (!isAlive(tok)) return;
    if (res && pL) {
      pL.textContent = res;
      pL.classList.add('visible');
      setTimeout(() => {
        if (!isAlive(tok)) return;
        if (pH2) pH2.classList.add('visible');
        setTimeout(() => {
          if (!isAlive(tok) || !fwd) return;
          fwd.style.opacity = '1'; fwd.style.pointerEvents = 'all';
        }, 1400);
      }, 1200);
    }
  } catch(e) {
    if (pL) pL.classList.add('visible');
    setTimeout(() => {
      if (!isAlive(tok)) return;
      if (pH2) pH2.classList.add('visible');
      setTimeout(() => { if (fwd) { fwd.style.opacity='1'; fwd.style.pointerEvents='all'; }}, 1400);
    }, 1000);
  }
}

// ── ANCHOR SCREEN 2 — frequency selection ──
const FREQ_MAP = {
  Anxious:       ['Steady','Present','Trusting','Held'],
  Afraid:        ['Steady','Trusting','Held','Present'],
  Dreading:      ['Present','Trusting','Steady','Open'],
  Panicking:     ['Steady','Present','Held','Spacious'],
  Unsafe:        ['Held','Steady','Trusting','Present'],
  Overwhelmed:   ['Spacious','Steady','Present','Clear'],
  Scattered:     ['Clear','Present','Steady','Spacious'],
  Spiralling:    ['Steady','Present','Spacious','Clear'],
  Swamped:       ['Spacious','Steady','Present','Held'],
  Restless:      ['Present','Steady','Clear','Open'],
  Stuck:         ['Open','Clear','Trusting','Present'],
  Frozen:        ['Open','Trusting','Present','Steady'],
  Trapped:       ['Open','Spacious','Trusting','Clear'],
  'Closed off':  ['Open','Spacious','Luminous','Trusting'],
  Confused:      ['Clear','Present','Steady','Open'],
  Heavy:         ['Spacious','Held','Open','Luminous'],
  Exhausted:     ['Held','Spacious','Steady','Present'],
  Drained:       ['Held','Steady','Spacious','Trusting'],
  Defeated:      ['Trusting','Open','Held','Luminous'],
  'No way out':  ['Luminous','Trusting','Open','Held'],
  Disconnected:  ['Held','Open','Present','Spacious'],
  Alone:         ['Held','Present','Open','Trusting'],
  Unseen:        ['Present','Held','Luminous','Open'],
  'Left behind': ['Held','Trusting','Present','Steady'],
  Invisible:     ['Luminous','Present','Held','Open'],
  'Not enough':  ['Luminous','Trusting','Spacious','Open'],
  Ashamed:       ['Held','Luminous','Open','Trusting'],
  Guilty:        ['Open','Trusting','Clear','Held'],
  Broken:        ['Held','Trusting','Open','Luminous'],
  Raw:           ['Held','Spacious','Present','Open'],
  Angry:         ['Spacious','Clear','Open','Present'],
  Resentful:     ['Open','Clear','Spacious','Present'],
  Bitter:        ['Open','Luminous','Spacious','Trusting'],
  Jealous:       ['Open','Trusting','Spacious','Clear'],
  Grieving:      ['Held','Spacious','Open','Luminous'],
  Numb:          ['Present','Open','Luminous','Held'],
  Flat:          ['Luminous','Open','Present','Spacious'],
  'Not here':    ['Present','Open','Held','Luminous'],
  Lost:          ['Present','Steady','Trusting','Open'],
  'Given up':    ['Trusting','Held','Open','Luminous'],
  Pressured:     ['Spacious','Steady','Clear','Present'],
};

function advanceToFreq() {
  playContinueTone();
  const tok = nextToken();
  const t   = TRANSLATIONS[lang];

  setText('freqLabel', lang === 'en' ? 'which frequency calls you?' : '¿qué frecuencia te llama?');

  const smartKeys = FREQ_MAP[currentContraction] || ['Steady','Open','Clear','Present'];
  const freqGrid  = document.getElementById('freqGrid');
  if (freqGrid) {
    freqGrid.innerHTML = '';
    smartKeys.forEach(key => {
      const enIdx = FREQUENCIES.en.findIndex(f => f.name === key);
      if (enIdx < 0) return;
      const f   = FREQUENCIES[lang][enIdx];
      const btn = document.createElement('button');
      btn.className = 'freq-btn';
      btn.innerHTML = `<div class="freq-name">${f.name}</div><div class="freq-hint">${f.hint}</div>`;
      btn.addEventListener('click', () => {
        if (!isAlive(tok)) return;
        document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('chosen'));
        btn.classList.add('chosen');
        chosenFrequency = FREQUENCIES.en[enIdx].name;
        if (navigator.vibrate) navigator.vibrate(10);
        const fwd = document.getElementById('fwdAnchor');
        if (fwd) { fwd.classList.add('ready'); fwd.textContent = t.continueBtn; }
      });
      btn.addEventListener('touchend', e => { e.preventDefault(); btn.click(); });
      freqGrid.appendChild(btn);
    });
  }

  const fwd = document.getElementById('fwdAnchor');
  if (fwd) { fwd.classList.remove('ready'); fwd.textContent = ''; }

  showBackBtn(() => launchAnchor());
  showScreen('s-freq');
}

// ── BREATH — inside Anchor ──
let breathRunning = false;

function startBreath() {
  playContinueTone();
  const tok = nextToken();
  const t   = TRANSLATIONS[lang];
  clearBreathTimers();
  breathRunning = true;
  bgDimTgt = 0.25;

  const centreX = innerWidth  * 0.5;
  const centreY = innerHeight * 0.5;

  setWaveState('breath');

  // Particle migration — pick a random nearby particle or spawn one
  // It travels to centre over 1.5s, then the orb emerges from it
  let migrantX = centreX + (Math.random()-0.5) * innerWidth  * 0.4;
  let migrantY = centreY + (Math.random()-0.5) * innerHeight * 0.25;

  // Use existing particle if one is close enough
  if (iParticles.length > 0) {
    const nearest = iParticles.reduce((a,b) =>
      Math.hypot(b.x-centreX, b.y-centreY) < Math.hypot(a.x-centreX, a.y-centreY) ? b : a
    );
    migrantX = nearest.x;
    migrantY = nearest.y;
    nearest.maxLife = 0; // retire it — the orb takes its place
  }

  // Create orb starting from migrant position
  breathOrb = new BreathOrb(migrantX, migrantY);
  breathOrb.wordText        = chosenFrequency || currentContraction;
  breathOrb.wordTargetAlpha = 0;
  breathOrb.wordGlowIntensity = 0;
  breathOrb.alpha = 0; // start invisible

  // Animate orb from migrant position to centre, fade in
  const MIGRATE_MS = 1600;
  const startTime = performance.now();
  const migrateTick = () => {
    if (!breathOrb || !isAlive(tok)) return;
    const elapsed = performance.now() - startTime;
    const mp = Math.min(1, elapsed / MIGRATE_MS);
    const ease = mp < 0.5 ? 2*mp*mp : 1-Math.pow(-2*mp+2,2)/2;
    breathOrb.targetX = migrantX + (centreX - migrantX) * ease;
    breathOrb.targetY = migrantY + (centreY - migrantY) * ease;
    breathOrb.alpha   = ease;
    if (mp < 1) requestAnimationFrame(migrateTick);
    else {
      breathOrb.targetX = centreX;
      breathOrb.targetY = centreY;
      breathOrb.alpha   = 1;
    }
  };
  requestAnimationFrame(migrateTick);

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
    waveRoseYTgt   = WAVE_TOP_FRAC;
    waveVioletYTgt = WAVE_BOT_FRAC;
    if (btext) btext.style.opacity = '0';
    bDelay(() => {
      if (!breathOrb) return;
      // Waves return to home positions — timed with orb bloom (MORPH_DURATION = 2600ms)
      waveRoseYTgt   = WAVE_TOP_FRAC;
      waveVioletYTgt = WAVE_BOT_FRAC;
      breathOrb.wordTargetAlpha = 0;
      breathOrb.startPhase('morph'); // bloom outward, no upward movement
      breathOrb.onMorphDone = () => {
        requestAnimationFrame(() => { breathOrb = null; });
        bDelay(() => launchIntegrate(), 300);
      };
    }, 500);
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
  triggerWaveConvergence(); // dramatic visual payoff
  setText('pname-integrate', t.integrateLabel.toUpperCase());

  // Witnessed sentence — wait for AI, fall back to static only if AI fails
  const witnessedEl = document.getElementById('integrateWitnessed');
  const wKey        = currentContraction;
  const staticWitnessed = (WITNESSED[lang] && WITNESSED[lang][wKey]) || '';
  // Start hidden — no text set yet to avoid swap flicker
  if (witnessedEl) { witnessedEl.textContent = ''; witnessedEl.classList.remove('visible'); }

  const lastThreadForWitness = lsGet('f2_thread');
  const apiKey = lsGet('f2_api_key');

  // Resolve witnessed sentence before showing it
  const resolveWitnessed = async () => {
    if (apiKey) {
      const aiWitnessed = await fetchWitnessedSentence(tok, currentContraction, currentBodyZone, chosenFrequency, lastThreadForWitness);
      if (!isAlive(tok) || !witnessedEl) return;
      witnessedEl.textContent = aiWitnessed || staticWitnessed;
    } else {
      if (witnessedEl) witnessedEl.textContent = staticWitnessed;
    }
  };
  resolveWitnessed();

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
    threadInp.placeholder = lang === 'en' ? 'write it here...' : 'escríbelo aquí...';
    threadInp.onkeydown   = e => {
      if (e.key === 'Enter' && threadInp.value.trim()) { e.preventDefault(); submitThread(tok); }
    };
    threadInp.onblur = () => {
      if (threadInp.value.trim()) submitThread(tok);
    };
  }

  // AI insight question
  const insightEl = document.getElementById('integrateInsight');
  if (insightEl) { insightEl.textContent = ''; insightEl.classList.remove('visible'); }

  // Log session
  const n = parseInt(lsGet('f2_sessions') || '0') + 1;
  lsSet('f2_sessions', n);
  logSession({ contraction: currentContraction, frequency: chosenFrequency, zone: currentBodyZone, ts: Date.now() });

  showBackBtn(() => goHome());
  showScreen('s-integrate', () => {
    initVoiceMic(); // show mic only if speech recognition available
    // Witnessed sentence — arrives first
    setTimeout(() => { if (isAlive(tok) && witnessedEl) witnessedEl.classList.add('visible'); }, 600);
    // Insight question — arrives 3.5s after witnessed, AI-generated
    setTimeout(() => {
      if (!isAlive(tok) || !insightEl) return;
      const apiKey = lsGet('f2_api_key');
      if (apiKey) {
        const prompt = `The person was carrying "${currentContraction}" and anchored "${chosenFrequency}". Ask one short open question about what might become possible if they hold both today.`;
        callClaude(prompt, INSIGHT_SYSTEM).then(res => {
          if (!isAlive(tok) || !insightEl) return;
          insightEl.textContent = res || (lang === 'en'
            ? `What might shift if you held both of these today?`
            : `¿Qué podría cambiar si sostuvieras ambas cosas hoy?`);
          insightEl.classList.add('visible');
        }).catch(() => {
          insightEl.textContent = lang === 'en'
            ? `What might shift if you held both of these today?`
            : `¿Qué podría cambiar si sostuvieras ambas cosas hoy?`;
          insightEl.classList.add('visible');
        });
      } else {
        insightEl.textContent = lang === 'en'
          ? `What might shift if you held both of these today?`
          : `¿Qué podría cambiar si sostuvieras ambas cosas hoy?`;
        insightEl.classList.add('visible');
      }
    }, 3500);
    setTimeout(() => { if (isAlive(tok) && whisperEl && lastThread) whisperEl.classList.add('visible'); }, 5500);
    setTimeout(() => { if (isAlive(tok) && threadWrap) { threadWrap.classList.add('visible'); setTimeout(() => threadInp && threadInp.focus(), 200); } }, 7000);
    setTimeout(() => { if (isAlive(tok) && returnBtn) returnBtn.classList.add('visible'); }, 6000);
  });

  updateHomeCount();
}

// ── VOICE NOTING ──
let voiceRecognition = null;
let voiceActive = false;

function initVoiceMic() {
  const mic = document.getElementById('integrateMic');
  if (!mic) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { mic.classList.add('hidden'); return; } // not supported — hide cleanly
  mic.classList.remove('hidden');
}

function toggleVoiceNote() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  if (voiceActive) {
    stopVoiceNote();
  } else {
    startVoiceNote();
  }
}

function startVoiceNote() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const mic = document.getElementById('integrateMic');
  const inp = document.getElementById('integrateInput');

  try {
    voiceRecognition = new SR();
    voiceRecognition.lang = lang === 'es' ? 'es-CL' : 'en-US';
    voiceRecognition.continuous = false;
    voiceRecognition.interimResults = false;
    voiceRecognition.maxAlternatives = 1;

    voiceRecognition.onstart = () => {
      voiceActive = true;
      if (mic) mic.classList.add('listening');
    };

    voiceRecognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (inp && transcript) {
        inp.value = transcript;
        inp.dispatchEvent(new Event('input'));
      }
      stopVoiceNote(true);
    };

    voiceRecognition.onerror = () => { stopVoiceNote(false); };
    voiceRecognition.onend   = () => { if (voiceActive) stopVoiceNote(false); };

    voiceRecognition.start();
  } catch(e) {
    if (mic) mic.classList.add('hidden');
  }
}

function stopVoiceNote(captured = false) {
  voiceActive = false;
  const mic = document.getElementById('integrateMic');
  try { if (voiceRecognition) voiceRecognition.stop(); } catch(e) {}
  voiceRecognition = null;
  if (!mic) return;
  mic.classList.remove('listening');
  if (captured) {
    mic.classList.add('captured');
    setTimeout(() => mic.classList.remove('captured'), 1800);
  }
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

const INTEGRATE_SYSTEM = `You are the field at rest. The person completed a session holding two truths simultaneously without resolving either. Your role: one line of quiet witness — not praise, not analysis. The practice is holding, not releasing. Never use the words "release", "let go", or "released". Speak as if the field itself is recognising what they held. Past tense. Max 14 words. Never begin with "I". No exclamation marks.`;

const INSIGHT_SYSTEM = `You are the field offering one forward-facing question. The person just completed a session holding two truths — what they carry and what is also true. Based on their specific contraction and chosen frequency, offer one short question about what might become possible if they hold both today. Not advice, not analysis — a genuine open question. Max 16 words. Start with "What" or "How" or "What if". No exclamation marks.`;

const WHISPER_SYSTEM = `You are a quiet field presence. The person has just named what they are carrying. Your role: one brief recognition — not advice, not comfort. Just acknowledgement that this is real and the field has seen it before. 8 words maximum. No punctuation at the end. Lowercase only.`;

const WITNESSED_SYSTEM = `You are the field completing a session. You know: what the person was carrying, where it lived in their body, what frequency they anchored, and what one true thing they wrote. The practice is holding both truths simultaneously without resolving either. Never use the words "release", "let go", or "released". Speak one sentence that witnesses this specific session — not generic, not praise. As if the field itself is reflecting back exactly what was held. Past tense. Max 16 words. No exclamation marks.`;

// ── INTERFERENCE FLASH — field recognises what was named ──
function triggerInterferenceFlash() {
  interferenceFlashTgt = 1;
  setTimeout(() => { interferenceFlashTgt = 0; }, 100);
}

// Hook into render loop — blend flash into coherence glow
function getFlashCoherence() {
  interferenceFlashVal += (interferenceFlashTgt - interferenceFlashVal) * 0.12;
  return Math.max(waveCoherence, interferenceFlashVal * 0.9);
}

// ── AI ENTER WHISPER ──
async function fetchEnterWhisper(tok, contraction) {
  const apiKey = lsGet('f2_api_key');
  const el = document.getElementById('enterWhisper');
  if (!el) return;
  el.classList.remove('visible');

  if (!apiKey) {
    // Fallback static whispers
    const fallbacks = {
      en: { Anxious:'the field knows this one', Afraid:'you are not alone in this',
            Overwhelmed:'this is real', Exhausted:'it is safe to rest here',
            default:'the field is here' },
    };
    const fb = fallbacks[lang] || fallbacks.en;
    el.textContent = fb[contraction] || fb.default;
    el.classList.add('visible');
    return;
  }

  const prompt = `The person just named "${contraction}" as what they are carrying. Offer one quiet recognition. 8 words max. Lowercase only.`;
  try {
    const res = await callClaude(prompt, WHISPER_SYSTEM, 40);
    if (!isAlive(tok)) return;
    if (res) { el.textContent = res.toLowerCase().replace(/[.!?]$/, ''); el.classList.add('visible'); }
  } catch(e) {
    el.textContent = 'the field is here';
    el.classList.add('visible');
  }
}

// ── AI WITNESSED SENTENCE ──
async function fetchWitnessedSentence(tok, contraction, zone, frequency, thread) {
  const apiKey = lsGet('f2_api_key');
  if (!apiKey) return null;
  const zoneStr = zone ? ` in the ${zone}` : '';
  const threadStr = thread ? ` They wrote: "${thread}".` : '';
  const prompt = `The person carried "${contraction}"${zoneStr}. They anchored "${frequency}".${threadStr} Write one witnessed sentence for this session. Past tense. Max 16 words.`;
  try {
    const res = await callClaude(prompt, WITNESSED_SYSTEM, 60);
    return res || null;
  } catch(e) { return null; }
}

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

// ── INTRO ANIMATION ──
let introAnimFrame = null;
let introPlayed = lsGet('f2_intro_played') === '1';

function playIntroAnimation() {
  const screen = document.getElementById('s-intro');
  const canvas = document.getElementById('introCanvas');
  const skip   = document.getElementById('introSkip');
  if (!screen || !canvas) return;

  if (introAnimFrame) cancelAnimationFrame(introAnimFrame);

  // Ensure intro screen is visible
  if (!screen.classList.contains('active')) {
    showScreen('s-intro');
  }

  const ic = canvas.getContext('2d');
  const setSize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = innerWidth  * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width  = innerWidth  + 'px';
    canvas.style.height = innerHeight + 'px';
    ic.scale(dpr, dpr);
  };
  setSize();

  let t = 0;
  const W = innerWidth, H = innerHeight;
  const TOTAL = 1500;

  // Waves at 30%/70% — clearly visible, in relationship, clear of edges
  const INTRO_ROSE_Y   = 0.35;
  const INTRO_VIOLET_Y = 0.65;
  const iRose   = { phase: 0, phaseV: 0.022, amp: 0.055, y: INTRO_ROSE_Y,   color: '200,130,110', alpha: 0 };
  const iViolet = { phase: Math.PI*0.6, phaseV: 0.028, amp: 0.050, y: INTRO_VIOLET_Y, color: '152,128,184', alpha: 0 };

  function drawIntroWave(wave) {
    const centreY = wave.y * H;
    const amp     = wave.amp * H;
    ic.save();
    ic.beginPath();
    for (let i = 0; i <= W; i += 3) {
      const p = Math.sin(i*0.0016*(W/380)+wave.phase)*amp + Math.sin(i*0.0034*(W/380)+wave.phase*1.3)*amp*0.3;
      i===0 ? ic.moveTo(i, centreY+p) : ic.lineTo(i, centreY+p);
    }
    ic.strokeStyle = `rgba(${wave.color},${(wave.alpha*0.2).toFixed(3)})`;
    ic.lineWidth = 22; ic.lineCap = 'round';
    ic.filter = 'blur(7px)'; ic.stroke(); ic.filter = 'none';
    ic.beginPath();
    for (let i = 0; i <= W; i += 3) {
      const p = Math.sin(i*0.0016*(W/380)+wave.phase)*amp + Math.sin(i*0.0034*(W/380)+wave.phase*1.3)*amp*0.3;
      i===0 ? ic.moveTo(i, centreY+p) : ic.lineTo(i, centreY+p);
    }
    ic.strokeStyle = `rgba(${wave.color},${(wave.alpha*0.75).toFixed(3)})`;
    ic.lineWidth = 2.5; ic.shadowColor = `rgba(${wave.color},0.6)`; ic.shadowBlur = 12;
    ic.stroke();
    ic.restore();
  }

  function introLoop() {
    ic.clearRect(0, 0, W, H);
    t++;
    const p = t / TOTAL;

    // Alpha
    iRose.alpha   = Math.min(1, p / 0.13);
    iViolet.alpha = Math.min(1, Math.max(0, (p - 0.18) / 0.14));

    // Sync — waves find same rhythm
    const syncP    = Math.min(1, Math.max(0, (p - 0.35) / 0.30));
    const syncEase = syncP < 0.5 ? 2*syncP*syncP : 1-Math.pow(-2*syncP+2,2)/2;
    iRose.phase   += 0.022 - (0.015) * syncEase;
    iViolet.phase += 0.028 - (0.021) * syncEase;
    iRose.amp   = 0.055 - 0.015 * syncEase;
    iViolet.amp = 0.050 - 0.013 * syncEase;

    // Ease waves to home positions during fadeout
    if (p > 0.88) {
      const e = Math.min(1, (p - 0.88) / 0.12);
      iRose.y   = INTRO_ROSE_Y   + (WAVE_TOP_FRAC - INTRO_ROSE_Y)   * e;
      iViolet.y = INTRO_VIOLET_Y + (WAVE_BOT_FRAC - INTRO_VIOLET_Y) * e;
    }

    // Interference glow
    const glowP    = Math.min(1, Math.max(0, (p - 0.55) / 0.25));
    const glowFade = p > 0.85 ? Math.max(0, 1-(p-0.85)/0.13) : 1;
    if (glowP > 0.05) {
      ic.save();
      const g = ic.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.min(W,H)*(0.2+glowP*0.3));
      g.addColorStop(0, `rgba(220,180,240,${(glowP*0.18*glowFade).toFixed(3)})`);
      g.addColorStop(.5,`rgba(185,145,200,${(glowP*0.08*glowFade).toFixed(3)})`);
      g.addColorStop(1, 'rgba(152,128,184,0)');
      ic.fillStyle = g; ic.fillRect(0,0,W,H); ic.restore();
    }

    drawIntroWave(iRose);
    drawIntroWave(iViolet);

    // Text 1: "what you hold" — ABOVE rose wave
    const t1p    = Math.min(1, Math.max(0, (p-0.08)/0.18));
    const t1fade = p > 0.32 ? Math.max(0, 1-(p-0.32)/0.14) : 1;
    if (t1p > 0.01) {
      const textY = H * INTRO_ROSE_Y - H * 0.07;
      ic.save();
      ic.globalAlpha = t1p * t1fade * 0.88;
      ic.font = `300 italic ${Math.min(W*0.065,28)}px 'Cormorant Garamond',Georgia,serif`;
      ic.textAlign='center'; ic.textBaseline='middle';
      ic.fillStyle='rgba(200,130,110,1)';
      ic.shadowColor='rgba(200,130,110,0.35)'; ic.shadowBlur=10;
      ic.fillText(lang==='en'?'what you hold':'lo que sostienes', W*0.5, textY);
      ic.restore();
    }

    // Text 2: "what is also true" — BELOW violet wave
    const t2p    = Math.min(1, Math.max(0, (p-0.26)/0.18));
    const t2fade = p > 0.52 ? Math.max(0, 1-(p-0.52)/0.14) : 1;
    if (t2p > 0.01) {
      const textY = H * INTRO_VIOLET_Y + H * 0.07;
      ic.save();
      ic.globalAlpha = t2p * t2fade * 0.82;
      ic.font = `300 italic ${Math.min(W*0.065,28)}px 'Cormorant Garamond',Georgia,serif`;
      ic.textAlign='center'; ic.textBaseline='middle';
      ic.fillStyle='rgba(152,128,184,1)';
      ic.shadowColor='rgba(152,128,184,0.35)'; ic.shadowBlur=10;
      ic.fillText(lang==='en'?'what is also true':'lo que también es verdad', W*0.5, textY);
      ic.restore();
    }

    // Glow bloom arrives first — expands slowly from p=0.58
    const glowOnlyP = Math.min(1, Math.max(0, (p-0.58)/0.18));
    const nameFade  = p > 0.90 ? Math.max(0, 1-(p-0.90)/0.10) : 1;

    if (glowOnlyP > 0.01) {
      const glowAlpha = glowOnlyP * nameFade;
      ic.save();
      const glowR = Math.min(W,H) * (0.06 + glowOnlyP * 0.36);
      const gg = ic.createRadialGradient(W*.5, H*.5, 0, W*.5, H*.5, glowR);
      gg.addColorStop(0,   `rgba(230,160,120,${(glowAlpha*0.40).toFixed(3)})`);
      gg.addColorStop(0.4, `rgba(200,130,110,${(glowAlpha*0.18).toFixed(3)})`);
      gg.addColorStop(1,   'rgba(200,130,110,0)');
      ic.fillStyle = gg;
      ic.fillRect(0, 0, W, H);
      ic.restore();
    }

    // Text fades in — starts p=0.65, window 0.25 (~6s), linear mirrors fade-out
    const nameP = Math.min(1, Math.max(0, (p-0.65)/0.25));
    const nameAlphaCurved = nameP * nameFade;

    if (nameAlphaCurved > 0.002) {
      const scale = 0.92 + nameP * 0.08;
      ic.save();
      const fs = Math.min(W*0.13, 60);
      ic.globalAlpha = nameAlphaCurved;
      ic.translate(W*0.5, H*0.5);
      ic.scale(scale, scale);
      ic.shadowColor = `rgba(220,160,130,${(nameAlphaCurved*0.6).toFixed(3)})`;
      ic.shadowBlur  = 20 + nameP * 16;
      ic.fillStyle   = `rgba(235,190,160,1)`;
      ic.font        = `300 italic ${fs}px 'Cormorant Garamond',Georgia,serif`;
      ic.textAlign   = 'center';
      ic.textBaseline= 'middle';
      ic.fillText('Resonance', 0, 0);
      ic.restore();
    }

    // Fade everything to black together
    if (p > 0.90) {
      const fadeOut = Math.min(1, (p-0.90)/0.10);
      ic.save();
      ic.globalAlpha = fadeOut;
      ic.fillStyle   = '#080610';
      ic.fillRect(0, 0, W, H);
      ic.restore();
    }

    if (t === 120 && skip) skip.classList.add('visible');

    if (t < TOTAL) {
      introAnimFrame = requestAnimationFrame(introLoop);
    } else {
      endIntroAnimation();
    }
  }

  // Tap triggers audio (iOS gesture requirement) + optional skip
  let audioStarted = false;
  let skipping = false;

  const onTap = (e) => {
    // iOS requires gesture before AudioContext — fire audio on first tap
    if (!audioStarted) {
      audioStarted = true;
      // Small timeout lets iOS fully process the gesture before we touch AudioContext
      setTimeout(() => {
        try {
          if (!audioCtx || audioCtx.state === 'closed') {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          }
          const go = () => {
            playIntroAudio();
            // Prime drone so it's ready when home arrives
            if (!droneNodes.length) startDrone();
          };
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(go).catch(() => {});
          } else {
            go();
          }
        } catch(e) { console.warn('iOS audio init failed:', e.message); }
      }, 80); // 80ms — enough for iOS gesture to register
    }
    // Only skip if past the 2s mark
    if (t > 120 && !skipping) {
      skipping = true;
      let fadeT = 0;
      const fadeOut = () => {
        fadeT++;
        const f = Math.min(1, fadeT / 24);
        ic.save(); ic.globalAlpha = f; ic.fillStyle = '#080610';
        ic.fillRect(0, 0, W, H); ic.restore();
        if (f < 1) requestAnimationFrame(fadeOut);
        else endIntroAnimation();
      };
      if (introAnimFrame) { cancelAnimationFrame(introAnimFrame); introAnimFrame = null; }
      requestAnimationFrame(fadeOut);
    }
  };
  screen.addEventListener('click',    onTap, {passive: true});
  screen.addEventListener('touchend', onTap, {passive: true});

  // Start loop immediately
  introAnimFrame = requestAnimationFrame(introLoop);
}

function updateIntroLang() {
  const en = document.getElementById('introLangEn');
  const es = document.getElementById('introLangEs');
  if (en) en.classList.toggle('active', lang === 'en');
  if (es) es.classList.toggle('active', lang === 'es');
  // Update skip hint text
  const skip = document.getElementById('introSkip');
  if (skip) skip.textContent = lang === 'en' ? 'tap to enter' : 'toca para entrar';
}

function playIntroAudio() {
  if (!audioEnabled || !audioCtx) return;
  try {
    // Rose tone — warm, enters at start
    [[396,0.013],[198,0.008]].forEach(([f,g],i) => {
      const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
      const lp = audioCtx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=800;
      o.type='sine'; o.frequency.value=f;
      const t0 = audioCtx.currentTime + 0.3;
      gn.gain.setValueAtTime(0,t0); gn.gain.linearRampToValueAtTime(g,t0+3);
      gn.gain.setValueAtTime(g,t0+16); gn.gain.exponentialRampToValueAtTime(0.0001,t0+24);
      o.connect(lp); lp.connect(gn); gn.connect(audioCtx.destination);
      o.start(t0); o.stop(t0+25);
    });
    // Violet tone — cool, enters after rose
    [[528,0.010],[264,0.006]].forEach(([f,g],i) => {
      const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
      const lp = audioCtx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1000;
      o.type='sine'; o.frequency.value=f;
      const t0 = audioCtx.currentTime + 3.5; // enters later
      gn.gain.setValueAtTime(0,t0); gn.gain.linearRampToValueAtTime(g,t0+3);
      gn.gain.setValueAtTime(g,t0+12); gn.gain.exponentialRampToValueAtTime(0.0001,t0+22);
      o.connect(lp); lp.connect(gn); gn.connect(audioCtx.destination);
      o.start(t0); o.stop(t0+23);
    });
    // Convergence chord — enters near end of animation
    [[432,0.018],[864,0.009]].forEach(([f,g]) => {
      const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
      o.type='sine'; o.frequency.value=f;
      const t0 = audioCtx.currentTime + 17;
      gn.gain.setValueAtTime(0,t0); gn.gain.linearRampToValueAtTime(g,t0+2.5);
      gn.gain.exponentialRampToValueAtTime(0.0001,t0+8);
      o.connect(gn); gn.connect(audioCtx.destination);
      o.start(t0); o.stop(t0+9);
    });
  } catch(e) {}
}

function endIntroAnimation() {
  if (introAnimFrame) { cancelAnimationFrame(introAnimFrame); introAnimFrame = null; }
  lsSet('f2_intro_played', '1');
  introPlayed = true;
  const skip = document.getElementById('introSkip');
  if (skip) skip.classList.remove('visible');

  // Fade home in over intro — seamless
  const home  = document.getElementById('s-home');
  const intro = document.getElementById('s-intro');

  // Home starts invisible, fades in
  if (home) {
    home.style.opacity = '0';
    home.style.transition = 'none';
    home.classList.add('active');
  }
  if (intro) intro.classList.remove('active');

  applyLang();
  applyDawnPalette();
  document.querySelectorAll('.al').forEach(a => a.classList.add('on'));

  // Fade home in
  requestAnimationFrame(() => {
    if (home) {
      home.style.transition = 'opacity 0.9s ease';
      home.style.opacity = '1';
      setTimeout(() => { home.style.transition = ''; home.style.opacity = ''; }, 950);
    }
  });

  setTimeout(tryDrone, 400);
}

// ── INTEGRATE WAVE CONVERGENCE ──
let convergenceActive = false;

function triggerWaveConvergence() {
  convergenceActive = true;
  playConvergenceChord(); // both tones align
  let frame = 0;
  const FRAMES = 360; // ~6s
  const origRoseY   = WAVE_TOP_FRAC;
  const origVioletY = WAVE_BOT_FRAC;

  const tick = () => {
    if (!convergenceActive) return;
    frame++;
    const p = frame / FRAMES;
    const ease = p < 0.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;

    if (p < 0.45) {
      // Converge toward centre
      const conv = Math.min(1, p/0.4);
      const e2 = conv < 0.5 ? 2*conv*conv : 1-Math.pow(-2*conv+2,2)/2;
      wRose.targetAmp   = 0.040 - 0.025 * e2;
      wViolet.targetAmp = 0.040 - 0.025 * e2;
      // Move y toward centre via direct amp increase not y change
      waveCoherenceTgt = Math.min(1.0, 0.82 + e2 * 0.18);

    } else if (p < 0.65) {
      // Hold at convergence — max coherence
      waveCoherenceTgt = 1.0;
      wRose.targetAmp   = 0.015;
      wViolet.targetAmp = 0.015;
      wRose.targetAlpha   = 0.85;
      wViolet.targetAlpha = 0.82;

    } else {
      // Gently return
      const ret = (p - 0.65) / 0.35;
      wRose.targetAmp   = 0.015 + 0.027 * ret;
      wViolet.targetAmp = 0.015 + 0.027 * ret;
      wRose.targetAlpha   = 0.85 - 0.33 * ret;
      wViolet.targetAlpha = 0.82 - 0.36 * ret;
      waveCoherenceTgt = 1.0 - 0.18 * ret;
    }

    if (frame < FRAMES) {
      requestAnimationFrame(tick);
    } else {
      convergenceActive = false;
      setWaveState('integrate');
    }
  };
  requestAnimationFrame(tick);
}

// ── INIT ──
if (fontLarge) document.body.classList.add('fs-large');
applyDawnPalette();
applyLang();
setWaveState('home');
updateHomeCount();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => applyLang());
} else {
  setTimeout(applyLang, 800);
}

// First launch: play intro animation (s-intro already active)
// Returning: skip to home directly
if (!introPlayed) {
  // Start visual animation immediately — no tap needed
  // Audio starts on first tap (iOS requirement)
  const enableAudio = () => {
    document.removeEventListener('touchstart', enableAudio);
    document.removeEventListener('click', enableAudio);
    initAudio();
    resumeAudio();
  };
  document.addEventListener('touchstart', enableAudio, {once: true, passive: true});
  document.addEventListener('click', enableAudio, {once: true});
  // Run animation immediately
  setTimeout(() => playIntroAnimation(), 100);
} else {
  // Skip intro — go straight to home
  const home  = document.getElementById('s-home');
  const intro = document.getElementById('s-intro');
  if (intro) intro.classList.remove('active');
  if (home)  home.classList.add('active');
  document.querySelectorAll('.al').forEach(a => a.classList.add('on'));
  const startAudio = () => {
    document.removeEventListener('touchstart', startAudio);
    document.removeEventListener('click', startAudio);
    initAudio();
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => tryDrone()).catch(() => {});
      } else {
        tryDrone();
      }
    }
  };
  document.addEventListener('touchstart', startAudio, {once: true, passive: true});
  document.addEventListener('click', startAudio, {once: true});
}
