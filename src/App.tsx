import ImageDialog from './ImageDialog';
import type {ImageAction} from './ImageDialog';
import {imageTypes,openRaster} from './raster';
import {useEffect,useRef,useState} from 'react';
import type {CSSProperties, PointerEvent as ReactPointerEvent} from 'react';
import {useStore} from './store';
import type {Shape} from './store';
import {migrateDocument,normalizeItem} from './model';
import type {Tool} from './model';
import type {Anchor,Vec} from './geometry';
import {bounds,pathD,round,scaleAnchors,translateAnchors} from './geometry';
import {documentToSvg,download,readFileText,saveDocumentFile} from './io';
import {MousePointer2,Move,Pen,Square,Circle,Type,Hand,ZoomIn,ZoomOut,Undo2,Redo2,Trash2,Download,FolderOpen,Save,Grid3X3,ImagePlus,Eye,EyeOff,Lock,Unlock,ArrowUp,ArrowDown,Star,Hexagon,Minus,Copy,FlipHorizontal,FlipVertical,AlignHorizontalJustifyCenter,AlignVerticalJustifyCenter,Maximize2,Check,X} from 'lucide-react';

const uid=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2,12);
type Gesture =
 | {kind:'draw';id:string;start:Vec}
 | {kind:'move';id:string;start:Vec;shape:Shape}
 | {kind:'resize';id:string;start:Vec;shape:Shape;handle:string}
 | {kind:'rotate';id:string;shape:Shape;angle:number}
 | {kind:'anchor';id:string;shape:Shape;index:number;part:'point'|'in'|'out';start:Vec};
