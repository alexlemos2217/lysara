(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas=$('game'),c=canvas.getContext('2d',{alpha:false});
const W=1280,H=720,WORLD=5550,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rr=(x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r)};
const storageKey='lysara-demo-v2';
let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')}catch(e){}
let muted=false,audioCtx=null;try{muted=localStorage.getItem('lysara-mute')==='yes'}catch(e){}
const buttons=['menu','intro','pause','help','end'];
let state='menu',returnFromHelp='menu',introStep=0;
let time=0,dt=0,camX=0,camY=0,shake=0,hitFlash=0,notificationsEnd=0,area='SENDERO DE CENIZA',bannerEnd=0;
let particles=[],rain=[],fireflies=[],slashes=[],floatTexts=[];
let keys=new Set(),just=new Set(),touchEnabled=matchMedia('(pointer:coarse)').matches;
const player={x:130,y:569,w:33,h:56,vx:0,vy:0,dir:1,grounded:false,coyote:0,jumpQueue:0,airDash:true,dashTime:0,dashCool:0,slashTime:0,slashCool:0,hp:5,maxhp:5,hurt:0,anim:0,steps:0,checkpoint:130};
const platforms=[
 {x:0,y:625,w:1270,h:125,kind:'ground'},{x:1500,y:625,w:1380,h:125,kind:'ground'},
 {x:3130,y:625,w:870,h:125,kind:'ground'},{x:4180,y:625,w:1370,h:125,kind:'ground'},
 {x:520,y:542,w:195,h:22},{x:760,y:528,w:260,h:22},{x:1105,y:540,w:145,h:20},
 {x:1290,y:540,w:125,h:22},{x:1405,y:560,w:115,h:22},
 {x:1890,y:548,w:190,h:22},{x:2145,y:538,w:200,h:22},{x:2360,y:472,w:270,h:22},
 {x:2680,y:535,w:185,h:22},{x:2860,y:545,w:130,h:22},{x:3000,y:552,w:130,h:22},
 {x:3325,y:544,w:195,h:22},{x:3580,y:548,w:245,h:22},{x:3890,y:535,w:100,h:22},
 {x:4000,y:545,w:135,h:22},{x:4180,y:555,w:130,h:22},
 {x:4505,y:540,w:160,h:22},{x:4760,y:495,w:170,h:22}
];
const echoes=[{x:886,y:475,got:false},{x:2490,y:419,got:false},{x:3694,y:494,got:false}];
const shrines=[{x:1695,y:624},{x:3425,y:624}];
const writings=[{x:390,text:'"El corazón solo responde a quienes llevan sus tres ecos."',title:'INSCRIPCIÓN ANTIGUA'},
 {x:2060,text:'"El silencio no es la ausencia de vida. Es el bosque conteniendo la respiración."',title:'UN FRAGMENTO DE MEMORIA'},
 {x:4350,text:'"Iri, si encontrás la puerta, no olvides por qué la abriste."',title:'LA ÚLTIMA CARTA'}];
const enemies=[{x:650,base:650,y:590,w:50,h:35,dir:-1,hp:2,max:2,range:95,t:0,alive:true},
 {x:1810,base:1810,y:590,w:50,h:35,dir:1,hp:2,max:2,range:70,t:2,alive:true},
 {x:2720,base:2720,y:590,w:54,h:35,dir:-1,hp:3,max:3,range:90,t:3,alive:true},
 {x:3500,base:3500,y:590,w:50,h:35,dir:1,hp:2,max:2,range:80,t:4,alive:true},
 {x:4610,base:4610,y:590,w:60,h:35,dir:-1,hp:3,max:3,range:105,t:6,alive:true}];
