/* DIALD group plans — a 12-week route for a group of students from the same profile (quadrant).
   The server stores only random student codes, the quadrant, and rubric scores (0–2).
   Names come from the key sheet kept on this computer (diald-roster.js). */
(function () {
  'use strict';
  const E = window.DIALDEngine, L = window.DIALDLibrary || {};
  const R = () => window.DIALDRoster;
  const QC = { Q1: '#2A9488', Q2: '#1B3A5C', Q3: '#E3A93B', Q4: '#5FB3A8' };
  const CHECKS = ['1', '6', '12'];
  const CRIT = ['Main idea', 'Key details', 'Own words', 'Connectors'];
  const SIGNAME = { Horizon: 'Near LTEL horizon', Persistent: 'Persistent signal', Emerging: 'Emerging signal', None: 'No signal', NA: 'Not enough data' };
  const SETUP = 'Group plans need a one-time database update. Run supabase-group-plans.sql in Supabase (SQL Editor → New query → Run).';
  const bandName = b => (L.BANDS && L.BANDS[b] ? L.BANDS[b].name : 'Grades ' + b);
  const stageName = n => { const s = (L.STAGES || []).find(x => x.n === Number(n)); return s ? s.name : 'Stage ' + n; };
  const unitOf = g => L.units && L.units[g.band] && L.units[g.band][g.quadrant] && L.units[g.band][g.quadrant][g.stage];
  const total = sc => Array.isArray(sc) && sc.every(v => v != null) ? sc.reduce((a, b) => a + b, 0) : null;
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const isSetupError = e => e && /group_plans|relation|schema cache|does not exist/i.test(e.message || '');

  function weekOf(g) {
    const d0 = new Date(g.start_date + 'T00:00:00'), days = Math.floor((Date.now() - d0) / 864e5);
    if (days < 0) return { w: 0, text: 'Starts ' + d0.toLocaleDateString() };
    const w = Math.floor(days / 7) + 1;
    return w > 12 ? { w: 13, text: 'Finished' } : { w, text: 'Week ' + w + ' of 12' };
  }
  function nextCheck(g) {
    const ms = g.members || [];
    for (const c of CHECKS) {
      const missing = ms.filter(m => total(m.s && m.s[c]) == null).length;
      if (missing) {
        const w = weekOf(g).w, n = Number(c);
        return { c, missing, due: w >= n, text: w >= n ? `Week ${c} scores due (${missing} missing)` : `Week ${c} check in ${n - w} week${n - w > 1 ? 's' : ''}` };
      }
    }
    return ms.length ? { c: null, text: 'All checks entered' } : { c: null, text: '—' };
  }
  // Provisional rule, same 8-point rubric at weeks 1, 6, and 12.
  function response(m) {
    const s = m.s || {}, b = total(s['1']), t12 = total(s['12']), later = t12 != null ? t12 : total(s['6']);
    if (b == null || later == null) return { level: 'Not yet', gain: null };
    const gain = later - b;
    return { level: gain >= 3 || later >= 7 ? 'Positive' : gain >= 1 ? 'Partial' : 'Limited', gain, from: b, to: later, at: t12 != null ? '12' : '6' };
  }
  function summary(g) {
    const c = { Positive: 0, Partial: 0, Limited: 0, 'Not yet': 0 };
    (g.members || []).forEach(m => c[response(m).level]++);
    return c;
  }
  // Students whose latest result (the class file loaded now) is in another quadrant.
  function moved(g) {
    const r = R(); if (!r || !r.hasData()) return [];
    return (g.members || []).map(m => ({ m, now: r.quadrantOf(m.c) })).filter(x => x.now && x.now.q !== g.quadrant && x.now.q !== x.m.a);
  }
  const who = (code, esc) => { const n = R() ? R().nameFor(code) : ''; return n ? `<b>${esc(n)}</b> <small class="code">${esc(code)}</small>` : `<b class="code">${esc(code)}</b>`; };

  async function list(sb) { return sb.from('group_plans').select('*').order('created_at', { ascending: false }); }

  function cardHTML(g, esc) {
    const wk = weekOf(g), nx = nextCheck(g), sm = summary(g), mv = moved(g), u = unitOf(g);
    const scored = sm.Positive + sm.Partial + sm.Limited;
    return `<a class="gcard" href="#/group/${g.id}" style="--c:${QC[g.quadrant]}">
      <div class="gc-top"><b>${esc(g.title || g.quadrant + ' group')}</b>${g.subgroup ? `<span class="chip">${esc(g.subgroup)}</span>` : ''}</div>
      <div class="small">${esc(bandName(g.band))} · ${esc(stageName(g.stage))}${u ? ' · ' + esc(u.title) : ''}</div>
      <div class="gc-stats"><span><b>${wk.w >= 1 && wk.w <= 12 ? 'Week ' + wk.w : esc(wk.text)}</b>${wk.w >= 1 && wk.w <= 12 ? ' of 12' : ''}</span><span><b>${(g.members || []).length}</b> student${(g.members || []).length === 1 ? '' : 's'}</span></div>
      <div class="small gc-next ${nx.due ? 'due' : ''}">Next: ${esc(nx.text)}</div>
      ${scored ? `<div class="gc-resp small"><span class="badge Positive">${sm.Positive} positive</span> <span class="badge Partial">${sm.Partial} partial</span> <span class="badge Limited">${sm.Limited} limited</span></div>` : ''}
      ${mv.length ? `<div class="gc-alert">⚠ ${mv.length} student${mv.length > 1 ? 's' : ''} moved to ${[...new Set(mv.map(x => x.now.q))].join(', ')}</div>` : ''}
    </a>`;
  }

  /* ---------- start a group plan (from My class) ---------- */
  function startDialog(st, ctx) {
    const { esc, sb, toast } = ctx;
    if (!sb) { toast('Sign in to save a group plan.'); return; }
    let split = 'none', bandPick = 'auto', stage = 1, start = today();
    const keyOf = {
      none: () => 'All students',
      grade: m => m.grade ? 'Grade ' + m.grade : 'Grade not given',
      level: m => m.level != null ? 'English level ' + m.level : 'Level not given',
      sig: m => SIGNAME[m.sig] || 'No signal'
    };
    const order = { none: () => 0, grade: k => (k.match(/\d+/) ? +k.match(/\d+/)[0] : k === 'Grade K' ? 0 : 99), level: k => (k.match(/\d+/) ? +k.match(/\d+/)[0] : 99), sig: k => Object.values(SIGNAME).indexOf(k) };
    const subgroups = () => {
      const mp = new Map(); st.members.forEach(m => { const k = keyOf[split](m); if (!mp.has(k)) mp.set(k, []); mp.get(k).push(m); });
      return [...mp.entries()].sort((a, b) => order[split](a[0]) - order[split](b[0])).map(([label, ms]) => {
        const bs = ms.map(m => m.band).filter(Boolean); const top = bs.sort((p, n) => bs.filter(v => v === n).length - bs.filter(v => v === p).length)[0] || '6-8';
        return { label, ms, band: bandPick === 'auto' ? top : bandPick };
      });
    };
    const box = document.createElement('div'); box.className = 'gdlg-back';
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const draw = () => {
      const sgs = subgroups();
      const levelHow = st.members.find(m => m.levelHow) ? st.members.find(m => m.levelHow).levelHow : '';
      box.innerHTML = `<div class="gdlg" role="dialog" aria-modal="true" aria-labelledby="gd-h">
        <div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="eyebrow">New group plan</div><h2 id="gd-h" style="margin:2px 0"><span class="qchip" style="--c:${QC[st.q]}">${st.q}</span> ${esc(st.qName)}</h2>
          <p class="small" style="margin:0">${st.members.length} students${st.filtered ? ' (with the filters you chose in My class)' : ''}.</p></div><button type="button" class="fb-x" aria-label="Close">×</button></div>
        <fieldset class="gd-split"><legend>Make subgroups by</legend>
          ${[['none', 'No subgroups'], ['grade', 'Grade'], ['level', 'English level' + (levelHow ? ' (' + levelHow + ')' : '')], ['sig', 'Trajectory signal']].map(([v, t]) => `<label><input type="radio" name="gd-split" value="${v}" ${split === v ? 'checked' : ''}> ${esc(t)}</label>`).join('')}
        </fieldset>
        <div class="gd-list">${sgs.map((g, i) => `<label class="gd-sg"><input type="checkbox" data-i="${i}" checked>
          <span><b>${esc(st.q + ' · ' + g.label)}</b> · ${g.ms.length} student${g.ms.length > 1 ? 's' : ''} · ${esc(bandName(g.band))}
          <small>${g.ms.slice(0, 8).map(m => esc(m.name || m.code)).join(', ')}${g.ms.length > 8 ? ', …' : ''}</small></span></label>`).join('')}</div>
        <div class="fields gd-fields">
          <div><label for="gd-band">Lesson route (grade band)</label><select id="gd-band"><option value="auto">Automatic (most students’ grade)</option>${(L.GRADES || ['2-3', '4-5', '6-8', '9-12']).map(b => `<option value="${b}" ${bandPick === b ? 'selected' : ''}>${esc(bandName(b))}</option>`).join('')}</select></div>
          <div><label for="gd-stage">Stage</label><select id="gd-stage">${(L.STAGES || [{ n: 1, name: 'Stage 1' }]).map(s => `<option value="${s.n}" ${stage === s.n ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
          <div><label for="gd-start">Week 1 starts</label><input type="date" id="gd-start" value="${start}"></div>
        </div>
        <p class="small">🔒 DIALD saves only the student codes, the profile, and the rubric scores you enter. Names stay on this computer.</p>
        <p class="err" id="gd-msg" role="alert"></p>
        <div class="row"><button class="btn primary" id="gd-go" type="button">Create ${sgs.length} plan${sgs.length > 1 ? 's' : ''}</button><button class="btn ghost" id="gd-x" type="button">Cancel</button></div>
      </div>`;
      box.querySelectorAll('[name=gd-split]').forEach(r => r.onchange = () => { split = r.value; draw(); });
      box.querySelector('#gd-band').onchange = e => { bandPick = e.target.value; draw(); };
      box.querySelector('#gd-stage').onchange = e => { stage = Number(e.target.value); };
      box.querySelector('#gd-start').onchange = e => { start = e.target.value || today(); };
      const go = box.querySelector('#gd-go');
      const recount = () => { const n = box.querySelectorAll('.gd-sg input:checked').length; go.textContent = 'Create ' + n + ' plan' + (n === 1 ? '' : 's'); go.disabled = !n; };
      box.querySelectorAll('.gd-sg input').forEach(c => c.onchange = recount);
      box.querySelector('.fb-x').onclick = close; box.querySelector('#gd-x').onclick = close;
      go.onclick = async () => {
        const pick = [...box.querySelectorAll('.gd-sg input:checked')].map(c => sgs[Number(c.dataset.i)]);
        if (!pick.length) return;
        go.disabled = true; go.textContent = 'Saving…';
        const rows = pick.map(g => ({
          title: (st.q + ' · ' + (split === 'none' ? st.qName : g.label)).slice(0, 60), quadrant: st.q, band: g.band, stage, subgroup: split === 'none' ? '' : g.label.slice(0, 40),
          start_date: start, members: g.ms.map(m => ({ c: m.code, q: st.q })), ...(st.setId ? { set_id: st.setId, set_name: st.setName } : {})
        }));
        const CC = window.DIALDClassCycle;
        const { data, error } = CC ? await CC.insertPlans(sb, rows, toast) : await sb.from('group_plans').insert(rows).select('id');
        if (error) { box.querySelector('#gd-msg').textContent = isSetupError(error) ? SETUP : 'Could not save: ' + error.message; recount(); return; }
        close(); toast(rows.length > 1 ? rows.length + ' group plans created.' : 'Group plan created.');
        location.hash = rows.length === 1 ? '#/group/' + data[0].id : '#/plans';
      };
    };
    document.body.appendChild(box); draw();
    box.onclick = e => { if (e.target === box) close(); };
    const first = box.querySelector('input'); if (first) first.focus();
  }

  /* ---------- one group plan ---------- */
  async function page(main, id, ctx) {
    const { esc, sb, toast } = ctx;
    main.innerHTML = '<div class="page"><p>Loading group plan…</p></div>';
    const { data: g, error } = await sb.from('group_plans').select('*').eq('id', id).single();
    if (error || !g) {
      main.innerHTML = `<div class="page"><div class="card"><p>${isSetupError(error) ? esc(SETUP) : 'This group plan was not found.'}</p><a class="btn" href="#/plans">My plans</a></div></div>`; return;
    }
    g.members = g.members || [];
    let week = '1', dirty = false;
    { const nx = nextCheck(g); if (nx.c) week = nx.c; }
    const save = async (patch, msg) => {
      const { error: e } = await sb.from('group_plans').update(patch).eq('id', g.id);
      if (e) { toast('Could not save: ' + e.message); return false; }
      Object.assign(g, patch); if (msg) toast(msg); return true;
    };
    const draw = () => {
      const wk = weekOf(g), nx = nextCheck(g), sm = summary(g), mv = moved(g), u = unitOf(g);
      const r = R(), hasClass = r && r.hasData(), named = g.members.some(m => r && r.nameFor(m.c));
      const libHref = `#/library/lessons/${g.band}/${g.quadrant}/${g.stage}`;
      const curW = wk.w >= 1 && wk.w <= 12 ? wk.w : null;
      const needs = g.members.map(m => ({ m, r: response(m) })).filter(x => x.r.level === 'Limited' || x.r.level === 'Partial');
      const scoredN = sm.Positive + sm.Partial + sm.Limited;
      const lead = scoredN ? ['Positive', 'Partial', 'Limited'].sort((a, b) => sm[b] - sm[a])[0] : 'Not yet';
      main.innerHTML = `<div class="page group-page" style="--c:${QC[g.quadrant]}">
        <div class="row" style="gap:14px"><a class="back-link" href="#/plans">← My plans</a>${g.set_id ? `<a class="back-link" href="#/cycle/${encodeURIComponent(g.set_id)}?s=4">← ${esc(g.set_name || 'Class plan')}: the cycle</a>` : ''}</div>
        <div class="eyebrow" style="margin-top:8px">Group plan · <span class="qchip" style="--c:${QC[g.quadrant]}">${g.quadrant}</span> ${esc(E.QUADRANTS[g.quadrant].name)}</div>
        <div class="row" style="gap:10px;align-items:center"><h1 style="margin:4px 0" id="gp-title">${esc(g.title || g.quadrant + ' group')}</h1><button class="icon-btn" id="gp-ren" title="Rename" aria-label="Rename this plan"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg></button></div>
        <div class="gp-meta">
          <span><small>Route</small><b>${esc(bandName(g.band))} · ${esc(stageName(g.stage))}</b></span>
          <span><small>Now</small><b>${esc(wk.text)}</b></span>
          <span><small>Students</small><b>${g.members.length}</b></span>
          <span class="${nx.due ? 'due' : ''}"><small>Next check</small><b>${esc(nx.text)}</b></span>
          ${g.subgroup ? `<span><small>Subgroup</small><b>${esc(g.subgroup)}</b></span>` : ''}
        </div>
        ${!named && g.members.length ? `<div class="notice-ok small">Names are not on this computer, so you see codes. <label class="linkish">Load your key sheet<input type="file" id="gp-key" accept=".csv,.xlsx,.xls" hidden></label> to see names (it stays on this computer).</div>` : ''}
        ${mv.length ? `<div class="card gp-alerts"><h3 style="margin-top:0">⚠ Profile changed</h3><p class="small">A newer test in the class file on this computer puts ${mv.length > 1 ? 'these students' : 'this student'} in another profile. A student has one profile (the latest result). You decide what to do.</p>
          ${mv.map(x => `<div class="gp-alert-row"><span>${who(x.m.c, esc)} moved to <span class="qchip" style="--c:${QC[x.now.q]}">${x.now.q}</span> ${esc(E.QUADRANTS[x.now.q].name)}</span>
            <span class="row" style="gap:6px"><button class="btn small-btn" data-keep="${esc(x.m.c)}" data-q="${x.now.q}" type="button">Keep in this plan</button><button class="btn ghost small-btn danger" data-drop="${esc(x.m.c)}" type="button">Remove from this plan</button></span></div>`).join('')}
          <p class="small" style="margin-bottom:0">To start a ${[...new Set(mv.map(x => x.now.q))].join('/')} plan for them, go to <a href="#/class">My class</a> → “+ Plan”.</p></div>` : ''}
        <div class="card gp-scores">
              <div class="row" style="justify-content:space-between;align-items:center;gap:10px"><h3 style="margin:0">Rubric scores</h3>
                <div class="seg-ctl" role="tablist">${CHECKS.map(c => `<button role="tab" data-wk="${c}" class="${week === c ? 'on' : ''}">Week ${c}</button>`).join('')}</div></div>
              <p class="small">Same summary task and the same 8-point rubric at weeks 1, 6, and 12: each criterion 0, 1, or 2.</p>
              <div class="tbl-wrap"><table class="tbl gp-tbl"><thead><tr><th>Student</th>${hasClass ? '<th>Profile now</th>' : ''}${CRIT.map(c => `<th>${c}</th>`).join('')}<th>Total</th><th title="Week 1 → latest check">Growth</th><th>Response</th><th></th></tr></thead>
                <tbody>${g.members.map((m, i) => {
                  const sc = (m.s && m.s[week]) || [null, null, null, null], t = total(sc), rp = response(m), now = hasClass ? r.quadrantOf(m.c) : null;
                  return `<tr><td>${who(m.c, esc)}</td>${hasClass ? `<td>${now ? `<span class="qchip" style="--c:${QC[now.q]}">${now.q}</span>${now.q !== g.quadrant ? ' ⚠' : ''}` : '<span class="small">not in file</span>'}</td>` : ''}
                    ${sc.map((v, k) => `<td><select class="sc" data-i="${i}" data-k="${k}" aria-label="${CRIT[k]}"><option value="">–</option>${[0, 1, 2].map(n => `<option ${v === n ? 'selected' : ''}>${n}</option>`).join('')}</select></td>`).join('')}
                    <td class="tot">${t == null ? '–' : '<b>' + t + '</b>/8'}</td>
                    <td class="small">${CHECKS.map(c => { const x = total(m.s && m.s[c]); return x == null ? '–' : x; }).join(' → ')}</td>
                    <td><span class="badge ${rp.level}" style="font-size:12px;padding:3px 8px">${rp.level}</span></td>
                    <td><button class="icon-btn" data-rm="${i}" title="Remove from this plan" aria-label="Remove from this plan">×</button></td></tr>`;
                }).join('') || `<tr><td colspan="10" class="small">No students in this plan.</td></tr>`}</tbody></table></div>
              <div class="row" style="margin-top:10px;align-items:center"><button class="btn primary" id="gp-save" type="button" ${dirty ? '' : 'disabled'}>${dirty ? 'Save scores' : 'Saved ✓'}</button><span class="small">Only codes and scores are saved.</span></div>
            </div>
        <div class="split" style="margin-top:16px">
          <div class="stack">
            <div class="card">
              <h3 style="margin-top:0">Group summary</h3>
              ${scoredN ? `<div class="gp-sum">${['Positive', 'Partial', 'Limited', 'Not yet'].map(k => `<div class="gp-s ${k.replace(' ', '')}"><b>${sm[k]}</b><span>${k}</span></div>`).join('')}</div>
                <p class="small">Most students: <b>${lead}</b>. ${scoredN < g.members.length ? (g.members.length - scoredN) + ' still need a week 1 and a later score.' : ''}</p>
                ${needs.length ? `<h4>Needs adjustment</h4><ul class="gp-needs">${needs.map(x => `<li>${who(x.m.c, esc)} <span class="badge ${x.r.level}" style="font-size:11.5px;padding:2px 7px">${x.r.level}</span> <span class="small">${x.r.from} → ${x.r.to} (week ${x.r.at})</span></li>`).join('')}</ul>` : '<p class="small">No student needs an adjustment right now.</p>'}
                <h4>What to do next (${lead === 'Not yet' ? 'not yet' : lead.toLowerCase()})</h4><ul class="small">${(E.ADAPT[lead] || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>`
                : `<p class="small">Enter week 1 and week 6 (or week 12) scores to see who is responding: positive, partial, or limited.</p>`}
              <p class="small rule-note">Provisional rule: <b>Positive</b> = up 3+ points from week 1, or 7–8 of 8 · <b>Partial</b> = up 1–2 points · <b>Limited</b> = no gain. The profile itself changes only with the annual state test.</p>
            </div>
          </div>
          <div class="stack">
            <div class="card">
              <h3 style="margin-top:0">Lesson route</h3>
              <p><b>${esc(u ? u.title : stageName(g.stage))}</b><br><span class="small">${esc(bandName(g.band))} · ${g.quadrant} · ${esc(stageName(g.stage))} · 12 weeks, 3 sessions a week</span></p>
              <div class="stack" style="gap:8px">
                <a class="btn" href="${libHref}">Open the 12 weeks in the Library →</a>
                ${u && u.workbook ? `<a class="btn ghost" href="${esc(u.workbook)}" download>⬇ Workbook (PDF)</a>` : ''}
                ${u && u.slides && curW && u.slides[curW - 1] ? `<a class="btn ghost" href="${esc(u.slides[curW - 1])}" target="_blank" rel="noopener">Week ${curW} slides: make a copy ↗</a>` : ''}
              </div>
              ${u ? '' : '<p class="small">Materials for this route are being written. The Library shows the planned sequence.</p>'}
            </div>
            <div class="card">
              <h3 style="margin-top:0">Settings</h3>
              <div class="fields" style="grid-template-columns:1fr"><div><label for="gp-start">Week 1 started on</label><input type="date" id="gp-start" value="${esc(g.start_date)}"></div></div>
              <button class="btn ghost danger" id="gp-del" type="button" style="margin-top:12px">Delete this group plan</button>
            </div>
          </div>
        </div>
      </div>`;
      const $ = s => main.querySelector(s), $$ = s => [...main.querySelectorAll(s)];
      $$('[data-wk]').forEach(b => b.onclick = () => { week = b.dataset.wk; draw(); });
      $$('select.sc').forEach(sel => sel.onchange = () => {
        const m = g.members[Number(sel.dataset.i)]; m.s = m.s || {};
        const arr = m.s[week] ? m.s[week].slice() : [null, null, null, null];
        arr[Number(sel.dataset.k)] = sel.value === '' ? null : Number(sel.value);
        if (arr.every(v => v == null)) delete m.s[week]; else m.s[week] = arr;
        if (!Object.keys(m.s).length) delete m.s;
        dirty = true; draw();
        const again = main.querySelector(`select.sc[data-i="${sel.dataset.i}"][data-k="${sel.dataset.k}"]`); if (again) again.focus();
      });
      $('#gp-save').onclick = async () => { const b = $('#gp-save'); b.disabled = true; b.textContent = 'Saving…'; if (await save({ members: g.members }, 'Scores saved.')) dirty = false; draw(); };
      $$('[data-rm]').forEach(b => b.onclick = async () => {
        if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Remove?'; return; }
        g.members.splice(Number(b.dataset.rm), 1); await save({ members: g.members }, 'Student removed from this plan.'); draw();
      });
      $$('[data-keep]').forEach(b => b.onclick = async () => { const m = g.members.find(x => x.c === b.dataset.keep); if (m) { m.a = b.dataset.q; await save({ members: g.members }, 'Kept in this plan.'); draw(); } });
      $$('[data-drop]').forEach(b => b.onclick = async () => { g.members = g.members.filter(x => x.c !== b.dataset.drop); await save({ members: g.members }, 'Removed from this plan.'); draw(); });
      const kf = $('#gp-key'); if (kf) kf.onchange = async () => {
        try {
          const n = await R().loadKeySheet(kf.files[0]);
          const hit = g.members.filter(m => R().nameFor(m.c)).length;
          toast(!n ? 'No codes found in this file.' : hit ? 'Key sheet loaded: ' + hit + ' of ' + g.members.length + ' names found.' : 'This key sheet does not have the codes of this plan. Use the key sheet you downloaded when you saved this class.');
          draw();
        } catch (e) { toast(e.message); }
      };
      $('#gp-start').onchange = async e => { if (e.target.value && await save({ start_date: e.target.value }, 'Start date saved.')) draw(); };
      $('#gp-del').onclick = async () => {
        const b = $('#gp-del'); if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Click again to delete'; return; }
        const { error: e } = await sb.from('group_plans').delete().eq('id', g.id);
        if (e) toast('Could not delete: ' + e.message); else { toast('Group plan deleted.'); location.hash = '#/plans'; }
      };
      $('#gp-ren').onclick = () => {
        const h = $('#gp-title'); const old = g.title || '';
        h.outerHTML = `<form class="ren" id="gp-ren-f"><input maxlength="60" value="${esc(old)}" aria-label="Plan name"><button class="btn primary" type="submit">Save</button><button class="btn ghost" type="button">Cancel</button><small class="err"></small></form>`;
        const f = $('#gp-ren-f'), inp = f.querySelector('input'); inp.focus(); inp.select(); $('#gp-ren').hidden = true;
        f.querySelector('[type=button]').onclick = draw;
        f.onsubmit = async e => {
          e.preventDefault(); const t = inp.value.trim(), bad = ctx.titleProblem ? ctx.titleProblem(t) : '';
          if (bad) { f.querySelector('small').textContent = bad; return; }
          if (await save({ title: t || null }, 'Renamed.')) draw();
        };
      };
    };
    draw();
    window.onbeforeunload = () => (dirty ? true : undefined);
    const off = () => { if (!location.hash.startsWith('#/group/')) { window.onbeforeunload = null; window.removeEventListener('hashchange', off); } };
    window.addEventListener('hashchange', off);
  }

  // My plans → Class plans: the quadrant plans of one class, grouped, with the cycle one click away.
  function setsHTML(groups, esc) {
    const sets = new Map();
    groups.forEach(g => { const k = g.set_id || 'other'; if (!sets.has(k)) sets.set(k, []); sets.get(k).push(g); });
    const order = [...sets.entries()].sort((a, b) => (a[0] === 'other') - (b[0] === 'other') || String(b[1][0].created_at).localeCompare(String(a[1][0].created_at)));
    const ST = ['Profile', 'Pattern', 'Focus', 'Response', 'Adaptation'];
    return order.map(([k, gs]) => {
      gs.sort((a, b) => a.quadrant.localeCompare(b.quadrant) || String(a.created_at).localeCompare(String(b.created_at)));
      const name = k === 'other' ? 'Other group plans' : (gs[0].set_name || 'Class plan');
      const n = new Set(gs.flatMap(g => (g.members || []).map(m => m.c))).size;
      const href = i => `#/cycle/${encodeURIComponent(k)}?s=${i}`;
      return `<section class="set-card">
        <div class="set-head"><div><div class="eyebrow">Class plan · ${new Date(gs[0].created_at).toLocaleDateString()}</div>
          <h2><a href="${href(1)}">${esc(name)}</a></h2><p class="small" style="margin:0">${n} student${n === 1 ? '' : 's'} · ${gs.length} group plan${gs.length === 1 ? '' : 's'}</p></div>
          <div class="set-actions"><a class="btn primary" href="${href(4)}">Open the cycle →</a><button class="btn ghost danger small-btn" type="button" data-setdel="${esc(k)}" data-ids="${gs.map(g => g.id).join(',')}">Delete ${k === 'other' ? 'these plans' : 'class plan'}</button></div></div>
        <nav class="set-stages" aria-label="Go to a stage">${ST.map((x, i) => `<a href="${href(i + 1)}"><span>0${i + 1}</span>${x}</a>`).join('')}</nav>
        <div class="gcards">${gs.map(g => cardHTML(g, esc)).join('')}</div>
      </section>`;
    }).join('');
  }

  window.DIALDGroups = { startDialog, page, list, cardHTML, setsHTML, weekOf, nextCheck, response, summary, moved, SETUP, isSetupError };
})();
