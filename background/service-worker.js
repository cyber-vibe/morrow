const DEFAULTS={focus:25,short:5,long:15,sessions:4,longEvery:4,auto:true,theme:'system',sites:[{name:'Wikipedia',url:'https://www.wikipedia.org/'},{name:'YouTube',url:'https://www.youtube.com/'},{name:'Coolmath Games',url:'https://www.coolmathgames.com/'}]};
const INITIAL={phase:'idle',kind:'focus',completed:0,cycle:0,duration:0,remaining:0,endAt:null,token:null,tabId:null,revision:0};
const ALARM='morrow-session';let queue=Promise.resolve();
const lock=fn=>{const p=queue.then(fn,fn);queue=p.catch(()=>{});return p};
const get=async()=>{const x=await chrome.storage.local.get(['settings','timer']);return {settings:{...DEFAULTS,...x.settings},timer:{...INITIAL,...x.timer}}};
const put=async timer=>chrome.storage.local.set({timer});
const clear=async()=>{try{await chrome.alarms.clear(ALARM)}catch(e){console.warn(e)}};
const closeTab=async id=>{if(!Number.isInteger(id))return;try{const tab=await chrome.tabs.get(id);if(tab.url?.startsWith(chrome.runtime.getURL('break/break.html')))await chrome.tabs.remove(id)}catch(e){console.debug('Tab already gone',e.message)}};
const newToken=()=>crypto.randomUUID();
const duration=(kind,s)=>60_000*(kind==='focus'?s.focus:kind==='long'?s.long:s.short);
async function start(timer,kind,s){const ms=duration(kind,s);const next={...timer,phase:kind==='focus'?'focus':'break',kind,duration:ms,remaining:ms,endAt:Date.now()+ms,token:newToken(),revision:timer.revision+1};await put(next);await clear();await chrome.alarms.create(ALARM,{when:next.endAt});return next}
async function reset(timer){const next={...INITIAL,revision:timer.revision+1,cycle:timer.cycle+1};await put(next);await clear();await closeTab(timer.tabId);return next}
async function advance(expected){const {settings:s,timer:t}=await get();if(t.token!==expected||!['focus','break'].includes(t.phase)||t.endAt===null||Date.now()+100<t.endAt)return t;
 if(t.phase==='focus'){const completed=t.completed+1;const final=completed>=s.sessions;const kind=final||completed%s.longEvery===0?'long':'short';const ms=duration(kind,s);const next={...t,completed,phase:'break',kind,duration:ms,remaining:ms,endAt:Date.now()+ms,token:newToken(),revision:t.revision+1,finalBreak:final};await put(next);await clear();await chrome.alarms.create(ALARM,{when:next.endAt});try{const tab=await chrome.tabs.create({url:chrome.runtime.getURL('break/break.html'),active:true});const now=(await get()).timer;if(now.token===next.token){now.tabId=tab.id;await put(now)}else await closeTab(tab.id)}catch(e){console.warn('Could not open break tab',e)}return next}
 if(t.finalBreak)return reset(t);
 const next={...t,phase:'idle',kind:'focus',duration:0,remaining:0,endAt:null,token:null,finalBreak:false,revision:t.revision+1};await put(next);await clear();await closeTab(t.tabId);next.tabId=null;await put(next);if(s.auto)return start(next,'focus',s);return next;
}
async function reconcile(){const {timer:t}=await get();if(['focus','break'].includes(t.phase)&&t.endAt!==null){if(t.endAt<=Date.now())return advance(t.token);await chrome.alarms.create(ALARM,{when:t.endAt})}return t}
async function command(type){await reconcile();const {settings:s,timer:t}=await get();if(type==='RESET')return reset(t);
 if(type==='START'){if(t.phase!=='idle')return t;return start(t,'focus',s)}
 if(type==='PAUSE'){if(!['focus','break'].includes(t.phase))return t;const next={...t,phase:'paused',remaining:Math.max(0,t.endAt-Date.now()),endAt:null,revision:t.revision+1};await put(next);await clear();return next}
 if(type==='RESUME'){if(t.phase!=='paused')return t;const next={...t,phase:t.kind==='focus'?'focus':'break',endAt:Date.now()+t.remaining,token:newToken(),revision:t.revision+1};await put(next);await chrome.alarms.create(ALARM,{when:next.endAt});return next}
 return t}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{lock(async()=>{if(message?.type==='GET')return reconcile();if(['START','PAUSE','RESUME','RESET'].includes(message?.type))return command(message.type);throw Error('Unknown command')}).then(timer=>respond({ok:true,timer}),error=>respond({ok:false,error:String(error)}));return true});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name===ALARM)lock(reconcile).catch(console.error)});
chrome.tabs.onRemoved.addListener(tabId=>{lock(async()=>{const {timer:t}=await get();if(t.tabId!==tabId)return;await put({...t,tabId:null,revision:t.revision+1})}).catch(console.error)});
chrome.runtime.onStartup.addListener(()=>lock(reconcile));chrome.runtime.onInstalled.addListener(()=>lock(async()=>{const x=await chrome.storage.local.get(['settings','timer']);if(!x.settings)await chrome.storage.local.set({settings:DEFAULTS});if(!x.timer)await put(INITIAL);await reconcile()}));