const INTRO=[
 {title:'El bosque que olvidó',text:'Hubo un tiempo en que la luz nacía de las raíces. Cada árbol guardaba un recuerdo y cada sendero sabía a dónde llevarte.'},
 {title:'Los tres ecos',text:'Una noche, el Corazón de la Bruma se apagó. Tres ecos de luz quedaron esparcidos entre las ruinas. Sin ellos, el bosque desaparecerá.'},
 {title:'La guardiana Iri',text:'Sos Iri, la última guardiana. Saltá sobre el abismo, enfrentá las sombras y encontrá los tres ecos. Al final del sendero, el Corazón te espera.'}
];
function save(){saved={checkpoint:player.checkpoint,echoes:echoes.map(x=>x.got),seen:true,ended:state==='end'};try{localStorage.setItem(storageKey,JSON.stringify(saved))}catch(e){}}
function rand(i){let n=Math.sin(i*127.1+31.17)*43758.5453;return n-Math.floor(n)}
const stars=Array.from({length:85},(_,i)=>({x:rand(i+4)*W,y:rand(i+500)*390,s:1+rand(i+900)*2.7,phase:rand(i+21)*TAU}));
const distantTrees=Array.from({length:150},(_,i)=>({x:i*51+rand(i)*34,h:82+rand(i+33)*195,w:12+rand(i+88)*28,tilt:(rand(i+137)-.5)*.28,branches:2+Math.floor(rand(i+23)*3)}));
const nearTrees=Array.from({length:70},(_,i)=>({x:i*100+rand(i+910)*30,h:155+rand(i+22)*220,w:17+rand(i+52)*20}));
for(let i=0;i<76;i++)fireflies.push({x:rand(i+200)*WORLD,y:245+rand(i+100)*360,p:rand(i+690)*TAU,s:.8+rand(i+777)*2.4});
for(let i=0;i<70;i++)rain.push({x:rand(i+20)*W,y:rand(i+344)*H,s:55+rand(i+91)*125,a:.09+rand(i+13)*.13});
function sound(freq=440,seconds=.08,type='sine',gain=.045,slide=0){if(muted)return;try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();let o=audioCtx.createOscillator(),g=audioCtx.createGain(),now=audioCtx.currentTime;o.type=type;o.frequency.setValueAtTime(freq,now);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),now+seconds);g.gain.setValueAtTime(gain,now);g.gain.exponentialRampToValueAtTime(.0001,now+seconds);o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+seconds)}catch(e){}}
function burst(x,y,color,n=16,force=140){for(let i=0;i<n;i++){const a=Math.random()*TAU,spd=force*(.3+Math.random()*.9);particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:.4+Math.random()*.65,max:1,color,size:1+Math.random()*3,gravity:Math.random()*180})}if(particles.length>290)particles.splice(0,particles.length-290)}
function toast(message,secs=2.4){$('notification').textContent=message;$('notification').classList.add('active');notificationsEnd=time+secs}
function marquee(message,secs=3){$('banner').textContent=message;$('banner').hidden=false;bannerEnd=time+secs}
function showScreen(name){buttons.forEach(k=>$(k).hidden=k!==name);state=name;const running=name==='playing';$('hud').hidden=!running;$('pauseBtn').hidden=!running;$('touchControls').hidden=!(running&&touchEnabled);$('stage').classList.toggle('mobile',touchEnabled);if(!running){$('interaction').hidden=true;$('notification').classList.remove('active')} $('eyebrow').style.display=running?'none':'block'}
function reset(resetProgress=true){keys.clear();just.clear();if(resetProgress){echoes.forEach(e=>e.got=false);player.checkpoint=130;enemies.forEach(e=>{e.hp=e.max;e.alive=true});saved={};save()}
 player.x=player.checkpoint;player.y=569;player.vx=0;player.vy=0;player.hp=5;player.hurt=0;player.dashTime=0;player.dashCool=0;player.slashCool=0;player.grounded=false;player.airDash=true;camX=cameraFor(player.x);particles=[];floatTexts=[];area='SENDERO DE CENIZA';renderHud()}
function startNew(){reset(true);introStep=0;showDialog()}
function continueGame(){if(saved.echoes){echoes.forEach((e,i)=>e.got=!!saved.echoes[i]);player.checkpoint=saved.checkpoint||130}reset(false);showScreen('playing');marquee('SENDERO DE CENIZA',2.7)}
function showDialog(){$('dialogKicker').textContent='PRÓLOGO · '+String(introStep+1).padStart(2,'0')+'/ 03';$('dialogTitle').textContent=INTRO[introStep].title;$('dialogText').textContent=INTRO[introStep].text;$('dialogCount').textContent=String(introStep+1).padStart(2,'0')+' / 03';$('dialogNext').innerHTML=introStep===2?'COMENZAR <span>→</span>':'CONTINUAR <span>→</span>';showScreen('intro')}
function nextDialog(){sound(500,.12,'sine',.06,90);introStep++;if(introStep<INTRO.length)showDialog();else{showScreen('playing');marquee('SENDERO DE CENIZA');toast('Encontrá los tres ecos y llegá al santuario.',3.4);save()}}
function pause(){if(state==='playing'){showScreen('pause')}else if(state==='pause'){showScreen('playing')}}
function showHelp(){returnFromHelp=state;showScreen('help')}
function closeHelp(){showScreen(returnFromHelp)}
function endGame(){showScreen('end');save();sound(523,.38,'sine',.05,260);setTimeout(()=>sound(784,.6,'sine',.03),180)}
function renderHud(){let hearts='';for(let h=0;h<player.maxhp;h++)hearts+=`<span class="${h<player.hp?'':'empty'}">${h<player.hp?'♥':'♡'}</span>`;$('hearts').innerHTML=hearts;$('relicNum').textContent=echoes.filter(e=>e.got).length;$('dashIndicator').classList.toggle('inactive',!(player.airDash&&player.dashCool<=0));$('placeName').textContent=area}
function addText(x,y,s,color='#d9f4ce'){floatTexts.push({x,y,s,color,life:1.2})}
function hit(damage=1){if(player.hurt>0)return;player.hp-=damage;player.hurt=1.18;shake=12;hitFlash=.25;player.vy=-330;player.vx=-player.dir*230;burst(player.x+17,player.y+25,'#f0b3a5',18,195);sound(150,.28,'sawtooth',.08,-95);renderHud();if(player.hp<=0){player.hp=5;respawn();toast('La bruma te devolvió al último altar.',2.7)}}
function respawn(){player.x=player.checkpoint;player.y=569;player.vx=0;player.vy=0;player.hurt=1.1;shake=9;burst(player.x+16,player.y+15,'#b1efcf',25,260);renderHud()}
function canTouch(a,b){return a.x < b.x+b.w&&a.x+a.w>b.x&&a.y < b.y+b.h&&a.y+a.h>b.y}
function nearInteractive(){for(let i=0;i<shrines.length;i++)if(Math.abs(player.x-shrines[i].x)<85 && Math.abs(player.y+player.h-shrines[i].y)<95)return{type:'shrine',item:shrines[i],name:'ACTIVAR ALTAR'};
 for(let i=0;i<writings.length;i++)if(Math.abs(player.x-writings[i].x)<85 && player.y+player.h>490)return{type:'writing',item:writings[i],name:'LEER INSCRIPCIÓN'};
 if(Math.abs(player.x-5190)<115)return{type:'gate',item:null,name:'ABRIR SANTUARIO'};return null}
