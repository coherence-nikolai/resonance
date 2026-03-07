// ═══════════════════════════════════════
// FIELD — Unified App v3.1
// Observe · Collapse · Decohere
//
// FIXES & IMPROVEMENTS v3.1:
// [UX1]  Back button always visible during Observer (never hidden in countdown)
// [UX2]  isTransitioning flag properly set/cleared — no double-fire on rapid taps
// [UX3]  body-node left position clamped — safe on narrow screens
// [UX4]  Storm screen gets timed fade-out (3min) + tap-anywhere-to-exit
// [UX5]  Settings panel swipe-down to close gesture
// [UX6]  1m duration option hidden for drift/kasina (only noting needs it)
// [UX7]  Landing canvas resize listener uses { once } / cleanup
// [AE1]  obsCoherenceWord + dec-end-line get fieldTitleBreathe animation variant
// [AE2]  Orb hover: brief full-sharp pulse before state collapse
// [AE3]  shadow-orb base opacity raised to .82
// [AE4]  dec-witnessed buttons delayed to 12s (was 8s)
// [AE5]  Crystallised breath glow shifted to deep gold rgba(240,190,60,...)
// [AE6]  mv-hint opacity raised to .42
// [AE7]  tapNext/taph pulse speed varies: collapse-intro 1.8s, observe 3.8s, default 2.8s
// [TECH1] visibilitychange → suspend/resume audioCtx
// [TECH2] _flickering zeroed on spParticle reset
// [TECH3] isTransitioning fully wired
// ═══════════════════════════════════════

// ── STATE ──
let lang = localStorage.getItem('field_lang') || 'en';
let audioCtx = null, droneNodes = [], breathTimers = [], decBreathTimers = [];
let breathRunning = false, breathCycle = 0, curStateName = '', spChosen = 0;
let breathOrb = null; // canvas-driven breath orb
let collapseStage = 0, isTransitioning = false, particlesHidden = false;
let totalObs = parseInt(localStorage.getItem('field_obs') || '0');
let currentMode = 'home';
let audioEnabled = true;
let fontLarge = localStorage.getItem('field_font_large') === '1';

// Observer state
let attentionTimer = null, attentionSec = 0, isCoherent = false;
let fieldActive = false, scatterTO = null, observeParticle = null;
const COHERENCE_SEC = 45;
const METER_DOTS = 9;

// Three-signal attention system
let isStill = true, lastMotionTime = 0, lastAffirmTime = 0;
let affirmBonus = 0;
let microToneTimer = null;
let motionCheckInterval = null;

// Decohere state
let decStateName = '', decStateNameES = '';
let decBodySpot = 'chest';
let collapseBodySpot = 'chest';

// Voice noting state
let voiceRecognition = null;
let voiceActive = false;
let voiceTranscript = '';

// Observe mode state
let obsMode = 'drift';
let obsMinutes = 5;
let obsTimerEnd = 0;
let obsTimerInterval = null;
let kasinaParticle = null;

// Noting state
let obsStorm = false;
let noteCount = 0;
let noteSense = '';
let stormTimer = null;

// Storm screen timeout
let stormAutoExitTimer = null;

// ── CANVAS ──
const cv = document.getElementById('cv');
const cx = cv.getContext('2d');
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function rsz() {
  if (isIOS) { cv.width = innerWidth; cv.height = innerHeight; }
  else {
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    cx.resetTransform(); cx.scale(dpr, dpr);
  }
}
window.addEventListener('resize', rsz); rsz();

// ── BACKGROUND PARTICLES ──
class Pt {
  constructor() { this.reset(true); }
  reset(init) {
    this.x = Math.random() * innerWidth;
    this.y = init ? Math.random() * innerHeight : innerHeight + 5;
    this.vy = -(0.08 + Math.random() * 0.18);
    this.r = Math.random() * 0.9 + 0.2;
    this.alpha = Math.random() * 0.22 + 0.04;
    this.targetAlpha = this.alpha;
  }
  update() { this.y += this.vy; if (this.y < -5) this.reset(false); this.alpha += (this.targetAlpha - this.alpha) * 0.04; }
  draw() {
    cx.globalAlpha = this.alpha * bgDimLevel; cx.fillStyle = '#f0cc88';
    cx.beginPath(); cx.arc(this.x, this.y, this.r, 0, Math.PI*2); cx.fill(); cx.globalAlpha = 1;
  }
}
const bgPts = Array.from({length:70}, () => new Pt());
let bgDimTarget = 1; let bgDimLevel = 1;

// ── DEVICE TILT PARALLAX ──
let tiltX = 0, tiltY = 0; // -1 to 1 smoothed
let rawTiltX = 0, rawTiltY = 0;
window.addEventListener('deviceorientation', e => {
  // gamma = left/right (-90 to 90), beta = front/back (-180 to 180)
  rawTiltX = Math.max(-1, Math.min(1, (e.gamma || 0) / 30));
  rawTiltY = Math.max(-1, Math.min(1, ((e.beta || 0) - 45) / 40));
}, { passive: true });

// ── SUPERPOSITION PARTICLES ──
class SpParticle {
  constructor(i, total) {
    this.idx = i;
    const angle = (Math.PI*2/total)*i + Math.random()*0.5;
    const r = 0.28 + Math.random()*0.18;
    this.cx = 0.5 + Math.cos(angle)*r; this.cy = 0.45 + Math.sin(angle)*r;
    this.targetCx = this.cx; this.targetCy = this.cy;
    this.x = this.cx*innerWidth; this.y = this.cy*innerHeight;
    this.ph = Math.random()*Math.PI*2;
    this.phV = 0.005 + Math.random()*0.005;
    this.driftR = 20 + Math.random()*18;
    this.r = 2.2 + Math.random()*1.2;
    this.alpha = 0; this.targetAlpha = 0;
    this.clarity = 0; this.targetClarity = 0;
    this._flickering = false; // [TECH2]
  }
  update() {
    this.ph += this.phV;
    this.cx += (this.targetCx - this.cx) * 0.018;
    this.cy += (this.targetCy - this.cy) * 0.018;
    const ds = Math.min(innerWidth, innerHeight);
    // Tilt parallax — depth by index (outer particles move more)
    const tiltDepth = currentMode === 'home' ? (0.5 + (this.idx % 4) * 0.3) : 0;
    const tiltOffX = tiltX * 18 * tiltDepth;
    const tiltOffY = tiltY * 12 * tiltDepth;
    this.x = this.cx*innerWidth  + Math.cos(this.ph)*this.driftR*(ds/500) + tiltOffX;
    this.y = this.cy*innerHeight + Math.sin(this.ph*0.73)*this.driftR*0.65*(ds/500) + tiltOffY;
    this.alpha += (this.targetAlpha - this.alpha) * 0.025;
    this.clarity += (this.targetClarity - this.clarity) * 0.03;
    if (this._flickering) {
      this.alpha = 0.3 + Math.random()*0.65;
      this.clarity = Math.random()*0.3;
    }
  }
  draw() {
    if (this.alpha < 0.01) return;
    const blur = (1-this.clarity)*20 + 4;
    const glow = 10 + this.clarity*28;
    cx.save();
    cx.filter = `blur(${blur.toFixed(1)}px)`;
    const grad = cx.createRadialGradient(this.x,this.y,0,this.x,this.y,glow);
    grad.addColorStop(0, `rgba(240,204,136,${(this.alpha*0.45).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(240,204,136,0)');
    cx.fillStyle = grad;
    cx.beginPath(); cx.arc(this.x,this.y,glow,0,Math.PI*2); cx.fill();
    cx.globalAlpha = this.alpha;
    cx.fillStyle = `rgba(240,204,136,${(0.5+this.clarity*0.5).toFixed(3)})`;
    cx.beginPath(); cx.arc(this.x,this.y,this.r,0,Math.PI*2); cx.fill();
    cx.restore();
  }
}
let spParticles = [];

// ── BREATH ORB — pure canvas, quantum collapse breathing ──
// Driven entirely by elapsed time in RAF loop. No CSS transitions.
class BreathOrb {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.targetX = innerWidth * 0.5;
    this.targetY = innerHeight * 0.5;
    this.alpha = 1;
    this.cycleCount = 0;
    this.maxCycles = 3;
    this.phase = 'settling'; // settling | inhale | hold | exhale | rest | crystallised | done
    this.phaseStart = performance.now();
    this.cycleComplete = false;
    this.onCyclesDone = null;
    // Eased display values driven toward targets
    this.dispRadius = 9;
    this.dispBlur = 0;
    this.dispGlow = 1;
    // Phase durations (ms)
    this.SETTLE = 1800;
    this.INHALE = 4500;
    this.HOLD   = 1500;
    this.EXHALE = 5000;
    this.REST   = 800;
    // Ripple
    this.ripples = [];
    // Micro-flicker
    this.flickPh = 0;
    // Label callback
    this.onPhaseChange = null;
    // State word drawn inside orb — fades over 3 cycles
    this.wordText = '';
    this.wordAlpha = 0;
    this.wordTargetAlpha = 0;
  }

  get elapsed() { return performance.now() - this.phaseStart; }

  startPhase(name) {
    this.phase = name;
    this.phaseStart = performance.now();
    if (this.onPhaseChange) this.onPhaseChange(name, this.cycleCount);
  }

  update() {
    const t = this.elapsed;
    this.flickPh += 0.35;
    const flicker = 0.92 + 0.08 * Math.sin(this.flickPh);

    // Move toward centre
    this.x += (this.targetX - this.x) * 0.04;
    this.y += (this.targetY - this.y) * 0.04;

    let targetRadius, targetBlur, targetGlow;

    if (this.phase === 'settling') {
      // Gentle pre-breath settle — small soft pulse
      const p = Math.min(t / this.SETTLE, 1);
      targetRadius = 9 + 6 * Math.sin(p * Math.PI);
      targetBlur = 2 + 3 * Math.sin(p * Math.PI);
      targetGlow = 0.4 + 0.3 * Math.sin(p * Math.PI);
      if (t > this.SETTLE) this.startPhase('inhale');

    } else if (this.phase === 'inhale') {
      // Expand to blurry superposition — all possibilities
      const p = Math.min(t / this.INHALE, 1);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      targetRadius = 9 + 111 * ease;   // 9 → 120
      targetBlur   = 0 + 18 * ease;    // 0 → 18
      targetGlow   = 1 - 0.6 * ease;   // 1 → 0.4 (softer when expanded)
      if (t > this.INHALE) {
        this.ripples.push({ r: this.dispRadius * 0.8, alpha: 0.5 });
        this.startPhase('hold');
      }

    } else if (this.phase === 'hold') {
      // Peak — suspended, diffuse, all possibilities coexisting
      targetRadius = 120;
      targetBlur   = 16;
      targetGlow   = 0.35;
      if (t > this.HOLD) this.startPhase('exhale');

    } else if (this.phase === 'exhale') {
      // Collapse — wave function collapsing to a single defined point
      const p = Math.min(t / this.EXHALE, 1);
      const ease = p < 0.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2; // ease-in-out
      targetRadius = 120 - 111 * ease;  // 120 → 9
      targetBlur   = 18  - 18  * ease;  // 18 → 0
      targetGlow   = 0.35 + (0.9 + this.cycleCount * 0.25) * ease; // gets brighter each cycle
      // Big ripple at start of exhale
      if (t < 60 && this.ripples.length === 0) {
        this.ripples.push({ r: 20, alpha: 0.7 });
      }
      if (t > this.EXHALE) {
        this.cycleCount++;
        if (this.cycleCount >= this.maxCycles) {
          this.startPhase('crystallised');
          if (this.onCyclesDone) setTimeout(() => this.onCyclesDone(), 600);
        } else {
          this.startPhase('rest');
        }
      }

    } else if (this.phase === 'rest') {
      targetRadius = 9;
      targetBlur   = 0;
      targetGlow   = 1.2;
      if (t > this.REST) this.startPhase('inhale');

    } else if (this.phase === 'crystallised') {
      // Final collapse — steady bright defined point
      const age = Math.min(t / 1400, 1);
      targetRadius = 9 + 6 * Math.sin(age * Math.PI * 0.5);
      targetBlur   = 0;
      targetGlow   = 1.5 + 0.5 * Math.sin(t * 0.003); // slow pulse
    }

    // Smooth lerp toward targets (speed varies by phase for feel)
    const lerpSpeed = this.phase === 'exhale' ? 0.055 : 0.045;
    this.dispRadius += (targetRadius - this.dispRadius) * lerpSpeed;
    this.dispBlur   += (targetBlur   - this.dispBlur)   * lerpSpeed;
    this.dispGlow   += (targetGlow   - this.dispGlow)   * lerpSpeed;
    // Word fade
    this.wordAlpha  += (this.wordTargetAlpha - this.wordAlpha) * 0.03;

    // Age ripples
    this.ripples = this.ripples.filter(rp => {
      rp.r += 2.2; rp.alpha -= 0.012;
      return rp.alpha > 0;
    });
  }

  draw() {
    const px = this.x, py = this.y;
    const r  = Math.max(0.1, this.dispRadius);
    const bl = Math.max(0, this.dispBlur);
    const gl = this.dispGlow;
    const flicker = 0.92 + 0.08 * Math.sin(this.flickPh);

    cx.save();

    // ── Ripples ──
    this.ripples.forEach(rp => {
      cx.save();
      cx.globalAlpha = rp.alpha;
      cx.strokeStyle = 'rgba(240,204,136,1)';
      cx.lineWidth = 1;
      cx.beginPath(); cx.arc(px, py, rp.r, 0, Math.PI * 2); cx.stroke();
      cx.restore();
    });

    // ── Outer glow (corona) — grows on inhale, collapses on exhale ──
    const coronaR = r * 3.5 + bl * 8;
    if (coronaR > 1) {
      const corona = cx.createRadialGradient(px, py, r * 0.5, px, py, coronaR);
      corona.addColorStop(0, `rgba(240,190,80,${(0.18 * gl * this.alpha).toFixed(3)})`);
      corona.addColorStop(1, 'rgba(240,190,80,0)');
      cx.fillStyle = corona;
      cx.beginPath(); cx.arc(px, py, coronaR, 0, Math.PI * 2); cx.fill();
    }

    // ── Blurry expansion layer — only visible when expanded ──
    if (bl > 0.5) {
      cx.filter = `blur(${bl.toFixed(1)}px)`;
      const expandR = r * 1.4;
      const expGrad = cx.createRadialGradient(px, py, 0, px, py, expandR);
      expGrad.addColorStop(0, `rgba(255,220,140,${(0.55 * this.alpha).toFixed(3)})`);
      expGrad.addColorStop(0.5, `rgba(240,190,80,${(0.25 * this.alpha).toFixed(3)})`);
      expGrad.addColorStop(1, 'rgba(240,190,80,0)');
      cx.fillStyle = expGrad;
      cx.beginPath(); cx.arc(px, py, expandR, 0, Math.PI * 2); cx.fill();
      cx.filter = 'none';
    }

    // ── Inner glow — intense on collapse ──
    const innerR = r * 1.8 + (1 - bl / 18) * 30 * gl;
    const innerGrad = cx.createRadialGradient(px, py, 0, px, py, innerR);
    innerGrad.addColorStop(0, `rgba(255,240,180,${(0.85 * gl * this.alpha * flicker).toFixed(3)})`);
    innerGrad.addColorStop(0.4, `rgba(255,200,100,${(0.4 * gl * this.alpha).toFixed(3)})`);
    innerGrad.addColorStop(1, 'rgba(240,190,80,0)');
    cx.fillStyle = innerGrad;
    cx.beginPath(); cx.arc(px, py, innerR, 0, Math.PI * 2); cx.fill();

    // ── Hard core — only when collapsed (small radius) ──
    const coreAlpha = Math.max(0, 1 - bl / 10) * this.alpha;
    if (coreAlpha > 0.01 && r > 0.1) {
      cx.globalAlpha = coreAlpha * flicker;
      cx.fillStyle = 'rgba(255,250,230,1)';
      cx.beginPath(); cx.arc(px, py, r, 0, Math.PI * 2); cx.fill();
      // Hot centre dot
      cx.globalAlpha = coreAlpha;
      cx.fillStyle = 'rgba(255,255,255,1)';
      cx.beginPath(); cx.arc(px, py, r * 0.4, 0, Math.PI * 2); cx.fill();
    }

    cx.globalAlpha = 1;
    cx.restore();

    // ── State word — drawn centred in orb, fades over 3 cycles ──
    if (this.wordText && this.wordAlpha > 0.01) {
      const wordA = this.wordAlpha * this.alpha;
      // Word blurs slightly when orb expands (inhale/hold), sharpens on exhale
      const wordBlur = Math.min(bl * 0.35, 4);
      cx.save();
      if (wordBlur > 0.5) cx.filter = `blur(${wordBlur.toFixed(1)}px)`;
      cx.globalAlpha = wordA;
      const fontSize = Math.max(18, Math.min(38, innerWidth * 0.07));
      cx.font = `300 ${fontSize}px 'Cormorant Garamond', Georgia, serif`;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      // Glow under text
      cx.shadowColor = `rgba(240,210,140,${(wordA * 0.6).toFixed(2)})`;
      cx.shadowBlur = 12 + (1 - wordA) * 8;
      cx.fillStyle = `rgba(240,225,190,${wordA.toFixed(3)})`;
      cx.fillText(this.wordText, px, py);
      cx.shadowBlur = 0;
      cx.filter = 'none';
      cx.restore();
    }
  }
}


// ── OBSERVE PARTICLES ──
let clarityLevel = 0, particleVisible = false;

class KasinaParticle {
  constructor() {
    this.x = innerWidth * 0.5;
    this.y = innerHeight * 0.5;
    this.r = 9;
    this.alpha = 0; this.targetAlpha = 1;
    this.breathPh = 0;
    this.shudderX = 0; this.shudderY = 0;
    this.pulsePh = 0;
    this.shudderPh = 0;
    this.rayPh = 0;       // slow ray rotation
    this.flickPh = 0;     // fast micro-flicker
    this.NUM_RAYS = 8;
  }
  update() {
    this.breathPh  += 0.016;
    this.pulsePh   += 0.08;
    this.shudderPh += 0.28;
    this.rayPh     += 0.004;   // very slow rotation
    this.flickPh   += 0.35;    // fast inner flicker

    const shudderAmp = isStill
      ? 0.6 + 0.9 * Math.sin(this.shudderPh) * Math.cos(this.shudderPh * 1.7)
      : 2.5 + 5 * Math.random();
    this.shudderX = (Math.random() - 0.5) * shudderAmp;
    this.shudderY = (Math.random() - 0.5) * shudderAmp;
    this.alpha += (this.targetAlpha - this.alpha) * 0.025;
  }
  draw() {
    if (this.alpha < 0.01) return;
    const px = this.x + this.shudderX;
    const py = this.y + this.shudderY;
    const breathFactor = 0.68 + 0.32 * Math.sin(this.breathPh);
    const microPulse   = 1 + 0.07 * Math.sin(this.pulsePh);
    const flicker      = 0.88 + 0.12 * Math.sin(this.flickPh);
    const cl = Math.max(clarityLevel, 0.15); // minimum presence even at zero clarity

    // Core radius
    const r = (this.r + cl * 5) * microPulse;

    // Glow layers — three concentric halos
    const g1 = (18 + cl * 28) * breathFactor;   // inner
    const g2 = (55 + cl * 90) * breathFactor;   // mid
    const g3 = (120 + cl * 160) * breathFactor; // corona

    cx.save();

    // ── Corona (outermost, very soft) ──
    const corona = cx.createRadialGradient(px, py, g2 * 0.5, px, py, g3);
    corona.addColorStop(0, `rgba(240,190,80,${(0.06 * this.alpha * breathFactor).toFixed(3)})`);
    corona.addColorStop(1, 'rgba(240,190,80,0)');
    cx.fillStyle = corona;
    cx.beginPath(); cx.arc(px, py, g3, 0, Math.PI * 2); cx.fill();

    // ── Mid halo ──
    const midGrad = cx.createRadialGradient(px, py, 0, px, py, g2);
    midGrad.addColorStop(0, `rgba(255,220,140,${(0.22 * this.alpha * breathFactor * flicker).toFixed(3)})`);
    midGrad.addColorStop(0.4, `rgba(240,190,80,${(0.14 * this.alpha * breathFactor).toFixed(3)})`);
    midGrad.addColorStop(1, 'rgba(240,190,80,0)');
    cx.fillStyle = midGrad;
    cx.beginPath(); cx.arc(px, py, g2, 0, Math.PI * 2); cx.fill();

    // ── Rays ──
    const rayCount = this.NUM_RAYS;
    for (let i = 0; i < rayCount; i++) {
      const angle = this.rayPh + (Math.PI * 2 / rayCount) * i;
      // Each ray has its own length pulse offset
      const lenPulse = 0.55 + 0.45 * Math.sin(this.breathPh * 1.3 + i * 0.8);
      const rayLen   = (g1 * 2.2 + cl * 60) * lenPulse * breathFactor;
      const rayWidth = r * 0.18;
      const rayAlpha = (0.12 + cl * 0.22) * this.alpha * lenPulse * flicker;

      cx.save();
      cx.translate(px, py);
      cx.rotate(angle);
      const rayGrad = cx.createLinearGradient(r, 0, r + rayLen, 0);
      rayGrad.addColorStop(0, `rgba(255,220,140,${rayAlpha.toFixed(3)})`);
      rayGrad.addColorStop(0.5, `rgba(240,190,80,${(rayAlpha * 0.5).toFixed(3)})`);
      rayGrad.addColorStop(1, 'rgba(240,190,80,0)');
      cx.fillStyle = rayGrad;
      cx.beginPath();
      cx.moveTo(r, -rayWidth);
      cx.lineTo(r + rayLen, 0);
      cx.lineTo(r, rayWidth);
      cx.closePath();
      cx.fill();
      cx.restore();
    }

    // ── Inner glow ──
    const innerGrad = cx.createRadialGradient(px, py, 0, px, py, g1);
    innerGrad.addColorStop(0, `rgba(255,240,180,${(0.9 * this.alpha * flicker).toFixed(3)})`);
    innerGrad.addColorStop(0.3, `rgba(255,210,120,${(0.55 * this.alpha * breathFactor).toFixed(3)})`);
    innerGrad.addColorStop(1, 'rgba(240,190,80,0)');
    cx.fillStyle = innerGrad;
    cx.beginPath(); cx.arc(px, py, g1, 0, Math.PI * 2); cx.fill();

    // ── Hard core ──
    cx.globalAlpha = this.alpha * (0.85 + 0.15 * flicker);
    cx.fillStyle = `rgba(255,248,220,1)`;
    cx.beginPath(); cx.arc(px, py, r, 0, Math.PI * 2); cx.fill();

    // ── Tiny hot centre ──
    cx.globalAlpha = this.alpha;
    cx.fillStyle = 'rgba(255,255,240,1)';
    cx.beginPath(); cx.arc(px, py, r * 0.45, 0, Math.PI * 2); cx.fill();

    cx.restore();
  }
}

class ObsParticle {
  constructor() {
    this.cx = 0.5; this.cy = 0.5;
    this.x = innerWidth*0.5; this.y = innerHeight*0.5;
    this.ph = Math.random()*Math.PI*2;
    this.phV = 0.004 + Math.random()*0.003;
    this.driftR = 55 + Math.random()*35;
    this.r = 15; this.alpha = 0; this.targetAlpha = 0.9;
    this.breathPh = 0;
    this.scattering = false; this.scatterParts = [];
  }
  update() {
    this.ph += this.phV;
    this.breathPh += 0.017;
    this.cx += (0.5-this.cx)*0.001; this.cy += (0.5-this.cy)*0.001;
    const ds = Math.min(innerWidth, innerHeight);
    const motionFactor = isStill ? 1 : 0.5;
    this.x = this.cx*innerWidth + Math.cos(this.ph)*this.driftR*(ds/400)*motionFactor;
    this.y = this.cy*innerHeight + Math.sin(this.ph*0.67)*this.driftR*0.7*(ds/400)*motionFactor;
    this.alpha += (this.targetAlpha - this.alpha)*0.02;
  }
  draw() {
    if (this.alpha < 0.01) return;
    const breathFactor = 0.7 + 0.3*Math.sin(this.breathPh);
    const stillFactor = isStill ? 1 : 0.4;
    const blur = (1-clarityLevel)*12;
    const r = this.r + clarityLevel*6;
    const glow = (55 + clarityLevel*90) * breathFactor;
    const ga = (0.15 + clarityLevel*0.35) * stillFactor;
    cx.save();
    if (blur > 0.5) cx.filter = `blur(${blur.toFixed(1)}px)`;
    const grad = cx.createRadialGradient(this.x,this.y,0,this.x,this.y,glow);
    grad.addColorStop(0, `rgba(240,204,136,${(ga*this.alpha).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(240,204,136,0)');
    cx.fillStyle = grad; cx.beginPath(); cx.arc(this.x,this.y,glow,0,Math.PI*2); cx.fill();
    cx.filter = 'none';
    cx.globalAlpha = this.alpha * stillFactor;
    cx.fillStyle = `rgba(240,204,136,${0.7+clarityLevel*0.3})`;
    cx.beginPath(); cx.arc(this.x,this.y,r,0,Math.PI*2); cx.fill();
    cx.restore();
  }
  scatter() {
    this.scattering = true; this.scatterParts = [];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI*2/12)*i + Math.random()*0.4;
      const speed = 1.5 + Math.random()*2.5;
      this.scatterParts.push({x:this.x, y:this.y,
        vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
        alpha:0.7+Math.random()*0.3, r:1.5+Math.random()*2});
    }
    this.targetAlpha = 0;
    setTimeout(() => {
      this.scattering = false; this.scatterParts = [];
      this.cx = 0.5; this.cy = 0.5; this.ph = Math.random()*Math.PI*2;
      this.targetAlpha = 0.9;
    }, 1200);
  }
  drawScatter() {
    this.scatterParts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.alpha *= 0.93;
      if (p.alpha < 0.01) return;
      cx.globalAlpha = p.alpha; cx.fillStyle = 'rgba(240,204,136,0.8)';
      cx.beginPath(); cx.arc(p.x,p.y,p.r,0,Math.PI*2); cx.fill();
    });
    cx.globalAlpha = 1;
  }
}

