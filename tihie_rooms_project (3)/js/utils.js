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