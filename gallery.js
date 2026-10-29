const projects = [
 {id:'page00',title:'The house with many views.',short:'Page00',category:'01 / SPACE & PERSPECTIVE',description:'An invitation to step inside. Explore a house through its walls, corners, and shifting points of view.',url:'projects/page00/index.html'},
 {id:'webnarrative',title:'Between floors.',short:'Webnarrative',category:'02 / INTERACTIVE NARRATIVE',description:'An elevator, an unfamiliar building, and a story that unfolds one floor at a time.',url:'projects/webnarrative/index.html'},
 {id:'high-noon',title:'High Noon.',short:'High Noon',category:'03 / DATA SELF-PORTRAIT',description:'A future self-portrait told through survival. Navigate sunlight, dwindling resources, and a hostile world.',url:'projects/high-noon/index.html'},
 {id:'intime',title:'In time.',short:'InTime',category:'04 / SPECULATIVE INTERFACE',description:'What if time were currency? Explore the time bank, marketplace, and transfers — from Lifeline to Timeline.',url:'projects/intime/index.html'}
];
const $=s=>document.querySelector(s), world=$('#world'), scene=$('#scene');
let target=0,angle=0,radius=800,width=1100,height=600,last=0,hover=0,hoverAt=0,active=-1,fullscreen=false,animation=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const panels=projects.map((p,i)=>{
 const panel=document.createElement('section');panel.className='panel';panel.setAttribute('aria-label',p.short);
 panel.innerHTML=`<div class="panel-label"><span>${String(i+1).padStart(2,'0')} — ${p.short.toUpperCase()}</span><span>INTERACTIVE WEB EXPERIMENT</span></div><div class="screen"><iframe title="${p.short} — interactive project" data-src="${p.url}" allow="fullscreen" tabindex="-1"></iframe><button class="expand-project" aria-label="Open ${p.short} fullscreen"></button></div>`;
 world.append(panel);panel.querySelector('.expand-project').onclick=()=>openProject(i);
 const b=document.createElement('button');b.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span>${p.short}`;b.onclick=()=>go(i);$('#index').append(b);
 return panel;
});
const back=document.createElement('button');back.id='back-to-portfolio';back.type='button';back.textContent='← Back to portfolio';back.hidden=true;back.onclick=closeProject;document.body.append(back);
function openProject(i){
 hover=0;go(i);angle=target;draw();fullscreen=true;cancelAnimationFrame(animation);animation=0;
 document.body.classList.add('project-fullscreen');panels.forEach((p,j)=>{p.classList.toggle('expanded',i===j);p.inert=i!==j;p.querySelector('iframe').tabIndex=i===j?0:-1;});
 $('#instructions').hidden=true;$('#help').setAttribute('aria-expanded','false');back.hidden=false;panels[i].querySelector('iframe').contentWindow.focus();
}
function closeProject(){
 fullscreen=false;document.body.classList.remove('project-fullscreen');back.hidden=true;resize();last=performance.now();animation=requestAnimationFrame(tick);panels[active].querySelector('.expand-project').focus();
}
function resize(){if(fullscreen)return;width=Math.max(280,innerWidth*.85);height=Math.max(160,$('#gallery').clientHeight-100);radius=height*.70;scene.style.perspective=radius+'px';world.style.transform=`translateZ(${radius}px)`;panels.forEach(p=>{p.style.width=width+'px';p.style.height=height+'px';});draw();}
function mod(n,m){return ((n%m)+m)%m}
function go(i){const current=Math.round(target/90);let delta=mod(i-current+2,4)-2;target=(current+delta)*90;}
function step(dir){target=(Math.round(target/90)+dir)*90;}
function select(i){if(i===active)return;active=i;const p=projects[i];$('#title').textContent=p.title;$('#category').textContent=p.category;$('#description').textContent=p.description;$('#open').href=p.url;$('#open').setAttribute('aria-label','Open '+p.short+' in a new tab');$('#counter').textContent=String(i+1).padStart(2,'0')+' / 04';$('#versions').hidden=i!==3;$('#announcement').textContent=p.short;history.replaceState(null,'','#'+p.id);[...$('#index').children].forEach((b,j)=>b.setAttribute('aria-current',String(i===j)));}
function draw(){panels.forEach((p,i)=>{const a=mod(i*90-angle+180,360)-180,rad=a*Math.PI/180; p.style.transform=`translate(-50%,-50%) translate3d(0,${radius*Math.sin(rad)}px,${-radius*Math.cos(rad)}px) rotateX(${a}deg)`;p.style.visibility=Math.abs(a)<100?'visible':'hidden';const usable=Math.abs(a)<8;p.inert=!usable;p.querySelector('iframe').tabIndex=-1;});$('#bearing').style.transform=`rotate(${angle}deg)`;select(mod(Math.round(angle/90),4));}
function tick(t){if(fullscreen){animation=0;return;}const dt=Math.min(t-last||16,40);last=t;if(hover&&t-hoverAt>650&&Math.abs(target-angle)<.3){step(hover);hoverAt=t;}angle=reduced.matches?target:angle+(target-angle)*(1-Math.exp(-dt/190));if(Math.abs(angle-target)<.01)angle=target;draw();animation=requestAnimationFrame(tick);}
for(const [s,dir] of [['.top',-1],['.bottom',1]]){const el=$(s);el.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!reduced.matches){hover=dir;hoverAt=performance.now();}});el.addEventListener('pointerleave',()=>hover=0);el.addEventListener('click',()=>{step(dir);hoverAt=performance.now()+400;});}
window.addEventListener('blur',()=>hover=0);document.addEventListener('visibilitychange',()=>hover=0);window.addEventListener('resize',resize);
document.addEventListener('keydown',e=>{if(!$('#intro').hidden||$('#about-dialog').open)return;if(fullscreen){if(e.key==='Escape')closeProject();return;}if(e.key==='Escape')setHelp(false);if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();step(e.key==='ArrowUp'?-1:1);}});
function setHelp(open){$('#instructions').hidden=!open;$('#help').setAttribute('aria-expanded',String(open));if(open)$('#closeHelp').focus();else $('#help').focus();}
$('#help').onclick=()=>setHelp($('#instructions').hidden);$('#closeHelp').onclick=()=>setHelp(false);
let touchStart=0;$('#swipe').addEventListener('touchstart',e=>touchStart=e.changedTouches[0].clientY,{passive:true});$('#swipe').addEventListener('touchend',e=>{const d=e.changedTouches[0].clientY-touchStart;if(Math.abs(d)>45)step(d<0?1:-1)},{passive:true});
function readHash(){const i=projects.findIndex(p=>p.id===location.hash.slice(1));if(i>=0)go(i);}readHash();angle=target;window.addEventListener('hashchange',readHash);resize();
window.addEventListener('portfolio:load',()=>panels.forEach(p=>{const f=p.querySelector('iframe');f.src=f.dataset.src;}),{once:true});
window.addEventListener('portfolio:enter',()=>{last=performance.now();animation=requestAnimationFrame(tick);},{once:true});
