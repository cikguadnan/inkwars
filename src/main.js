import Phaser from 'phaser';
import './style.css';

const W=960,H=600;
const TYPES={
 sword:{label:'⚔ SWORD',cost:2,hp:110,damage:17,range:48,rate:850,speed:45},
 archer:{label:'➶ ARCHER',cost:3,hp:65,damage:15,range:195,rate:1250,speed:32},
 guardian:{label:'⬡ GUARD',cost:4,hp:210,damage:11,range:45,rate:1050,speed:25},
 blaster:{label:'✦ BLASTER',cost:5,hp:85,damage:10,range:145,rate:430,speed:38}
};
const $=id=>document.getElementById(id);
let hasDeployed=false;let scene,mode='campaign',level=1,selected='sword',ink=12,folds=2,units=[],projectiles=[],state='playing',elapsed=0,spawnTimer=0,score=0,inkFraction=0,foldMode=false,foldGuide=null,foldOrigin=null,foldShadow=null,foldAnimation=false;
const getSaved=()=>{try{return Math.max(1,Math.min(10,Number(localStorage.getItem('inkwars-level'))||1))}catch{return 1}};
level=getSaved();
function say(message){$('message').textContent=message}
function hud(){
 $('stats').textContent=(mode==='campaign'?'LEVEL '+level:'SURVIVAL')+'  ·  INK '+ink+'  ·  FOLDS '+folds+'  ·  SCORE '+score;
 $('fold').disabled=folds<=0||state!=='playing'||foldAnimation;
 $('next').style.display=state==='won'&&mode==='campaign'?'block':'none';
 for(const [type,cfg] of Object.entries(TYPES)){const b=$('unit-'+type);if(b){b.disabled=ink<cfg.cost||state!=='playing';b.classList.toggle('selected',selected===type)}}
}
function start(){
 units=[];projectiles=[];hasDeployed=false;state='playing';elapsed=0;spawnTimer=0;score=0;inkFraction=0;foldMode=false;foldAnimation=false;foldOrigin=null;foldGuide=null;foldShadow=null;
 ink=mode==='campaign'?12+Math.min(8,level):16;folds=mode==='campaign'?2+Math.floor((level-1)/4):99;
 scene.tweens.killAll();scene.children.removeAll();
 scene.add.rectangle(W/2,H/2,W,H,0xfffaeb);
 for(let y=20;y<H;y+=34)scene.add.line(0,0,0,y,W,y,0x91b7da,.3).setOrigin(0);
 scene.add.line(0,0,70,0,70,H,0xe99999,.65).setOrigin(0);
 scene.add.line(0,0,W/2,0,W/2,H,0x6d7787,.35).setOrigin(0).setLineWidth(2,2);
 scene.add.text(15,12,'BLUE INK', {fontFamily:'monospace',fontSize:'18px',color:'#2a65c3'}).setDepth(10);
 scene.add.text(W-120,12,'RED INK',{fontFamily:'monospace',fontSize:'18px',color:'#c43d49'}).setDepth(10);
 if(mode==='campaign'){
  const count=2+Math.min(7,Math.floor((level+1)/2));
  for(let i=0;i<count;i++)addUnit(['sword','archer','guardian','blaster'][(i+level)%4],1,735+(i%3)*64,110+Math.floor(i/3)*125+(i%3)*25);
 }else{for(let i=0;i<3;i++)addUnit('sword',1,800,160+i*130)}
 say('Select a unit and tap the left side to deploy. Fold to bring armies closer!');
 hud();
}
function addUnit(type,team,x,y){
 const cfg=TYPES[type],color=team===0?0x245bb5:0xc63c4a;
 const g=scene.add.graphics().setDepth(5);
 const bar=scene.add.graphics().setDepth(6);
 const u={type,team,x,y,hp:cfg.hp,maxHp:cfg.hp,cooldown:Math.random()*400,g,bar,phase:Math.random()*6,attackFlash:0,hitFlash:0};
 units.push(u);drawUnit(u);return u;
}
function drawUnit(u){
 const c=u.team===0?0x245bb5:0xc63c4a,g=u.g,b=u.bar;
 g.clear();b.clear();
 g.lineStyle(u.hitFlash>0?6:4,u.hitFlash>0?0xf2a12b:c,1);
 const bounce=Math.sin(elapsed/220+u.phase)*2;
 g.strokeCircle(u.x,u.y-20+bounce,10);
 g.lineBetween(u.x,u.y-10+bounce,u.x,u.y+17+bounce);
 g.lineBetween(u.x,u.y,u.x-12,u.y+9+bounce);
 g.lineBetween(u.x,u.y,u.x+12,u.y+9+bounce);
 g.lineBetween(u.x,u.y+17+bounce,u.x-10,u.y+34+bounce);
 g.lineBetween(u.x,u.y+17+bounce,u.x+10,u.y+34+bounce);
 if(u.type==='sword'){g.lineStyle(3,0x4b566a);g.lineBetween(u.x+12,u.y+8,u.x+25,u.y-19)}
 if(u.type==='archer'){g.lineStyle(2,c);g.strokeCircle(u.x+17,u.y-2,12);g.lineBetween(u.x+17,u.y-15,u.x+17,u.y+11)}
 if(u.type==='guardian'){g.lineStyle(4,c);g.strokeCircle(u.x-15,u.y+5,13)}
 if(u.type==='blaster'){g.lineStyle(6,c);g.lineBetween(u.x+12,u.y+8,u.x+32,u.y+3)}
 b.fillStyle(0x283349,.2);b.fillRect(u.x-20,u.y-43,40,5);
 b.fillStyle(u.team===0?0x4382df:0xe46b6b);b.fillRect(u.x-20,u.y-43,40*Math.max(0,u.hp/u.maxHp),5);
}
function fire(a,b){
 const cfg=TYPES[a.type];
 a.attackFlash=150;
 if(cfg.range<60){b.hp-=cfg.damage;b.hitFlash=180;scene.cameras.main.shake(35,.0006);return}
 const dot=scene.add.circle(a.x,a.y-3,4,a.team===0?0x2468c7:0xcf3c49).setDepth(7);
 projectiles.push({sprite:dot,x:a.x,y:a.y-3,target:b,damage:cfg.damage,speed:a.type==='blaster'?550:390});
}
function finish(win){
 state=win?'won':'lost';
 if(win&&mode==='campaign'){try{localStorage.setItem('inkwars-level',String(Math.min(10,Math.max(getSaved(),level+1))))}catch{}}
 say(win?'🏆 Victory! '+(level===10?'Campaign complete!':'Advance to the next level.'):'💔 Defeat! Try different units and folds.');
 hud();
}
function tick(time,delta){
 if(state!=='playing')return;
 const dt=Math.min(delta,60)/1000;elapsed+=delta;
 if(foldAnimation)return;
 inkFraction+=dt*(mode==='survival'?.52:.36);
 if(inkFraction>=1){const gain=Math.floor(inkFraction);ink=Math.min(25,ink+gain);inkFraction-=gain}
 for(const u of units){u.hitFlash=Math.max(0,u.hitFlash-delta);u.attackFlash=Math.max(0,u.attackFlash-delta)}
 if(mode==='survival'){spawnTimer+=delta;if(spawnTimer>Math.max(850,3400-score*35)){spawnTimer=0;addUnit(['sword','archer','guardian','blaster'][Math.floor(Math.random()*4)],1,850+Math.random()*65,85+Math.random()*420);ink=Math.min(25,ink+2)}}
 for(const u of units){
  if(u.hp<=0)continue;
  const opponents=units.filter(v=>v.team!==u.team&&v.hp>0);
  if(!opponents.length)continue;
  let target=opponents[0],dist=Infinity;
  for(const v of opponents){const d=Math.hypot(v.x-u.x,v.y-u.y);if(d<dist){dist=d;target=v}}
  const cfg=TYPES[u.type];
  if(dist>cfg.range){const step=Math.min(cfg.speed*dt,Math.max(0,dist-cfg.range+3));u.x+=(target.x-u.x)/dist*step;u.y+=(target.y-u.y)/dist*step}
  else {u.cooldown-=delta;if(u.cooldown<=0){fire(u,target);u.cooldown=cfg.rate}}
  let avoidX=0,avoidY=0;
  for(const other of units){if(other===u||other.hp<=0)continue;const dx=u.x-other.x,dy=u.y-other.y;const d=Math.hypot(dx,dy);if(d>0.1&&d<35){const push=(35-d)*dt*3.5;avoidX+=dx/d*push;avoidY+=dy/d*push}}
  u.x+=avoidX;u.y+=avoidY;
  u.x=Phaser.Math.Clamp(u.x,18,W-18);u.y=Phaser.Math.Clamp(u.y,65,H-45);
  drawUnit(u);
 }
 for(let i=projectiles.length-1;i>=0;i--){
  const p=projectiles[i];if(p.target.hp<=0){p.sprite.destroy();projectiles.splice(i,1);continue}
  const d=Math.hypot(p.target.x-p.x,p.target.y-p.y);
  if(d<13){p.target.hp-=p.damage;p.target.hitFlash=180;p.sprite.destroy();projectiles.splice(i,1)}
  else{const step=Math.min(d,p.speed*dt);p.x+=(p.target.x-p.x)/d*step;p.y+=(p.target.y-p.y)/d*step;p.sprite.setPosition(p.x,p.y)}
 }
 const dead=units.filter(u=>u.hp<=0);
 for(const u of dead){scene.add.circle(u.x,u.y,7,u.team===0?0x245bb5:0xc63c4a,.4).setDepth(2);u.g.destroy();u.bar.destroy();if(u.team===1){score++;ink=Math.min(25,ink+(mode==='survival'?2:1))}}
 units=units.filter(u=>u.hp>0);
 if(hasDeployed&&!units.some(u=>u.team===0))finish(false);
 else if(mode==='campaign'&&!units.some(u=>u.team===1))finish(true);
 hud();
}
class Battle extends Phaser.Scene{
 constructor(){super('Battle')}
 create(){
  scene=this;this.input.on('pointerdown',p=>{
   if(state!=='playing'||foldAnimation)return;
   const x=p.worldX,y=p.worldY;
   if(foldMode){foldOrigin={x,y};drawFoldGuide(x,y);return}
   if(x>W*.49||y<60||y>H-35){say('Deploy blue units on the left half of the paper.');return}
   const cost=TYPES[selected].cost;
   if(ink<cost){say('Not enough ink!');return}
   ink-=cost;hasDeployed=true;addUnit(selected,0,x,y);say('Unit deployed. Fold the paper to bring the armies together!');hud();
  });
  this.input.on('pointermove',p=>{if(foldMode&&foldOrigin)drawFoldGuide(p.worldX,p.worldY)});
  this.input.on('pointerup',p=>{if(foldMode&&foldOrigin){const a=foldOrigin;foldOrigin=null;applyFold(a,{x:p.worldX,y:p.worldY})}});
  start();
 }
 update(t,d){tick(t,d)}
}
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#fff9e9',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[Battle],render:{antialias:true}});
for(const [type,cfg] of Object.entries(TYPES)){
 const b=document.createElement('button');b.id='unit-'+type;b.textContent=cfg.label+' · '+cfg.cost;b.onclick=()=>{selected=type;hud()};$('units').appendChild(b);
}
function drawFoldGuide(x,y){
 if(foldGuide)foldGuide.destroy();
 foldGuide=scene.add.graphics().setDepth(15);
 foldGuide.lineStyle(4,0xb47c2c,.9);
 const a=foldOrigin||{x,y},dx=x-a.x,dy=y-a.y;
 if(Math.hypot(dx,dy)<15){foldGuide.lineBetween(x,55,x,H-35);return}
 const len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
 foldGuide.lineBetween(a.x-ux*1200,a.y-uy*1200,a.x+ux*1200,a.y+uy*1200);
}
function clearFold(){
 foldMode=false;foldOrigin=null;
 if(foldGuide){foldGuide.destroy();foldGuide=null}
 $('fold').classList.remove('selected');
}
function applyFold(a,b){
 if(state!=='playing'||folds<=0){clearFold();return}
 const dx=b.x-a.x,dy=b.y-a.y;
 // A short tap selects a vertical crease at the tapped x position.
 const length=Math.hypot(dx,dy),nx=length<20?1:-dy/length,ny=length<20?0:dx/length;
 const crease=length<20?{x:a.x,y:H/2}:a;
 const targets=units.map(u=>{
  const signed=(u.x-crease.x)*nx+(u.y-crease.y)*ny;
  // Fold only the far side of the paper, bringing its units across the crease.
  const reflected=signed>0?{x:u.x-2*signed*nx,y:u.y-2*signed*ny}:{x:u.x,y:u.y};
  return {u,x:Phaser.Math.Clamp(reflected.x,22,W-22),y:Phaser.Math.Clamp(reflected.y,70,H-48)};
 });
 if(!targets.some(t=>Math.hypot(t.u.x-t.x,t.u.y-t.y)>10)){
  clearFold();say('No units on the folded side. Try a crease closer to the red army.');return;
 }
 folds--;foldAnimation=true;
 if(foldGuide){foldGuide.destroy();foldGuide=null}
 const shade=scene.add.rectangle(W/2,H/2,W,H,0xd9bd89,.14).setDepth(3);
 for(const t of targets){scene.tweens.add({targets:t.u,x:t.x,y:t.y,duration:550,ease:'Sine.InOut',onUpdate:()=>drawUnit(t.u)})}
 scene.tweens.add({targets:shade,alpha:0,duration:620,onComplete:()=>{shade.destroy();foldAnimation=false}});
 clearFold();say('Fold complete! The far side was reflected across your crease.');hud();
}
$('fold').onclick=()=>{
 if(folds<=0||state!=='playing'||foldAnimation)return;
 foldMode=!foldMode;$('fold').classList.toggle('selected',foldMode);
 if(!foldMode){clearFold();say('Fold cancelled.');return}
 say('Draw a crease on the paper (drag), or tap to make a vertical fold. Units on one side will flip across it.');
};
$('restart').onclick=()=>start();
$('next').onclick=()=>{level=Math.min(10,level+1);start()};
$('campaign').onclick=()=>{mode='campaign';level=getSaved();start()};
$('survival').onclick=()=>{mode='survival';start()};
