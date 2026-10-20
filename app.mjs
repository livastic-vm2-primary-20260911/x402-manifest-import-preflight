import {parseAndAnalyze, fictionalSample, MAX_MANIFEST_BYTES} from './lib/preflight.mjs';

const byId = (id) => document.getElementById(id);
const source=byId('source'), formFile=byId('file'), out=byId('result'), error=byId('error');
let report;
function setError(message) {
  error.textContent=message;
  error.hidden=!message;
}
function render() {
  byId('verdict').textContent=report.valid?'No structural errors detected (not a settlement guarantee).':'Some manifest fields need attention.';
  const sum=report.summary;
  for(const [id,number] of [['resourcesCount',sum.resourceCount],['railsCount',sum.acceptsCount],['errorsCount',sum.errors],['warningsCount',sum.warnings]]) byId(id).textContent=number.toLocaleString('en-US');
  byId('networks').textContent='Networks observed: '+(sum.networks.join(', ') || 'none');
  byId('estimated').textContent='Approximate pre-fix SQL bind workload (illustrative only, NOT a provider validity test): '+sum.estimatedPreparedInsertBindings.toLocaleString('en-US')+'.';
  const list=byId('findings');
  list.replaceChildren();
  for(const item of report.findings){
    const li=document.createElement('li');
    const strong=document.createElement('strong');strong.textContent='['+item.level.toUpperCase()+'] '+item.code+' — ';
    const span=document.createElement('span');span.textContent=item.path+': '+item.message;
    li.append(strong,span);list.appendChild(li);
  }
  byId('truncated').textContent=report.truncatedFindings?'Displayed first 200 findings; correct those and rerun.':'';
  out.hidden=false;
}
byId('analyze').addEventListener('click',()=>{
  try{
    report=parseAndAnalyze(source.value);
    setError('');
    render();
  }catch(e){
    report=null;out.hidden=true;
    setError(e instanceof Error?e.message:'Unable to analyze JSON.');
  }
});
formFile.addEventListener('change',async()=>{
  const f=formFile.files?.[0];if(!f)return;
  if(f.size>MAX_MANIFEST_BYTES){setError('File exceeds 1.5 MB; redact and narrow before inspection.');return;}
  try {
    source.value=await f.text();
    byId('analyze').click();
  }catch {setError('Unable to open file locally.');}
});
byId('sample').addEventListener('click',()=>{
  source.value=JSON.stringify(fictionalSample(),null,2);
  byId('analyze').click();
});
byId('clear').addEventListener('click',()=>{
  source.value='';formFile.value='';report=null;out.hidden=true;setError('');source.focus();
});
byId('download').addEventListener('click',()=>{
  if(!report)return;
  const blob=new Blob([JSON.stringify({...report,disclosure:'Offline structural review only; not payment or importer verification.'},null,2)],{type:'application/json'});
  const u=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=u;link.download='manifestscope-local-report.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(u),1000);
});