// ── RENDER LOOP ──
function loop() {
  try {
    cx.clearRect(0, 0, cv.width, cv.height);
    bgDimLevel += (bgDimTarget - bgDimLevel) * 0.03;
    // Smooth tilt
    tiltX += (rawTiltX - tiltX) * 0.06;
    tiltY += (rawTiltY - tiltY) * 0.06;
    bgPts.forEach(p => { p.update(); p.draw(); });
    if (currentMode === 'observe' && particleVisible) {
      if (obsMode === 'kasina' && kasinaParticle) {
        kasinaParticle.update(); kasinaParticle.draw();
      } else if (observeParticle) {
        observeParticle.update();
        if (observeParticle.scattering) observeParticle.drawScatter();
        else observeParticle.draw();
      }
    }
    if ((currentMode === 'collapse' || currentMode === 'home' || currentMode === 'decohere') && spParticles.length) {
      spParticles.forEach(p => { p.update(); p.draw(); });
    }
    if (breathOrb && currentMode === 'collapse') {
      breathOrb.update(); breathOrb.draw();
      // ── Breath arc ring — visual inhale/exhale, replaces text labels ──
      const isInhale = breathOrb.phase === 'inhale' || breathOrb.phase === 'hold';
      const isExhale = breathOrb.phase === 'exhale';
      if (isInhale || isExhale) {
        const orbR = breathOrb.dispRadius;
        const ringR = orbR * 2.8 + 18;
        const progT = Math.min(breathOrb.elapsed / (isInhale ? breathOrb.INHALE : breathOrb.EXHALE), 1);
        const arc = isInhale ? progT * Math.PI * 2 : (1 - progT) * Math.PI * 2;
        const ringAlpha = 0.18 + 0.12 * Math.sin(breathOrb.flickPh * 0.4);
        cx.save();
        cx.globalAlpha = ringAlpha;
        cx.strokeStyle = `rgba(240,210,140,1)`;
        cx.lineWidth = 1;
        cx.lineCap = 'round';
        cx.beginPath();
        cx.arc(breathOrb.x, breathOrb.y, ringR, -Math.PI/2, -Math.PI/2 + arc, false);
        cx.stroke();
        cx.restore();
      }
    }
  } catch(e) { console.warn('loop err:', e); }
  requestAnimationFrame(loop);
}
loop();

// ── AUDIO ──
function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext||window.webkitAudioContext)();
}

// [TECH1] visibilitychange — suspend/resume audio to save battery and prevent ghost audio
document.addEventListener('visibilitychange', () => {
  if (!audioCtx) return;
  if (document.hidden) {
    audioCtx.suspend().catch(() => {});
  } else if (audioEnabled) {
    audioCtx.resume().catch(() => {});
  }
});

function playDrone() {
  if (!audioCtx || droneNodes.length) return;
  [432,216,144,108].forEach((f,i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.022-i*0.004, audioCtx.currentTime+3);
    o.connect(g); g.connect(audioCtx.destination); o.start();
    droneNodes.push({o, g});
  });
}
function fadeDrone(out=true, dur=2) {
  if (!audioCtx || !droneNodes.length) return;
  droneNodes.forEach(({g}) => {
    const now = audioCtx.currentTime, cur = g.gain.value;
    g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(cur, now);
    g.gain.linearRampToValueAtTime(out ? 0 : 0.022, now+dur);
  });
  if (out) setTimeout(() => { droneNodes.forEach(({o}) => { try{o.stop();}catch(e){} }); droneNodes = []; }, (dur+0.2)*1000);
}
function tryDrone() {
  if (!audioEnabled) return;
  initAudio();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') { audioCtx.resume().then(playDrone); return; }
  playDrone();
}
function playCollapseSound() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(220, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime+1);
  g.gain.setValueAtTime(0, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime+0.2);
  g.gain.linearRampToValueAtTime(0, audioCtx.currentTime+1.6);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+2);
  const b = audioCtx.createOscillator(), bg = audioCtx.createGain();
  b.type = 'sine'; b.frequency.value = 1320;
  bg.gain.setValueAtTime(0, audioCtx.currentTime+0.75);
  bg.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime+0.85);
  bg.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+3.5);
  b.connect(bg); bg.connect(audioCtx.destination);
  b.start(audioCtx.currentTime+0.75); b.stop(audioCtx.currentTime+4);
}
function playExhaleCollapse() {
  if (!audioCtx) return;
  [528,1056,1584].forEach((f,i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t0 = audioCtx.currentTime + i*0.05;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.055-i*0.015, t0+0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+5.5);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0+6);
  });
}
function playObsCoherenceTone() {
  if (!audioCtx) return;
  [660,1320].forEach((f,i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t0 = audioCtx.currentTime + i*0.08;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.06-i*0.02, t0+0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+5);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0+5.5);
  });
}
function playMicroTone() {
  if (!audioCtx || !fieldActive || isCoherent) return;
  const freq = isStill ? 660 : 550;
  [freq, freq*2].forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t0 = audioCtx.currentTime + i*0.06;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.018 - i*0.006, t0+0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+3);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0+3.5);
  });
}
function playAffirmSound() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.value = 792;
  g.gain.setValueAtTime(0, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime+0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+1.2);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+1.5);
}
function playTonePleasant() {
  if (!audioCtx) return;
  [[528, 0], [660, 0.22], [792, 0.42]].forEach(([f, delay]) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t0 = audioCtx.currentTime + delay;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + 1.6);
  });
}
function playToneUnpleasant() {
  if (!audioCtx) return;
  [[440, 0], [330, 0.22], [264, 0.42]].forEach(([f, delay]) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t0 = audioCtx.currentTime + delay;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.045, t0 + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + 1.8);
  });
}
function playTap() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.value = 880;
  g.gain.setValueAtTime(0, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0.022, audioCtx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.22);
}
const SENSE_FREQS = { seeing: 1320, hearing: 880, body: 528, mind: 660, taste: 440, smell: 396 };
function playNoteSense(key) {
  if (!audioCtx) return;
  const freq = SENSE_FREQS[key] || 660;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0.045, audioCtx.currentTime + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.0);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 1.2);
  // soft harmonic
  const o2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();
  o2.type = 'sine'; o2.frequency.value = freq * 2;
  g2.gain.setValueAtTime(0, audioCtx.currentTime + 0.05);
  g2.gain.linearRampToValueAtTime(0.018, audioCtx.currentTime + 0.12);
  g2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.4);
  o2.connect(g2); g2.connect(audioCtx.destination); o2.start(audioCtx.currentTime + 0.05); o2.stop(audioCtx.currentTime + 1.6);
}
function playBackNav() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(440, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.4);
  g.gain.setValueAtTime(0, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0.03, audioCtx.currentTime + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.7);
}
function playToneNeutral() {
  if (!audioCtx) return;
  g.gain.setValueAtTime(0, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 2.2);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 2.5);
}
function playDecohereRelease() {
  if (!audioCtx) return;
  [396, 180, 90].forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t0 = audioCtx.currentTime + i*0.15;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.05 - i*0.012, t0+0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+6);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0+7);
  });
}
function playScatterSound() {
  if (!audioCtx) return;
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate*0.3, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*(1-i/d.length);
  const src = audioCtx.createBufferSource(), g = audioCtx.createGain();
  src.buffer = buf; g.gain.setValueAtTime(0.04, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+0.3);
  src.connect(g); g.connect(audioCtx.destination); src.start();
}

// ── MOVEMENT AUDIO SIGNATURES ──
function playObserveSignature() {
  if (!audioCtx) return;
  [432, 540, 648].forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t0 = audioCtx.currentTime + i * 0.3;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.038 - i*0.008, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.5);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + 4);
  });
}
function playCollapseSignature() {
  if (!audioCtx) return;
  const freqs = [528, 264];
  freqs.forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = f;
    const t0 = audioCtx.currentTime + i * 0.08;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.06 - i*0.02, t0 + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.5);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + 3);
  });
}
function playDecohereSignature() {
  if (!audioCtx) return;
  [288, 192, 144].forEach((f, i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const t0 = audioCtx.currentTime + i * 0.25;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.042 - i*0.01, t0 + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.5);
    o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + 5);
  });
}

// ── SCREEN TRANSITIONS ──
function showScreen(id, postCb) {
  const gh = document.getElementById('ghosts');
  if (gh) {
    if (id !== 's-collapse' && id !== 's-field') {
      gh.style.transition = 'none';
      gh.style.opacity = '0';
      gh.innerHTML = '';
    }
  }
  const next = document.getElementById(id);
  const current = document.querySelector('.screen.active');
  if (current === next) { if (postCb) postCb(); return; }

  const showNext = () => {
    next.style.opacity = '0';
    next.style.transition = 'none';
    next.classList.add('active');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      next.style.transition = 'opacity 0.8s ease';
      next.style.opacity = '1';
      setTimeout(() => {
        next.style.opacity = '';
        next.style.transition = '';
        if (postCb) postCb();
      }, 820);
    }));
  };

  if (current) {
    current.style.transition = 'opacity 0.65s ease';
    current.style.opacity = '0';
    setTimeout(() => {
      current.classList.remove('active');
      current.style.opacity = '';
      current.style.transition = '';
      setTimeout(showNext, 40);
    }, 660);
  } else {
    showNext();
  }
}

// ── SETTINGS PANEL ──
// [UX5] Swipe-down to close settings panel
(function initSettingsSwipe() {
  const panel = document.getElementById('settings-panel');
  if (!panel) return;
  let startY = 0, isDragging = false;

  panel.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    isDragging = false;
  }, { passive: true });

  panel.addEventListener('touchmove', e => {
    const dy = e.touches[0].clientY - startY;
    if (dy > 8) {
      isDragging = true;
      const clampedDy = Math.max(0, dy);
      panel.style.transition = 'none';
      panel.style.transform = `translateY(${clampedDy}px)`;
    }
  }, { passive: true });

  panel.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - startY;
    panel.style.transition = '';
    panel.style.transform = '';
    if (isDragging && dy > 80) {
      closeSettings();
    }
    isDragging = false;
  });
})();

function toggleSettings() {
  const panel = document.getElementById('settings-panel');
  if (!panel) return;
  if (panel.classList.contains('open')) closeSettings();
  else openSettings();
}
function openSettings() {
  const panel = document.getElementById('settings-panel');
  if (!panel) return;
  updateSettingsToggles();
  panel.classList.add('open');
  const backdrop = document.getElementById('settings-backdrop');
  if (backdrop) backdrop.classList.add('open');
}
function closeSettings() {
  const panel = document.getElementById('settings-panel');
  if (panel) panel.classList.remove('open');
  const backdrop = document.getElementById('settings-backdrop');
  if (backdrop) backdrop.classList.remove('open');
}
function updateSettingsToggles() {
  const audioToggle = document.getElementById('st-audio');
  const fontToggle = document.getElementById('st-font');
  const langToggle = document.getElementById('st-lang');
  if (audioToggle) audioToggle.classList.toggle('active', audioEnabled);
  if (fontToggle) fontToggle.classList.toggle('active', fontLarge);
  if (langToggle) langToggle.textContent = lang === 'en' ? 'EN' : 'ES';
  const apiKey = localStorage.getItem('field_api_key') || '';
  const apiInput = document.getElementById('st-api-input');
  const apiStatus = document.getElementById('st-api-status');
  if (apiInput) apiInput.value = apiKey ? '••••••••••••••••••••••••' : '';
  if (apiInput) apiInput.placeholder = apiKey ? '' : 'sk-ant-...';
  if (apiStatus) apiStatus.textContent = apiKey ? 'key saved ·' : 'no key';
  if (apiStatus) apiStatus.style.color = apiKey ? 'rgba(201,169,110,.5)' : 'rgba(240,230,208,.2)';
}
function saveApiKey() {
  const input = document.getElementById('st-api-input');
  if (!input) return;
  const val = input.value.trim();
  if (val && val !== '••••••••••••••••••••••••') {
    localStorage.setItem('field_api_key', val);
  }
  updateSettingsToggles();
  input.value = '';
  input.placeholder = 'saved';
  setTimeout(() => { input.placeholder = ''; updateSettingsToggles(); }, 1500);
}
function clearApiKey() {
  localStorage.removeItem('field_api_key');
  updateSettingsToggles();
}
function settingsToggleAudio() {
  audioEnabled = !audioEnabled;
  if (audioEnabled) tryDrone();
  else fadeDrone(true, 0.8);
  updateSettingsToggles();
}
function settingsToggleFont() {
  fontLarge = !fontLarge;
  localStorage.setItem('field_font_large', fontLarge ? '1' : '0');
  document.body.classList.toggle('fs-large', fontLarge);
  updateSettingsToggles();
}
function settingsToggleLang() {
  lang = lang === 'en' ? 'es' : 'en';
  localStorage.setItem('field_lang', lang);
  applyLang();
  updateSettingsToggles();
}

// ── LANG ──
function toggleLang() {
  lang = lang === 'en' ? 'es' : 'en';
  localStorage.setItem('field_lang', lang);
  applyLang();
}
function applyLang() {
  const t = TRANSLATIONS[lang];
  document.getElementById('homeFieldSub').textContent = t.fieldSub;
  document.getElementById('mvObserveLabel').textContent = t.observeLabel;
  document.getElementById('mvCollapseLabel').textContent = t.collapseLabel;
  document.getElementById('mvDecohereLabel').textContent = t.decohere_label;
  document.getElementById('mvObserveHint').textContent = t.observeHint;
  document.getElementById('mvCollapseHint').textContent = t.collapseHint;
  document.getElementById('mvDecohereHint').textContent = t.decohereHint;
  document.getElementById('retBtn').textContent = t.retBtn;
  document.getElementById('decRetBtn').textContent = t.decRetBtn;
  document.getElementById('decAgainBtn').textContent = t.decAgainBtn;
  document.getElementById('obsCohWord').textContent = t.obsCoherenceWord;
  document.getElementById('obsCohLine').innerHTML = t.obsCoherenceLine.replace(/\n/g,'<br>');
  document.getElementById('obsCohTap').textContent = t.obsCoherenceTap;
  document.getElementById('revisitBtn').textContent = 'revisit introduction';
  const ltb = document.getElementById('langToggleBtn');
  if (ltb) ltb.textContent = lang === 'en' ? 'ES' : 'EN';
  updateHomeCount();
}
function updateHomeCount() {
  const n = parseInt(localStorage.getItem('field_obs')||'0');
  const t = TRANSLATIONS[lang];
  const el = document.getElementById('homeCount');
  if (!el) return;

  // Streak tracking — store last visit date
  const today = new Date().toDateString();
  const lastVisit = localStorage.getItem('field_last_visit');
  const streakRaw = parseInt(localStorage.getItem('field_streak')||'0');
  let streak = streakRaw;
  if (lastVisit !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    streak = (lastVisit === yesterday) ? streakRaw + 1 : 1;
    localStorage.setItem('field_streak', streak);
    localStorage.setItem('field_last_visit', today);
  }

  if (n > 0) {
    let text = t.obsCount(n);
    if (streak >= 2) text += `  ·  ${streak}${lang==='en'?' days':' días'}`;
    el.textContent = text;
  } else {
    el.textContent = '';
  }
}

