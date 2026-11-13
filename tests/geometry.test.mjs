import test from 'node:test';
import assert from 'node:assert/strict';
import {pathD,bounds,translateAnchors,scaleAnchors} from '../src/geometry.ts';

test('Pen: straight line and closed path',()=>{
 const nodes=[{x:10,y:20},{x:50,y:20},{x:50,y:60}];
 assert.equal(pathD(nodes),'M 10 20 L 50 20 L 50 60');
 assert.equal(pathD(nodes,true),'M 10 20 L 50 20 L 50 60 L 10 20 Z');
});
test('Pen: cubic control handles are preserved in SVG',()=>{
 const nodes=[{x:0,y:0,out:{x:20,y:30}},{x:100,y:40,in:{x:80,y:0}}];
 assert.equal(pathD(nodes),'M 0 0 C 20 30 80 0 100 40');
});
test('Moving path moves every anchor and handle without distortion',()=>{
 const nodes=[{x:0,y:0,out:{x:20,y:30}},{x:100,y:40,in:{x:80,y:0}}];
 const moved=translateAnchors(nodes,30,-10);
 assert.equal(pathD(moved),'M 30 -10 C 50 20 110 -10 130 30');
 assert.deepEqual(bounds(moved),{x:30,y:-10,width:100,height:40});
});
test('Scaling path is geometric rather than only changing selection box',()=>{
 const nodes=[{x:10,y:10,out:{x:20,y:20}},{x:50,y:50,in:{x:30,y:30}}];
 const scaled=scaleAnchors(nodes,{x:10,y:10},2,.5);
 assert.equal(pathD(scaled),'M 10 10 C 30 15 50 20 90 30');
});
