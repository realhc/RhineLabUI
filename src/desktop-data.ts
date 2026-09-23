import content from "../content/archives.json" with { type: "json" };
export interface ArchiveRecord { id:string; title:string; en:string; department:string; category:string; date:string; lead:string; clearance:string; abstract:string; findings:string[]; source:string; }
let pinnedDocumentId: string | undefined;
export let desktopDocuments: RhineDocument[] = [];
export const records: ArchiveRecord[] = content.records.map(record => ({...record}));
export const categories = ["全部档案", ...content.categories];
export const archiveColumns = [...content.columns];
// Forty exhibit slots preserve the exact original camera and array geometry.
// They are a view of the library; the editor indexes every Markdown document.
const slotLanes = content.records.map(record => content.columns.indexOf(record.category));
const slots = content.columns.map((_, lane) => slotLanes.flatMap((value,index) => value === lane ? [index] : []));
const original = new Map(content.records.map(record => [record.id, record]));
function recordFor(doc: RhineDocument | undefined, index:number): ArchiveRecord {
  if (!doc) return {id:'EMPTY-'+index,title:'空档案位 · 新建文档',en:'NEW ARCHIVE',department:'本地知识库',category:content.columns[slotLanes[index]],date:'—',lead:'—',clearance:'AVAILABLE',abstract:'从 ARCHIVE INDEX 创建第一篇 Markdown 文档。',findings:[],source:''};
  const sample = original.get(doc.id);
  const metadata = sample ? [["英文名称",sample.en],["部门",sample.department],["档案日期",sample.date],["负责人",sample.lead],["访问级别",sample.clearance]].filter(([,value])=>value).map(([label,value])=>'- **'+label+'**：'+value).join('\n') : '';
  const sampleBody = sample ? '# '+sample.title+'\n\n'+metadata+'\n\n## 摘要\n\n'+sample.abstract+'\n\n## 研究记录\n\n'+sample.findings.map(item=>'- '+item).join('\n')+'\n\n## 参考来源\n\n[参考来源]('+sample.source+')\n' : '';
  const unchanged = sample && doc.body === sampleBody;
  return {...(unchanged ? sample : {en:'LOCAL ARCHIVE',department:doc.category || '未分类',date:doc.modified.slice(0,10),lead:'LOCAL WORKSPACE',clearance:'LOCAL DOCUMENT',abstract:doc.body,findings:[],source:''}), id:doc.id,title:doc.title,category:doc.category || '未分类'};
}
export function setDesktopDocuments(documents:RhineDocument[]) {
  desktopDocuments = [...documents];
  records.splice(0,records.length,...Array.from({length:40},(_,index)=>recordFor(desktopDocuments[index],index)));
  if (pinnedDocumentId) exhibitDocument(pinnedDocumentId);
}
export function exhibitDocument(id:string) {
  pinnedDocumentId = id;
  let index = records.findIndex(record=>record.id===id);
  if (index >= 0) return index;
  const doc = desktopDocuments.find(doc=>doc.id===id);
  if (!doc) return -1;
  index=39; records[index]=recordFor(doc,index); return index;
}
export function documentForRecord(index:number) { return desktopDocuments.find(doc=>doc.id===records[index]?.id); }
export function displayCode(index:number) { const id=records[index].id; return /^X-\d+$/.test(id) ? Number(id.slice(2)) : index+1; }
export function columnFiles(lane:number) { return slots[lane] ?? slots[0]; }
export function fileLocation(index:number) { const lane=slotLanes[index] ?? 0; const row=12+columnFiles(lane).indexOf(index); return {lane,row,slot:lane*32+row}; }
export function fileAtSlot(slot:number) { const files=columnFiles(Math.floor(slot/32)); return files[Math.max(0,Math.min(files.length-1,(slot%32)-12))]; }