// ── HOME ──
function clearGhosts() {
  const gh = document.getElementById('ghosts');
  if (gh) { gh.style.transition = 'opacity 0.4s ease'; gh.style.opacity = '0';
    setTimeout(() => { gh.innerHTML = ''; gh.style.transition = ''; }, 450); }
}
function goHome() {
  closeSettings();
  const cameFromDecohere = currentMode === 'decohere-end' || currentMode === 'decohere';
  currentMode = 'home';
  clearAllBreath(); clearObserver(); clearAllDec();
  clearGhosts();
  restoreCircadianPalette(); // restore from any movement-specific palette
  fadeDrone(true, 1.5);
  particlesHidden = false; collapseStage = 0; breathRunning = false; bgDimTarget = 1;
  isTransitioning = false; // [TECH3] reset on return home
  document.querySelectorAll('.cp-stage').forEach(s => { s.classList.remove('on'); s.style.cssText = ''; });
  document.getElementById('backBtn').style.opacity = '0';
  document.getElementById('backBtn').style.pointerEvents = 'none';
  document.querySelectorAll('.al').forEach(a => a.classList.remove('on'));
  spParticles.forEach(p => { p._flickering = false; }); // [TECH2]
  spParticles = []; particleVisible = false;

  // Clear storm auto-exit timer
  if (stormAutoExitTimer) { clearTimeout(stormAutoExitTimer); stormAutoExitTimer = null; }

  showScreen('s-home', () => {
    document.querySelectorAll('.al').forEach(a => a.classList.add('on'));
    if (cameFromDecohere) {
      setTimeout(() => {
        spParticles = Array.from({length:12}, (_,i) => new SpParticle(i,12));
        spParticles.forEach(p => {
          p._flickering = false;
          p.x = innerWidth/2 + (Math.random()-0.5)*30;
          p.y = innerHeight/2 + (Math.random()-0.5)*30;
          p.targetAlpha = 0;
          p.targetClarity = 0;
        });
        setTimeout(() => {
          spParticles.forEach(p => { p.targetAlpha = 0.42+Math.random()*0.22; });
        }, 300);
        // Pulse movement glyphs once — gentle acknowledgement
        setTimeout(() => {
          document.querySelectorAll('.movement').forEach((m, i) => {
            setTimeout(() => {
              m.classList.add('lit');
              setTimeout(() => m.classList.remove('lit'), 1200);
            }, i * 180);
          });
        }, 1800);
      }, 100);
    } else {
      setTimeout(() => { initSpParticles(12); tryDrone(); }, 200);
    }
    tryDrone();
  });
  updateHomeCount();
  document.querySelectorAll('.movement').forEach(m => m.classList.remove('lit'));

  // Guided entry hint — show for users who haven't done Collapse yet
  const hintEl = document.getElementById('guided-hint');
  const collapseCount = parseInt(localStorage.getItem('field_obs')||'0');
  if (hintEl) {
    const t = lang === 'en';
    if (collapseCount === 0) {
      hintEl.textContent = t ? 'new here? · begin with ↑' : '¿nuevo aquí? · empieza con ↑';
      setTimeout(() => { hintEl.style.opacity = '1'; }, 1800);
    } else {
      hintEl.style.opacity = '0';
    }
  }

  // Returning user whisper — quiet continuity, no gamification
  if (collapseCount > 0) {
    const whisperEl = document.createElement('div');
    whisperEl.style.cssText = `position:fixed;bottom:clamp(96px,18vw,128px);left:50%;
      transform:translateX(-50%);font-size:clamp(10px,2.5vw,12px);
      letter-spacing:.22em;text-transform:uppercase;
      color:rgba(240,220,180,.22);pointer-events:none;z-index:2;
      opacity:0;transition:opacity 2s ease;white-space:nowrap;`;
    // Days since first use (approximate via session count)
    const sessionLabel = collapseCount === 1
      ? (lang === 'en' ? 'first return' : 'primer retorno')
      : (lang === 'en' ? `session ${collapseCount + 1}` : `sesión ${collapseCount + 1}`);
    whisperEl.textContent = sessionLabel;
    document.body.appendChild(whisperEl);
    setTimeout(() => { whisperEl.style.opacity = '1'; }, 2800);
    setTimeout(() => { whisperEl.style.opacity = '0'; }, 7000);
    setTimeout(() => { whisperEl.remove(); }, 9000);
  }
  setTimeout(() => {
    const obs = parseInt(localStorage.getItem('field_obs')||'0');
    const dec = parseInt(localStorage.getItem('field_obs_decohere')||'0');
    const obv = parseInt(localStorage.getItem('field_obs_observe')||'0');
    const max = Math.max(obs, dec, obv);
    if (max === 0) return;
    const mvId = max === obs ? 'mv-collapse' : max === dec ? 'mv-decohere' : 'mv-observe';
    const el = document.getElementById(mvId);
    if (el) el.classList.add('lit');
    if (cameFromDecohere) {
      const decEl = document.getElementById('mv-decohere');
      if (decEl) {
        decEl.classList.add('just-released');
        setTimeout(() => { if (decEl) decEl.classList.remove('just-released'); }, 180000);
      }
    }
  }, 800);
}
function initSpParticles(n) {
  spParticles = Array.from({length:n}, (_,i) => new SpParticle(i,n));
  const isHome = currentMode === 'home';
  spParticles.forEach(p => {
    p._flickering = false; // [TECH2]
    p.targetAlpha = isHome ? (0.42+Math.random()*0.22) : (0.4+Math.random()*0.3);
    p.targetClarity = 0;
  });
}
function showBackBtn() {
  const btn = document.getElementById('backBtn');
  btn.style.opacity = '1';
  btn.style.pointerEvents = 'all';
  btn.onclick = () => { if(audioCtx) playBackNav(); goHome(); };
}

// ══════════════════════════════════════
// OBSERVE MOVEMENT
// ══════════════════════════════════════

const NOTE_SENSES = {
  en: [
    {key:'seeing', label:'seeing', glyph:'◌'},
    {key:'hearing', label:'hearing', glyph:'~'},
    {key:'body', label:'body', glyph:'◎'},
    {key:'mind', label:'mind', glyph:'◉'},
    {key:'taste', label:'taste', glyph:'·'},
    {key:'smell', label:'smell', glyph:'˚'}
  ],
  es: [
    {key:'seeing', label:'ver', glyph:'◌'},
    {key:'hearing', label:'oír', glyph:'~'},
    {key:'body', label:'cuerpo', glyph:'◎'},
    {key:'mind', label:'mente', glyph:'◉'},
    {key:'taste', label:'gusto', glyph:'·'},
    {key:'smell', label:'olor', glyph:'˚'}
  ]
};
const NOTE_TONES = {
  en: [
    {key:'pleasant',  label:'+', word:'pleasant',   color:'rgba(201,169,110,', border:'rgba(201,140, 60,'},
    {key:'unpleasant',label:'–', word:'unpleasant',  color:'rgba(110,150,201,', border:'rgba( 80,120,200,'},
    {key:'neutral',   label:'○', word:'neutral',     color:'rgba(180,175,165,', border:'rgba(160,155,145,'}
  ],
  es: [
    {key:'pleasant',  label:'+', word:'agradable',   color:'rgba(201,169,110,', border:'rgba(201,140, 60,'},
    {key:'unpleasant',label:'–', word:'desagradable', color:'rgba(110,150,201,', border:'rgba( 80,120,200,'},
    {key:'neutral',   label:'○', word:'neutro',       color:'rgba(180,175,165,', border:'rgba(160,155,145,'}
  ]
};
const STORM_WORDS = {
  en: ['changing','passing','not self','empty','thinking','tightening','sound','pressure'],
  es: ['cambiando','pasando','no yo','vacío','pensando','tensión','sonido','presión']
};

function buildObsScreen() {
  const t = lang === 'en';
  const screen = document.getElementById('s-observe');

  if (obsMode === 'noting') {
    screen.innerHTML = `
      <div class="observe-alt-wrap">
        <div class="observe-alt-title">${t?'noting':'notar'}</div>
        <div id="obs-timer-noting" style="font-size:clamp(14px,3.5vw,17px);letter-spacing:.14em;
          color:rgba(201,169,110,.62);font-weight:300;min-height:22px;"></div>
        <div id="stormWord" class="storm-word"></div>
        <div id="noteCounter" class="note-counter">${t?'notes':'notas'} · 0</div>
        <div id="senseRow" class="sense-row"></div>
        <div class="observe-alt-hint" style="font-size:var(--fl);">${t?'sense · tone':'sentido · tono'}</div>
        <div id="toneRow" class="tone-row" style="opacity:.35;pointer-events:none;"></div>
        <div id="noting-progress" style="display:flex;gap:6px;justify-content:center;margin-top:8px;"></div>
      </div>`;

    const prog = document.getElementById('noting-progress');
    const target = obsStorm ? 10 : 7;
    for (let i = 0; i < target; i++) {
      const d = document.createElement('div');
      d.className = 'mdot'; d.id = 'ndot' + i;
      prog.appendChild(d);
    }

    const senseRow = document.getElementById('senseRow');
    NOTE_SENSES[lang].forEach(s => {
      const b = document.createElement('button');
      b.className = 'sense-chip';
      b.innerHTML = `<span style="display:block;font-size:18px;opacity:.7;margin-bottom:4px;">${s.glyph}</span>${s.label}`;
      b.addEventListener('click', () => chooseNoteSense(s.key, b));
      senseRow.appendChild(b);
    });
    const toneRow = document.getElementById('toneRow');
    NOTE_TONES[lang].forEach(tone => {
      const b = document.createElement('button');
      b.className = 'tone-chip';
      b.dataset.toneKey = tone.key;
      b.innerHTML = `<span class="tone-chip-symbol">${tone.label}</span><span class="tone-chip-word">${tone.word}</span>`;
      b.style.setProperty('--tone-color', tone.color);
      b.style.setProperty('--tone-border', tone.border);
      b.addEventListener('click', () => chooseNoteTone(tone.key, b));
      toneRow.appendChild(b);
    });

    const stormLink = document.createElement('div');
    stormLink.style.cssText = 'margin-top:24px;font-size:clamp(11px,2.8vw,13px);letter-spacing:.18em;color:rgba(240,204,136,.58);cursor:pointer;padding:8px 0;';
    stormLink.textContent = lang === 'en' ? 'enter storm' : 'entrar tormenta';
    stormLink.addEventListener('click', () => { if(audioCtx) playTap(); clearObserver(); startStormScreen(); });
    stormLink.addEventListener('touchend', e => { e.preventDefault(); if(audioCtx) playTap(); clearObserver(); startStormScreen(); });

    // Voice noting button — only if Web Speech API available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const voiceWrap = document.createElement('div');
      voiceWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;margin-top:4px;';

      const micBtn = document.createElement('button');
      micBtn.id = 'mic-btn';
      micBtn.innerHTML = '&#127908;';
      micBtn.style.cssText = 'background:none;border:1px solid rgba(201,169,110,.18);border-radius:50%;' +
        'width:52px;height:52px;font-size:22px;color:rgba(201,169,110,.45);cursor:pointer;' +
        '-webkit-tap-highlight-color:transparent;transition:all .4s ease;display:flex;' +
        'align-items:center;justify-content:center;line-height:1;';
      micBtn.title = t ? 'voice note' : 'nota de voz';

      const voiceLabel = document.createElement('div');
      voiceLabel.id = 'voice-label';
      voiceLabel.style.cssText = 'font-size:clamp(10px,2.5vw,12px);letter-spacing:.14em;color:rgba(201,169,110,.60);';
      voiceLabel.textContent = t ? 'voice' : 'voz';

      const voiceTranscriptEl = document.createElement('div');
      voiceTranscriptEl.id = 'voice-transcript';
      voiceTranscriptEl.style.cssText = 'font-size:clamp(18px,5vw,24px);letter-spacing:.04em;' +
        'color:rgba(240,230,208,.68);font-style:italic;min-height:22px;max-width:280px;' +
        'text-align:center;line-height:1.5;opacity:0;transition:opacity .6s ease;';

      micBtn.addEventListener('click', () => toggleVoiceNoting(micBtn, voiceTranscriptEl));
      micBtn.addEventListener('touchend', e => { e.preventDefault(); toggleVoiceNoting(micBtn, voiceTranscriptEl); });

      voiceWrap.appendChild(micBtn);
      voiceWrap.appendChild(voiceLabel);
      voiceWrap.appendChild(voiceTranscriptEl);
      document.querySelector('.observe-alt-wrap').appendChild(voiceWrap);
    }

    document.querySelector('.observe-alt-wrap').appendChild(stormLink);
    return;
  }

  // DRIFT / KASINA mode
  const modeHint = obsMode === 'kasina'
    ? (t ? 'One point.<br>Hold it gently.' : 'Un punto.<br>Sostenlo suavemente.')
    : (t ? 'One particle.<br>Just watch it.' : 'Una partícula.<br>Solo obsérvala.');
  const hintTop = obsMode === 'kasina' ? '62%' : '42%';
  screen.innerHTML = `
    <div id="obs-hint-txt" style="position:fixed;top:${hintTop};left:50%;transform:translate(-50%,-50%);
      text-align:center;opacity:0;transition:opacity 1.5s ease;z-index:20;pointer-events:none;">
      <div style="font-size:clamp(22px,6vw,30px);font-weight:300;letter-spacing:.12em;
        color:rgba(201,169,110,.5);margin-bottom:18px;">${obsMode==='kasina'?'·':'◎'}</div>
      <div style="font-size:clamp(15px,3.8vw,19px);letter-spacing:.10em;
        color:rgba(240,230,208,.5);line-height:1.9;">${modeHint}</div>
    </div>
    <div id="clarity-ring"></div>
    <div id="obs-timer" style="position:fixed;top:72px;left:50%;transform:translateX(-50%);
      font-size:clamp(14px,3.5vw,17px);letter-spacing:.14em;color:rgba(201,169,110,.3);
      z-index:20;opacity:0;transition:opacity 1.5s ease;font-weight:300;pointer-events:none;"></div>
    <div id="obs-signals" style="position:fixed;bottom:clamp(52px,12vw,72px);left:50%;
      transform:translateX(-50%);display:flex;gap:20px;align-items:center;
      opacity:0;transition:opacity 1.5s ease;z-index:20;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div class="sig-dot" id="sig-still"></div>
        <div class="sig-label">${t?'still':'quieto'}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div class="sig-dot" id="sig-present"></div>
        <div class="sig-label">${t?'present':'presente'}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div class="sig-dot" id="sig-affirm"></div>
        <div class="sig-label">${t?'here':'aquí'}</div>
      </div>
      <button id="affirmBtn" onclick="doAffirm()"
        style="background:none;border:1px solid rgba(201,169,110,.55);border-radius:30px;
        padding:8px 18px;cursor:pointer;margin-left:8px;
        -webkit-tap-highlight-color:transparent;touch-action:manipulation;
        font-family:inherit;font-size:clamp(10px,2.5vw,12px);letter-spacing:.16em;
        color:rgba(201,169,110,.45);transition:border-color .3s ease,color .3s ease;
        min-height:36px;white-space:nowrap;">
        ${t?'i am here':'estoy aquí'}
      </button>
    </div>
    <div id="meter" style="position:fixed;bottom:clamp(112px,24vw,140px);left:50%;
      transform:translateX(-50%);display:flex;gap:6px;align-items:center;
      z-index:20;opacity:0;transition:opacity 1.5s ease;"></div>
    <div id="scatter-text" style="position:fixed;top:36%;left:50%;transform:translateX(-50%);
      font-size:clamp(13px,3.2vw,16px);letter-spacing:.14em;color:rgba(240,230,208,.45);
      white-space:nowrap;opacity:0;transition:opacity 1s ease;z-index:20;pointer-events:none;"></div>
  `;
  buildObsMeter();
  setTimeout(() => {
    const timerEl = document.getElementById('obs-timer');
    if (timerEl) { timerEl.style.transition = 'opacity 1.5s ease'; timerEl.style.opacity = '1'; }
  }, 1000);
}

function buildObsMeter() {
  const m = document.getElementById('meter'); if (!m) return;
  m.innerHTML = '';
  for (let i = 0; i < METER_DOTS; i++) {
    const d = document.createElement('div'); d.className = 'mdot'; d.id = 'mdot'+i; m.appendChild(d);
  }
}

function updateObsMeter() {
  const progress = Math.min((attentionSec + affirmBonus) / COHERENCE_SEC, 1);
  const lit = Math.floor(progress * METER_DOTS);
  for (let i = 0; i < METER_DOTS; i++) {
    const d = document.getElementById('mdot'+i);
    if (d) d.classList.toggle('lit', i < lit);
  }
  clarityLevel = Math.min(progress, 1);
  updateClarityRing();
  updateSignalDots();
}

function updateSignalDots() {
  const ss = document.getElementById('sig-still');
  const sp = document.getElementById('sig-present');
  const sa = document.getElementById('sig-affirm');
  if (ss) ss.style.background = isStill ? 'var(--gold)' : 'rgba(201,169,110,.18)';
  if (ss) ss.style.boxShadow = isStill ? '0 0 8px rgba(201,169,110,.6)' : 'none';
  const isPresent = clarityLevel > 0.05 && isStill;
  if (sp) sp.style.background = isPresent ? 'var(--gold)' : 'rgba(201,169,110,.18)';
  if (sp) sp.style.boxShadow = isPresent ? '0 0 8px rgba(201,169,110,.6)' : 'none';
  const recentAffirm = Date.now() - lastAffirmTime < 4000;
  if (sa) sa.style.background = recentAffirm ? 'rgba(240,204,136,.9)' : 'rgba(201,169,110,.18)';
  if (sa) sa.style.boxShadow = recentAffirm ? '0 0 12px rgba(240,204,136,.7)' : 'none';
}

function updateClarityRing() {
  const ring = document.getElementById('clarity-ring'); if (!ring) return;
  const c = clarityLevel;
  if (c < 0.05) { ring.style.borderColor = 'rgba(201,169,110,0)'; ring.style.boxShadow = 'none'; return; }
  const s = 100 + c*30, m = -(50+c*15);
  ring.style.width = s+'px'; ring.style.height = s+'px';
  ring.style.marginLeft = m+'px'; ring.style.marginTop = m+'px';
  ring.style.borderColor = `rgba(201,169,110,${(c*0.3).toFixed(3)})`;
  ring.style.boxShadow = `0 0 ${20+c*40}px rgba(201,169,110,${(c*0.15).toFixed(3)})`;
}

function startObserve() {
  if (navigator.vibrate) navigator.vibrate(18);
  currentMode = 'observe';
  showBackBtn(); // [UX1] shown immediately, before any field activation
  document.getElementById('backBtn').onclick = () => goHome();
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  playObserveSignature();
  const ring = document.getElementById('clarity-ring');
  if (ring) ring.style.display = 'block';
  isCoherent = false; fieldActive = false; attentionSec = 0;
  affirmBonus = 0; clarityLevel = 0; isStill = true; lastAffirmTime = 0;
  if (obsMode === 'kasina') {
    kasinaParticle = new KasinaParticle(); kasinaParticle.targetAlpha = 0;
    observeParticle = null;
  } else {
    observeParticle = new ObsParticle(); observeParticle.targetAlpha = 0;
    kasinaParticle = null;
  }
  particleVisible = true;
  buildObsSetupScreen();
  showScreen('s-observe');
}

