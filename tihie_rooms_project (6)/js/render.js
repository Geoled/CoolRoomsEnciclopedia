'use strict';

function updateSaveIndicator(){
  var dot=document.getElementById('saveDot');var ind=document.getElementById('saveIndicator');
  if(isDirty){dot.className='save-dot unsaved';ind.innerHTML='<span class="save-dot unsaved"></span> UNSAVED';}
  else{dot.className='save-dot';ind.innerHTML='<span class="save-dot"></span> READY';}
}

// ── RENDER HELPERS ───────────────────────────────
function renderStatsHTML(stats,labels,colors){
  return Object.entries(labels).map(function(e){
    var key=e[0],label=e[1],val=stats[key]||0;
    var maxVal=key==='calories'?2000:key==='shelfLife'?365:(key==='availability'?10:5);
    var pct=Math.min(100,(val/maxVal)*100);
    var color=colors[key]||'#777';
    return '<div class="stat-row"><span class="stat-label-mini">'+label+'</span><div class="stat-bar"><div class="stat-fill" style="width:'+pct+'%;background:'+color+';"></div></div><span class="stat-value">'+val+(key==='calories'?' kcal':key==='shelfLife'?' d':'')+'</span></div>';
  }).join('');
}

function processMarkdown(text){
  var processed=text||'';
  processed=processed.replace(/\[COLLAPSED\]\s*(.+?)(?=\n##|\n\[COLLAPSED\]|$)/gs,function(match,content){
    var lines=content.split('\n');
    var title=lines[0].trim();
    var body=lines.slice(1).join('\n').trim();
    try{var parsed=typeof marked!=='undefined'?marked.parse(body):'<p>'+escapeHtml(body)+'</p>';}catch(e){parsed='<p>'+escapeHtml(body)+'</p>';}
    return '<div class="collapsible"><div class="collapsible-header">'+(title||'EXPAND')+'</div><div class="collapsible-body"><div style="padding:0.7rem">'+parsed+'</div></div></div>';
  });
  processed=processed.replace(/\[REDACTED\]/g,'<span class="redacted" onclick="this.classList.toggle(\'revealed\')">\u25A0 REDACTED \u25A0</span>');
  try{return typeof marked!=='undefined'?marked.parse(processed):'<p>'+escapeHtml(processed)+'</p>';}catch(e){return'<p>'+escapeHtml(processed)+'</p>';}
}

function renderCards(items,type){
  return items.map(function(obj){
    var thumb=obj.thumbnail?'<div class="card-img-wrap"><img class="card-img" src="'+escapeHtml(obj.thumbnail)+'" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=card-img-placeholder>'+getClassIcon(type,obj.cls)+'</div>\'" alt=""></div>':'<div class="card-img-wrap"><div class="card-img-placeholder">'+getClassIcon(type,obj.cls)+'</div></div>';
    var statsHtml='';
    if(type==='levels')statsHtml=renderStatsHTML(obj.stats,{safety:'SAFETY',stability:'STABILITY',entities:'POPULATION',resources:'RESOURCES',mental:'SANITY',navigation:'NAVIGATION'},statColors);
    else if(type==='entities')statsHtml=renderStatsHTML(obj.stats,{danger:'DANGER',frequency:'FREQUENCY',intelligence:'INTELLECT',aggression:'AGGRESSION'},statColors);
    else if(type==='items')statsHtml=renderStatsHTML(obj.stats,{weight:'WEIGHT',rarity:'RARITY',usefulness:'UTILITY',durability:'DURABILITY'},statColors);
    else if(type==='foods')statsHtml=renderStatsHTML(obj.stats,{calories:'SATURATION',availability:'AVAILABILITY',taste:'TASTE',shelfLife:'SHELF LIFE'},statColors);
    var dateStr=obj.discoveredAt?'DISCOVERED: '+obj.discoveredAt:'';
    var title=obj.title||obj.name||'UNKNOWN';var authorLine=obj.author?'<span style="font-size:.5rem;color:var(--amber-dim)">by '+escapeHtml(obj.author)+'</span>':'';var title=obj.title||obj.name||'UNKNOWN';
    var tagsHtml=(obj.tags||[]).map(function(t){return'<span class="tag" data-tag="'+t+'">#'+t+'</span>';}).join('');
    var bm=isBookmarked(type,obj.id);
    return '<div class="card" data-type="'+type+'" data-id="'+strId(obj.id)+'">'+thumb+'<div class="card-header-bar"><span class="card-id">#'+obj.id+'</span><span class="card-class-icon">'+getClassIcon(type,obj.cls)+'</span></div><div class="card-inner"><div class="card-title">'+escapeHtml(title)+'<button class="bookmark-btn'+(bm?' active':'')+'" data-bm-type="'+type+'" data-bm-id="'+obj.id+'" style="float:right">'+(bm?'\u2605':'\u2606')+'</button></div>'+statsHtml+'<div class="card-desc">'+escapeHtml((obj.desc||'').substring(0,100))+'</div></div><div class="card-footer"><span>'+dateStr+'</span><span>'+tagsHtml+'</span></div><div style="padding:.15rem .7rem;font-size:.5rem;color:var(--amber-dim);border-top:1px solid var(--border);background:var(--bg)">'+authorLine+'</div></div>';
  }).join('');
}

function renderLinkedCards(items,type,label){
  if(!items||!items.length)return'';
  var cat=type==='entity'?'entities':type==='food'?'foods':'levels';
  var cards=items.map(function(item){
    var thumb=item.thumbnail?'<img src="'+escapeHtml(item.thumbnail)+'" loading="lazy" onerror="this.style.display=\'none\'" alt="">':'<div style="width:50px;height:50px;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:1.1rem">'+getClassIcon(cat,item.cls||'0')+'</div>';
    return '<div class="'+type+'-card" data-id="'+strId(item.id)+'">'+thumb+'<div class="'+type+'-card-name">'+(item.title||item.name)+'</div></div>';
  }).join('');
  return '<div class="view-section"><h3>'+label+'</h3><div style="display:flex;flex-wrap:wrap">'+cards+'</div></div>';
}

// ── DROPDOWN ─────────────────────────────────────
function createDropdown(container,items,selectedIds,placeholder){
  var selected=selectedIds.slice();
  container.innerHTML='';
  container.className='dropdown-search';
  var sc=document.createElement('div');sc.className='selected-items';container.appendChild(sc);
  var inp=document.createElement('input');inp.type='text';inp.placeholder=placeholder||'SEARCH...';container.appendChild(inp);
  var lst=document.createElement('div');lst.className='dropdown-list';container.appendChild(lst);
  function renderSel(){
    sc.innerHTML=selected.map(function(id){var it=items.find(function(i){return idsMatch(i.id,id);});return'<span class="selected-item">#'+id+' — '+(it?it.name||it.title:'?')+' <span class="remove" data-id="'+strId(id)+'">\u00D7</span></span>';}).join('')+(selected.length===0?'<span style="color:var(--text-muted);font-size:.6rem;text-transform:uppercase">'+placeholder+'</span>':'');
    sc.querySelectorAll('.remove').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();selected=selected.filter(function(id){return!idsMatch(id,b.dataset.id);});renderSel();});});
  }
  function filterList(q){
    lst.innerHTML='';var f=items.filter(function(i){return strId(i.id).indexOf(q)!==-1||((i.name||i.title||'').toLowerCase().indexOf(q.toLowerCase()))!==-1;});
    if(!f.length){lst.innerHTML='<div class="dropdown-item" style="color:var(--text-dim);font-style:italic">NO RESULTS</div>';return;}
    f.forEach(function(i){var d=document.createElement('div');d.className='dropdown-item';d.textContent='#'+i.id+' — '+(i.name||i.title);d.addEventListener('mousedown',function(e){e.preventDefault();if(!selected.some(function(s){return idsMatch(s,i.id);})){selected.push(i.id);renderSel();}inp.value='';lst.style.display='none';});lst.appendChild(d);});
  }
  renderSel();
  sc.addEventListener('click',function(){filterList(inp.value);lst.style.display='block';inp.focus();});
  inp.addEventListener('focus',function(){filterList(inp.value);lst.style.display='block';});
  inp.addEventListener('input',function(){filterList(inp.value);lst.style.display='block';});
  inp.addEventListener('blur',function(){setTimeout(function(){lst.style.display='none';},200);});
  container._getSelected=function(){return selected;};
  container._getSelectedStr=function(){return selected.join(', ');};
  return container;
}

