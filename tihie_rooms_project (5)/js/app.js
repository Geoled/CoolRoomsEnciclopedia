'use strict';

// ── THEMES (25 themes) ─────────────────────────
var currentThemeIdx = 0;
var themes = ['amber','green','white','crimson','ocean','midnight','forest','sunset','ghost','monochrome','retro','matrix','arctic','ember','lavender','moss','neon','steel','ink','sepia','aqua','ruby','olive','sky','noir'];
var themeNames = ['Amber','Green','White','Crimson','Ocean','Midnight','Forest','Sunset','Ghost','Monochrome','Retro','Matrix','Arctic','Ember','Lavender','Moss','Neon','Steel','Ink','Sepia','Aqua','Ruby','Olive','Sky','Noir'];

function setTheme(idx){
  currentThemeIdx = ((idx % themes.length) + themes.length) % themes.length;
  var t = themes[currentThemeIdx];
  document.body.setAttribute('data-theme', t);
  try { localStorage.setItem('tihie_theme', t); } catch(e) {}
  var btn = document.getElementById('themeBtn');
  if (btn) btn.innerHTML = '\u{1F3A8} ' + themeNames[currentThemeIdx] + ' [' + (currentThemeIdx + 1) + '/25]';
}

// Restore saved theme on load
(function(){
  var saved = localStorage.getItem('tihie_theme');
  if (saved && themes.indexOf(saved) !== -1) setTheme(themes.indexOf(saved));
})();

// ── THEME BUTTON ────────────────────────────────
document.getElementById('themeBtn').addEventListener('click', function(){
  setTheme(currentThemeIdx + 1);
});

// ── FULLSCREEN ──────────────────────────────────
document.getElementById('fullscreenBtn').addEventListener('click', function(){
  document.body.classList.toggle('fullscreen');
});

// ── SCROLL TO TOP ───────────────────────────────
(function(){
  var btn = document.createElement('div');
  btn.className = 'scroll-top';
  btn.innerHTML = '\u25B2';
  btn.title = 'Scroll to top';
  document.body.appendChild(btn);
  btn.addEventListener('click', function(){ contentArea.scrollTo({top: 0, behavior: 'smooth'}); });
  contentArea.addEventListener('scroll', function(){
    if (contentArea.scrollTop > 400) btn.classList.add('visible');
    else btn.classList.remove('visible');
  });
})();

// ── SHORTCUTS PANEL ────────────────────────────
(function(){
  var panel = document.createElement('div');
  panel.className = 'shortcuts-panel';
  panel.id = 'shortcutsPanel';
  panel.innerHTML = '<div style="color:var(--amber);font-size:.55rem;margin-bottom:.4rem">KEYBOARD SHORTCUTS</div>' +
    '<div class="sc-row"><span>/</span><span class="shortcut-hint">Search</span></div>' +
    '<div class="sc-row"><span>Esc</span><span class="shortcut-hint">Close</span></div>' +
    '<div class="sc-row"><span>?</span><span class="shortcut-hint">Shortcuts</span></div>' +
    '<div class="sc-row"><span>Ctrl+D</span><span class="shortcut-hint">Compact</span></div>' +
    '<div class="sc-row"><span>Ctrl+F</span><span class="shortcut-hint">Fullscreen</span></div>' +
    '<div class="sc-row"><span>Ctrl+\u2190\u2192</span><span class="shortcut-hint">Theme</span></div>';
  document.body.appendChild(panel);
  window._toggleShortcuts = function(){ panel.classList.toggle('open'); };
})();

// ── COMPACT MODE ───────────────────────────────
(function(){
  if (localStorage.getItem('tihie_compact') === '1') document.body.classList.add('compact');
  window._toggleCompact = function(){
    document.body.classList.toggle('compact');
    var c = document.body.classList.contains('compact');
    localStorage.setItem('tihie_compact', c ? '1' : '0');
    toast(c ? 'COMPACT MODE ON' : 'COMPACT MODE OFF', 'info');
  };
})();

// ── EXPORT/IMPORT ────────────────────────────────
function exportAllData(){
  var blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'tihie_rooms_backup_' + new Date().toISOString().split('T')[0] + '.json'; a.click();
  toast('EXPORTED', 'success');
}

