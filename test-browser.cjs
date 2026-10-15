const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const {createServer}=await import('vite');
 const oldFetch=global.fetch;
 global.fetch=async url=>url.protocol==='file:'?new Response(await fs.readFile(url),{status:200}):oldFetch(url);
 const vite=await createServer({server:{middlewareMode:true},appType:'custom',optimizeDeps:{noDiscovery:true}});
 try{
  const api=await vite.ssrLoadModule('/local-api.js');
  const sample={ece:9,ecw:2,sar:10,waterTable:2.5,crop:'Barley'};
  let result=await api.calculate({ece:'',ecw:'',sar:'',waterTable:'',crop:'Barley',fields:{},selections:{}});
  assert.equal(result.result.diagnosis.classification,'Insufficient data');
  assert.equal(result.result.scenario.crop,'Barley');
  result=await api.calculate({...sample,fields:{},selections:{}});
  assert.equal(result.result.diagnosis.classification,"Saline Soil ('White Alkali')");
  assert.equal(result.result.scenario.plantingYear,'Year 2');
  assert.equal(result.result.diagnosis.selected.length,0);
  assert.ok(Math.abs(result.result.scenario.years[0].ece-7.657021424569897)<1e-6);
  result=await api.calculate({...sample,fields:{'diagnosis|Section A - Field Checklist|E8':'≥ 13.0 (mmol/L)^0.5'},selections:{11:true}});
  assert.equal(result.result.diagnosis.classification,'Saline-Sodic Soil');
  assert.equal(result.result.diagnosis.selected[0].name,'Gypsum Application (CaSO4·2H2O)');
  result=await api.calculate({...sample,fields:{},selections:{}});
  assert.equal(result.result.diagnosis.classification,"Saline Soil ('White Alkali')");
  assert.equal(result.result.diagnosis.selected.length,0);
  const sheet=await api.sheet('diagnosis','Section C - Measure Selection');
  assert.equal(sheet.rows.length,25);
  console.log('Browser calculation and reset checks passed.');
 }finally{await vite.close();global.fetch=oldFetch}
})().catch(error=>{console.error(error);process.exitCode=1});
