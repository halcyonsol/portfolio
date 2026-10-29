const introScreen=document.querySelector('#intro');
const portfolioSections=[document.querySelector('header'),document.querySelector('#gallery'),document.querySelector('footer')];
portfolioSections.forEach(el=>el.inert=true);
const enterButton=document.querySelector('#enter-portfolio');
enterButton.focus({preventScroll:true});
let entering=false;
enterButton.addEventListener('click',()=>{
 if(entering)return;entering=true;enterButton.disabled=true;
 introScreen.classList.add('dissipating');
 // Load the projects during the reveal instead of running them behind the intro.
 window.dispatchEvent(new Event('portfolio:load'));
 const finish=()=>{introScreen.hidden=true;portfolioSections.forEach(el=>el.inert=false);window.dispatchEvent(new Event('portfolio:enter'));document.querySelector('#index button[aria-current="true"]').focus({preventScroll:true});};
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)finish();else setTimeout(finish,1450);
});
const aboutDialog=document.querySelector('#about-dialog');
document.querySelector('#about-button').addEventListener('click',()=>{document.querySelector('#instructions').hidden=true;document.querySelector('#help').setAttribute('aria-expanded','false');aboutDialog.showModal();});
document.querySelector('#close-about').addEventListener('click',()=>aboutDialog.close());
aboutDialog.addEventListener('click',e=>{if(e.target===aboutDialog){const r=aboutDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)aboutDialog.close();}});
