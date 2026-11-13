/** Serializable SVG cubic geometry. Coordinates are in artboard units, not CSS pixels. */
export type Vec = {x:number;y:number};
export type Anchor = Vec & {in?:Vec;out?:Vec};
export const round=(n:number)=>Math.round(n*1000)/1000;
export const pathD=(anchors:Anchor[],closed=false):string=>{
 if(!anchors.length)return '';
 let d=`M ${round(anchors[0].x)} ${round(anchors[0].y)}`;
 for(let i=1;i<anchors.length+(closed?1:0);i++){
  const a=anchors[(i-1)%anchors.length], b=anchors[i%anchors.length];
  if(a.out||b.in){const p=a.out||a,q=b.in||b;d+=` C ${round(p.x)} ${round(p.y)} ${round(q.x)} ${round(q.y)} ${round(b.x)} ${round(b.y)}`}
  else d+=` L ${round(b.x)} ${round(b.y)}`;
 }
 return d+(closed?' Z':'');
};
export const bounds=(anchors:Anchor[])=>{
 const all=anchors.flatMap(a=>[a,...(a.in?[a.in]:[]),...(a.out?[a.out]:[])]);
 const xs=all.map(p=>p.x),ys=all.map(p=>p.y);
 const x=Math.min(...xs),y=Math.min(...ys);
 return {x,y,width:Math.max(1,Math.max(...xs)-x),height:Math.max(1,Math.max(...ys)-y)};
};
export const transformAnchors=(anchors:Anchor[],fn:(p:Vec)=>Vec):Anchor[]=>anchors.map(a=>({
 ...fn(a), ...(a.in?{in:fn(a.in)}:{}),...(a.out?{out:fn(a.out)}:{})
}));
export const translateAnchors=(anchors:Anchor[],dx:number,dy:number)=>transformAnchors(anchors,p=>({x:p.x+dx,y:p.y+dy}));
export const scaleAnchors=(anchors:Anchor[],origin:Vec,sx:number,sy:number)=>transformAnchors(anchors,p=>({x:origin.x+(p.x-origin.x)*sx,y:origin.y+(p.y-origin.y)*sy}));
export const clampDimension=(value:number)=>Math.max(1,Math.abs(value));