function interact(){const n=nearInteractive();if(!n)return;
 if(n.type==='shrine'){player.checkpoint=n.item.x;player.hp=5;save();burst(n.item.x,n.item.y-64,'#cfedaa',38,195);marquee('ALTAR DESPERTADO',2);toast('Avance guardado · Vida restaurada',3);sound(660,.3,'sine',.07,400);renderHud()}
 if(n.type==='writing'){toast(n.item.text,5);sound(420,.24,'sine',.04,80)}
 if(n.type==='gate'){if(echoes.every(e=>e.got)){burst(5203,485,'#d9f1c5',90,380);endGame()}else{toast(`Faltan ${echoes.filter(x=>!x.got).length} ecos para abrir el santuario.`,3);sound(200,.22,'sine',.05,-120)}}}
function cameraFor(x){return window.innerWidth<690&&window.innerHeight>window.innerWidth?clamp(x-640,-510,WORLD-865):clamp(x-375,0,WORLD-W)}
function move(dt){const left=keys.has('ArrowLeft')||keys.has('KeyA'),right=keys.has('ArrowRight')||keys.has('KeyD'),jump=just.has('Space')||just.has('KeyW')||just.has('ArrowUp'),attack=just.has('KeyJ')||just.has('KeyX'),dash=just.has('ShiftLeft')||just.has('ShiftRight')||just.has('KeyK');
 if(jump)player.jumpQueue=.155;if(just.has('KeyE')||just.has('Enter'))interact();
 const target=(Number(right)-Number(left))*292;
 if(player.dashTime>0){player.dashTime-=dt;player.vx=player.dir*940;player.vy=0;if(Math.random()<.72)burst(player.x+17,player.y+22,'#b1f9d5',2,65)}
 else{player.vx=lerp(player.vx,target,Math.min(1,dt*(player.grounded?13:8.1)));if(Math.abs(player.vx)<5)player.vx=0;player.vy=Math.min(1030,player.vy+2200*dt)}
 if(left!==right&&player.dashTime<=0)player.dir=right?1:-1;
 if(player.grounded)player.coyote=.102;else player.coyote=Math.max(0,player.coyote-dt);
 player.jumpQueue=Math.max(0,player.jumpQueue-dt);
 if(player.jumpQueue>0&&player.coyote>0){player.vy=-755;player.coyote=0;player.grounded=false;player.jumpQueue=0;burst(player.x+16,player.y+55,'#d0e5b5',9,94);sound(410,.14,'sine',.06,310)}
 if(!keys.has('Space')&&!keys.has('KeyW')&&!keys.has('ArrowUp')&&player.vy < -270)player.vy+=1900*dt;
 if(dash&&player.airDash&&player.dashCool<=0){player.airDash=false;player.dashTime=.17;player.dashCool=.43;player.vy=0;shake=5;burst(player.x+15,player.y+20,'#a4ede1',23,240);sound(750,.18,'sawtooth',.045,-440)}
 if(attack&&player.slashCool<=0){player.slashCool=.34;player.slashTime=.22;shake=2;slashes.push({x:player.x,y:player.y,dir:player.dir,life:.25});sound(610,.13,'triangle',.05,-310);const attackRect={x:player.dir===1?player.x+25:player.x-87,y:player.y-4,w:90,h:68};for(const e of enemies){if(e.alive&&canTouch(attackRect,e)){e.hp--;e.x+=player.dir*20;burst(e.x,e.y+14,'#b7f1ca',16,170);addText(e.x,e.y-7,e.hp<=0?'✦':'–1');if(e.hp<=0){e.alive=false;burst(e.x,e.y+15,'#e7caa8',29,255);sound(250,.19,'triangle',.04,-170)}else sound(420,.12,'triangle',.04,-170)}}}
 player.slashCool=Math.max(0,player.slashCool-dt);player.slashTime=Math.max(0,player.slashTime-dt);player.dashCool=Math.max(0,player.dashCool-dt);
 const py=player.y,prevBottom=py+player.h;
 player.x=clamp(player.x+player.vx*dt,10,WORLD-55);
 player.y+=player.vy*dt;player.grounded=false;
 if(player.vy>=0){for(const p of platforms){if(prevBottom<=p.y+9 && player.y+player.h>=p.y && player.x+player.w>p.x+3&&player.x<p.x+p.w-3){player.y=p.y-player.h;player.vy=0;player.grounded=true;player.airDash=true;break}}}
 if(player.grounded&&Math.abs(player.vx)>80){player.steps+=dt;if(player.steps>.105){player.steps=0;particles.push({x:player.x+14,y:player.y+player.h,vx:(Math.random()-.5)*50,vy:-Math.random()*27,life:.43,max:.43,color:'#d4dcb0',size:1+Math.random()*2,gravity:20})}}
 if(player.y>H+160){hit();respawn()}
 player.hurt=Math.max(0,player.hurt-dt);player.anim+=dt*(3.9+Math.abs(player.vx)/30);
 for(let i=0;i<echoes.length;i++){let e=echoes[i];if(!e.got&&Math.hypot(player.x+player.w/2-e.x,player.y+player.h/2-e.y)<42){e.got=true;save();burst(e.x,e.y,'#eef9b1',44,260);marquee(['PRIMER ECO · EL ALBA','SEGUNDO ECO · EL VIENTO','TERCER ECO · EL RECUERDO'][i],3.3);toast('Un recuerdo despertó. '+echoes.filter(q=>q.got).length+' / 3 ecos encontrados.',3.5);sound(630,.32,'sine',.07,270);setTimeout(()=>sound(950,.45,'sine',.06,330),120);renderHud()}}
 for(const e of enemies){if(!e.alive)continue;e.t+=dt;e.x+=e.dir*68*dt;if(Math.abs(e.x-e.base)>e.range){e.dir*=-1;e.x=clamp(e.x,e.base-e.range,e.base+e.range)}if(player.hurt===0&&player.dashTime<=0&&canTouch(player,e))hit()}
 for(const s of slashes)s.life-=dt;slashes=slashes.filter(s=>s.life>0);
 for(const v of floatTexts){v.life-=dt;v.y-=39*dt}floatTexts=floatTexts.filter(v=>v.life>0);
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gravity*dt;p.vx*=Math.max(0,1-dt);p.life-=dt}particles=particles.filter(p=>p.life>0);
 const camTarget=cameraFor(player.x);camX=lerp(camX,camTarget,Math.min(1,dt*4.3));
 const nextArea=player.x<1650?'SENDERO DE CENIZA':player.x<3300?'EL BOSQUE QUE RESPIRA':'LAS RUINAS DEL CORAZÓN';if(area!==nextArea){area=nextArea;marquee(area,2.7);renderHud()}
 const near=nearInteractive();$('interaction').hidden=!near;if(near)$('interactionText').textContent=near.name;
}
function sky(){let gradient=c.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#080f25');gradient.addColorStop(.30,'#233147');gradient.addColorStop(.63,'#526b73');gradient.addColorStop(1,'#8d9a82');c.fillStyle=gradient;c.fillRect(0,0,W,H);
 let moonX=930-camX*.011,moonY=149;
 let glow=c.createRadialGradient(moonX,moonY,5,moonX,moonY,350);glow.addColorStop(0,'#d6f4cb58');glow.addColorStop(.25,'#add9d52b');glow.addColorStop(1,'#accfda00');c.fillStyle=glow;c.fillRect(moonX-360,moonY-350,720,720);
 c.fillStyle='#e5f6d9';c.shadowBlur=34;c.shadowColor='#dff6cf';c.beginPath();c.arc(moonX,moonY,48,0,TAU);c.fill();c.shadowBlur=0;
 c.fillStyle='#d1d6c9';for(const s of stars){let a=.18+Math.sin(time*.9+s.phase)*.13;c.globalAlpha=a;c.fillRect(s.x-camX*.013,s.y,s.s,s.s)}c.globalAlpha=1;
 // Layered mountains, ruins and ethereal sky bands
 for(let layer=0;layer<3;layer++){const factor=.06+layer*.075,base=350+layer*48,amp=51+layer*36;c.fillStyle=['#223747','#2a4751','#32525a'][layer];c.beginPath();c.moveTo(-40,H);for(let x=-40;x<W+45;x+=9){let wx=x+camX*factor;let y=base+Math.sin(wx/142+layer*1.3)*amp*.54+Math.sin(wx/61+layer)*amp*.18+Math.cos(wx/335+layer)*amp*.46;c.lineTo(x,y)}c.lineTo(W+40,H);c.fill()}
 c.fillStyle='#283e49';for(let i=0;i<19;i++){const px=((i*168-camX*.09)%(W+380)+(W+380))%(W+380)-160,h=42+rand(i+99)*190;c.fillRect(px,470-h,6+rand(i)*13,h);c.beginPath();c.moveTo(px-30,470-h+12);c.lineTo(px+5,470-h-39);c.lineTo(px+40,470-h+12);c.fill()}
 // Fog at the horizon
 let mist=c.createLinearGradient(0,355,0,620);mist.addColorStop(0,'#d8edd000');mist.addColorStop(.5,'#abcabe2a');mist.addColorStop(1,'#c9dcc11a');c.fillStyle=mist;c.fillRect(0,355,W,265);
}
function drawTrees(){
 // Background canopy - silhouetted trunks and hanging boughs
 for(let i=0;i<distantTrees.length;i++){let t=distantTrees[i],sx=t.x-camX*.33;if(sx<-90||sx>W+90)continue;let yy=590; c.save();c.translate(sx,yy);c.rotate(t.tilt);c.strokeStyle='#172f36';c.lineCap='round';c.lineWidth=t.w;c.beginPath();c.moveTo(0,15);c.bezierCurveTo(-10,-t.h*.37,11,-t.h*.7,3,-t.h);c.stroke();for(let b=0;b<t.branches;b++){let by=-t.h*(.43+b*.16);c.lineWidth=9-b*1.7;c.beginPath();c.moveTo(0,by);c.quadraticCurveTo((b%2?1:-1)*37,by-36,(b%2?1:-1)*(70+b*12),by-26);c.stroke()}c.restore();}
 for(let i=0;i<nearTrees.length;i++){let t=nearTrees[i],sx=t.x-camX*.59;if(sx<-100||sx>W+100)continue;let y=615,h=t.h;c.strokeStyle='#132b32';c.lineWidth=t.w;c.lineCap='round';c.beginPath();c.moveTo(sx+11,y);c.bezierCurveTo(sx-15,y-h*.4,sx+39,y-h*.79,sx+12,y-h);c.stroke();c.strokeStyle='#233b40';c.lineWidth=2;c.beginPath();c.moveTo(sx+8,y-20);c.quadraticCurveTo(sx+30,y-h*.5,sx+12,y-h*.9);c.stroke();c.strokeStyle='#132b32';c.lineWidth=11;c.beginPath();c.moveTo(sx+15,y-h*.73);c.quadraticCurveTo(sx+80,y-h*.82,sx+110,y-h*.86);c.stroke();c.beginPath();c.moveTo(sx+14,y-h*.57);c.quadraticCurveTo(sx-65,y-h*.68,sx-102,y-h*.68);c.stroke();}
}
function drawGround(){
 for(let p of platforms){const x=p.x-camX;if(x+p.w<-60||x>W+60)continue;if(p.kind==='ground'){
 let g=c.createLinearGradient(0,p.y,0,H);g.addColorStop(0,'#1a3035');g.addColorStop(1,'#09151e');c.fillStyle=g;c.fillRect(x,p.y,p.w,p.h);
 c.fillStyle='#48685a';c.fillRect(x,p.y,p.w,8);c.fillStyle='#87a988';c.fillRect(x,p.y,p.w,2);c.fillStyle='#244348';for(let j=0;j<p.w/35;j++){let dx=x+j*35;c.beginPath();c.ellipse(dx,p.y+28+rand(j+p.x)*57,18+rand(j)*22,7,0,0,TAU);c.fill()}
 }else{c.fillStyle='#182c35';rr(x,p.y,p.w,p.h+15,4);c.fill();c.fillStyle='#446358';rr(x,p.y,p.w,8,3);c.fill();c.fillStyle='#b1bd97';c.fillRect(x+4,p.y,p.w-8,2);
 c.strokeStyle='#8ea88845';c.lineWidth=2;for(let j=0;j<p.w/31;j++){let px=x+j*31+rand(j+p.x)*19;c.beginPath();c.moveTo(px,p.y+3);c.lineTo(px-3,p.y-5-rand(j)*10);c.stroke()}}
 // Fine moss and foliage near ledges
 c.strokeStyle='#769d806b';c.lineWidth=1.5;for(let j=0;j<Math.floor(p.w/26);j++){let dx=x+j*26+rand(j+p.x)*14;if(dx<0||dx>W)continue;c.beginPath();c.moveTo(dx,p.y);c.quadraticCurveTo(dx+3,p.y-9-rand(j+28)*10,dx-5,p.y-15);c.stroke()}
 }
 // Arch and ancient gate
 drawRuins();
}
function drawRuins(){const columns=[{x:280,h:105},{x:1560,h:159},{x:2875,h:115},{x:3160,h:150},{x:4450,h:125}];for(const a of columns){let x=a.x-camX;if(x<-95||x>W+100)continue; c.fillStyle='#253940';c.fillRect(x,625-a.h,31,a.h);c.fillStyle='#71887977';c.fillRect(x-8,625-a.h,47,13);c.fillRect(x-10,613,51,14);c.fillStyle='#182f33';c.fillRect(x+7,625-a.h+19,6,a.h-30);c.strokeStyle='#54766a';c.beginPath();c.moveTo(x+8,625-a.h+28);c.lineTo(x+12,625-a.h+60);c.stroke()}
 const x=5190-camX;if(x>-240&&x<W+240){let gatePulse=(Math.sin(time*2)+1)*.5;c.save();c.translate(x,0);let glow=c.createRadialGradient(0,481,18,0,481,245);glow.addColorStop(0,echoes.every(e=>e.got)?'#cfeebb78':'#b4d8d138');glow.addColorStop(1,'#cfeebb00');c.fillStyle=glow;c.fillRect(-245,240,490,490);
 c.fillStyle='#1d333c';c.beginPath();c.moveTo(-100,625);c.lineTo(-102,422);c.quadraticCurveTo(-85,332,0,315);c.quadraticCurveTo(85,332,102,422);c.lineTo(100,625);c.closePath();c.fill();c.fillStyle='#47615d';c.fillRect(-112,609,224,16);
 c.strokeStyle='#95b69d';c.lineWidth=5;c.beginPath();c.moveTo(-83,624);c.lineTo(-83,432);c.quadraticCurveTo(-71,352,0,341);c.quadraticCurveTo(71,352,83,432);c.lineTo(83,624);c.stroke();
 let grd=c.createLinearGradient(0,365,0,625);grd.addColorStop(0,'#173441');grd.addColorStop(1,'#0c1927');c.fillStyle=grd;c.beginPath();c.moveTo(-61,625);c.lineTo(-61,445);c.quadraticCurveTo(-58,382,0,366);c.quadraticCurveTo(58,382,61,445);c.lineTo(61,625);c.fill();
 for(let i=0;i<3;i++){c.fillStyle=echoes[i].got?'#dbeab7':'#466365';c.shadowColor='#d8ebaf';c.shadowBlur=echoes[i].got?17:0;c.beginPath();c.arc((i-1)*38,474,9+gatePulse*2,0,TAU);c.fill()}c.shadowBlur=0;c.restore()}
}
function drawShrines(){for(let s of shrines){let x=s.x-camX;if(x<-60||x>W+60)continue;let on=player.checkpoint===s.x;c.save();c.translate(x,s.y);let pulse=(Math.sin(time*2.1)+1)*.5;
 let glow=c.createRadialGradient(0,-48,1,0,-48,95);glow.addColorStop(0,on?'#eafbd36a':'#98c6c452');glow.addColorStop(1,'#a5e6cd00');c.fillStyle=glow;c.fillRect(-110,-165,220,220);
 c.fillStyle='#263a41';c.fillRect(-32,-13,64,14);c.fillRect(-19,-80,38,71);c.fillStyle='#77958b';c.fillRect(-24,-85,48,9);c.fillStyle='#111e2c';c.beginPath();c.ellipse(0,-87,18,25,0,0,TAU);c.fill();c.fillStyle=on?'#e4f5cc':'#a6d5c3';c.shadowBlur=20+pulse*10;c.shadowColor='#b9ebbe';c.beginPath();c.moveTo(0,-111);c.lineTo(12,-90);c.lineTo(0,-73);c.lineTo(-12,-90);c.closePath();c.fill();c.shadowBlur=0;c.restore()}}
