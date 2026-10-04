import {decodeCamera} from './codec.mjs?v=1.2';
// Try a single subpixel alignment alternative per camera image when stalled.
const OFFSETS=[[.0015,0],[-.0015,0],[0,.0015],[0,-.0015],[.0015,.0015],[-.0015,-.0015],[.0015,-.0015],[-.0015,.0015]];
// Reuse only CRC-validated geometry; reacquire immediately on a failed decode.
export class CameraTracker{
 constructor(){this.reset();}
 reset(){this.points=null;this.locatedAt=-Infinity;this.retry=0;}
 read(image,locate,now,recover=false){
  if(this.points&&now-this.locatedAt<200){const frame=decodeCamera(image,this.points);if(frame)return {frame,points:this.points};}
  const candidates=locate();this.points=null;this.locatedAt=now;
  for(const points of candidates){const frame=decodeCamera(image,points);if(frame){this.points=points;return {frame,points};}}
  const points=candidates[0]||null;
  if(recover&&points){const [x,y]=OFFSETS[this.retry++%OFFSETS.length],frame=decodeCamera(image,points,x,y);if(frame)return {frame,points};}
  return {frame:null,points};
 }
}