function importAllData(){
  var input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
  input.onchange = function(e){
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      try {
        var imported = JSON.parse(ev.target.result);
        if (!imported.levels || !imported.entities || !imported.items || !imported.foods) { toast('INVALID FORMAT', 'error'); return; }
        if (!confirm('IMPORT ' + imported.levels.length + ' LEVELS, ' + imported.entities.length + ' ENTITIES, ' + imported.items.length + ' OBJECTS, ' + imported.foods.length + ' SUSTENANCE? OVERWRITES EXISTING DATA.')) return;
        var load = showLoading(contentArea);
        var promises = [];
        ['levels','entities','items','foods'].forEach(function(type){
          imported[type].forEach(function(obj){
            var fn = type + '/' + type + '_' + obj.id + '.json';
            promises.push(commitFile(fn, obj));
          });
        });
        Promise.all(promises).then(function(){
          hideLoading(load);
          loadAllData().then(function(){ renderTree(); renderContent(); toast('IMPORT COMPLETE', 'success'); });
        });
      } catch(ex) { toast('FILE READ ERROR', 'error'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ── SECTION SWITCHING ────────────────────────────
function switchSection(section){
  currentSection = section;
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === section); });
  var labels = {home:'TERMINAL',levels:'LEVELS',entities:'ENTITIES',items:'OBJECTS',foods:'SUSTENANCE',bookmarks:'BOOKMARKS',timeline:'TIMELINE',changelog:'CHANGELOG'};
  breadcrumbs.innerHTML = section === 'home' ? 'TERMINAL' : '<span onclick="window._sw(\'home\')">TERMINAL</span> \u203A ' + labels[section];
  var needsLoad = ['home','bookmarks','timeline','changelog'].indexOf(section) === -1;
  if (needsLoad) {
    var load = showLoading(contentArea);
    loadSectionData(section).then(function(){ hideLoading(load); renderTree(); renderContent(); });
  } else {
    renderTree(); renderContent();
  }
}
window._sw = switchSection;

var settingsModal = document.getElementById('settingsModal');

var compareModal = document.getElementById('compareModal');
window.openView = openView;

// ── KEYBOARD ─────────────────────────────────────
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') {
    if (lightbox.classList.contains('active')) lightbox.classList.remove('active');
    else if (viewModal.classList.contains('active')) closeView();
    else if (editModal.classList.contains('active')) closeEdit();
    else {
      [settingsModal, compareModal, document.getElementById('encounterModal'), document.getElementById('statsModal')].forEach(function(m){
        if (m && m.classList.contains('active')) { m.classList.remove('active'); document.body.style.overflow = ''; }
      });
    }
  }
  if (e.key === '/' && ['INPUT','TEXTAREA','SELECT'].indexOf(document.activeElement.tagName) === -1) {
    e.preventDefault();
    var s = document.getElementById('searchInput');
    if (s) s.focus();
  }
  if (e.key === '?' && ['INPUT','TEXTAREA','SELECT'].indexOf(document.activeElement.tagName) === -1) {
    e.preventDefault();
    window._toggleShortcuts();
  }
  if (e.key === 'd' && e.ctrlKey) { e.preventDefault(); window._toggleCompact(); }
  if (e.key === 'ArrowRight' && e.ctrlKey) { e.preventDefault(); setTheme(currentThemeIdx + 1); }
  if (e.key === 'ArrowLeft' && e.ctrlKey) { e.preventDefault(); setTheme(currentThemeIdx - 1); }
});

// ── SETTINGS ─────────────────────────────────────
document.getElementById('settingsBtn').addEventListener('click', function(){
  document.getElementById('settingsOwner').value = API.owner();
  document.getElementById('settingsRepo').value = API.repo();
  document.getElementById('settingsToken').value = API.token();
  settingsModal.classList.add('active');
  document.body.style.overflow = 'hidden';
});
document.getElementById('closeSettingsBtn').addEventListener('click', function(){
  settingsModal.classList.remove('active');
  document.body.style.overflow = '';
});
document.getElementById('saveSettingsBtn').addEventListener('click', function(){
  localStorage.setItem('gh_owner', document.getElementById('settingsOwner').value.trim());
  localStorage.setItem('gh_repo', document.getElementById('settingsRepo').value.trim());
  localStorage.setItem('gh_token', document.getElementById('settingsToken').value.trim());
  settingsModal.classList.remove('active');
  document.body.style.overflow = '';
  toast('CONFIG SAVED', 'success');
});

// ── LUCKY ────────────────────────────────────────
document.getElementById('luckyBtn').addEventListener('click', function(){
  var all = [];
  ['levels','entities','items','foods'].forEach(function(t){ data[t].forEach(function(o){ o._t = t; all.push(o); }); });
  if (!all.length) { toast('DATABASE EMPTY', 'info'); return; }
  var obj = all[Math.floor(Math.random() * all.length)];
  switchSection(obj._t);
  setTimeout(function(){ openView(obj._t, obj.id); }, 300);
});

