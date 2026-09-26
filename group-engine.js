(function(root){
 'use strict';
 function plan(students){
  const members=students.map(s=>{
   const observations=s.reviewed?s.observations.filter(o=>o.date&&o.performance!=='not_observed'&&o.support!=='unknown'):[];
   const attention=observations.some(o=>['partial','not_demonstrated'].includes(o.performance));
   const independent=observations.length>=2&&new Set(observations.map(o=>o.date)).size>=2&&observations.every(o=>o.performance==='demonstrated'&&o.support==='independent');
   const supported=observations.length>=2&&new Set(observations.map(o=>o.date)).size>=2&&observations.every(o=>o.performance==='demonstrated'&&o.support==='supported');
   return {code:s.code,grade:s.grade,bucket:attention?'scaffold':independent?'extend':supported?'consolidate':'clarify',evidenceCount:observations.length,reason:attention?'Reviewed writing samples show an incomplete or undemonstrated explanation in this task.':independent?'The connection was demonstrated independently on at least two recorded dates.':supported?'The connection was demonstrated with support on at least two recorded dates.':'There is not enough reviewed evidence to choose a specific adjustment.',evidence:observations.map(o=>`${o.date}: ${o.performance}; ${o.support}`)};
  });
  const count=k=>members.filter(m=>m.bucket===k).length;
  const known=count('scaffold')+count('extend')+count('consolidate');
  const mode=!members.length?'empty':!known?'clarification':count('scaffold')?'instruction':'consolidation';
  return {mode,total:members.length,known,unknown:count('clarify'),members,counts:{scaffold:count('scaffold'),extend:count('extend'),consolidate:count('consolidate'),clarify:count('clarify')},
   objective:'Explain how textual evidence supports a written claim.',
   summary:!members.length?'Select students to prepare a class plan.':!known?'Start with one shared writing task to establish classroom evidence. Imported scores alone do not support differentiated recommendations.':`A shared writing objective can serve this class, with adjustments based on the reviewed evidence for ${known} of ${members.length} students.`,
   steps:mode==='clarification'?[['Introduce one common task','Choose a short, accessible text. Ask students to state a claim, select evidence, and explain the connection.'],['Record the conditions','Offer access supports appropriate to the class and record what each learner used. Do not treat support use as independent performance.'],['Collect one response per learner','Use the responses to clarify who needs which instructional support before the next lesson.']]:[['Connect the objective to the class text','Choose a grade-appropriate text and a shared question. Make the claim–evidence–explanation relationship explicit.'],[mode==='instruction'?'Model, discuss, then write':'Apply, discuss, then refine',mode==='instruction'?'Model one explanation. Let partners rehearse a connection, then write their own response. Use the adjustments below while maintaining the common objective.':'Invite students to explain their evidence, compare reasoning with a partner, and refine the written explanation. Retain or reduce scaffolds according to observed response.'],['Use a common exit response','Collect a short individual explanation from everyone. Note the support used and decide what to revisit in the next lesson.']],
   adjustments:[
    {key:'scaffold',title:'Offer a supported rehearsal',instruction:'Use an oral rehearsal and a brief organizer linking claim, evidence, and why it matters. Check the explanation before independent writing.'},
    {key:'consolidate',title:'Consolidate with the recorded support',instruction:'Keep the support that was present in the observations. Try a small reduction and observe the response before claiming independence.'},
    {key:'extend',title:'Offer an extension',instruction:'Ask learners to compare two pieces of evidence or refine which supports the claim more clearly. Verify transfer to this new text.'},
    {key:'clarify',title:'Observe within the shared lesson',instruction:'Include these learners in the common task with appropriate access supports. Gather an individual response; do not infer a deficit from missing evidence.'}
   ].filter(a=>count(a.key)>0).map(a=>({...a,members:members.filter(m=>m.bucket===a.key)})),
   limitation:'Provisional planning suggestions for one writing skill. Flexible instructional adjustments, not fixed ability groups, diagnoses, or MTSS tiers. The educator chooses the class text and confirms fit to the lesson.'};
 }
 root.DIALDGroup={plan};if(typeof module!=='undefined')module.exports={plan};
})(typeof globalThis!=='undefined'?globalThis:this);
