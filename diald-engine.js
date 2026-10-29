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
    const ac = input.academic || {};
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

    return { high, rows, latest, quadrant: latest ? QUADRANTS[latest.quadrant] : null, dims, risk, concerns, insufficient, priorities };
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

  const api = { DOMAINS, QUADRANTS, DIM_LABEL, quadrant, direction, analyze, matchPathways, classifyResponse, ADAPT };
  if (typeof module !== 'undefined') module.exports = api;
  root.DIALDEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