function drawWritings(){for(let w of writings){let x=w.x-camX;if(x<-45||x>W+45)continue;c.fillStyle='#283b44';c.fillRect(x-17,561,34,64);c.fillStyle='#91afa5';c.fillRect(x-21,561,42,8);c.fillStyle='#88a89d';c.font='21px Georgia';c.textAlign='center';c.fillText('✧',x,599)}}
function drawEchoes(){for(let i=0;i<echoes.length;i++){let e=echoes[i];if(e.got)continue;let x=e.x-camX;if(x<-80||x>W+80)continue;let y=e.y+Math.sin(time*2.6+i*1.9)*8;
 let g=c.createRadialGradient(x,y,2,x,y,80);g.addColorStop(0,'#e4ffc29c');g.addColorStop(.2,'#d3efac51');g.addColorStop(1,'#c0f7b100');c.fillStyle=g;c.fillRect(x-80,y-80,160,160);
 c.save();c.translate(x,y);c.rotate(time*.53);c.shadowBlur=24;c.shadowColor='#d5f9b4';c.strokeStyle='#f0edc6';c.fillStyle='#d8f2b3';c.lineWidth=1.8;c.beginPath();c.moveTo(0,-20);c.lineTo(12,0);c.lineTo(0,20);c.lineTo(-12,0);c.closePath();c.fill();c.stroke();c.rotate(-time);c.fillStyle='#fff9db';c.fillRect(-2,-2,4,4);c.restore();}}