// ── MAIN CONTENT RENDER ──────────────────────────
function renderContent(){
  if(currentSection==='home'){
    contentArea.innerHTML='<div style="text-align:center;max-width:800px;margin:0 auto">'+
      '<div class="ascii-header">   _____ _   _ _      ______ _____  __  __       _____ _    _ _      ______ _____  _      \n  |_   _| | | (_)    |  ____|  __ \\|  \\/  |     |  ___| |  | | |    |  ____|  __ \\| |     \n    | | | |_| |_ ___ | |__  | |__) | |  | |_____| |__ | |  | | |    | |__  | |__) | |     \n    | | |  _  | |  _ \\|  __| |  _  /| |  | |_____|  __|| |  | | |    |  __| |  _  /| |     \n    | |_| | | | | |_) | |____| | \\ \\| |__| |     | |___| |__| | |____| |____| | \\ \\| |____ \n    |_| |_| |_|_| .__/|______|_|  \\_\\\\____/      |____| \\____/|______|______|_|  \\_\\______|\n                | |                                                                               \n                |_|                                                                               </div>'+
      '<div class="home-title">TIHIE ROOMS ARCHIVE</div>'+
      '<div class="home-subtitle">GOD\'S FINAL FAREWELL — CATALOG ACTIVE</div>'+
      '<p style="color:var(--text-dim);max-width:600px;margin:0 auto 2rem;font-size:.75rem;line-height:1.7">'+
      'Encyclopedia of the universe. Levels, entities, objects, and sustenance. Data synchronized via GitHub. Research ongoing.</p>'+
      '<div class="stat-cards-row">'+
      '<div class="stat-card" onclick="window._sw(\'levels\')"><div class="stat-card-num">'+data.levels.length+'</div><div class="stat-card-label">LEVELS</div></div>'+
      '<div class="stat-card" onclick="window._sw(\'entities\')"><div class="stat-card-num">'+data.entities.length+'</div><div class="stat-card-label">ENTITIES</div></div>'+
      '<div class="stat-card" onclick="window._sw(\'items\')"><div class="stat-card-num">'+data.items.length+'</div><div class="stat-card-label">OBJECTS</div></div>'+
      '<div class="stat-card" onclick="window._sw(\'foods\')"><div class="stat-card-num">'+data.foods.length+'</div><div class="stat-card-label">SUSTENANCE</div></div>'+
      '</div>'+
      '<div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:1rem">'+
      '<button class="btn" id="exportBtn">EXPORT</button>'+
      '<button class="btn" id="importBtn">IMPORT</button></div>'+
      renderTagCloud()+
      '</div>';
    treeEl.innerHTML='<div style="padding:1rem;color:var(--text-muted);text-align:center;font-size:.62rem">SELECT SECTION</div>';
    document.getElementById('exportBtn').addEventListener('click',exportAllData);
    document.getElementById('importBtn').addEventListener('click',importAllData);
    document.querySelectorAll('.tag-cloud .tag[data-tag]').forEach(function(t){t.addEventListener('click',function(){switchSection('levels');setTimeout(function(){var tf=document.getElementById('tagFilter');if(tf){tf.value=t.dataset.tag;renderContent();}},200);});});
    return;
  }

  if(currentSection==='researchers'){renderResearchersTab();return;}
  if(currentSection==='bookmarks'){
    var bm=getBookmarks();
    var allItems=[];
    bm.forEach(function(key){var parts=key.split(':');var type=parts[0];var id=parts.slice(1).join(':');var arr=data[type];if(arr){var obj=arr.find(function(o){return idsMatch(o.id,id);});if(obj)allItems.push({obj:obj,type:type});}});
    contentArea.innerHTML='<div class="terminal-line">BOOKMARKS — '+allItems.length+' SAVED</div><div class="grid" id="grid">'+allItems.map(function(x){var obj=x.obj;var type=x.type;var thumb=obj.thumbnail?'<div class="card-img-wrap"><img class="card-img" src="'+escapeHtml(obj.thumbnail)+'" onerror="this.parentElement.innerHTML=\'<div class=card-img-placeholder>'+getClassIcon(type,obj.cls)+'</div>\'" alt=""></div>':'<div class="card-img-wrap"><div class="card-img-placeholder">'+getClassIcon(type,obj.cls)+'</div></div>';return'<div class="card" data-type="'+type+'" data-id="'+strId(obj.id)+'">'+thumb+'<div class="card-header-bar"><span class="card-id">#'+obj.id+'</span></div><div class="card-inner"><div class="card-title">'+(obj.title||obj.name)+'</div><div class="card-desc">'+escapeHtml((obj.desc||'').substring(0,80))+'</div></div></div>';}).join('')+'</div>';
    if(!allItems.length)contentArea.innerHTML='<div class="empty-state"><div class="empty-icon">\u2606</div><div class="terminal-line">NO BOOKMARKS YET</div><p>Click the star icon on any record to save it for quick access.</p></div>';
    document.querySelectorAll('#grid .card').forEach(function(c){c.addEventListener('click',function(){openView(c.dataset.type,c.dataset.id);});});
    treeEl.innerHTML='<div style="padding:1rem;color:var(--text-muted);text-align:center;font-size:.62rem">\u2605 BOOKMARKS</div>';
    return;
  }

  if(currentSection==='timeline'){
    var all=[];
    ['levels','entities','items','foods'].forEach(function(t){data[t].forEach(function(o){o._t=t;all.push(o);});});
    all.sort(function(a,b){return(a.discoveredAt||'0000').localeCompare(b.discoveredAt||'0000');});
    contentArea.innerHTML='<div class="terminal-line">TIMELINE — '+all.length+' ENTRIES</div><div class="timeline">'+all.map(function(o){return'<div class="timeline-entry"><div class="timeline-date">'+(o.discoveredAt||'UNKNOWN')+'</div><div class="timeline-content" onclick="window.openView(\''+o._t+'\',\''+o.id+'\')"><strong>#'+o.id+'</strong> — '+(o.title||o.name)+'<br><span style="font-size:.58rem;color:var(--text-dim)">'+escapeHtml((o.desc||'').substring(0,100))+'</span></div></div>';}).join('')+'</div>';
    treeEl.innerHTML='<div style="padding:1rem;color:var(--text-muted);text-align:center;font-size:.62rem">TIMELINE</div>';
    return;
  }

  if(currentSection==='changelog'){
    contentArea.innerHTML='<div class="terminal-line">CHANGELOG</div><div id="clContent" style="text-align:center"><div class="spinner"></div></div>';
    treeEl.innerHTML='<div style="padding:1rem;color:var(--text-muted);text-align:center;font-size:.62rem">CHANGELOG</div>';
    loadChangelog();
    return;
  }

  // Normal section rendering
  var arr=getCurrentArray();
  if(!arr||!arr.length){contentArea.innerHTML='<div class="empty-state"><div class="empty-icon">\u{1F50D}</div><div class="terminal-line">NO RECORDS FOUND</div><p>No '+currentSection+' records in database. Add some via the + NEW button or sync with GitHub.</p></div>';return;}
  var search=(document.getElementById('searchInput')?document.getElementById('searchInput').value:'').toLowerCase();
  var tagFilter=document.getElementById('tagFilter')?document.getElementById('tagFilter').value:'';
  var filtered=arr.filter(function(d){if(search)return(strId(d.id)+' '+(d.title||d.name||'').toLowerCase()).indexOf(search)!==-1;return true;}).filter(function(d){if(tagFilter)return(d.tags||[]).indexOf(tagFilter)!==-1;return true;});
  var sortVal=document.getElementById('sortSelect')?document.getElementById('sortSelect').value:'default';
  var sorted=sortArray(filtered,sortVal);
  var allTags=[];
  var tagSet={};
  arr.forEach(function(d){(d.tags||[]).forEach(function(t){if(!tagSet[t]){tagSet[t]=true;allTags.push(t);}});});
  var labels={levels:'LEVELS INDEX',entities:'ENTITY REGISTRY',items:'OBJECT CATALOG',foods:'SUSTENANCE LOG',researchers:'RESEARCHERS DATABASE'};
  var rangeHtml='';
  if(currentSection==='levels')rangeHtml='<div class="range-panel" id="rangePanel"><div class="range-row">SAFETY: <input class="range-min" data-key="safety" type="number" min="1" max="5" value="1"> — <input class="range-max" data-key="safety" type="number" min="1" max="5" value="5"></div></div>';
  else if(currentSection==='entities')rangeHtml='<div class="range-panel" id="rangePanel"><div class="range-row">DANGER: <input class="range-min" data-key="danger" type="number" min="1" max="5" value="1"> — <input class="range-max" data-key="danger" type="number" min="1" max="5" value="5"></div></div>';

  contentArea.innerHTML='<div class="terminal-line">'+labels[currentSection]+' — '+sorted.length+' RECORDS</div>'+
    '<div class="filters-bar">'+
    '<input type="text" id="searchInput" placeholder="SEARCH..." value="'+escapeHtml(search)+'">'+
    '<select id="tagFilter"><option value="">ALL TAGS</option>'+allTags.map(function(t){return'<option value="'+t+'"'+(t===tagFilter?' selected':'')+'>#'+t+'</option>';}).join('')+'</select>'+
    '<select id="sortSelect"><option value="default">DEFAULT</option><option value="id_asc">ID \u25B2</option><option value="id_desc">ID \u25BC</option><option value="name_asc">NAME A-Z</option><option value="name_desc">NAME Z-A</option><option value="class_asc">CLASS \u25B2</option><option value="class_desc">CLASS \u25BC</option><option value="date_asc">DATE \u25B2</option><option value="date_desc">DATE \u25BC</option></select>'+
    '<button class="btn small" id="toggleRangeBtn">RANGE</button>'+
    '</div>'+rangeHtml+'<div class="grid" id="grid"></div>';

  document.getElementById('grid').innerHTML=renderCards(sorted,currentSection);
  document.querySelectorAll('#grid .card').forEach(function(c){c.addEventListener('click',function(){openView(c.dataset.type,c.dataset.id);});});
  document.getElementById('searchInput').addEventListener('input',function(){isDirty=true;updateSaveIndicator();clearTimeout(this._t);var s=this;this._t=setTimeout(function(){renderContent();},250);});
  document.getElementById('sortSelect').addEventListener('change',renderContent);
  document.getElementById('tagFilter').addEventListener('change',renderContent);
  var trb=document.getElementById('toggleRangeBtn');
  if(trb)trb.addEventListener('click',function(){var rp=document.getElementById('rangePanel');if(rp)rp.classList.toggle('open');});
  document.querySelectorAll('.range-min,.range-max').forEach(function(el){el.addEventListener('input',function(){clearTimeout(el._t);el._t=setTimeout(function(){renderContent();},300);});});
  document.querySelectorAll('.bookmark-btn').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();var active=toggleBookmark(b.dataset.bmType,b.dataset.bmId);b.classList.toggle('active',active);b.textContent=active?'\u2605':'\u2606';});});
  document.querySelectorAll('#grid .tag[data-tag]').forEach(function(t){t.addEventListener('click',function(e){e.stopPropagation();document.getElementById('tagFilter').value=t.dataset.tag;renderContent();});});
}

