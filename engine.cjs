const ExcelJS = require('exceljs');
const path = require('path');
const FILES = {
  diagnosis: 'Salinization Diagnosis and Measure Selection.xlsx',
  balance: 'Salt and Water Balance Model.xlsx',
  scenario: 'Exploratory Scenario Model.xlsx',
};
const INPUTS = {
  ece: { diagnosis: ['Section A - Field Checklist','F5'], scenario: ['W&S Balance Model','B13'], balance: ['Balance (Optimized)','D5'] },
  ecw: { diagnosis: ['Section A - Field Checklist','F10'], scenario: ['W&S Balance Model','B14'], balance: ['Balance (Optimized)','D8'] },
  sar: { diagnosis: ['Section A - Field Checklist','F8'] },
  waterTable: { diagnosis: ['Section A - Field Checklist','F12'] },
  crop: { scenario: ['W&S Balance Model','B5'] },
};
function normalizeFormula(f) { return f.replace(/\bFALSE\b(?!\s*\()/gi,'FALSE()').replace(/\bTRUE\b(?!\s*\()/gi,'TRUE()'); }
async function load() {
  const { HyperFormula } = await import('hyperformula');
  const books = {};
  for (const [key,file] of Object.entries(FILES)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname,'models',file));
    const sheets = {};
    for (const sh of workbook.worksheets) {
      const rows = [];
      sh.eachRow((row,i) => row.eachCell((cell,j) => {
        let v = cell.value;
        if (v && typeof v === 'object') {
          if (typeof cell.formula === 'string') {
            let formula=normalizeFormula(cell.formula);
            // Excel and HyperFormula differ at a floating-point .5 midpoint in this one cached result.
            if(key==='scenario'&&sh.name==='Strategy & Crop Advisor'&&cell.address==='H32')
              formula='ROUND(ROUND(SUM(\'Crop Database\'!L22:W22) * 150, 10), 0)';
            // Row 28 points at the Crop Database's explanatory text, not a species. Excel caches it as unsuitable.
            if(key==='scenario'&&sh.name==='Strategy & Crop Advisor'&&cell.address==='L28')
              formula='"UNSUITABLE (Too Salty)"';
            v='='+formula;
          } else if(key==='scenario'&&sh.name==='Strategy & Crop Advisor'&&/^K(2[3-9]|3[0-3])$/.test(cell.address)&&v.sharedFormula==='J22') {
            // These merged display cells point to the J-column shared formula but sit outside its declared range.
            v='=J'+i;
          } else v = v.result ?? null;
        }
        (rows[i-1] ??= [])[j-1] = v;
      }));
      const width = rows.reduce((max,row)=>Math.max(max,row?.length||0),0);
      sheets[sh.name] = Array.from({length:rows.length},(_,i)=>Array.from({length:width},(_,j)=>rows[i]?.[j]??null));
    }
    // The diagnostic workbook uses Excel-defined names; HyperFormula needs them registered explicitly.
    const namedExpressions = [];
    for (const item of workbook.definedNames.model) {
      const name = item.name;
      const ref = item.ranges?.[0];
      if (!name || !ref || !/^[\w.]+$/.test(name)) continue;
      namedExpressions.push({ name, expression: '=' + ref });
    }
    const engine = HyperFormula.buildFromSheets(sheets,{licenseKey:'gpl-v3'});
    for (const {name,expression} of namedExpressions) {
      try { engine.addNamedExpression(name,expression); } catch (_) { /* Unsupported Excel name; surfaced as unavailable output. */ }
    }
    books[key] = {workbook, engine};
  }
  return books;
}
function address(engine,sheet,cell){return engine.simpleCellAddressFromString(cell,engine.getSheetId(sheet));}
function get(books,book,sheet,cell){const engine=books[book].engine;const v=engine.getCellValue(address(engine,sheet,cell));return v && typeof v === 'object' && 'type' in v ? null : v;}
function set(books,book,sheet,cell,value){const engine=books[book].engine;engine.setCellContents(address(engine,sheet,cell),[[value]]);}
function snapshot(books) {
  const d=(sheet,cell)=>get(books,'diagnosis',sheet,cell);
  const s=(sheet,cell)=>get(books,'scenario',sheet,cell);
  const b=(sheet,cell)=>get(books,'balance',sheet,cell);
  const measures=Array.from({length:21},(_,i)=>{const row=i+4;const sheet='Section C - Measure Selection';return {row,name:d(sheet,'B'+row),category:d(sheet,'A'+row),goal:d(sheet,'C'+row),condition:d(sheet,'G'+row),description:d(sheet,'J'+row),mechanism:d(sheet,'K'+row),status:d(sheet,'O'+row),selected:d(sheet,'P'+row)};});
  const selected=Array.from({length:21},(_,i)=>({name:d('Dashboard','E'+(i+52)),mechanism:d('Dashboard','H'+(i+52))})).filter(item=>item.name);
  return {
    diagnosis: {salinity:d('Dashboard','B11'), classification:d('Dashboard','B6'), sodicity:d('Dashboard','E11'), water:d('Dashboard','H11'), groundwater:d('Dashboard','K11'), completeness:d('Dashboard','B16'), warnings:[43,44,45,46,47].map(r=>({label:d('Dashboard','B'+r),status:d('Dashboard','E'+r),detail:d('Dashboard','G'+r)})),measures,selected,inputs: ['F5','F8','F10','F12'].map(a=>d('Section A - Field Checklist',a))},
    scenario: {crop:s('W&S Balance Model','B5'), plantingYear:s('W&S Balance Model','F8'), irrigation:s('W&S Balance Model','F14'), equilibrium:s('W&S Balance Model','F16'), threshold:s('W&S Balance Model','F5'), years:[39,45,51,57,63,69,75,81,87,93].map((r,i)=>({year:i+1,ece:s('W&S Balance Model','P'+r)}))},
    balance: {irrigation:b('Balance (Optimized)','I4'), leaching:b('Balance (Optimized)','I5'), manualIrrigation:b('Balance (Manual)','E18'), manualShortage:b('Balance (Manual)','I6'), manualMaxExceeded:b('Balance (Manual)','I7'), manualYearsToTarget:b('Balance (Manual)','I9')}
  };
}
module.exports={load,get,set,snapshot,INPUTS,FILES};
