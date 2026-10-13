const months=['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'];
function spec(book,sheet,cell,label,type='number',options=[]){return {id:book+'|'+sheet+'|'+cell,book,sheet,cell,label,type,options};}
function listOptions(cell){const f=cell.dataValidation?.formulae?.[0];if(typeof f!=='string')return [];
 const match=f.match(/^"(.*)"$/);
 if(match)return match[1].split(',');
 if(f.startsWith('_xlfn._LONGTEXT('))return [...f.matchAll(/"([^"]*)"/g)].map(x=>x[1]).join('').split(',');
 return []; 
}
function buildSchema(books){const groups=[];const diag=books.diagnosis.workbook;
 const check=diag.getWorksheet('Section A - Field Checklist');
 const diagnosis=[];
 for(let row=5;row<=39;row++){
  const label=check.getCell('G'+row).value;
  if(typeof label!=='string'||!check.getCell('E'+row).dataValidation?.type)continue;
  const options=listOptions(check.getCell('E'+row));
  diagnosis.push(spec('diagnosis',check.name,'E'+row,label+' — category','select',['',...options]));
  diagnosis.push(spec('diagnosis',check.name,'F'+row,label+' — '+([17,18,38].includes(row)?'description':'measured value'),[17,18,38].includes(row)?'text':'number'));
 }
 groups.push({name:'Complete field checklist',note:'Every category and manual measurement from Section A. Choose a category or enter a measured value. Category values are converted using the workbook’s own formula.',fields:diagnosis});
 const dash=diag.getWorksheet('Dashboard');
 const thresholds=[spec('diagnosis',dash.name,'K2','Reset diagnostic results','select',listOptions(dash.getCell('K2')))];
 for(let r=4;r<=35;r++){
  const value=dash.getCell('Q'+r).value;
  if(typeof value==='number')thresholds.push(spec('diagnosis',dash.name,'Q'+r,String(dash.getCell('P'+r).value)+' · '+(r<=21?'threshold':'texture factor')));
 }
 groups.push({name:'Diagnostic thresholds & reset',note:'The original Dashboard threshold/factor cells and LIVE/RESET dropdown. Changing these changes the original diagnosis and measure formulas.',fields:thresholds});
 const sh=books.scenario.workbook.getWorksheet('W&S Balance Model');
 const crops=[];const cropSheet=books.scenario.workbook.getWorksheet('Crop Database');for(let r=5;r<=34;r++){let v=cropSheet.getCell('A'+r).value;if(typeof v==='string')crops.push(v)}
 const scenario=[];
 for(const r of [5,6,7,9,10,11,13,14,15,16,17]){
  const cell='B'+r,label=sh.getCell('A'+r).value;let options=listOptions(sh.getCell(cell));
  if(r===5)options=crops;
  if(r===9 && !options.length)options=['[Auto-Select / Recommended Pioneer Crop]',...crops];
  scenario.push(spec('scenario',sh.name,cell,label,options.length?'select':'number',options));
 }
 for(const row of [28,30])for(let col=5;col<=16;col++){
  const cell=sh.getRow(row).getCell(col);
  scenario.push(spec('scenario',sh.name,cell.address,(row===28?'Manual irrigation':'Rootzone moisture change')+' · '+months[col-5]));
 }
 groups.push({name:'Crop, irrigation & flushing scenario',note:'Direct controls from W&S Balance Model, including twelve months of manual irrigation and moisture change.',fields:scenario});
 const soil=books.scenario.workbook.getWorksheet('Soil & Climate Inputs');const soilFields=[];
 for(let r of [5,6,7,8,9,10,13]){let cell='C'+r;let options=listOptions(soil.getCell(cell));soilFields.push(spec('scenario',soil.name,cell,soil.getCell('A'+r).value,options.length?'select':'number',options))}
 const location=books.scenario.workbook.getWorksheet('Soil & Climate Inputs');
 for(const row of [29,30])for(let col=3;col<=14;col++){let cell=location.getRow(row).getCell(col);soilFields.push(spec('scenario',location.name,cell.address,'Custom station '+(row===29?'ETo':'rain')+' · '+months[col-3],'number'))}
 for(let row=19;row<=28;row++)for(let col=3;col<=14;col++){
  const cell=location.getRow(row).getCell(col);
  if(typeof cell.value==='number')soilFields.push(spec('scenario',location.name,cell.address,location.getCell('A'+row).value+' · '+location.getCell('B'+row).value+' · '+months[col-3]));
 }
 groups.push({name:'Soil & climate',note:'Physical soil inputs, every climate preset and all twelve monthly custom-station ETo and rain values.',fields:soilFields});
 const database=books.scenario.workbook.getWorksheet('Crop Database'),cropFields=[];
 for(let row=5;row<=34;row++)for(let col=3;col<=23;col++){
  const cell=database.getRow(row).getCell(col),value=cell.value;
  if(value===null||typeof value==='object')continue;
  const heading=database.getRow(4).getCell(col).value;
  cropFields.push(spec('scenario',database.name,cell.address,database.getCell('A'+row).value+' · '+heading,col===9?'select':'number',col===9?months:[]));
 }
 groups.push({name:'Crop database parameters',note:'All source numeric tolerance, yield, growth and Kc values plus planting months. Crop names, descriptive classifications and calculated columns are visible in Source sheets.',fields:cropFields});
 const bal=books.balance.workbook;const balance=[];
 for(const sheet of ['Balance (Optimized)','Balance (Manual)']){
  const ws=bal.getWorksheet(sheet);
  for(const r of [4,5,6,7,8])balance.push(spec('balance',sheet,'D'+r,sheet+': '+ws.getCell('C'+r).value));
  for(const r of (sheet==='Balance (Manual)'?[14,15,18,19]:[14,15,19])){
   for(let col=6;col<=17;col++){let cell=ws.getRow(r).getCell(col);balance.push(spec('balance',sheet,cell.address,sheet+': '+ws.getCell('C'+r).value+' · '+months[col-6]));}
  }
 }
 groups.push({name:'Original water balance · optimized & manual',note:'All monthly E, P, dW and manual irrigation inputs are editable. The two balance tabs are separate from the exploratory scenario.',fields:balance});
 return groups;
}
module.exports={buildSchema};