function buildObsSetupScreen() {
  const t = lang === 'en';
  const screen = document.getElementById('s-observe');
  screen.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.id = 'obs-setup';
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'gap:clamp(28px,7vw,44px);padding:clamp(24px,6vw,48px);width:100%;max-width:400px;' +
    'margin:auto;opacity:0;transition:opacity 1.2s ease;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:clamp(14px,3.5vw,17px);letter-spacing:.18em;color:rgba(201,169,110,.45);text-transform:uppercase;';
  title.textContent = t ? 'observe' : 'observar';
  wrap.appendChild(title);

  // ── Particle mode ──
  const modeSection = document.createElement('div');
  modeSection.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;';
  const modeLabel = document.createElement('div');
  modeLabel.style.cssText = 'font-size:clamp(12px,3vw,15px);letter-spacing:.14em;color:rgba(240,230,208,.65);';
  modeLabel.textContent = t ? 'particle' : 'partícula';
  modeSection.appendChild(modeLabel);
  const modeRow = document.createElement('div');
  modeRow.style.cssText = 'display:flex;gap:12px;width:100%;max-width:320px;';

  const makeModeBtn = (id, label, mode) => {
    const b = document.createElement('button');
    b.id = id;
    b.style.cssText = 'flex:1;padding:20px 8px;background:none;border:1px solid rgba(201,169,110,.18);' +
      'border-radius:12px;color:rgba(240,230,208,.4);font-family:inherit;' +
      'font-size:clamp(15px,3.8vw,18px);letter-spacing:.08em;cursor:pointer;' +
      '-webkit-tap-highlight-color:transparent;transition:all .3s ease;min-height:64px;';
    b.textContent = label;
    b.addEventListener('click', () => setObsMode(mode));
    b.addEventListener('touchend', e => { e.preventDefault(); setObsMode(mode); });
    return b;
  };
  modeRow.appendChild(makeModeBtn('obs-mode-drift', t ? 'drift' : 'deriva', 'drift'));
  modeRow.appendChild(makeModeBtn('obs-mode-kasina', 'kasina', 'kasina'));
  modeRow.appendChild(makeModeBtn('obs-mode-noting', t ? 'noting' : 'notar', 'noting'));
  modeSection.appendChild(modeRow);
  wrap.appendChild(modeSection);

  // ── Storm style (noting only) ──
  const stormWrap = document.createElement('div');
  stormWrap.id = 'stormWrap';
  stormWrap.style.cssText = 'display:none;flex-direction:column;align-items:center;gap:12px;width:100%;';
  const stormLabel = document.createElement('div');
  stormLabel.style.cssText = 'font-size:clamp(12px,3vw,15px);letter-spacing:.14em;color:rgba(240,230,208,.65);';
  stormLabel.textContent = t ? 'style' : 'estilo';
  const stormRow = document.createElement('div');
  stormRow.style.cssText = 'display:flex;gap:12px;width:100%;max-width:320px;';
  const makeStormBtn = (id, label, on) => {
    const b = document.createElement('button');
    b.id = id;
    b.style.cssText = 'flex:1;padding:16px 8px;background:none;border:1px solid rgba(201,169,110,.18);' +
      'border-radius:12px;color:rgba(240,230,208,.4);font-family:inherit;' +
      'font-size:clamp(14px,3.4vw,17px);letter-spacing:.08em;cursor:pointer;' +
      '-webkit-tap-highlight-color:transparent;transition:all .3s ease;min-height:54px;';
    b.textContent = label;
    b.addEventListener('click', () => setStormMode(on));
    b.addEventListener('touchend', e => { e.preventDefault(); setStormMode(on); });
    return b;
  };
  stormRow.appendChild(makeStormBtn('obs-storm-calm', t ? 'normal' : 'normal', false));
  stormRow.appendChild(makeStormBtn('obs-storm-storm', t ? 'storm' : 'tormenta', true));
  stormWrap.appendChild(stormLabel);
  stormWrap.appendChild(stormRow);
  wrap.appendChild(stormWrap);

  // ── Duration ──
  // [UX6] 1m option hidden for drift/kasina modes; only showing for noting
  const timeSection = document.createElement('div');
  timeSection.id = 'obs-time-section';
  timeSection.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;';
  const timeLabel = document.createElement('div');
  timeLabel.style.cssText = 'font-size:clamp(12px,3vw,15px);letter-spacing:.14em;color:rgba(240,230,208,.65);';
  timeLabel.textContent = t ? 'duration' : 'duración';
  timeSection.appendChild(timeLabel);
  const timeRow = document.createElement('div');
  timeRow.id = 'obs-time-row';
  timeRow.style.cssText = 'display:flex;gap:10px;width:100%;max-width:320px;';
  [1, 5, 10].forEach(m => {
    const b = document.createElement('button');
    b.id = 'obs-time-' + m;
    b.style.cssText = 'flex:1;padding:20px 6px;background:none;border:1px solid rgba(201,169,110,.18);' +
      'border-radius:12px;color:rgba(240,230,208,.4);font-family:inherit;' +
      'font-size:clamp(14px,3.5vw,17px);letter-spacing:.06em;cursor:pointer;' +
      '-webkit-tap-highlight-color:transparent;transition:all .3s ease;min-height:64px;';
    b.textContent = m + 'm';
    if (m === 1) b.dataset.notingOnly = '1';
    b.addEventListener('click', () => setObsTime(m));
    b.addEventListener('touchend', e => { e.preventDefault(); setObsTime(m); });
    timeRow.appendChild(b);
  });
  timeSection.appendChild(timeRow);
  wrap.appendChild(timeSection);

  // ── Enter ──
  const enterBtn = document.createElement('button');
  enterBtn.style.cssText = 'background:none;border:1px solid rgba(201,169,110,.38);border-radius:12px;font-family:inherit;' +
    'font-size:clamp(16px,4vw,20px);letter-spacing:.22em;color:rgba(201,169,110,.85);' +
    'cursor:pointer;padding:20px 56px;-webkit-tap-highlight-color:transparent;transition:all .4s ease;min-height:64px;';
  enterBtn.textContent = t ? 'enter' : 'entrar';
  enterBtn.addEventListener('click', () => { if(audioCtx) playTap(); enterObserve(); });
  enterBtn.addEventListener('touchend', e => { e.preventDefault(); if(audioCtx) playTap(); enterObserve(); });
  wrap.appendChild(enterBtn);

  screen.appendChild(wrap);
  requestAnimationFrame(() => requestAnimationFrame(() => { wrap.style.opacity = '1'; }));
  setObsMode(obsMode);
  setObsTime(obsMinutes);
  setStormMode(obsStorm);
}

function updateDurationVisibility() {
  // [UX6] Show/hide 1m button based on mode
  const btn1m = document.getElementById('obs-time-1');
  if (!btn1m) return;
  const isNoting = obsMode === 'noting';
  btn1m.style.display = isNoting ? '' : 'none';
  // If 1m was selected and we're switching away from noting, bump to 5m
  if (!isNoting && obsMinutes === 1) {
    setObsTime(5);
  }
}

function setObsMode(mode) {
  obsMode = mode;
  const ids = ['drift','kasina','noting'];
  ids.forEach(id => {
    const el = document.getElementById('obs-mode-'+id);
    if (el) {
      el.style.borderColor = id===mode ? 'rgba(201,169,110,.7)' : 'rgba(201,169,110,.18)';
      el.style.color = id===mode ? 'rgba(240,204,136,.9)' : 'rgba(240,230,208,.45)';
    }
  });
  const stormWrap = document.getElementById('stormWrap');
  if (stormWrap) stormWrap.style.display = mode === 'noting' ? 'flex' : 'none';
  updateDurationVisibility(); // [UX6]
  if (currentMode === 'observe') {
    const curAlpha = (observeParticle ? observeParticle.alpha : 0) || (kasinaParticle ? kasinaParticle.alpha : 0);
    if (mode === 'kasina' && !kasinaParticle) {
      kasinaParticle = new KasinaParticle();
      kasinaParticle.alpha = curAlpha; kasinaParticle.targetAlpha = curAlpha;
      observeParticle = null;
    } else if ((mode === 'drift' || mode === 'noting') && !observeParticle) {
      observeParticle = new ObsParticle();
      observeParticle.alpha = curAlpha; observeParticle.targetAlpha = curAlpha;
      kasinaParticle = null;
    }
  }
}

function setStormMode(on) {
  obsStorm = !!on;
  const calm = document.getElementById('obs-storm-calm');
  const storm = document.getElementById('obs-storm-storm');
  if (calm) {
    calm.style.borderColor = !obsStorm ? 'rgba(201,169,110,.7)' : 'rgba(201,169,110,.18)';
    calm.style.color = !obsStorm ? 'rgba(240,204,136,.9)' : 'rgba(240,230,208,.45)';
  }
  if (storm) {
    storm.style.borderColor = obsStorm ? 'rgba(201,169,110,.7)' : 'rgba(201,169,110,.18)';
    storm.style.color = obsStorm ? 'rgba(240,204,136,.9)' : 'rgba(240,230,208,.45)';
  }
}

function setObsTime(mins) {
  obsMinutes = mins;
  [1,5,10].forEach(m => {
    const btn = document.getElementById('obs-time-'+m);
    if (!btn) return;
    btn.style.borderColor = m===mins ? 'rgba(201,169,110,.7)' : 'rgba(201,169,110,.18)';
    btn.style.color = m===mins ? 'rgba(240,204,136,.9)' : 'rgba(240,230,208,.45)';
  });
}

function enterObserve() {
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  fadeDrone(true, 1); spParticles = [];
  // [UX1] Back button always visible — set immediately and never removed
  showBackBtn();
  document.getElementById('backBtn').onclick = () => goHome();
  const setup = document.getElementById('obs-setup');
  if (setup) { setup.style.transition = 'opacity 0.8s ease'; setup.style.opacity = '0'; }

  setTimeout(() => {
    if (obsMode === 'noting') {
      noteCount = 0; noteSense = ''; clarityLevel = 0; fieldActive = true; isCoherent = false;
      observeParticle = new ObsParticle();
      observeParticle.cx = 0.5; observeParticle.cy = 0.82;
      observeParticle.x = innerWidth * 0.5; observeParticle.y = innerHeight * 0.82;
      observeParticle.targetAlpha = 0.9;
      kasinaParticle = null; particleVisible = true;

      if (obsStorm) {
        // Storm + noting — go straight to storm screen
        buildObsScreen();
        obsTimerEnd = Date.now() + obsMinutes * 60 * 1000;
        startObsTimer();
        startStormScreen();
        return;
      }
    } else {
      if (obsMode === 'kasina' && kasinaParticle) { kasinaParticle.targetAlpha = 1; }
      else if (observeParticle) { observeParticle.targetAlpha = 0.9; }
    }

    buildObsScreen();
    // [UX1] Re-assert after buildObsScreen() — innerHTML rebuild doesn't touch chrome
    showBackBtn();
    document.getElementById('backBtn').onclick = () => goHome();

    if (audioCtx && !droneNodes.length && currentMode === 'observe') {
      try {
        [180, 360, 270].forEach((f,i) => {
          const o = audioCtx.createOscillator(), g = audioCtx.createGain();
          o.type = 'sine'; o.frequency.value = f;
          g.gain.setValueAtTime(0, audioCtx.currentTime);
          g.gain.linearRampToValueAtTime(0.015-i*0.004, audioCtx.currentTime+3);
          o.connect(g); g.connect(audioCtx.destination); o.start();
          droneNodes.push({o, g, frequency: o.frequency});
        });
      } catch(e) { console.warn('obs drone:', e); }
    }

    obsTimerEnd = Date.now() + obsMinutes * 60 * 1000;

    if (obsMode === 'noting') {
      startObsTimer();
      startNotingStorm();
      // [UX1] Explicitly keep back button visible for noting sessions
      showBackBtn();
      document.getElementById('backBtn').onclick = () => goHome();
      return;
    }

    setTimeout(() => {
      const hint = document.getElementById('obs-hint-txt');
      if (hint) { hint.style.transition = 'opacity 1.5s ease'; hint.style.opacity = '1'; }
    }, 300);
    setTimeout(() => {
      const hint = document.getElementById('obs-hint-txt');
      if (hint) { hint.style.transition = 'opacity 1.5s ease'; hint.style.opacity = '0'; }
    }, 3500);

    setTimeout(() => {
      if (currentMode !== 'observe') return;
      fieldActive = true;
      startAttentionTimer();
      startMicroTones();
      startMotionCheck();
      startObsTimer();
      // [UX1] Re-assert back button after field activation — never hidden during countdown
      showBackBtn();
      document.getElementById('backBtn').onclick = () => goHome();
      const sigs = document.getElementById('obs-signals');
      const meter = document.getElementById('meter');
      if (sigs) { sigs.style.transition = 'opacity 1.5s ease'; sigs.style.opacity = '1'; }
      if (meter) { meter.style.transition = 'opacity 1.5s ease'; meter.style.opacity = '1'; }
    }, 4500);
  }, 900);
}

function startObsTimer() {
  clearInterval(obsTimerInterval);
  const target = obsStorm ? 10 : 7;
  obsTimerInterval = setInterval(() => {
    if (!fieldActive || isCoherent || currentMode !== 'observe') return;
    const remaining = obsTimerEnd - Date.now();

    if (obsMode === 'noting') {
      const timerEl = document.getElementById('obs-timer-noting');
      if (timerEl) {
        const secs = Math.max(0, Math.ceil(remaining / 1000));
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        timerEl.textContent = m + ':' + String(s).padStart(2, '0');
      }
      for (let i = 0; i < target; i++) {
        const d = document.getElementById('ndot' + i);
        if (d) d.classList.toggle('lit', i < noteCount);
      }
      if (remaining <= 0 || noteCount >= target) {
        clearInterval(obsTimerInterval);
        reachObsCoherence();
      }
      return;
    }

    const el = document.getElementById('obs-timer');
    if (el) {
      const secs = Math.max(0, Math.ceil(remaining / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      el.textContent = m + ':' + String(s).padStart(2, '0');
    }
    if (remaining <= 0) {
      clearInterval(obsTimerInterval);
      reachObsCoherence();
    }
  }, 1000);
}

function startAttentionTimer() {
  clearInterval(attentionTimer);
  attentionTimer = setInterval(() => {
    if (!fieldActive || isCoherent) return;
    if (isStill) attentionSec++;
    updateObsMeter();
    if (obsMinutes === 0 && attentionSec + affirmBonus >= COHERENCE_SEC) reachObsCoherence();
  }, 1000);
}

function startMicroTones() {
  clearInterval(microToneTimer);
  microToneTimer = setInterval(() => {
    if (!fieldActive || isCoherent || currentMode !== 'observe') return;
    if (obsMode === 'kasina') {
      // Kasina: very soft high shimmer pulsing with clarity
      if (!audioCtx) return;
      const shimmerFreq = 1296 + clarityLevel * 432;
      const os = audioCtx.createOscillator(), gs = audioCtx.createGain();
      os.type = 'sine'; os.frequency.value = shimmerFreq;
      const gain = 0.006 + clarityLevel * 0.012;
      gs.gain.setValueAtTime(0, audioCtx.currentTime);
      gs.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + 0.3);
      gs.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3);
      os.connect(gs); gs.connect(audioCtx.destination); os.start(); os.stop(audioCtx.currentTime + 3.5);
    } else {
      playMicroTone();
    }
  }, obsMode === 'kasina' ? 6000 : 12000);
}

function startMotionCheck() {
  clearInterval(motionCheckInterval);
  motionCheckInterval = setInterval(() => {
    if (currentMode !== 'observe') return;
    const timeSinceMotion = Date.now() - lastMotionTime;
    const wasStill = isStill;
    isStill = timeSinceMotion > 1800;
    if (!wasStill && isStill) {
      if (observeParticle) { observeParticle.cx = 0.5; observeParticle.cy = 0.5; }
    }
    updateSignalDots();
  }, 300);
}

function doAffirm() {
  if (!fieldActive || isCoherent) return;
  lastAffirmTime = Date.now();
  affirmBonus = Math.min(affirmBonus + 1.5, 12);
  playAffirmSound();
  if (navigator.vibrate) navigator.vibrate(18);
  const btn = document.getElementById('affirmBtn');
  if (btn) { btn.style.borderColor = 'rgba(201,169,110,.7)'; btn.style.color = 'rgba(240,210,140,.9)'; btn.style.boxShadow = '0 0 20px rgba(201,169,110,.3)'; }
  const ring = document.getElementById('clarity-ring');
  if (ring) { ring.style.boxShadow = `0 0 ${40+clarityLevel*60}px rgba(201,169,110,.4)`; }
  setTimeout(() => {
    if (btn) { btn.style.borderColor = ''; btn.style.color = ''; btn.style.boxShadow = ''; }
    if (ring) ring.style.boxShadow = '';
    updateSignalDots();
  }, 600);
  updateObsMeter();
  if (obsMinutes === 0 && attentionSec + affirmBonus >= COHERENCE_SEC) reachObsCoherence();
}

function obsScatter() {
  if (isCoherent || !fieldActive) return;
  if (observeParticle) observeParticle.scatter();
  playScatterSound();
  attentionSec = 0; affirmBonus = 0;
  updateObsMeter(); clarityLevel = 0;
  const st = document.getElementById('scatter-text');
  if (st) { st.textContent = TRANSLATIONS[lang].obsScatter; st.style.opacity = '1'; }
  clearTimeout(scatterTO);
  scatterTO = setTimeout(() => { if (st) st.style.opacity = '0'; }, 2500);
}

function reachObsCoherence() {
  clearStormTimer();
  isCoherent = true;
  clearInterval(attentionTimer); clearInterval(microToneTimer);
  clearInterval(motionCheckInterval); clearInterval(obsTimerInterval);
  playObsCoherenceTone(); fadeDrone(true, 3);

  ['obs-signals','meter','scatter-text','obs-hint-txt','obs-timer',
   'obs-timer-noting','noteCounter','senseRow','toneRow','noting-progress','stormWord'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.transition = 'opacity 1.5s ease'; el.style.opacity = '0'; }
  });
  const altWrap = document.querySelector('.observe-alt-wrap');
  if (altWrap) { altWrap.style.transition = 'opacity 1.5s ease'; altWrap.style.opacity = '0'; }

  const n = parseInt(localStorage.getItem('field_obs')||'0') + 1;
  localStorage.setItem('field_obs', n); totalObs = n;
  const no = parseInt(localStorage.getItem('field_obs_observe')||'0') + 1;
  localStorage.setItem('field_obs_observe', no);

  const isNoting = obsMode === 'noting';
  const cohWord = isNoting
    ? (lang === 'en' ? 'A W A R E N E S S' : 'C O N C I E N C I A')
    : TRANSLATIONS[lang].obsCoherenceWord;
  const cohLine = isNoting
    ? (lang === 'en'
        ? 'You named what was present.\nThe field received it.\nThat is the practice.'
        : 'Nombraste lo que estaba presente.\nEl campo lo recibió.\nEsa es la práctica.')
    : TRANSLATIONS[lang].obsCoherenceLine;

  setTimeout(() => {
    particleVisible = false;
    document.getElementById('obsCohWord').textContent = cohWord;
    document.getElementById('obsCohLine').innerHTML = cohLine.replace(/\n/g,'<br>');
    document.getElementById('obsCohTap').textContent = TRANSLATIONS[lang].obsCoherenceTap;
    showScreen('s-obs-coherence');
  }, 2200);
}

// ── VOICE NOTING ──
function toggleVoiceNoting(micBtn, transcriptEl) {
  if (voiceActive) {
    stopVoiceNoting(micBtn, transcriptEl);
  } else {
    startVoiceNoting(micBtn, transcriptEl);
  }
}

function startVoiceNoting(micBtn, transcriptEl) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = true;
  voiceRecognition.interimResults = true;
  voiceRecognition.lang = lang === 'es' ? 'es-ES' : 'en-US';

  voiceActive = true;
  micBtn.innerHTML = '&#9679;';
  micBtn.style.borderColor = 'rgba(201,169,110,.7)';
  micBtn.style.color = 'rgba(240,204,136,.9)';
  micBtn.style.boxShadow = '0 0 18px rgba(201,169,110,.3)';
  micBtn.style.animation = 'micPulse 1.4s ease-in-out infinite';

  const voiceLabel = document.getElementById('voice-label');
  if (voiceLabel) voiceLabel.textContent = lang === 'en' ? 'listening...' : 'escuchando...';

  let finalTranscript = '';
  let silenceTimer = null;

  voiceRecognition.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) { finalTranscript += t + ' '; }
      else { interim = t; }
    }
    const display = (finalTranscript + interim).trim();
    voiceTranscript = display;
    if (transcriptEl) {
      transcriptEl.textContent = display;
      transcriptEl.style.opacity = display ? '1' : '0';
    }
    // Auto-note after 2.4s silence
    clearTimeout(silenceTimer);
    if (finalTranscript.trim().length > 2) {
      silenceTimer = setTimeout(() => {
        if (voiceActive && finalTranscript.trim()) {
          autoNoteFromVoice(finalTranscript.trim());
          finalTranscript = '';
          if (transcriptEl) { transcriptEl.style.opacity = '0'; }
          setTimeout(() => { if (transcriptEl) transcriptEl.textContent = ''; }, 600);
        }
      }, 4000); // was 2400 — more time to breathe between notes
    }
  };

  voiceRecognition.onerror = () => stopVoiceNoting(micBtn, transcriptEl);
  voiceRecognition.onend = () => {
    // Auto-restart if still supposed to be active
    if (voiceActive) {
      try { voiceRecognition.start(); } catch(e) {}
    }
  };

  try { voiceRecognition.start(); } catch(e) { voiceActive = false; }
}

function stopVoiceNoting(micBtn, transcriptEl) {
  voiceActive = false;
  if (voiceRecognition) {
    try { voiceRecognition.stop(); } catch(e) {}
    voiceRecognition = null;
  }
  if (micBtn) {
    micBtn.innerHTML = '&#127908;';
    micBtn.style.borderColor = 'rgba(201,169,110,.18)';
    micBtn.style.color = 'rgba(201,169,110,.45)';
    micBtn.style.boxShadow = 'none';
    micBtn.style.animation = 'none';
  }
  const voiceLabel = document.getElementById('voice-label');
  if (voiceLabel) voiceLabel.textContent = lang === 'en' ? 'voice' : 'voz';
  if (transcriptEl) { transcriptEl.style.opacity = '0'; }
  voiceTranscript = '';
}