function drawEnemies(){for(const e of enemies){if(!e.alive)continue;let x=e.x-camX;if(x<-85||x>W+85)continue;let y=e.y+Math.sin(e.t*3)*2;c.save();c.translate(x,y);if(e.dir<0){c.scale(-1,1);c.translate(-e.w,0)}c.shadowBlur=18;c.shadowColor='#abdfd560';c.fillStyle='#142c34';c.beginPath();c.ellipse(25,22,30,23,0,0,TAU);c.fill();c.shadowBlur=0;
 c.strokeStyle='#698d7d';c.lineWidth=3;for(let j=0;j<3;j++){c.beginPath();c.moveTo(13+j*14,15);c.lineTo(6+j*14,-8-Math.sin(time*2+j)*6);c.stroke()}
 c.fillStyle='#203f45';c.beginPath();c.ellipse(24,24,23,16,0,0,TAU);c.fill();c.fillStyle='#b3e5bd';c.shadowBlur=10;c.shadowColor='#beedbb';c.beginPath();c.ellipse(39,18,4,5,0,0,TAU);c.fill();c.shadowBlur=0;
 c.strokeStyle='#59796e';c.lineWidth=2;for(let j=0;j<3;j++){c.beginPath();c.moveTo(9+j*15,34);c.lineTo(5+j*15,43);c.stroke()}if(e.hp<e.max){c.fillStyle='#2d4650';c.fillRect(4,-22,44,4);c.fillStyle='#badfc1';c.fillRect(4,-22,44*e.hp/e.max,4)}c.restore()}}