function renderTagCloud(){
  var allTags={};
  ['levels','entities','items','foods'].forEach(function(type){data[type].forEach(function(obj){(obj.tags||[]).forEach(function(t){allTags[t]=(allTags[t]||0)+1;});});});
  var sorted=Object.entries(allTags).sort(function(a,b){return b[1]-a[1];}).slice(0,25);
  if(!sorted.length)return'';
  return'<div style="margin:2rem 0"><div class="terminal-line" style="text-align:center">TAG INDEX</div><div class="tag-cloud">'+sorted.map(function(e){return'<span class="tag" data-tag="'+e[0]+'" style="font-size:'+(0.55+e[1]*0.04)+'rem">#'+e[0]+' ['+e[1]+']</span>';}).join('')+'</div></div>';
}

function sortArray(arr,key){
  var a=arr.slice();
  switch(key){
    case'id_asc':a.sort(function(x,y){return strId(x.id).localeCompare(strId(y.id),undefined,{numeric:true});});break;
    case'id_desc':a.sort(function(x,y){return strId(y.id).localeCompare(strId(x.id),undefined,{numeric:true});});break;
    case'name_asc':a.sort(function(x,y){return(x.title||x.name||'').localeCompare(y.title||y.name||'');});break;
    case'name_desc':a.sort(function(x,y){return(y.title||y.name||'').localeCompare(x.title||x.name||'');});break;
    case'class_asc':a.sort(function(x,y){return(parseInt(x.cls)||0)-(parseInt(y.cls)||0);});break;
    case'class_desc':a.sort(function(x,y){return(parseInt(y.cls)||0)-(parseInt(x.cls)||0);});break;
    case'date_asc':a.sort(function(x,y){return(x.discoveredAt||'').localeCompare(y.discoveredAt||'');});break;
    case'date_desc':a.sort(function(x,y){return(y.discoveredAt||'').localeCompare(x.discoveredAt||'');});break;
  }
  return a;
}
function getCurrentArray(){if(!data||!data[currentSection])return[];return data[currentSection]||[];}

// ── VIEW ─────────────────────────────────────────
function openView(type,id){
  var obj=(data[type]||[]).find(function(o){return idsMatch(o.id,id);});
  if(!obj){toast('RECORD NOT FOUND','error');return;}
  addHistory(type,id,obj.title||obj.name);
  var labels={levels:'LEVEL',entities:'ENTITY',items:'OBJECT',foods:'SUSTENANCE'};
  breadcrumbs.innerHTML='<span onclick="window._sw(\'home\')">TERMINAL</span> \u203A <span onclick="window._sw(\''+type+'\')">'+labels[type]+'</span> \u203A #'+obj.id;
  var bm=isBookmarked(type,obj.id);
  var clsNum=parseInt(obj.cls)||0;
  var diffBanner='';
  if(type==='levels')diffBanner='<div class="difficulty-banner c'+Math.min(clsNum,5)+'"><span style="font-size:1.2rem">'+(clsNum>=4?'\u2620':clsNum>=2?'\u26A0':'\u25A3')+'</span> SURVIVAL DIFFICULTY: CLASS '+clsNum+' — '+(classStyles[obj.cls]||{}).name+'</div>';
  else if(type==='entities')diffBanner='<div class="difficulty-banner c'+Math.min(clsNum,4)+'"><span style="font-size:1.2rem">'+(clsNum>=3?'\u2620':clsNum>=1?'\u26A0':'\u25A3')+'</span> ENTITY CLASS: '+(entityClassStyles[obj.cls]||{}).name+'</div>';
  var warnBanner='';
  if(type==='levels'&&clsNum>=4)warnBanner='<div class="warning-banner danger">\u2620 EXTREME DANGER — DO NOT ENTER</div>';
  else if(type==='entities'&&clsNum>=3)warnBanner='<div class="warning-banner danger">\u2620 LETHAL ENTITY — DO NOT ENGAGE</div>';
  var thumb=obj.thumbnail?'<img src="'+escapeHtml(obj.thumbnail)+'" style="max-width:340px;border:1px solid var(--border);margin-bottom:1rem;display:block" loading="lazy" onerror="this.style.display=\'none\'" alt="">':'';
  var gallery=(obj.images||[]).map(function(img){return'<img src="'+escapeHtml(img.url)+'" alt="'+escapeHtml(img.description||'')+'" title="'+escapeHtml(img.description||'')+'">';}).join('');
  var statsHtml='';
  if(type==='levels')statsHtml=renderStatsHTML(obj.stats,{safety:'SAFETY',stability:'STABILITY',entities:'POPULATION',resources:'RESOURCES',mental:'SANITY',navigation:'NAVIGATION'},statColors);
  else if(type==='entities')statsHtml=renderStatsHTML(obj.stats,{danger:'DANGER',frequency:'FREQUENCY',intelligence:'INTELLECT',aggression:'AGGRESSION'},statColors);
  else if(type==='items')statsHtml=renderStatsHTML(obj.stats,{weight:'WEIGHT',rarity:'RARITY',usefulness:'UTILITY',durability:'DURABILITY'},statColors);
  else if(type==='foods')statsHtml=renderStatsHTML(obj.stats,{calories:'SATURATION',availability:'AVAILABILITY',taste:'TASTE',shelfLife:'SHELF LIFE'},statColors);
  var descHtml=processMarkdown(obj.desc||'');
  var dateStr=obj.discoveredAt?'<p style="color:var(--text-muted);font-size:.6rem;text-transform:uppercase">DISCOVERED: '+obj.discoveredAt+'</p>':'';
  var authorHtml='';
  if(obj.author){authorHtml+='<p style="font-size:.62rem;color:var(--amber-dim);margin:.3rem 0">AUTHOR: <strong style="color:var(--amber)">'+escapeHtml(obj.author)+'</strong>'+(obj.createdAt?' • '+obj.createdAt.split('T')[0]:'')+'</p>';}
  if(obj.contributors&&obj.contributors.length){authorHtml+='<p style="font-size:.58rem;color:var(--text-muted);margin:.2rem 0">CONTRIBUTORS: '+obj.contributors.map(function(c){return escapeHtml(c.username)+' ('+(c.changes||[]).join(', ')+')';}).join('; ')+'</p>';}
  if(obj.lastModifiedBy&&obj.lastModifiedBy!==obj.author){authorHtml+='<p style="font-size:.55rem;color:var(--text-muted);margin:.1rem 0">LAST EDIT: '+escapeHtml(obj.lastModifiedBy)+' • '+(obj.lastModifiedAt||'').split('T')[0]+'</p>';}
  var linkedHtml='';
  if(type==='levels'){
    linkedHtml+=renderLinkedCards((obj.ent||[]).map(function(eid){return data.entities.find(function(e){return idsMatch(e.id,eid);});}).filter(Boolean),'entity','INHABITING ENTITIES');
    linkedHtml+=renderLinkedCards((obj.foodIds||[]).map(function(fid){return data.foods.find(function(f){return idsMatch(f.id,fid);});}).filter(Boolean),'food','SUSTENANCE FOUND');
    linkedHtml+=renderLinkedCards((obj.itemIds||[]).map(function(iid){return data.items.find(function(i){return idsMatch(i.id,iid);});}).filter(Boolean),'level','OBJECTS PRESENT');
    var inIds=obj.in?obj.in.split(',').map(function(s){return s.trim();}).filter(Boolean):[];
    var outIds=obj.out?obj.out.split(',').map(function(s){return s.trim();}).filter(Boolean):[];
    linkedHtml+=renderLinkedCards(inIds.map(function(lid){return data.levels.find(function(l){return idsMatch(l.id,lid);});}).filter(Boolean),'level','ENTRANCES');
    linkedHtml+=renderLinkedCards(outIds.map(function(lid){return data.levels.find(function(l){return idsMatch(l.id,lid);});}).filter(Boolean),'level','EXITS');
  }else{
    var linkedLevels=data.levels.filter(function(lvl){
      if(type==='entities')return(lvl.ent||[]).some(function(eid){return idsMatch(eid,id);});
      if(type==='items')return(lvl.itemIds||[]).some(function(iid){return idsMatch(iid,id);});
      if(type==='foods')return(lvl.foodIds||[]).some(function(fid){return idsMatch(fid,id);});
      return false;
    });
    linkedHtml+=renderLinkedCards(linkedLevels,'level','FOUND ON LEVELS');
  }

  viewContent.innerHTML='<h2 style="color:var(--amber);font-size:1.15rem;font-family:var(--font-mono)">'+escapeHtml(obj.title||obj.name)+' <span style="font-size:.62rem;color:var(--text-muted)">#'+obj.id+'</span><button class="bookmark-btn'+(bm?' active':'')+'" id="viewBmBtn" data-bm-type="'+type+'" data-bm-id="'+obj.id+'" style="float:right;font-size:1.2rem">'+(bm?'\u2605':'\u2606')+'</button></h2>'+diffBanner+warnBanner+thumb+'<p style="font-size:.68rem;margin:.4rem 0">CLASSIFICATION: <strong style="color:var(--amber)">'+(getClassStyles(type)[obj.cls]||{}).name+'</strong> '+getClassIcon(type,obj.cls)+'</p>'+dateStr+'<div class="view-section">'+statsHtml+'</div><div style="margin:.4rem 0">'+(obj.tags||[]).map(function(t){return'<span class="tag">#'+t+'</span>';}).join(' ')+'</div><div class="view-section"><h3>DESCRIPTION</h3><div>'+descHtml+'</div></div>'+linkedHtml+
    (obj.habitat?'<div class="view-section"><h3>HABITAT</h3><p>'+escapeHtml(obj.habitat)+'</p></div>':'')+
    (obj.behavior?'<div class="view-section"><h3>BEHAVIOR</h3><p>'+escapeHtml(obj.behavior)+'</p></div>':'')+
    (obj.survival?'<div class="view-section"><h3>SURVIVAL GUIDE</h3><p>'+escapeHtml(obj.survival)+'</p></div>':'')+
    (obj.props?'<div class="view-section"><h3>PROPERTIES</h3><p>'+escapeHtml(obj.props)+'</p></div>':'')+
    (obj.effect?'<div class="view-section"><h3>EFFECTS</h3><p>'+escapeHtml(obj.effect)+'</p></div>':'')+
    (gallery?'<div class="view-section"><h3>VISUAL ARCHIVE</h3><div class="gallery">'+gallery+'</div></div>':'')+
    '<div class="floating-actions"><button class="btn" id="closeViewBtn">CLOSE</button><button class="btn" id="copyBtn">COPY REPORT</button><button class="btn" id="exportOneBtn">EXPORT</button><button class="btn" id="editViewBtn">EDIT</button><button class="btn danger" id="deleteBtn">DELETE</button></div>';

  viewModal.classList.add('active');document.body.style.overflow='hidden';
  viewContent.querySelectorAll('.gallery img').forEach(function(img){img.addEventListener('click',function(){lightboxImg.src=img.src;lightbox.classList.add('active');});});
  viewContent.querySelectorAll('.collapsible-header').forEach(function(h){h.addEventListener('click',function(){h.parentElement.classList.toggle('open');});});
  document.getElementById('closeViewBtn').addEventListener('click',closeView);
  document.getElementById('editViewBtn').addEventListener('click',function(){closeView();openEditModal(type,obj);});
  document.getElementById('deleteBtn').addEventListener('click',function(){if(confirm('DELETE "'+(obj.title||obj.name)+'" (#'+obj.id+')? IRREVERSIBLE.'))deleteItem(type,obj);});
  document.getElementById('copyBtn').addEventListener('click',function(){copyAsReport(type,obj);});
  document.getElementById('exportOneBtn').addEventListener('click',function(){var blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=type+'_'+obj.id+'.json';a.click();toast('EXPORTED','success');});
  var vbmBtn=document.getElementById('viewBmBtn');
  vbmBtn.addEventListener('click',function(e){e.stopPropagation();var active=toggleBookmark(type,obj.id);vbmBtn.classList.toggle('active',active);vbmBtn.textContent=active?'\u2605':'\u2606';});
  // ── COMMENTS SECTION ─────────────────────────────
  var commentHtml='<div class="view-section"><h3>DISCUSSION</h3><div id="commentsList'+obj.id+'"><p style="font-size:.6rem;color:var(--text-dim)">Loading comments...</p></div>'+
    '<div style="margin-top:.5rem"><textarea id="commentInput'+obj.id+'" rows="2" style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:.3rem;font-family:var(--font-mono);font-size:.6rem" placeholder="Write a comment..."></textarea>'+
    '<button class="btn small" id="postCommentBtn'+obj.id+'" style="margin-top:.3rem">POST COMMENT</button></div></div>';
  viewContent.innerHTML+=commentHtml;
  loadComments(type,obj.id);
  document.getElementById('postCommentBtn'+obj.id).addEventListener('click',function(){postComment(type,obj.id);});
  
  viewContent.querySelectorAll('.entity-card,.food-card,.level-card').forEach(function(c){c.addEventListener('click',function(e){e.stopPropagation();var t='levels';if(c.classList.contains('entity-card'))t='entities';else if(c.classList.contains('food-card'))t='foods';openView(t,c.dataset.id);});});
}
function closeView(){viewModal.classList.remove('active');document.body.style.overflow='';}
function copyAsReport(type,obj){
  var styles=getClassStyles(type);
  var report='TIHIE ROOMS ARCHIVE REPORT\n====================\nID: #'+obj.id+'\nTYPE: '+type.toUpperCase()+'\nNAME: '+(obj.title||obj.name)+'\nCLASS: '+(styles[obj.cls]||{}).name+'\nDISCOVERED: '+(obj.discoveredAt||'UNKNOWN')+'\n====================\n'+(obj.desc||'');
  navigator.clipboard.writeText(report).then(function(){toast('COPIED','success');}).catch(function(){toast('COPY FAILED','error');});
}

