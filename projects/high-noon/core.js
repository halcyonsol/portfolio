(function(root){
'use strict';
const destinations=[
 {id:'house',name:'Abandoned house',minutes:2,loot:{water:2,food:2,scrap:1},note:'A photograph is taped to the fridge. Four people on a beach, squinting into a sun they still trusted.'},
 {id:'grocery',name:'Grocery store',minutes:5,loot:{food:3,water:3,battery:1},note:'A handwritten sign: NIGHT HOURS ONLY. Someone kept crossing out the closing time.'},
 {id:'pharmacy',name:'Pharmacy',minutes:4,loot:{medicine:2,battery:2},note:'The last prescription on the counter is for a child. Beside it: “Meet us after sunset.”'},
 {id:'tower',name:'Radio tower',minutes:8,loot:{battery:3,scrap:2},note:'A looping recording: “If you can hear this, do not follow the daylight. We are still here.”'},
 {id:'lab',name:'Research station',minutes:11,loot:{filter:2,shield:1,scrap:2},note:'FIELD TRIAL 09: shielding delays exposure. It does not make us immune. The final page is missing.'}
];
const labels={water:'Water',food:'Food',medicine:'Medicine',battery:'Battery',filter:'Filter cartridge',scrap:'Suit repair material',shield:'UV shielding'};
function uvAt(hour){const h=((hour%24)+24)%24;return h<6||h>20?0:10*Math.sin(Math.PI*(h-6)/14)**2}
function wear(uv,shield){return (.25+uv*.45)*(shield?.65:1)}
function forecast(hour,minutes,shield){let damage=0,peak=0;for(let m=0;m<minutes*2;m+=.25){const uv=uvAt(hour+m/60);damage+=wear(uv,shield)*Math.min(.25,minutes*2-m);peak=Math.max(peak,uv)}return {damage,peak,risk:damage>=65?'HIGH':damage>=25?'MODERATE':'LOW'}}
function create(){return {hour:13,suit:100,suited:false,shield:false,filter:64,exposure:0,heat:0,health:100,power:75,bag:{water:1,food:1},capacity:6,dead:false,reason:'',stock:Object.fromEntries(destinations.map(d=>[d.id,{...d.loot}])),visited:[],repairs:0,events:0}}
function count(s){return Object.values(s.bag).reduce((a,b)=>a+b,0)}
function take(s,place,item){if(count(s)>=s.capacity)return false;if(!(s.stock[place]?.[item]>0))return false;s.stock[place][item]--;s.bag[item]=(s.bag[item]||0)+1;return true}
function consume(s,item){if(!(s.bag[item]>0))return false;s.bag[item]--;return true}
function use(s,item,inside){if(!s.bag[item])return 'You do not have that supply.';if(['filter','scrap','shield','battery'].includes(item)&&!inside)return 'Return to the shelter workbench to use this.';
 if(item==='filter'){s.filter=100;s.repairs++}else if(item==='scrap')s.suit=Math.min(100,s.suit+45);else if(item==='shield'){if(s.shield)return 'Shielding is already installed.';s.shield=true}else if(item==='battery')s.power=Math.min(100,s.power+50);else if(item==='medicine'){s.health=Math.min(100,s.health+35);s.exposure=Math.max(0,s.exposure-25)}else if(item==='water')s.heat=Math.max(0,s.heat-35);else if(item==='food')s.health=Math.min(100,s.health+15);consume(s,item);return labels[item]+' used.'}
function tick(s,minutes,outside,event){if(s.dead)return;const uv=uvAt(s.hour)+(event==='flare'?4:0);s.hour=(s.hour+minutes/60)%24;s.filter=Math.max(0,s.filter-minutes*(event==='dust'?.65:.07));s.power=Math.max(0,s.power-minutes*.09);
 if(outside){if(s.suited&&s.suit>0){s.suit=Math.max(0,s.suit-wear(uv,s.shield)*minutes*(event==='seal'?2:1));s.exposure+=uv*.16*minutes;s.heat=Math.max(0,s.heat+(uv*.65-.8)*minutes)}else{s.exposure+=uv*2*minutes;if(uv>=6){s.dead=true;s.reason='The light found you without a working suit.'}}if(event==='dust')s.health-=minutes*.5;if(s.heat>=85)s.health-=minutes*1.5;}else{s.exposure=Math.max(0,s.exposure-minutes*1.5);s.heat=Math.max(0,s.heat-minutes*3);if(s.filter<=0||s.power<=0)s.health-=minutes*1.5}
 if(s.exposure>=100||s.health<=0){s.dead=true;s.reason=s.exposure>=100?'Your exposure limit was reached.':'Your body could not keep going.'}s.health=Math.max(0,s.health);s.exposure=Math.min(100,s.exposure);s.heat=Math.min(100,s.heat);}
const api={destinations,labels,uvAt,wear,forecast,create,count,take,use,tick,consume};if(typeof module!=='undefined')module.exports=api;else root.Survival=api;
})(globalThis);
