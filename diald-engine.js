/* DIALD engine — provisional decision rules based on
   "From Data to Decision: The DIALD Framework" (Cortico Rosario).
   Every rule here is a transparent, editable demonstration criterion,
   not a validated classification. No student-identifying data is used. */
(function (root) {
  'use strict';

  const DOMAINS = ['listening', 'speaking', 'reading', 'writing'];
  const ORAL = ['listening', 'speaking'];
  const LIT = ['reading', 'writing'];

  const QUADRANTS = {
    Q1: { id: 'Q1', name: 'Oral dominant', short: 'High Oral / Low Literacy',
      note: 'Oral performance is ahead of literacy. Read it with the trajectory and context.' },
    Q2: { id: 'Q2', name: 'Balanced development', short: 'High Oral / High Literacy',
      note: 'Relatively strong performance in both oral language and literacy.' },
    Q3: { id: 'Q3', name: 'Lower-performance profile', short: 'Low Oral / Low Literacy',
      note: 'Lower performance in both. Read it with learning history and context.' },
    Q4: { id: 'Q4', name: 'Literacy dominant', short: 'Low Oral / High Literacy',
      note: 'Literacy is ahead of oral language. Look for instructional strengths to build on.' }
  };

  // Levels are 1–6; ACCESS can report decimals such as 3.4.
  const valid = v => typeof v === 'number' && isFinite(v) && v >= 1 && v <= 6;
  const complete = p => p && DOMAINS.every(d => valid(p[d]));

  // High = every domain in the pair is at or above the reference level.
  // No averaging or subtracting of ordinal levels (see article, Divergence Index).
  function quadrant(p, high) {
    const oralHigh = ORAL.every(d => p[d] >= high);
    const litHigh = LIT.every(d => p[d] >= high);
    if (oralHigh && !litHigh) return 'Q1';
    if (oralHigh && litHigh) return 'Q2';
    if (!oralHigh && !litHigh) return 'Q3';
    return 'Q4';
  }

  // Direction of oral–literacy divergence, described without arithmetic.
  function direction(p) {
    const oralAhead = ORAL.every(o => LIT.every(l => p[o] >= p[l])) && ORAL.some(o => LIT.some(l => p[o] > p[l]));
    const litAhead = LIT.every(l => ORAL.every(o => p[l] >= p[o])) && LIT.some(l => ORAL.some(o => p[l] > p[o]));
    if (oralAhead) return 'oral';
    if (litAhead) return 'literacy';
    if (DOMAINS.every(d => p[d] === p.listening)) return 'even';
    return 'mixed';
  }

  const DIM_LABEL = {
    growth: 'Domain growth',
    persistence: 'Oral–literacy pattern persistence',
    academic: 'Academic literacy performance',
    response: 'Instructional response'
  };

  function analyze(input) {
    const high = input.highLevel || 3;
    const periods = (input.periods || []).filter(complete);
    const years = input.years === '' || input.years == null ? null : Number(input.years);
    const rows = periods.map((p, i) => ({ label: p.label || ('Year ' + (i + 1)), levels: p, quadrant: quadrant(p, high), direction: direction(p) }));
    const latest = rows[rows.length - 1] || null;
    const dims = {};

    // (a) Domain growth across the last two periods, read with years of services.
    if (rows.length < 2) {
      dims.growth = { status: 'insufficient', text: 'Enter at least two assessment periods to see change over time.' };
    } else {
      const a = rows[rows.length - 2].levels, b = latest.levels;
      // A domain whose level did not change but whose scale score went up is growing inside its band.
      const sa = a.scale || {}, sb = b.scale || {};
      const inBand = DOMAINS.filter(d => b[d] <= a[d] && b[d] < 5 && Number(sb[d]) > Number(sa[d]));
      const flat = DOMAINS.filter(d => b[d] <= a[d] && b[d] < 5 && !inBand.includes(d));
      const fewYears = years !== null && years < 3;
      if (flat.length && !fewYears) {
        dims.growth = { status: 'concern', domains: flat, text: 'No level change in ' + list(flat) + ' across the last two periods' + (years !== null ? ' after ' + years + ' years of services.' : '.') + ' Unchanged levels may still hide growth inside a band.' };
      } else if (flat.length && fewYears) {
        dims.growth = { status: 'no-concern', domains: flat, text: 'Some levels did not change (' + list(flat) + '), but the learner has received services for fewer than 3 years. Keep monitoring.' };
      } else if (inBand.length) {
        dims.growth = { status: 'no-concern', domains: inBand, text: 'Levels in ' + list(inBand) + ' did not change, but the scale score went up: growth inside the band.' };
      } else {
        dims.growth = { status: 'no-concern', text: 'Every domain moved up, or is already at a high level, across the last two periods.' };
      }
      if (inBand.length && dims.growth.status === 'concern') dims.growth.text += ' Scale scores rose in ' + list(inBand) + ' (growth inside the band).';
    }

    // (b) Persistence of an oral- or literacy-dominant configuration.
    if (rows.length < 2) {
      dims.persistence = { status: 'insufficient', text: 'A pattern needs at least two assessment periods.' };
    } else {
      let run = 0; const dir = latest.direction;
      for (let i = rows.length - 1; i >= 0 && rows[i].direction === dir; i--) run++;
      if ((dir === 'oral' || dir === 'literacy') && run >= 2) {
        dims.persistence = { status: 'concern', direction: dir, run, text: (dir === 'oral' ? 'Oral' : 'Literacy') + ' domains have stayed ahead for ' + run + ' periods in a row.' };
      } else if (dir === 'oral' || dir === 'literacy') {
        dims.persistence = { status: 'no-concern', direction: dir, run, text: (dir === 'oral' ? 'Oral' : 'Literacy') + ' domains are ahead only in the most recent period. Watch the next one.' };
      } else {
        dims.persistence = { status: 'no-concern', direction: dir, run, text: 'No stable oral-dominant or literacy-dominant pattern right now.' };
      }
    }

    // (c) Academic literacy performance (local benchmarks, writing measures).
    const ST = stateRules(input);
    let ac = input.academic || {};
    const elaRows = rows.filter(r => num(r.levels.ela) !== null);
    if ((!ac.status || ac.status === 'unknown') && elaRows.length) {
      // From the state ELA test in the file: level at or above "meets" = meets expectations.
      const e1 = elaRows[elaRows.length - 1].levels.ela, e0 = elaRows.length > 1 ? elaRows[elaRows.length - 2].levels.ela : null;
      ac = { status: e1 >= ST.academic.meets ? 'meets' : e1 === ST.academic.meets - 1 ? 'approaching' : 'below', trend: e0 === null ? 'unknown' : e1 > e0 ? 'improving' : e1 < e0 ? 'declining' : 'flat' };
    }
    if (!ac.status || ac.status === 'unknown') {
      dims.academic = { status: 'insufficient', text: 'No academic reading or writing evidence entered.' };
    } else if (ac.status === 'meets' || ac.trend === 'improving') {
      dims.academic = { status: 'no-concern', text: ac.status === 'meets' ? 'Academic literacy meets expectations.' : 'Academic literacy is improving steadily, even if still below expectations.' };
    } else if (!ac.trend || ac.trend === 'unknown') {
      dims.academic = { status: 'insufficient', text: 'Academic literacy is below expectations, but the trend is unknown.' };
    } else {
      dims.academic = { status: 'concern', text: 'Academic literacy is ' + (ac.status === 'approaching' ? 'approaching' : 'below') + ' expectations and is ' + (ac.trend === 'declining' ? 'declining.' : 'not improving.') };
    }

    // (d) Instructional response to earlier targeted support.
    const rs = input.priorResponse || 'none';
    dims.response = rs === 'none'
      ? { status: 'insufficient', text: 'No targeted intervention beyond general ELD services is documented.' }
      : rs === 'positive'
        ? { status: 'no-concern', text: 'Earlier targeted support produced a positive response.' }
        : { status: 'concern', text: 'Earlier targeted support produced a ' + rs + ' response.' };

    const statuses = Object.values(dims).map(d => d.status);
    const concerns = statuses.filter(s => s === 'concern').length;
    const insufficient = statuses.filter(s => s === 'insufficient').length;

    let risk;
    if (!latest || (dims.growth.status === 'insufficient' && dims.persistence.status === 'insufficient') || insufficient >= 3) {
      risk = { level: 'Inconclusive', text: 'There is not enough evidence for a pattern yet. ' + needs(dims) };
    } else if (concerns >= 3) {
      risk = { level: 'High', text: 'Concern converges across ' + concerns + ' of 4 dimensions. Prioritize review and consider more intensive targeted support.' };
    } else if (concerns >= 1) {
      risk = { level: 'Moderate', text: 'Concern appears in ' + concerns + ' of 4 dimension' + (concerns > 1 ? 's' : '') + '. Monitor closely and consider targeted support.' };
    } else {
      risk = { level: 'Low', text: 'No converging evidence of stagnation. Continue core language support and monitoring.' };
    }

    // Instructional priorities: domains below the reference level in the latest period,
    // plus any domain flagged as flat.
    let priorities = latest ? DOMAINS.filter(d => latest.levels[d] < high) : [];
    if (latest && !priorities.length && dims.growth.status === 'concern') priorities = dims.growth.domains.slice();

    const signal = trajectorySignal(input, rows, high, years);
    const criteria = criteriaFor(ST, rows, years, signal);
    return { high, rows, latest, quadrant: latest ? QUADRANTS[latest.quadrant] : null, dims, risk: signal, dimRisk: risk, signal, concerns, insufficient, priorities,
      state: ST, criteria, criteriaConcerns: criteria.filter(c => c.status === 'concern').length, criteriaAvailable: criteria.filter(c => c.status !== 'insufficient').length };
  }

  /* ---------- State rules and the converging criteria ---------- */
  const GENERAL = { code: '', name: 'General rule', elp: { growth: 'any' }, exit: null, ltel: { years: 6 }, academic: { test: 'State ELA test', levels: ['Level 1', 'Level 2', 'Level 3', 'Level 4'], meets: 3 }, sources: [] };
  function stateRules(input) {
    const S = root.DIALDStates;
    return (S && input.state ? S.get(input.state) : S ? S.OTHER : null) || GENERAL;
  }
  const BENCH = ['Well below', 'Below', 'At', 'Above'];
  // DIALD reads four kinds of evidence side by side. It counts concerns; it does not weight them (not validated yet).
  function criteriaFor(ST, rows, years, signal) {
    const out = [], latest = rows[rows.length - 1], prev = rows[rows.length - 2];
    const lt = ST.ltel.years;
    out.push(years === null
      ? { key: 'time', label: 'Time in services', status: 'insufficient', text: 'Years of services not in the file.' }
      : years >= lt ? { key: 'time', label: 'Time in services', status: 'concern', text: years + ' years: at or past the ' + lt + '-year LTEL time (' + (ST.name || 'general rule') + ').' }
      : { key: 'time', label: 'Time in services', status: years >= lt - 1 ? 'watch' : 'no-concern', text: years + ' of ' + lt + ' years before the LTEL time.' });
    const sl = signal.level;
    out.push({ key: 'elp', label: 'English proficiency growth', status: sl === 'NA' ? 'insufficient' : sl === 'Persistent' || sl === 'Horizon' ? 'concern' : sl === 'Emerging' ? 'watch' : 'no-concern', text: signal.label + '.' });
    const bv = r => (r ? num(r.levels.bench) : null);
    const b1 = bv(latest), b0 = bv(prev);
    out.push(b1 === null
      ? { key: 'bench', label: 'Benchmark', status: 'insufficient', text: 'No benchmark results in the file.' }
      : { key: 'bench', label: 'Benchmark', status: b1 <= 2 ? (b0 !== null && b0 <= 2 ? 'concern' : 'watch') : 'no-concern',
          text: BENCH[b1 - 1] + ' benchmark' + (b0 !== null ? ' (before: ' + BENCH[b0 - 1].toLowerCase() + ')' : '') + (b1 <= 2 && b0 !== null && b0 <= 2 ? ': below benchmark two times in a row.' : '.') });
    const ev = r => (r ? num(r.levels.ela) : null);
    const e1 = ev(latest), e0 = ev(prev), lv = ST.academic.levels;
    out.push(e1 === null
      ? { key: 'ela', label: ST.academic.test, status: 'insufficient', text: 'No state ELA results in the file.' }
      : { key: 'ela', label: ST.academic.test, status: e1 >= ST.academic.meets ? 'no-concern' : 'concern',
          text: (lv[e1 - 1] || 'Level ' + e1) + (e0 !== null ? ' (before: ' + (lv[e0 - 1] || 'level ' + e0).toLowerCase() + ')' : '') + '.' });
    return out;
  }

  /* ---------- Trajectory signal (provisional, transparent parameters) ----------
     A domain is flagged in an interval when it is below the reference level AND did not grow
     (no level gain, and no scale-score gain when scale scores are available and comparable).
     Emerging = flagged in the last interval; Persistent = same domain flagged in two consecutive
     intervals; near the horizon = persistent with one year or less left before the LTEL time
     horizon (default 6 years). These are design parameters to be validated, not research cut points. */
  const SIGNALS = {
    NA: 'Not computable', None: 'No persistent signal', Emerging: 'Emerging signal',
    Persistent: 'Persistent signal', Horizon: 'Persistent · near LTEL horizon'
  };

  /* ---------- Connecticut LAS Links growth targets ----------
     Source: CSDE (2017), "Connecticut's Growth Model for the English Language Proficiency
     Assessments" (LAS Links Forms C/D; archived). Growth is read on the Oral composite
     (listening + speaking) and the Literacy composite (reading + writing), each the truncated
     average of two vertical scale scores. Target = scale points expected in one year, by grade
     in year 1 and composite level in year 1. Levels 4–5: maintain level 4 or above.
     PTA = gain / target x 100, from 0 to 110. DIALD flags low growth (PTA under 50% by default,
     a provisional parameter), not every missed target: CT targets are set at the 60th–70th
     percentile of observed growth. Check these values against the current form. */
  const GRADE_ORDER = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const CT = {
    oral: {
      cuts: { K: [300, 430, 461, 487, 526, 555], 1: [300, 432, 463, 490, 530, 555], 2: [330, 443, 470, 495, 540, 580], 3: [330, 444, 471, 505, 548, 580], 4: [355, 450, 478, 514, 575, 637], 5: [355, 452, 485, 516, 580, 637], 6: [362, 455, 481, 518, 575, 662], 7: [362, 460, 485, 521, 580, 662], 8: [362, 465, 492, 525, 582, 662], 9: [370, 465, 490, 525, 561, 690], 10: [370, 468, 495, 527, 566, 690], 11: [370, 471, 497, 530, 567, 690], 12: [370, 472, 500, 531, 569, 690] },
      targets: { K: [61, 36, 28], 1: [68, 33, 25], 2: [59, 32, 26], 3: [79, 32, 28], 4: [82, 44, 32], 5: [76, 38, 25], 6: [78, 46, 31], 7: [73, 43, 32], 8: [60, 30, 14], 9: [60, 28, 22], 10: [63, 33, 25], 11: [53, 31, 24] }
    },
    literacy: {
      cuts: { K: [220, 351, 399, 454, 495, 590], 1: [220, 357, 410, 456, 507, 590], 2: [285, 430, 473, 501, 545, 625], 3: [285, 432, 479, 516, 554, 625], 4: [325, 451, 501, 534, 586, 680], 5: [325, 452, 502, 537, 587, 680], 6: [340, 474, 513, 553, 599, 700], 7: [340, 474, 514, 554, 600, 700], 8: [340, 475, 515, 554, 600, 700], 9: [350, 478, 522, 565, 613, 717], 10: [350, 478, 523, 565, 613, 717], 11: [350, 479, 524, 566, 614, 717], 12: [350, 480, 525, 567, 615, 717] },
      targets: { K: [111, 75, 68], 1: [96, 68, 61], 2: [75, 49, 40], 3: [80, 51, 44], 4: [87, 53, 40], 5: [82, 46, 31], 6: [80, 47, 37], 7: [75, 48, 39], 8: [59, 38, 26], 9: [63, 38, 26], 10: [60, 36, 25], 11: [60, 33, 23] }
    }
  };
  const COMP = { oral: ORAL, literacy: LIT };
  function gradeKey(g) {
    if (g === '' || g == null) return null;
    const s = String(g).trim().toUpperCase();
    if (/^(K|KG|0)$/.test(s)) return 'K';
    return GRADE_ORDER.includes(String(Number(s))) ? String(Number(s)) : null;
  }
  // Grade for each period: the period's own grade, or counted back from the current grade.
  function periodGrades(input, rows) {
    const now = gradeKey(input.gradeNow);
    return rows.map((r, i) => {
      const own = gradeKey(r.levels.grade); if (own) return own;
      if (!now) return null;
      const k = GRADE_ORDER.indexOf(now) - (rows.length - 1 - i);
      return k >= 0 ? GRADE_ORDER[k] : null;
    });
  }
  function composite(p, c) {
    const sc = p.scale || {}, v = COMP[c].map(d => Number(sc[d]));
    return v.every(x => x > 0) ? Math.floor((v[0] + v[1]) / 2) : null;
  }
  function ctLevel(c, g, score) {
    const cut = CT[c].cuts[g]; if (!cut || score < cut[0] - 5 || score > cut[5] + 5) return null;
    return 1 + cut.slice(1, 5).filter(x => score >= x).length;
  }
  // One year-to-year interval on one composite, or null when the CT rule cannot be applied.
  function ctInterval(c, a, b, ga, gb, ptaFlag) {
    const sa = composite(a, c), sb = composite(b, c);
    if (sa === null || sb === null || !ga || !gb || !CT[c].targets[ga]) return null;
    const la = ctLevel(c, ga, sa), lb = ctLevel(c, gb, sb);
    if (!la || !lb) return null;
    const gain = sb - sa;
    if (la >= 4) return { comp: c, grade: ga, from: sa, to: sb, gain, levelFrom: la, levelTo: lb, target: null, pta: null, met: lb >= 4, low: lb < 4 };
    const target = CT[c].targets[ga][la - 1];
    const pta = Math.max(0, Math.min(110, Math.round(gain / target * 100)));
    return { comp: c, grade: ga, from: sa, to: sb, gain, levelFrom: la, levelTo: lb, target, pta, met: gain >= target, low: pta < ptaFlag };
  }
  function usesCT(input, test) {
    if (input.growthModel === 'any') return false;
    return input.growthModel === 'ct' || /las\s*-?\s*links/i.test(test) || (!test && stateRules(input).elp.growth === 'ct');
  }

  function trajectorySignal(input, rows, high, years) {
    const ST = stateRules(input);
    const horizon = Number(input.horizon) || ST.ltel.years || 6, exitLevel = Number(input.exitLevel) || 4;
    const test = String(input.test || (rows.length && rows[rows.length - 1].levels.test) || '');
    const latest = rows[rows.length - 1];
    const flags = { pastHorizon: years !== null && years >= horizon, mayExit: false, accessRescale: false, horizon, exitLevel, years };
    flags.exitText = 'All four domains at level ' + exitLevel + ' or above';
    if (latest && ST.exit) {
      const ex = ST.exit.check(latest.levels);
      flags.mayExit = ex === true; flags.exitUnknown = ex === null;
      flags.exitText = ST.exit.text; flags.exitNeeds = ST.exit.needs; flags.exitState = ST.name;
    } else if (latest) flags.mayExit = DOMAINS.every(d => latest.levels[d] >= exitLevel);
    const out = (level, text, evidence) => ({ level, label: level === 'Horizon' && flags.pastHorizon ? 'Persistent · LTEL time reached' : SIGNALS[level], text, evidence: evidence || [], flags });
    if (rows.length < 2) return out('NA', 'Needs at least two comparable assessment years to read a trajectory.');
    const time = years === null ? '' : years >= horizon ? ' ' + years + ' years in services (LTEL time: ' + horizon + ').' : ' ' + years + ' of ' + horizon + ' years in services.';
    const list2 = a => a.map(c => c === 'oral' ? 'Oral' : 'Literacy').join(' and ');

    // Connecticut model: Oral and Literacy composites against the state growth targets.
    if (usesCT(input, test)) {
      const gr = periodGrades(input, rows), intervals = [], ptaFlag = Number(input.ptaFlag) || 50;
      for (let i = 1; i < rows.length; i++) intervals.push(['oral', 'literacy'].map(c => ctInterval(c, rows[i - 1].levels, rows[i].levels, gr[i - 1], gr[i], ptaFlag)));
      if (intervals.every(iv => iv.every(Boolean))) {
        const run = { oral: 0, literacy: 0 };
        intervals.forEach(iv => iv.forEach(x => { run[x.comp] = x.low ? run[x.comp] + 1 : 0; }));
        const lastIv = intervals[intervals.length - 1];
        const growth = { model: 'CT', ptaFlag, source: 'Connecticut LAS Links growth targets (CSDE 2017)', last: lastIv,
          ptaAvg: Math.round(lastIv.filter(x => x.pta !== null).reduce((t, x, _, a) => t + x.pta / a.length, 0)) || null };
        flags.growth = growth;
        const evidence = lastIv.map(x => {
          const nm = (x.comp === 'oral' ? 'Oral' : 'Literacy') + ' composite (grade ' + x.grade + ', level ' + x.levelFrom + ')';
          const sc = x.from + ' → ' + x.to + ' (' + (x.gain >= 0 ? '+' : '') + x.gain + ')';
          const res = x.target === null
            ? (x.met ? 'level 4+ maintained' : 'dropped below level 4')
            : 'target +' + x.target + ', ' + x.pta + '% of target · ' + (x.met ? 'met' : 'not met');
          return nm + ': ' + sc + ', ' + res + (run[x.comp] > 1 ? ' · low growth ' + run[x.comp] + ' years in a row' : '');
        });
        const persistent = ['oral', 'literacy'].filter(c => run[c] >= 2), emerging = ['oral', 'literacy'].filter(c => run[c] === 1);
        const o = (lv, txt) => { const r = out(lv, txt, evidence); r.model = 'CT'; return r; };
        if (persistent.length) {
          const near = years !== null && horizon - years <= 1;
          return o(near ? 'Horizon' : 'Persistent', list2(persistent) + ' grew less than ' + ptaFlag + '% of the Connecticut growth target two or more years in a row.' + time);
        }
        if (emerging.length) return o('Emerging', list2(emerging) + ' grew less than ' + ptaFlag + '% of the Connecticut growth target in the last year. Watch the next one.' + time);
        return o('None', 'Oral and Literacy each reached at least ' + ptaFlag + '% of the Connecticut growth target in the last year (or stayed at level 4+).' + time + ' This is not the same as no need for support.');
      }
      flags.ctSkipped = true; // missing scale scores or grades: fall back to the domain rule
    }

    const run = {}, last = {};
    DOMAINS.forEach(d => { run[d] = 0; });
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1].levels, b = rows[i].levels;
      // ACCESS 2025–26 restarted its scale: do not compare scale scores across that break.
      const rescale = /access/i.test(test) && /2025\D{0,3}(20)?26|2026/.test(String(rows[i].label));
      if (rescale && i === rows.length - 1) flags.accessRescale = true;
      DOMAINS.forEach(d => {
        const lvGain = b[d] - a[d];
        const sa = a.scale && Number(a.scale[d]), sb = b.scale && Number(b.scale[d]);
        const scaleOk = !rescale && sa > 0 && sb > 0;
        const exp = input.expectedGain && Number(input.expectedGain[d]);
        const scaleGrew = scaleOk && (exp > 0 ? sb - sa >= exp : sb - sa > 0);
        const grew = lvGain > 0 || (lvGain === 0 && scaleGrew);
        const flagged = b[d] < high && !grew;
        run[d] = flagged ? run[d] + 1 : 0;
        if (i === rows.length - 1) last[d] = { flagged, lvGain, scaleGain: scaleOk ? sb - sa : null, level: b[d] };
      });
    }
    const name = d => d.charAt(0).toUpperCase() + d.slice(1);
    const evidence = DOMAINS.filter(d => run[d] > 0).map(d => {
      const l = last[d];
      return name(d) + ': level ' + l.level + ' (below ' + high + '), ' + (l.scaleGain !== null ? 'scale ' + (l.scaleGain >= 0 ? '+' : '') + l.scaleGain + ', ' : '') +
        'no growth for ' + run[d] + ' interval' + (run[d] > 1 ? 's' : '');
    });
    const persistent = DOMAINS.filter(d => run[d] >= 2), emerging = DOMAINS.filter(d => run[d] === 1);
    if (persistent.length) {
      const near = years !== null && horizon - years <= 1;
      return out(near ? 'Horizon' : 'Persistent', list(persistent) + ' stayed below the reference level without growth for two or more intervals.' + time, evidence);
    }
    if (emerging.length) return out('Emerging', list(emerging) + ' stayed below the reference level without growth in the last interval. Watch the next one.' + time, evidence);
    return out('None', 'No domain shows low performance together with no growth.' + time + ' This is not the same as no need for support.', evidence);
  }

  function needs(dims) {
    const n = Object.entries(dims).filter(([, d]) => d.status === 'insufficient').map(([k]) => DIM_LABEL[k].toLowerCase());
    return n.length ? 'Missing: ' + n.join(', ') + '.' : '';
  }

  function list(a) {
    const n = a.map(cap);
    return n.length < 2 ? n.join('') : n.slice(0, -1).join(', ') + ' and ' + n.at(-1);
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Rank library pathways for an analysis.
  function matchPathways(result, pathways, grade) {
    if (!result || !result.quadrant) return [];
    const q = result.quadrant.id;
    const ranked = pathways
      .map(p => {
        const domainHits = p.domains.filter(d => result.priorities.includes(d)).length;
        const qHit = p.quadrants.includes(q);
        const gHit = !grade || p.grades.includes(grade);
        return { p, score: (qHit ? 3 : 0) + domainHits + (gHit ? 1 : 0), qHit, domainHits };
      })
      .filter(x => x.qHit || x.domainHits > 0)
      .sort((a, b) => b.score - a.score);
    // Pathways written for this quadrant come first; domain-only matches are a fallback.
    const inQuadrant = ranked.filter(x => x.qHit);
    return (inQuadrant.length ? inQuadrant : ranked).map(x => x.p);
  }

  // Response stage: classify progress toward one objective.
  function classifyResponse(o) {
    const b = num(o.baseline), c = num(o.current), g = num(o.goal);
    if (c === null) return { level: 'Not yet', text: 'No progress recorded yet. Add the current result at the review point.' };
    if (b === null || c === null || g === null || g === b) return { level: 'Inconclusive', text: 'Enter a baseline, a current result, and a goal on the same measure.' };
    if (o.implementation === 'no') return { level: 'Inconclusive', text: 'The plan was not implemented as intended, so the response cannot be judged yet.' };
    const up = g > b;
    const gain = up ? c - b : b - c, gap = Math.abs(g - b);
    if (up ? c >= g : c <= g) return { level: 'Positive', text: 'The goal was met or exceeded.' };
    if (gain / gap >= 0.25) return { level: 'Partial', text: 'Meaningful progress (' + Math.round(gain / gap * 100) + '% of the way to the goal), but the goal is not met yet.' };
    if (o.implementation === 'partly') return { level: 'Inconclusive', text: 'Little progress, but the plan was only partly implemented. Check implementation first.' };
    return { level: 'Limited', text: 'Little progress despite adequate implementation.' };
  }
  function num(v) { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }

  const ADAPT = {
    Positive: ['Keep the activities that worked.', 'Fade support step by step: fewer prompts, more independent tasks.', 'Check that the skill transfers to a new text or class.'],
    Partial: ['Keep the pathway, but adjust: more modeling, more guided practice, or more sessions per week.', 'Look at the objective again: which part is still hard?', 'Add one activity from the same pathway that targets that part.'],
    Limited: ['First check implementation: time, attendance, and how the activities were used.', 'If implementation was adequate, try a different pathway or a more intensive one.', 'Bring the evidence to your team for a contextual review.'],
    'Not yet': ['Teach the pathway until its review point, then record the current result in Response.', 'Use the same measure as the baseline so the results can be compared.'],
    Inconclusive: ['Collect more evidence on the same measure before making a big change.', 'Make sure baseline, current result, and goal use the same tool.']
  };

  const api = { DOMAINS, QUADRANTS, DIM_LABEL, SIGNALS, CT, ctInterval, BENCH, quadrant, direction, analyze, matchPathways, classifyResponse, ADAPT };
  if (typeof module !== 'undefined') module.exports = api;
  root.DIALDEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
