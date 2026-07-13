'use strict';

var API = {
  owner: function(){return localStorage.getItem('gh_owner')||'';},
  repo: function(){return localStorage.getItem('gh_repo')||'';},
  token: function(){return localStorage.getItem('gh_token')||'';},
  headers: function(){var t=API.token();return t?{Authorization:'token '+t}:{};},
  base: function(){return 'https://api.github.com/repos/'+API.owner()+'/'+API.repo()+'/contents';}
};

var currentSection = 'home';
var data = {levels:[], entities:[], items:[], foods:[]};
var fileIndexCache = {};
var currentEditType = null;
var historyStack = [];
var isDirty = false;
var MAX_HISTORY = 20;
var currentTheme = 'amber';
var themes = ['amber','green','white'];

// ── CLASS STYLES ─────────────────────────────────
var classStyles = {"0":{icon:"\u{1F7E2}",color:"#5c9a7a",name:"SAFE"},"1":{icon:"\u{1F7E1}",color:"#c4a44a",name:"NEARLY SAFE"},"2":{icon:"\u{1F7E0}",color:"#c4844a",name:"UNSAFE"},"3":{icon:"\u{1F534}",color:"#8b5a2b",name:"DANGEROUS"},"4":{icon:"\u{1F7E3}",color:"#a95a5a",name:"EXTREME DANGER"},"5":{icon:"\u{1F535}",color:"#8b0000",name:"DEADLY"}};
var entityClassStyles = {"0":{icon:"\u{1F7E2}",color:"#5c9a7a",name:"HARMLESS"},"1":{icon:"\u{1F7E0}",color:"#c4a44a",name:"CONDITIONALLY SAFE"},"2":{icon:"\u{1F534}",color:"#c4844a",name:"DANGEROUS"},"3":{icon:"\u{1F535}",color:"#a95a5a",name:"DEADLY"}};
var itemClassStyles = {"cold_weapon":{icon:"\u{1F52A}",color:"#5c9a7a",name:"MELEE"},"firearm":{icon:"\u{1F52B}",color:"#c4a44a",name:"FIREARM"},"tool":{icon:"\u{1F527}",color:"#5c7f9a",name:"TOOL"},"other":{icon:"\u{1F4E6}",color:"#7a7f8c",name:"MISC"}};
var foodClassStyles = {"drink":{icon:"\u{1F964}",color:"#5c9a7a",name:"BEVERAGE"},"dish":{icon:"\u{1F372}",color:"#c4a44a",name:"DISH"},"plant":{icon:"\u{1F331}",color:"#5c7f9a",name:"FLORA"},"other":{icon:"\u{1F37D}",color:"#7a7f8c",name:"MISC"}};
var statColors = {safety:'#5c9a7a',stability:'#5c7f9a',entities:'#c4844a',resources:'#5c9a7a',mental:'#8a6d9a',navigation:'#5c9a9a',danger:'#a95a5a',frequency:'#c4844a',intelligence:'#5c7f9a',aggression:'#d4745c',weight:'#7a7f8c',rarity:'#c4a44a',usefulness:'#5c9a7a',durability:'#5c7f9a',calories:'#c4a44a',availability:'#5c9a7a',taste:'#c4a44a',shelfLife:'#5c7f9a'};

// ── UTILS ────────────────────────────────────────
function toast(msg,type){type=type||'info';var c=document.getElementById('toastContainer');var e=document.createElement('div');e.className='toast '+type;e.textContent=msg;c.appendChild(e);setTimeout(function(){e.remove();},2800);}
function strId(id){return String(id).trim();}
function idsMatch(a,b){return strId(a)===strId(b);}
function getMaxId(arr){var m=0;arr.forEach(function(o){var n=parseInt(o.id,10);if(!isNaN(n)&&n>m)m=n;});return m;}
function getClassStyles(type){if(type==='entities')return entityClassStyles;if(type==='items')return itemClassStyles;if(type==='foods')return foodClassStyles;return classStyles;}
function getClassIcon(type,cls){var s=getClassStyles(type);return(s[cls]||{}).icon||'\u2B1C';}
function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function b64Encode(s){var b=new TextEncoder().encode(s);return btoa(Array.from(b,function(x){return String.fromCodePoint(x);}).join(''));}
function showLoading(el){var o=document.createElement('div');o.className='loading-overlay';o.innerHTML='<div class="spinner"></div>';el.style.position=el.style.position||'relative';el.appendChild(o);return o;}
function hideLoading(o){if(o)o.remove();}
function ensureStats(obj,defs){if(!obj.stats)obj.stats={};Object.keys(defs).forEach(function(k){if(obj.stats[k]===undefined)obj.stats[k]=defs[k];});if(!obj.tags)obj.tags=[];if(!obj.discoveredAt)obj.discoveredAt=new Date().toISOString().split('T')[0];return obj;}

// ── BOOKMARKS ────────────────────────────────────
function getBookmarks(){try{return JSON.parse(localStorage.getItem('tihie_bm'))||[];}catch(e){return[];}}
function saveBookmarks(b){localStorage.setItem('tihie_bm',JSON.stringify(b));}
function toggleBookmark(type,id){var b=getBookmarks();var key=type+':'+strId(id);var idx=b.indexOf(key);if(idx===-1){b.push(key);saveBookmarks(b);return true;}else{b.splice(idx,1);saveBookmarks(b);return false;}}
function isBookmarked(type,id){return getBookmarks().indexOf(type+':'+strId(id))!==-1;}

