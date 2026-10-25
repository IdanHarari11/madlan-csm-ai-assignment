import rows from '../data/deals.json';
import { normalizeDataset,checkDataQuality } from './domain';
export const DATA_VERSION='madlan-sample-v1';
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function dataset(asOf=today()){return normalizeDataset(rows,asOf);}
export function overview(){const ds=dataset();return {version:DATA_VERSION,asOf:today(),...checkDataQuality(ds),cities:[...new Set(ds.map(d=>d.city))].sort(),propertyTypes:[...new Set(ds.map(d=>d.propertyType))].sort()};}
