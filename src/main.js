import Phaser from 'phaser';
import './style.css';
const W=960,H=600,$=id=>document.getElementById(id);
let scene,mode='campaign',level=1,folds=5,ink=10,score=0,round='ready',pieces=[],guide,dragStart=null,turn=0;
const load=()=>{try{return Math.max(1,Math.min(10,Number(localStorage.getItem('inkwars-level'))||1))}catch{return 1}};
level=load();
const levels=[
 {blue:[[170,425],[430,470],[735,430]],red:[[170,145],[430,115],[735,165]]},
 {blue:[[160,460],[400,410],[740,465]],red:[[160,135],[400,165],[740,110]]},
 {blue:[[145,445],[330,475],[570,425],[800,460]],red:[[145,125],[330,150],[570,170],[800,115]]},
 {blue:[[170,450],[400,480],[720,425]],red:[[170,140],[400,125],[720,170]]},
 {blue:[[140,460],[310,425],[520,470],[770,430]],red:[[140,145],[310,175],[520,120],[770,160]]}
];
const config=()=>levels[(level-1)%levels.length];
function say(t){$('message').textContent=t}
function hud(){
 $('stats').textContent=(mode==='campaign'?'LEVEL '+level:'SURVIVAL')+'  ·  FOLDS '+folds+'/5  ·  INK '+ink+'/10  ·  SCORE '+score;
 $('fold').textContent=round==='aim'?'CANCEL FOLD':'✎ FOLD PAPER';
 $('fold').disabled=folds<=0||round==='win'||round==='lose'||round==='animating';
 $('next').style.display=round==='win'&&mode==='campaign'?'block':'none';
 for(const el of document.querySelectorAll('#units button'))el.disabled=true;
}
function stick(p){
 const g=scene.add.graphics().setDepth(4);p.g=g;
 const c=p.team==='blue'?0x275bb8:0xb83f52,x=p.x,y=p.y;
 g.lineStyle(4,c);g.strokeCircle(x,y-20,11);
 g.lineBetween(x,y-9,x,y+17);g.lineBetween(x,y,x-19,y+8);g.lineBetween(x,y,x+19,y+8);
 g.lineBetween(x,y+17,x-15,y+40);g.lineBetween(x,y+17,x+15,y+40);
 g.lineStyle(2,c);g.strokeCircle(x-4,y-23,1);g.strokeCircle(x+4,y-23,1);
 g.lineBetween(x-4,y-16,x+4,y-16);
 if(p.team==='blue'){g.fillStyle(0x275bb8);g.fillCircle(x+23,y+12,7)}
 else{g.lineStyle(3,0xb83f52);g.lineBetween(x-10,y-37,x-18,y-45);g.lineBetween(x+10,y-37,x+18,y-45)}
}
function start(){
 if(!scene)return;
 scene.tweens.killAll();scene.children.removeAll();pieces=[];folds=5;ink=10;score=0;turn=0;round='ready';dragStart=null;guide=null;
 scene.add.rectangle(W/2,H/2,W,H,0xfffcf1);
 for(let x=20;x<W;x+=32)scene.add.line(0,0,x,0,x,H,0x93b7d5,.15).setOrigin(0);
 for(let y=20;y<H;y+=32)scene.add.line(0,0,0,y,W,y,0x93b7d5,.15).setOrigin(0);
 scene.add.rectangle(W/2,300,W,3,0x8e929a,.5);
 scene.add.text(24,16,'CPU  ♥ ♥ ♥',{fontFamily:'monospace',fontSize:'20px',color:'#b83f52'});
 scene.add.text(24,H-35,'YOU  ♥ ♥ ♥',{fontFamily:'monospace',fontSize:'20px',color:'#275bb8'});
 const c=config();
 const count=mode==='survival'?3:Math.min(c.blue.length,level>5?4:3);
 for(let i=0;i<count;i++){
  const b=c.blue[i],r=c.red[i];pieces.push({x:b[0],y:b[1],team:'blue',alive:true});pieces.push({x:r[0],y:r[1],team:'red',alive:true});
 }
 pieces.forEach(stick);say('Stationary armies. Press FOLD PAPER, then drag a horizontal crease to line up blue ink with red targets.');hud();
}
function line(y){
 if(guide)guide.destroy();
 guide=scene.add.graphics().setDepth(12);guide.lineStyle(4,0xc39347,.9);guide.lineBetween(0,y,W,y);
 const mirrored=scene.add.graphics().setDepth(12);mirrored.lineStyle(2,0x275bb8,.4);
 for(const p of pieces.filter(p=>p.alive&&p.team==='blue'))mirrored.strokeCircle(p.x,2*y-p.y,13);
 guide._mirrored=mirrored;
}
function clearLine(){if(guide){guide._mirrored?.destroy();guide.destroy();guide=null}}
function fold(y){
 if(folds<=0||round!=='aim')return;
 y=Phaser.Math.Clamp(y,210,390);
 folds--;ink=Math.max(0,ink-2);turn++;round='animating';clearLine();hud();
 // The bottom half is folded upwards over the top sheet.
 // A narrowing flap is drawn each frame, and the ink marks move with its surface.
 const flap=scene.add.graphics().setDepth(8);
 const flapInk=scene.add.graphics().setDepth(9);
 const crease=scene.add.graphics().setDepth(10);
 const originalBlue=pieces.filter(p=>p.team==='blue'&&p.alive);
 originalBlue.forEach(p=>p.g.setVisible(false));
 const anim={progress:0};
 const draw=()=>{
  const t=anim.progress;
  const edge=y+(H-y)*(1-2*t);
  flap.clear();flapInk.clear();crease.clear();
  flap.fillStyle(0xe9d7b4,.98);
  flap.fillRect(0,Math.min(y,edge),W,Math.abs(edge-y));
  flap.lineStyle(3,0xb79d72,.95);
  flap.lineBetween(0,edge,W,edge);
  flap.lineStyle(2,0x846e52,.6);
  flap.lineBetween(0,y,W,y);
  const shadowHeight=16*(1-Math.abs(t-.5)*2);
  flap.fillStyle(0x796c5a,.18);flap.fillRect(0,y-4,W,Math.max(1,shadowHeight));
  for(const p of originalBlue){
   const py=y+(p.y-y)*(1-2*t);
   if(py<Math.min(y,edge)-45||py>Math.max(y,edge)+45)continue;
   const x=p.x,c=0x275bb8;
   flapInk.lineStyle(4,c,1);
   flapInk.strokeCircle(x,py-20,11);
   flapInk.lineBetween(x,py-9,x,py+17);
   flapInk.lineBetween(x,py,x-19,py+8);
   flapInk.lineBetween(x,py,x+19,py+8);
   flapInk.lineBetween(x,py+17,x-15,py+40);
   flapInk.lineBetween(x,py+17,x+15,py+40);
   flapInk.fillStyle(c);flapInk.fillCircle(x+23,py+12,7);
  }
 };
 const cleanup=()=>{flap.destroy();flapInk.destroy();crease.destroy();originalBlue.forEach(p=>p.g.setVisible(true))};
 scene.tweens.add({targets:anim,progress:1,duration:750,ease:'Sine.InOut',onUpdate:draw,onComplete:()=>{
  let hits=0;
  const hitEnemies=new Set();
  for(const b of originalBlue){
   const reflected=2*y-b.y;
   for(const e of pieces.filter(p=>p.team==='red'&&p.alive)){
    if(Math.hypot(e.x-b.x,e.y-reflected)<48)hitEnemies.add(e);
   }
  }
  for(const e of hitEnemies){e.alive=false;e.g.destroy();hits++;score+=100;
   const burst=scene.add.circle(e.x,e.y,9,0x275bb8,.65).setDepth(11);
   scene.tweens.add({targets:burst,scale:3,alpha:0,duration:450,onComplete:()=>burst.destroy()});
  }
  ink=Math.min(10,ink+hits*2);
  // Unfold the same paper flap, restoring all surviving ink to fixed positions.
  scene.tweens.add({targets:anim,progress:0,duration:680,ease:'Sine.InOut',onUpdate:draw,onComplete:()=>{
   cleanup();
   const remaining=pieces.filter(p=>p.team==='red'&&p.alive).length;
   if(!remaining){round='win';if(mode==='campaign'){try{localStorage.setItem('inkwars-level',String(Math.max(load(),Math.min(10,level+1))))}catch{}}say('🏆 All targets hit! You win.')}
   else if(folds<=0){round='lose';say('Out of folds! '+remaining+' red targets remain. Try again.')}
   else{round='ready';say(hits?'Great fold! '+hits+' target(s) hit. '+remaining+' remain.':'Miss! Adjust the crease so the blue ink overlaps the red figures.')}
   hud();
  }});
 }});
 draw();
}

class Battle extends Phaser.Scene{
 constructor(){super('Battle')}
 create(){scene=this;
  this.input.on('pointerdown',p=>{if(round!=='aim')return;dragStart={x:p.worldX,y:p.worldY};line(Phaser.Math.Clamp(p.worldY,210,390))});
  this.input.on('pointermove',p=>{if(round==='aim'&&dragStart)line(Phaser.Math.Clamp(p.worldY,210,390))});
  this.input.on('pointerup',p=>{if(round==='aim'&&dragStart){dragStart=null;fold(p.worldY)}});
  start();
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#fffcf1',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Battle]});
$('units').innerHTML='<div class="game-tip">🎯 Fixed targets · Blue ink attacks when folded onto red figures · 5 folds per level</div>';
$('fold').onclick=()=>{if(round==='ready'){round='aim';say('Drag a horizontal crease across the paper. Ghost circles show where blue attacks will land.')}else if(round==='aim'){round='ready';dragStart=null;clearLine();say('Fold cancelled.')}hud()};
$('restart').onclick=()=>start();
$('next').onclick=()=>{level=Math.min(10,level+1);start()};
$('campaign').onclick=()=>{mode='campaign';level=load();start()};
$('survival').onclick=()=>{mode='survival';start()};
