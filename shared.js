const DEFAULT_SETTINGS={focus:25,short:5,long:15,sessions:4,longEvery:4,auto:true,theme:'system',sites:[{name:'Wikipedia',url:'https://www.wikipedia.org/'},{name:'YouTube',url:'https://www.youtube.com/'},{name:'Coolmath Games',url:'https://www.coolmathgames.com/'}]};
function theme(value){document.documentElement.dataset.theme=value==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):value}
function format(ms){const sec=Math.ceil(Math.max(0,ms)/1000);return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
function remaining(t){return t.endAt!==null?Math.max(0,t.endAt-Date.now()):t.remaining||0}
function send(type){return chrome.runtime.sendMessage({type}).then(r=>{if(!r?.ok)throw Error(r?.error||'Request failed');return r.timer})}
function label(t){return t.kind==='focus'?'Focus time':t.kind==='long'?'Long break':'Short break'}