function autoNoteFromVoice(transcript) {
  // Map spoken words to sense + tone, or just increment as a mind/neutral note
  const lower = transcript.toLowerCase();
  let sense = 'mind';
  let tone = 'neutral';

  // Rough sense detection from keywords
  if (/see|look|light|dark|colour|color|shape|vision|saw/.test(lower)) sense = 'seeing';
  else if (/hear|sound|noise|voice|ring|tone|quiet/.test(lower)) sense = 'hearing';
  else if (/smell|scent|odour|aroma/.test(lower)) sense = 'smell';
  else if (/taste|bitter|sweet|sour/.test(lower)) sense = 'taste';
  else if (/feel|tight|heavy|light|pain|warm|cold|pressure|breath|chest|stomach|head|heart/.test(lower)) sense = 'body';

  // Rough tone detection
  const pleasantWords = /calm|peace|open|ease|gentle|warm|bright|soft|clear|good|nice|relax|free/;
  const unpleasantWords = /tight|heavy|pain|fear|worry|anxious|stuck|dark|hard|difficult|scared|angry|sad/;
  if (pleasantWords.test(lower)) tone = 'pleasant';
  else if (unpleasantWords.test(lower)) tone = 'unpleasant';

  // Show transcript briefly as confirmation
  const counter = document.getElementById('noteCounter');
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
    'font-size:clamp(20px,5.5vw,28px);letter-spacing:.1em;color:rgba(240,204,136,.85);' +
    'pointer-events:none;z-index:50;opacity:0;transition:opacity .5s ease;text-align:center;' +
    'font-style:italic;max-width:260px;line-height:1.5;';
  flash.textContent = transcript.length > 40 ? transcript.slice(0, 40) + '…' : transcript;
  document.body.appendChild(flash);
  requestAnimationFrame(() => { flash.style.opacity = '1'; });
  setTimeout(() => {
    flash.style.opacity = '0';
    setTimeout(() => flash.remove(), 600);
  }, 1800);

  // Trigger a virtual sense+tone note
  const fakeSenseBtn = document.querySelector(`.sense-chip`);
  chooseNoteSense(sense, null);
  setTimeout(() => {
    const fakeToneBtn = document.querySelector(`.tone-chip[data-tone-key="${tone}"]`);
    chooseNoteTone(tone, fakeToneBtn);
  }, 120);
}

function clearObserver() {
  if (voiceActive) stopVoiceNoting(null, null);
  clearInterval(attentionTimer); clearInterval(microToneTimer);
  clearInterval(motionCheckInterval); clearInterval(obsTimerInterval);
  fieldActive = false; isCoherent = false;
  particleVisible = false; attentionSec = 0; affirmBonus = 0; clarityLevel = 0;
  isStill = true; kasinaParticle = null;
  clearTimeout(scatterTO);
  const ring = document.getElementById('clarity-ring');
  if (ring) { ring.style.display = 'none'; ring.style.borderColor = 'rgba(201,169,110,0)'; ring.style.boxShadow = 'none'; }
}

// Noting helpers
function chooseNoteSense(key, el) {
  noteSense = key;
  if (audioCtx) playNoteSense(key); else { initAudio(); if(audioCtx) playNoteSense(key); }
  document.querySelectorAll('#senseRow .sense-chip').forEach(x => x.classList.remove('active'));
  if (el) el.classList.add('active');
  const toneRow = document.getElementById('toneRow');
  if (toneRow) { toneRow.style.opacity = '1'; toneRow.style.pointerEvents = 'all'; }
}
function chooseNoteTone(key, el) {
  if (!noteSense) return;
  noteCount += 1;
  const target = obsStorm ? 10 : 7;
  document.querySelectorAll('#toneRow .tone-chip').forEach(x => x.classList.remove('active'));
  if (el) el.classList.add('active');
  const counter = document.getElementById('noteCounter');
  if (counter) counter.textContent = (lang==='en'?'notes':'notas') + ' · ' + noteCount;
  for (let i = 0; i < target; i++) {
    const d = document.getElementById('ndot' + i);
    if (d) d.classList.toggle('lit', i < noteCount);
  }
  if (observeParticle) observeParticle.scatter();
  if (key === 'pleasant') playTonePleasant();
  else if (key === 'unpleasant') playToneUnpleasant();
  else playToneNeutral();
  pulseStormWord(noteSense + ' · ' + key);
  setTimeout(() => {
    document.querySelectorAll('#senseRow .sense-chip').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('#toneRow .tone-chip').forEach(x => x.classList.remove('active'));
    const toneRow = document.getElementById('toneRow');
    if (toneRow) { toneRow.style.opacity = '.35'; toneRow.style.pointerEvents = 'none'; }
    noteSense = '';
    if (noteCount >= target) {
      clearInterval(obsTimerInterval);
      reachObsCoherence();
    }
  }, 420);
}
function startNotingStorm() {
  clearStormTimer();
  if (!obsStorm) return;
  stormTimer = setInterval(() => {
    if (currentMode !== 'observe' || obsMode !== 'noting' || isCoherent) return;
    const words = STORM_WORDS[lang];
    const word = words[Math.floor(Math.random() * words.length)];
    pulseStormWord(word);
  }, 5500); // was 2600 — much slower
}
function clearStormTimer() {
  if (stormTimer) clearInterval(stormTimer);
  stormTimer = null;
}
function pulseStormWord(word) {
  const el = document.getElementById('stormWord');
  if (!el) return;
  el.textContent = word;
  el.style.opacity = '1';
  setTimeout(() => { if (el) el.style.opacity = '0'; }, 900);
}

// Device motion
if (window.DeviceMotionEvent) {
  window.addEventListener('devicemotion', e => {
    if (currentMode !== 'observe' || !fieldActive || isCoherent) return;
    const a = e.acceleration; if (!a) return;
    const mag = Math.sqrt((a.x||0)**2 + (a.y||0)**2 + (a.z||0)**2);
    if (mag > 2.5) {
      lastMotionTime = Date.now();
      isStill = false;
      if (mag > 6 && Date.now() - lastMotionTime > 1500) obsScatter();
    }
  });
}

document.getElementById('s-observe').addEventListener('click', e => {
  if (e.target.closest('#chrome') || e.target.closest('#affirmBtn') || e.target.closest('#settings-panel')) return;
  if (fieldActive && !isCoherent && obsMode !== 'noting') obsScatter();
});
document.getElementById('s-observe').addEventListener('touchend', e => {
  if (e.target.closest('#chrome') || e.target.closest('#affirmBtn') || e.target.closest('#settings-panel')) return;
  if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.sense-chip') || e.target.closest('.tone-chip')) return;
  if (fieldActive && !isCoherent && obsMode === 'drift') {
    e.preventDefault();
    obsScatter();
  }
});

// ══════════════════════════════════════
// COLLAPSE MOVEMENT
// ══════════════════════════════════════
let stepIndex = 0;
function startCollapse() {
  if (navigator.vibrate) navigator.vibrate(18);
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  playCollapseSignature();
  currentMode = 'collapse'; showBackBtn();
  spParticles = []; fadeDrone(true, 1);
  const visited = localStorage.getItem('field_visited');
  if (visited) {
    setTimeout(() => { tryDrone(); buildCollapseField(); showScreen('s-field'); }, 200);
  } else {
    localStorage.setItem('field_visited', '1');
    buildInit(); showScreen('s-init');
  }
}
function revisitIntro() { buildInit(); showScreen('s-init'); }

function buildInit() {
  const t = TRANSLATIONS[lang]; stepIndex = 0;
  const cont = document.getElementById('s-init'); cont.innerHTML = '';
  const steps = STEPS[lang];
  const dotsCont = document.createElement('div'); dotsCont.className = 'sdots';
  steps.forEach((_,i) => {
    const d = document.createElement('div'); d.className = 'sdot'; d.id = 'sdot'+i; dotsCont.appendChild(d);
  });
  cont.appendChild(dotsCont);
  steps.forEach((s,i) => {
    const div = document.createElement('div'); div.className = 'step'+(i===0?' on':''); div.id = 'step'+i;
    const big = document.createElement('div'); big.className = 's-main'; big.innerHTML = s.big.replace(/\n/g,'<br>'); div.appendChild(big);
    if (s.small) { const sm = document.createElement('div'); sm.className = 's-sup'; sm.innerHTML = s.small.replace(/\n/g,'<br>'); div.appendChild(sm); }
    if (s.note) { const nt = document.createElement('div'); nt.className = 'sci-note'; nt.innerHTML = s.note; div.appendChild(nt); }
    cont.appendChild(div);
  });
  // [AE7] Collapse intro tap hint — faster pulse (1.8s) to suggest forward momentum
  const hint = document.createElement('div'); hint.id = 'taph'; hint.textContent = t.tapHint;
  hint.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);font-size:var(--fl);letter-spacing:.14em;color:rgba(201,169,110,.38);animation:pulseCollapse 1.8s ease-in-out infinite;pointer-events:none;z-index:20;white-space:nowrap;font-weight:300;';
  cont.appendChild(hint);
  updateInitScene();
}
function advanceStep() {
  if (isTransitioning) return;
  const steps = STEPS[lang];
  if (stepIndex < steps.length-1) {
    document.getElementById('step'+stepIndex).classList.remove('on');
    stepIndex++;
    document.getElementById('step'+stepIndex).classList.add('on');
    document.querySelectorAll('.sdot').forEach((d,i) => d.classList.toggle('on', i<=stepIndex));
    updateInitScene();
  } else {
    tryDrone(); buildCollapseField(); showScreen('s-field');
  }
}
function updateInitScene() {
  const ps = STEPS[lang][stepIndex]?.ps; initScene(ps||'sp');
}
function initScene(scene, chosen) {
  const n = 12;
  if (!spParticles.length) spParticles = Array.from({length:n}, (_,i) => new SpParticle(i,n));
  // [TECH2] zero _flickering on reset
  switch(scene) {
    case 'sp': spParticles.forEach(p => { p.targetAlpha=0.35+Math.random()*0.3; p.targetClarity=0; p._flickering=false; }); break;
    case 'one': spParticles.forEach((p,i) => { p.targetAlpha=i===0?0.9:0.05; p.targetClarity=i===0?1:0; p._flickering=false; }); if(spParticles[0]){spParticles[0].targetCx=0.5;spParticles[0].targetCy=0.14;} break;
    case 'all_labelled': spParticles.forEach(p => { p.targetAlpha=0.45; p.targetClarity=0.1; p._flickering=false; }); break;
    case 'flicker': spParticles.forEach((p,i) => { if(i===chosen||i===0){p._flickering=true;p.targetAlpha=0.8;} else{p.targetAlpha=0.05;p._flickering=false;} }); break;
    case 'crystallise': spParticles.forEach((p,i) => { p._flickering=false; if(i===chosen||i===0){p.targetAlpha=1;p.targetClarity=1;} else{p.targetAlpha=0.05;p.targetClarity=0;} }); break;
    case 'collapse_demo': spParticles.forEach((p,i) => { p._flickering=false; p.targetAlpha=i===0?1:0.05; p.targetClarity=i===0?1:0; }); if(spParticles[0]){spParticles[0].targetCx=0.5;spParticles[0].targetCy=0.14;} break;
    case 'stab': spParticles.forEach(p => { p.targetAlpha=0.6; p.targetClarity=0.7; p._flickering=false; }); break;
    case 'done': spParticles.forEach(p => { p.targetAlpha=0.55; p.targetClarity=0.5; p._flickering=false; }); break;
    case 'field': spParticles.forEach(p => { p.targetAlpha=0.35+Math.random()*0.25; p.targetClarity=0; p._flickering=false; }); break;
    case 'state_chosen': spParticles.forEach((p,i) => { p._flickering=false; if(i===chosen%spParticles.length){p.targetAlpha=1;p.targetClarity=1;} else{p.targetAlpha=0.04;p.targetClarity=0;} }); break;
  }
}
function buildCollapseField() {
  const t = TRANSLATIONS[lang];
  document.getElementById('fline').textContent = t.fieldLine;
  document.getElementById('stillTxt').innerHTML = t.stillTxt.replace(/\n/g,'<br>');
  document.getElementById('stillBack').textContent = t.retBtn;
  document.getElementById('obsCt').textContent = totalObs > 0 ? t.obsCount(totalObs) : '';
  document.getElementById('revisitBtn').textContent = 'revisit introduction';
  const grid = document.getElementById('grid'); grid.innerHTML = '';
  STATES[lang].forEach((st,idx) => {
    const o = document.createElement('div'); o.className = 'orb';
    const driftDur = (2.8+Math.random()*2.4).toFixed(2)+'s';
    const orbpDelay = (-Math.random()*6).toFixed(2)+'s';
    o.style.cssText = `--drift-dur:${driftDur};animation-delay:${orbpDelay};`;
    const len = st.name.length;
    const size = len<=5?'clamp(32px,9vw,46px)':len<=7?'clamp(28px,7.5vw,38px)':len<=8?'clamp(24px,6.5vw,32px)':len<=10?'clamp(20px,5.5vw,28px)':'clamp(18px,4.8vw,24px)';
    o.innerHTML = `<div class="oname" style="font-size:${size}">${st.name}</div>`;
    // [AE2] Orb hover: brief sharp-pulse before collapse
    const go = () => {
      if (isTransitioning) return; // [TECH3]
      o.style.filter = 'blur(0px)';
      o.style.opacity = '1';
      o.querySelector('.oname').style.color = 'rgba(255,235,180,1)';
      o.querySelector('.oname').style.textShadow = '0 0 40px rgba(255,210,80,.75), 0 0 80px rgba(255,190,40,.4)';
      setTimeout(() => {
        document.querySelectorAll('.orb').forEach(el => { el.classList.remove('collapsing'); el.classList.add('fading'); });
        o.classList.remove('fading'); o.classList.add('collapsing');
        spChosen = idx;
        setTimeout(() => selectState(st), 320);
      }, 180);
    };
    o.addEventListener('click', go);
    o.addEventListener('touchend', e => { e.preventDefault(); go(); });
    grid.appendChild(o);
  });
  document.querySelectorAll('.orb').forEach(el => { el.classList.remove('collapsing','fading'); el.style.filter=''; el.style.opacity=''; });
  document.querySelectorAll('.al').forEach(a => a.classList.add('on'));
  particlesHidden = false; initScene('field');
}
function selectState(state) {
  if (isTransitioning) return; // [TECH3]
  isTransitioning = true; // [TECH3]
  if (navigator.vibrate) navigator.vibrate(38);
  initAudio(); if(audioCtx.state==='suspended') audioCtx.resume();
  playCollapseSound();
  const b = document.getElementById('burst');
  b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
  const t = TRANSLATIONS[lang];
  curStateName = state.name;
  document.getElementById('cword').textContent = state.name;
  document.getElementById('cword5').textContent = state.name;
  const wl = state.name.length;
  const fs = wl<=5?'clamp(40px,12vw,72px)':wl<=7?'clamp(34px,10vw,60px)':wl<=9?'clamp(26px,8vw,46px)':wl<=11?'clamp(20px,6vw,34px)':'clamp(16px,5vw,26px)';
  ['cword','cword5'].forEach(id => { const el = document.getElementById(id); if(el) el.style.fontSize = fs; });
  document.getElementById('cLabel1').textContent = t.cLabel;
  document.getElementById('cSub1').textContent = t.cSub;
  document.getElementById('ceqNote').textContent = state.eq;
  document.getElementById('imagPrompt').textContent = getImagination(lang, state.name);
  document.getElementById('imagLabel3').textContent = t.imagLabel;
  const n = parseInt(localStorage.getItem('field_st_'+lang+'_'+state.name)||'0') + 1;
  localStorage.setItem('field_st_'+lang+'_'+state.name, n);
  totalObs++; localStorage.setItem('field_obs', totalObs);
  document.getElementById('obsNote').innerHTML = '';
  document.getElementById('obsNote5').innerHTML = '';
  document.getElementById('closing').style.opacity = '0'; document.getElementById('closing').textContent = '';
  document.getElementById('qlabel6').textContent = t.qlabel;
  const chosen = spParticles[spChosen%Math.max(spParticles.length,1)];
  if (chosen) { chosen.cx=0.5; chosen.cy=0.14; chosen.x=0.5*innerWidth; chosen.y=0.14*innerHeight; }
  initScene('state_chosen', spChosen);
  collapseStage = 0;
  document.querySelectorAll('.cp-stage').forEach(s => { s.classList.remove('on'); s.style.cssText=''; });
  clearAllBreath();
  document.getElementById('tapNext').textContent = t.tapHint;
  particlesHidden = false;
  fadeDrone(true, 1.5);
  showScreen('s-collapse', () => {
    isTransitioning = false; // [TECH3] clear after transition completes
    setTimeout(() => {
      const gh = document.getElementById('ghosts');
      gh.style.transition = 'none'; gh.style.opacity = '0';
      buildGhosts(state.name);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        gh.style.transition = 'opacity 1.4s ease'; gh.style.opacity = '1';
      }));
    }, 300);
    setTimeout(() => showCollapseStage(1), 300);
  });
}
function buildGhosts(chosen) {
  const gh = document.getElementById('ghosts'); gh.innerHTML = '';
  STATES[lang].filter(s => s.name !== chosen).forEach(s => {
    const el = document.createElement('div'); el.className = 'gst'; el.textContent = s.name;
    el.style.left = Math.random()*85+'%'; el.style.top = Math.random()*85+'%';
    el.style.animationDelay = (Math.random()*4)+'s'; gh.appendChild(el);
  });
}
function showCollapseStage(n) {
  if (isTransitioning) return; // [TECH3]
  if (n === 3) n = 4;
  if (n === 5) n = 6;
  const current = document.querySelector('.cp-stage.on');
  if (n===4) {
    particlesHidden = true; bgDimTarget = 0.3;
    const gh = document.getElementById('ghosts');
    if (gh) { gh.style.transition = 'opacity 0.3s ease'; gh.style.opacity = '0';
      setTimeout(() => { gh.innerHTML = ''; }, 350); }
  }
  else if (n===5) {
    const chosen = spParticles[spChosen%Math.max(spParticles.length,1)];
    if (chosen) { chosen.cx=0.5; chosen.cy=0.5; chosen.targetCx=0.5; chosen.targetCy=0.14; chosen.x=0.5*innerWidth; chosen.y=0.5*innerHeight; chosen.targetAlpha=1; chosen.targetClarity=1; chosen._flickering=false; }
    breathOrb = null;
    particlesHidden = false; initScene('state_chosen', spChosen);
  } else { particlesHidden = false; initScene('state_chosen', spChosen); }
  const reveal = () => {
    collapseStage = n; const el = document.getElementById('cs'+n); if (!el) return;
    el.style.cssText = 'opacity:0;pointer-events:none;transition:none;visibility:hidden;';
    el.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.visibility = 'visible'; el.style.transition = 'opacity 0.9s ease';
      el.style.opacity = '1'; el.style.pointerEvents = 'all';
      setTimeout(() => { el.style.cssText = ''; }, 950);
    }));
    const tapEl = document.getElementById('tapNext');
    tapEl.style.transition = 'opacity 0.7s ease';
    tapEl.style.opacity = n<6 ? '1' : '0';
    if (n===4) startBreath();
  };
  if (current) {
    isTransitioning = true; // [TECH3]
    current.style.transition = 'opacity 0.7s ease'; current.style.opacity = '0'; current.style.pointerEvents = 'none';
    setTimeout(() => {
      current.classList.remove('on'); current.style.cssText='opacity:0;visibility:hidden;display:none;';
      isTransitioning = false; // [TECH3]
      reveal();
    }, 750);
  } else reveal();
}
document.getElementById('s-collapse').addEventListener('click', e => {
  if (e.target.id==='retBtn'||e.target.classList.contains('return-btn')) return;
  if (e.target.closest('#chrome') || e.target.closest('#settings-panel')) return;
  if (collapseStage===4 && breathRunning) return;
  if (isTransitioning) return; // [TECH3]
  if (collapseStage<6) showCollapseStage(collapseStage+1);
});
document.getElementById('retBtn').addEventListener('click', () => {
  if(audioCtx) playBackNav();
  clearAllBreath(); particlesHidden = false; collapseStage = 0; isTransitioning = false;
  document.querySelectorAll('.cp-stage').forEach(s => { s.classList.remove('on'); s.style.cssText=''; });
  document.getElementById('ghosts').style.opacity = '0';
  setTimeout(() => { document.getElementById('ghosts').innerHTML=''; }, 900);
  showScreen('s-field', () => { buildCollapseField(); tryDrone(); });
});

// Breath
function bDelay(fn,ms){ const t=setTimeout(fn,ms); breathTimers.push(t); return t; }
function clearAllBreath(){
  breathTimers.forEach(clearTimeout); breathTimers=[]; breathRunning=false;
  breathOrb = null;
  // Ensure DOM bp is hidden (legacy safety)
  const bp = document.getElementById('bp'); if (bp) { bp.style.opacity='0'; bp.className='bp neutral'; }
  const rp = document.getElementById('bripple'); if (rp) rp.className='bripple';
}