const mid=(s:Shape)=>({x:s.x+s.width/2,y:s.y+s.height/2});
const rad=(degrees:number)=>degrees*Math.PI/180;
const rotatePoint=(p:Vec,c:Vec,degrees:number):Vec=>({x:c.x+Math.cos(rad(degrees))*(p.x-c.x)-Math.sin(rad(degrees))*(p.y-c.y),y:c.y+Math.sin(rad(degrees))*(p.x-c.x)+Math.cos(rad(degrees))*(p.y-c.y)});
const handles=[['nw',0,0],['n',.5,0],['ne',1,0],['e',1,.5],['se',1,1],['s',.5,1],['sw',0,1],['w',0,.5]] as const;
const toolGroups:{title:string;items:{tool:Tool;label:string;Icon:typeof Square}[]}[]=[
 {title:'Select',items:[{tool:'select',label:'Selection (V)',Icon:MousePointer2},{tool:'direct',label:'Direct Selection (A)',Icon:Move}]},
 {title:'Draw',items:[{tool:'pen',label:'Bézier Pen (P)',Icon:Pen},{tool:'line',label:'Line (\\)',Icon:Minus}]},
 {title:'Shapes',items:[{tool:'rect',label:'Rectangle (R)',Icon:Square},{tool:'ellipse',label:'Ellipse (O)',Icon:Circle},{tool:'polygon',label:'Polygon',Icon:Hexagon},{tool:'star',label:'Star',Icon:Star}]},
 {title:'Content',items:[{tool:'text',label:'Text (T)',Icon:Type},{tool:'hand',label:'Hand (H)',Icon:Hand}]}
];
export default function App(){
 const {doc,selected,tool,zoom,past,future,setTool,select,add,addTransient,update,updateTransient,beginInteraction,endInteraction,remove,undo,redo,setZoom,load,toggleVisible,toggleLocked,moveLayer,resizeCanvas}=useStore();
 const {items,artboard}=doc;
 const [imageAction,setImageAction]=useState<ImageAction|null>(null);
 const current=items.find(s=>s.id===selected);
 const svg=useRef<SVGSVGElement>(null);
 const stage=useRef<HTMLElement>(null);
 const gesture=useRef<Gesture|null>(null);
 const [pen,setPen]=useState<Anchor[]>([]);
 const penRef=useRef<Anchor[]>([]);
 const [penDragging,setPenDragging]=useState(false);
 const [grid,setGrid]=useState(false);
 const [snap,setSnap]=useState(false);
 const [panel,setPanel]=useState<'properties'|'layers'>('properties');
 const [menu,setMenu]=useState<string|null>(null);
 const [space,setSpace]=useState(false);
 const [hint,setHint]=useState('Select a tool to begin. Pen: click to place anchors; drag to curve; Enter to finish.');
 const [viewportPan,setViewportPan]=useState({x:0,y:0});
 const handDrag=useRef<{x:number;y:number;pan:Vec}|null>(null);
 const choose=(next:Tool)=>{if(next!==tool&&penRef.current.length>=2)finishPen();else if(next!=='pen'){penRef.current=[];setPen([])};setTool(next);setMenu(null)};
 const snapPoint=(p:Vec):Vec=>snap?{x:Math.round(p.x/10)*10,y:Math.round(p.y/10)*10}:p;
 const point=(e:ReactPointerEvent):Vec=>{
  const matrix=svg.current?.getScreenCTM();
  if(matrix){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());return snapPoint({x:p.x,y:p.y})}
  return {x:0,y:0};
 };
 const capture=(e:ReactPointerEvent)=>{try{svg.current?.setPointerCapture(e.pointerId)}catch{/* pointer already released */}};
 const base=(type:Shape['type'],p:Vec):Shape=>normalizeItem({id:uid(),type,x:p.x,y:p.y,width:1,height:1,fill:'#ef8b35',stroke:'#253654',strokeWidth:2,name:type.charAt(0).toUpperCase()+type.slice(1)});
 const commitPath=(nodes:Anchor[],closed=false)=>{
  if(nodes.length<2)return;
  const b=bounds(nodes);
  add(normalizeItem({...base('path',b),...b,fill:closed?'#ef8b35':'none',stroke:'#253654',strokeWidth:3,anchors:nodes,closed,d:pathD(nodes,closed),name:closed?'Closed Bézier Path':'Bézier Path'}));
  setHint('Bézier path created. Press A to edit anchor points and handles.');
 };
 const finishPen=(closed=false)=>{commitPath(penRef.current,closed);penRef.current=[];setPen([]);setPenDragging(false)};
 const regularShape=(start:Vec,end:Vec,n:number,innerRatio=1):Anchor[]=>{
  const cx=(start.x+end.x)/2,cy=(start.y+end.y)/2,rx=(end.x-start.x)/2,ry=(end.y-start.y)/2;
  const count=n*(innerRatio===1?1:2);
  return Array.from({length:count},(_,i)=>{
   const angle=i/count*Math.PI*2-Math.PI/2, factor=innerRatio!==1&&i%2?innerRatio:1;
   return {x:cx+Math.cos(angle)*rx*factor,y:cy+Math.sin(angle)*ry*factor};
  });
 };
 const start=(e:ReactPointerEvent)=>{
  if(e.button!==0)return;
  if(tool==='hand'||space){e.preventDefault();handDrag.current={x:e.clientX,y:e.clientY,pan:viewportPan};capture(e);return}
  const p=point(e);
  if(tool==='pen'){
   if(penRef.current.length>=3&&Math.hypot(p.x-penRef.current[0].x,p.y-penRef.current[0].y)<12/zoom){finishPen(true);return}
   const a:Anchor={x:p.x,y:p.y};penRef.current=[...penRef.current,a];setPen([...penRef.current]);setPenDragging(true);capture(e);return;
  }
  if(['rect','ellipse','polygon','star','line'].includes(tool)){
   const type:Shape['type']=tool==='rect'||tool==='ellipse'?tool:'path';
   const shape=base(type,p);shape.name=tool[0].toUpperCase()+tool.slice(1);
   if(type==='path'){shape.fill=tool==='line'?'none':'#ef8b35';shape.anchors=tool==='line'?[p,{x:p.x+1,y:p.y+1}]:regularShape(p,{x:p.x+2,y:p.y+2},tool==='star'?5:6,tool==='star'?.47:1);shape.closed=tool!=='line';shape.d=pathD(shape.anchors,shape.closed)}
   beginInteraction();addTransient(shape);gesture.current={kind:'draw',id:shape.id,start:p};capture(e);return;
  }
  if(tool==='text'){
   add(normalizeItem({...base('text',p),type:'text',width:180,height:40,fill:'#253654',stroke:'none',strokeWidth:0,text:'Double-click to edit',name:'Text'}));return;
  }
  if(tool==='select'||tool==='direct')select(null);
 };
 const transformShape=(shape:Shape,rect:{x:number;y:number;width:number;height:number}):Partial<Shape>=>{
  if(shape.type==='path'&&shape.anchors?.length){const ax=shape.width?rect.width/shape.width:1,ay=shape.height?rect.height/shape.height:1;
   const anchors=scaleAnchors(translateAnchors(shape.anchors,rect.x-shape.x,rect.y-shape.y),{x:rect.x,y:rect.y},ax,ay);
   return {...rect,anchors,d:pathD(anchors,shape.closed)};
  }
  return rect;
 };
 const moving=(e:ReactPointerEvent)=>{
  if(handDrag.current){setViewportPan({x:handDrag.current.pan.x+e.clientX-handDrag.current.x,y:handDrag.current.pan.y+e.clientY-handDrag.current.y});return}
  if(tool==='pen'&&penDragging&&penRef.current.length){const p=point(e);const anchor=penRef.current[penRef.current.length-1]!;const changed={...anchor,out:p,in:{x:2*anchor.x-p.x,y:2*anchor.y-p.y}};penRef.current=[...penRef.current.slice(0,-1),changed];setPen([...penRef.current]);return}
  const g=gesture.current;if(!g)return;const p=point(e);
  if(g.kind==='draw'){
   const x=Math.min(g.start.x,p.x),y=Math.min(g.start.y,p.y),width=Math.max(1,Math.abs(p.x-g.start.x)),height=Math.max(1,Math.abs(p.y-g.start.y));
   const s=items.find(i=>i.id===g.id);if(!s)return;
   if(s.type==='path'){
    const anchors=s.name==='Line'?[g.start,p]:regularShape(g.start,p,s.name==='Star'?5:6,s.name==='Star'?.47:1);
    updateTransient(g.id,{x,y,width,height,anchors,d:pathD(anchors,s.closed)});
   }else updateTransient(g.id,{x,y,width,height});return;
  }
  if(g.kind==='move'){
   const dx=p.x-g.start.x,dy=p.y-g.start.y;
   const patch:Partial<Shape>={x:g.shape.x+dx,y:g.shape.y+dy};
   if(g.shape.anchors){patch.anchors=translateAnchors(g.shape.anchors,dx,dy);patch.d=pathD(patch.anchors,g.shape.closed)}
   updateTransient(g.id,patch);return;
  }
  if(g.kind==='resize'){
   const s=g.shape;
   const c=mid(s);const pp=rotatePoint(p,c,-(s.rotation||0));const initial=rotatePoint(g.start,c,-(s.rotation||0));
   const dx=pp.x-initial.x,dy=pp.y-initial.y;
   let l=s.x,r=s.x+s.width,t=s.y,b=s.y+s.height;
   if(g.handle.includes('w'))l+=dx;if(g.handle.includes('e'))r+=dx;
   if(g.handle.includes('n'))t+=dy;if(g.handle.includes('s'))b+=dy;
   if(e.shiftKey&&g.handle.length===2){
    const aspect=s.width/Math.max(1,s.height),w=Math.max(1,Math.abs(r-l)),h=Math.max(1,Math.abs(b-t));
    const constrainedW=w/h>aspect?h*aspect:w,constrainedH=w/h>aspect?h:w/aspect;
    if(g.handle.includes('w'))l=r-Math.sign(r-l)*constrainedW;else r=l+Math.sign(r-l)*constrainedW;
    if(g.handle.includes('n'))t=b-Math.sign(b-t)*constrainedH;else b=t+Math.sign(b-t)*constrainedH;
   }
   const rect={x:Math.min(l,r),y:Math.min(t,b),width:Math.max(1,Math.abs(r-l)),height:Math.max(1,Math.abs(b-t))};
   updateTransient(g.id,transformShape(s,rect));return;
  }
  if(g.kind==='rotate'){
   const a=Math.atan2(p.y-mid(g.shape).y,p.x-mid(g.shape).x)*180/Math.PI;
   updateTransient(g.id,{rotation:round((g.shape.rotation||0)+a-g.angle)});return;
  }
  if(g.kind==='anchor'&&g.shape.anchors){
   const dx=p.x-g.start.x,dy=p.y-g.start.y;
   const anchors=g.shape.anchors.map((a,i)=>{
    if(i!==g.index)return a;
    if(g.part==='point')return {...a,x:a.x+dx,y:a.y+dy,in:a.in?{x:a.in.x+dx,y:a.in.y+dy}:undefined,out:a.out?{x:a.out.x+dx,y:a.out.y+dy}:undefined};
    return {...a,[g.part]:{x:(a[g.part]||a).x+dx,y:(a[g.part]||a).y+dy}};
   });
   updateTransient(g.id,{...bounds(anchors),anchors,d:pathD(anchors,g.shape.closed)});
  }
 };
 const stop=()=>{handDrag.current=null;if(penDragging){setPenDragging(false);return}if(gesture.current){endInteraction();gesture.current=null}};
 const objectDown=(e:ReactPointerEvent,s:Shape)=>{
  if(!['select','direct'].includes(tool)||s.locked)return;
  e.stopPropagation();const p=point(e);select(s.id);beginInteraction();gesture.current={kind:'move',id:s.id,start:p,shape:structuredClone(s)};capture(e);
 };
 const beginHandle=(e:ReactPointerEvent,s:Shape,handle:string)=>{e.stopPropagation();if(s.locked)return;beginInteraction();gesture.current=handle==='rotate'?{kind:'rotate',id:s.id,shape:structuredClone(s),angle:Math.atan2(point(e).y-mid(s).y,point(e).x-mid(s).x)*180/Math.PI}:{kind:'resize',id:s.id,shape:structuredClone(s),handle,start:point(e)};capture(e)};
 const anchorDown=(e:ReactPointerEvent,s:Shape,index:number,part:'point'|'in'|'out')=>{e.stopPropagation();beginInteraction();gesture.current={kind:'anchor',id:s.id,shape:structuredClone(s),index,part,start:point(e)};capture(e)};
 const duplicate=()=>{if(!current)return;const s:Shape={...structuredClone(current),id:uid(),name:current.name+' copy',x:current.x+20,y:current.y+20};if(s.anchors){s.anchors=translateAnchors(s.anchors,20,20);s.d=pathD(s.anchors,s.closed)}add(s)};
 const flip=(axis:'x'|'y')=>{if(!current||current.locked)return;const c=mid(current);if(current.anchors){const anchors=current.anchors.map(a=>{const fn=(p:Vec)=>axis==='x'?{x:2*c.x-p.x,y:p.y}:{x:p.x,y:2*c.y-p.y};return {...fn(a),...(a.in?{in:fn(a.in)}:{}),...(a.out?{out:fn(a.out)}:{})}});update(current.id,{anchors,d:pathD(anchors,current.closed)})}else update(current.id,axis==='x'?{flipX:!current.flipX}:{flipY:!current.flipY})};
 const setShapeField=(patch:Partial<Shape>)=>{if(!current||current.locked)return;if(current.anchors&&['x','y','width','height'].some(k=>k in patch)){const rect={x:patch.x??current.x,y:patch.y??current.y,width:patch.width??current.width,height:patch.height??current.height};update(current.id,transformShape(current,rect))}else update(current.id,patch)};
 const openFile=()=>{const input=document.createElement('input');input.type='file';input.accept='.vsdoc,.json';input.onchange=async()=>{const f=input.files?.[0];if(!f)return;try{load(migrateDocument(JSON.parse(await readFileText(f))))}catch{alert('Invalid Vector Studio document')}};input.click()};
 const importImage=()=>{
  const input=document.createElement('input');
  input.type='file';
  input.accept=imageTypes;
  input.onchange=async()=>{
   const file=input.files?.[0];
   if(!file)return;
   try{
    const image=await openRaster(file);
    const board=useStore.getState().doc.artboard;
    const ratio=Math.min(board.width*.65/image.width,board.height*.65/image.height,1);
    const width=image.width*ratio,height=image.height*ratio;
    add(normalizeItem({...base('image',{x:(board.width-width)/2,y:(board.height-height)/2}),
     name:file.name,width,height,src:image.src,fill:'none',stroke:'none',strokeWidth:0}));
   }catch(cause){alert(cause instanceof Error?cause.message:'Could not open this image.')}
  };
  input.click();
 };
 const exportSvg=()=>download(new Blob([documentToSvg(doc)],{type:'image/svg+xml'}),`${doc.name}.svg`);
 const exportPng=()=>setImageAction('export');
 useEffect(()=>{const fn=(e:KeyboardEvent)=>{
  if(imageAction)return;
  const node=e.target as HTMLElement;
  if(node.closest('input,textarea,select,[contenteditable="true"]'))return;
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
  if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return}
  if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();return}
  if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();saveDocumentFile(doc);return}
  if(e.code==='Space'){e.preventDefault();setSpace(true)}
  if(e.key==='Escape'){gesture.current=null;penRef.current=[];setPen([]);select(null);return}
  if(e.key==='Enter'&&tool==='pen'){finishPen();return}
  if(['Delete','Backspace'].includes(e.key)){if(current&&!current.locked)remove();return}
  const shortcuts:Record<string,Tool>={v:'select',a:'direct',p:'pen',r:'rect',o:'ellipse',t:'text',h:'hand'};
  const next=shortcuts[e.key.toLowerCase()];if(next)choose(next);
 };const release=(e:KeyboardEvent)=>{if(e.code==='Space')setSpace(false)};
 window.addEventListener('keydown',fn);window.addEventListener('keyup',release);return()=>{window.removeEventListener('keydown',fn);window.removeEventListener('keyup',release)}
 });
 const selectionOverlay=current&&current.visible&&!current.locked&&['select','direct'].includes(tool);
 const selectionRect=current?{x:current.x,y:current.y,w:Math.max(1,current.width),h:Math.max(1,current.height)}:null;
 const activeMenus:Record<string,{label:string;action:()=>void;disabled?:boolean}[]>={
 File:[{label:'New document',action:()=>load(migrateDocument([]))},{label:'Open document…',action:openFile},{label:'Save .vsdoc',action:()=>saveDocumentFile(doc)},{label:'Place image…',action:importImage},{label:'Export SVG',action:exportSvg},{label:'Export PNG…',action:exportPng}],
 Edit:[{label:'Undo',action:undo,disabled:!past.length},{label:'Redo',action:redo,disabled:!future.length},{label:'Duplicate',action:duplicate,disabled:!current},{label:'Delete selected',action:remove,disabled:!current}],
 Object:[{label:'Bring forward',action:()=>current&&moveLayer(current.id,1),disabled:!current},{label:'Send backward',action:()=>current&&moveLayer(current.id,-1),disabled:!current},{label:'Flip horizontal',action:()=>flip('x'),disabled:!current},{label:'Flip vertical',action:()=>flip('y'),disabled:!current},{label:'Center horizontally',action:()=>current&&setShapeField({x:(artboard.width-current.width)/2}),disabled:!current},{label:'Center vertically',action:()=>current&&setShapeField({y:(artboard.height-current.height)/2}),disabled:!current}],
 Image:[{label:'Image Size…',action:()=>setImageAction('image'),disabled:current?.type!=='image'||current.locked||!current.src},{label:'Canvas Size…',action:()=>setImageAction('canvas')},{label:'Export Selected Layer PNG…',action:()=>setImageAction('layer-export'),disabled:current?.type!=='image'||!current.src}],
 View:[{label:'Zoom in',action:()=>setZoom(zoom+.25)},{label:'Zoom out',action:()=>setZoom(zoom-.25)},{label:'Actual size 100%',action:()=>setZoom(1)},{label:grid?'Hide grid':'Show grid',action:()=>setGrid(!grid)},{label:snap?'Disable snap to 10px':'Enable snap to 10px',action:()=>setSnap(!snap)}]
 };
 return <div className="app professional-app">
  <header className="top"><div className="brand"><span className="mark">V</span><b>VECTOR STUDIO</b><small>0.4.1</small></div><nav className="menubar">{Object.entries(activeMenus).map(([name,entries])=><div className="menu-entry" key={name}><button className={menu===name?'menu-active':''} onClick={()=>setMenu(menu===name?null:name)}>{name}</button>{menu===name&&<div className="menu-popup">{entries.map(entry=><button key={entry.label} disabled={entry.disabled} onClick={()=>{entry.action();setMenu(null)}}>{entry.label}</button>)}</div>}</div>)}</nav><div className="top-actions"><button title="Open" onClick={openFile}><FolderOpen size={16}/></button><button title="Save document" onClick={()=>saveDocumentFile(doc)}><Save size={16}/></button><button className="export" onClick={exportSvg}><Download size={15}/> Export SVG</button></div></header>
  <div className="subbar"><span>{doc.name} <i>●</i></span><span>RGB / Preview</span><span className="subright">{artboard.name} · {artboard.width} × {artboard.height} px</span></div>
  <div className="main"><aside className="toolbar professional-tools">{toolGroups.map(group=><div className="tool-group" key={group.title}><div className="tool-group-title">{group.title}</div><div className="tool-group-items">{group.items.map(({tool:t,label,Icon})=><button key={t} className={tool===t?'active':''} title={label} aria-label={label} onClick={()=>choose(t)}><Icon size={18}/></button>)}</div></div>)}<div className="tool-group"><div className="tool-group-title">Assets</div><button title="Place image" onClick={importImage}><ImagePlus size={18}/></button></div></aside>
  <section className="stage" ref={stage}><div className="canvas-tools"><button onClick={()=>setGrid(!grid)} className={grid?'on':''}><Grid3X3 size={15}/> Grid</button><button onClick={()=>setSnap(!snap)} className={snap?'on':''}>Snap 10px: {snap?'On':'Off'}</button><span/><button onClick={()=>setZoom(zoom-.25)}><ZoomOut size={15}/></button><b>{Math.round(zoom*100)}%</b><button onClick={()=>setZoom(zoom+.25)}><ZoomIn size={15}/></button><button onClick={()=>{setZoom(1);setViewportPan({x:0,y:0})}}>Reset</button></div>
   <div className="board-wrap" style={{'--board-ratio':artboard.width/artboard.height,aspectRatio:`${artboard.width}/${artboard.height}`,transform:`translate(${viewportPan.x}px,${viewportPan.y}px) scale(${zoom})`} as CSSProperties}><svg ref={svg} className="board" width={artboard.width} height={artboard.height} viewBox={`0 0 ${artboard.width} ${artboard.height}`} onPointerDown={start} onPointerMove={moving} onPointerUp={stop} onPointerCancel={stop}>
    <rect width={artboard.width} height={artboard.height} fill={artboard.background}/>{grid&&<defs><pattern id="vs-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e9edf2" strokeWidth="1"/></pattern></defs>}{grid&&<rect width={artboard.width} height={artboard.height} fill="url(#vs-grid)" pointerEvents="none"/>}
    {items.filter(s=>s.visible).map(s=><g key={s.id} opacity={s.opacity} style={{mixBlendMode:s.blendMode as any,cursor:s.locked?'not-allowed':tool==='select'?'move':'crosshair'}} transform={s.rotation||s.flipX||s.flipY?`translate(${mid(s).x} ${mid(s).y}) rotate(${s.rotation||0}) scale(${s.flipX?-1:1} ${s.flipY?-1:1}) translate(${-mid(s).x} ${-mid(s).y})`:undefined} onPointerDown={e=>objectDown(e,s)} onDoubleClick={e=>{if(s.type==='text'&&!s.locked){e.stopPropagation();const text=prompt('Edit text',s.text||'');if(text!==null)update(s.id,{text})}}}>
     {s.type==='rect'?<rect x={s.x} y={s.y} width={s.width} height={s.height} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth}/>:s.type==='ellipse'?<ellipse cx={s.x+s.width/2} cy={s.y+s.height/2} rx={s.width/2} ry={s.height/2} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth}/>:s.type==='path'?<path d={s.d} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} pointerEvents="visiblePainted"/>:s.type==='image'?<image href={s.src} x={s.x} y={s.y} width={s.width} height={s.height} preserveAspectRatio="none"/>:<text x={s.x} y={s.y+Math.min(30,s.height)} fontSize="30" fill={s.fill}>{s.text}</text>}
    </g>)}
    {pen.length>0&&<g pointerEvents="none"><path d={pathD(pen)} fill="none" stroke="#2878d0" strokeWidth="2"/>{pen.map((a,i)=><g key={i}><circle cx={a.x} cy={a.y} r={5/zoom} fill="#fff" stroke="#2878d0" strokeWidth={2/zoom}/>{a.out&&<><line x1={a.x} y1={a.y} x2={a.out.x} y2={a.out.y} stroke="#2878d0" strokeWidth={1/zoom}/><circle cx={a.out.x} cy={a.out.y} r={3/zoom} fill="#2878d0"/></>}</g>)}</g>}
    {selectionOverlay&&current&&selectionRect&&<g transform={current.rotation?`rotate(${current.rotation} ${mid(current).x} ${mid(current).y})`:undefined}>
      <rect x={selectionRect.x} y={selectionRect.y} width={selectionRect.w} height={selectionRect.h} fill="none" stroke="#2878d0" strokeWidth={1.3/zoom} strokeDasharray={`${5/zoom} ${4/zoom}`} pointerEvents="none"/>
      {tool==='select'&&<>{handles.map(([name,fx,fy])=><rect key={name} x={selectionRect.x+selectionRect.w*fx-5/zoom} y={selectionRect.y+selectionRect.h*fy-5/zoom} width={10/zoom} height={10/zoom} fill="white" stroke="#2878d0" strokeWidth={1.4/zoom} style={{cursor:name+'-resize'}} onPointerDown={e=>beginHandle(e,current,name)}/>)}<line x1={mid(current).x} y1={selectionRect.y} x2={mid(current).x} y2={selectionRect.y-30/zoom} stroke="#2878d0" strokeWidth={1.4/zoom}/><circle cx={mid(current).x} cy={selectionRect.y-30/zoom} r={7/zoom} fill="white" stroke="#2878d0" strokeWidth={1.4/zoom} style={{cursor:'grab'}} onPointerDown={e=>beginHandle(e,current,'rotate')}/></>}
      {tool==='direct'&&current.type==='path'&&current.anchors?.map((a,i)=><g key={i}>
       {(['in','out'] as const).map(k=>a[k]&&<g key={k}><line x1={a.x} y1={a.y} x2={a[k]!.x} y2={a[k]!.y} stroke="#2878d0" strokeWidth={1/zoom}/><circle cx={a[k]!.x} cy={a[k]!.y} r={5/zoom} fill="#fff" stroke="#2878d0" strokeWidth={1.5/zoom} onPointerDown={e=>anchorDown(e,current,i,k)}/></g>)}
       <rect x={a.x-5/zoom} y={a.y-5/zoom} width={10/zoom} height={10/zoom} fill="#fff" stroke="#2878d0" strokeWidth={2/zoom} onPointerDown={e=>anchorDown(e,current,i,'point')}/>
      </g>)}
    </g>}
   </svg></div><div className="status"><span>{tool.toUpperCase()}</span><span>{items.length} OBJECTS</span><span>{pen.length?`${pen.length} PEN ANCHORS · ENTER TO FINISH · CLICK FIRST TO CLOSE`:hint}</span></div>
  </section>
  <aside className="right"><div className="panel-tabs"><button className={panel==='properties'?'tab-active':''} onClick={()=>setPanel('properties')}>Properties</button><button className={panel==='layers'?'tab-active':''} onClick={()=>setPanel('layers')}>Layers</button></div><div className="panel">
   {panel==='properties'&&<><h4>TRANSFORM</h4>{current?<><div className="fields">{([['X','x'],['Y','y'],['W','width'],['H','height']] as const).map(([label,key])=><label key={key}>{label}<input disabled={current.locked} type="number" value={round(current[key])} onChange={e=>setShapeField({[key]:+e.target.value})}/></label>)}</div><label className="wide">Rotation (°)<input disabled={current.locked} type="number" value={round(current.rotation||0)} onChange={e=>setShapeField({rotation:+e.target.value})}/></label><div className="property-actions"><button title="Duplicate (Ctrl+D)" onClick={duplicate}><Copy size={15}/> Duplicate</button><button title="Flip horizontally" onClick={()=>flip('x')}><FlipHorizontal size={15}/></button><button title="Flip vertically" onClick={()=>flip('y')}><FlipVertical size={15}/></button></div><div className="property-actions"><button title="Center in artboard horizontally" onClick={()=>setShapeField({x:(artboard.width-current.width)/2})}><AlignHorizontalJustifyCenter size={15}/> Center X</button><button title="Center in artboard vertically" onClick={()=>setShapeField({y:(artboard.height-current.height)/2})}><AlignVerticalJustifyCenter size={15}/> Center Y</button></div></>:<p className="hint">Select a shape. Drag its bounding box handles to resize; use the circular handle to rotate.</p>}
    {current?.type==='image'&&<><h4>IMAGE</h4><div className="property-actions"><button disabled={current.locked||!current.src} onClick={()=>setImageAction('image')}>Image Size / PPI…</button></div></>}
    <h4>APPEARANCE</h4>{current?<><label className="wide">Opacity<input disabled={current.locked} type="range" min="0" max="1" step="0.01" value={current.opacity} onChange={e=>setShapeField({opacity:+e.target.value})}/><span>{Math.round(current.opacity*100)}%</span></label><label className="wide">Blend mode<select disabled={current.locked} value={current.blendMode} onChange={e=>setShapeField({blendMode:e.target.value as Shape['blendMode']})}>{['normal','multiply','screen','overlay','darken','lighten'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>{current.type!=='image'&&<><label className="wide">Fill <div className="color-row"><input type="color" disabled={current.locked} value={current.fill==='none'?'#ffffff':current.fill} onChange={e=>setShapeField({fill:e.target.value})}/><button onClick={()=>setShapeField({fill:'none'})}>None</button></div></label><label className="wide">Stroke<div className="color-row"><input type="color" disabled={current.locked} value={current.stroke==='none'?'#ffffff':current.stroke} onChange={e=>setShapeField({stroke:e.target.value})}/><button onClick={()=>setShapeField({stroke:'none'})}>None</button></div></label><label className="wide">Stroke width<input disabled={current.locked} type="number" min="0" max="100" value={current.strokeWidth} onChange={e=>setShapeField({strokeWidth:Math.max(0,+e.target.value)})}/></label></>}{current.type==='text'&&<label className="wide">Text<textarea disabled={current.locked} rows={3} value={current.text||''} onChange={e=>setShapeField({text:e.target.value})}/></label>}{current.type==='path'&&<div className="hint">{current.anchors?.length||0} Bézier anchors · {current.closed?'Closed':'Open'} path. Use Direct Selection (A) to move anchors and handles.</div>}<button className="danger widebtn" disabled={current.locked} onClick={remove}><Trash2 size={14}/> Delete object</button></>:<p className="hint">No object selected.</p>}</>}
   {panel==='layers'&&<><h4>LAYERS <span className="count">{items.length}</span></h4><p className="hint">Select, hide, lock or change stacking order.</p><div className="layers">{[...items].reverse().map(s=><div key={s.id} className={selected===s.id?'layerrow selected':'layerrow'}><button className="mini" title={s.visible?'Hide':'Show'} onClick={()=>toggleVisible(s.id)}>{s.visible?<Eye size={14}/>:<EyeOff size={14}/>}</button><button className="mini" title={s.locked?'Unlock':'Lock'} onClick={()=>toggleLocked(s.id)}>{s.locked?<Lock size={14}/>:<Unlock size={14}/>}</button><button className="layer" onClick={()=>select(s.id)}><span className="layer-icon">{s.type==='ellipse'?'◯':s.type==='text'?'T':s.type==='path'?'⌁':s.type==='image'?'▧':'▱'}</span><span className="layer-name">{s.name}</span></button><button className="mini" title="Move up" onClick={()=>moveLayer(s.id,1)}><ArrowUp size={13}/></button><button className="mini" title="Move down" onClick={()=>moveLayer(s.id,-1)}><ArrowDown size={13}/></button></div>)}</div></>}
   <h4>DOCUMENT</h4><div className="docinfo"><span>Artboard</span><b>{artboard.width} × {artboard.height} px</b><span>Color mode</span><b>RGB</b><span>Objects</span><b>{items.length}</b></div>
  </div></aside></div>
  <footer><span>Vector Studio</span><span>Documents autosaved in IndexedDB</span><span>Undo {past.length} · Redo {future.length}</span><span className="footright"><button title="Undo" onClick={undo} disabled={!past.length}><Undo2 size={14}/></button><button title="Redo" onClick={redo} disabled={!future.length}><Redo2 size={14}/></button><button onClick={exportPng}>Export PNG</button></span></footer>
  {imageAction&&<ImageDialog action={imageAction} doc={doc} layer={current} onClose={()=>setImageAction(null)}
   onCanvasSize={resizeCanvas} onImageSize={(id,patch)=>{
    const live=useStore.getState().doc.items.find(item=>item.id===id);
    if(!live||live.locked||live.src!==current?.src)throw new Error('This image layer changed. Reopen Image Size.');
    update(id,patch);
   }}/> }
 </div>;
}