function drawPlayer(){let x=player.x-camX+player.w/2,y=player.y;
 c.save();c.translate(x,y);let bob=player.grounded?Math.sin(player.anim*2)*1.4:0;
 if(player.hurt>0&&Math.sin(time*40)>0.2)c.globalAlpha=.48;
 // Shadows
 c.fillStyle='#07172066';c.beginPath();c.ellipse(0,player.h+4,26,7,0,0,TAU);c.fill();
 if(player.dashTime>0){for(let i=1;i<=3;i++){c.globalAlpha=.17/i;c.fillStyle='#b4f9d9';c.beginPath();c.ellipse(-player.dir*i*24,27,16,27,0,0,TAU);c.fill()}c.globalAlpha=1}
 const f=player.dir; c.scale(f,1);
 const leg=player.grounded?Math.sin(player.anim*2.6)*8:3;
 // boots
 c.fillStyle='#152b36';c.beginPath();c.moveTo(-10,39);c.lineTo(-14-leg*.3,53);c.lineTo(-3-leg*.3,54);c.lineTo(0,41);c.fill();c.beginPath();c.moveTo(6,40);c.lineTo(6+leg*.4,55);c.lineTo(17+leg*.4,54);c.lineTo(14,41);c.fill();
 // scarf sweeping in wind
 let scarf=player.dashTime>0?32:17+Math.sin(time*6)*5;
 c.fillStyle='#e2b879';c.beginPath();c.moveTo(-8,20+bob);c.quadraticCurveTo(-26,20,-29-scarf,12+Math.sin(time*7)*7);c.quadraticCurveTo(-26-scarf,29,-10,29);c.closePath();c.fill();
 // Teal cloak silhouette
 c.fillStyle='#233d47';c.beginPath();c.moveTo(-12,19+bob);c.lineTo(12,19+bob);c.quadraticCurveTo(18,33,22,47);c.quadraticCurveTo(-3,54,-19,45);c.closePath();c.fill();
 c.fillStyle='#3f6870';c.beginPath();c.moveTo(2,20+bob);c.quadraticCurveTo(14,27,14,43);c.lineTo(5,48);c.closePath();c.fill();
 // Skin and hair
 c.fillStyle='#efc9a7';rr(-11,2+bob,22,23,9);c.fill();c.fillStyle='#192a37';c.beginPath();c.moveTo(-13,12);c.quadraticCurveTo(-15,-6,2,-9);c.quadraticCurveTo(21,-6,13,17);c.lineTo(10,8);c.lineTo(4,4);c.lineTo(-5,8);c.closePath();c.fill();
 c.fillStyle='#e4e4ca';c.fillRect(5,14,3.5,2);
 // Light clasp
 c.fillStyle='#e7e1ad';c.shadowColor='#eaf7ca';c.shadowBlur=14;c.beginPath();c.arc(10,27,4.5,0,TAU);c.fill();c.shadowBlur=0;
 // blade
 c.save();c.translate(15,30);c.rotate(player.slashTime>0?-1.3+Math.sin(player.slashTime*13)*1.3:.2);c.strokeStyle='#c9eedc';c.lineWidth=3;c.beginPath();c.moveTo(0,3);c.lineTo(21,-23);c.stroke();c.strokeStyle='#f8efd0';c.lineWidth=1;c.beginPath();c.moveTo(15,-13);c.lineTo(25,-26);c.stroke();c.restore();c.restore();
 // Swipe effect
 for(const s of slashes){let px=s.x-camX+player.w/2,py=s.y+24;let a=s.life/.25;c.save();c.translate(px,py);c.scale(s.dir,1);c.globalAlpha=Math.min(1,a*2);c.strokeStyle='#e5f9d6';c.lineWidth=6*a;c.shadowColor='#c7f5d5';c.shadowBlur=27;c.beginPath();c.arc(18,0,52,-1.38,1.37);c.stroke();c.strokeStyle='#a4e7d4';c.lineWidth=2;c.beginPath();c.arc(18,0,65,-1.2,1.1);c.stroke();c.restore()}}