function startBreath() {
  clearAllBreath(); breathRunning = true;
  const stateName = curStateName;
  const btext = document.getElementById('btext');
  const cycleIn  = lang === 'en' ? 'inhale' : 'inhala';
  const cycleOut = lang === 'en' ? 'exhale' : 'exhala';
  const inviteLine1 = lang === 'en' ? 'breathe in all possibilities' : 'inhala todas las posibilidades';
  const inviteLine2 = (lang === 'en' ? 'exhale into ' : 'exhala hacia ') + stateName;

  // Hide DOM bp element — we use canvas now
  const bp = document.getElementById('bp'); if (bp) bp.style.opacity = '0';
  const rp = document.getElementById('bripple'); if (rp) rp.className = 'bripple';

  // Reset text
  btext.style.transition = 'none'; btext.style.opacity = '0';
  btext.textContent = ''; btext.className = 'btext';
  [0,1,2].forEach(i=>{ const d=document.getElementById('bdot'+i); if(d) d.classList.remove('done'); });

  // Get chosen particle's canvas position — or centre if none
  const chosen = spParticles[spChosen % Math.max(spParticles.length, 1)];
  const startX = chosen ? chosen.x : innerWidth * 0.5;
  const startY = chosen ? chosen.y : innerHeight * 0.5;

  // Fade out all sp particles — the orb takes over
  spParticles.forEach(sp => { sp.targetAlpha = 0; });

  // Create BreathOrb at chosen particle position, moves to centre
  breathOrb = new BreathOrb(startX, startY);
  breathOrb.targetX = innerWidth * 0.5;
  breathOrb.targetY = innerHeight * 0.5;
  breathOrb.wordText = stateName;
  breathOrb.wordTargetAlpha = 0; // starts hidden, revealed on first inhale

  function showText(text, cls, delayMs) {
    bDelay(() => {
      const visible = parseFloat(btext.style.opacity || '0') > 0.05;
      if (visible) {
        btext.style.transition = 'opacity 0.4s ease'; btext.style.opacity = '0';
        bDelay(() => {
          btext.className = 'btext ' + cls; btext.textContent = text;
          btext.style.transition = 'opacity 0.9s ease'; btext.style.opacity = '1';
        }, 450);
      } else {
        btext.className = 'btext ' + cls; btext.textContent = text;
        btext.style.transition = 'opacity 1.1s ease'; btext.style.opacity = '1';
      }
    }, delayMs || 0);
  }
  function hideText(delayMs) {
    bDelay(() => { btext.style.transition = 'opacity 0.8s ease'; btext.style.opacity = '0'; }, delayMs || 0);
  }

  // ── Intro instructions (shown during settling phase) ──
  bDelay(() => {
    btext.className = 'btext intro';
    btext.textContent = inviteLine1;
    btext.style.transition = 'opacity 1.8s ease'; btext.style.opacity = '1';
  }, 400);
  bDelay(() => {
    btext.style.transition = 'opacity 0.9s ease'; btext.style.opacity = '0';
    bDelay(() => {
      btext.className = 'btext intro-gold';
      btext.textContent = inviteLine2;
      btext.style.transition = 'opacity 1.8s ease'; btext.style.opacity = '1';
    }, 950);
  }, 3400);
  hideText(6500);

  // ── Wire up BreathOrb phase changes to text labels ──
  const INHALE = breathOrb.INHALE, HOLD = breathOrb.HOLD, EXHALE = breathOrb.EXHALE, REST = breathOrb.REST;

  breathOrb.onPhaseChange = (phase, cycle) => {
    if (phase === 'inhale') {
      // Word alpha by cycle: 1→0.85, 2→0.42, 3→0.10
      if (breathOrb) {
        const wordAlphas = [0.85, 0.42, 0.10];
        breathOrb.wordTargetAlpha = wordAlphas[Math.min(cycle, 2)];
      }
      // Minimal inhale label fades in with breath
      bDelay(() => { showText(cycleIn, 'cycle', 0); }, 500);
      bDelay(() => { btext.style.transition='opacity 0.8s ease'; btext.style.opacity='0'; }, INHALE - 600);
    } else if (phase === 'exhale') {
      // Word dims further on exhale — pulled toward collapse
      if (breathOrb) {
        const exhaleAlphas = [0.55, 0.22, 0.0];
        breathOrb.wordTargetAlpha = exhaleAlphas[Math.min(cycle, 2)];
      }
      // Exhale label — slightly more present
      showText(cycleOut, 'cycle-exhale', 100);
      bDelay(() => { btext.style.transition='opacity 0.8s ease'; btext.style.opacity='0'; }, EXHALE - 600);
      playExhaleCollapse();
      const cw = document.getElementById('cword'); if (cw) cw.classList.add('exhaling');
    } else if (phase === 'rest') {
      const cw = document.getElementById('cword'); if (cw) cw.classList.remove('exhaling');
      const dot = document.getElementById('bdot' + (cycle - 1));
      if (dot) dot.classList.add('done');
    } else if (phase === 'crystallised') {
      // Word fully dissolved
      if (breathOrb) breathOrb.wordTargetAlpha = 0;
      // Third dot — lights on crystallise since there's no rest after final exhale
      const dot2 = document.getElementById('bdot2');
      if (dot2) dot2.classList.add('done');
    }
  };

  breathOrb.onCyclesDone = () => {
    breathRunning = false;
    btext.style.transition = 'opacity 0.9s ease'; btext.style.opacity = '0';
    // Seamless handoff — particle inherits orb's exact centre position
    if (chosen) {
      const ox = breathOrb ? breathOrb.x : innerWidth * 0.5;
      const oy = breathOrb ? breathOrb.y : innerHeight * 0.5;
      chosen.x  = ox; chosen.y  = oy;
      chosen.cx = ox / innerWidth;
      chosen.cy = oy / innerHeight;
      chosen.targetAlpha = 1; chosen.targetClarity = 1; chosen._flickering = false;
    }
    // Null orb one frame later so particle draws from same position with no gap
    requestAnimationFrame(() => { breathOrb = null; });
    initScene('state_chosen', spChosen);
    const tapEl = document.getElementById('tapNext');
    bDelay(() => { tapEl.style.transition = 'opacity 0.8s ease'; tapEl.style.opacity = '1'; }, 1600);
  };
}

function goStill() {
  const t = TRANSLATIONS[lang];
  document.getElementById('stillTxt').innerHTML = t.stillTxt.replace(/\n/g,'<br>');
  showScreen('s-still');
  document.getElementById('stillBack').onclick = () => goHome();
}

// ══════════════════════════════════════
// STORM SCREEN
// ══════════════════════════════════════
const DHAMMA_WORDS = {
  en: ['arising','passing','empty','changing','not self','conditioned','just this',
       'appearing','dissolving','fabricated','contact','known','impermanent',
       'without centre','already gone','fading','here','gone','felt','noted'],
  es: ['surgiendo','pasando','vacío','cambiando','no yo','condicionado','solo esto',
       'apareciendo','disolviéndose','fabricado','contacto','conocido','impermanente',
       'sin centro','ya se fue','desvaneciendo','aquí','ido','sentido','notado']
};

let stormScreenTimer = null;
let stormScreenRafId = null;
let stormActiveWords = [];

function startStormScreen() {
  currentMode = 'storm';
  showBackBtn();
  document.getElementById('backBtn').onclick = () => exitStormScreen();

  // [UX4] Tap-anywhere-to-exit on storm screen
  const stormScreen = document.getElementById('s-storm');
  const stormExitTap = (e) => {
    if (e.target.closest('#chrome') || e.target.closest('#settings-panel')) return;
    exitStormScreen();
    stormScreen.removeEventListener('click', stormExitTap);
  };
  // Brief delay before activating so the tap that started storm doesn't immediately exit
  setTimeout(() => {
    stormScreen.addEventListener('click', stormExitTap);
  }, 1200);

  showScreen('s-storm', () => {
    if (spParticles.length === 0) initSpParticles(10);
    spParticles.forEach(p => { p.targetAlpha = 0.12 + Math.random()*0.1; p.targetClarity = 0; p._flickering = false; });
    initStormWords();

    // [UX4] Auto-exit after 3 minutes
    if (stormAutoExitTimer) clearTimeout(stormAutoExitTimer);
    stormAutoExitTimer = setTimeout(() => {
      if (currentMode === 'storm') exitStormScreen();
    }, 180000);
  });
  bgDimTarget = 0.25;
  fadeDrone(true, 2);
}

function exitStormScreen() {
  stopStormWords();
  bgDimTarget = 1;
  if (stormAutoExitTimer) { clearTimeout(stormAutoExitTimer); stormAutoExitTimer = null; }
  currentMode = 'observe';
  goHome();
}

function initStormWords() {
  const layer = document.getElementById('storm-words-layer');
  if (!layer) return;
  layer.innerHTML = '';
  stormActiveWords = [];
  stopStormWords();

  const spawnNext = () => {
    if (currentMode !== 'storm') return;
    spawnStormWord();
    const next = 4000 + Math.random() * 4000; // much slower — contemplative pace
    stormScreenTimer = setTimeout(spawnNext, next);
  };
  // Seed with one word, breathe before the storm builds
  spawnStormWord();
  stormScreenTimer = setTimeout(spawnNext, 3500);

  const animateStorm = () => {
    if (currentMode !== 'storm') return;
    stormActiveWords = stormActiveWords.filter(w => {
      w.phase += 0.008;
      w.alpha += (w.targetAlpha - w.alpha) * 0.09; // faster fade in/out
      w.x += w.vx;
      w.y += w.vy;
      const a = w.alpha.toFixed(3);
      w.el.style.color = `rgba(240,204,136,${a})`;
      w.el.style.left = w.x + 'px';
      w.el.style.top = w.y + 'px';
      if (w.targetAlpha === 0 && w.alpha < 0.01) {
        w.el.remove();
        return false;
      }
      if (!w.fading && Date.now() - w.born > w.holdMs) {
        w.fading = true;
        w.targetAlpha = 0;
      }
      return true;
    });
    stormScreenRafId = requestAnimationFrame(animateStorm);
  };
  stormScreenRafId = requestAnimationFrame(animateStorm);

  const collapseLoop = () => {
    if (currentMode !== 'storm') return;
    if (spParticles.length > 0) {
      const sp = spParticles[Math.floor(Math.random() * spParticles.length)];
      const origAlpha = sp.targetAlpha;
      sp.targetClarity = 0.8 + Math.random() * 0.2;
      sp.targetAlpha = 0.9;
      setTimeout(() => {
        sp.targetClarity = 0;
        sp.targetAlpha = origAlpha;
      }, 900 + Math.random() * 600);
    }
    setTimeout(collapseLoop, 3000 + Math.random() * 4000);
  };
  setTimeout(collapseLoop, 2000);
}

function spawnStormWord() {
  const layer = document.getElementById('storm-words-layer');
  if (!layer || stormActiveWords.length > 9) return;
  const words = DHAMMA_WORDS[lang];
  const word = words[Math.floor(Math.random() * words.length)];
  const el = document.createElement('div');
  el.className = 'sw-word';
  el.textContent = word;
  // Much larger — overwhelm scale
  const sizes = [
    'clamp(28px,8vw,48px)',
    'clamp(36px,11vw,64px)',
    'clamp(22px,6vw,36px)',
    'clamp(44px,14vw,80px)',
    'clamp(18px,5vw,28px)'
  ];
  el.style.fontSize = sizes[Math.floor(Math.random() * sizes.length)];
  el.style.color = 'rgba(240,204,136,0)';
  layer.appendChild(el); // append first so we can measure
  const wordW = el.offsetWidth || 120;
  const wordH = el.offsetHeight || 40;
  const safeL = 16;
  const safeR = innerWidth - wordW - 16;
  const safeT = 80;
  const safeB = innerHeight - wordH - 80;
  const x = safeL + Math.random() * Math.max(0, safeR - safeL);
  const y = safeT + Math.random() * Math.max(0, safeB - safeT);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  const speed = 0.018 + Math.random() * 0.025; // much slower drift
  const angle = Math.random() * Math.PI * 2;
  const maxAlpha = 0.45 + Math.random() * 0.35;
  const wordObj = {
    el, x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 0.008,
    alpha: 0,
    targetAlpha: maxAlpha,
    phase: Math.random() * Math.PI * 2,
    born: Date.now(),
    holdMs: 5000 + Math.random() * 5000,  // linger 5–10s
    fading: false
  };
  stormActiveWords.push(wordObj);
}

function stopStormWords() {
  if (stormScreenTimer) clearTimeout(stormScreenTimer);
  stormScreenTimer = null;
  if (stormScreenRafId) cancelAnimationFrame(stormScreenRafId);
  stormScreenRafId = null;
  stormActiveWords.forEach(w => w.el.remove());
  stormActiveWords = [];
  const layer = document.getElementById('storm-words-layer');
  if (layer) layer.innerHTML = '';
}

// Body position calculation — safe across all screen sizes
function getDecBodyPos(spot) {
  const vh = window.innerHeight;
  const chromeH = 56;
  const safeBottom = 80;
  const usable = vh - chromeH - safeBottom;
  const spots = ['head','throat','chest','stomach','pelvis'];
  const idx = spots.indexOf(spot);
  const fraction = idx / (spots.length - 1);
  const wordTopPx = chromeH + 20 + fraction * (usable * 0.35);
  const particleTopPx = wordTopPx + 60;
  const dotsTopPx = Math.min(particleTopPx + 100, vh - safeBottom - 40);
  const textTopPx = Math.min(dotsTopPx + 50, vh - safeBottom);
  return {
    wordTop: wordTopPx + 'px',
    particleTop: particleTopPx + 'px',
    dotsTop: dotsTopPx + 'px',
    textTop: textTopPx + 'px'
  };
}

function startDecohere() {
  if (navigator.vibrate) navigator.vibrate(18);
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
  playDecohereSignature();
  currentMode = 'decohere'; showBackBtn();
  document.getElementById('backBtn').onclick = () => goHome();
  clearGhosts();
  // Violet colour temperature for Decohere movement
  applyDecoherePalette();
  fadeDrone(true, 1.5); spParticles = [];
  setTimeout(() => {
    initSpParticles(10);
    spParticles.forEach(p => {
      p.targetAlpha = 0.18 + Math.random()*0.15;
      p.targetClarity = 0;
      p.phV *= 0.4;
    });
  }, 300);
  buildShadowGrid();
  const t = TRANSLATIONS[lang];
  // Restore default padding/gap for shadow grid view
  const scr = document.getElementById('s-decohere');
  if (scr) { scr.style.paddingTop = ''; scr.style.gap = ''; }
  const arrLine = document.getElementById('decArrivalLine');
  const arrSub  = document.getElementById('decArrivalSub');
  arrLine.textContent = t.decArrivalLine; arrLine.style.opacity = '1';
  arrSub.textContent  = t.decArrivalSub;  arrSub.style.opacity  = '1';
  showScreen('s-decohere');
}

function buildShadowGrid() {
  const grid = document.getElementById('shadowGrid'); grid.innerHTML = '';
  const en = SHADOW_STATES.en, es = SHADOW_STATES.es;
  en.forEach((name,i) => {
    const o = document.createElement('div'); o.className = 'shadow-orb';
    o.style.setProperty('--shadow-dur', (3.5+Math.random()*3).toFixed(2)+'s');
    o.style.animationDelay = (-Math.random()*4).toFixed(2)+'s';
    o.textContent = lang==='en' ? name : es[i];
    const go = () => { if(audioCtx) playTap(); decStateName=name; decStateNameES=es[i]; showDecBodyMap(); };
    o.addEventListener('click', go);
    o.addEventListener('touchend', e => { e.preventDefault(); go(); });
    grid.appendChild(o);
  });
}

