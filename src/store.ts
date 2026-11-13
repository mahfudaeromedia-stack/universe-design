import {create} from 'zustand';
import {createDocument} from './model';
import type {LayerItem,Tool,VectorDocument} from './model';
export type {LayerItem as Shape} from './model';

type State={
 doc:VectorDocument;selected:string|null;tool:Tool;zoom:number;past:VectorDocument[];future:VectorDocument[];interactionBase:VectorDocument|null;
 setTool:(t:Tool)=>void;select:(id:string|null)=>void;add:(s:LayerItem)=>void;addTransient:(s:LayerItem)=>void;update:(id:string,p:Partial<LayerItem>)=>void;
 resizeCanvas:(width:number,height:number)=>void;
 updateTransient:(id:string,p:Partial<LayerItem>)=>void;beginInteraction:()=>void;endInteraction:()=>void;
 remove:()=>void;undo:()=>void;redo:()=>void;setZoom:(n:number)=>void;load:(doc:VectorDocument)=>void;
 toggleVisible:(id:string)=>void;toggleLocked:(id:string)=>void;moveLayer:(id:string,dir:-1|1)=>void;
};
const commit=(st:State,next:VectorDocument)=>({doc:next,past:[...st.past,st.doc].slice(-100),future:[]});
export const useStore=create<State>((set)=>({
 doc:createDocument(),selected:null,tool:'select',zoom:1,past:[],future:[],interactionBase:null,
 setTool:tool=>set({tool}),select:selected=>set({selected}),
 add:s=>set(st=>({...commit(st,{...st.doc,items:[...st.doc.items,s]}),selected:s.id})),
 addTransient:s=>set(st=>({doc:{...st.doc,items:[...st.doc.items,s]},selected:s.id})),
 update:(id,p)=>set(st=>commit(st,{...st.doc,items:st.doc.items.map(x=>x.id===id?{...x,...p}:x)})),
 resizeCanvas:(width,height)=>set(st=>width===st.doc.artboard.width&&height===st.doc.artboard.height
  ? st : commit(st,{...st.doc,artboard:{...st.doc.artboard,width,height}})),
 beginInteraction:()=>set(st=>({interactionBase:st.interactionBase??st.doc})),
 updateTransient:(id,p)=>set(st=>({doc:{...st.doc,items:st.doc.items.map(x=>x.id===id?{...x,...p}:x)}})),
 endInteraction:()=>set(st=>st.interactionBase&&st.interactionBase!==st.doc?({past:[...st.past,st.interactionBase].slice(-100),future:[],interactionBase:null}):({interactionBase:null})),
 remove:()=>set(st=>st.selected?({...commit(st,{...st.doc,items:st.doc.items.filter(x=>x.id!==st.selected)}),selected:null}):st),
 undo:()=>set(st=>{if(!st.past.length)return st;const prev=st.past[st.past.length-1]!;return{doc:prev,past:st.past.slice(0,-1),future:[st.doc,...st.future],selected:null,interactionBase:null}}),
 redo:()=>set(st=>{if(!st.future.length)return st;return{doc:st.future[0],past:[...st.past,st.doc],future:st.future.slice(1),selected:null,interactionBase:null}}),
 setZoom:zoom=>set({zoom:Math.max(.2,Math.min(4,zoom))}),load:doc=>set({doc,selected:null,past:[],future:[],interactionBase:null}),
 toggleVisible:id=>set(st=>commit(st,{...st.doc,items:st.doc.items.map(x=>x.id===id?{...x,visible:!x.visible}:x)})),
 toggleLocked:id=>set(st=>commit(st,{...st.doc,items:st.doc.items.map(x=>x.id===id?{...x,locked:!x.locked}:x)})),
 moveLayer:(id,dir)=>set(st=>{const items=[...st.doc.items],i=items.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=items.length)return st;[items[i],items[j]]=[items[j],items[i]];return commit(st,{...st.doc,items})})
}));
