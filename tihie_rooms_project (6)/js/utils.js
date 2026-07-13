
// ── APP STATE ─────────────────────────────────────
var currentSection = 'home';
var data = {levels:[], entities:[], items:[], foods:[]};
var fileIndexCache = {};
var currentEditType = null;
var historyStack = [];
var isDirty = false;
var MAX_HISTORY = 20;
'use strict';

/* ================================================================
   TIHIE ROOMS ARCHIVE v3.0 — COMPLETE REBUILD
   All functions verified. No deeply nested ternaries. 
   All DOM refs declared before use. Robust error handling.
   ================================================================ */

// ── DOM REFS (declared FIRST) ────────────────────
var contentArea = document.getElementById('contentArea');
var treeEl = document.getElementById('tree');
var lightbox = document.getElementById('lightbox');
var lightboxImg = document.getElementById('lightboxImg');
var breadcrumbs = document.getElementById('breadcrumbs');
var viewModal = document.getElementById('viewModal');
var viewContent = document.getElementById('viewContent');
var editModal = document.getElementById('editModal');
var editContent = document.getElementById('editContent');

// ── GLOBALS ──────────────────────────────────────

// ── PROFILE SYSTEM ─────────────────────────────────
function getProfile(){
  try{var p=JSON.parse(localStorage.getItem('tihie_profile'));return p&&p.username?p:null;}catch(e){return null;}
}
function saveProfile(profile){
  try{localStorage.setItem('tihie_profile',JSON.stringify(profile));return true;}catch(e){return false;}
}
function getCurrentUsername(){
  var p=getProfile();return p?p.username:null;
}
function getUserDisplayName(){
  var p=getProfile();return p?p.displayName||p.username:'Anonymous';
}
function syncProfileToGitHub(){
  var p=getProfile();if(!p||!API.owner()||!API.token())return;
  var filename='users/'+p.username+'.json';
  var content={username:p.username,displayName:p.displayName||p.username,avatar:p.avatar||'',bio:p.bio||'',joined:p.joined||new Date().toISOString().split('T')[0],achievements:p.achievements||[],stats:p.stats||{created:0,edited:0,comments:0},lastActive:new Date().toISOString().split('T')[0]};
  commitFile(filename,content).catch(function(){});
}

// ── ACHIEVEMENTS ──────────────────────────────────
var achievementDefs=[
  {id:'first_record',name:'First Record',icon:'\u{1F95A}',desc:'Created your first record'},
  {id:'archivist',name:'Archivist',icon:'\u{1F4DA}',desc:'Created 10+ records'},
  {id:'librarian',name:'Librarian',icon:'\u{1F4D6}',desc:'Created 50+ records'},
  {id:'entity_hunter',name:'Entity Hunter',icon:'\u{1F47B}',desc:'Documented 5+ entities'},
  {id:'gourmet',name:'Gourmet',icon:'\u{1F37D}',desc:'Documented 10+ food items'},
  {id:'engineer',name:'Engineer',icon:'\u{1F527}',desc:'Documented 10+ objects'},
  {id:'scribe',name:'Scribe',icon:'\u270F',desc:'Edited 20+ records by others'},
  {id:'speaker',name:'Speaker',icon:'\u{1F4AC}',desc:'Posted 50+ comments'},
  {id:'stylist',name:'Stylist',icon:'\u{1F3A8}',desc:'Tried all 25 themes'},
  {id:'explorer',name:'Explorer',icon:'\u{1F50D}',desc:'Used Lucky Block 10+ times'},
  {id:'konami_master',name:'Konami Master',icon:'\u2B06',desc:'Activated Konami code'},
  {id:'collaborator',name:'Collaborator',icon:'\u{1F91D}',desc:'Co-author on 5+ records'},
  {id:'curator',name:'Curator',icon:'\u{1F451}',desc:'Earned all achievements'}
];

function getAchievements(){
  var p=getProfile();return p?p.achievements||[]:[];
}
function awardAchievement(id){
  var p=getProfile();if(!p)return false;
  if(!p.achievements)p.achievements=[];
  if(p.achievements.indexOf(id)!==-1)return false;
  p.achievements.push(id);
  var def=achievementDefs.find(function(a){return a.id===id;});
  saveProfile(p);
  if(def)toast('ACHIEVEMENT: '+def.icon+' '+def.name,'success');
  syncProfileToGitHub();
  return true;
}
function checkAchievements(){
  var p=getProfile();if(!p||!p.stats)return;
  var s=p.stats;
  if(s.created>=1)awardAchievement('first_record');
  if(s.created>=10)awardAchievement('archivist');
  if(s.created>=50)awardAchievement('librarian');
  if(s.edited>=20)awardAchievement('scribe');
  if(s.comments>=50)awardAchievement('speaker');
  var all=achievementDefs.filter(function(a){return a.id!=='curator';});
  var earned=getAchievements();
  if(all.every(function(a){return earned.indexOf(a.id)!==-1;}))awardAchievement('curator');
}
function incrementStat(stat){
  var p=getProfile();if(!p)return;
  if(!p.stats)p.stats={created:0,edited:0,comments:0};
  p.stats[stat]=(p.stats[stat]||0)+1;
  saveProfile(p);
  checkAchievements();
}

// ── AUTHORSHIP HELPERS ────────────────────────────
function ensureAuthorship(obj,isNew){
  var username=getCurrentUsername();if(!username)return obj;
  if(isNew||!obj.author){
    obj.author=username;
    obj.createdAt=obj.createdAt||new Date().toISOString();
    return obj;
  }
  return obj;
}
function addContributor(obj,changedFields){
  var username=getCurrentUsername();if(!username)return obj;
  if(!obj.contributors)obj.contributors=[];
  if(obj.author===username)return obj;
  var existing=obj.contributors.find(function(c){return c.username===username;});
  if(existing){
    existing.date=new Date().toISOString();
    var merged={};existing.changes.forEach(function(f){merged[f]=true;});
    changedFields.forEach(function(f){merged[f]=true;});
    existing.changes=Object.keys(merged);
  }else{
    obj.contributors.push({username:username,date:new Date().toISOString(),changes:changedFields.slice()});
  }
  obj.lastModifiedBy=username;
  obj.lastModifiedAt=new Date().toISOString();
  return obj;
}
function detectChanges(oldObj,newObj){
  var changes=[];
  var fields=['title','name','desc','cls','cluster','habitat','behavior','survival','props','effect','thumbnail','discoveredAt'];
  fields.forEach(function(f){
    if(JSON.stringify(oldObj[f])!==JSON.stringify(newObj[f]))changes.push(f);
  });
  if(JSON.stringify(oldObj.stats)!==JSON.stringify(newObj.stats))changes.push('stats');
  if(JSON.stringify(oldObj.tags)!==JSON.stringify(newObj.tags))changes.push('tags');
  if(JSON.stringify(oldObj.ent)!==JSON.stringify(newObj.ent))changes.push('ent');
  return changes;
}