// ── DELETE ───────────────────────────────────────
function deleteItem(type,obj){
  var token=API.token();if(!token){toast('TOKEN REQUIRED','error');return;}
  var filename=type+'/'+type+'_'+obj.id+'.json';
  var url=API.base()+'/'+filename;
  var getSha=obj._sha?Promise.resolve(obj._sha):fetch(url,{headers:{Authorization:'token '+token}}).then(function(r){return r.ok?r.json():null;}).then(function(i){return i?i.sha:null;}).catch(function(){return null;});
  getSha.then(function(sha){if(!sha){toast('CANNOT DELETE','error');return;}
    return fetch(url,{method:'DELETE',headers:{Authorization:'token '+token}});
  }).then(function(r){if(!r||!r.ok){if(r)toast('DELETE FAILED','error');return;}
    data[type]=data[type].filter(function(o){return!idsMatch(o.id,obj.id);});
    closeView();toast('DELETED #'+obj.id,'success');renderTree();renderContent();
  }).catch(function(){toast('NETWORK ERROR','error');});
}

// ── EDIT MODAL ───────────────────────────────────
function openEditModal(type,obj){
  currentEditType=type;var styles=getClassStyles(type);
  var lvl=obj?JSON.parse(JSON.stringify(obj)):{id:'',title:'',cluster:'',cls:type==='levels'?'0':type==='entities'?'0':type==='items'?'cold_weapon':'drink',desc:'',ent:[],foodIds:[],itemIds:[],in:'',out:'',stats:{},tags:[],thumbnail:'',images:[],discoveredAt:new Date().toISOString().split('T')[0],habitat:'',behavior:'',survival:'',props:'',effect:''};
  if(!obj){lvl.id=String(getMaxId(data[type]||[])+1);}
  lvl.stats=lvl.stats||{};lvl.tags=lvl.tags||[];
  var classOpts=Object.entries(styles).map(function(e){return'<option value="'+e[0]+'"'+(lvl.cls===e[0]?' selected':'')+'>'+e[1].icon+' '+e[1].name+'</option>';}).join('');
  var labels={levels:'LEVEL',entities:'ENTITY',items:'OBJECT',foods:'SUSTENANCE'};

  var html='<h3 style="color:var(--amber);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;font-size:.78rem">'+(obj?'EDIT':'NEW')+' '+labels[type]+'</h3>'+
    '<div class="form-section"><h4>IDENTIFICATION</h4>'+
    '<div class="form-group"><label>ID</label><input id="eId" value="'+escapeHtml(lvl.id)+'"></div>'+
    '<div class="form-group"><label>DESIGNATION</label><input id="eTitle" value="'+escapeHtml(lvl.title||lvl.name||'')+'"></div>'+
    (type==='levels'?'<div class="form-group"><label>CLUSTER</label><input id="eCluster" value="'+escapeHtml(lvl.cluster||'')+'"></div>':'')+
    '<div class="form-group"><label>CLASSIFICATION</label><select id="eClass">'+classOpts+'</select></div>'+
    '<div class="form-group"><label>TAGS (comma)</label><input id="eTags" value="'+escapeHtml((lvl.tags||[]).join(', '))+'"></div>'+
    '<div class="form-group"><label>DISCOVERY DATE</label><input type="date" id="eDate" value="'+(lvl.discoveredAt||'')+'"></div></div>'+
    '<div class="form-section"><h4>PARAMETERS</h4><div class="stats-grid" id="statsGrid"></div></div>'+
    '<div class="form-section"><h4>DESCRIPTION (Markdown)</h4><div class="form-group"><textarea id="eDesc" rows="8">'+escapeHtml(lvl.desc||'')+'</textarea></div>'+
    '<div class="markdown-preview" id="mdPrev"></div><p style="font-size:.52rem;color:var(--text-muted);margin-top:.15rem">Use [COLLAPSED] Title...content and [REDACTED]</p></div>';

  if(type==='levels')html+='<div class="form-section" id="linksSection"><h4>CROSS-REFERENCES</h4></div>';
  if(type==='entities')html+='<div class="form-section"><h4>BIOLOGICAL DATA</h4><div class="form-group"><label>HABITAT</label><input id="eHabitat" value="'+escapeHtml(lvl.habitat||'')+'"></div><div class="form-group"><label>BEHAVIOR</label><textarea id="eBehavior" rows="3">'+escapeHtml(lvl.behavior||'')+'</textarea></div><div class="form-group"><label>SURVIVAL GUIDE</label><textarea id="eSurvival" rows="3">'+escapeHtml(lvl.survival||'')+'</textarea></div></div>';
  if(type==='items')html+='<div class="form-section"><h4>PROPERTIES</h4><div class="form-group"><textarea id="eProps" rows="4">'+escapeHtml(lvl.props||'')+'</textarea></div></div>';
  if(type==='foods')html+='<div class="form-section"><h4>EFFECTS</h4><div class="form-group"><textarea id="eEffect" rows="4">'+escapeHtml(lvl.effect||'')+'</textarea></div></div>';

  html+='<div class="form-section"><h4>MEDIA</h4><div class="form-group"><label>PRIMARY IMAGE URL</label><input id="eThumb" value="'+escapeHtml(lvl.thumbnail||'')+'"></div>'+
    '<div class="form-group"><label>UPLOAD IMAGE</label><input type="file" id="eFile" accept="image/*"></div>'+
    '<div id="imgContainer">'+(lvl.images||[]).map(function(img,i){return'<div class="image-entry" style="display:flex;gap:.4rem;margin-bottom:.4rem;align-items:center"><input class="img-url" value="'+escapeHtml(img.url)+'" placeholder="URL" style="flex:2;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:.4rem;font-family:var(--font-mono);font-size:.65rem"><input class="img-desc" value="'+escapeHtml(img.description||'')+'" placeholder="Caption" style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:.4rem;font-family:var(--font-mono);font-size:.65rem"><button class="btn remove-img" style="padding:.15rem .4rem">\u00D7</button></div>';}).join('')+'</div>'+
    '<button class="btn" id="addImgBtn" style="margin-top:.4rem">+ ADD IMAGE</button></div>'+
    '<div style="margin-top:1.2rem;display:flex;gap:.8rem;justify-content:flex-end"><button class="btn" id="cancelEdit">CANCEL</button>'+(obj?'<button class="btn" id="dupBtn">SAVE AS COPY</button>':'')+'<button class="btn primary" id="saveBtn">COMMIT</button></div>';

  editContent.innerHTML=html;

  // Stats grid
  var sg=document.getElementById('statsGrid');sg.innerHTML='';
  var fields=[];
  if(type==='levels')fields=[['safety','SAFETY',1,5,lvl.stats.safety||3],['stability','STABILITY',1,5,lvl.stats.stability||3],['entities','POPULATION',1,5,lvl.stats.entities||3],['resources','RESOURCES',1,5,lvl.stats.resources||3],['mental','SANITY',1,5,lvl.stats.mental||3],['navigation','NAVIGATION',1,5,lvl.stats.navigation||3]];
  else if(type==='entities')fields=[['danger','DANGER',1,5,lvl.stats.danger||3],['frequency','FREQUENCY',1,5,lvl.stats.frequency||3],['intelligence','INTELLECT',1,5,lvl.stats.intelligence||3],['aggression','AGGRESSION',1,5,lvl.stats.aggression||3]];
  else if(type==='items')fields=[['weight','WEIGHT (kg)',0,999,lvl.stats.weight||3],['rarity','RARITY',1,5,lvl.stats.rarity||3],['usefulness','UTILITY',1,5,lvl.stats.usefulness||3],['durability','DURABILITY',1,5,lvl.stats.durability||3]];
  else if(type==='foods')fields=[['calories','SATURATION (kcal)',0,5000,lvl.stats.calories||500],['availability','AVAILABILITY',1,10,lvl.stats.availability||5],['taste','TASTE',1,5,lvl.stats.taste||3],['shelfLife','SHELF LIFE (days)',1,365,lvl.stats.shelfLife||7]];
  fields.forEach(function(f){var d=document.createElement('div');d.className='form-group';d.innerHTML='<label>'+f[1]+'</label><input type="number" id="e_'+f[0]+'" value="'+f[4]+'" min="'+f[2]+'" max="'+f[3]+'" step="any">';sg.appendChild(d);});

  // Dropdowns for levels
  if(type==='levels'){
    var ls=document.getElementById('linksSection');
    function addDD(label,src,sel,ph){var c=document.createElement('div');c.className='form-group';c.innerHTML='<label>'+label+'</label>';var d=document.createElement('div');c.appendChild(d);ls.appendChild(c);return createDropdown(d,src,sel.map(strId),ph);}
    var entDD=addDD('INHABITING ENTITIES',data.entities,lvl.ent||[],'SELECT ENTITIES');
    var foodDD=addDD('SUSTENANCE',data.foods,lvl.foodIds||[],'SELECT SUSTENANCE');
    var itemDD=addDD('OBJECTS',data.items,lvl.itemIds||[],'SELECT OBJECTS');
    var inIds=lvl.in?lvl.in.split(',').map(function(s){return strId(s.trim());}).filter(Boolean):[];
    var outIds=lvl.out?lvl.out.split(',').map(function(s){return strId(s.trim());}).filter(Boolean):[];
    var inDD=addDD('ENTRANCES',data.levels.filter(function(l){return!idsMatch(l.id,lvl.id);}),inIds,'SELECT');
    var outDD=addDD('EXITS',data.levels.filter(function(l){return!idsMatch(l.id,lvl.id);}),outIds,'SELECT');
    editContent._dd={entity:entDD,food:foodDD,item:itemDD,in:inDD,out:outDD};
  }

  editModal.classList.add('active');document.body.style.overflow='hidden';

  // Live preview
  var descEl=document.getElementById('eDesc');
  var prevEl=document.getElementById('mdPrev');
  function updatePrev(){try{prevEl.innerHTML=processMarkdown(descEl.value);}catch(e){prevEl.innerHTML='<p style="color:var(--red)">PREVIEW ERROR</p>';}}
  updatePrev();descEl.addEventListener('input',function(){updatePrev();isDirty=true;updateSaveIndicator();});

  document.getElementById('eFile').addEventListener('change',function(e){var file=e.target.files[0];if(!file)return;var load=showLoading(editContent);uploadImageToRepo(file).then(function(url){hideLoading(load);if(url){document.getElementById('eThumb').value=url;toast('UPLOADED','success');}});});
  document.getElementById('addImgBtn').addEventListener('click',function(){var c=document.getElementById('imgContainer');var entry=document.createElement('div');entry.style.cssText='display:flex;gap:.4rem;margin-bottom:.4rem;align-items:center';entry.innerHTML='<input class="img-url" placeholder="URL" style="flex:2;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:.4rem;font-family:var(--font-mono);font-size:.65rem"><input class="img-desc" placeholder="Caption" style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:.4rem;font-family:var(--font-mono);font-size:.65rem"><button class="btn remove-img" style="padding:.15rem .4rem">\u00D7</button>';c.appendChild(entry);entry.querySelector('.remove-img').addEventListener('click',function(){entry.remove();});});
  document.querySelectorAll('#imgContainer .remove-img').forEach(function(b){b.addEventListener('click',function(e){e.target.closest('.image-entry').remove();});});
  document.getElementById('cancelEdit').addEventListener('click',closeEdit);
  document.getElementById('saveBtn').addEventListener('click',function(){saveEdit(type,obj);});
  if(obj)document.getElementById('dupBtn').addEventListener('click',function(){document.getElementById('eId').value=String(getMaxId(data[type])+1);saveEdit(type,null);});
}

