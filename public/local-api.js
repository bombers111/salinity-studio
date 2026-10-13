import {HyperFormula} from 'hyperformula';
let data,books,allowed;
const INPUTS={
 ece:{diagnosis:['Section A - Field Checklist','F5'],scenario:['W&S Balance Model','B13'],balance:['Balance (Optimized)','D5']},
 ecw:{diagnosis:['Section A - Field Checklist','F10'],scenario:['W&S Balance Model','B14'],balance:['Balance (Optimized)','D8']},
 sar:{diagnosis:['Section A - Field Checklist','F8']},
 waterTable:{diagnosis:['Section A - Field Checklist','F12']},
 crop:{scenario:['W&S Balance Model','B5']}
};
async function init(){
 if(books)return;
 const response=await fetch(new URL('./workbook-data.json',import.meta.url));
 if(!response.ok)throw Error('Workbook data could not be loaded');
 data=await response.json(); books={};
 for(const [key,book] of Object.entries(data.workbooks)){
  const engine=HyperFormula.buildFromSheets(book.sheets,{licenseKey:'gpl-v3'});
  for(const {name,expression} of book.names){try{engine.addNamedExpression(name,expression)}catch(error){console.warn('Unavailable Excel name:',name,error)}}
  books[key]=engine;
 }
 allowed=new Map(data.groups.flatMap(group=>group.fields.map(field=>[field.id,field])));
}
function addr(book,sheet,cell){const engine=books[book];return engine.simpleCellAddressFromString(cell,engine.getSheetId(sheet))}
function get(book,sheet,cell){const value=books[book].getCellValue(addr(book,sheet,cell));return value&&typeof value==='object'&&'type'in value?null:value}
function set(book,sheet,cell,value){books[book].setCellContents(addr(book,sheet,cell),[[value]])}
function snapshot(){
 const d=(sheet,cell)=>get('diagnosis',sheet,cell),s=(sheet,cell)=>get('scenario',sheet,cell),b=(sheet,cell)=>get('balance',sheet,cell);
 const measures=Array.from({length:21},(_,i)=>{const r=i+4,sh='Section C - Measure Selection';return {row:r,name:d(sh,'B'+r),category:d(sh,'A'+r),goal:d(sh,'C'+r),condition:d(sh,'G'+r),description:d(sh,'J'+r),mechanism:d(sh,'K'+r),status:d(sh,'O'+r),selected:d(sh,'P'+r)}});
 const selected=Array.from({length:21},(_,i)=>({name:d('Dashboard','E'+(i+52)),mechanism:d('Dashboard','H'+(i+52))})).filter(item=>item.name);
 return {
  diagnosis:{salinity:d('Dashboard','B11'),classification:d('Dashboard','B6'),sodicity:d('Dashboard','E11'),water:d('Dashboard','H11'),groundwater:d('Dashboard','K11'),completeness:d('Dashboard','B16'),warnings:[43,44,45,46,47].map(r=>({label:d('Dashboard','B'+r),status:d('Dashboard','E'+r),detail:d('Dashboard','G'+r)})),measures,selected},
  scenario:{crop:s('W&S Balance Model','B5'),plantingYear:s('W&S Balance Model','F8'),irrigation:s('W&S Balance Model','F14'),equilibrium:s('W&S Balance Model','F16'),threshold:s('W&S Balance Model','F5'),years:[39,45,51,57,63,69,75,81,87,93].map((r,i)=>({year:i+1,ece:s('W&S Balance Model','P'+r)}))},
  balance:{irrigation:b('Balance (Optimized)','I4'),leaching:b('Balance (Optimized)','I5'),manualIrrigation:b('Balance (Manual)','E18'),manualShortage:b('Balance (Manual)','I6')}
 };
}
export async function calculate(input){
 await init();const values={};
 for(const key of Object.keys(INPUTS)){
  let value=input[key];if(value==null||value===''){values[key]=null;continue}
  if(key==='crop'){if(!data.crops.includes(value))throw Error('Unknown crop');values[key]=value}
  else{value=Number(value);if(!Number.isFinite(value)||value<0||value>10000)throw Error('Invalid '+key);values[key]=value}
 }
 for(const field of allowed.values())set(field.book,field.sheet,field.cell,field.default??null);
 for(const [key,targets] of Object.entries(INPUTS))for(const [book,[sheet,cell]] of Object.entries(targets)){
  const value=values[key]===null?data.defaults[book+'|'+sheet+'|'+cell]:values[key];set(book,sheet,cell,value);
 }
 const changes=input.fields||{};
 for(const [id,raw] of Object.entries(changes)){
  const field=allowed.get(id);if(!field)throw Error('Unknown workbook control');
  if(raw==null||raw===''){set(field.book,field.sheet,field.cell,null);continue}
  let value;
  if(field.type==='select'){if(!field.options.includes(raw))throw Error('Invalid option for '+field.label);value=raw}
  else if(field.type==='text'){if(typeof raw!=='string'||raw.length>150||raw.startsWith('='))throw Error('Invalid text for '+field.label);value=raw}
  else{value=Number(raw);if(!Number.isFinite(value)||value<0||value>100000)throw Error('Invalid value for '+field.label)}
  set(field.book,field.sheet,field.cell,value);
 }
 const selections=input.selections||{};
 for(let row=4;row<=24;row++)set('diagnosis','Section C - Measure Selection','P'+row,selections[row]===true?'Selected':'Not Selected');
 return {result:snapshot(),values,crops:data.crops,groups:data.groups,worksheets:Object.fromEntries(Object.entries(data.workbooks).map(([key,b])=>[key,Object.keys(b.sheets)])),files:data.files};
}
export async function sheet(book,name){
 await init();const rows=data.workbooks[book]?.sheets[name];if(!rows)throw Error('Unknown sheet');
 const result=[];
 for(let r=0;r<rows.length;r++){
  const cells=[];
  for(let c=0;c<Math.min(rows[r].length,35);c++){
   if(rows[r][c]===null)continue;
   let n=c+1,col='';while(n){n--;col=String.fromCharCode(65+n%26)+col;n=Math.floor(n/26)}
   const address=col+(r+1),value=get(book,name,address);
   if(value!==null&&value!=='')cells.push({address,value:String(value)});
   else if(typeof rows[r][c]==='string'&&rows[r][c].startsWith('='))cells.push({address,value:'[Formula unavailable]'});
  }
  if(cells.length)result.push({number:r+1,cells});
 }
 return {book,sheet:name,rows:result};
}
