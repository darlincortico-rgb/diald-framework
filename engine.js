(function (root) {
  'use strict';
  const sample = () => ({code:'Sample-01',grade:'5',years:3, observations:[
    {date:'2026-09-08',performance:'partial',support:'independent'},
    {date:'2026-09-11',performance:'partial',support:'independent'},
    {date:'2026-09-15',performance:'partial',support:'independent'}
  ]});
  function evaluate(input) {
    const usable = input.observations.filter(o=>o.date && o.performance!=='not_observed' && o.support!=='unknown');
    const groups = ['independent','supported'].map(s=>usable.filter(o=>o.support===s));
    const recurring = groups.find(g=>new Set(g.filter(o=>['partial','not_demonstrated'].includes(o.performance)).map(o=>o.date)).size>=2);
    const demonstrated = groups.find(g=>new Set(g.filter(o=>o.performance==='demonstrated').map(o=>o.date)).size>=2 && g.every(o=>o.performance==='demonstrated'));
    const differing = new Set(usable.map(o=>o.performance)).size>1;
    const status = differing?'Mixed':recurring?'Emerging':demonstrated?'Stable':'Inconclusive';
    const focus = recurring || usable.some(o=>['partial','not_demonstrated'].includes(o.performance));
    return {status, count:usable.length,
      profile: usable.length ? usable.map(o=>`${o.date}: the connection between evidence and a claim was ${o.performance==='demonstrated'?'demonstrated':o.performance==='partial'?'partially demonstrated':'not demonstrated in this task'}, ${o.support==='supported'?'with support':'independently'}.`).join('\n') : 'There is not yet an observation with a recorded date, performance, and known support condition.',
      reason: status==='Emerging'?'This instructional priority appears on at least two separate dates under the same recorded support condition. This demonstration has no previous review cycle.':status==='Stable'?'The skill was demonstrated on at least two dates under the same recorded support condition. No growth or independent mastery is inferred.':status==='Mixed'?'Recorded performance differs across observations. Review the tasks and support conditions before drawing a single conclusion.':'The available observations do not establish a clear repeated pattern. A focused observation can inform the next decision.',
      focus:focus?'Explain how textual evidence supports a written claim.':demonstrated?'Consolidate the demonstrated connection between evidence and a written claim.':'Observe how the learner connects textual evidence to a written claim.',
      supports: focus ? [['Model a complete explanation','Think aloud while connecting one piece of evidence to a claim. Invite the learner to explain the connection in their own words.'],['Rehearse, then write','Invite a brief oral rehearsal before writing. Record whether prompts or an organizer were used.']] : [['Collect a focused writing sample','Use a brief, familiar text and ask for a claim, evidence, and an explanation of the connection. Record the support provided.']],
      criterion:'Look for an explanation of why the selected evidence supports the claim. Record both the explanation and the support used.',
      trace: status==='Emerging'?'PI02 · Repeated observations on distinct dates; same task and support condition.':status==='Mixed'?'PI07 · Different recorded performances; retain the differences.':status==='Stable'?'PI05 · Repeated demonstrated performance; no growth claim.':'PI01 · Insufficient evidence of a clear pattern.',
      limitation:'The two-observation convention is provisional. These tasks must be comparable as confirmed by the educator. This prototype covers one writing skill; it does not evaluate other language domains.'};
  }
  const api={sample,evaluate};
  if(typeof module!=='undefined') module.exports=api;
  root.DIALD=api;
})(typeof globalThis!=='undefined'?globalThis:this);