function drawFireflies(){for(const f of fireflies){let x=f.x-camX;if(x<-35||x>W+35)continue;let y=f.y+Math.sin(time*.8+f.p)*9;let alpha=.35+Math.sin(time*2.1+f.p)*.22;c.globalAlpha=alpha;c.fillStyle='#d9edbe';c.shadowColor='#c9eebd';c.shadowBlur=13;c.beginPath();c.arc(x,y,f.s,0,TAU);c.fill()}c.shadowBlur=0;c.globalAlpha=1}
function drawParticles(){for(const p of particles){let x=p.x-camX;if(x<0||x>W)continue;c.globalAlpha=clamp(p.life/p.max,0,1);c.fillStyle=p.color;c.beginPath();c.arc(x,p.y,p.size,0,TAU);c.fill()}c.globalAlpha=1;for(const t of floatTexts){c.globalAlpha=t.life/1.2;c.textAlign='center';c.font='17px Cinzel, Georgia, serif';c.fillStyle=t.color;c.fillText(t.s,t.x-camX,t.y)}c.globalAlpha=1}
function drawForeground(){let grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#0309126b');grad.addColorStop(.26,'#020b1700');grad.addColorStop(.8,'#00101800');grad.addColorStop(1,'#020813b5');c.fillStyle=grad;c.fillRect(0,0,W,H);
 // high branches from camera foreground
 c.strokeStyle='#06151cbb';c.lineWidth=37;c.beginPath();c.moveTo(-40,-15);c.bezierCurveTo(80,10,130,43,200,-30);c.stroke();c.beginPath();c.moveTo(1230,-70);c.quadraticCurveTo(1170,70,1280,128);c.stroke();
 c.strokeStyle='#15282ba8';c.lineWidth=3;for(let i=0;i<9;i++){let x=(i*157+time*3)%W,h=35+rand(i+33)*55;c.beginPath();c.moveTo(x,0);c.quadraticCurveTo(x+8,h*.5,x-4,h);c.stroke()}
 // screen space mist trails
 c.globalAlpha=.11;c.fillStyle='#d2ebe4';for(let i=0;i<7;i++){let y=380+i*39;let x=Math.sin(time*.14+i)*100;c.beginPath();c.ellipse(x+W*.48,y,W*.48,12+i*4,0,0,TAU);c.fill()}c.globalAlpha=1;
 // atmospheric particles drifting across viewport
 c.strokeStyle='#dce6dc20';c.lineWidth=1;for(let r of rain){let xx=((r.x+time*r.s*.15)%W),yy=((r.y+time*r.s*.56)%H);c.globalAlpha=r.a;c.beginPath();c.moveTo(xx,yy);c.lineTo(xx-5,yy+12);c.stroke()}c.globalAlpha=1;
}
function draw(){c.save();c.clearRect(0,0,W,H);let sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;c.translate(sx,sy);sky();drawTrees();drawGround();drawShrines();drawWritings();drawEchoes();drawEnemies();drawPlayer();drawFireflies();drawParticles();drawForeground();c.restore();if(hitFlash>0){c.fillStyle=`rgba(242,198,176,${hitFlash*.45})`;c.fillRect(0,0,W,H)}
}
function frame(ms){if(!frame.prev)frame.prev=ms;dt=clamp((ms-frame.prev)/1000,0,.034);frame.prev=ms;time+=dt;
 if(state==='playing'){move(dt)}else if(state==='menu'||state==='intro'){camX=state==='menu'?270:camX;player.anim+=dt*3}
 if(time>notificationsEnd)$('notification').classList.remove('active');if(time>bannerEnd)$('banner').hidden=true;
 shake=Math.max(0,shake-dt*38);hitFlash=Math.max(0,hitFlash-dt*1.9);
 draw();just.clear();requestAnimationFrame(frame)}
