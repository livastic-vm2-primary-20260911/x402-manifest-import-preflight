const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('/srv/multi-vm-agent/workspace/make_money/work/qa-manifestscope-20261021/node_modules/playwright-core');
const BASE='/srv/multi-vm-agent/workspace/make_money/work/vm2-x402-post-discovery-20261021';
const FILES=new Set(['/index.html','/app.mjs','/discovery-ui.mjs','/style.css','/lib/preflight.mjs','/lib/discovery.mjs']);
const TYPES={'.html':'text/html; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
  const p=(req.url||'').split('?')[0];
  const pathname=p==='/'?'/index.html':p;
  if(req.method!=='GET'||!FILES.has(pathname)){res.writeHead(404);res.end('not found');return;}
  res.setHeader('Content-Type',TYPES[path.extname(pathname)]||'text/plain');
  res.end(fs.readFileSync(BASE+pathname));
});
const report={atUTC:new Date().toISOString(),widths:[],passCount:0,failures:[],realExternalPaidCustomer:false,realPaymentExecuted:false};
(async()=>{
 let browser;
 try {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/';
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu']});
  for(const width of [320,390,768,1280]){
    const context=await browser.newContext({viewport:{width,height:880}});
    const page=await context.newPage();
    const errors=[],requests=[];
    page.on('pageerror',err=>errors.push(err.message));
    page.on('request',req=>requests.push(req.url()));
    const response=await page.goto(url,{waitUntil:'load',timeout:15000});
    assert.equal(response.status(),200);report.passCount++;
    assert.equal(await page.locator('#discovery-source').isVisible(),true);report.passCount++;
    assert.match(await page.locator('#discovery-source').inputValue(),/fictional-paid-csv/);report.passCount++;
    assert.match((await page.locator('#discovery-source').inputValue()),/fictional_x402_unsigned_request_example/);report.passCount++;
    await page.locator('#discovery-analyze').click();
    assert.equal(await page.locator('#discovery-results').isVisible(),true);report.passCount++;
    assert.match(await page.locator('#discovery-findings').innerText(),/INLINE_JSON_SHAPE_PRESENT/);report.passCount++;
    assert.doesNotMatch(await page.locator('#discovery-findings').innerText(),/POST_BODY_EXAMPLE_DISCOVERY_GAP/);report.passCount++;
    await page.locator('[data-discovery-example="postMissingBody"]').click();
    await page.locator('#discovery-analyze').click();
    assert.match(await page.locator('#discovery-findings').innerText(),/POST_BODY_EXAMPLE_DISCOVERY_GAP/);report.passCount++;
    assert.equal(await page.locator('#discovery-results').isVisible(),true);report.passCount++;
    assert.match(await page.locator('#discovery-verdict').innerText(),/structurally readable/);report.passCount++;
    await page.locator('#discovery-source').fill('{broken');
    await page.locator('#discovery-analyze').click();
    assert.equal(await page.locator('#discovery-error').isVisible(),true);report.passCount++;
    assert.equal(await page.locator('#discovery-results').isVisible(),false);report.passCount++;
    await page.locator('#discovery-clear').click();
    assert.equal(await page.locator('#discovery-source').inputValue(),'');report.passCount++;
    await page.locator('#sample').click();
    assert.equal(await page.locator('#result').isVisible(),true);report.passCount++;
    assert.match(await page.locator('#resourcesCount').innerText(),/123/);report.passCount++;
    assert.match(await page.locator('#railsCount').innerText(),/492/);report.passCount++;
    const display=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,csp:document.querySelector('meta[http-equiv="Content-Security-Policy"]').content}));
    assert.ok(display.scrollWidth<=display.windowWidth+1,'mobile horizontal overflow width='+width+', scrollWidth='+display.scrollWidth+', innerWidth='+display.windowWidth);report.passCount++;
    assert.match(display.csp,/connect-src 'none'/);report.passCount++;
    assert.deepEqual(errors,[]);report.passCount++;
    assert.equal(requests.filter(req=>!req.startsWith(url)).length,0);report.passCount++;
    report.widths.push({width,pass:true,clientExternalRequests:0,scriptExceptions:0,overflowPx:Math.max(0,display.scrollWidth-display.windowWidth)});
    await context.close();
  }
 }catch(err){report.failures.push(err.stack||err.message);process.exitCode=1}
 finally {
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify(report,null,2));
 }
})().catch(err=>{console.error(err);process.exitCode=1});