function closeEdit(){
  saveFormDraft();
  editModal.classList.remove('active');document.body.style.overflow='';
  currentEditType=null;
}
function saveFormDraft(){
  if(!currentEditType)return;
  var d={id:document.getElementById('eId')?document.getElementById('eId').value:'',title:document.getElementById('eTitle')?document.getElementById('eTitle').value:'',cluster:document.getElementById('eCluster')?document.getElementById('eCluster').value:'',cls:document.getElementById('eClass')?document.getElementById('eClass').value:'',tags:document.getElementById('eTags')?document.getElementById('eTags').value:'',desc:document.getElementById('eDesc')?document.getElementById('eDesc').value:'',thumbnail:document.getElementById('eThumb')?document.getElementById('eThumb').value:'',discoveredAt:document.getElementById('eDate')?document.getElementById('eDate').value:'',habitat:document.getElementById('eHabitat')?document.getElementById('eHabitat').value:'',behavior:document.getElementById('eBehavior')?document.getElementById('eBehavior').value:'',survival:document.getElementById('eSurvival')?document.getElementById('eSurvival').value:'',props:document.getElementById('eProps')?document.getElementById('eProps').value:'',effect:document.getElementById('eEffect')?document.getElementById('eEffect').value:'',stats:{}};
  editContent.querySelectorAll('#statsGrid input[type="number"]').forEach(function(el){var key=el.id.replace('e_','');d.stats[key]=parseFloat(el.value)||0;});
  if(editContent._dd){var dd=editContent._dd;d.ent=dd.entity._getSelected().map(strId);d.foodIds=dd.food._getSelected().map(strId);d.itemIds=dd.item._getSelected().map(strId);d.in=dd.in._getSelectedStr();d.out=dd.out._getSelectedStr();}
  try{localStorage.setItem('formDraft_'+currentEditType,JSON.stringify(d));}catch(e){}
}
function saveEdit(type,obj){
  var images=[];document.querySelectorAll('#imgContainer .image-entry').forEach(function(e){var u=e.querySelector('.img-url');var d=e.querySelector('.img-desc');if(u&&u.value.trim())images.push({url:u.value.trim(),description:d?d.value.trim():''});});
  var newId=document.getElementById('eId').value.trim();if(!newId)newId=String(getMaxId(data[type])+1);
  var newObj={id:newId,cls:document.getElementById('eClass').value,tags:document.getElementById('eTags').value.split(',').map(function(s){return s.trim();}).filter(Boolean),stats:{},desc:document.getElementById('eDesc').value,discoveredAt:document.getElementById('eDate').value||new Date().toISOString().split('T')[0],thumbnail:document.getElementById('eThumb').value,images:images};
  if(type==='levels'){newObj.title=document.getElementById('eTitle').value;newObj.cluster=document.getElementById('eCluster')?document.getElementById('eCluster').value:'';newObj.stats={safety:+document.getElementById('e_safety').value||3,stability:+document.getElementById('e_stability').value||3,entities:+document.getElementById('e_entities').value||3,resources:+document.getElementById('e_resources').value||3,mental:+document.getElementById('e_mental').value||3,navigation:+document.getElementById('e_navigation').value||3};}else{newObj.name=document.getElementById('eTitle').value;}
  if(type==='entities'){newObj.stats={danger:+document.getElementById('e_danger').value||3,frequency:+document.getElementById('e_frequency').value||3,intelligence:+document.getElementById('e_intelligence').value||3,aggression:+document.getElementById('e_aggression').value||3};newObj.habitat=document.getElementById('eHabitat')?document.getElementById('eHabitat').value:'';newObj.behavior=document.getElementById('eBehavior')?document.getElementById('eBehavior').value:'';newObj.survival=document.getElementById('eSurvival')?document.getElementById('eSurvival').value:'';}
  if(type==='items'){newObj.stats={weight:+document.getElementById('e_weight').value||3,rarity:+document.getElementById('e_rarity').value||3,usefulness:+document.getElementById('e_usefulness').value||3,durability:+document.getElementById('e_durability').value||3};newObj.props=document.getElementById('eProps')?document.getElementById('eProps').value:'';}
  if(type==='foods'){newObj.stats={calories:+document.getElementById('e_calories').value||500,availability:+document.getElementById('e_availability').value||5,taste:+document.getElementById('e_taste').value||3,shelfLife:+document.getElementById('e_shelfLife').value||7};newObj.effect=document.getElementById('eEffect')?document.getElementById('eEffect').value:'';}
  if(type==='levels'&&editContent._dd){var dd=editContent._dd;newObj.ent=dd.entity._getSelected().map(strId);newObj.foodIds=dd.food._getSelected().map(strId);newObj.itemIds=dd.item._getSelected().map(strId);newObj.in=dd.in._getSelectedStr();newObj.out=dd.out._getSelectedStr();}
  var filename=type+'/'+type+'_'+newObj.id+'.json';
  if(obj){var changedFields=detectChanges(obj,newObj);if(changedFields.length)newObj=addContributor(newObj,changedFields);}else{newObj=ensureAuthorship(newObj,true);}
  var load=showLoading(editContent);
  commitFile(filename,newObj,obj?obj._sha:null).then(function(success){
    hideLoading(load);
    if(success){
      try{localStorage.removeItem('formDraft_'+type);}catch(e){}
      if(obj){var idx=data[type].findIndex(function(o){return idsMatch(o.id,obj.id);});if(idx!==-1)data[type][idx]=newObj;}
      else{data[type].push(newObj);}
      editModal.classList.remove('active');document.body.style.overflow='';currentEditType=null;
      toast('SAVED #'+newObj.id,'success');incrementStat(obj?'edited':'created');renderTree();renderContent();
    }
  });
}

