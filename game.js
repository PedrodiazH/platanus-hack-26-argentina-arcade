// ═══════════════════════════════════════════════════════════════
//  CIA SURVIVOR — Operation Parking Lot
//  Platanus Hack 2026 | Pure Phaser 3 game.js
// ═══════════════════════════════════════════════════════════════

const GW = 800, GH = 600;
const MAP_W = 3200, MAP_H = 2400;
const STORAGE_KEY = 'cia-survivor-scores';

// ── XP / LEVEL SYSTEM ──────────────────────────────────────────
const LEVEL_THRESHOLDS = [0, 50, 150, 300, 450, 600, 800, 1000, 1200, 1500];
const LEVEL_NAMES = [
  'CIUDADANO', 'QUE SUCEDE', 'POR QUE ME ATACAN', 'YO NO SOY A QUIEN BUSCAN',
  'SI ME ATACAN LOS ATACO', 'SE LAS VERÁN CONMIGO', 'NO MAS REPRESIÓN',
  'NI PERDON NI OLVIDO', 'GUERRILLERO ALPHA', 'KILL TRUMP'
];

function getLevel(xp) {
  let lv = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) lv = i + 1;
  }
  return Math.min(lv, LEVEL_THRESHOLDS.length);
}
function xpForLevel(lv) { return LEVEL_THRESHOLDS[Math.min(lv - 1, LEVEL_THRESHOLDS.length - 1)]; }
function xpForNext(lv)  { return lv >= LEVEL_THRESHOLDS.length ? Infinity : LEVEL_THRESHOLDS[lv]; }

// ── HIGH SCORE ─────────────────────────────────────────────────
function saveScore(name, xp, kills) {
  try {
    let s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    s.push({ name: name.toUpperCase().substring(0, 12), xp, kills, date: new Date().toLocaleDateString('es-CL') });
    s.sort((a, b) => b.xp - a.xp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s.slice(0, 8)));
  } catch (e) {}
}
function loadScores() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
}

// ═══════════════════════════════════════════════════════════════
//  WEB AUDIO ENGINE
// ═══════════════════════════════════════════════════════════════
const SFX = (() => {
  let ctx = null, masterGain = null, musicGain = null;
  let musicInterval = null, musicOn = false;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.5;
      masterGain.connect(ctx.destination);
    }
    return ctx;
  }

  function tone(freq, type, dur, vol, delay = 0) {
    const c = getCtx();
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + delay);
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
    o.connect(g); g.connect(masterGain);
    o.start(c.currentTime + delay); o.stop(c.currentTime + delay + dur + 0.05);
  }

  function noise(dur, vol) {
    const c = getCtx();
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(g); g.connect(masterGain);
    src.start(); src.stop(c.currentTime + dur); 
  }

  // SFX
  function shoot()          { tone(880,'square',0.04,0.16); tone(440,'square',0.07,0.09,0.02); }
  function enemyDie()       { tone(300,'sawtooth',0.05,0.20); tone(150,'sawtooth',0.09,0.16,0.04); noise(0.06,0.10); }
  function playerHit()      { tone(120,'sawtooth',0.15,0.28); noise(0.12,0.22); }
  function levelUp()        { [523,659,784,1047].forEach((f,i) => tone(f,'square',0.18,0.20,i*0.12)); }
  function upgradeSelect()  { tone(440,'square',0.06,0.13); tone(550,'square',0.06,0.11,0.06); }
  function upgradeConfirm() { tone(660,'square',0.10,0.20); tone(880,'square',0.10,0.20,0.10); tone(1100,'square',0.12,0.20,0.20); }
  function bombExplode()    { tone(80,'sawtooth',0.35,0.38); noise(0.35,0.48); }
  function boomerangThrow() { tone(600,'sine',0.12,0.13); tone(700,'sine',0.08,0.09,0.08); }
  function clockActivate()  { tone(1200,'sine',0.5,0.18); tone(900,'sine',0.5,0.14,0.15); }
  function bossSiren()      { tone(220,'sawtooth',0.4,0.33); tone(440,'sawtooth',0.4,0.33,0.4); tone(220,'sawtooth',0.4,0.33,0.8); }
  function bossAttackSfx()  { tone(180,'square',0.20,0.26); noise(0.08,0.18); }
  function menuMove()       { tone(330,'square',0.05,0.11); }
  function menuStart()      { [440,550,660,880].forEach((f,i) => tone(f,'square',0.12,0.18,i*0.07)); }

  function startMusic() {
    if (musicOn) return;
    musicOn = true;
    const c = getCtx();
    musicGain = c.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(masterGain);
    musicGain.gain.linearRampToValueAtTime(0.3, c.currentTime + 1);

    const melLine = [ 311.13, 0, 369.99, 0, 466.16, 369.99, 311.13, 0, 311.13, 0, 369.99, 0, 466.16, 369.99, 277.18, 0 ];
    const bassLine = [ 155.56, 0, 0, 0, 138.59, 0, 0, 0, 155.56, 0, 0, 0, 116.54, 0, 0, 0 ];
    let step = 0;
    const beat = 60 / 140;

    function playStep() {
      if (!musicOn) return;
      const ctx = getCtx(), now = ctx.currentTime;
      const bf = bassLine[step % bassLine.length];
      if (bf > 0) {
        const bo = ctx.createOscillator(), bg = ctx.createGain();
        bo.type = 'square'; bo.frequency.value = bf;
        bg.gain.setValueAtTime(0.3, now); bg.gain.exponentialRampToValueAtTime(0.0001, now + beat * 2);
        bo.connect(bg); bg.connect(musicGain); bo.start(now); bo.stop(now + beat * 2);
      }
      const mf = melLine[step % melLine.length];
      if (mf > 0) {
        const mo = ctx.createOscillator(), mg = ctx.createGain();
        mo.type = 'square'; mo.frequency.value = mf;
        mg.gain.setValueAtTime(0.12, now); mg.gain.exponentialRampToValueAtTime(0.0001, now + beat * 0.6);
        mo.connect(mg); mg.connect(musicGain); mo.start(now); mo.stop(now + beat * 0.7);
      }
      step++;
    }
    playStep();
    musicInterval = setInterval(playStep, beat * 1000);
  }

  function stopMusic() {
    if (!musicOn) return;
    musicOn = false;
    clearInterval(musicInterval);
    if (musicGain) { try { musicGain.gain.linearRampToValueAtTime(0, getCtx().currentTime + 0.5); } catch(e){} }
  }

  function resumeCtx() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  return { shoot, enemyDie, playerHit, levelUp, upgradeSelect, upgradeConfirm,
           bombExplode, boomerangThrow, clockActivate, bossSiren, bossAttackSfx,
           menuMove, menuStart, startMusic, stopMusic, resumeCtx };
})();

