const projects=[
 {id:'page00',background:'#f5f0e5',title:'Page00',url:'projects/page00/index.html'},
 {id:'webnarrative',background:'#1a1a1a',title:'Webnarrative',url:'projects/webnarrative/index.html'},
 {id:'high-noon',background:'#141610',title:'High Noon',url:'projects/high-noon/index.html'},
 {id:'intime',background:'#050505',title:'InTime',url:'projects/intime/index.html'}
];
const scene=document.querySelector('#scene'),world=document.querySelector('#world');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mod=(n,m)=>((n%m)+m)%m;
let target=0,angle=0,active=-1,last=0,hover=0,hoverAt=0,w=1,h=1,focal=1,pixelsPerRadian=1,pageWidth=1;
const svgNS='http://www.w3.org/2000/svg';
const definition=document.createElementNS(svgNS,'svg');definition.id='warp-definition';
definition.innerHTML='<defs><filter id="cylinder-warp" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"></filter></defs>';
document.body.append(definition);
const interaction=document.createElement('div');interaction.id='interaction';interaction.tabIndex=0;interaction.setAttribute('aria-label','Curved portfolio. Left and right arrow keys change projects.');document.querySelector('#gallery').append(interaction);
function stop(){hover=0;}
function step(dir){target=(Math.round(target/90)+dir)*90;}
function keyboard(e){
 if(!['ArrowLeft','ArrowRight'].includes(e.key)||e.ctrlKey||e.metaKey||e.shiftKey)return;
 if(e.target?.closest?.('textarea,input:not([type=range]),[contenteditable]:not([contenteditable="false"])'))return;
 e.preventDefault();e.stopImmediatePropagation();stop();if(!e.repeat)step(e.key==='ArrowLeft'?-1:1);
}
function applyBackground(color){document.documentElement.style.setProperty('--page-background',color);document.querySelector('meta[name="theme-color"]').content=color;}
function syncBackground(frame,p){
 const doc=frame.contentDocument;
 const color=[doc.body,doc.documentElement].filter(Boolean).map(el=>frame.contentWindow.getComputedStyle(el).backgroundColor).find(c=>c!=='transparent'&&c!=='rgba(0, 0, 0, 0)');
 if(color)p.background=color;
 frame.parentElement.style.background=p.background;
 if(projects[active]===p)applyBackground(p.background);
}
const panels=projects.map(p=>{
 const panel=document.createElement('section');panel.className='panel';panel.setAttribute('aria-label',p.title);
 const screen=document.createElement('div');screen.className='screen';screen.style.background=p.background;const frame=document.createElement('iframe');frame.title=p.title;frame.src=p.url;frame.allow='fullscreen';screen.append(frame);panel.append(screen);world.append(panel);
 frame.addEventListener('load',()=>{try{
  const doc=frame.contentDocument;frame.contentWindow.addEventListener('keydown',keyboard,true);syncBackground(frame,p);
  const observer=new MutationObserver(()=>syncBackground(frame,p));[doc.documentElement,doc.body].forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class','style']}));
  frame.contentWindow.addEventListener('hashchange',()=>syncBackground(frame,p));
 }catch{}});
 return panel;
});
// Inverse cylindrical projection: each output pixel samples the live webpage
// at its angular position on the ring. Text and images follow the wall curvature.
function unproject(x,y){const phi=(x-w/2)/pixelsPerRadian;return {x,y:h/2+(y-h/2)*Math.pow(Math.cos(phi),.65)};}
function resize(){
 w=innerWidth;h=innerHeight;pageWidth=w*.74;pixelsPerRadian=pageWidth/(Math.PI/2);
 panels.forEach(p=>p.style.width=(pageWidth+.5)+'px');
 // A single resampling pass avoids cumulative rounding of live DOM pixels.
 const edgeFactor=Math.pow(Math.cos(w/2/pixelsPerRadian),.65);
 const scale=h*(1-edgeFactor)+1;
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d'),map=ctx.createImageData(w,h),upper=ctx.createImageData(w,h),weight=ctx.createImageData(w,h);
 for(let x=0;x<w;x++){
  const factor=Math.pow(Math.cos((x-w/2)/pixelsPerRadian),.65)-1;
  for(let y=0;y<h;y++){const i=(y*w+x)*4,dy=(y-h/2)*factor;
   const value=255*(.5+dy/scale),lo=Math.floor(value),hi=Math.ceil(value);map.data[i]=upper.data[i]=128;map.data[i+1]=lo;upper.data[i+1]=hi;map.data[i+2]=upper.data[i+2]=128;map.data[i+3]=upper.data[i+3]=255;weight.data[i]=weight.data[i+1]=weight.data[i+2]=255;weight.data[i+3]=Math.round(255*(value-lo));
  }
 }
 const filter=document.querySelector('#cylinder-warp');filter.replaceChildren();
 for(const [name,data] of [['lower',map],['upper',upper],['weight',weight]]){ctx.putImageData(data,0,0);const image=document.createElementNS(svgNS,'feImage');image.setAttribute('href',canvas.toDataURL());image.setAttribute('result',name);image.setAttribute('preserveAspectRatio','none');image.setAttribute('width','100%');image.setAttribute('height','100%');filter.append(image);}
 // Interpolate neighboring displacement samples instead of snapping text
 // and curved edges to the 8-bit map's discrete displacement steps.
 for(const name of ['lower','upper']){const pass=document.createElementNS(svgNS,'feDisplacementMap');pass.setAttribute('in','SourceGraphic');pass.setAttribute('in2',name);pass.setAttribute('scale',scale);pass.setAttribute('xChannelSelector','R');pass.setAttribute('yChannelSelector','G');pass.setAttribute('result',name+'-image');filter.append(pass);}
 for(const [source,operator,result] of [['lower-image','out','low'],['upper-image','in','high']]){const c=document.createElementNS(svgNS,'feComposite');c.setAttribute('in',source);c.setAttribute('in2','weight');c.setAttribute('operator',operator);c.setAttribute('result',result);filter.append(c);}
 const mix=document.createElementNS(svgNS,'feComposite');mix.setAttribute('in','low');mix.setAttribute('in2','high');mix.setAttribute('operator','arithmetic');mix.setAttribute('k2','1');mix.setAttribute('k3','1');filter.append(mix);
 draw();
}
function select(i){if(i===active)return;active=i;applyBackground(projects[i].background);document.querySelector('#announcement').textContent=projects[i].title;document.title=projects[i].title+' — Winston Kim';history.replaceState(null,'','#'+projects[i].id);}
function draw(){panels.forEach((p,i)=>{
 const delta=mod(i*90-angle+180,360)-180;p.dataset.offset=String(w/2+pixelsPerRadian*delta*Math.PI/180-pageWidth/2);p.style.left=p.dataset.offset+'px';
 p.style.visibility=Math.abs(delta)<145?'visible':'hidden';const shift=-Math.sign(delta)*Math.min(Math.abs(delta)/90,1)*pageWidth*.28;p.dataset.shift=String(shift);p.querySelector('iframe').style.transform=`translateX(${shift}px)`;p.querySelector('iframe').tabIndex=Math.abs(delta)<1?0:-1;
});select(mod(Math.round(angle/90),4));}
function tick(t){const dt=Math.min(t-last||16,40);last=t;if(hover&&t-hoverAt>450&&Math.abs(target-angle)<.1){step(hover);hoverAt=t;}const before=angle;angle=reduced.matches?target:angle+(target-angle)*(1-Math.exp(-dt/180));if(Math.abs(angle-target)<.01)angle=target;if(before!==angle)draw();requestAnimationFrame(tick);}
// SVG filters don't remap native hit testing. Inverse-project pointer coordinates
// into the original, live iframe so the visible controls remain clickable.
function hit(e){
 const q=unproject(e.clientX,e.clientY);
 const panel=panels.find(p=>p.style.visibility!=='hidden'&&q.x>=+p.dataset.offset&&q.x<+p.dataset.offset+pageWidth);
 if(!panel||q.y<h*.15||q.y>h*.85)return null;
 const frame=panel.querySelector('iframe'),x=q.x-+panel.dataset.offset-+panel.dataset.shift,y=q.y-h*.15;
 try{return {frame,doc:frame.contentDocument,el:frame.contentDocument.elementFromPoint(x,y),x,y};}catch{return null;}
}
function send(info,type,e){if(!info?.el)return;const options={bubbles:true,cancelable:true,view:info.frame.contentWindow,clientX:info.x,clientY:info.y,button:e.button||0,buttons:e.buttons||0,pointerId:e.pointerId||1,pointerType:e.pointerType||'mouse'};info.el.dispatchEvent(type.startsWith('pointer')?new PointerEvent(type,options):new MouseEvent(type,options));}
function range(info){const el=info?.el;if(el?.matches('input[type=range]')){const r=el.getBoundingClientRect(),min=Number(el.min||0),max=Number(el.max||100),step=el.step==='any'?0:Number(el.step||1);let value=min+Math.max(0,Math.min(1,(info.x-r.left)/r.width))*(max-min);if(step)value=min+Math.round((value-min)/step)*step;el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));return true;}return false;}
let pressed=null,touch=null,previousHover=null;
interaction.addEventListener('pointerdown',e=>{e.preventDefault();stop();pressed=hit(e);touch=e.pointerType==='touch'?{x:e.clientX,y:e.clientY,lastY:e.clientY,moved:false}:null;if(pressed?.el){pressed.frame.contentWindow.focus();pressed.el.focus?.({preventScroll:true});range(pressed);send(pressed,'pointerdown',e);send(pressed,'mousedown',e);}interaction.setPointerCapture(e.pointerId);});
interaction.addEventListener('pointermove',e=>{
 const info=hit(e);interaction.style.cursor=info?.el?info.frame.contentWindow.getComputedStyle(info.el).cursor:'default';
 if(previousHover?.el!==info?.el){send(previousHover,'mouseout',e);send(info,'mouseover',e);previousHover=info;}
 send(info,'pointermove',e);send(info,'mousemove',e);
 if(pressed?.el?.matches('input[type=range]'))range({...pressed,x:unproject(e.clientX,e.clientY).x-+pressed.frame.closest('.panel').dataset.offset});
 if(touch&&Math.abs(e.clientY-touch.y)>8){touch.moved=true;scroll(info,touch.lastY-e.clientY);touch.lastY=e.clientY;}
});
interaction.addEventListener('pointerup',e=>{
 const info=hit(e);send(info,'pointerup',e);send(info,'mouseup',e);
 const swipe=touch&&Math.abs(e.clientX-touch.x)>65&&Math.abs(e.clientX-touch.x)>Math.abs(e.clientY-touch.y)*1.5;
 if(swipe)step(e.clientX<touch.x?1:-1);
 else if(pressed&&info?.el===pressed.el&&!touch?.moved){
  if(info.el.matches('input[type=range]'))info.el.dispatchEvent(new Event('change',{bubbles:true}));
  else {send(info,'click',e);if(info.el.matches('select')){try{info.el.showPicker();}catch{}}}
 }
 pressed=null;touch=null;
});
interaction.addEventListener('pointercancel',()=>{pressed=null;touch=null;});
function scroll(info,delta){if(!info?.el)return;let el=info.el;while(el&&el!==info.doc.documentElement){const style=info.frame.contentWindow.getComputedStyle(el);if(/auto|scroll/.test(style.overflowY)&&el.scrollHeight>el.clientHeight){el.scrollTop+=delta;return;}el=el.parentElement;}info.doc.scrollingElement.scrollTop+=delta;}
interaction.addEventListener('wheel',e=>{e.preventDefault();scroll(hit(e),e.deltaY*(e.deltaMode===1?16:1));},{passive:false});
for(const [selector,dir] of [['.left',-1],['.right',1]]){const edge=document.querySelector(selector);edge.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=dir;hoverAt=performance.now();}});edge.addEventListener('pointerleave',stop);edge.addEventListener('touchstart',()=>step(dir),{passive:true});}
window.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop);document.addEventListener('mouseleave',stop);window.addEventListener('resize',resize);window.addEventListener('keydown',keyboard,true);
function readHash(){const i=projects.findIndex(p=>p.id===location.hash.slice(1));if(i>=0){const current=Math.round(target/90);target=(current+mod(i-current+2,4)-2)*90;}}
readHash();angle=target;resize();window.addEventListener('hashchange',readHash);requestAnimationFrame(tick);
