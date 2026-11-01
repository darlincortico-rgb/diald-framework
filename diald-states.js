/* DIALD state rules — the state-specific facts DIALD uses to read a learner's data.
   Each rule comes from an official source, has a verification date, and a status:
   'verified' = checked in an official source; 'to-confirm' = found, but its current use must be confirmed.
   DIALD's own combination of these criteria is provisional and is being validated. */
(function (root) {
  'use strict';
  const n = v => (typeof v === 'number' && isFinite(v) ? v : null);

  const STATES = [
    {
      code: 'CT', name: 'Connecticut', checked: '2026-10-31',
      elp: { test: 'LAS Links', levels: 5, growth: 'ct',
        growthText: 'Connecticut growth targets for the Oral and Literacy composites (CSDE growth model).' },
      exit: {
        text: 'LAS Links overall level 4 or 5, with Reading 4 or higher and Writing 4 or higher.', short: 'Overall 4–5 · Reading 4+ · Writing 4+', status: 'verified',
        check: p => (n(p.overall) === null ? null : p.overall >= 4 && p.reading >= 4 && p.writing >= 4),
        needs: 'the Overall level column'
      },
      ltel: { years: 5, status: 'to-confirm',
        text: 'Not reaching English mastery within five school years (CSDE report, 2020). Confirm the current definition.' },
      academic: { test: 'Smarter Balanced (SBA) ELA', levels: ['Did not meet', 'Approaching', 'Met', 'Exceeded'], meets: 3 },
      sources: [
        ['CSDE: EL exit criteria', 'https://portal.ct.gov/-/media/SDE/English-Learners/EL_exit_criteria.pdf?la=en'],
        ['CSDE: Growth model for the ELP assessment (2017, archived)', 'https://public-edsight.ct.gov/performance/las-links-achievement/las-links-growth-trajectory-tool?language=en_US'],
        ['CSDE: EL demographics report (2020)', 'https://edsight.ct.gov/relatedreports/EL-DEMOGRAPHICS-10012020.pdf']
      ]
    },
    {
      code: 'MA', name: 'Massachusetts', checked: '2026-10-31',
      elp: { test: 'WIDA ACCESS for ELLs', levels: 6, growth: 'any',
        growthText: 'Any growth in level or scale score (Massachusetts progress targets are not built in yet). ACCESS 2025–26 scale scores start a new scale.' },
      exit: {
        text: 'ACCESS overall 4.2 and literacy composite 3.9 (on the 2017–2025 scale). DESE keeps these criteria through 2027 and gives a conversion table for the new scale.', short: 'Overall 4.2 · Literacy 3.9', status: 'verified',
        check: p => (n(p.overall) === null || n(p.literacy) === null ? null : p.overall >= 4.2 && p.literacy >= 3.9),
        needs: 'the Overall and Literacy composite columns'
      },
      ltel: { years: 6, status: 'to-confirm',
        text: 'No state definition confirmed yet. DIALD uses its default of 6 years.' },
      academic: { test: 'MCAS ELA', levels: ['Not meeting', 'Partially meeting', 'Meeting', 'Exceeding'], meets: 3 },
      sources: [
        ['DESE: WIDA ACCESS transition', 'https://www.doe.mass.edu/mcas/access/transition.html'],
        ['DESE: MCAS achievement levels', 'https://profiles.doe.mass.edu/help/data.aspx?section=assess']
      ]
    },
    {
      code: 'CA', name: 'California', checked: '2026-10-31',
      elp: { test: 'Summative ELPAC', levels: 4, growth: 'any',
        growthText: 'Any growth in level or scale score.' },
      exit: {
        text: 'Summative ELPAC overall performance level 4 (AB 2555, 2026: the ELPAC is the only criterion).', short: 'ELPAC overall level 4', status: 'verified',
        check: p => (n(p.overall) === null ? null : p.overall >= 4),
        needs: 'the Overall level column'
      },
      ltel: { years: 6, status: 'verified',
        text: 'Grades 6–12, six or more years in U.S. schools, same ELPAC level for two or more years (or lower), and ELA Standard Not Met (CDE).' },
      academic: { test: 'CAASPP Smarter Balanced ELA', levels: ['Standard not met', 'Standard nearly met', 'Standard met', 'Standard exceeded'], meets: 3 },
      sources: [
        ['CDE: AB 2555 reclassification FAQs', 'https://www.cde.ca.gov/SP/ml/ab2555faqs.asp'],
        ['CDE: Long-term English learner definitions', 'https://www.cde.ca.gov/ds/ad/lteldef.asp']
      ]
    },
    {
      code: 'NY', name: 'New York', checked: '2026-10-31',
      elp: { test: 'NYSESLAT (WIDA ACCESS from spring 2027)', levels: 5, growth: 'any',
        growthText: 'Any growth in level. New York gives its last NYSESLAT in spring 2026 and its first WIDA ACCESS in spring 2027.' },
      exit: {
        text: 'NYSESLAT Commanding; or Expanding with NYS ELA (grades 3–8) level 3 or 4, or Regents ELA 65 or higher. Criteria for ACCESS have not been announced.', short: 'Commanding, or Expanding + ELA 3–4', status: 'verified',
        check: p => {
          if (n(p.overall) === null) return null;
          if (p.overall >= 5) return true;
          if (p.overall >= 4) return n(p.ela) === null ? null : p.ela >= 3;
          return false;
        },
        needs: 'the Overall level column (and the state ELA level for Expanding)'
      },
      ltel: { years: 6, status: 'verified',
        text: 'Six or more years of ELL services (NYSED). NYC DOE groups learners with seven or more years.' },
      academic: { test: 'NYS ELA (grades 3–8)', levels: ['Level 1', 'Level 2', 'Level 3', 'Level 4'], meets: 3 },
      sources: [
        ['NYSED: Joining the WIDA Consortium (2025)', 'https://www.nysed.gov/sites/default/files/programs/state-assessment/ny-wida-consortium-elp-assessments.pdf'],
        ['NYC DOE: ELL Policy and Reference Guide', 'https://infohub.nyced.org/docs/default-source/default-document-library/ell-policy-and-reference-guide.pdf']
      ]
    }
  ];
  const OTHER = {
    code: '', name: 'Other state (general rule)', checked: '',
    elp: { test: 'Your language test', levels: 6, growth: 'any', growthText: 'Any growth in level or scale score.' },
    exit: null,
    ltel: { years: 6, status: 'default', text: 'DIALD default of 6 years. Use your state’s definition.' },
    academic: { test: 'State ELA test', levels: ['Level 1', 'Level 2', 'Level 3', 'Level 4'], meets: 3 },
    sources: []
  };
  const byCode = c => STATES.find(s => s.code === c) || null;
  const byName = name => STATES.find(s => s.name === name) || null;
  const api = { STATES, OTHER, get: c => byCode(c) || OTHER, byCode, byName, codeFor: name => (byName(name) || {}).code || '' };
  if (typeof module !== 'undefined') module.exports = api;
  root.DIALDStates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