// ═══════════════════════════════════════════════════════════════
//  BOOT SCENE — generate all textures procedurally
// ═══════════════════════════════════════════════════════════════
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Player rediseñado: Camisa azul táctica, cabello castaño
    this._spr(g, [
      '....HHHH........',
      '...HSSSSSH......',
      '...BSSBSSB......',
      '...BSSSSSSB.....',
      '....BSBSB.......',
      '....AAAAAA......',
      '...AAAAAAAAB....',
      'SBAAAAXXAAAABS..',
      'SBAAAXXXXAAABS..',
      '...AAAAAAAAB....',
      '....DDDDD.......',
      '....D...D.......',
      '....D...D.......',
      '....K...K.......',
      '................',
      '................'
    ], { H:'#4a2e15', S:'#f0c8a0', B:'#111111', A:'#1e5b99', X:'#2a2a2a', D:'#1a1a1a', K:'#111111', '.':null }, 32, 32, 'player');

    // Enemy rediseñado: Traje rojo, cabello rubio, lentes oscuros
    this._spr(g, [
      '....YYYY........',
      '...YSSSSSY......',
      '...BEEEEEEB.....',
      '...BSSSSSSB.....',
      '....BSWSB.......',
      '....RRRRRR......',
      '...RRRRRRRRB....',
      'SBRRRRRRRRRRBS..',
      'SBRRRRRRRRRRBS..',
      '...RRRRRRRRB....',
      '....RRRRR.......',
      '....R...R.......',
      '....R...R.......',
      '....K...K.......',
      '................',
      '................'
    ], { Y:'#ffcc00', S:'#ffccaa', B:'#111111', E:'#000000', W:'#ffffff', R:'#cc0000', K:'#222222', '.':null }, 32, 32, 'enemy');

    this._spr(g, [
      '.........OOOOOOOO...........', '......OOOOOOOOOOOOOO........',
      '.....OOOOOOOOOOOOOOOO.......', '.....OSSSSSSSSSSSSSSO.......',
      '.....OSSSSSSSSSSSSSSO.......', '......SSGSSSSSSSGSSS........',
      '......SSSSSSSSSSSSSS........', '......SSNSSSSSSSNSSS........',
      '.......SSSSSSSSSSSS.........', '.......SSPPPPPPPPSS.........',
      '........SSSSSSSSSS..........', '.......BBBBBBBBBBBB.........',
      '.....BBBBBBWWRRWWBBBB.......', '...BBBBBBBBWWRRWWBBBBBB.....',
      '..BBBBBBBBBWWRRWWBBBBBBB....', '..BBBBBBBBBBWRRBBBBBBBBB....',
      '..BBBBBBBBBBWRRBBBBBBBBB....', '..BBBBBBBBBBWRRBBBBBBBBB....',
      '...BBBBBBBBBRRBBBBBBBBB.....', '.....BBBBBBBBBBBBBBBB.......',
      '.......BBBBBBBBBBBB.........', '............................'
    ], { O:'#ffcc00', S:'#ffaa66', B:'#002244', W:'#ffffff', R:'#dd0000', G:'#4488ff', N:'#e6994c', P:'#cc7777', '.':null }, 48, 48, 'trump');

    g.fillStyle(0xffee44); g.fillRect(0,0,8,8);   g.generateTexture('bullet',8,8);   g.clear();
    g.fillStyle(0xff2222); g.fillRect(0,0,10,10); g.generateTexture('bbullet',10,10); g.clear();
    g.lineStyle(5,0x8b4513); g.beginPath(); g.moveTo(4,4); g.lineTo(16,28); g.lineTo(28,4); g.strokePath();
    g.generateTexture('boomerang',32,32); g.clear();
    g.fillStyle(0xff4500,0.8); g.fillCircle(40,40,40); g.fillStyle(0xffaa00,0.9); g.fillCircle(40,40,28); g.fillStyle(0xffff00,1.0); g.fillCircle(40,40,16); g.generateTexture('explosion',80,80); g.clear();
    g.fillStyle(0x950606); g.fillCircle(14,14,12); g.fillStyle(0xff6600); g.fillRect(12,0,4,8);   g.generateTexture('bomb',28,28);  g.clear();
    g.fillStyle(0xffd700); g.fillRect(6,0,20,4); g.fillStyle(0x00ccff,0.6); g.fillTriangle(16,16,6,4,26,4); g.fillTriangle(16,16,6,28,26,28); g.generateTexture('hourglass',32,32); g.clear();
    g.destroy();
    this.scene.start('Home');
  }

  _spr(g, rows, cm, w, h, key) {
    const pw = w/rows[0].length, ph = h/rows.length;
    for (let r=0;r<rows.length;r++) for (let c=0;c<rows[r].length;c++) {
      const col = cm[rows[r][c]]; if (!col) continue;
      g.fillStyle(parseInt(col.replace('#','0x'))); g.fillRect(c*pw,r*ph,pw,ph);
    }
    g.generateTexture(key,w,h); g.clear();
  }
}

// ═══════════════════════════════════════════════════════════════
//  HOME SCENE
// ═══════════════════════════════════════════════════════════════
class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }

  create() {
    this.input.once('pointerdown', () => SFX.resumeCtx());
    this.input.keyboard.once('keydown', () => SFX.resumeCtx());

    this._buildBg();
    this._buildTitle();
    this._selectedIdx = 0;
    this._buildMenu();
    this._buildFooter();
    this._setupKeys();
    this._updateHighlight();

    this._agent = this.add.image(GW/2, 210, 'player').setScale(3.2).setDepth(10);
    this.tweens.add({ targets:this._agent, y:218, duration:700, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    this.time.delayedCall(200, () => SFX.startMusic());
  }

  _buildBg() {
    const bg = this.add.graphics();
    // Gradiente noche púrpura a fuego infernal
    bg.fillGradientStyle(0x080210,0x080210,0x4a0a00,0x4a0a00,1);
    bg.fillRect(0,0,GW,GH);
    for (let y=0;y<GH;y+=4) { bg.fillStyle(0x000000,0.15); bg.fillRect(0,y,GW,2); }
    const c = this.add.graphics();
    c.lineStyle(2,0xffaa00,0.5); // Acentos fuego
    const bw=44;
    [[10,10],[GW-10-bw,10],[10,GH-10-bw],[GW-10-bw,GH-10-bw]].forEach(([x,y]) => {
      const ir=x>GW/2, ib=y>GH/2;
      c.strokePoints([{x:x+(ir?bw:0),y},{x,y},{x,y:y+(ib?bw:0)}],false);
    });
    const seal=this.add.graphics().setDepth(2);
    seal.lineStyle(1,0xffaa00,0.05);
    for (let r=60;r<300;r+=45) seal.strokeCircle(GW/2,GH/2,r);
  }

  _buildTitle() {
    const title = this.add.text(GW/2,65,'SURVIVOR 2026',{...PF,fontSize:'48px',color:'#ffffff',stroke:'#cc0000',strokeThickness:4}).setOrigin(0.5).setDepth(6);
    this.add.text(GW/2,102,'— Corre, destruye, sobrevive —',{...PF,fontSize:'18px',color:'#ffaa00'}).setOrigin(0.5).setDepth(6);
    this.time.addEvent({ delay:3200,loop:true,callback:()=>{
      this.tweens.add({ targets:title, x:GW/2+Phaser.Math.Between(-3,3), duration:60, yoyo:true, repeat:3, onComplete:()=>{title.x=GW/2;} });
    }});
  }

  _buildMenu() {
    this._menuLabels  = ['INICIAR MISION','CONTROLES','ACERCA DEL JUEGO','MEJORES AGENTES'];
    this._menuActions = ['start','controls','about','scores'];
    this._menuItems   = [];
    const startY = 295;
    this._menuLabels.forEach((label,i) => {
      const bg  = this.add.rectangle(GW/2,startY+i*60,430,46,0x000000,0).setDepth(7);
      const txt = this.add.text(GW/2,startY+i*60,label,{...PF,fontSize:'13px',color:'#cccccc'}).setOrigin(0.5).setDepth(8);
      txt.setInteractive({useHandCursor:true});
      txt.on('pointerover',()=>{this._selectedIdx=i;this._updateHighlight();});
      txt.on('pointerdown',()=>{this._selectedIdx=i;this._triggerAction();});
      this._menuItems.push({bg,txt});
    });
  }

  _buildFooter() {
    this.add.text(GW/2,GH-20,'© 2026 PLATANUS HACK  —  CLASSIFIED LEVEL 5',{...PF,fontSize:'6px',color:'#663322'}).setOrigin(0.5).setDepth(5);
  }

  _updateHighlight() {
    this._menuItems.forEach(({bg,txt},i) => {
      if (i===this._selectedIdx) {
        txt.setColor('#ffaa00').setText('▶ '+this._menuLabels[i]+' ◀');
        bg.setFillStyle(0xffaa00,0.15);
      } else {
        txt.setColor('#cccccc').setText(this._menuLabels[i]);
        bg.setFillStyle(0x000000,0);
      }
    });
  }

  _setupKeys() {
    const up   = () => { SFX.menuMove(); this._selectedIdx=(this._selectedIdx+this._menuLabels.length-1)%this._menuLabels.length; this._updateHighlight(); };
    const down = () => { SFX.menuMove(); this._selectedIdx=(this._selectedIdx+1)%this._menuLabels.length; this._updateHighlight(); };
    this.input.keyboard.on('keydown-UP',    up);
    this.input.keyboard.on('keydown-DOWN',  down);
    this.input.keyboard.on('keydown-W',     up);
    this.input.keyboard.on('keydown-S',     down);
    this.input.keyboard.on('keydown-ENTER', ()=>this._triggerAction());
  }

  _triggerAction() {
    const action = this._menuActions[this._selectedIdx];
    if (action==='start') {
      SFX.menuStart();
      this.cameras.main.fadeOut(350,0,0,0);
      this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('Game'));
    } else if (action==='controls') this._showPanel(this._controlsLines(), '[ CONTROLES ]');
    else if (action==='about')      this._showPanel(this._aboutLines(),    '[ ACERCA DEL JUEGO ]');
    else if (action==='scores')     this._showPanel(this._scoresLines(),   '[ MEJORES AGENTES ]');
  }

  _controlsLines() { return [
    {text:'JOYSTICK / W A S D',          color:'#ffcc00',size:'12px'},
    {text:'Mover al agente por el mapa', color:'#ddaa88',size:'9px'},
    {text:''},
    {text:'DISPARO AUTOMATICO',          color:'#ffcc00',size:'12px'},
    {text:'hacia la ultima direccion',   color:'#ddaa88',size:'9px'},
    {text:''},
    {text:'BTN1 / ENTER',               color:'#ffcc00',size:'12px'},
    {text:'Confirmar en menu habilidades',color:'#ddaa88',size:'9px'},
    {text:''},
    {text:'⚠ BOSS aparece a 1500 XP',   color:'#ff4444',size:'9px'},
  ]; }

  _aboutLines() { return [
    {text:'Eres un ciudadano común del 2026',  color:'#eebb99',size:'18px'},
    {text:'Estas en el estacionamiento central de tu ciudad',color:'#eebb99',size:'18px'},
    {text:''},
    {text:'Se cree que eres infiltrado de fuerzas externas',color:'#eebb99',size:'18px'},
    {text:''},
    {text:'Que el conflicto no nos tome sin cuidado',color:'#eebb99',size:'18px'},
    {text:'• Acumula XP eliminando enemigos',color:'#ffaa00',size:'12px'},
    {text:'• Cuidado con la oleada a los 1200 XP', color:'#ffaa00',size:'12px'},
    {text:'• A 1500 XP aparece el BOSS FINAL...',color:'#ff4444',size:'12px'},
  ]; }

  _scoresLines() {
    const scores = loadScores();
    if (!scores.length) return [{text:'SIN REGISTROS AUN',color:'#553322',size:'10px'}];
    return scores.map((s,i) => ({
      text:`#${i+1}  ${s.name||'AGENTE'} - ${s.xp} XP - ${s.kills||0} KILLS`,
      color:i===0?'#ffcc00':'#ddaa88', size:'10px'
    }));
  }

  _showPanel(lines, titleStr) {
    const d=50, objs=[];
    const ov = this.add.rectangle(GW/2,GH/2,GW,GH,0x000000,0.93).setDepth(d); objs.push(ov);
    objs.push(this.add.rectangle(GW/2,GH/2,710,510,0x000000).setDepth(d+1).setStrokeStyle(2,0xffaa00));
    objs.push(this.add.rectangle(GW/2,GH/2,702,502,0,0).setDepth(d+1).setStrokeStyle(1,0xcc4400));
    objs.push(this.add.text(GW/2,GH/2-222,titleStr,{...PF,fontSize:'14px',color:'#ffaa00'}).setOrigin(0.5).setDepth(d+2));
    lines.forEach((line,i) => {
      objs.push(this.add.text(GW/2,GH/2-168+i*34,line.text||'',{...PF,fontSize:line.size||'9px',color:line.color||'#ddaa88'}).setOrigin(0.5).setDepth(d+2));
    });
    const backBtn = this.add.text(GW/2,GH/2+220,'◀  VOLVER  (ESC)',{...PF,fontSize:'10px',color:'#4a9eff'}).setOrigin(0.5).setDepth(d+2).setInteractive({useHandCursor:true});
    backBtn.on('pointerdown',close); objs.push(backBtn);
    const escKey = this.input.keyboard.addKey('ESC');
    function close() { objs.forEach(o=>o.destroy()); escKey.destroy(); }
    escKey.on('down',close);
  }
}

