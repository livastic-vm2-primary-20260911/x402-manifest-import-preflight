// Vendor-neutral optional buyer discovery metadata inspection.
// This is NOT a parser for the normative x402 manifest schema or an OpenAPI verifier.
// No network, wallets, signed payment headers, third-party JS or customer data required.
export const MAX_DISCOVERY_BYTES = 16_384;
const isRecord = x => x !== null && typeof x === "object" && !Array.isArray(x);
const isNonemptyText = x => typeof x === "string" && x.trim().length > 0;
const rule = (level, code, path, message) => ({level, code, path, message});
function httpsURL(value) {
  if(!isNonemptyText(value)) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && Boolean(u.hostname) && !u.username && !u.password;
  } catch { return false; }
}
function exampleDetails(value) {
  if(isRecord(value)) return {usable:Object.keys(value).length > 0,type:"object"};
  if(Array.isArray(value)) return {usable:value.length > 0,type:"array"};
  return {usable:false,type:"not-a-nonempty-object-or-array"};
}
function inlineExample(resource) {
  // Explicit nonstandard vendor examples only. No assumption these fields
  // are required by x402 or inherited from a normative spec.
  const possible = [
    ["requestBodyExample",resource.requestBodyExample],
    ["exampleBody",resource.exampleBody],
    ["bodyExample",resource.bodyExample],
    ["requestBody.content.application/json.example",
      resource.requestBody?.content?.["application/json"]?.example],
    ["requestBody.content.application/json.examples",
      resource.requestBody?.content?.["application/json"]?.examples]
  ];
  for(const [name,value] of possible) {
    if(value === undefined || value === null) continue;
    if(name.endsWith(".examples")) {
      if(!isRecord(value)) return {field:name,...exampleDetails(null)};
      const examples=Object.values(value).map(x=>isRecord(x)&&"value" in x?x.value:x);
      return {field:name,usable:examples.some(x=>exampleDetails(x).usable),type:"examples"};
    }
    return {field:name,...exampleDetails(value)};
  }
  return {field:null,usable:false,type:"absent"};
}
export function inspectPostDiscovery(input) {
  const messages=[];
  const add=(level,code,path,message)=>messages.push(rule(level,code,path,message));
  if(!isRecord(input)) return {
    valid:false,summary:{method:"unknown",hasInlinePostExample:false,hasExampleUrl:false,hasOpenApiPointer:false,errors:1,warnings:0},
    findings:[rule("error","INVALID_DISCOVERY_ROOT","$","Expected one explicitly documented vendor discovery object; not a native x402 manifest.")],
    notes:["No chain, wallet, sign, HTTP request or actual merchant verification was performed."]
  };
  const isWrapped = isRecord(input.resource);
  const resource=isWrapped?input.resource:input;
  const base=isWrapped?"$.resource":"$";
  const method=isNonemptyText(resource.method)?resource.method.trim().toUpperCase():"";
  if(!method) add("warning","HTTP_METHOD_NOT_SPECIFIED",base+".method",
    "No explicit HTTP method. A plain x402 manifest need not declare one; do not infer POST from a URL.");
  else if(!/^[A-Z]+$/.test(method) || !["GET","POST","PUT","PATCH","DELETE","HEAD"].includes(method))
    add("warning","UNRECOGNIZED_HTTP_METHOD",base+".method","Confirm the advertised HTTP method against the authoritative API documentation.");
  const uri=resource.url ?? resource.resource;
  if(!httpsURL(uri)) add("error","INVALID_DISCOVERY_URL",base+".url","Provide a public HTTPS URL with no URL-embedded credentials. The checker never opens it.");
  const contentType=isNonemptyText(resource.contentType)?resource.contentType.trim().toLowerCase():"";
  const body=inlineExample(resource);
  const exampleUrl=resource.requestBodyExampleUrl ?? resource.exampleBodyUrl;
  const hasExampleUrl=typeof exampleUrl!=="undefined" && exampleUrl!==null;
  const exampleUrlValid=hasExampleUrl && httpsURL(exampleUrl);
  const openapi=resource.openapiSpecUrl;
  const hasOpenApiPointer=typeof openapi==="string" && httpsURL(openapi);
  if(hasExampleUrl && !exampleUrlValid) add("warning","POST_EXAMPLE_LINK_INVALID",base+".requestBodyExampleUrl",
    "The published requestBodyExampleUrl is not an HTTPS URL without credentials; no remote content was fetched.");
  if(openapi!==undefined && !hasOpenApiPointer) add("warning","OPENAPI_LOCATION_UNCHECKED",base+".openapiSpecUrl",
    "The advertised OpenAPI document URL is not an HTTPS URL without credentials; no remote spec was fetched.");
  if(method==="POST") {
    if(!contentType) add("warning","POST_CONTENT_TYPE_UNSPECIFIED",base+".contentType",
      "Document Content-Type for a paid POST so machine buyers can prepare a request before attempting x402.");
    else if(!/^application\/json(?:\s*;.*)?$/.test(contentType)) add("info","NON_JSON_POST_BODY_UNEVALUATED",base+".contentType",
      "Only inline JSON object/array examples are inspected here; use the documented content-type and never guess a JSON body.");
    if(body.field && !body.usable) add("warning","POST_INLINE_EXAMPLE_INVALID",base+"."+body.field,
      "A POST body example was declared but is not a nonempty JSON object/array; supply a fully fictional valid-shaped example.");
    if(!body.usable && !exampleUrlValid) add("warning","POST_BODY_EXAMPLE_DISCOVERY_GAP",base,
      "Explicit POST has no usable inline JSON example or valid HTTPS example link in this vendor discovery wrapper. Agents may receive 400/422 before any 402 quote; add nonsecret sample input in your own discovery/OpenAPI. Missing this optional wrapper field does NOT invalidate a normative x402 manifest.");
    if(!body.usable && exampleUrlValid) add("warning","POST_EXAMPLE_LINK_NOT_FETCHED",base+".requestBodyExampleUrl",
      "Only an HTTPS example link was supplied. The checker did not fetch its content or verify that the example satisfies this API's schema.");
    if(body.usable && contentType && !contentType.startsWith("application/json"))
      add("warning","BODY_EXAMPLE_CONTENT_TYPE_REVIEW",base+".contentType",
        "JSON-shaped body example and non-JSON Content-Type appear together; confirm the documented HTTP request encoding.");
  } else if(body.usable) {
    add("info","INLINE_EXAMPLE_PRESENT_NO_POST_ASSUMPTION",base+"."+body.field,
      "An inline example is present, but this resource is not explicitly labelled POST. No conclusion about POST eligibility.");
  }
  if(body.usable) add("info","INLINE_JSON_SHAPE_PRESENT",base+"."+body.field,
    "The vendor published a nonempty JSON-shaped example. Its field semantics, auth, permissions and server acceptance were NOT verified.");
  const errors=messages.filter(x=>x.level==="error").length;
  const warnings=messages.filter(x=>x.level==="warning").length;
  return {
    valid:errors===0,
    summary:{method:method||"unspecified",hasInlinePostExample:body.usable,
      hasExampleUrl:exampleUrlValid,hasOpenApiPointer,errors,warnings},
    findings:messages,
    notes:[
      "This is a vendor-specific OPTIONAL pre-payment POST discovery check, NOT a normative x402 manifest validator or HTTP client.",
      "A bare 400/422 for missing request body may occur before payment; it is not evidence that a buyer paid, failed to pay or received service.",
      "No URL, OpenAPI document, HTTP 402 response, transaction, facilitator, wallet or payload was fetched, signed or verified.",
      "Use only PUBLIC or invented metadata. No customer records, credentials, signed headers, wallet seeds or private HTTP logs."
    ]
  };
}
export function parsePostDiscovery(text) {
  if(typeof text!=="string" || new TextEncoder().encode(text).byteLength>MAX_DISCOVERY_BYTES)
    throw new RangeError("Vendor discovery example exceeds 16 KiB; paste only non-secret public minimal metadata.");
  let data;
  try {data=JSON.parse(text);}
  catch {throw new SyntaxError("Expected a valid public JSON discovery object; not raw signed HTTP headers.");}
  return inspectPostDiscovery(data);
}
export function fictionalPostDiscovery() {
  return {
    schemaVersion:1,
    kind:"fictional_x402_unsigned_request_example",
    resource:{
      method:"POST",
      url:"https://example.org/fictional-paid-csv",
      contentType:"application/json",
      requestBodyExample:{
        csvText:"columnA,columnB\nfictional,example",
        expectedColumns:["columnA","columnB"]
      },
      requestBodyExampleUrl:"https://example.org/fictional-request-example.json",
      openapiSpecUrl:"https://example.org/fictional-openapi.json"
    },
    note:"Fictional only, no URL corresponds to an owned service or payable merchant."
  };
}
export function fictionalMissingBodyDiscovery() {
  const obj=fictionalPostDiscovery();
  delete obj.resource.requestBodyExample;
  delete obj.resource.requestBodyExampleUrl;
  return obj;
}
