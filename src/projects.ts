import {migrateDocument} from './model';
import type {VectorDocument} from './model';
const DATABASE='vector-studio-projects';const STORE='documents';
export type ProjectRecord={id:string;owner:string;name:string;updatedAt:number;doc:VectorDocument};
const openDb=()=>new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(DATABASE,1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
async function transaction<T>(mode:IDBTransactionMode,task:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(reason:unknown)=>void)=>void){const db=await openDb();return new Promise<T>((resolve,reject)=>{const tx=db.transaction(STORE,mode);task(tx.objectStore(STORE),resolve,reject);tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error)}})}
export const saveProject=(project:ProjectRecord)=>transaction<void>('readwrite',(store,resolve,reject)=>{const r=store.put(project);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)});
export const getProjects=async(owner:string)=>{const all=await transaction<ProjectRecord[]>('readonly',(store,resolve,reject)=>{const r=store.getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return all.filter(p=>p.owner===owner).sort((a,b)=>b.updatedAt-a.updatedAt)};
export const getProject=async(id:string,owner:string)=>{const row=await transaction<ProjectRecord|undefined>('readonly',(store,resolve,reject)=>{const r=store.get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return row?.owner===owner?{...row,doc:migrateDocument(row.doc)}:null};
export const deleteProject=async(id:string,owner:string)=>{const row=await getProject(id,owner);if(!row)return;await transaction<void>('readwrite',(store,resolve,reject)=>{const r=store.delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})};