// ── TREE ─────────────────────────────────────────
function renderTree(){
  if(!treeEl)return;
  if(['home','bookmarks','timeline','changelog'].indexOf(currentSection)!==-1){treeEl.innerHTML='<div style="padding:1rem;color:var(--text-muted);text-align:center;font-size:.62rem">'+(currentSection==='home'?'SELECT SECTION':currentSection==='bookmarks'?'\u2605 BOOKMARKS':currentSection==='timeline'?'TIMELINE':'CHANGELOG')+'</div>';return;}
  var arr=getCurrentArray();
  if(!arr||!arr.length){contentArea.innerHTML='<div class="empty-state"><div class="empty-icon">\u{1F50D}</div><div class="terminal-line">NO RECORDS FOUND</div><p>No '+currentSection+' records in database. Add some via the + NEW button or sync with GitHub.</p></div>';return;}
  if(currentSection==='levels'){
    var clusters={};arr.forEach(function(l){var c=l.cluster||'UNCLUSTERED';if(!clusters[c])clusters[c]=[];clusters[c].push(l);});
    treeEl.innerHTML='';
    Object.entries(clusters).forEach(function(e){
      var name=e[0],items=e[1];
      var folder=document.createElement('div');folder.className='tree-item tree-folder open';folder.textContent=name.toUpperCase();
      var cc=document.createElement('div');cc.className='tree-children';cc.style.maxHeight='3000px';
      folder.addEventListener('click',function(ev){ev.stopPropagation();var open=folder.classList.contains('open');folder.classList.toggle('open');cc.style.maxHeight=open?'0px':(items.length*42+'px');});
      treeEl.appendChild(folder);treeEl.appendChild(cc);
      items.forEach(function(l){
        var item=document.createElement('div');item.className='tree-item';item.style.paddingLeft='1.8rem';
        item.innerHTML='<span>'+getClassIcon('levels',l.cls)+'</span><span>#'+l.id+' '+escapeHtml(l.title||'')+'</span>';
        item.addEventListener('click',function(ev){ev.stopPropagation();document.querySelectorAll('.tree-item').forEach(function(el){el.classList.remove('active');});item.classList.add('active');openView('levels',l.id);});
        cc.appendChild(item);
      });
    });
  }else{
    treeEl.innerHTML='';
    arr.forEach(function(d){
      var item=document.createElement('div');item.className='tree-item';
      item.innerHTML='<span>'+getClassIcon(currentSection,d.cls)+'</span><span>#'+d.id+' '+escapeHtml(d.title||d.name||'')+'</span>';
      item.addEventListener('click',function(){document.querySelectorAll('.tree-item').forEach(function(el){el.classList.remove('active');});item.classList.add('active');openView(currentSection,d.id);});
      treeEl.appendChild(item);
    });
  }
}



// ── PROFILE MODAL ─────────────────────────────────
function openProfileModal(){
  var p=getProfile();
  var profileHTML='';
  if(!p){
    profileHTML='<div class="empty-state"><div class="empty-icon">\u{1F464}</div><p>NO PROFILE YET</p><p>Create your researcher profile to contribute.</p><button class="btn primary" id="createProfileBtn">CREATE PROFILE</button></div>';
  }else{
    var ach=getAchievements();
    var earnedHTML=achievementDefs.map(function(a){
      var earned=ach.indexOf(a.id)!==-1;
      return '<span style="display:inline-block;text-align:center;margin:.3rem;opacity:'+(earned?'1':'.2')+'" title="'+a.desc+'"><span style="font-size:1.4rem;display:block">'+a.icon+'</span><span style="font-size:.45rem;color:var(--text-dim);display:block">'+a.name+'</span></span>';
    }).join('');
    profileHTML=
      '<div style="text-align:center;margin-bottom:1rem">'+
      (p.avatar?'<img src="'+escapeHtml(p.avatar)+'" style="width:60px;height:60px;border-radius:50%;border:2px solid var(--amber-dim);margin-bottom:.5rem" onerror="this.style.display=\'none\'" alt="">':'<div style="width:60px;height:60px;border-radius:50%;background:var(--surface2);border:2px solid var(--amber-dim);margin:0 auto .5rem;display:flex;align-items:center;justify-content:center;font-size:1.8rem">\u{1F464}</div>')+
      '<h3 style="color:var(--amber);font-family:var(--font-mono)">'+escapeHtml(p.displayName||p.username)+'</h3>'+
      '<p style="font-size:.6rem;color:var(--text-dim)">@'+escapeHtml(p.username)+'</p>'+
      (p.bio?'<p style="font-size:.65rem;color:var(--text-dim);margin:.5rem 0;max-width:400px;margin-left:auto;margin-right:auto">'+escapeHtml(p.bio)+'</p>':'')+
      '<p style="font-size:.55rem;color:var(--text-muted);margin:.3rem 0">Joined: '+p.joined+'</p>'+
      '</div>'+
      '<div class="view-section"><h3>STATISTICS</h3>'+
      '<div style="display:flex;justify-content:space-around;text-align:center">'+
      '<div><div style="font-size:1.5rem;color:var(--amber)">'+(p.stats?p.stats.created||0:0)+'</div><div style="font-size:.5rem;color:var(--text-dim)">CREATED</div></div>'+
      '<div><div style="font-size:1.5rem;color:var(--amber)">'+(p.stats?p.stats.edited||0:0)+'</div><div style="font-size:.5rem;color:var(--text-dim)">EDITED</div></div>'+
      '<div><div style="font-size:1.5rem;color:var(--amber)">'+(p.stats?p.stats.comments||0:0)+'</div><div style="font-size:.5rem;color:var(--text-dim)">COMMENTS</div></div>'+
      '</div></div>'+
      '<div class="view-section"><h3>ACHIEVEMENTS ('+ach.length+'/'+achievementDefs.length+')</h3><div style="display:flex;flex-wrap:wrap;justify-content:center">'+earnedHTML+'</div></div>';
  }

  var modal=document.createElement('div');modal.className='modal active';modal.id='profileModal';
  modal.innerHTML='<div class="modal-content" style="max-width:550px">'+
    '<h3 style="color:var(--amber);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;font-size:.72rem;margin-bottom:1rem">\u{1F464} RESEARCHER PROFILE</h3>'+
    '<div id="profileInner">'+profileHTML+'</div>'+
    '<div style="text-align:right;margin-top:1rem">'+
    (p?'<button class="btn" id="editProfileBtn">EDIT PROFILE</button>':'')+
    '<button class="btn" id="closeProfileBtn">CLOSE</button></div></div>';
  document.body.appendChild(modal);
  document.body.style.overflow='hidden';

  modal.addEventListener('click',function(e){if(e.target===modal){modal.remove();document.body.style.overflow='';}});
  document.getElementById('closeProfileBtn').addEventListener('click',function(){modal.remove();document.body.style.overflow='';});

  if(!p){
    document.getElementById('createProfileBtn').addEventListener('click',function(){
      modal.remove();
      openProfileEditor();
    });
  }else{
    document.getElementById('editProfileBtn').addEventListener('click',function(){
      modal.remove();
      openProfileEditor();
    });
  }
}

