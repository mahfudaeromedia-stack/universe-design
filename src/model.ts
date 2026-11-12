export type Tool = 'select'|'direct'|'pen'|'rect'|'ellipse'|'text'|'hand';
export type BlendMode = 'normal'|'multiply'|'screen'|'overlay'|'darken'|'lighten';
export type ShapeType = 'rect'|'ellipse'|'path'|'text'|'image';

export type LayerItem = {
  id:string;
  type:ShapeType;
  x:number;
  y:number;
  width:number;
  height:number;
  fill:string;
  stroke:string;
  strokeWidth:number;
  name:string;
  d?:string;
  text?:string;
  src?:string;
  opacity:number;
  blendMode:BlendMode;
  visible:boolean;
  locked:boolean;
};

export type Artboard = {id:string;name:string;width:number;height:number;background:string};
export type VectorDocument = {
  version:2;
  name:string;
  artboard:Artboard;
  items:LayerItem[];
};

export const createDocument = (items:LayerItem[]=[]):VectorDocument => ({
  version:2,
  name:'Untitled-1',
  artboard:{id:'artboard-1',name:'Artboard 1',width:1200,height:800,background:'#ffffff'},
  items
});

export const normalizeItem = (item:Partial<LayerItem> & Pick<LayerItem,'id'|'type'>):LayerItem => ({
  x:0,y:0,width:1,height:1,fill:'none',stroke:'none',strokeWidth:0,name:'Object',
  opacity:1,blendMode:'normal',visible:true,locked:false,...item
});

export const migrateDocument = (input:unknown):VectorDocument => {
  if(Array.isArray(input)) return createDocument(input.map((x:any)=>normalizeItem(x)));
  const raw=input as any;
  if(raw && Array.isArray(raw.items)) return {...createDocument(),...raw,version:2,items:raw.items.map((x:any)=>normalizeItem(x))};
  return createDocument();
};
