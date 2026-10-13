const fs=require('node:fs');
const path=require('node:path');
const {load,FILES,INPUTS}=require('./engine.cjs');
const {buildSchema}=require('./schema.cjs');
(async()=>{
 const books=await load();
 const groups=buildSchema(books);
 for(const field of groups.flatMap(group=>group.fields))
  field.default=books[field.book].workbook.getWorksheet(field.sheet).getCell(field.cell).value??null;
 const workbooks={};
 for(const [key,{workbook,engine}] of Object.entries(books)){
  const sheets={};
  for(const sheet of workbook.worksheets)sheets[sheet.name]=engine.getSheetSerialized(engine.getSheetId(sheet.name));
  const names=workbook.definedNames.model.filter(item=>item.name&&item.ranges?.[0]&&/^[\w.]+$/.test(item.name)).map(item=>({name:item.name,expression:'='+item.ranges[0]}));
  workbooks[key]={sheets,names};
 }
 const crops=[];const cropSheet=books.scenario.workbook.getWorksheet('Crop Database');
 for(let row=5;row<=34;row++){const name=cropSheet.getCell('A'+row).value;if(typeof name==='string')crops.push(name)}
 const defaults={};
 for(const [key,targets] of Object.entries(INPUTS))for(const [book,[sheet,cell]] of Object.entries(targets))defaults[book+'|'+sheet+'|'+cell]=books[book].workbook.getWorksheet(sheet).getCell(cell).value??null;
 const data={workbooks,groups,crops,defaults,files:FILES};
 const out=path.join(__dirname,'public'),staticDir=path.join(__dirname,'static','models');fs.mkdirSync(staticDir,{recursive:true});
 for(const file of Object.values(FILES))fs.copyFileSync(path.join(__dirname,'models',file),path.join(staticDir,file));
 fs.writeFileSync(path.join(out,'workbook-data.json'),JSON.stringify(data));
 console.log('Built browser workbook data:',(fs.statSync(path.join(out,'workbook-data.json')).size/1024/1024).toFixed(2)+' MB');
})().catch(err=>{console.error(err);process.exitCode=1});