// ── PROFILE EDITOR ────────────────────────────────
function openProfileEditor(){
  var p=getProfile()||{username:'',displayName:'',avatar:'',bio:'',joined:new Date().toISOString().split('T')[0],achievements:[],stats:{created:0,edited:0,comments:0}};
  var modal=document.createElement('div');modal.className='modal active';modal.id='profileEditModal';
  modal.innerHTML='<div class="modal-content" style="max-width:480px">'+
    '<h3 style="color:var(--amber);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;font-size:.72rem;margin-bottom:1rem">'+(p.username?'EDIT PROFILE':'CREATE PROFILE')+'</h3>'+
    '<div class="form-section">'+
    '<div class="form-group"><label>USERNAME</label><input id="peUser" value="'+escapeHtml(p.username||'')+'" placeholder="researcher_name"'+(!!p.username?' disabled':'')+'></div>'+
    '<div class="form-group"><label>DISPLAY NAME</label><input id="peDisplay" value="'+escapeHtml(p.displayName||'')+'" placeholder="Dr. Something"></div>'+
    '<div class="form-group"><label>AVATAR URL</label><input id="peAvatar" value="'+escapeHtml(p.avatar||'')+'" placeholder="https://..."></div>'+
    '<div class="form-group"><label>BIO</label><textarea id="peBio" rows="3">'+escapeHtml(p.bio||'')+'</textarea></div>'+
    '</div>'+
    '<div style="text-align:right;margin-top:1rem">'+
    '<button class="btn" id="cancelProfileBtn">CANCEL</button>'+
    '<button class="btn primary" id="saveProfileBtn">SAVE</button></div></div>';
  document.body.appendChild(modal);
  document.body.style.overflow='hidden';

  modal.addEventListener('click',function(e){if(e.target===modal){modal.remove();document.body.style.overflow='';}});
  document.getElementById('cancelProfileBtn').addEventListener('click',function(){modal.remove();document.body.style.overflow='';});
  document.getElementById('saveProfileBtn').addEventListener('click',function(){
    var username=document.getElementById('peUser').value.trim();
    if(!username){toast('USERNAME REQUIRED','error');return;}
    var profile={
      username:username,
      displayName:document.getElementById('peDisplay').value.trim()||username,
      avatar:document.getElementById('peAvatar').value.trim(),
      bio:document.getElementById('peBio').value.trim(),
      joined:p.joined||new Date().toISOString().split('T')[0],
      achievements:p.achievements||[],
      stats:p.stats||{created:0,edited:0,comments:0}
    };
    saveProfile(profile);
    modal.remove();document.body.style.overflow='';
    toast('PROFILE SAVED','success');
    syncProfileToGitHub();
    renderContent();
  });
}

// ── RESEARCHERS TAB ───────────────────────────────
function renderResearchersTab(){
  var profiles=[];
  var p=getProfile();if(p)profiles.push(p);
  // In full version, loads all users/*.json from GitHub
  contentArea.innerHTML='<div class="terminal-line">RESEARCHERS DATABASE</div>'+
    (profiles.length===0?'<div class="empty-state"><div class="empty-icon">\u{1F465}</div><p>NO RESEARCHERS YET</p><p>Create your profile to be the first!</p></div>':
    '<div class="grid" style="margin-top:1rem">'+profiles.map(function(pr){
      var ach=getAchievements();
      return '<div class="card" style="cursor:default"><div class="card-inner" style="text-align:center">'+
        (pr.avatar?'<img src="'+escapeHtml(pr.avatar)+'" style="width:50px;height:50px;border-radius:50%;border:2px solid var(--amber-dim);margin-bottom:.5rem" onerror="this.style.display=\'none\'" alt="">':'<div style="width:50px;height:50px;border-radius:50%;background:var(--surface2);border:2px solid var(--amber-dim);margin:0 auto .5rem;display:flex;align-items:center;justify-content:center;font-size:1.5rem">\u{1F464}</div>')+
        '<div class="card-title">'+escapeHtml(pr.displayName||pr.username)+'</div>'+
        '<div style="font-size:.55rem;color:var(--text-dim)">@'+escapeHtml(pr.username)+'</div>'+
        (pr.bio?'<div class="card-desc" style="text-align:center">'+escapeHtml(pr.bio.substring(0,80))+'</div>':'')+
        '<div style="display:flex;justify-content:center;gap:1rem;margin-top:.5rem;font-size:.55rem;color:var(--text-dim)">'+
        '<span>'+ach.length+' ach</span>'+
        '</div></div></div>';
    }).join('')+'</div>');
  treeEl.innerHTML='<div style="padding:1rem;color:var(--text-muted);text-align:center;font-size:.62rem">\u{1F465} RESEARCHERS</div>';
}


// ── COMMENTS ──────────────────────────────────────
var commentCache={};
function loadComments(type,id){
  var key=type+'_'+id;
  var filename='comments/'+type+'/'+type+'_'+id+'.json';
  if(!API.owner()||!API.token()){
    var local=localStorage.getItem('tihie_comments_'+key);
    var data=local?JSON.parse(local):{comments:[]};
    renderComments(type,id,data.comments||[]);
    return;
  }
  fetch(API.base()+'/'+filename,{headers:API.headers()}).then(function(r){
    if(r.ok)return r.json();
    return {comments:[]};
  }).then(function(d){
    commentCache[key]=d.comments||[];
    renderComments(type,id,commentCache[key]);
  }).catch(function(){
    var local=localStorage.getItem('tihie_comments_'+key);
    var data=local?JSON.parse(local):{comments:[]};
    renderComments(type,id,data.comments||[]);
  });
}
function renderComments(type,id,comments){
  var list=document.getElementById('commentsList'+id);
  if(!list)return;
  if(!comments.length){list.innerHTML='<p style="font-size:.6rem;color:var(--text-dim);font-style:italic">No comments yet. Be the first.</p>';return;}
  list.innerHTML=comments.map(function(c,i){
    var repliesHTML='';
    if(c.replies&&c.replies.length){
      repliesHTML='<div style="margin-left:1.5rem;border-left:2px solid var(--border);padding-left:.5rem">'+c.replies.map(function(r){
        return '<div style="margin:.4rem 0"><span style="font-size:.55rem;color:var(--amber-dim)">'+escapeHtml(r.author||'anon')+'</span> <span style="font-size:.5rem;color:var(--text-muted)">'+(r.date||'').split('T')[0]+'</span><p style="font-size:.6rem;margin:.15rem 0">'+escapeHtml(r.text||'')+'</p></div>';
      }).join('')+'</div>';
    }
    return '<div style="border-bottom:1px solid var(--border);padding:.4rem 0">'+
      '<span style="font-size:.58rem;color:var(--amber)">'+escapeHtml(c.author||getUserDisplayName()||'anon')+'</span> '+
      '<span style="font-size:.5rem;color:var(--text-muted)">'+(c.date||'').split('T')[0]+'</span>'+
      (c.edited?' <span style="font-size:.48rem;color:var(--text-muted)">(edited)</span>':'')+
      '<p style="font-size:.62rem;margin:.2rem 0">'+escapeHtml(c.text||'')+'</p>'+
      '<button class="btn small" style="font-size:.48rem;padding:.1rem .3rem" onclick="window._replyComment(\''+type+'\',\''+id+'\','+i+')">REPLY</button>'+
      repliesHTML+'</div>';
  }).join('');
}
function postComment(type,id){
  var input=document.getElementById('commentInput'+id);
  if(!input||!input.value.trim())return;
  var text=input.value.trim();
  var author=getUserDisplayName();
  var comment={id:'c'+Date.now(),author:author,date:new Date().toISOString(),text:text,edited:false,replies:[]};
  var key=type+'_'+id;
  saveComment(key,comment);
  input.value='';
  loadComments(type,id);
  incrementStat('comments');
}
function saveComment(key,comment){
  var filename='comments/'+key.replace('_','/')+'.json';
  var local=localStorage.getItem('tihie_comments_'+key.replace('/','_'));
  var data=local?JSON.parse(local):{comments:[]};
  data.comments.push(comment);
  try{localStorage.setItem('tihie_comments_'+key.replace('/','_'),JSON.stringify(data));}catch(e){}
  if(API.owner()&&API.token()){
    commitFile(filename,data).catch(function(){});
  }
}
window._replyComment=function(type,id,parentIdx){
  var reply=prompt('Reply:');
  if(!reply||!reply.trim())return;
  var key=type+'_'+id.replace('/','_');
  var local=localStorage.getItem('tihie_comments_'+key);
  var data=local?JSON.parse(local):{comments:[]};
  if(data.comments[parentIdx]){
    if(!data.comments[parentIdx].replies)data.comments[parentIdx].replies=[];
    data.comments[parentIdx].replies.push({id:'r'+Date.now(),author:getUserDisplayName(),date:new Date().toISOString(),text:reply.trim(),edited:false});
    try{localStorage.setItem('tihie_comments_'+key,JSON.stringify(data));}catch(e){}
    var filename='comments/'+type+'/'+type+'_'+id+'.json';
    if(API.owner()&&API.token()){commitFile(filename,data).catch(function(){});}
    loadComments(type,id);
  }
};


// ── CHANGELOG ────────────────────────────────────
function loadChangelog(){
  if(!API.owner()||!API.repo()){document.getElementById('clContent').innerHTML='<p style="color:var(--text-dim)">GITHUB NOT CONFIGURED</p>';return;}
  fetch('https://api.github.com/repos/'+API.owner()+'/'+API.repo()+'/commits?per_page=30',{headers:API.headers()})
    .then(function(r){return r.ok?r.json():[];})
    .then(function(commits){document.getElementById('clContent').innerHTML=commits.map(function(c){return'<div class="changelog-entry"><span class="cl-date">'+new Date(c.commit.author.date).toISOString().split('T')[0]+'</span> <span class="cl-msg">'+escapeHtml(c.commit.message)+'</span></div>';}).join('');})
    .catch(function(){document.getElementById('clContent').innerHTML='<p style="color:var(--text-dim)">UNABLE TO LOAD</p>';});
}