// ══════════════════════════════════════
// SHARED BODY MAP — used by both Decohere and Collapse
// mode: 'decohere' | 'collapse'
// payload: shadow state name (decohere) | state object (collapse)
// ══════════════════════════════════════
function showBodyMap(mode, payload) {
  // For decohere: replace shadow grid in s-decohere
  // For collapse: show s-bodymap screen
  const isDecohere = mode === 'decohere';

  const BODY_PTS = [
    ...(() => {
      const pts = []; const cx=0.5, cy=0.09, rr=0.072;
      for(let a=0;a<Math.PI*2;a+=Math.PI/8) pts.push([cx+Math.cos(a)*rr, cy+Math.sin(a)*rr*1.1, 1.2, 6]);
      return pts;
    })(),
    [0.5, 0.165, 1, 5],
    [0.26, 0.215, 1.3, 7], [0.38, 0.20, 1, 5], [0.5, 0.195, 0.9, 4],
    [0.62, 0.20, 1, 5], [0.74, 0.215, 1.3, 7],
    [0.21, 0.28, 1, 5], [0.18, 0.35, 1, 4], [0.16, 0.42, 1, 4],
    [0.79, 0.28, 1, 5], [0.82, 0.35, 1, 4], [0.84, 0.42, 1, 4],
    [0.27, 0.26, 1, 4], [0.25, 0.34, 1, 4], [0.24, 0.42, 1, 4],
    [0.73, 0.26, 1, 4], [0.75, 0.34, 1, 4], [0.76, 0.42, 1, 4],
    [0.5, 0.25, 1, 4], [0.42, 0.28, 0.8, 3], [0.58, 0.28, 0.8, 3],
    [0.30, 0.50, 1, 4], [0.38, 0.505, 0.8, 3], [0.5, 0.51, 0.9, 4],
    [0.62, 0.505, 0.8, 3], [0.70, 0.50, 1, 4],
    [0.14, 0.50, 1, 4], [0.12, 0.57, 1, 4],
    [0.86, 0.50, 1, 4], [0.88, 0.57, 1, 4],
    [0.28, 0.595, 1.2, 6], [0.38, 0.60, 1, 4], [0.5, 0.605, 1, 4],
    [0.62, 0.60, 1, 4], [0.72, 0.595, 1.2, 6],
  ];

  const SPOT_BANDS = {
    head:    [0.00, 0.20],
    throat:  [0.14, 0.26],
    chest:   [0.22, 0.44],
    stomach: [0.42, 0.56],
    pelvis:  [0.54, 0.70],
  };

  const BODY_SPOTS = {
    en: [
      {key:'head',    label:'head',    top:9},
      {key:'throat',  label:'throat',  top:22},
      {key:'chest',   label:'chest',   top:36},
      {key:'stomach', label:'stomach', top:52},
      {key:'pelvis',  label:'pelvis',  top:66},
    ],
    es: [
      {key:'head',    label:'cabeza',   top:9},
      {key:'throat',  label:'garganta', top:22},
      {key:'chest',   label:'pecho',    top:36},
      {key:'stomach', label:'vientre',  top:52},
      {key:'pelvis',  label:'pelvis',   top:66},
    ]
  };

  // Colours per mode
  const spotColor    = isDecohere ? 'rgba(200,185,210,' : 'rgba(240,204,136,';
  const spotGlow     = isDecohere ? 'rgba(180,160,200,' : 'rgba(240,190,80,';
  const ptColor      = isDecohere ? 'rgba(230,215,245,1)' : 'rgba(240,210,140,1)';
  const ptGlowColor  = isDecohere ? 'rgba(210,185,235,' : 'rgba(240,204,136,';

  const question = isDecohere
    ? (lang === 'en' ? 'Where do you feel it most?' : '¿Dónde lo sientes más?')
    : (lang === 'en' ? 'Where does it want to land?' : '¿Dónde quiere aterrizar?');

  // Build DOM into the right container
  let container, wrap;
  if (isDecohere) {
    const grid = document.getElementById('shadowGrid');
    const line = document.getElementById('decArrivalLine');
    const sub  = document.getElementById('decArrivalSub');
    if (line) { line.style.transition = 'opacity 0.5s ease'; line.style.opacity = '0'; }
    if (sub)  { sub.style.transition  = 'opacity 0.5s ease'; sub.style.opacity  = '0'; }
    // Remove padding constraints — full screen figure
    const scr = document.getElementById('s-decohere');
    if (scr) { scr.style.paddingTop = '0'; scr.style.gap = '0'; }
    grid.innerHTML = '<div id="bodymapWrap" style="position:fixed;inset:0;"></div>';
    wrap = document.getElementById('bodymapWrap');
  } else {
    // Collapse: use dedicated s-bodymap screen
    const screen = document.getElementById('s-bodymap');
    screen.innerHTML = '';
    const header = document.createElement('div');
    header.style.cssText = 'font-size:clamp(13px,3.2vw,16px);letter-spacing:.18em;color:rgba(201,169,110,.38);text-transform:uppercase;margin-bottom:6px;';
    header.textContent = lang === 'en' ? 'where does it want to land?' : '¿dónde quiere aterrizar?';
    screen.appendChild(header);
    const bwrap = document.createElement('div');
    bwrap.className = 'bodymap-wrap';
    bwrap.id = 'bodymapWrap';
    screen.appendChild(bwrap);
    wrap = bwrap;
    showScreen('s-bodymap');
  }

  // ── Decohere: full-screen canvas figure ──
  if (isDecohere) {
    const W = innerWidth, H = innerHeight;

    // Question label
    const qEl = document.createElement('div');
    qEl.style.cssText = `position:absolute;bottom:clamp(36px,9vw,60px);left:50%;
      transform:translateX(-50%);font-size:clamp(16px,4.2vw,22px);font-weight:300;
      color:rgba(240,230,208,.65);letter-spacing:.04em;text-align:center;
      pointer-events:none;z-index:2;line-height:1.5;white-space:nowrap;`;
    qEl.textContent = question;
    wrap.appendChild(qEl);

    // Full-screen canvas
    const fc = document.createElement('canvas');
    fc.width = W; fc.height = H;
    fc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    wrap.appendChild(fc);
    const fx = fc.getContext('2d');

    // Figure: taller, centred, full use of screen
    const FIG_TOP  = 0.10,  FIG_BOT = 0.86;
    const FIG_L    = 0.25,  FIG_R   = 0.75;
    const figH = (FIG_BOT - FIG_TOP) * H;
    const figW = (FIG_R - FIG_L) * W;
    const figX = FIG_L * W, figY = FIG_TOP * H;

    // Shadow word watermark — faint behind figure, holds concept while user locates in body
    const watermarkEl = document.createElement('div');
    watermarkEl.style.cssText = `position:absolute;left:50%;top:48%;
      transform:translate(-50%,-50%);
      font-size:clamp(44px,13vw,82px);font-weight:300;
      font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;
      color:rgba(180,160,210,.07);letter-spacing:.06em;
      pointer-events:none;z-index:0;white-space:nowrap;`;
    watermarkEl.textContent = decStateName || '';
    wrap.appendChild(watermarkEl);

    // DOM zone labels — right-aligned left of figure, never clip
    const ZONE_LABELS = {
      en: { head:'head', throat:'throat', chest:'chest', stomach:'stomach', pelvis:'pelvis' },
      es: { head:'cabeza', throat:'garganta', chest:'pecho', stomach:'vientre', pelvis:'pelvis' }
    };
    const zoneLabelEls = {};
    ZONES.forEach((z, idx) => {
      const lyPct = ((figY + z.labelY * figH) / H * 100).toFixed(1);
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;
        left:clamp(8px, ${(FIG_L * 100 - 18).toFixed(1)}%, ${Math.round(FIG_L * W - 8)}px);
        top:${lyPct}%;transform:translateY(-50%);
        font-size:clamp(12px,3.2vw,15px);font-weight:300;
        font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:.12em;text-transform:uppercase;
        color:rgba(200,185,215,.32);pointer-events:none;z-index:5;
        transition:color 0.4s ease,opacity 0.5s ease;white-space:nowrap;
        opacity:0;text-align:right;
        right:${(100 - FIG_L * 100 + 2).toFixed(1)}%;left:auto;`;
      el.textContent = ZONE_LABELS[lang][z.key];
      wrap.appendChild(el);
      zoneLabelEls[z.key] = el;
      setTimeout(() => { el.style.opacity = '1'; }, 80 * idx + 250);
    });

    // Dot positions — head circular, legs extended
    const aspectCorrect = figH / figW;
    const BODY_PTS_LOCAL = [
      ...(() => {
        const pts = []; const hcx=0.5, hcy=0.09, rr=0.068;
        for(let a=0;a<Math.PI*2;a+=Math.PI/8)
          pts.push([hcx+Math.cos(a)*rr, hcy+Math.sin(a)*rr/aspectCorrect, 1.5, 8]);
        return pts;
      })(),
      [0.5, 0.155, 1.3, 6],
      [0.26, 0.205, 1.6, 8], [0.38, 0.19, 1.3, 6], [0.5, 0.185, 1.2, 5],
      [0.62, 0.19, 1.3, 6], [0.74, 0.205, 1.6, 8],
      [0.21, 0.27, 1.3, 6], [0.18, 0.34, 1.2, 5], [0.16, 0.41, 1.2, 5],
      [0.79, 0.27, 1.3, 6], [0.82, 0.34, 1.2, 5], [0.84, 0.41, 1.2, 5],
      [0.27, 0.25, 1.2, 5], [0.25, 0.33, 1.2, 5], [0.24, 0.41, 1.2, 5],
      [0.73, 0.25, 1.2, 5], [0.75, 0.33, 1.2, 5], [0.76, 0.41, 1.2, 5],
      [0.5, 0.24, 1.2, 5], [0.42, 0.27, 1.1, 4], [0.58, 0.27, 1.1, 4],
      [0.30, 0.49, 1.2, 5], [0.38, 0.495, 1.1, 4], [0.5, 0.50, 1.2, 5],
      [0.62, 0.495, 1.1, 4], [0.70, 0.49, 1.2, 5],
      [0.14, 0.49, 1.2, 5], [0.12, 0.56, 1.2, 5],
      [0.86, 0.49, 1.2, 5], [0.88, 0.56, 1.2, 5],
      [0.28, 0.585, 1.5, 7], [0.38, 0.59, 1.2, 5], [0.5, 0.595, 1.3, 5],
      [0.62, 0.59, 1.2, 5], [0.72, 0.585, 1.5, 7],
      // Legs
      [0.36, 0.65, 1.2, 5], [0.43, 0.655, 1.1, 4], [0.50, 0.65, 1.1, 4],
      [0.57, 0.655, 1.1, 4], [0.64, 0.65, 1.2, 5],
      [0.34, 0.72, 1.1, 4], [0.41, 0.725, 1.0, 4],
      [0.59, 0.725, 1.0, 4], [0.66, 0.72, 1.1, 4],
      [0.33, 0.79, 1.0, 4], [0.40, 0.795, 0.9, 3],
      [0.60, 0.795, 0.9, 3], [0.67, 0.79, 1.0, 4],
    ];

    const SPOT_BANDS_Y = {
      head:    [0.00, 0.18],
      throat:  [0.13, 0.24],
      chest:   [0.20, 0.42],
      stomach: [0.40, 0.54],
      pelvis:  [0.52, 0.70],
    };

    // Zone label positions (fraction of figure height from top)
    const ZONES = [
      { key:'head',    labelY: 0.08 },
      { key:'throat',  labelY: 0.21 },
      { key:'chest',   labelY: 0.33 },
      { key:'stomach', labelY: 0.49 },
      { key:'pelvis',  labelY: 0.64 },
    ];

    let activeSpot = null;
    let glowPhase = 0;
    let somatic = false;
    let figRafId = null;

    // Echo word shown on tap
    const echoEl = document.createElement('div');
    echoEl.style.cssText = `position:absolute;left:50%;transform:translateX(-50%);
      font-size:clamp(28px,8vw,44px);font-weight:300;
      font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;
      color:rgba(200,185,210,.9);text-shadow:0 0 30px rgba(180,160,200,.5);
      pointer-events:none;z-index:4;opacity:0;transition:opacity 1s ease;
      letter-spacing:.06em;white-space:nowrap;`;
    wrap.appendChild(echoEl);

    function drawFigure() {
      if (currentMode !== 'decohere') { cancelAnimationFrame(figRafId); return; }
      fx.clearRect(0, 0, W, H);
      glowPhase += 0.025;

      BODY_PTS_LOCAL.forEach(([nx, ny, r, gr]) => {
        const px = figX + nx * figW;
        const py = figY + ny * figH;
        let inSpot = false;
        if (activeSpot && SPOT_BANDS_Y[activeSpot]) {
          const [lo, hi] = SPOT_BANDS_Y[activeSpot];
          if (ny >= lo && ny <= hi) inSpot = true;
        }
        const pulse = inSpot
          ? 0.6 + 0.4 * Math.sin(glowPhase * 2.2)
          : 0.45 + 0.14 * Math.sin(glowPhase + nx * 4);
        const alpha = inSpot ? 0.88 + 0.12 * pulse : 0.45 + 0.15 * pulse;
        const glowA = inSpot ? 0.40 * pulse : 0.14 * pulse;
        const glowRad = inSpot ? gr * 2.4 : gr * 1.4;

        const grad = fx.createRadialGradient(px, py, 0, px, py, glowRad);
        grad.addColorStop(0, `${ptGlowColor}${glowA.toFixed(3)})`);
        grad.addColorStop(1, `${ptGlowColor}0)`);
        fx.fillStyle = grad;
        fx.beginPath(); fx.arc(px, py, glowRad, 0, Math.PI*2); fx.fill();
        fx.globalAlpha = alpha;
        fx.fillStyle = ptColor;
        fx.beginPath(); fx.arc(px, py, r * (inSpot ? 1.9 : 1), 0, Math.PI*2); fx.fill();
        fx.globalAlpha = 1;
      });

      figRafId = requestAnimationFrame(drawFigure);
    }
    figRafId = requestAnimationFrame(drawFigure);

    // Invisible hit zones overlaid on figure
    ZONES.forEach((z, idx) => {
      const [lo, hi] = SPOT_BANDS_Y[z.key];
      const hitTop  = figY + lo * figH;
      const hitH    = (hi - lo) * figH;
      const hitL    = figX - figW * 0.1;
      const hitW    = figW * 1.2;

      const hitBtn = document.createElement('button');
      hitBtn.style.cssText = `position:absolute;left:${hitL}px;top:${hitTop}px;
        width:${hitW}px;height:${hitH}px;
        background:none;border:none;cursor:pointer;z-index:3;
        -webkit-tap-highlight-color:transparent;`;
      hitBtn.setAttribute('aria-label', ZONE_LABELS[lang][z.key]);

      hitBtn.addEventListener('click', () => {
        if (somatic) return;
        somatic = true;
        activeSpot = z.key;

        // Highlight the tapped zone label
        Object.entries(zoneLabelEls).forEach(([k, el]) => {
          el.style.color = k === z.key
            ? 'rgba(210,190,235,.92)'
            : 'rgba(200,185,215,.12)';
        });

        // Play zone tone
        if (audioCtx) {
          const zoneFreqs = { head:1056, throat:792, chest:528, stomach:396, pelvis:264 };
          const f = zoneFreqs[z.key] || 528;
          const oz = audioCtx.createOscillator(), gz = audioCtx.createGain();
          oz.type='sine'; oz.frequency.value=f;
          gz.gain.setValueAtTime(0,audioCtx.currentTime);
          gz.gain.linearRampToValueAtTime(0.045,audioCtx.currentTime+0.12);
          gz.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+2.2);
          oz.connect(gz); gz.connect(audioCtx.destination); oz.start(); oz.stop(audioCtx.currentTime+2.5);
        }

        // Echo: "grief · stomach" — the pairing is the insight
        const zoneName = ZONE_LABELS[lang][z.key];
        const shadowName = decStateName || '';
        echoEl.textContent = shadowName ? `${shadowName} · ${zoneName}` : zoneName;
        const echoY = figY + z.labelY * figH - 24;
        echoEl.style.top = Math.max(120, Math.min(H - 100, echoY)) + 'px';
        echoEl.style.opacity = '1';

        // Watermark brightens briefly then fades
        watermarkEl.style.transition = 'opacity 0.4s ease';
        watermarkEl.style.opacity = '0';

        // Hide question label
        qEl.style.transition = 'opacity 0.8s ease';
        qEl.style.opacity = '0';

        // Somatic pause — 2s of the zone glowing, then transition
        setTimeout(() => {
          echoEl.style.transition = 'opacity 1.2s ease';
          echoEl.style.opacity = '0';
          setTimeout(() => {
            cancelAnimationFrame(figRafId);
            decBodySpot = z.key;
            startDecAcknowledge();
          }, 700);
        }, 2000);
      });
      hitBtn.addEventListener('touchend', e => { e.preventDefault(); hitBtn.click(); });

      // Staggered fade in
      hitBtn.style.opacity = '0';
      wrap.appendChild(hitBtn);
      setTimeout(() => { hitBtn.style.transition = 'opacity 0.6s ease'; hitBtn.style.opacity = '1'; }, 80 * idx + 200);
    });

    return; // decohere path done
  }

  // ── Collapse: original layout (smaller figure, side labels) ──
  const figDiv = document.createElement('div');
  figDiv.className = 'bodymap-figure';
  const fc = document.createElement('canvas');
  fc.width = 180; fc.height = 520;
  figDiv.appendChild(fc);
  wrap.appendChild(figDiv);

  const fx = fc.getContext('2d');
  const W = 180, H = 520;

  let activeSpot = null;
  let glowPhase = 0;
  let figRafId = null;

  function drawFigure() {
    if (currentMode !== 'collapse') { cancelAnimationFrame(figRafId); return; }
    fx.clearRect(0, 0, W, H);
    glowPhase += 0.03;
    BODY_PTS.forEach(([nx, ny, r, gr]) => {
      const px = nx * W, py = ny * H;
      let inSpot = false;
      if (activeSpot && SPOT_BANDS[activeSpot]) {
        const [lo, hi] = SPOT_BANDS[activeSpot];
        if (ny >= lo && ny <= hi) inSpot = true;
      }
      const pulse = inSpot ? 0.7 + 0.3 * Math.sin(glowPhase * 2) : 0.5 + 0.12 * Math.sin(glowPhase + nx * 3);
      const alpha = inSpot ? 0.55 + 0.35 * pulse : 0.18 + 0.10 * pulse;
      const glowA = inSpot ? 0.22 * pulse : 0.06 * pulse;
      const glowRad = inSpot ? gr * 1.8 : gr;
      const grad = fx.createRadialGradient(px, py, 0, px, py, glowRad);
      grad.addColorStop(0, `${ptGlowColor}${glowA.toFixed(3)})`);
      grad.addColorStop(1, `${ptGlowColor}0)`);
      fx.fillStyle = grad;
      fx.beginPath(); fx.arc(px, py, glowRad, 0, Math.PI*2); fx.fill();
      fx.globalAlpha = alpha;
      fx.fillStyle = ptColor;
      fx.beginPath(); fx.arc(px, py, r * (inSpot ? 1.5 : 1), 0, Math.PI*2); fx.fill();
      fx.globalAlpha = 1;
    });
    figRafId = requestAnimationFrame(drawFigure);
  }
  figRafId = requestAnimationFrame(drawFigure);

  // Collapse spot buttons (original side labels)
  BODY_SPOTS[lang].forEach((spot, idx) => {
    const b = document.createElement('button');
    b.className = 'body-node';
    b.textContent = spot.label;
    b.style.top = spot.top + '%';
    b.style.opacity = '0';
    b.style.left = 'auto';
    b.style.right = 'max(8px, 18%)';
    b.style.transform = 'translateY(8px)';
    b.style.transition = 'opacity 0.9s ease, transform 0.9s ease, border-color 0.3s ease, color 0.3s ease';

    b.addEventListener('click', () => {
      cancelAnimationFrame(figRafId);
      activeSpot = spot.key;
      document.querySelectorAll('.body-node').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      if (audioCtx) {
        const zoneFreqs = { head:1056, throat:792, chest:528, stomach:396, pelvis:264 };
        const f = zoneFreqs[spot.key] || 528;
        const oz = audioCtx.createOscillator(), gz = audioCtx.createGain();
        oz.type='sine'; oz.frequency.value=f;
        gz.gain.setValueAtTime(0,audioCtx.currentTime);
        gz.gain.linearRampToValueAtTime(0.04,audioCtx.currentTime+0.08);
        gz.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+1.5);
        oz.connect(gz); gz.connect(audioCtx.destination); oz.start(); oz.stop(audioCtx.currentTime+1.8);
      }
      collapseBodySpot = spot.key;
      const spotFraction = idx / (BODY_SPOTS[lang].length - 1);
      const pY = (0.09 + spotFraction * 0.55) * innerHeight;
      const chosen = spParticles[spChosen % Math.max(spParticles.length, 1)];
      if (chosen) {
        chosen.cx = 0.5;
        chosen.cy = 0.09 + spotFraction * 0.55;
        chosen.x = innerWidth * 0.5;
        chosen.y = pY;
      }
      setTimeout(() => {
        showScreen('s-field', () => { selectState(payload); });
      }, 220);
    });
    b.addEventListener('touchend', e => { e.preventDefault(); b.click(); });
    wrap.appendChild(b);
    setTimeout(() => { b.style.opacity = '1'; b.style.transform = 'translateY(0)'; }, 120 * idx);
  });
}

function showDecBodyMap() {
  // Legacy wrapper — routes to shared showBodyMap
  showBodyMap('decohere', null);
}

// PHASE 1: Acknowledgment — word fades in alone in silence, then breath begins
function startDecAcknowledge() {
  const displayName = lang==='en' ? decStateName : decStateNameES;

  const ackLayer    = document.getElementById('dec-ack-layer');
  const breathLayer = document.getElementById('dec-breath-layer');
  const wordEl      = document.getElementById('dec-word');
  const btext       = document.getElementById('dec-btext');
  const bp          = document.getElementById('dec-bp');

  [ackLayer, breathLayer, wordEl, btext, bp].forEach(el => {
    if (el) { el.style.transition = 'none'; el.style.opacity = '0'; }
  });
  const wordOrb = document.getElementById('dec-word-orb');
  if (wordOrb) { wordOrb.style.transition = 'none'; wordOrb.style.opacity = '0'; wordOrb.textContent = ''; }

  wordEl.innerHTML = '';
  displayName.split('').forEach(ch => {
    const span = document.createElement('span');
    span.textContent = ch === ' ' ? '\u00a0' : ch;
    span.style.cssText = 'display:inline-block;transition:none;';
    wordEl.appendChild(span);
  });

  [0,1,2].forEach(i => {
    const d = document.getElementById('dec-dot'+i);
    if (d) d.classList.remove('done');
  });
  if (bp) {
    bp.style.transform = 'scale(1)';
    bp.style.filter = '';
    bp.style.background = 'rgba(180,175,165,.5)';
    bp.style.opacity = '0';
  }

  showScreen('s-dec-breath', () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      wordEl.style.transition = 'color 3s ease, opacity 2s ease';
      ackLayer.style.transition = 'opacity 1s ease';
      setTimeout(() => {
        wordEl.style.opacity = '1';
        wordEl.style.textShadow = '0 0 36px rgba(240,220,180,.28)';
      }, 100);
      setTimeout(() => { ackLayer.style.opacity = '1'; }, 200);
      // 5s of silence — then breath begins
      setTimeout(() => startDecBreath(displayName), 5000);
    }));
  });
}

// PHASE 2: Breath cycles
function startDecBreath(displayName) {
  bgDimTarget = 0.25;
  const t = TRANSLATIONS[lang];
  const ackLayer    = document.getElementById('dec-ack-layer');
  const breathLayer = document.getElementById('dec-breath-layer');
  const wordEl      = document.getElementById('dec-word');   // ack layer only
  const wordOrb     = document.getElementById('dec-word-orb'); // lives inside orb
  const btext       = document.getElementById('dec-btext');
  const bp          = document.getElementById('dec-bp');
  const bdots       = document.getElementById('dec-bdots');

  // Populate the orb word element
  if (wordOrb) {
    wordOrb.textContent = displayName;
    wordOrb.style.opacity = '0';
    wordOrb.style.transition = 'opacity 1.5s ease, text-shadow 2s ease, color 2s ease';
  }

  // bdots below orb — fixed bottom
  if (bdots) { bdots.style.top = 'auto'; bdots.style.bottom = 'clamp(80px,14vh,120px)'; }

  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.style.opacity = '1';
    backBtn.style.pointerEvents = 'all';
    backBtn.onclick = () => startDecohere();
  }

  ackLayer.style.transition = 'opacity 1.2s ease';
  ackLayer.style.opacity = '0';
  setTimeout(() => { ackLayer.style.pointerEvents = 'none'; }, 1200);

  breathLayer.style.transition = 'opacity 1.2s ease';
  setTimeout(() => {
    breathLayer.style.opacity = '1';
    breathLayer.style.pointerEvents = 'all';
    if (bp) { bp.style.transition = 'opacity 1.2s ease'; bp.style.opacity = '1'; }
    if (wordOrb) { wordOrb.style.transition = 'opacity 1.8s ease'; wordOrb.style.opacity = '0.55'; }
  }, 400);

  let cycle = 0;
  const decTimers = [];
  function dDelay(fn,ms){ const id=setTimeout(fn,ms); decTimers.push(id); decBreathTimers.push(id); return id; }

  function setBtext(txt) {
    if (!btext) return;
    const isVisible = parseFloat(btext.style.opacity||'0') > 0.05;
    if (isVisible) {
      btext.style.transition = 'opacity 0.5s ease';
      btext.style.opacity = '0';
      const id = setTimeout(() => {
        btext.textContent = txt;
        btext.style.transition = 'opacity 1s ease';
        btext.style.opacity = '1';
      }, 550);
      decBreathTimers.push(id);
    } else {
      btext.textContent = txt;
      btext.style.transition = 'opacity 1.2s ease';
      btext.style.opacity = '1';
    }
  }
  function hideBtext() {
    if (!btext) return;
    btext.style.transition = 'opacity 0.8s ease';
    btext.style.opacity = '0';
  }

  function fireRipple(idx) {
    const rip = document.getElementById('dec-rip'+idx);
    if (!rip) return;
    rip.classList.remove('go');
    void rip.offsetWidth;
    rip.classList.add('go');
  }

  function dronePitch(up) {
    if (!droneNodes.length) return;
    droneNodes.forEach(n => {
      if (n.frequency) {
        const base = n.frequency.value;
        n.frequency.setTargetAtTime(up ? base*1.018 : base/1.018, audioCtx.currentTime, 2);
      }
    });
  }

  function runCycle() {
    if (cycle >= 3) {
      if (backBtn) {
        backBtn.style.opacity = '1';
        backBtn.style.pointerEvents = 'all';
        backBtn.onclick = () => goHome();
      }

      dDelay(() => {
        hideBtext();
        // Scatter the orb word on completion
        if (wordOrb) {
          wordOrb.style.transition = 'opacity 1.5s ease, transform 1.5s ease, filter 1.5s ease';
          wordOrb.style.opacity = '0';
          wordOrb.style.transform = `translate(${(Math.random()-0.5)*60}px,${(Math.random()-0.5)*40-15}px) rotate(${(Math.random()-0.5)*20}deg)`;
          wordOrb.style.filter = 'blur(10px)';
        }
        if (bp) {
          bp.style.transition = 'transform 1.2s cubic-bezier(.4,0,.2,1),opacity 1.8s ease,background 1.2s ease,box-shadow 1.2s ease';
          bp.style.transform = 'scale(4)';
          // [AE5] deep gold, not warm-white
          bp.style.background = 'rgba(240,190,60,.85)';
          bp.style.boxShadow = '0 0 40px rgba(240,190,60,.7)';
        }
        playDecohereRelease();
      }, 400);

      dDelay(() => {
        if (bp) {
          bp.style.transition = 'transform 3s cubic-bezier(.4,0,.2,1),opacity 3s ease,background 3s ease,box-shadow 3s ease';
          bp.style.transform = 'scale(0.5)';
          bp.style.opacity = '0.35';
          bp.style.background = 'rgba(201,169,110,.6)';
          bp.style.boxShadow = '0 0 8px rgba(201,169,110,.3)';
        }
      }, 1800);

      dDelay(() => showDecEnd(), 5500);
      return;
    }
    cycle++;
    if (!bp) return;

    const inhaleText = t.decInhale;
    const exhaleText = t.decExhale;

    setBtext(inhaleText);

    dDelay(() => {
      const maxScale = 5 + cycle * 2;
      const r = 190 + cycle * 16, g = 178 + cycle * 10, bl = 150 - cycle * 12;
      const glowStr = 0.25 + cycle * 0.18;
      bp.style.transition =
        'transform 4s cubic-bezier(.35,0,.15,1),' +
        'filter 4s ease,' +
        'background 3.5s ease,' +
        'box-shadow 3.5s ease';
      bp.style.transform = `scale(${maxScale})`;
      bp.style.filter = `blur(${3 + cycle * 1.5}px)`;
      bp.style.background = `rgba(${r},${g},${bl},0.65)`;
      bp.style.boxShadow = `0 0 ${30+cycle*20}px rgba(${r},${g},${bl},${glowStr})`;
      // Word glows on inhale — brightens, gains text-shadow
      if (wordOrb) {
        const wAlpha = Math.min(0.95, 0.55 + cycle * 0.15);
        wordOrb.style.transition = 'opacity 2s ease, text-shadow 2s ease, color 2s ease';
        wordOrb.style.opacity = wAlpha.toFixed(2);
        wordOrb.style.color = `rgba(240,215,170,${wAlpha.toFixed(2)})`;
        wordOrb.style.textShadow = `0 0 ${20+cycle*12}px rgba(240,210,140,${(0.4+cycle*0.15).toFixed(2)})`;
      }
      dronePitch(true);
    }, 100);

    dDelay(() => {
      const nudge = 5 + cycle * 2 + 0.8;
      bp.style.transition = 'transform 2s cubic-bezier(.4,0,.2,1)';
      bp.style.transform = `scale(${nudge})`;
    }, 2200);

    dDelay(() => {
      setBtext(exhaleText);
      if (navigator.vibrate) navigator.vibrate(22);
      fireRipple(cycle - 1);
      dronePitch(false);
      bp.style.transition =
        'transform 4.5s cubic-bezier(.4,0,.2,1),' +
        'filter 4s ease,' +
        'background 3s ease,' +
        'box-shadow 3s ease';
      bp.style.transform = 'scale(1)';
      bp.style.filter = 'blur(0px)';
      // [AE5] exhale residual — warm gold tones
      const residR = 200 + cycle * 12, residG = 175 + cycle * 6, residB = 80 - cycle * 8;
      bp.style.background = `rgba(${residR},${Math.min(255,residG)},${Math.max(0,residB)},${0.45 + cycle*0.1})`;
      bp.style.boxShadow = `0 0 ${10+cycle*6}px rgba(${residR},${Math.min(255,residG)},${Math.max(0,residB)},${0.2+cycle*0.08})`;

      // Word dims on exhale — fades, loses glow
      if (wordOrb) {
        const wAlpha = Math.max(0.15, 0.45 - cycle * 0.12);
        wordOrb.style.transition = 'opacity 3s ease, text-shadow 3s ease, color 3s ease';
        wordOrb.style.opacity = wAlpha.toFixed(2);
        wordOrb.style.color = `rgba(180,175,165,${wAlpha.toFixed(2)})`;
        wordOrb.style.textShadow = '0 0 8px rgba(180,175,165,.12)';
      }
    }, 4400);

    dDelay(() => {
      const dot = document.getElementById('dec-dot'+(cycle-1));
      if (dot) dot.classList.add('done');
    }, 8800);

    dDelay(() => { hideBtext(); }, 8000);
    dDelay(runCycle, 10200);
  }

  dDelay(runCycle, 800);
}

// PHASE 3: End
function showDecEnd() {
  currentMode = 'decohere-end';
  const t = TRANSLATIONS[lang];
  const nd = parseInt(localStorage.getItem('field_obs_decohere')||'0') + 1;
  localStorage.setItem('field_obs_decohere', nd);

  spParticles = Array.from({length:12}, (_,i) => new SpParticle(i,12));
  spParticles.forEach(p => {
    p._flickering = false; // [TECH2]
    p.x = innerWidth/2 + (Math.random()-0.5)*20;
    p.y = innerHeight/2 + (Math.random()-0.5)*20;
    p.targetAlpha = 0;
    p.targetClarity = 0;
    p.phV *= 0.5;
  });
  setTimeout(() => {
    spParticles.forEach(p => { p.targetAlpha = 0.22 + Math.random()*0.2; });
  }, 600);

  document.getElementById('decEndLine').textContent = t.decEndLine;
  document.getElementById('decRetBtn').textContent = t.decRetBtn;
  document.getElementById('decAgainBtn').textContent = t.decAgainBtn;

  const witnessed = document.getElementById('decWitnessed');
  if (witnessed) {
    const sentence = (WITNESSED[lang] && WITNESSED[lang][decStateName]) || '';
    witnessed.textContent = sentence;
    witnessed.style.opacity = '0';
  }

  const btns = document.querySelector('.dec-btns');
  if (btns) { btns.style.opacity='0'; btns.style.transition='opacity 1.4s ease'; btns.style.pointerEvents='none'; }

  const backBtn = document.getElementById('backBtn');
  if (backBtn) { backBtn.onclick = () => goHome(); }

  showScreen('s-dec-end', () => {
    // [AE1] decEndLine gets breathing animation — applied via class
    const endLine = document.getElementById('decEndLine');
    if (endLine) endLine.classList.add('breathing-glow');

    setTimeout(() => { if (witnessed) witnessed.style.opacity = '1'; }, 1500);
    // [AE4] Witnessed sentence breathes for longer — buttons at 12s (was 8s)
    setTimeout(() => { if (btns) { btns.style.opacity='1'; btns.style.pointerEvents='all'; } }, 12000);
  });
}

function clearAllDec() { decBreathTimers.forEach(clearTimeout); decBreathTimers = []; }

// ── WELCOME INTRO ──
let wlcStep = 0;
const WLC_TOTAL = 3;

// ── LANDING PARTICLE SCREEN ──
let landingRaf = null;

function startLandingScreen() {
  document.getElementById('s-home').classList.remove('active');
  document.getElementById('s-landing').classList.add('active');

  const lcv = document.getElementById('landing-cv');
  const lc = lcv.getContext('2d');
  const hint = document.getElementById('landingHint');

  function resizeLanding() { lcv.width = innerWidth; lcv.height = innerHeight; }
  resizeLanding();
  let resizeCleanedUp = false;
  window.addEventListener('resize', resizeLanding);
  function cleanupLandingResize() {
    if (!resizeCleanedUp) { window.removeEventListener('resize', resizeLanding); resizeCleanedUp = true; }
  }

  // Particle state — small, blurry, drifting
  let px = innerWidth * 0.5;
  let py = innerHeight * 0.45;
  let vx = (Math.random() - 0.5) * 0.4;
  let vy = (Math.random() - 0.5) * 0.4;
  let phase = Math.random() * Math.PI * 2;
  let phV = 0.008 + Math.random() * 0.006;

  // Appearance state — starts tiny/blurry, sharpens on tap
  let focusLevel = 0;   // 0 = blurry/dim, 1 = sharp/bright
  let tapFocus = false;
  let collapsing = false;
  let collapseProgress = 0;
  let hintAlpha = 0;
  let age = 0;

  // Show hint after 2.5s
  setTimeout(() => { hintAlpha = 1; hint.style.color = `rgba(240,204,136,0.30)`; }, 2500);

  function drawLanding() {
    if (!document.getElementById('s-landing').classList.contains('active')) {
      cleanupLandingResize(); return;
    }
    lc.clearRect(0, 0, lcv.width, lcv.height);
    phase += phV;
    age++;

    // Drift — gentle Brownian motion with soft boundary
    vx += (Math.random() - 0.5) * 0.04;
    vy += (Math.random() - 0.5) * 0.04;
    vx *= 0.96; vy *= 0.96;
    // Push away from edges
    const marg = 80;
    if (px < marg) vx += 0.08;
    if (px > innerWidth - marg) vx -= 0.08;
    if (py < marg) vy += 0.08;
    if (py > innerHeight - marg) vy -= 0.08;
    px += vx; py += vy;

    // Focus transition
    if (tapFocus && !collapsing) {
      focusLevel = Math.min(focusLevel + 0.04, 1);
    } else if (!tapFocus && !collapsing) {
      focusLevel = Math.max(focusLevel - 0.01, 0);
    }

    const breathe = 0.88 + 0.12 * Math.sin(phase);

    if (collapsing) {
      // Particle implodes inward, screen fades
      collapseProgress += 0.025;
      const t = Math.min(collapseProgress, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      // Particle shrinks and sharpens to nothing
      const r = (9 + focusLevel * 6) * breathe * (1 - eased);
      const gR = r * (4.5 - eased * 3);
      const alpha = 1 - eased;

      // Glow
      const g = lc.createRadialGradient(px, py, 0, px, py, gR);
      g.addColorStop(0, `rgba(240,204,136,${(alpha * 0.45).toFixed(3)})`);
      g.addColorStop(0.5, `rgba(240,204,136,${(alpha * 0.12).toFixed(3)})`);
      g.addColorStop(1, 'rgba(240,204,136,0)');
      lc.fillStyle = g;
      lc.beginPath(); lc.arc(px, py, gR, 0, Math.PI * 2); lc.fill();

      // Core
      lc.globalAlpha = alpha * (0.5 + focusLevel * 0.5);
      lc.fillStyle = 'rgba(240,210,140,1)';
      lc.beginPath(); lc.arc(px, py, Math.max(r, 0.5), 0, Math.PI * 2); lc.fill();
      lc.globalAlpha = 1;

      if (collapseProgress >= 1) {
        cleanupLandingResize();
        cancelAnimationFrame(landingRaf);
        localStorage.setItem('field_welcomed_landing', '1');
        buildWelcome();
        document.getElementById('s-landing').classList.remove('active');
        document.getElementById('s-welcome').classList.add('active');
        const w0 = document.getElementById('wlc0');
        if (w0) {
          w0.style.opacity = '0'; w0.style.transition = 'none'; w0.classList.add('on');
          requestAnimationFrame(() => requestAnimationFrame(() => {
            w0.style.transition = 'opacity 1.2s ease'; w0.style.opacity = '1';
          }));
        }
        return;
      }
    } else {
      // Normal drifting particle — same scale as app SpParticles
      const coreR = (9 + focusLevel * 6) * breathe;
      const glowR = coreR * (4.5 - focusLevel * 2); // wide hazy glow when unfocused, tighter when focused
      const coreAlpha = 0.32 + focusLevel * 0.55;
      const glowAlpha = 0.10 + focusLevel * 0.20;

      // Soft gaussian glow
      const g = lc.createRadialGradient(px, py, 0, px, py, glowR);
      g.addColorStop(0, `rgba(240,204,136,${(glowAlpha * 1.8).toFixed(3)})`);
      g.addColorStop(0.3, `rgba(240,204,136,${glowAlpha.toFixed(3)})`);
      g.addColorStop(1, 'rgba(240,204,136,0)');
      lc.fillStyle = g;
      lc.beginPath(); lc.arc(px, py, glowR, 0, Math.PI * 2); lc.fill();

      // Core dot
      lc.globalAlpha = coreAlpha;
      lc.fillStyle = 'rgba(255,240,200,1)';
      lc.beginPath(); lc.arc(px, py, coreR, 0, Math.PI * 2); lc.fill();
      // Hot centre
      lc.globalAlpha = coreAlpha * 0.7;
      lc.fillStyle = 'rgba(255,255,255,1)';
      lc.beginPath(); lc.arc(px, py, coreR * 0.35, 0, Math.PI * 2); lc.fill();
      lc.globalAlpha = 1;
    }

    landingRaf = requestAnimationFrame(drawLanding);
  }
  landingRaf = requestAnimationFrame(drawLanding);

  // Pointer/touch: hold to focus, tap to collapse
  let holdTimer = null;

  function onPointerDown(e) {
    if (collapsing) return;
    tapFocus = true;
    // After holding focused for 0.4s, collapse
    holdTimer = setTimeout(() => {
      if (tapFocus && !collapsing) triggerCollapse();
    }, 400);
  }

  function onPointerUp(e) {
    clearTimeout(holdTimer);
    // Quick tap also collapses if focused enough
    if (tapFocus && !collapsing && focusLevel > 0.4) {
      triggerCollapse();
    } else {
      tapFocus = false;
    }
  }

  function triggerCollapse() {
    if (collapsing) return;
    collapsing = true;
    tapFocus = false;
    hint.style.color = 'rgba(240,204,136,0)';
    if (navigator.vibrate) navigator.vibrate(30);
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    playCollapseSignature();
    document.getElementById('s-landing').removeEventListener('click', onTap);
    document.getElementById('s-landing').removeEventListener('touchend', onPointerUp);
    document.getElementById('s-landing').removeEventListener('mousedown', onPointerDown);
    document.getElementById('s-landing').removeEventListener('touchstart', onPointerDown);
  }

  // Simple tap fallback
  function onTap(e) {
    if (collapsing) return;
    tapFocus = true;
    focusLevel = Math.max(focusLevel, 0.5);
    setTimeout(() => { if (!collapsing) triggerCollapse(); }, 180);
  }

  document.getElementById('s-landing').addEventListener('mousedown', onPointerDown);
  document.getElementById('s-landing').addEventListener('mouseup', onPointerUp);
  document.getElementById('s-landing').addEventListener('touchstart', e => { e.preventDefault(); onPointerDown(e); }, { passive: false });
  document.getElementById('s-landing').addEventListener('touchend', e => { e.preventDefault(); onPointerUp(e); });
  document.getElementById('s-landing').addEventListener('click', onTap);
}

function buildWelcome() {
  const t = TRANSLATIONS[lang];
  document.getElementById('wlc0-big').innerHTML = t.welcomeCard0Big.replace(/\n/g,'<br>');
  document.getElementById('wlc0-small').innerHTML = t.welcomeCard0Small.replace(/\n/g,'<br>');
  document.getElementById('wlc1-big').innerHTML = t.welcomeCard1Big.replace(/\n/g,'<br>');
  document.getElementById('wlc1-small').innerHTML = t.welcomeCard1Small.replace(/\n/g,'<br>');
  document.getElementById('wlc2-big').innerHTML = t.welcomeCard2Big.replace(/\n/g,'<br>');
  t.wlcMvLabels.forEach((l,i) => { const el = document.getElementById('wlc-ml'+i); if(el) el.textContent = l; });
  t.wlcMvHints.forEach((h,i) => { const el = document.getElementById('wlc-mh'+i); if(el) el.textContent = h; });
  document.getElementById('wlcEnterBtn').textContent = t.wlcEnterBtn;
  document.getElementById('wlcTapHint').textContent = t.wlcTapHint;
  wlcStep = 0;
  updateWlcDots();
}

function updateWlcDots() {
  for (let i = 0; i < WLC_TOTAL; i++) {
    const d = document.getElementById('wdot'+i);
    if (d) d.classList.toggle('on', i <= wlcStep);
  }
  const hint = document.getElementById('wlcTapHint');
  if (hint) hint.style.opacity = wlcStep === WLC_TOTAL - 1 ? '0' : '1';
}

function advanceWelcome() {
  if (wlcStep >= WLC_TOTAL - 1) return;
  const cur = document.getElementById('wlc' + wlcStep);
  if (!cur) return;
  cur.style.transition = 'opacity 0.8s ease'; cur.style.opacity = '0';
  setTimeout(() => {
    cur.classList.remove('on');
    wlcStep++;
    const next = document.getElementById('wlc' + wlcStep);
    if (next) {
      next.style.opacity = '0'; next.style.transition = 'none'; next.classList.add('on');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        next.style.transition = 'opacity 1.1s ease'; next.style.opacity = '1';
      }));
    }
    updateWlcDots();
  }, 800);
}

function enterFromWelcome() {
  localStorage.setItem('field_welcomed', '1');
  showScreen('s-home', () => { initSpParticles(12); tryDrone(); });
}

document.getElementById('s-welcome').addEventListener('click', e => {
  if (e.target.id === 'wlcEnterBtn' || e.target.classList.contains('wlc-enter')) return;
  advanceWelcome();
});
document.getElementById('wlcEnterBtn').addEventListener('click', e => {
  e.stopPropagation();
  enterFromWelcome();
});

// ── CIRCADIAN PALETTE ──
function applyCircadianPalette() {
  const h = new Date().getHours();
  const root = document.documentElement.style;

  if (h >= 5 && h < 8) {
    // Dawn — rose-gold, warm amber
    root.setProperty('--gold', '#c9956a');
    root.setProperty('--gold-bright', '#f0b878');
    root.setProperty('--bg', '#0d0806');
    root.setProperty('--cream', '#f0dfc8');
  } else if (h >= 8 && h < 17) {
    // Day — default palette, slightly brighter
    root.setProperty('--gold', '#c9a96e');
    root.setProperty('--gold-bright', '#f0cc88');
    root.setProperty('--bg', '#0a0805');
    root.setProperty('--cream', '#f0e6d0');
  } else if (h >= 17 && h < 20) {
    // Dusk — deeper amber, slightly dimmer
    root.setProperty('--gold', '#c49058');
    root.setProperty('--gold-bright', '#e8b870');
    root.setProperty('--bg', '#0c0906');
    root.setProperty('--cream', '#ecdbc0');
  } else {
    // Night — cooler, moonlike silver-gold
    root.setProperty('--gold', '#a89878');
    root.setProperty('--gold-bright', '#d4c098');
    root.setProperty('--bg', '#080706');
    root.setProperty('--cream', '#e0d8cc');
  }
}

// ── INIT ──
applyLang();
applyCircadianPalette();

// Decohere violet palette — applied on entry, restored on exit
function applyDecoherePalette() {
  const root = document.documentElement.style;
  root.setProperty('--gold',       '#9880b8'); // soft violet
  root.setProperty('--gold-bright','#c8aae0'); // bright mauve
  root.setProperty('--bg',         '#070609'); // deep violet-black
  root.setProperty('--cream',      '#e0d8ec'); // lavender cream
}
function restoreCircadianPalette() {
  // Remove overrides — cascade falls back to :root vars set by applyCircadianPalette
  const root = document.documentElement.style;
  root.removeProperty('--gold');
  root.removeProperty('--gold-bright');
  root.removeProperty('--bg');
  root.removeProperty('--cream');
  applyCircadianPalette(); // reapply time-of-day
}
if (fontLarge) document.body.classList.add('fs-large');

if (!localStorage.getItem('field_welcomed')) {
  startLandingScreen();
} else {
  initSpParticles(12);
  tryDrone();
}

window.addEventListener('keydown', e => {
  if (e.key===' '||e.key==='Enter') {
    const active = document.querySelector('.screen.active');
    if (active && active.id==='s-init') advanceStep();
  }
});
