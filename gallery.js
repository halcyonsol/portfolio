const projects=[
 {id:'page00',background:'#f5f0e5',title:'Page00',url:'projects/page00/index.html'},
 {id:'webnarrative',background:'#1a1a1a',title:'Webnarrative',url:'projects/webnarrative/index.html'},
 {id:'high-noon',background:'#141610',title:'High Noon',url:'projects/high-noon/index.html'},
 {id:'intime',background:'#050505',title:'InTime',url:'projects/intime/index.html'}
];
const scene=document.querySelector('#scene'),world=document.querySelector('#world');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mod=(n,m)=>((n%m)+m)%m;
let target=0,angle=0,active=-1,w=1,h=1,pixelsPerRadian=1,pageWidth=1;
let mode='page',animation=0,edgeTimer=0,mapSize='',transitionStart=0,transitionFrom=0;
const svgNS='http://www.w3.org/2000/svg';
const definition=document.createElementNS(svgNS,'svg');definition.id='warp-definition';
definition.innerHTML='<defs><filter id="cylinder-warp" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"></filter></defs>';
document.body.append(definition);
const interaction=document.createElement('div');interaction.id='interaction';interaction.tabIndex=0;interaction.setAttribute('aria-label','Curved portfolio. Left and right arrow keys change projects.');document.querySelector('#gallery').append(interaction);
const toggle=document.createElement('button');toggle.id='view-toggle';toggle.type='button';toggle.textContent='Curved view';toggle.setAttribute('aria-label','Return to the curved view to switch pages');document.body.append(toggle);
function stop(){clearTimeout(edgeTimer);edgeTimer=0;}
function showPage(){
 stop();cancelAnimationFrame(animation);animation=0;mode='page';angle=target=Math.round(target/90)*90;select(mod(Math.round(angle/90),4));
 document.body.dataset.view='page';
 panels.forEach((p,i)=>{p.classList.toggle('current',i===active);p.inert=i!==active;p.querySelector('iframe').tabIndex=i===active?0:-1;});
 toggle.textContent='Curved view';toggle.setAttribute('aria-label','Return to the curved view to switch pages');
 panels[active].querySelector('iframe').contentWindow.focus();
}
function showCurve(){
 mode='curve';document.body.dataset.view='curve';angle=target=active*90;panels.forEach(p=>p.inert=true);
 toggle.textContent='Open page';toggle.setAttribute('aria-label','Open the current page fullscreen');resize();interaction.focus();
}
toggle.addEventListener('click',()=>mode==='page'?showCurve():showPage());
function step(dir){
 if(mode!=='curve')return;
 stop();transitionFrom=angle;target=(Math.round(target/90)+dir)*90;transitionStart=performance.now();
 cancelAnimationFrame(animation);animation=requestAnimationFrame(tick);
}
function keyboard(e){
 if(mode!=='curve')return;
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
// Build the curved selector lazily and reuse its projection until the viewport changes.
function resize(){
 if(mode!=='curve')return;
 w=innerWidth;h=innerHeight;pageWidth=w*.74;pixelsPerRadian=pageWidth/(Math.PI/2);
 panels.forEach(p=>p.style.width=(pageWidth+.5)+'px');
 const size=w+'x'+h;if(mapSize===size){draw();return;}mapSize=size;
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
function tick(t){
 if(mode!=='curve'){animation=0;return;}
 const progress=reduced.matches?1:Math.min(1,(t-transitionStart)/650);
 const eased=progress<.5?4*progress**3:1-(-2*progress+2)**3/2;
 angle=transitionFrom+(target-transitionFrom)*eased;draw();
 if(progress===1){animation=0;showPage();}else animation=requestAnimationFrame(tick);
}
// The curved scene is only a selector. The ordinary iframe receives native
// mouse, touch, and keyboard events once the rotation completes.
let startTouch=null;
interaction.addEventListener('pointerdown',e=>{startTouch={x:e.clientX,y:e.clientY};});
interaction.addEventListener('pointerup',e=>{
 if(mode!=='curve'||animation||!startTouch)return;
 const dx=e.clientX-startTouch.x,dy=e.clientY-startTouch.y;startTouch=null;
 if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))step(dx<0?1:-1);
 else if(Math.abs(dx)<12&&Math.abs(dy)<12){if(e.clientX<w*.13)step(-1);else if(e.clientX>w*.87)step(1);else showPage();}
});
for(const [selector,dir] of [['.left',-1],['.right',1]]){
 const edge=document.querySelector(selector);
 edge.addEventListener('pointerenter',e=>{if(mode==='curve'&&e.pointerType==='mouse'&&!animation){stop();edgeTimer=setTimeout(()=>step(dir),350);}});
 edge.addEventListener('pointerleave',stop);edge.addEventListener('touchstart',()=>step(dir),{passive:true});
}
window.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop);document.addEventListener('mouseleave',stop);window.addEventListener('resize',resize);window.addEventListener('keydown',keyboard,true);
function readHash(){const i=projects.findIndex(p=>p.id===location.hash.slice(1));if(i>=0){const current=Math.round(target/90);target=(current+mod(i-current+2,4)-2)*90;}}
readHash();angle=target;showPage();window.addEventListener('hashchange',()=>{readHash();if(mode==='page')showPage();else{angle=target;draw();}});
