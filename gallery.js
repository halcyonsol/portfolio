const projects=[
 {id:'page00',background:'#f5f0e5',title:'Page00',url:'projects/page00/index.html'},
 {id:'webnarrative',background:'#1a1a1a',title:'Webnarrative',url:'projects/webnarrative/index.html'},
 {id:'high-noon',background:'#141610',title:'High Noon',url:'projects/high-noon/index.html'},
 {id:'intime',background:'#050505',title:'InTime',url:'projects/intime/index.html'}
];
const world=document.querySelector('#world'),scene=document.querySelector('#scene');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let target=0,angle=0,radius=800,last=0,hover=0,hoverAt=0,active=-1;
const mod=(n,m)=>((n%m)+m)%m;
function step(dir){target=(Math.round(target/90)+dir)*90;}
function stop(){hover=0;}
function keyboard(e){
 if(!['ArrowLeft','ArrowRight'].includes(e.key)||e.ctrlKey||e.metaKey||e.shiftKey)return;
 // Keep text editing, sliders, and select controls usable inside the projects.
 if(e.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="slider"]'))return;
 e.preventDefault();e.stopImmediatePropagation();stop();
 if(!e.repeat)step(e.key==='ArrowLeft'?-1:1);
}
function applyBackground(color){
 document.documentElement.style.setProperty('--page-background',color);
 document.querySelector('meta[name="theme-color"]').content=color;
}
function syncBackground(frame,p){
 const doc=frame.contentDocument,view=frame.contentWindow;
 const color=[doc.body,doc.documentElement].filter(Boolean).map(el=>view.getComputedStyle(el).backgroundColor).find(c=>c!=='transparent'&&c!=='rgba(0, 0, 0, 0)');
 if(color)p.background=color;
 frame.parentElement.style.background=p.background;
 frame.style.background=p.background;
 if(projects[active]===p)applyBackground(p.background);
}
const panels=projects.map(p=>{
 const panel=document.createElement('section');panel.className='panel';panel.setAttribute('aria-label',p.title);
 const screen=document.createElement('div');screen.className='screen';const frame=document.createElement('iframe');frame.title=p.title;frame.src=p.url;frame.allow='fullscreen';screen.append(frame);panel.append(screen);world.append(panel);
 frame.addEventListener('load',()=>{try{const doc=frame.contentDocument;doc.addEventListener('keydown',keyboard,true);syncBackground(frame,p);const observer=new MutationObserver(()=>syncBackground(frame,p));[doc.documentElement,doc.body].forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class','style']}));frame.contentWindow.addEventListener('hashchange',()=>syncBackground(frame,p));doc.addEventListener('pointermove',stop);let touch=null;doc.addEventListener('touchstart',e=>{const t=e.touches[0];touch=t.clientX<24||t.clientX>frame.clientWidth-24?{x:t.clientX,y:t.clientY}:null;},{passive:true});doc.addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1);touch=null;},{passive:true});}catch{}});
 return panel;
});
function resize(){const w=scene.clientWidth,h=scene.clientHeight;radius=w/2;scene.style.perspective=radius+'px';world.style.transform=`translateZ(${radius}px)`;panels.forEach(p=>{p.style.width=(w+.5)+'px';p.style.height=h+'px';});draw();}
function select(i){if(i===active)return;active=i;applyBackground(projects[i].background);document.querySelector('#announcement').textContent=projects[i].title;document.title=projects[i].title+' — Winston Kim';history.replaceState(null,'','#'+projects[i].id);}
function draw(){panels.forEach((p,i)=>{const a=mod(i*90-angle+180,360)-180,r=a*Math.PI/180;p.style.transform=`translate(-50%,-50%) translate3d(${radius*Math.sin(r)}px,0,${-radius*Math.cos(r)}px) rotateY(${-a}deg)`;p.style.visibility=Math.abs(a)<100?'visible':'hidden';const usable=Math.abs(a)<.5;p.inert=!usable;p.querySelector('iframe').tabIndex=usable?0:-1;});select(mod(Math.round(angle/90),4));}
function tick(t){const dt=Math.min(t-last||16,40);last=t;if(hover&&t-hoverAt>450&&Math.abs(target-angle)<.1){step(hover);hoverAt=t;}const before=angle;angle=reduced.matches?target:angle+(target-angle)*(1-Math.exp(-dt/160));if(Math.abs(angle-target)<.01)angle=target;if(before!==angle)draw();requestAnimationFrame(tick);}
for(const [selector,dir] of [['.left',-1],['.right',1]]){const edge=document.querySelector(selector);edge.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=dir;hoverAt=performance.now();}});edge.addEventListener('pointerleave',stop);edge.addEventListener('touchstart',()=>step(dir),{passive:true});}
window.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop);document.addEventListener('mouseleave',stop);window.addEventListener('resize',resize);document.addEventListener('keydown',keyboard,true);
function readHash(){const i=projects.findIndex(p=>p.id===location.hash.slice(1));if(i>=0){const current=Math.round(target/90);target=(current+mod(i-current+2,4)-2)*90;}}
readHash();angle=target;window.addEventListener('hashchange',readHash);resize();requestAnimationFrame(tick);
