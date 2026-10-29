/* DIALD roster — "Analyze my file".
   The teacher's file is read and analyzed inside the browser. Student names and IDs
   never leave this computer: nothing in this file sends data to a server. */
(function () {
  'use strict';
  const E = window.DIALDEngine;
  const DOMAINS = E.DOMAINS;
  const D1 = { listening: 'L', speaking: 'S', reading: 'R', writing: 'W' };
  const DNAME = { listening: 'Listening', speaking: 'Speaking', reading: 'Reading', writing: 'Writing' };
  const QCOLOR = { Q1: '#2A9488', Q2: '#1B3A5C', Q3: '#E3A93B', Q4: '#5FB3A8' };
  const RISK_ORDER = { High: 0, Moderate: 1, Inconclusive: 2, Low: 3 };
  const KEY = 'diald-roster', MAPKEY = 'diald-roster-maps', PLANNAMES = 'diald-plan-names';

  /* ---------- local storage (this computer only) ---------- */
  const ls = {
    get(store, k) { try { return JSON.parse(store.getItem(k)); } catch (e) { return null; } },
    set(store, k, v) { try { store.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be blocked */ } },
    del(store, k) { try { store.removeItem(k); } catch (e) { /* ignore */ } }
  };
  let data = ls.get(sessionStorage, KEY) || ls.get(localStorage, KEY) || null;
  function persist() {
    if (!data) { ls.del(sessionStorage, KEY); ls.del(localStorage, KEY); return; }
    ls.set(sessionStorage, KEY, data);
    if (data.keep) ls.set(localStorage, KEY, data); else ls.del(localStorage, KEY);
  }
  const planNames = () => ls.get(localStorage, PLANNAMES) || {};
  function rememberPlanName(planId, name) { const m = planNames(); m[planId] = name; ls.set(localStorage, PLANNAMES, m); }
  function forgetPlanName(planId) { const m = planNames(); delete m[planId]; ls.set(localStorage, PLANNAMES, m); }
  // Names the browser knows about (used to stop a teacher from typing a name into a plan title).
  window.DIALDLocalNames = () => {
    const out = new Set(Object.values(planNames()));
    if (data) data.students.forEach(s => { if (s.name) s.name.split(/[\s,]+/).forEach(n => n.length > 2 && out.add(n)); });
    return [...out];
  };

  /* ---------- column recognition ---------- */
  const norm = h => String(h || '').toLowerCase().replace(/#/g, 'number').replace(/[^a-z0-9]/g, '');
  const DP = { listening: 'listen', speaking: 'speak', reading: 'read', writing: 'writ' };
  const FIELDS = [
    { k: 'name', label: 'Student name', local: true, test: h => h === 'student' || h === 'learner' || /name/.test(h) && !/first|last|teacher|school|test|district|course|class|parent|guardian/.test(h) },
    { k: 'first', label: 'First name', local: true, test: h => /first/.test(h) && /name/.test(h) || h === 'first' || h === 'firstname' },
    { k: 'last', label: 'Last name', local: true, test: h => /last/.test(h) && /name/.test(h) || h === 'last' || h === 'surname' },
    { k: 'id', label: 'Student ID', local: true, test: h => /^(student|state|local|district|ssid|sasid|lasid|stu)?(id|number|no|sasid|ssid|lasid)$/.test(h) || /studentid|stateid|localid|sasid|lasid/.test(h) },
    { k: 'year', label: 'School year / test date', test: h => /^(school)?year$|schoolyear|testyear|assessmentyear|administration|testdate|datetested|testwindow|^date$|^season$|^term$/.test(h) },
    { k: 'test', label: 'Test name', test: h => /^(test|assessment|exam)(name|type)?$/.test(h) },
    { k: 'grade', label: 'Grade', test: h => /grade/.test(h) && !/score|listen|speak|read|writ|overall|composite/.test(h) },
    { k: 'entered', label: 'Date entered ML / EL program', test: h => /enter/.test(h) && /(ml|el|ell|esl|program|eld)/.test(h) || /firstenrolledus|dateenteredus/.test(h) },
    { k: 'years', label: 'Years in ELD services', test: h => /(years|yrs|year).*(eld|esl|ell|el|service|program|inus|us)/.test(h) || /yearsin/.test(h) },
    { k: 'group', label: 'Group / class (optional)', test: h => /^(group|class|period|section|homeroom|course|teacher)/.test(h) && !/grade/.test(h) }
  ];
  DOMAINS.forEach(d => {
    FIELDS.push({ k: d, label: DNAME[d] + ' level', required: true,
      test: h => h.includes(DP[d]) && !/scale|ss$|raw|score|percent|pct/.test(h) && (/prof|pl$|level|lvl/.test(h) || h === d || h === DP[d] || h === d + 'pl') });
  });
  DOMAINS.forEach(d => {
    FIELDS.push({ k: d + 'Scale', label: DNAME[d] + ' scale score (optional)',
      test: h => h.includes(DP[d]) && /scale|ss$|ssc/.test(h) && !/raw/.test(h) });
  });
  FIELDS.push({ k: 'overall', label: 'Overall level (optional)', test: h => /overall|composite/.test(h) && /prof|level|pl$/.test(h) && !/scale/.test(h) });

  function detect(headers) {
    const used = new Set(), map = {};
    const nh = headers.map(norm);
    FIELDS.forEach(f => {
      const i = nh.findIndex((h, j) => h && !used.has(j) && f.test(h));
      if (i >= 0) { map[f.k] = i; used.add(i); }
    });
    // A single "name" column wins over a first/last pair only when both are missing.
    if (map.first != null && map.last != null && map.name != null) delete map.name;
    return map;
  }
  const signature = headers => headers.map(norm).join('|');

  /* ---------- value parsing ---------- */
  const LEVEL_WORDS = [['above proficient', 5], ['early intermediate', 2], ['entering', 1], ['emerging', 2], ['developing', 3], ['expanding', 4], ['bridging', 5], ['reaching', 6], ['beginning', 1], ['intermediate', 3], ['proficient', 4]];
  function level(v) {
    if (v === '' || v == null) return null;
    if (typeof v === 'number') return v >= 1 && v <= 6 ? Math.round(v * 10) / 10 : null;
    const s = String(v).toLowerCase();
    const m = s.match(/(\d+(\.\d+)?)/);
    if (m) { const n = Number(m[1]); return n >= 1 && n <= 6 ? n : null; }
    const w = LEVEL_WORDS.find(([k]) => s.includes(k));
    return w ? w[1] : null;
  }
  function num(v) { if (v === '' || v == null) return null; const n = Number(String(v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; }
  function yearOf(v, rowIndex) {
    if (v === '' || v == null) return { label: '', sort: rowIndex };
    if (typeof v === 'number' && v > 20000 && v < 80000) { // Excel date serial
      const d = new Date(Math.round((v - 25569) * 864e5));
      return { label: String(d.getUTCFullYear()), sort: d.getTime() };
    }
    if (v instanceof Date) return { label: String(v.getFullYear()), sort: v.getTime() };
    const s = String(v).trim();
    const ys = s.match(/(19|20)\d{2}/g);
    let sort = ys ? Number(ys[ys.length - 1]) : rowIndex;
    if (/spring/i.test(s)) sort += 0.5;
    return { label: cleanLabel(s), sort };
  }
  // Period labels go into saved plans, so keep them short and harmless.
  function cleanLabel(s) {
    return String(s).replace(/[^A-Za-z0-9 .,/()–-]/g, ' ').replace(/\d{5,}/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  }
  // Years since a date (Excel serial, a Date, or text such as 8/25/2021).
  function yearsSince(v) {
    if (v === '' || v == null) return null;
    let d = null;
    if (typeof v === 'number' && v > 20000 && v < 80000) d = new Date(Math.round((v - 25569) * 864e5));
    else if (v instanceof Date) d = v; else { const t = Date.parse(String(v)); if (!isNaN(t)) d = new Date(t); }
    if (!d) return null;
    const y = (Date.now() - d.getTime()) / (365.25 * 864e5);
    return y >= 0 && y < 20 ? Math.floor(y) : null;
  }
  function gradeOf(v) {
    if (v === '' || v == null) return '';
    const s = String(v).trim().toUpperCase();
    if (/^(K|KG|KN|00?)$/.test(s)) return 'K';
    const m = s.match(/\d+/); return m ? String(Number(m[0])) : '';
  }
  function band(g) {
    if (g === 'K') return 'K-2'; const n = Number(g); if (!n && n !== 0) return '';
    return n <= 2 ? 'K-2' : n <= 5 ? '3-5' : n <= 8 ? '6-8' : '9-12';
  }

  /* ---------- reading the file ---------- */
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'diald-xlsx.js';
      s.onload = () => res(window.XLSX); s.onerror = () => rej(new Error('Could not load the file reader.'));
      document.head.appendChild(s);
    });
  }
  async function readFile(file) {
    if (file.size > 15 * 1024 * 1024) throw new Error('This file is larger than 15 MB. Export only the columns you need.');
    const XLSX = await loadXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    // The header row is the first row with at least three text cells.
    const hi = rows.findIndex(r => r.filter(c => /[a-z]/i.test(String(c))).length >= 3);
    if (hi < 0) throw new Error('No header row was found. The first row should have column names.');
    const headers = rows[hi].map(h => String(h).trim());
    const body = rows.slice(hi + 1).filter(r => r.some(c => String(c).trim() !== ''));
    return widen({ fileName: file.name, headers, body });
  }

  // Some exports put every year on one row ("Listening PL 2024-25", "Listening PL 2025-26").
  // Turn those into one row per year so the rest of DIALD reads them the same way.
  const YEAR_RE = /((?:19|20)\d{2})(?:\s*[-–/]\s*(?:(?:19|20)?\d{2}))?|\bSY\s?(\d{2})(?:\s*[-–/]\s*\d{2})?/i;
  function widen(raw) {
    const info = raw.headers.map((h, i) => {
      const m = String(h).match(YEAR_RE); if (!m) return null;
      const rest = norm(String(h).replace(YEAR_RE, ' '));
      const d = DOMAINS.find(x => rest.includes(DP[x]));
      const isScale = /scale|ss$|ssc/.test(rest), isRaw = /raw/.test(rest);
      const isOverall = !d && /overall|composite/.test(rest);
      if ((!d && !isOverall) || isRaw) return null;
      const yr = m[1] ? m[0].replace(/\s+/g, '') : '20' + m[2];
      return { i, yr, kind: isOverall ? (isScale ? null : 'Overall Level') : DNAME[d] + (isScale ? ' Scale Score' : ' Level') };
    });
    const years = [...new Set(info.filter(x => x && x.kind).map(x => x.yr))];
    if (years.length < 1 || info.filter(x => x && x.kind && /Level$/.test(x.kind) && x.kind !== 'Overall Level').length < 4) return raw;
    const wideIdx = new Set(info.filter(Boolean).map(x => x.i));
    const base = raw.headers.map((h, i) => i).filter(i => !wideIdx.has(i));
    const kinds = [...new Set(info.filter(x => x && x.kind).map(x => x.kind))];
    const headers = base.map(i => raw.headers[i]).concat(['Test Year'], kinds);
    const sortYear = y => Number((y.match(/(19|20)\d{2}/) || ['0'])[0]);
    years.sort((a, b) => sortYear(a) - sortYear(b));
    const body = [];
    raw.body.forEach(r => years.forEach(y => {
      const vals = kinds.map(k => { const c = info.find(x => x && x.yr === y && x.kind === k); return c ? r[c.i] : ''; });
      if (vals.some(v => String(v).trim() !== '')) body.push(base.map(i => r[i]).concat([y], vals));
    }));
    return { fileName: raw.fileName, headers, body, widened: years.length };
  }

  function build(raw, map, high) {
    const get = (r, k) => map[k] == null ? '' : r[map[k]];
    const byKey = new Map();
    raw.body.forEach((r, i) => {
      const first = String(get(r, 'first')).trim(), last = String(get(r, 'last')).trim();
      const name = String(get(r, 'name')).trim() || [first, last].filter(Boolean).join(' ');
      const id = String(get(r, 'id')).trim();
      const key = id || name.toLowerCase() || 'row-' + i;
      const y = yearOf(get(r, 'year'), i);
      const p = { label: y.label, sort: y.sort };
      DOMAINS.forEach(d => { p[d] = level(get(r, d)); });
      const scale = {}; DOMAINS.forEach(d => { const v = num(get(r, d + 'Scale')); if (v) scale[d] = v; });
      if (Object.keys(scale).length) p.scale = scale;
      const ov = level(get(r, 'overall')); if (ov) p.overall = ov;
      if (!byKey.has(key)) byKey.set(key, { key, name: name || (id ? 'ID ' + id : 'Student ' + (byKey.size + 1)), grade: '', group: '', years: '', test: '', periods: [] });
      const s = byKey.get(key);
      const g = gradeOf(get(r, 'grade')); if (g) s.grade = g;
      const grp = String(get(r, 'group')).trim(); if (grp) s.group = grp.slice(0, 40);
      const yrs = num(get(r, 'years')); if (yrs != null) s.years = Math.min(15, Math.round(yrs));
      else if (map.entered != null && s.years === '') { const yy = yearsSince(get(r, 'entered')); if (yy != null) s.years = yy; }
      const t = String(get(r, 'test')).trim(); if (t) s.test = t.slice(0, 30);
      if (DOMAINS.some(d => p[d] != null)) s.periods.push(p);
    });
    const students = [...byKey.values()].filter(s => s.periods.length).map(s => {
      s.periods.sort((a, b) => a.sort - b.sort);
      s.periods.forEach((p, i) => { if (!p.label) p.label = 'Year ' + (i + 1); });
      return s;
    });
    return { fileName: raw.fileName, loadedAt: Date.now(), high, students, skipped: byKey.size - students.length };
  }

  function analyzeStudent(s, high) {
    return E.analyze({ highLevel: high, years: s.years, grade: band(s.grade), periods: s.periods, academic: { status: 'unknown', trend: 'unknown' }, priorResponse: 'none' });
  }
  // Inputs for the analysis screen and for saved plans: only the allowed fields.
  function planInputs(s, high) {
    return {
      grade: band(s.grade), years: s.years === '' ? '' : s.years, highLevel: high,
      periods: s.periods.map(p => {
        const o = { label: cleanLabel(p.label) || 'Year' };
        DOMAINS.forEach(d => { o[d] = p[d]; });
        if (p.scale) { o.scale = {}; DOMAINS.forEach(d => { if (p.scale[d]) o.scale[d] = p.scale[d]; }); }
        if (p.overall) o.overall = p.overall;
        return o;
      }),
      academic: { status: 'unknown', trend: 'unknown' }, priorResponse: 'none'
    };
  }

  /* ---------- sample file (fictional names) ---------- */
  const SAMPLE_NAMES = ['Ana Ríos', 'Luis Mena', 'Sofía Paz', 'Kevin Ortiz', 'Amira Haddad', 'Jean Pierre', 'Mei Lin', 'Diego Cruz', 'Fatima Noor', 'Mateo Silva', 'Rosa Vega', 'Omar Said', 'Carla Duarte', 'Yusuf Ali', 'Daniela Soto', 'Marco Reyes'];
  const SAMPLE_PATTERNS = [
    [[2, 1, 1, 1], [3, 2, 2, 1], [3, 3, 2, 2]], [[3, 3, 2, 2], [4, 3, 2, 2], [4, 4, 2, 2]], [[2, 2, 2, 2], [3, 3, 3, 3], [4, 4, 4, 4]],
    [[1, 1, 1, 1], [2, 1, 2, 1], [2, 2, 2, 2]], [[2, 2, 3, 3], [2, 2, 3, 4], [2, 3, 4, 4]], [[3, 4, 2, 2], [4, 4, 2, 2], [4, 4, 2, 3]],
    [[1, 1, 2, 2], [2, 2, 3, 3], [2, 2, 4, 3]], [[3, 3, 3, 2], [4, 4, 4, 3], [4, 5, 5, 4]], [[2, 2, 1, 1], [3, 3, 2, 1], [3, 3, 2, 2]],
    [[3, 3, 2, 2], [3, 3, 2, 2], [3, 3, 2, 2]], [[1, 1, 1, 1], [1, 2, 1, 1], [2, 2, 1, 2]], [[4, 3, 3, 3], [4, 4, 4, 4], [5, 5, 5, 5]],
    [[2, 3, 2, 1], [3, 3, 2, 2], [4, 3, 2, 2]], [[2, 2, 3, 2], [2, 2, 3, 3], [3, 2, 4, 3]], [[3, 2, 2, 2], [3, 3, 3, 3], [4, 4, 4, 3]],
    [[2, 2, 2, 1], [3, 3, 3, 2], [3, 3, 4, 3]]
  ];
  function sampleRaw() {
    const headers = ['Student Name', 'Student ID', 'School Year', 'Test', 'Grade', 'Group', 'Years in ELD', 'Listening PL', 'Speaking PL', 'Reading PL', 'Writing PL', 'Listening Scale Score', 'Speaking Scale Score', 'Reading Scale Score', 'Writing Scale Score'];
    const body = [];
    SAMPLE_NAMES.forEach((n, i) => {
      const pat = SAMPLE_PATTERNS[i], grade = 6 + (i % 3);
      pat.forEach((lv, y) => {
        const ss = lv.map((l, k) => 380 + l * 45 + ((i * 7 + y * 11 + k * 5) % 30));
        body.push([n, 'S' + (1001 + i), (2023 + y) + '-' + String(24 + y).slice(-2), 'LAS Links', grade - 2 + y, 'Period ' + (1 + (i % 3)), 3 + y + (i % 3), ...lv, ...ss]);
      });
    });
    return { fileName: 'DIALD sample class (fictional).xlsx', headers, body };
  }
  function templateCSV() {
    const h = ['Student Name', 'Student ID', 'School Year', 'Test', 'Grade', 'Group', 'Years in ELD', 'Listening PL', 'Speaking PL', 'Reading PL', 'Writing PL', 'Listening Scale Score', 'Speaking Scale Score', 'Reading Scale Score', 'Writing Scale Score'];
    const ex = ['Example Student', 'A123', '2025-26', 'LAS Links', '7', 'Period 2', '4', '3', '3', '2', '2', '520', '515', '470', '465'];
    const blob = new Blob(['﻿' + h.join(',') + '\n' + ex.join(',') + '\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'DIALD-template.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function keySheetCSV() {
    const m = planNames(); const rows = Object.entries(m);
    if (!rows.length) return false;
    const csv = '﻿Plan code,Student (kept on your computer)\n' + rows.map(([id, n]) => id.slice(0, 8).toUpperCase() + ',"' + String(n).replace(/"/g, '""') + '"').join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'DIALD-key-sheet.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    return true;
  }

  /* ---------- charts ---------- */
  function quadrantChart(list, high, esc, showPrev) {
    const W = 560, H = 440, x0 = 64, x1 = 540, y0 = 24, y1 = 384;
    const all = list.flatMap(x => x.s.periods);
    const maxL = Math.max(5, ...all.map(p => Math.ceil(Math.max(p.listening || 0, p.speaking || 0, p.reading || 0, p.writing || 0))));
    const allInt = all.every(p => DOMAINS.every(d => p[d] == null || Number.isInteger(p[d])));
    const lo = 0.5, hi = maxL + 0.5;
    const X = v => x0 + (v - lo) / (hi - lo) * (x1 - x0), Y = v => y1 - (v - lo) / (hi - lo) * (y1 - y0);
    const pos = p => ({ x: Math.min(p.reading, p.writing), y: Math.min(p.listening, p.speaking) });
    const cut = allInt ? high - 0.5 : high;
    // Spread students who share the same spot so every dot can be seen.
    const seen = new Map();
    const pts = list.map(it => {
      const last = it.s.periods[it.s.periods.length - 1], prev = it.s.periods[it.s.periods.length - 2];
      const c = pos(last); const k = c.x.toFixed(1) + ',' + c.y.toFixed(1); const n = seen.get(k) || 0; seen.set(k, n + 1);
      const r = n ? 0.13 * Math.sqrt(n) : 0, a = n * 2.39996;
      return { it, cx: X(c.x + r * Math.cos(a)), cy: Y(c.y + r * Math.sin(a)), prev: prev && DOMAINS.every(d => prev[d] != null) ? pos(prev) : null };
    });
    const qx = X(cut), qy = Y(cut);
    const bg = [['Q1', x0, y0, qx, qy, 'Q1 · Oral dominant', 'start', x0 + 10, y0 + 18], ['Q2', qx, y0, x1, qy, 'Q2 · Balanced', 'end', x1 - 10, y0 + 18],
      ['Q3', x0, qy, qx, y1, 'Q3 · Lower in both', 'start', x0 + 10, y1 - 10], ['Q4', qx, qy, x1, y1, 'Q4 · Literacy dominant', 'end', x1 - 10, y1 - 10]];
    const ticks = []; for (let v = 1; v <= maxL; v++) ticks.push(v);
    return `<svg class="qchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Students by oral language and literacy level">
      <defs><marker id="qarrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8aa0b4"/></marker></defs>
      ${bg.map(([q, ax, ay, bx, by, t, anchor, tx, ty]) => `<rect x="${ax}" y="${ay}" width="${bx - ax}" height="${by - ay}" fill="${QCOLOR[q]}" opacity=".09"/><text class="qlab" x="${tx}" y="${ty}" text-anchor="${anchor}" fill="${QCOLOR[q] === '#E3A93B' ? '#9a6a10' : QCOLOR[q]}">${t}</text>`).join('')}
      ${ticks.map(v => `<line x1="${X(v)}" y1="${y1}" x2="${X(v)}" y2="${y1 + 5}" stroke="#9fb0c0"/><text class="tick" x="${X(v)}" y="${y1 + 18}" text-anchor="middle">${v}</text><line x1="${x0 - 5}" y1="${Y(v)}" x2="${x0}" y2="${Y(v)}" stroke="#9fb0c0"/><text class="tick" x="${x0 - 9}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join('')}
      <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="#c9d5e0"/>
      <line x1="${qx}" y1="${y0}" x2="${qx}" y2="${y1}" stroke="#1B3A5C" stroke-width="1.5" stroke-dasharray="5 4"/>
      <line x1="${x0}" y1="${qy}" x2="${x1}" y2="${qy}" stroke="#1B3A5C" stroke-width="1.5" stroke-dasharray="5 4"/>
      <text class="axl" x="${(x0 + x1) / 2}" y="${H - 8}" text-anchor="middle">LITERACY (lower of Reading, Writing) →</text>
      <text class="axl" transform="translate(16 ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle">ORAL LANGUAGE (lower of Listening, Speaking) →</text>
      ${showPrev ? pts.filter(p => p.prev).map(p => { const px = X(p.prev.x), py = Y(p.prev.y); return Math.hypot(px - p.cx, py - p.cy) < 6 ? '' : `<line x1="${px}" y1="${py}" x2="${p.cx}" y2="${p.cy}" stroke="#8aa0b4" stroke-width="1.4" marker-end="url(#qarrow)" opacity=".85"/><circle cx="${px}" cy="${py}" r="3" fill="#fff" stroke="#8aa0b4"/>`; }).join('') : ''}
      ${pts.map(p => `<g class="qdot" data-key="${esc(p.it.s.key)}" tabindex="0" role="button" aria-label="${esc(p.it.s.name)}: ${p.it.r.quadrant ? p.it.r.quadrant.id : ''}, ${p.it.r.risk.level} risk">
        <circle cx="${p.cx}" cy="${p.cy}" r="7.5" fill="${QCOLOR[p.it.r.quadrant.id]}" stroke="#fff" stroke-width="2"/>
        ${p.it.r.risk.level === 'High' ? `<circle cx="${p.cx}" cy="${p.cy}" r="11" fill="none" stroke="#a83c32" stroke-width="2"/>` : ''}
        <title>${esc(p.it.s.name)} · L${p.it.last.listening} S${p.it.last.speaking} R${p.it.last.reading} W${p.it.last.writing} · ${p.it.r.risk.level} risk</title></g>`).join('')}
    </svg>`;
  }
  function barChart(rows, max) {
    return `<div class="hbars">${rows.map(r => `<button class="hbar" data-filter="${r.filter || ''}" type="button"><span class="hb-l">${r.label}</span>
      <span class="hb-t"><span class="hb-f" style="width:${max ? Math.max(2, r.value / max * 100) : 0}%;background:${r.color}"></span></span><b>${r.text}</b></button>`).join('')}</div>`;
  }

  /* ---------- views ---------- */
  let ui = { view: 'quad', prev: true, q: '', risk: '', group: '', grade: '', search: '', pending: null };

  function render(main, ctx) {
    const { esc } = ctx;
    if (ui.pending) return mappingView(main, ctx);
    if (!data || !data.students.length) return emptyView(main, ctx);
    const high = data.high || 3;
    const items = data.students.map(s => { const r = analyzeStudent(s, high); return { s, r, last: s.periods[s.periods.length - 1] }; }).filter(x => x.r.quadrant);
    const groups = [...new Set(items.map(x => x.s.group).filter(Boolean))].sort();
    const grades = [...new Set(items.map(x => x.s.grade).filter(Boolean))].sort((a, b) => (a === 'K' ? 0 : +a) - (b === 'K' ? 0 : +b));
    const f = items.filter(x => (!ui.q || x.r.quadrant.id === ui.q) && (!ui.risk || x.r.risk.level === ui.risk) && (!ui.group || x.s.group === ui.group) && (!ui.grade || x.s.grade === ui.grade) && (!ui.search || x.s.name.toLowerCase().includes(ui.search.toLowerCase())))
      .sort((a, b) => RISK_ORDER[a.r.risk.level] - RISK_ORDER[b.r.risk.level] || a.s.name.localeCompare(b.s.name));
    const cnt = (fn) => f.filter(fn).length;
    const persistent = cnt(x => x.r.dims.persistence.status === 'concern');
    const atRisk = cnt(x => x.r.risk.level === 'High' || x.r.risk.level === 'Moderate');
    const first = ctx.profile && ctx.profile.full_name ? ctx.profile.full_name.split(' ')[0] : '';
    const qCounts = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({ q, n: cnt(x => x.r.quadrant.id === q) }));
    const riskRows = ['High', 'Moderate', 'Low', 'Inconclusive'].map(k => ({ label: k, value: cnt(x => x.r.risk.level === k), color: { High: '#a83c32', Moderate: '#E3A93B', Low: '#2A9488', Inconclusive: '#9fb0c0' }[k], filter: 'risk:' + k }));
    riskRows.forEach(r => { r.text = r.value; });
    const domRows = DOMAINS.map(d => { const ok = cnt(x => x.last[d] != null && x.last[d] >= high); const n = cnt(x => x.last[d] != null); return { label: DNAME[d], value: n ? ok / n * 100 : 0, color: d === 'listening' || d === 'speaking' ? '#2A9488' : '#1B3A5C', text: n ? Math.round(ok / n * 100) + '% <small>(' + ok + ' of ' + n + ')</small>' : '—' }; });
    const opt = (arr, cur, all) => `<option value="">${all}</option>` + arr.map(v => `<option ${v === cur ? 'selected' : ''} value="${esc(v)}">${esc(v)}</option>`).join('');
    main.innerHTML = `<div class="dash">
      <div class="dash-head"><div class="dash-in">
        <div><div class="eyebrow">${first ? 'Welcome back, ' + esc(first) : 'Your dashboard'}</div><h1>My students</h1>
          <p class="small"><span class="local-chip">🔒 On this computer only</span> ${esc(data.fileName)} · ${data.students.length} students${data.skipped ? ' · ' + data.skipped + ' rows skipped (no levels)' : ''}</p></div>
        <div class="row"><button class="btn" id="r-new" type="button">Load another file</button><button class="btn ghost danger" id="r-clear" type="button">Clear file</button></div>
      </div></div>
      <div class="dash-in">
        <div class="tiles">
          <div class="tile"><span>Students</span><b>${f.length}</b><small>${f.length === items.length ? 'in this file' : 'with the filters below'}</small></div>
          <div class="tile t-q1"><span>Oral dominant (Q1)</span><b>${qCounts[0].n}</b><small>speaking ahead of literacy</small></div>
          <div class="tile t-warn"><span>Moderate or high risk</span><b>${atRisk}</b><small>provisional LTEL trajectory</small></div>
          <div class="tile t-navy"><span>Same pattern 2+ years</span><b>${persistent}</b><small>oral or literacy stays ahead</small></div>
        </div>
        <div class="dash-grid">
          <div class="card chart-card">
            <div class="row" style="justify-content:space-between">
              <div class="seg-ctl" role="tablist">
                <button role="tab" data-view="quad" class="${ui.view === 'quad' ? 'on' : ''}">Quadrants</button>
                <button role="tab" data-view="risk" class="${ui.view === 'risk' ? 'on' : ''}">Risk</button>
                <button role="tab" data-view="dom" class="${ui.view === 'dom' ? 'on' : ''}">Domains</button>
              </div>
              ${ui.view === 'quad' ? `<label class="row small" style="gap:6px;font-weight:600;margin:0"><input type="checkbox" id="r-prev" style="width:auto" ${ui.prev ? 'checked' : ''}> Show last year’s position</label>` : ''}
            </div>
            ${ui.view === 'quad' ? quadrantChart(f, high, esc, ui.prev) + `<p class="small">Each dot is one student, placed at the lower level of each pair, the same rule DIALD uses for High and Low (High = level ${high}+). Arrows start at last year’s position. A red ring means high risk. Click a dot to open the student.</p>`
              : ui.view === 'risk' ? `<h3>Provisional LTEL trajectory risk</h3>${barChart(riskRows, Math.max(1, ...riskRows.map(r => r.value)))}<p class="small">Risk is theoretical, not statistical. Click a bar to filter the list.</p>`
              : `<h3>Students at or above level ${high}, by domain</h3>${barChart(domRows, 100)}<p class="small">Latest year. Teal = oral language, navy = literacy. DIALD does not average levels.</p>`}
          </div>
          <div class="card">
            <h3>By profile</h3>
            <div class="qlist">${qCounts.map(({ q, n }) => `<button type="button" class="qrow ${ui.q === q ? 'on' : ''}" data-q="${q}"><i style="background:${QCOLOR[q]}"></i><span>${q} · ${esc(E.QUADRANTS[q].name)}</span><b>${n}</b></button>`).join('')}</div>
            <p class="small">Click a profile to filter. ${ui.q ? '<a href="#" id="r-allq">Show all</a>' : ''}</p>
            <div class="privacy-note" style="margin-top:12px"><span>🔒</span><div><b>Names stay here.</b> Your file is read on this computer. DIALD saves only levels and results when you save a plan.</div></div>
          </div>
        </div>
        <div class="card">
          <div class="filters">
            <div><label for="r-search">Search</label><input id="r-search" placeholder="Student name" value="${esc(ui.search)}"></div>
            ${groups.length ? `<div><label for="r-group">Group</label><select id="r-group">${opt(groups, ui.group, 'All groups')}</select></div>` : ''}
            ${grades.length ? `<div><label for="r-grade">Grade</label><select id="r-grade">${opt(grades, ui.grade, 'All grades')}</select></div>` : ''}
            <div><label for="r-q">Profile</label><select id="r-q">${opt(['Q1', 'Q2', 'Q3', 'Q4'], ui.q, 'All profiles')}</select></div>
            <div><label for="r-risk">Risk</label><select id="r-risk">${opt(['High', 'Moderate', 'Low', 'Inconclusive'], ui.risk, 'All')}</select></div>
          </div>
          <div class="tbl-wrap"><table class="tbl roster">
            <thead><tr><th>Student</th><th>Grade</th>${groups.length ? '<th>Group</th>' : ''}<th>Latest</th>${DOMAINS.map(d => `<th title="${DNAME[d]}">${D1[d]}</th>`).join('')}<th>Profile</th><th>Pattern</th><th>Risk</th><th></th></tr></thead>
            <tbody>${f.map(x => `<tr data-key="${esc(x.s.key)}">
              <td><b>${esc(x.s.name)}</b></td><td>${esc(x.s.grade || '—')}</td>${groups.length ? `<td>${esc(x.s.group || '—')}</td>` : ''}<td class="small">${esc(x.last.label)}</td>
              ${DOMAINS.map(d => `<td class="lv ${x.last[d] != null && x.last[d] >= high ? 'hi' : 'lo'}">${x.last[d] == null ? '—' : x.last[d]}</td>`).join('')}
              <td><span class="qchip" style="--c:${QCOLOR[x.r.quadrant.id]}">${x.r.quadrant.id}</span></td>
              <td class="small">${x.r.dims.persistence.run >= 2 && (x.r.dims.persistence.direction === 'oral' || x.r.dims.persistence.direction === 'literacy') ? (x.r.dims.persistence.direction === 'oral' ? 'Oral ahead ' : 'Literacy ahead ') + x.r.dims.persistence.run + ' yrs' : '—'}</td>
              <td><span class="badge ${x.r.risk.level}" style="font-size:12px;padding:3px 8px">${x.r.risk.level}</span></td>
              <td><button class="btn ghost" data-open="${esc(x.s.key)}" type="button">Open →</button></td></tr>`).join('') || `<tr><td colspan="12" class="small">No students match these filters.</td></tr>`}</tbody></table></div>
        </div>
      </div></div>`;
    const $ = s => main.querySelector(s), $$ = s => [...main.querySelectorAll(s)];
    const rerender = () => render(main, ctx);
    $$('[data-view]').forEach(b => b.onclick = () => { ui.view = b.dataset.view; rerender(); });
    const pv = $('#r-prev'); if (pv) pv.onchange = () => { ui.prev = pv.checked; rerender(); };
    $$('[data-q]').forEach(b => b.onclick = () => { ui.q = ui.q === b.dataset.q ? '' : b.dataset.q; rerender(); });
    const allq = $('#r-allq'); if (allq) allq.onclick = e => { e.preventDefault(); ui.q = ''; rerender(); };
    $$('.hbar[data-filter]').forEach(b => b.onclick = () => { const [k, v] = b.dataset.filter.split(':'); if (k === 'risk') { ui.risk = ui.risk === v ? '' : v; rerender(); } });
    [['#r-group', 'group'], ['#r-grade', 'grade'], ['#r-q', 'q'], ['#r-risk', 'risk']].forEach(([id, k]) => { const el = $(id); if (el) el.onchange = () => { ui[k] = el.value; rerender(); }; });
    const sr = $('#r-search'); let t; sr.oninput = () => { clearTimeout(t); t = setTimeout(() => { ui.search = sr.value; rerender(); const n = main.querySelector('#r-search'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
    const open = key => { const s = data.students.find(x => x.key === key); if (s) ctx.openStudent({ name: s.name, key: s.key, inputs: planInputs(s, high) }); };
    $$('[data-open]').forEach(b => b.onclick = () => open(b.dataset.open));
    $$('tr[data-key]').forEach(tr => tr.ondblclick = () => open(tr.dataset.key));
    $$('.qdot').forEach(g => { g.onclick = () => open(g.dataset.key); g.onkeydown = e => { if (e.key === 'Enter') open(g.dataset.key); }; });
    $('#r-new').onclick = () => { ui.pending = null; data = null; persist(); rerender(); };
    $('#r-clear').onclick = () => { data = null; persist(); ctx.toast('File cleared from this browser.'); rerender(); };
  }

  function emptyView(main, ctx) {
    const { esc } = ctx;
    const first = ctx.profile && ctx.profile.full_name ? ctx.profile.full_name.split(' ')[0] : '';
    main.innerHTML = `<div class="dash">
      <div class="dash-head"><div class="dash-in"><div><div class="eyebrow">Your dashboard</div><h1>${first ? 'Welcome, ' + esc(first) + '.' : 'Welcome.'}</h1>
        <p class="small">Analyze a whole class from your language test export, or one learner at a time.</p></div></div></div>
      <div class="dash-in">
        <div class="dash-grid">
          <div class="card drop" id="drop" tabindex="0" role="button" aria-label="Choose a file to analyze">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2A9488" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 17v-6M9.5 13.5 12 11l2.5 2.5"/></svg>
            <h2>Analyze my file</h2>
            <p>Drag your Excel or CSV export here, or <b>choose a file</b>. One row per student per year, with the four domain levels.</p>
            <input type="file" id="file" accept=".xlsx,.xls,.csv" hidden>
            <p id="drop-msg" class="err" role="alert"></p>
            <div class="row" style="justify-content:center"><button class="btn" id="sample" type="button">Try a sample class</button><button class="btn ghost" id="tpl" type="button">Download a template</button></div>
          </div>
          <div class="card">
            <h3>🔒 Your file stays on this computer</h3>
            <ul class="checks">
              <li>DIALD reads the file <b>inside your browser</b>. It is not uploaded.</li>
              <li>You see your students’ names. <b>DIALD never receives them.</b></li>
              <li>If you save a plan, only levels, results, and chosen pathways are saved.</li>
              <li>Next time, load the same file again (or a newer export).</li>
            </ul>
            <p class="small">Columns are found by their names, in any order. Scale scores are optional; they show growth inside a level.</p>
          </div>
        </div>
        <h2 class="dash-h2">Or start here</h2>
        <div class="actions three">
          <a class="action" href="#/analyze?new=1"><b>Learner Trajectory</b><span>Analyze one learner by hand and get matching pathways.</span><i aria-hidden="true">→</i></a>
          <a class="action gold" href="#/library"><b>Browse the library</b><span>Pathways and activities for levels 1–4.</span><i aria-hidden="true">→</i></a>
          <a class="action navy" href="#/plans"><b>My plans</b><span id="plan-count">Reopen saved plans and record progress.</span><i aria-hidden="true">→</i></a>
        </div>
      </div></div>`;
    const drop = main.querySelector('#drop'), input = main.querySelector('#file'), msg = main.querySelector('#drop-msg');
    const take = async file => {
      msg.textContent = ''; msg.className = 'small'; msg.textContent = 'Reading ' + file.name + '…';
      try { const raw = await readFile(file); msg.textContent = ''; startMapping(raw, main, ctx); }
      catch (e) { msg.className = 'err'; msg.textContent = e.message || 'Could not read this file.'; }
    };
    drop.onclick = e => { if (e.target.closest('button')) return; input.click(); };
    drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
    input.onchange = () => input.files[0] && take(input.files[0]);
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) take(f); });
    main.querySelector('#sample').onclick = () => startMapping(sampleRaw(), main, ctx);
    main.querySelector('#tpl').onclick = templateCSV;
    if (ctx.afterEmpty) ctx.afterEmpty();
  }

  function startMapping(raw, main, ctx) {
    const saved = (ls.get(localStorage, MAPKEY) || {})[signature(raw.headers)];
    ui.pending = { raw, map: saved || detect(raw.headers), remembered: !!saved };
    mappingView(main, ctx);
  }

  function mappingView(main, ctx) {
    const { esc } = ctx; const { raw, map } = ui.pending;
    const ex = i => { const r = raw.body.find(r => String(r[i]).trim() !== ''); return r ? String(r[i]).slice(0, 28) : ''; };
    const missing = DOMAINS.filter(d => map[d] == null);
    const noId = map.name == null && map.first == null && map.last == null && map.id == null;
    const show = FIELDS.filter(f => f.k !== 'name' || map.first == null);
    main.innerHTML = `<div class="dash"><div class="dash-head"><div class="dash-in"><div><div class="eyebrow">Analyze my file · step 2 of 2</div><h1>Check the columns</h1>
      <p class="small"><span class="local-chip">🔒 On this computer only</span> ${esc(raw.fileName)} · ${raw.body.length} rows</p></div></div></div>
      <div class="dash-in"><div class="card">
        ${raw.widened ? `<p class="small"><b>Note:</b> your file has ${raw.widened} years in separate columns. DIALD turned them into one row per year.</p>` : ''}
        <p>${ui.pending.remembered ? 'DIALD remembered how this kind of file is organized.' : 'DIALD matched these columns by their names.'} Fix anything that is wrong, then choose <b>Analyze</b>. Fields marked 🔒 are used only on this computer.</p>
        <div class="tbl-wrap"><table class="tbl map-tbl"><thead><tr><th>DIALD needs</th><th>Column in your file</th><th>Example</th></tr></thead><tbody>
        ${show.map(f => `<tr class="${f.required && map[f.k] == null ? 'need' : ''}"><td>${f.local ? '🔒 ' : ''}${esc(f.label)}${f.required ? ' <span class="req">required</span>' : ''}</td>
          <td><select data-field="${f.k}"><option value="">— not in my file —</option>${raw.headers.map((h, i) => `<option value="${i}" ${map[f.k] === i ? 'selected' : ''}>${esc(h || 'Column ' + (i + 1))}</option>`).join('')}</select></td>
          <td class="small">${map[f.k] == null ? '' : esc(ex(map[f.k]))}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="fields" style="max-width:520px;margin-top:14px">
          <div><label for="m-high">High = level</label><select id="m-high">${[2, 3, 4].map(v => `<option value="${v}" ${v === ((data && data.high) || 3) ? 'selected' : ''}>${v} or above</option>`).join('')}</select></div>
        </div>
        <label class="row" style="font-weight:600;gap:8px;margin-top:12px"><input type="checkbox" id="m-keep" style="width:auto"> Keep this file on this computer until I clear it (otherwise it is forgotten when this tab closes)</label>
        <p id="m-msg" class="err" role="alert">${missing.length ? 'Choose the column for: ' + missing.map(d => DNAME[d] + ' level').join(', ') + '.' : noId ? 'Choose a column that tells students apart (name or ID).' : ''}</p>
        <div class="row"><button class="btn primary" id="m-go" type="button">Analyze →</button><button class="btn ghost" id="m-back" type="button">Choose another file</button></div>
      </div></div></div>`;
    const $ = s => main.querySelector(s);
    main.querySelectorAll('[data-field]').forEach(sel => sel.onchange = () => {
      const k = sel.dataset.field, v = sel.value === '' ? null : Number(sel.value);
      Object.keys(map).forEach(o => { if (o !== k && map[o] === v && v != null) delete map[o]; });
      if (v == null) delete map[k]; else map[k] = v;
      mappingView(main, ctx);
    });
    $('#m-back').onclick = () => { ui.pending = null; render(main, ctx); };
    $('#m-go').onclick = () => {
      if (DOMAINS.some(d => map[d] == null) || noId) { $('#m-msg').textContent = 'Choose the required columns first.'; return; }
      const maps = ls.get(localStorage, MAPKEY) || {}; maps[signature(raw.headers)] = map; ls.set(localStorage, MAPKEY, maps);
      const built = build(raw, map, Number($('#m-high').value));
      if (!built.students.length) { $('#m-msg').textContent = 'No rows with levels were found. Check the level columns.'; return; }
      built.keep = $('#m-keep').checked;
      data = built; ui = { view: 'quad', prev: true, q: '', risk: '', group: '', grade: '', search: '', pending: null };
      persist(); render(main, ctx); window.scrollTo(0, 0);
    };
  }

  window.DIALDRoster = {
    render, planNames, rememberPlanName, forgetPlanName, keySheetCSV, cleanLabel,
    hasData: () => !!(data && data.students.length),
    // exported for tests
    _detect: detect, _widen: widen, _level: level, _build: build, _sampleRaw: sampleRaw, _planInputs: planInputs
  };
})();
