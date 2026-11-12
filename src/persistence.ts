import {migrateDocument} from './model';
import type {VectorDocument} from './model';
const KEY='vector-studio-doc-v2';
export const saveLocal=(doc:VectorDocument)=>localStorage.setItem(KEY,JSON.stringify(doc));
export const loadLocal=():VectorDocument|null=>{try{const raw=localStorage.getItem(KEY)||localStorage.getItem('vector-studio-doc');return raw?migrateDocument(JSON.parse(raw)):null}catch{return null}};