// ═══════════════════════════════════════════════════════════════
//  GAME SCENE
// ═══════════════════════════════════════════════════════════════
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    SFX.resumeCtx(); SFX.startMusic();
    this._initState();
    this._buildMapVisuals();
    this._buildStaticObstacles();
    this._buildPlayer();
    this._buildHUD();
    this._setupPhysics();
    this._setupKeys();
    this._setupSpawner();
    this.cameras.main.fadeIn(400,0,0,0);
  }

  _initState() {
    this.st = {
      startTime: this.time.now,
      xp:0, level:1, kills:0, lives:3, maxLives:3,
      invuln:false, gameOver:false, paused:false,
      pSpeed:165, fx:1, fy:0,
      nextFire:0, fireRate:1200,
      twinLv:0,
      bombLv:0, nextBomb:0,
      boomLv:0, nextBoom:0,
      clockLv:0, nextClock:0, clockActive:false, clockTimer:0,
      bossSpawned:false, baseEnemySpeed:52, spawnDelay:2000,
    };
  }

  // ── MAP VISUALS ──
  _buildMapVisuals() {
    const g = this.add.graphics().setDepth(0);
    
    // Asfalto noche púrpura oscuro
    g.fillStyle(0x0a0510); g.fillRect(0,0,MAP_W,MAP_H);
    
    // Eliminado el bucle de 53,000 puntos para salvar los FPS

    // Líneas de fuego/estacionamiento
    g.lineStyle(1,0x3a1005,1);
    for (let ry = 120; ry < MAP_H - 100; ry += 190) {
      for (let col=0; col < MAP_W / 56; col++) g.strokeRect(col*56+14, ry, 56, 95);
    }
    
    g.lineStyle(2,0x4a1505,0.7);
    for (let y = 215; y < MAP_H - 100; y += 190) { g.beginPath(); g.moveTo(0,y); g.lineTo(MAP_W,y); g.strokePath(); }
    for (let x=0;x<MAP_W;x+=60) { g.fillStyle(0x3a1505); g.fillRect(x,MAP_H/2-1,30,2); }

    g.fillStyle(0x05020a);
    g.fillRect(0,0,MAP_W,18); g.fillRect(0,MAP_H-18,MAP_W,18);
    g.fillRect(0,0,18,MAP_H); g.fillRect(MAP_W-18,0,18,MAP_H);

    // Luces fuego infernal
    for (let lx=200;lx<MAP_W;lx+=350) for (let ly=200;ly<MAP_H;ly+=350) { g.fillStyle(0x5a1100,0.3); g.fillEllipse(lx,ly,130,130); }
    for (let px=200;px<MAP_W;px+=350) for (let py=200;py<MAP_H;py+=350) { g.fillStyle(0x1a0a05); g.fillRect(px-3,py,6,26); g.fillStyle(0xffaa55,0.15); g.fillEllipse(px,py,22,9); }

    this.add.text(MAP_W/2,MAP_H/2,'CIA',{...PF,fontSize:'150px',color:'#220811'}).setOrigin(0.5).setDepth(0).setAlpha(0.65);

    this._carGfx = this.add.graphics().setDepth(2);
    const carColors = [0x1a1a1a,0x2a1515,0x101020,0x2a2010,0x151a1a,0x221105];
    this._obsRects = [];  

    for (let cy = 160; cy < MAP_H - 100; cy += 190) {
      for (let cx = 155; cx < MAP_W - 100; cx += 220) {
        if (Math.random() > 0.3) { 
          this._drawCar(this._carGfx, cx, cy, Phaser.Utils.Array.GetRandom(carColors));
          this._obsRects.push({x: cx + 2, y: cy - 10, w: 64, h: 40});
        }
      }
    }

    [[MAP_W/2-22,25],[MAP_W/2-22,MAP_H-65]].forEach(([bx,by]) => { this._drawBooth(g, bx, by); this._obsRects.push({x:bx, y:by, w:44, h:40}); });

    const totalTires = Math.floor((MAP_W * MAP_H) / 150000); 
    for (let i = 0; i < totalTires; i++) {
      const tx = Phaser.Math.Between(100, MAP_W - 100), ty = Phaser.Math.Between(100, MAP_H - 100);
      this._drawTires(g, tx, ty); this._obsRects.push({x: tx - 15, y: ty - 15, w: 30, h: 30});
    }
  }

  _drawCar(g,x,y,bodyColor) {
    g.fillStyle(0x000000,0.35); g.fillEllipse(x+34,y+36,82,18);
    g.fillStyle(bodyColor); g.fillRect(x,y,68,30);
    g.fillStyle(Phaser.Display.Color.ValueToColor(bodyColor).darken(25).color); g.fillRect(x+10,y-14,48,20);
    g.fillStyle(0x1a253a); g.fillRect(x+12,y-12,20,14); g.fillRect(x+36,y-12,20,14);
    g.fillStyle(0x0a0a0a);
    [[x+6,y-6],[x+52,y-6],[x+6,y+26],[x+52,y+26]].forEach(([wx,wy]) => { g.fillEllipse(wx,wy,13,11); g.fillStyle(0x333333); g.fillEllipse(wx,wy,7,6); g.fillStyle(0x0a0a0a); });
    g.fillStyle(0xffffaa); g.fillRect(x,y+8,5,8); g.fillStyle(0xff3333); g.fillRect(x+63,y+8,5,8);
  }

  _drawBooth(g,x,y) {
    g.fillStyle(0x1a1515); g.fillRect(x,y,44,40); g.fillStyle(0x0e0505); g.fillRect(x+6,y+6,14,12); g.fillRect(x+24,y+6,14,12);
    g.fillStyle(0x2a1515); g.fillRect(x,y+34,44,6); g.lineStyle(1,0x3a1a1a); g.strokeRect(x,y,44,40);
  }

  _drawTires(g,x,y) {
    g.fillStyle(0x0d0d0d); g.fillEllipse(x,y,24,24); g.fillStyle(0x222222); g.fillEllipse(x,y,13,13);
    g.fillStyle(0x0d0d0d); g.fillEllipse(x+15,y-9,20,20); g.fillStyle(0x222222); g.fillEllipse(x+15,y-9,11,11);
  }

  _buildStaticObstacles() {
    this._staticGroup = this.physics.add.staticGroup();
    const T=20;
    [{x:MAP_W/2, y:-T/2, w:MAP_W, h:T}, {x:MAP_W/2, y:MAP_H+T/2, w:MAP_W, h:T}, {x:-T/2, y:MAP_H/2, w:T, h:MAP_H}, {x:MAP_W+T/2, y:MAP_H/2, w:T, h:MAP_H}].forEach(({x,y,w,h}) => {
      const wall = this.add.rectangle(x,y,w,h,0x000000,0); this.physics.add.existing(wall,true); this._staticGroup.add(wall);
    });
    this._obsRects.forEach(({x,y,w,h}) => {
      const r = this.add.rectangle(x+w/2, y+h/2, w, h, 0x000000, 0); this.physics.add.existing(r,true); this._staticGroup.add(r);
    });
  }

  _buildPlayer() {
    this.player = this.physics.add.sprite(MAP_W/2, MAP_H/2, 'player').setScale(1.6).setDepth(20).setCollideWorldBounds(true);
    this.player.body.setSize(18,22).setOffset(7,7);
    this.physics.add.collider(this.player, this._staticGroup);
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player, true, 0.10, 0.10);
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this._activeBooms = [];
  }

  _buildHUD() {
    const d=100, bw=600;
    this.add.rectangle(GW/2,18,bw+6,28,0x1a0505).setScrollFactor(0).setDepth(d).setStrokeStyle(1,0x661100);
    this._xpFill   = this.add.rectangle(GW/2-bw/2,18,0,24,0xffaa00).setScrollFactor(0).setDepth(d+1).setOrigin(0,0.5);
    this._xpLvTxt  = this.add.text(GW/2,42,'NIV 1 — RECLUTA',{...PF,fontSize:'14px',color:'#ffcc00'}).setScrollFactor(0).setDepth(d+1).setOrigin(0.5);
    this._xpAmtTxt = this.add.text(GW/2,18,'0/50 XP',{...PF,fontSize:'12px',color:'#ffffff'}).setScrollFactor(0).setDepth(d+2).setOrigin(0.5);
    this._barW = bw;

    this._livesTxt = this.add.text(10,10,'❤  VIDAS: 3',{...PF,fontSize:'10px',color:'#ff4455'}).setScrollFactor(0).setDepth(d);
    this._killsTxt = this.add.text(GW-10,10,'KILLS: 0 ⭐',{...PF,fontSize:'10px',color:'#ff4400'}).setScrollFactor(0).setDepth(d).setOrigin(1,0);

    this._bossBg   = this.add.rectangle(GW/2,52,bw+6,20,0x1a0000).setScrollFactor(0).setDepth(d).setStrokeStyle(1,0x880000).setVisible(false);
    this._bossFill = this.add.rectangle(GW/2-bw/2,52,bw,16,0xff2222).setScrollFactor(0).setDepth(d+1).setOrigin(0,0.5).setVisible(false);
    this._bossNm   = this.add.text(GW/2,66,'💀 DONALD TRUMP — AMENAZA SUPREMA',{...PF,fontSize:'7px',color:'#ff2222'}).setScrollFactor(0).setDepth(d+1).setOrigin(0.5).setVisible(false);
    this.time.addEvent({delay:500,loop:true,callback:()=>{ if(this._bossNm.visible) this._bossNm.setAlpha(this._bossNm.alpha===1?0.5:1); }});
  }

  _updateXPBar() {
    const {xp,level}=this.st;
    const cur=xpForLevel(level), nxt=xpForNext(level);
    const pct=nxt===Infinity?1:Math.min(1,(xp-cur)/(nxt-cur));
    this._xpFill.width = pct*this._barW;
    this._xpFill.x = GW/2-this._barW/2;
    this._xpLvTxt.setText(`NIV ${level} — ${LEVEL_NAMES[Math.min(level-1,LEVEL_NAMES.length-1)]}`);
    this._xpAmtTxt.setText(`${xp} / ${nxt===Infinity?'∞':nxt} XP`);
    this._livesTxt.setText('❤  VIDAS: '+this.st.lives);
    this._killsTxt.setText('KILLS: '+this.st.kills+' ⭐');
  }

  _updateBossBar(boss) {
    const pct=Math.max(0,boss.hp/boss.maxHp);
    this._bossFill.width=this._barW*pct;
    this._bossFill.x=GW/2-this._barW/2;
  }

  _setupPhysics() {
    this.bullets     = this.physics.add.group({maxSize:150});
    this.enemies     = this.physics.add.group({maxSize:240});
    this.bossBullets = this.physics.add.group({maxSize:120}); 

    this.physics.add.collider(this.bullets, this._staticGroup, (b)=>{ if(b.active) b.destroy(); });
    this.physics.add.collider(this.bossBullets, this._staticGroup, (b)=>{ if(b.active) b.destroy(); });
    this.physics.add.collider(this.enemies, this._staticGroup);
  }

  _setupKeys() {
    this._keys = this.input.keyboard.addKeys({ up:'W', down:'S', left:'A', right:'D', upA:'UP', downA:'DOWN', leftA:'LEFT', rightA:'RIGHT' });
  }

  _setupSpawner() {
    this._spawnTimer = this.time.addEvent({ delay:this.st.spawnDelay, loop:true, callback:this._spawnEnemy, callbackScope:this });
  }

  _spawnEnemy() {
    if (this.st.gameOver||this.st.paused||this.st.bossSpawned) return;
    const cam=this.cameras.main, cx=cam.scrollX, cy=cam.scrollY, margin=55, edge=Phaser.Math.Between(0,3);
    let x,y;
    if      (edge===0) { x=Phaser.Math.Between(cx-margin,cx+GW+margin); y=cy-margin; }
    else if (edge===1) { x=Phaser.Math.Between(cx-margin,cx+GW+margin); y=cy+GH+margin; }
    else if (edge===2) { x=cx-margin; y=Phaser.Math.Between(cy-margin,cy+GH+margin); }
    else               { x=cx+GW+margin; y=Phaser.Math.Between(cy-margin,cy+GH+margin); }

    x=Phaser.Math.Clamp(x,30,MAP_W-30); y=Phaser.Math.Clamp(y,30,MAP_H-30);
    const e=this.enemies.create(x,y,'enemy');
    if (!e) return;
    e.setScale(1.5).setDepth(15); e.body.setSize(18,22).setOffset(7,7); e.hp=1;

    let currentSpeed = this.st.baseEnemySpeed + Math.floor((this.time.now - this.st.startTime) / 14000) * 3;
    if (this.st.xp >= 600) currentSpeed += 8;
    if (this.st.xp >= 800) currentSpeed += 10;
    if (this.st.xp >= 1200 && !this.st.bossSpawned) currentSpeed += 30;
    e.speed = currentSpeed;

    this.physics.add.overlap(this.player,e,()=>{ if (this.st.invuln||this.st.gameOver||this.st.paused) return; this._takeDamage(); });
    this.physics.add.overlap(this.bullets,e,(bullet,enemy)=>{ if (!bullet.active||!enemy.active) return; bullet.destroy(); this._hitEnemy(enemy); });
  }

  // ── BOSS ──────────────────────────────────────────────────
  _spawnBoss() {
    this.st.bossSpawned=true; this._spawnTimer.remove(false); this.enemies.clear(true,true);
    const bx=Phaser.Math.Clamp(this.player.x+Phaser.Math.Between(-350,350),80,MAP_W-80), by=Phaser.Math.Clamp(this.player.y-280,80,MAP_H-80);

    this._boss=this.physics.add.sprite(bx,by,'trump').setScale(2.4).setDepth(18);
    this._boss.body.setSize(30,38).setOffset(9,5);
    this._boss.hp=1000; this._boss.maxHp=1000; this._boss.speed=65;
    this._boss.phase = 1; 

    this.physics.add.collider(this._boss,this._staticGroup);
    this._bossBg.setVisible(true); this._bossFill.setVisible(true); this._bossNm.setVisible(true);
    this._updateBossBar(this._boss);

    this.physics.add.overlap(this.bullets, this._boss, (bossSprite, bulletSprite) => {
      if (!bulletSprite.active) return; bulletSprite.destroy(); this._damageBoss(10); 
    });
    this.physics.add.overlap(this.player,this._boss,()=>{ if (this.st.invuln||this.st.gameOver) return; this._takeDamage(); });
    this.physics.add.overlap(this.player, this.bossBullets, (_,bb)=>{ if (!bb.active) return; bb.destroy(); this._takeDamage(); });

    SFX.bossSiren(); this._showAlert('⚠  BOSS DETECTADO  ⚠\nDONALD TRUMP','#ff2222');
    this._bossAtk=this.time.addEvent({delay:2500,loop:true,callback:this._bossAttack,callbackScope:this});
  }

  _damageBoss(amount) {
    if (!this._boss || !this._boss.active || this._boss.hp <= 0) return;
    this._boss.hp -= amount; this._updateBossBar(this._boss);

    if (this._boss.hp <= 666 && this._boss.phase === 1) {
      this._boss.phase = 2;
      this._boss.speed = 85; 
      this._bossAtk.delay = 1800;
      this._showFloatingText(this._boss.x, this._boss.y - 80, "¡FASE 2!", "#ff0000", 14);
    } else if (this._boss.hp <= 333 && this._boss.phase === 2) {
      this._boss.phase = 3;
      this._bossAtk.delay = 2500; 
      this._showFloatingText(this._boss.x, this._boss.y - 80, "¡FASE 3 RADIAL!", "#ff00ff", 14);
    }

    this._boss.setTint(0xff0000); 
    this.time.delayedCall(100, () => { if (this._boss && this._boss.active) this._boss.clearTint(); });

    if (this._boss.hp % 50 === 0) this._addXP(20);
    if (this._boss.hp <= 0) this._defeatBoss();
  }

  _bossAttack() {
    if (!this._boss||!this._boss.active||this.st.gameOver) return;
    SFX.bossAttackSfx();

    if (this._boss.phase < 3) {
      const count = this._boss.phase === 1 ? 3 : 5;
      const baseAngle = Phaser.Math.Angle.Between(this._boss.x, this._boss.y, this.player.x, this.player.y);
      for (let i = 0; i < count; i++) {
        const angle = baseAngle + (i - Math.floor(count/2)) * 0.25;
        const bb = this.bossBullets.create(this._boss.x, this._boss.y, 'bbullet');
        if (bb) {
          bb.setScale(1.3).setDepth(16).setTint(0xff4444);
          this.physics.velocityFromRotation(angle, 250, bb.body.velocity);
          this.time.delayedCall(2500, () => { if(bb&&bb.active) bb.destroy(); });
        }
      }
    } else {
      const count = 14;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI*2/count)*i + (this.time.now / 500); 
        const bb = this.bossBullets.create(this._boss.x, this._boss.y, 'bbullet');
        if (bb) {
          bb.setScale(1.3).setDepth(16).setTint(0xff00ff);
          this.physics.velocityFromRotation(angle, 195, bb.body.velocity);
          this.time.delayedCall(3000, () => { if(bb&&bb.active) bb.destroy(); });
        }
      }
    }
    this._showFloatingText(this._boss.x, this._boss.y - 60, '"YOU\'RE FIRED!"', '#ffcc00', 10);
  }

  _defeatBoss() {
    if (!this._boss) return;
    this._boss.active=false; this._boss.setVisible(false);
    if (this._bossAtk) this._bossAtk.remove(false);
    this._bossBg.setVisible(false); this._bossFill.setVisible(false); this._bossNm.setVisible(false);
    this.st.gameOver = true;
    this.physics.pause();

    for (let i=0;i<10;i++) {
      this.time.delayedCall(i*120,()=>{
        if (!this.scene.isActive('Game')) return;
        const ex=this.add.sprite(this._boss.x+Phaser.Math.Between(-80,80),this._boss.y+Phaser.Math.Between(-80,80),'explosion').setDepth(19).setScale(2);
        this.tweens.add({targets:ex,alpha:0,scale:3,duration:500,onComplete:()=>ex.destroy()});
        this.cameras.main.shake(200,0.02);
      });
    }
    SFX.bombExplode();
    this._addXP(800);
    this._showAlert('¡¡ MISION CUMPLIDA !!\nBOSS ELIMINADO','#00ff41');

    this.time.delayedCall(3500,()=>{
      SFX.stopMusic();
      this.cameras.main.fade(650,0,0,0);
      this.cameras.main.once('camerafadeoutcomplete',()=>{
        const name = prompt("¡MISION CUMPLIDA! Gracias por salvar a la humanidad.\nIngresa tu nombre para el registro de victoria:", "AGENTE HEROE") || "ANONIMO";
        this.scene.stop('Upgrade'); this.scene.start('GameOver',{xp:this.st.xp, kills:this.st.kills, won:true, name});
      });
    });
  }

  // ── WEAPONS ───────────────────────────────────────────────
  _dropBomb() {
    const bomb=this.add.sprite(this.player.x,this.player.y,'bomb').setDepth(16).setScale(1.3);
    this.tweens.add({targets:bomb,angle:360,duration:500,repeat:4,ease:'Linear'});
    this.tweens.add({targets:bomb,scaleX:1.6,scaleY:1.6,yoyo:true,duration:280,repeat:3});
    this.time.delayedCall(2500,()=>{
      if (!bomb.scene) return;
      const ex=this.add.sprite(bomb.x,bomb.y,'explosion').setDepth(17).setScale(1.3);
      this.cameras.main.shake(300,0.012);
      this.tweens.add({targets:ex,scale:2.8,alpha:0,duration:520,onComplete:()=>ex.destroy()});
      bomb.destroy(); SFX.bombExplode();
      this.enemies.getChildren().forEach(e=>{
        if (!e.active) return;
        if (Phaser.Math.Distance.Between(e.x,e.y,ex.x,ex.y)<105) this._hitEnemy(e);
      });
      if (this._boss && this._boss.active && Phaser.Math.Distance.Between(this._boss.x, this._boss.y, ex.x, ex.y) < 125) {
        this._damageBoss(150); 
      }
    });
  }

  _throwBoomerang() {
    SFX.boomerangThrow();
    const angle=Phaser.Math.FloatBetween(0,Math.PI*2);
    const bm=this.physics.add.sprite(this.player.x,this.player.y,'boomerang').setDepth(16).setScale(1.4);
    this.physics.velocityFromRotation(angle,390,bm.body.velocity);
    bm.returning=false; this._activeBooms.push(bm);
    this.tweens.add({targets:bm,angle:360,duration:380,repeat:-1,ease:'Linear'});
    this.time.delayedCall(1600,()=>{ if(bm.active) bm.returning=true; });
    this.physics.add.overlap(bm,this.enemies,(_,e)=>this._hitEnemy(e));
    if (this._boss) {
      this.physics.add.overlap(bm, this._boss, () => {
        if (!this._boss.active || bm.lastBossHit > this.time.now) return;
        bm.lastBossHit = this.time.now + 400; 
        this._damageBoss(20);
      });
    }
  }

  _activateClock() {
    SFX.clockActivate();
    this.st.clockActive=true; this.st.clockTimer=5;
    const hg=this.add.sprite(GW/2,90,'hourglass').setScrollFactor(0).setDepth(90).setScale(2.5);
    this.tweens.add({targets:hg,angle:180,duration:800,yoyo:true,repeat:2});
    this.tweens.add({targets:hg,alpha:0,delay:4400,duration:500,onComplete:()=>hg.destroy()});
    this._showFloatingText(this.player.x,this.player.y-55,'⏱ TIEMPO LENTO','#4488ff',10);
  }

  // ── COMBAT ────────────────────────────────────────────────
  _hitEnemy(e) {
    if (!e.active) return;
    SFX.enemyDie();
    e.active=false; e.setVisible(false); e.destroy();
    this._spawnParticles(e.x,e.y,'#ff4444',8);
    this.st.kills++;
    this._addXP(10); this._updateXPBar();
  }

  _addXP(amount) {
    const prev=this.st.level;
    this.st.xp+=amount; this.st.level=getLevel(this.st.xp);
    this._updateXPBar();
    if (this.st.level>prev) this._levelUp();
    
    // Spawn de Boss
    if (this.st.xp >= 1500 && !this.st.bossSpawned) {
      this._spawnBoss();
    }
  }

  _levelUp() {
    SFX.levelUp();
    this.cameras.main.flash(350,0,80,0);
    this.st.paused=true; this.physics.pause();
    this.scene.launch('Upgrade',{
      level:this.st.level, state:this.st,
      onDone:(id)=>{ this._applyUpgrade(id); this.st.paused=false; this.physics.resume(); }
    });
  }

  _applyUpgrade(id) {
    const st=this.st;
    switch(id) {
      case 'life':    st.maxLives++; st.lives=Math.min(st.lives+1,st.maxLives); break;
      case 'firerate':st.fireRate=Math.max(200,st.fireRate*0.65); break;
      case 'speed':   st.pSpeed=Math.min(340,st.pSpeed*1.2); break;
      case 'twin1':   st.twinLv=1; break;
      case 'twin2':   st.twinLv=2; break;
      case 'bomb1':   st.bombLv=1; st.nextBomb=0; break;
      case 'bomb2':   st.bombLv=2; break;
      case 'boom1':   st.boomLv=1; st.nextBoom=0; break;
      case 'boom2':   st.boomLv=2; break;
      case 'clock1':  st.clockLv=1; st.nextClock=0; break;
      case 'clock2':  st.clockLv=2; break;
    }
  }

  _takeDamage() {
    if (this.st.invuln||this.st.gameOver) return;
    SFX.playerHit();
    this.st.lives--;
    this._updateXPBar();
    this.cameras.main.shake(220,0.022);
    this.cameras.main.flash(160,90,0,0);
    if (this.st.lives<=0) { this.st.gameOver=true; this._doGameOver(); return; }
    this.st.invuln=true;
    this._flashSprite(this.player,0.14,8,()=>{ this.st.invuln=false; });
  }

  _doGameOver() {
    this.physics.pause();
    if (this._bossAtk) this._bossAtk.remove(false);
    SFX.stopMusic();
    this.cameras.main.fade(650,0,0,0);
    this.cameras.main.once('camerafadeoutcomplete',()=>{
      const name = prompt("MISION FALLIDA.\nIngresa tu nombre para el registro de caídos:", "AGENTE CAIDO") || "AGENTE CAIDO";
      this.scene.stop('Upgrade'); this.scene.start('GameOver',{xp:this.st.xp, kills:this.st.kills, won:false, name});
    });
  }

  // ── HELPERS ───────────────────────────────────────────────
  _flashSprite(sprite,interval=0.13,times=6,onDone) {
    let count=0;
    this.time.addEvent({delay:interval*1000,repeat:times*2,callback:()=>{
      if (!sprite||!sprite.scene) return;
      sprite.setAlpha(sprite.alpha<1?1:0.3); count++;
      if (count>=times*2) { sprite.setAlpha(1); if(onDone) onDone(); }
    }});
  }

  _spawnParticles(x,y,colorHex,count=8) {
    for (let i=0;i<count;i++) {
      const ang=Math.random()*Math.PI*2, spd=Phaser.Math.Between(45,130);
      const p=this.add.rectangle(x,y,4,4,parseInt(colorHex.replace('#','0x'))).setDepth(22);
      this.tweens.add({targets:p,x:x+Math.cos(ang)*spd*0.85,y:y+Math.sin(ang)*spd*0.85,
        alpha:0,scale:0,duration:Phaser.Math.Between(300,620),ease:'Quad.easeOut',onComplete:()=>p.destroy()});
    }
  }

  _showFloatingText(x,y,text,color,size=10) {
    const t=this.add.text(x,y,text,{...PF,fontSize:size+'px',color}).setDepth(30).setOrigin(0.5);
    this.tweens.add({targets:t,y:y-60,alpha:0,duration:1300,ease:'Quad.easeOut',onComplete:()=>t.destroy()});
  }

  _showAlert(text,color) {
    text.split('\n').forEach((line,i)=>{
      const sh=this.add.text(GW/2+3,GH/2-38+i*48+3,line,{...PF,fontSize:'22px',color:'#000000'}).setScrollFactor(0).setDepth(90).setOrigin(0.5);
      const t= this.add.text(GW/2,  GH/2-38+i*48,  line,{...PF,fontSize:'22px',color}).setScrollFactor(0).setDepth(91).setOrigin(0.5);
      this.tweens.add({targets:[t,sh],alpha:0,delay:2800,duration:500,onComplete:()=>{t.destroy();sh.destroy();}});
    });
  }

  // ── UPDATE LOOP ───────────────────────────────────────────
  update(time,delta) {
    if (this.st.gameOver||this.st.paused) return;
    const dt=delta/1000, st=this.st, k=this._keys;

    // Movement (WASD + arrows)
    let vx=0,vy=0;
    if (k.left.isDown  ||k.leftA.isDown)  vx=-1;
    if (k.right.isDown ||k.rightA.isDown) vx= 1;
    if (k.up.isDown    ||k.upA.isDown)    vy=-1;
    if (k.down.isDown  ||k.downA.isDown)  vy= 1;
    const len=Math.sqrt(vx*vx+vy*vy);
    if (len>0) { vx/=len; vy/=len; st.fx=vx; st.fy=vy; this.player.setFlipX(vx<0); }
    this.player.setVelocity(vx*st.pSpeed, vy*st.pSpeed);

    // Auto-fire (Integración de Doble Arma)
    if (time>st.nextFire) {
      const bSpeed = 560;
      const b = this.bullets.create(this.player.x+st.fx*16, this.player.y+st.fy*16, 'bullet');
      if (b) {
        b.setDepth(14).setScale(1.1); b.body.setVelocity(st.fx*bSpeed, st.fy*bSpeed);
        this.time.delayedCall(1800,()=>{ if(b&&b.active) b.destroy(); });
      }
      if (st.twinLv > 0) {
        const bBack = this.bullets.create(this.player.x-st.fx*16, this.player.y-st.fy*16, 'bullet');
        if (bBack) {
          bBack.setDepth(14).setScale(1.1); bBack.body.setVelocity(-st.fx*bSpeed, -st.fy*bSpeed);
          this.time.delayedCall(1800,()=>{ if(bBack&&bBack.active) bBack.destroy(); });
        }
      }
      if (st.twinLv > 1) {
        const px = -st.fy, py = st.fx; 
        const bLeft = this.bullets.create(this.player.x+px*16, this.player.y+py*16, 'bullet');
        if (bLeft) {
          bLeft.setDepth(14).setScale(1.1); bLeft.body.setVelocity(px*bSpeed, py*bSpeed);
          this.time.delayedCall(1800,()=>{ if(bLeft&&bLeft.active) bLeft.destroy(); });
        }
        const bRight = this.bullets.create(this.player.x-px*16, this.player.y-py*16, 'bullet');
        if (bRight) {
          bRight.setDepth(14).setScale(1.1); bRight.body.setVelocity(-px*bSpeed, -py*bSpeed);
          this.time.delayedCall(1800,()=>{ if(bRight&&bRight.active) bRight.destroy(); });
        }
      }
      SFX.shoot(); st.nextFire=time+st.fireRate;
    }

    if (st.bombLv>0&&time>st.nextBomb)  { this._dropBomb();       st.nextBomb=time+(st.bombLv===1?5000:4000); }
    if (st.boomLv>0&&time>st.nextBoom)  { this._throwBoomerang(); st.nextBoom=time+(st.boomLv===1?5000:4000); }
    if (st.clockLv>0&&time>st.nextClock){ this._activateClock();  st.nextClock=time+(st.clockLv===1?30000:27000); }
    if (st.clockActive) { st.clockTimer-=dt; if(st.clockTimer<=0) st.clockActive=false; }

    // Dynamic spawn rate & Horde Mode
    const localTime = time - this.st.startTime;
    let spawnDelay = Math.max(380, 2000 - Math.floor(localTime / 12000) * 90);
    if (st.xp >= 600) spawnDelay = Math.min(spawnDelay, 1200); // Acelera a 1.2s max
    if (st.xp >= 800) spawnDelay = Math.min(spawnDelay, 800);  // Acelera a 0.8s max
    if (st.xp >= 1000) spawnDelay = Math.min(spawnDelay, 500);
    if (st.xp >= 1200 && !st.bossSpawned) spawnDelay = 200;    // Horda (0.12s)
    this._spawnTimer.delay = spawnDelay;

    this.enemies.getChildren().forEach(e=>{
      if (!e.active||!e.body) return;
      const spd=st.clockActive?e.speed*0.18:e.speed;
      this.physics.moveToObject(e,this.player,spd);
      e.setFlipX(this.player.x<e.x);
    });

    if (this._boss&&this._boss.active) {
      const spd=st.clockActive?this._boss.speed*0.18:this._boss.speed;
      this.physics.moveToObject(this._boss,this.player,spd);
      this._boss.setFlipX(this.player.x<this._boss.x);
    }

    for (let i=this._activeBooms.length-1;i>=0;i--) {
      const bm=this._activeBooms[i];
      if (!bm.active) { this._activeBooms.splice(i,1); continue; }
      if (bm.returning) {
        this.physics.moveToObject(bm,this.player,430);
        if (Phaser.Math.Distance.Between(bm.x,bm.y,this.player.x,this.player.y)<26) { bm.destroy(); this._activeBooms.splice(i,1); }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  UPGRADE SCENE — smooth animated overlay on top of Game
// ═══════════════════════════════════════════════════════════════
class UpgradeScene extends Phaser.Scene {
  constructor() { super({key:'Upgrade',active:false}); }

  init(data) {
    this._level=data.level; this._st=data.state;
    this._onDone=data.onDone; this._selectedIdx=0; this._confirmed=false;
  }

  create() {
    this._buildOptions();
    this._buildUI();
    this._animateIn();
    this._setupKeys();
  }

  _buildOptions() {
    const st=this._st;
    const pool=[
      {id:'life',    icon:'❤',    name:'VIDA EXTRA',       desc:'Recupera y amplia +1 vida maxima'},
      {id:'firerate',icon:'🔫',   name:'DISPARO RAPIDO',   desc:'Velocidad de ataque x1.5 — mas balas/seg'},
      {id:'speed',   icon:'👟',   name:'VELOCIDAD +20%',   desc:'El agente se mueve un 20% mas rapido'},
    ];
    
    if (st.twinLv===0)      pool.push({id:'twin1', icon:'🔫',   name:'DOBLE ARMA NIV 1',       desc:'Dispara un proyectil extra hacia atrás'});
    else if(st.twinLv===1)  pool.push({id:'twin2', icon:'🔫', name:'DOBLE ARMA NIV 2',       desc:'Dispara en 4 direcciones simultáneas (cruz)'});
    
    if (st.bombLv===0)      pool.push({id:'bomb1', icon:'💣',   name:'BOMBA NIV 1',        desc:'Explosion radio 105px cada 5s'});
    else if(st.bombLv===1)  pool.push({id:'bomb2', icon:'💣',  name:'BOMBA NIV 2',        desc:'Cooldown 4s — mayor radio'});
    if (st.boomLv===0)      pool.push({id:'boom1', icon:'🪃',   name:'BOOMERANG NIV 1',    desc:'Proyectil curvo que regresa (5s)'});
    else if(st.boomLv===1)  pool.push({id:'boom2', icon:'🪃',  name:'BOOMERANG NIV 2',    desc:'Mas veloz — cooldown 4s'});
    if (st.clockLv===0)     pool.push({id:'clock1',icon:'⏱',   name:'TIEMPO LENTO 1',     desc:'Ralentiza enemigos 18% por 5s (30s)'});
    else if(st.clockLv===1) pool.push({id:'clock2',icon:'⏱', name:'TIEMPO LENTO 2',     desc:'Mismo efecto cada 27 segundos'});
    
    Phaser.Utils.Array.Shuffle(pool);
    this._options=pool.slice(0,3);
  }

  _buildUI() {
    const W=GW,H=GH,bw=700,bh=440,bx=W/2,by=H/2;
    this._all=[];

    this._dim=this.add.rectangle(W/2,H/2,W,H,0x000000,0).setDepth(0); this._all.push(this._dim);
    this._panel=this.add.rectangle(bx,by,bw,bh,0x010e01,0).setDepth(1).setStrokeStyle(2,0xffaa00); this._panel.setScale(0.55).setAlpha(0); this._all.push(this._panel);
    this._inner=this.add.rectangle(bx,by,bw-10,bh-10,0,0).setDepth(1).setStrokeStyle(1,0xcc4400); this._inner.setScale(0.55).setAlpha(0); this._all.push(this._inner);

    const cg=this.add.graphics().setDepth(2).setAlpha(0); cg.lineStyle(2,0xffaa00,1); const hbw=bw/2,hbh=bh/2,cs=24;
    [[bx-hbw+5,by-hbh+5,'r','b'],[bx+hbw-5-cs,by-hbh+5,'l','b'], [bx-hbw+5,by+hbh-5-cs,'r','t'],[bx+hbw-5-cs,by+hbh-5-cs,'l','t']].forEach(([cx,cy,h2,v2])=>{
      const ex=h2==='r'?cx+cs:cx,ey=v2==='b'?cy+cs:cy; cg.strokePoints([{x:ex,y:cy},{x:cx,y:cy},{x:cx,y:ey}],false);
    });
    this._all.push(cg);

    const tt=this.add.text(bx,by-hbh+34,'▲  SUBIDA DE NIVEL  ▲',{...PF,fontSize:'14px',color:'#ffaa00'}).setOrigin(0.5).setDepth(2).setAlpha(0);
    const st2=this.add.text(bx,by-hbh+62,`NIVEL ${this._level} — ${LEVEL_NAMES[Math.min(this._level-1,LEVEL_NAMES.length-1)]}`,{...PF,fontSize:'8px',color:'#ddaa88'}).setOrigin(0.5).setDepth(2).setAlpha(0);
    this._all.push(tt,st2);

    this._cards=[];
    this._options.forEach((opt,i)=>{
      const cy2=by-58+i*96;
      const cbg=this.add.rectangle(bx,cy2,bw-48,80,0x010e01).setDepth(2).setStrokeStyle(1,0x552200).setAlpha(0);
      const ico=this.add.text(bx-bw/2+30,cy2-20,opt.icon,{fontSize:'24px'}).setDepth(3).setAlpha(0);
      const nm= this.add.text(bx-bw/2+68,cy2-22,opt.name,{...PF,fontSize:'12px',color:'#ffddaa'}).setDepth(3).setAlpha(0);
      const dc= this.add.text(bx-bw/2+68,cy2+6, opt.desc,{...PF,fontSize:'7px',color:'#aa7755',wordWrap:{width:bw-140}}).setDepth(3).setAlpha(0);
      const kh= this.add.text(bx+bw/2-30,cy2-4,`[${i+1}]`,{...PF,fontSize:'10px',color:'#ffaa00'}).setOrigin(1,0.5).setDepth(3).setAlpha(0);
      this._all.push(cbg,ico,nm,dc,kh); this._cards.push({bg:cbg,name:nm,desc:dc});
      cbg.setInteractive({useHandCursor:true});
      cbg.on('pointerover',()=>{ if(!this._confirmed){SFX.upgradeSelect();this._selectedIdx=i;this._highlight();}});
      cbg.on('pointerdown',()=>{ if(!this._confirmed){this._selectedIdx=i;this._confirm();}});
    });

    const ht=this.add.text(bx,by+hbh-18,'W/S NAVEGAR  —  BTN1/ENTER CONFIRMAR  —  1 2 3 ELEGIR',{...PF,fontSize:'6px',color:'#ffaa00'}).setOrigin(0.5).setDepth(2).setAlpha(0);
    this._all.push(ht); this._highlight();
  }

  _animateIn() {
    const dur=300; this.tweens.add({targets:this._dim,fillAlpha:0.90,duration:dur,ease:'Quad.easeOut'});
    this.tweens.add({targets:[this._panel,this._inner],scale:1,alpha:1,duration:dur,ease:'Back.easeOut(1.4)'});
    const rest=this._all.filter(o=>o!==this._dim&&o!==this._panel&&o!==this._inner);
    rest.forEach((o,i)=>{ const origY=o.y; this.tweens.add({targets:o,alpha:1,y:origY,duration:200,delay:dur*0.55+i*14,ease:'Quad.easeOut',from:{alpha:0,y:origY+8}}); });
  }

  _animateOut(cb) {
    this.tweens.add({ targets:this._all, alpha:0, duration:200, ease:'Quad.easeIn', onComplete:cb });
    this.tweens.add({targets:[this._panel,this._inner],scale:0.82,duration:200,ease:'Quad.easeIn'});
  }

  _highlight() {
    this._cards.forEach(({bg,name,desc},i)=>{
      if (i===this._selectedIdx) { bg.setFillStyle(0x3a1505).setStrokeStyle(2,0xffaa00); name.setColor('#ffffff'); desc.setColor('#ffddaa'); } 
      else { bg.setFillStyle(0x010e01).setStrokeStyle(1,0x552200); name.setColor('#ffaa00'); desc.setColor('#aa7755'); }
    });
  }

  _confirm() {
    if (this._confirmed) return;
    this._confirmed=true; SFX.upgradeConfirm();
    const chosen=this._options[this._selectedIdx];
    this._animateOut(()=>{ this.scene.stop(); this._onDone(chosen.id); });
  }

  _setupKeys() {
    const up  =()=>{ if(!this._confirmed){SFX.upgradeSelect();this._selectedIdx=(this._selectedIdx+this._options.length-1)%this._options.length;this._highlight();}};
    const down=()=>{ if(!this._confirmed){SFX.upgradeSelect();this._selectedIdx=(this._selectedIdx+1)%this._options.length;this._highlight();}};
    this.input.keyboard.on('keydown-UP',    up); this.input.keyboard.on('keydown-W',     up);
    this.input.keyboard.on('keydown-DOWN',  down); this.input.keyboard.on('keydown-S',     down);
    this.input.keyboard.on('keydown-ENTER', ()=>{ if(!this._confirmed) this._confirm(); });
    this.input.keyboard.on('keydown-ONE',   ()=>{ if(!this._confirmed){this._selectedIdx=0;this._confirm();}});
    this.input.keyboard.on('keydown-TWO',   ()=>{ if(!this._confirmed&&this._options.length>1){this._selectedIdx=1;this._confirm();}});
    this.input.keyboard.on('keydown-THREE', ()=>{ if(!this._confirmed&&this._options.length>2){this._selectedIdx=2;this._confirm();}});
  }
}

// ═══════════════════════════════════════════════════════════════
//  GAME OVER SCENE (VICTORY & DEFEAT)
// ═══════════════════════════════════════════════════════════════
class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }
  init(data) { this._xp=data.xp||0; this._kills=data.kills||0; this._won=data.won||false; this._name=data.name||"AGENTE"; }

  create() {
    SFX.startMusic();
    this.cameras.main.fadeIn(500,0,0,0);
    
    saveScore(this._name, this._xp, this._kills);

    const bg=this.add.graphics(); bg.fillGradientStyle(0x080210,0x080210,0x4a0a00,0x4a0a00,1); bg.fillRect(0,0,GW,GH);
    for (let y=0;y<GH;y+=4) { bg.fillStyle(0x000000,0.15); bg.fillRect(0,y,GW,2); }

    if (this._won) {
      this.add.rectangle(GW/2,GH/2,620,440,0x1a0a00).setStrokeStyle(2,0xffaa00);
      this.add.rectangle(GW/2,GH/2,612,432,0x1a0a00,0).setStrokeStyle(1,0xcc4400);

      this.add.text(GW/2+3,143,'¡MISION CUMPLIDA!',{...PF,fontSize:'24px',color:'#441100'}).setOrigin(0.5).setDepth(0);
      const title=this.add.text(GW/2,140,'¡MISION CUMPLIDA!',{...PF,fontSize:'48px',color:'#ffaa00'}).setOrigin(0.5);
      this.add.text(GW/2,185,'Gracias por salvar a la humanidad.',{...PF,fontSize:'14px',color:'#ffddaa'}).setOrigin(0.5);
      this.time.addEvent({delay:2500,loop:true,callback:()=>{ this.tweens.add({targets:title,x:GW/2+Phaser.Math.Between(-3,3),duration:60,yoyo:true,repeat:3,onComplete:()=>title.x=GW/2}); }});
    } else {
      this.add.rectangle(GW/2,GH/2,620,440,0x1a0000).setStrokeStyle(2,0xcc0000);
      this.add.rectangle(GW/2,GH/2,612,432,0x1a0000,0).setStrokeStyle(1,0x880000);

      this.add.text(GW/2+3,143,'MISION FALLIDA',{...PF,fontSize:'24px',color:'#440000'}).setOrigin(0.5).setDepth(0);
      const title=this.add.text(GW/2,140,'MISION FALLIDA',{...PF,fontSize:'48px',color:'#ff2222'}).setOrigin(0.5);
      this.time.addEvent({delay:2500,loop:true,callback:()=>{ this.tweens.add({targets:title,x:GW/2+Phaser.Math.Between(-4,4),duration:60,yoyo:true,repeat:4,onComplete:()=>title.x=GW/2}); }});
    }

    const lv=getLevel(this._xp);
    this.add.text(GW/2,235,`XP ACUMULADO: ${this._xp}`,{...PF,fontSize:'18px',color:'#ffcc00'}).setOrigin(0.5);
    this.add.text(GW/2,265,`NIVEL: ${lv} — ${LEVEL_NAMES[Math.min(lv-1,LEVEL_NAMES.length-1)]}`,{...PF,fontSize:'14px',color:'#ddaa88'}).setOrigin(0.5);
    this.add.text(GW/2,295,`BAJAS ENEMIGAS: ${this._kills}`,{...PF,fontSize:'14px',color:this._won?'#ffaa00':'#ff4444'}).setOrigin(0.5);

    const dg=this.add.graphics(); dg.lineStyle(1,this._won?0xcc4400:0x880000); dg.lineBetween(GW/2-230,320,GW/2+230,320);

    const rBtn=this.add.text(GW/2-105,355,'▶ REINTENTAR',{...PF,fontSize:'14px',color:'#ffaa00'}).setOrigin(0.5).setInteractive({useHandCursor:true});
    const hBtn=this.add.text(GW/2+120, 355,'MENU ◀',      {  ...PF,fontSize:'14px',color:'#ddaa88'}).setOrigin(0.5).setInteractive({useHandCursor:true});

    rBtn.on('pointerover',()=>rBtn.setColor('#ffffff')); rBtn.on('pointerout',()=>rBtn.setColor('#ffaa00'));
    hBtn.on('pointerover',()=>hBtn.setColor('#ffffff')); hBtn.on('pointerout',()=>hBtn.setColor('#ddaa88'));
    rBtn.on('pointerdown',()=>{ this.cameras.main.fadeOut(300,0,0,0); this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('Game')); });
    hBtn.on('pointerdown',()=>{ this.cameras.main.fadeOut(300,0,0,0); this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('Home')); });
    this.input.keyboard.on('keydown-ENTER',()=>{ this.cameras.main.fadeOut(300,0,0,0); this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('Game')); });
    this.input.keyboard.on('keydown-ESC',  ()=>{ this.cameras.main.fadeOut(300,0,0,0); this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('Home')); });

    const scores=loadScores();
    if (scores.length>0) {
      this.add.text(GW/2,395,'TOP AGENTES:',{...PF,fontSize:'10px',color:this._won?'#cc4400':'#883322'}).setOrigin(0.5);
      scores.slice(0,3).forEach((s,i)=>{
        this.add.text(GW/2,415+i*22,`#${i+1}  ${s.name||'AGENTE'} : ${s.xp} XP / ${s.kills||0} KILLS`,{...PF,fontSize:'10px',color:i===0?'#ffcc00':(this._won?'#ffaa00':'#ddaa88')}).setOrigin(0.5);
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  PHASER CONFIG
// ═══════════════════════════════════════════════════════════════
const PF = { fontFamily: '"Press Start 2P", monospace' };

const config = {
  type: Phaser.AUTO,
  width: GW, height: GH,
  parent: 'game-root',
  backgroundColor: '#0a0510',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: [BootScene, HomeScene, GameScene, UpgradeScene, GameOverScene]
};
new Phaser.Game(config);