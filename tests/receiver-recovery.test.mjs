import assert from 'node:assert/strict';
import {encodeBytes,Receiver} from '../ripple/packet.mjs';
import {generate} from '../ripple/generator.mjs';
import {writePixels} from '../ripple/palette.mjs';
import {decodeCamera} from '../ripple/codec.mjs';
import {CameraTracker} from '../ripple/camera-tracker.mjs';
const payload=Uint8Array.from({length:3200},(_,i)=>(i*73+(i>>3))&255),frames=encodeBytes(payload,82),r=new Receiver();
for(let i=0;i<frames.length;i++)if(i!==57)r.accept(frames[i]);
assert.equal(r.parts.size,114);assert.deepEqual(r.missing(),[57]);assert.equal(r.bytes,null);
r.accept(frames[57]);assert.deepEqual(r.bytes,payload);assert.deepEqual(r.missing(),[]);
const gray=generate(null,frames[57]).gray,data=new Uint8ClampedArray(512*512*4);writePixels(gray,data);
const image={width:512,height:512,data},corners=[{x:0,y:0},{x:512,y:0},{x:512,y:512},{x:0,y:512}];
assert.deepEqual(decodeCamera(image,corners),frames[57]);
let recovered=false;
for(const shift of [2.1,2.3,2.5,2.7,2.9,3.1,3.3,3.5,3.7,3.9,4.1,4.3]){
 const points=corners.map(p=>({x:p.x+shift,y:p.y}));
 if(decodeCamera(image,points))continue;
 const tracker=new CameraTracker();
 assert.equal(tracker.read(image,()=>[points],0,false).frame,null);
 for(let i=0;i<8;i++){const result=tracker.read(image,()=>[points],300+i*300,true);if(result.frame){assert.deepEqual(result.frame,frames[57]);recovered=true;console.log(`PASS subpixel recovery: ${shift}px marker translation`);break;}}
 if(recovered)break;
}
assert.ok(recovered,'recover a CRC-valid packet that nominal alignment cannot read');
console.log('PASS 114/115 missing index, completion with existing packet, baseline decode and bounded recovery');
const gray76=generate(null,frames[75]).gray,data76=new Uint8ClampedArray(512*512*4);writePixels(gray76,data76);
const image76={width:512,height:512,data:data76};let scaleRecovered=false;
for(const scale of [1.004,1.008,1.012,1.016,1.02,1.024,1.028,1.032,1.036,1.04]){
 const points=corners.map(p=>({x:256+(p.x-256)*scale,y:256+(p.y-256)*scale}));if(decodeCamera(image76,points))continue;
 const tracker=new CameraTracker();for(let i=0;i<14;i++){const result=tracker.read(image76,()=>[points],i*300,true);if(result.frame){assert.deepEqual(result.frame,frames[75]);scaleRecovered=true;console.log(`PASS packet 76 size correction: ${scale}`);break;}}if(scaleRecovered)break;
}
assert.ok(scaleRecovered,'recover packet 76 with an inaccurate crop size');