function keyDown(e){const code=e.code;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(code))e.preventDefault();const first=!keys.has(code);if(first)just.add(code);keys.add(code);if(!first)return;
 if(code==='Escape'){if(state==='playing'||state==='pause')pause();else if(state==='help')closeHelp()}
 if(code==='Enter'&&state==='menu')startNew();else if(code==='Enter'&&state==='intro')nextDialog();else if(code==='Enter'&&state==='end')startNew();}
function keyUp(e){keys.delete(e.code)}
window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',()=>{keys.clear();just.clear();if(state==='playing')pause()});
function setupTouch(){if(!touchEnabled)return;document.querySelectorAll('[data-key]').forEach(btn=>{const key=btn.dataset.key;const down=e=>{e.preventDefault();btn.classList.add('active');if(!keys.has(key))just.add(key);keys.add(key);};const up=e=>{e.preventDefault();btn.classList.remove('active');keys.delete(key)};btn.addEventListener('pointerdown',down);for(const ev of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(ev,up);btn.addEventListener('pointerleave',up)})}
$('playBtn').addEventListener('click',startNew);$('continueBtn').addEventListener('click',continueGame);$('dialogNext').addEventListener('click',nextDialog);
$('pauseBtn').addEventListener('click',pause);$('resumeBtn').addEventListener('click',pause);$('restartBtn').addEventListener('click',startNew);$('menuBtn').addEventListener('click',()=>{showScreen('menu');refreshContinue()});
$('helpBtn').addEventListener('click',showHelp);$('helpClose').addEventListener('click',closeHelp);
$('againBtn').addEventListener('click',startNew);$('endMenuBtn').addEventListener('click',()=>{showScreen('menu');refreshContinue()});
$('soundBtn').addEventListener('click',()=>{muted=!muted;$('soundBtn').textContent=muted?'♪̸':'♫';$('soundBtn').setAttribute('aria-label',muted?'Activar sonido':'Silenciar sonido');try{localStorage.setItem('lysara-mute',muted?'yes':'no')}catch(e){}if(!muted)sound(660,.12)});
function refreshContinue(){$('continueBtn').hidden=!saved.seen}
function init(){touchEnabled=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;setupTouch();$('stage').classList.toggle('mobile',touchEnabled);$('soundBtn').textContent=muted?'♪̸':'♫';if(saved.seen){$('continueBtn').hidden=false;}showScreen('menu');renderHud();requestAnimationFrame(frame)}
init();
// Accessible debug interface for deterministic smoke testing and quality checks.
window.LysaraDebug={getState:()=>({state,x:player.x,y:player.y,hp:player.hp,echoes:echoes.map(e=>e.got),checkpoint:player.checkpoint,enemies:enemies.filter(e=>e.alive).length}),teleport:(x,y=569)=>{player.x=x;player.y=y;player.vy=0;player.vx=0;camX=cameraFor(x)},start:()=>{reset(true);showScreen('playing')},collect:()=>{echoes.forEach(e=>e.got=true);renderHud()}};
})();