// ── HISTORY ──────────────────────────────────────
function addHistory(type,id,title){historyStack=historyStack.filter(function(h){return!(h.type===type&&idsMatch(h.id,id));});historyStack.unshift({type:type,id:strId(id),title:title||id});if(historyStack.length>MAX_HISTORY)historyStack.pop();renderHistoryPanel();}
function renderHistoryPanel(){var p=document.getElementById('historyPanel');var t=document.getElementById('historyTitle');if(historyStack.length===0){t.style.display='none';p.innerHTML='';return;}t.style.display='block';p.innerHTML=historyStack.map(function(h){return '<div class="history-item" onclick="window._hist(\''+h.type+'\',\''+h.id+'\')">'+h.type.slice(0,3).toUpperCase()+' #'+h.id+'</div>';}).join('');}
window._hist=function(type,id){switchSection(type);setTimeout(function(){openView(type,id);},300);};

// ── IMAGE CACHE ──────────────────────────────────
function cacheImage(url){try{var c=JSON.parse(localStorage.getItem('tihie_img')||'{}');if(!c[url]){c[url]=url;localStorage.setItem('tihie_img',JSON.stringify(c));}}catch(e){}}
function getCached(url){return url;}

// ── GITHUB API ───────────────────────────────────
function fetchFileIndex(folder){
  if(!API.owner()||!API.repo())return Promise.resolve([]);
  return fetch(API.base()+'/'+folder,{headers:API.headers(),cache:'no-store'})
    .then(function(r){return r.ok?r.json():[];})
    .then(function(items){if(!Array.isArray(items))return[];var files=items.filter(function(f){return f.type==='file'&&f.name.endsWith('.json');});fileIndexCache[folder]=files.map(function(f){return{name:f.name,sha:f.sha,download_url:f.download_url};});return fileIndexCache[folder];})
    .catch(function(){return[];});
}
function loadSectionData(section){
  return fetchFileIndex(section).then(function(files){
    return Promise.all(files.map(function(f){
      return fetch(f.download_url,{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(obj){if(obj){obj._sha=f.sha;obj._folder=section;return obj;}return null;}).catch(function(){return null;});
    }));
  }).then(function(results){
    var arr=results.filter(Boolean);
    arr.forEach(function(obj){
      if(section==='levels'){ensureStats(obj,{safety:3,stability:3,entities:3,resources:3,mental:3,navigation:3});if(!Array.isArray(obj.ent))obj.ent=[];if(!Array.isArray(obj.foodIds))obj.foodIds=[];if(!Array.isArray(obj.itemIds))obj.itemIds=[];}
      else if(section==='entities')ensureStats(obj,{danger:3,frequency:3,intelligence:3,aggression:3});
      else if(section==='items')ensureStats(obj,{weight:3,rarity:3,usefulness:3,durability:3});
      else if(section==='foods')ensureStats(obj,{calories:500,availability:5,taste:3,shelfLife:7});
    });
    data[section]=arr;
    return arr;
  }).catch(function(){data[section]=[];return[];});
}
function loadAllData(){
  var sections=['levels','entities','items','foods'];
  return Promise.all(sections.map(function(s){return loadSectionData(s).catch(function(){});}));
}
function commitFile(filename,contentObj,oldSha){
  var token=API.token();if(!token){toast('GITHUB TOKEN NOT CONFIGURED','error');return Promise.resolve(false);}
  var url=API.base()+'/'+filename;
  var sha=oldSha||null;
  var getSha=sha?Promise.resolve(sha):fetch(url,{headers:{Authorization:'token '+token}}).then(function(r){return r.ok?r.json():null;}).then(function(i){return i?i.sha:null;}).catch(function(){return null;});
  return getSha.then(function(s){sha=s||sha;var jsonStr=JSON.stringify(contentObj,null,2);var body={message:'Update '+filename,content:b64Encode(jsonStr),branch:'main'};if(sha)body.sha=sha;return fetch(url,{method:'PUT',headers:{Authorization:'token '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});}).then(function(r){if(!r.ok){return r.json().then(function(e){toast(e.message||'SAVE ERROR','error');return false;}).catch(function(){return false;});}isDirty=false;updateSaveIndicator();return true;}).catch(function(){toast('NETWORK ERROR','error');return false;});
}
function uploadImageToRepo(file){
  var token=API.token();if(!token){toast('GITHUB TOKEN NOT CONFIGURED','error');return Promise.resolve(null);}
  var fname='images/'+Date.now()+'_'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  return new Promise(function(resolve){
    var reader=new FileReader();
    reader.onload=function(){
      var b64=reader.result.split(',')[1];
      fetch(API.base()+'/'+fname,{method:'PUT',headers:{Authorization:'token '+token,'Content-Type':'application/json'},body:JSON.stringify({message:'Upload '+fname,content:b64,branch:'main'})})
        .then(function(r){return r.ok?r.json():null;})
        .then(function(d){resolve(d?d.content.download_url:null);})
        .catch(function(){resolve(null);});
    };
    reader.readAsDataURL(file);
  });
}

// ── SAVE INDICATOR ───────────────────────────────