// ── COMPARE ──────────────────────────────────────
var compareModal=document.getElementById('compareModal');
document.getElementById('compareBtn').addEventListener('click',function(){
  compareModal.classList.add('active');document.body.style.overflow='hidden';
  function populate(){
    var type=document.getElementById('compareType').value;
    var arr=data[type]||[];
    var opts=arr.map(function(o){return'<option value="'+o.id+'">#'+o.id+' — '+(o.title||o.name||'')+'</option>';}).join('');
    document.getElementById('compareA').innerHTML=opts;
    document.getElementById('compareB').innerHTML=opts;
    doCompare();
  }
  function doCompare(){
    var type=document.getElementById('compareType').value;
    var aId=document.getElementById('compareA').value;
    var bId=document.getElementById('compareB').value;
    var arr=data[type]||[];
    var a=arr.find(function(o){return idsMatch(o.id,aId);});
    var b=arr.find(function(o){return idsMatch(o.id,bId);});
    if(!a||!b){document.getElementById('compareResult').innerHTML='<p style="color:var(--text-dim);grid-column:span 2">SELECT TWO RECORDS</p>';return;}
    function renderCol(obj,other){
      var stats=obj.stats||{};var otherStats=other.stats||{};
      return Object.entries(stats).map(function(e){
        var k=e[0],v=e[1];
        var diff=v!==(otherStats[k]||v);
        return'<div style="display:flex;justify-content:space-between;padding:.25rem 0;'+(diff?'background:rgba(196,164,42,.08);padding:.25rem .4rem;':'')+'border-bottom:1px solid var(--border)"><span style="font-size:.58rem;color:var(--text-muted);text-transform:uppercase">'+k+'</span><span style="font-weight:600;'+(diff?'color:var(--amber);':'')+'">'+v+'</span></div>';
      }).join('');
    }
    document.getElementById('compareResult').innerHTML='<div class="compare-col"><h4 style="color:var(--amber);font-size:.62rem">#'+a.id+' — '+(a.title||a.name||'')+'</h4>'+renderCol(a,b)+'</div><div class="compare-col"><h4 style="color:var(--amber);font-size:.62rem">#'+b.id+' — '+(b.title||b.name||'')+'</h4>'+renderCol(b,a)+'</div>';
  }
  document.getElementById('compareType').onchange=populate;
  document.getElementById('compareA').onchange=doCompare;
  document.getElementById('compareB').onchange=doCompare;
  populate();
});
document.getElementById('closeCompareBtn').addEventListener('click',function(){compareModal.classList.remove('active');document.body.style.overflow='';});

// ── ENCOUNTER SIM ────────────────────────────────
document.getElementById('encounterBtn').addEventListener('click',function(){
  document.getElementById('encounterModal').classList.add('active');document.body.style.overflow='hidden';
  document.getElementById('encounterResult').innerHTML='<p style="color:var(--text-dim);margin:2rem 0">PRESS ROLL TO SIMULATE...</p>';
});
document.getElementById('closeEncounterBtn').addEventListener('click',function(){document.getElementById('encounterModal').classList.remove('active');document.body.style.overflow='';});
document.getElementById('rollEncounterBtn').addEventListener('click',function(){
  var entities=data.entities;var levels=data.levels;
  if(!entities.length){document.getElementById('encounterResult').innerHTML='<div class="empty-state"><div class="empty-icon">\u{1F47B}</div><p>NO ENTITIES IN DATABASE</p><p>Add entity records via the ENTITIES tab to use the encounter simulator.</p></div>';return;}
  var entity=entities[Math.floor(Math.random()*entities.length)];
  var level=levels.length?levels[Math.floor(Math.random()*levels.length)]:null;
  var outcomes=['SURVIVED','SURVIVED WITH INJURIES','ESCAPED','LOST CONSCIOUSNESS','DECEASED','UNKNOWN FATE'];
  var weights=[0.3,0.25,0.2,0.1,0.1,0.05];
  var r=Math.random();var cum=0;var outcome=outcomes[0];
  for(var i=0;i<outcomes.length;i++){cum+=weights[i];if(r<=cum){outcome=outcomes[i];break;}}
  var oc={};oc['SURVIVED']='var(--green)';oc['ESCAPED']='var(--amber)';oc['SURVIVED WITH INJURIES']='var(--orange)';oc['LOST CONSCIOUSNESS']='var(--purple)';oc['DECEASED']='var(--red)';oc['UNKNOWN FATE']='var(--text-dim)';
  var oi={};oi['SURVIVED']='\u{1F7E2}';oi['ESCAPED']='\u{1F7E1}';oi['SURVIVED WITH INJURIES']='\u{1F7E0}';oi['LOST CONSCIOUSNESS']='\u{1F7E3}';oi['DECEASED']='\u{1F534}';oi['UNKNOWN FATE']='\u2B1C';
  var om={};om['SURVIVED']='You managed to escape unscathed.';om['ESCAPED']='A close call \u2014 you barely made it out.';om['SURVIVED WITH INJURIES']='You sustained injuries but survived.';om['LOST CONSCIOUSNESS']='You blacked out... when you woke up, the entity was gone.';om['DECEASED']='FATALITY. The archive records your final moments.';om['UNKNOWN FATE']='Your fate is uncertain. The record ends here.';
  var lid=level?level.id:'?';var lti=level?level.title:'UNKNOWN';
  var eic=(entityClassStyles[entity.cls]||{}).icon||'?';var enm=entity.name||'UNKNOWN';
  var result='<p style="color:var(--text-dim);font-size:.65rem">LOCATION: LEVEL #'+lid+' \u2014 '+lti+'</p><p style="color:var(--text-dim);font-size:.65rem">ENTITY: '+eic+' '+enm+' (#'+entity.id+')</p><div class="encounter-result"><div class="big-icon">'+oi[outcome]+'</div><div class="outcome" style="color:'+(oc[outcome]||'var(--text)')+'">'+outcome+'</div></div><p style="color:var(--text-dim);font-size:.6rem;margin-top:.8rem">'+om[outcome]+'</p>';
  document.getElementById('encounterResult').innerHTML=result;
});

// ── STATS ────────────────────────────────────────
document.getElementById('statsBtn').addEventListener('click',function(){
  var total=data.levels.length+data.entities.length+data.items.length+data.foods.length;
  var avgSafety=data.levels.length?(data.levels.reduce(function(s,l){return s+(l.stats?safety||3:3);},0)/data.levels.length).toFixed(1):'N/A';
  var avgDanger=data.entities.length?(data.entities.reduce(function(s,e){return s+(e.stats?e.stats.danger||3:3);},0)/data.entities.length).toFixed(1):'N/A';
  var dangerous=data.levels.filter(function(l){return(l.stats?safety||0:0)>=4;}).length;
  var lethal=data.entities.filter(function(e){return(e.stats?e.stats.danger||0:0)>=3;}).length;
  var allTags={};
  ['levels','entities','items','foods'].forEach(function(t){data[t].forEach(function(o){(o.tags||[]).forEach(function(tag){allTags[tag]=(allTags[tag]||0)+1;});});});
  var topTags=Object.entries(allTags).sort(function(a,b){return b[1]-a[1];}).slice(0,10);
  document.getElementById('statsContent').innerHTML='<div class="view-section"><h3>OVERVIEW</h3><p>TOTAL RECORDS: <strong>'+total+'</strong></p><p>LEVELS: <strong>'+data.levels.length+'</strong> | ENTITIES: <strong>'+data.entities.length+'</strong> | OBJECTS: <strong>'+data.items.length+'</strong> | SUSTENANCE: <strong>'+data.foods.length+'</strong></p><p>AVG SAFETY: <strong>'+avgSafety+'</strong> | AVG DANGER: <strong>'+avgDanger+'</strong></p><p>DANGEROUS LEVELS (4-5): <strong style="color:var(--red)">'+dangerous+'</strong> | LETHAL ENTITIES (3): <strong style="color:var(--red)">'+lethal+'</strong></p></div><div class="view-section"><h3>TOP TAGS</h3>'+topTags.map(function(e){return'<span class="tag" style="margin:.15rem;font-size:'+(.55+e[1]*.04)+'rem">#'+e[0]+' ['+e[1]+']</span>';}).join(' ')+'</div>';
  document.getElementById('statsModal').classList.add('active');document.body.style.overflow='hidden';
});
document.getElementById('closeStatsBtn').addEventListener('click',function(){document.getElementById('statsModal').classList.remove('active');document.body.style.overflow='';});
document.getElementById('exportStatsBtn').addEventListener('click',function(){var text=document.getElementById('statsContent').innerText;navigator.clipboard.writeText(text).then(function(){toast('COPIED','success');}).catch(function(){toast('FAILED','error');});});

// ── THEME ────────────────────────────────────────
document.getElementById('themeBtn').addEventListener('click',function(){
  var idx=themes.indexOf(currentTheme);currentTheme=themes[(idx+1)%themes.length];
  document.body.setAttribute('data-theme',currentTheme);
  this.textContent='\u{1F3A8} THEME: '+currentTheme.toUpperCase();
});

// ── FULLSCREEN ───────────────────────────────────
document.getElementById('fullscreenBtn').addEventListener('click',function(){document.body.classList.toggle('fullscreen');});

// ── EXPORT/IMPORT ────────────────────────────────