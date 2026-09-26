(function(root){
 'use strict';
 const columns=['student_code','grade','school','teacher','group','home_language','years_ml','assessment_name','assessment_date','scale_min','scale_max','listening','speaking','reading','writing'];
 function parseCSV(text){
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
   if(c==='"'){if(field||closed)throw Error('Unexpected quotation mark. Use a CSV file with comma-separated columns.');quoted=true;}
   else if(c===','||c==='\n'||c==='\r'){
    row.push(field);field='';closed=false;
    if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v.trim()))rows.push(row);row=[];}
   }else{if(closed&&c.trim())throw Error('Unexpected text after a quoted value.');if(!closed)field+=c;}
  }
  if(quoted)throw Error('Unclosed quotation mark in CSV.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  if(rows.length<2)throw Error('Include column headings and at least one student.');
  if(rows.length>2001)throw Error('This prototype accepts up to 2,000 students per import.');
  if(rows[0].some(h=>!h.trim())||new Set(rows[0].map(h=>h.trim().toLowerCase())).size!==rows[0].length)throw Error('Column headings must be nonempty and unique.');
  const width=rows[0].length;if(rows.some(r=>r.length!==width))throw Error('Some rows have a different number of columns. Check delimiters and quoted commas.');
  return {headers:rows[0].map(s=>s.trim()),rows:rows.slice(1)};
 }
 const emptyObservations=()=>Array.from({length:3},()=>({date:'',performance:'not_observed',support:'unknown'}));
 function validate(parsed,mapping,existing){
  const seen=new Set(existing.map(s=>s.code.toLowerCase())),valid=[],errors=[];
  const mappings=Object.values(mapping).filter(x=>x!==''&&x!==undefined);
  if(new Set(mappings).size!==mappings.length)return {valid:[],errors:['Each source column can be mapped to only one field.']};
  const required=['student_code','grade'];
  if(required.some(k=>mapping[k]===''||mapping[k]===undefined))return {valid:[],errors:['Map Student code and Grade before reviewing the import.']};
  parsed.rows.forEach((row,index)=>{
   const get=k=>mapping[k]===''||mapping[k]===undefined?'':(row[Number(mapping[k])]||'').trim();
   const code=get('student_code'),grade=get('grade').toUpperCase(),issues=[];
   if(!code||code.length>80)issues.push('student code is required (maximum 80 characters)');
   if(seen.has(code.toLowerCase()))issues.push('duplicate student code: '+code);
   seen.add(code.toLowerCase());
   if(!['K',...Array.from({length:12},(_,i)=>String(i+1))].includes(grade))issues.push('grade must be K or 1–12');
   const numeric=k=>get(k)===''?null:Number(get(k));
   const years=numeric('years_ml');if(years!==null&&(!Number.isFinite(years)||years<0||years>30))issues.push('years of ML services must be 0–30 or blank');
   const scores={};for(const d of ['listening','speaking','reading','writing']){scores[d]=numeric(d);if(scores[d]!==null&&!Number.isFinite(scores[d]))issues.push(d+' must be numeric or blank');}
   const min=numeric('scale_min'),max=numeric('scale_max'),hasScores=Object.values(scores).some(v=>v!==null);
   const date=get('assessment_date'),assessment=get('assessment_name');
   if(hasScores){
    if(!assessment)issues.push('assessment name is required when scores are provided');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)issues.push('assessment date must be a valid YYYY-MM-DD date');
    if(min===null||max===null||!Number.isFinite(min)||!Number.isFinite(max)||max<=min)issues.push('valid scale minimum and maximum are required with scores');
    else for(const [d,v] of Object.entries(scores))if(v!==null&&(v<min||v>max))issues.push(d+' is outside the supplied scale');
   }
   if(issues.length){errors.push(`Row ${index+2}: ${issues.join('; ')}.`);return;}
   valid.push({code,grade,years,school:get('school'),teacher:get('teacher'),group:get('group'),language:get('home_language'),scores,assessment,assessmentDate:date,scaleMin:min,scaleMax:max,observations:emptyObservations(),reviewed:false,result:null,monitoring:{frequency:'2',weeks:'3'}});
  });return {valid,errors};
 }
 function csvCell(v){let s=v==null?'':String(v);if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
 function toCSV(students){return [columns,...students.map(s=>[s.code,s.grade,s.school,s.teacher,s.group,s.language,s.years,s.assessment,s.assessmentDate,s.scaleMin,s.scaleMax,...['listening','speaking','reading','writing'].map(k=>s.scores[k])])].map(row=>row.map(csvCell).join(',')).join('\r\n');}
 function demos(){return Array.from({length:20},(_,i)=>{
  const s={code:'Demo-'+String(i+1).padStart(2,'0'),grade:String([3,4,5,6,7][i%5]),years:[0.5,2,3,5,7][i%5],school:['Maple School','River School'][i%2],teacher:['Teacher A','Teacher B','Teacher C'][i%3],group:['Group A','Group B',''][i%3],language:['Spanish','Arabic','Portuguese','Haitian Creole'][i%4],scores:{listening:3+i%3,speaking:2+i%4,reading:2+i%3,writing:2+i%2},assessment:'Demo proficiency scale',assessmentDate:'2026-09-01',scaleMin:1,scaleMax:6,observations:emptyObservations(),reviewed:false,result:null,monitoring:{frequency:'2',weeks:'3'}};
  if(i<8){s.observations=[8,11,15].map(day=>({date:`2026-09-${day.toString().padStart(2,'0')}`,performance:i<4?'partial':'demonstrated',support:'independent'}));s.reviewed=true;}
  if(i===0){s.code='Sample-01';s.grade='5';s.years=3;}
  return s;
 });}
 const api={columns,parseCSV,validate,toCSV,demos,emptyObservations};root.RosterData=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
