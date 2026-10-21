import { parsePostDiscovery, fictionalPostDiscovery, fictionalMissingBodyDiscovery } from "./lib/discovery.mjs";
// Entirely local optional *vendor metadata* reader; do not upload headers, logs, wallets.
const id=x=>document.getElementById(x);
const input=id("discovery-source");
const panel=id("discovery-results");
const error=id("discovery-error");
const verdict=id("discovery-verdict");
const summary=id("discovery-summary");
const findings=id("discovery-findings");
let last;
function reset(){
  last=undefined;
  error.hidden=true;
  error.textContent="";
  panel.hidden=true;
  findings.replaceChildren();
  summary.textContent="";
  verdict.textContent="";
}
for(const button of document.querySelectorAll("[data-discovery-example]")){
  button.addEventListener("click",()=>{
    input.value=JSON.stringify(
      button.dataset.discoveryExample==="postWithBody"?
      fictionalPostDiscovery():fictionalMissingBodyDiscovery(),null,2);
    reset();
  });
}
id("discovery-analyze").addEventListener("click",()=>{
  try {
    reset();
    last=parsePostDiscovery(input.value);
    verdict.textContent=last.valid?
      "Vendor metadata structurally readable — not proof an actual POST succeeds.":
      "Vendor metadata needs attention — not a verified payment failure.";
    const data=last.summary;
    summary.textContent="Declared method: "+data.method+
      " · inline nonempty JSON example: "+(data.hasInlinePostExample?"yes":"no")+
      " · HTTPS example link: "+(data.hasExampleUrl?"present but not fetched":"none")+
      " · warnings: "+data.warnings+" · errors: "+data.errors;
    for(const issue of last.findings){
      const entry=document.createElement("li");
      const strong=document.createElement("strong");
      strong.textContent="["+issue.level.toUpperCase()+"] "+issue.code+" — ";
      const prose=document.createElement("span");
      prose.textContent=issue.path+": "+issue.message;
      entry.append(strong,prose);
      findings.append(entry);
    }
    if(!last.findings.length){
      const entry=document.createElement("li");
      entry.textContent="No optional metadata problems detected. Real schema, quote, settlement and response unverified.";
      findings.append(entry);
    }
    panel.hidden=false;
  } catch (e) {
    reset();
    error.textContent=String(e?.message||"Unable to inspect public JSON.").slice(0,360);
    error.hidden=false;
  }
});
id("discovery-clear").addEventListener("click",()=>{
  input.value="";reset();
});
input.value=JSON.stringify(fictionalPostDiscovery(),null,2);