// ── REFRESH / ADD ────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click', function(){
  fileIndexCache = {};
  var load = showLoading(contentArea);
  loadAllData().then(function(){ hideLoading(load); renderTree(); renderContent(); toast('SYNCED', 'info'); });
});
document.getElementById('addBtn').addEventListener('click', function(){
  if (['home','bookmarks','timeline','changelog'].indexOf(currentSection) !== -1) {
    toast('SELECT A SECTION FIRST', 'info');
    return;
  }
  openEditModal(currentSection);
});

// ── MOBILE ───────────────────────────────────────
var mobileBtn = document.getElementById('mobileMenuBtn');
var sidebarEl = document.getElementById('sidebar');
mobileBtn.addEventListener('click', function(){ sidebarEl.classList.toggle('open'); });
document.addEventListener('click', function(e){
  if (window.innerWidth <= 768 && !sidebarEl.contains(e.target) && e.target !== mobileBtn && !mobileBtn.contains(e.target)) {
    sidebarEl.classList.remove('open');
  }
});

// ── MODAL BACKDROP CLOSE ─────────────────────────
[viewModal, editModal, settingsModal, compareModal, document.getElementById('encounterModal'), document.getElementById('statsModal')].forEach(function(m){
  if (!m) return;
  m.addEventListener('click', function(e){ if (e.target === m) { m.classList.remove('active'); document.body.style.overflow = ''; } });
});
lightbox.addEventListener('click', function(){ lightbox.classList.remove('active'); });

// ── ALL TAB CLICKS ───────────────────────────────
document.querySelectorAll('.tab-btn').forEach(function(b){ b.addEventListener('click', function(){ switchSection(b.dataset.tab); }); });

// ── KONAMI CODE ─────────────────────────────────
var konamiBuf = '';
var konamiSeq = 'ArrowUpArrowUpArrowDownArrowDownArrowLeftArrowRightArrowLeftArrowRightKeyBKeyA';
document.addEventListener('keydown', function(e){
  konamiBuf += e.key;
  if (konamiBuf.length > 60) konamiBuf = konamiBuf.slice(-60);
  if (konamiBuf.indexOf(konamiSeq) !== -1) {
    toast('KONAMI CODE ACTIVATED', 'success');
    var seq = ['green','white','crimson','ocean','midnight','forest','sunset','ghost','monochrome','retro','matrix','arctic','ember','lavender','moss','neon','steel','ink','sepia','aqua','ruby','olive','sky','noir','amber'];
    var k = 0;
    var ti = setInterval(function(){
      setTheme(themes.indexOf(seq[k]));
      k++;
      if (k >= seq.length) clearInterval(ti);
    }, 200);
    konamiBuf = '';
  }
});

// ── BOOT SEQUENCE ────────────────────────────────
(function boot(){
  var overlay = document.getElementById('bootOverlay');
  var lines = [
    'TIHIE ROOMS ARCHIVE v3.0 — INITIALIZING...',
    'MEMORY CHECK...... OK',
    'LOADING CATALOG ENGINE......',
    'ESTABLISHING GITHUB SYNC......',
    'DECRYPTING DATABASE......',
    'RENDERING INTERFACE......',
    'SYSTEM READY.',
    '> WELCOME, RESEARCHER.'
  ];
  var i = 0;
  var interval = setInterval(function(){
    if (i < lines.length) {
      var el = document.createElement('div'); el.className = 'boot-line';
      el.textContent = lines[i]; el.style.animationDelay = (i * 0.05) + 's';
      overlay.appendChild(el); i++;
    } else {
      clearInterval(interval);
      var cursor = document.createElement('span'); cursor.className = 'boot-cursor';
      cursor.textContent = '\u2588'; overlay.appendChild(cursor);
      setTimeout(function(){
        overlay.classList.add('fadeout');
        setTimeout(function(){ if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 500);
      }, 800);
    }
  }, 150);
  setTimeout(function(){
    try { overlay.classList.add('fadeout'); setTimeout(function(){ try { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch(e) {} }, 500); } catch(e) {}
  }, 4000);
})();

// ── INIT ─────────────────────────────────────────
loadAllData().then(function(){
  renderTree();
  renderContent();
}).catch(function(){
  renderTree();
  renderContent();
});
