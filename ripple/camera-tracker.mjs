import {decodeCamera} from './codec.mjs?v=1.3';
// Try at most three alignment alternatives per camera image when stalled.
const OFFSETS=[[.0015,0],[-.0015,0],[0,.0015],[0,-.0015],[.0015,.0015],[-.0015,-.0015],[.0015,-.0015],[-.0015,.0015],[0,0,.996],[0,0,1.004],[0,0,.992],[0,0,1.008],[0,0,.988],[0,0,1.012]];
// Reuse only CRC-validated geometry; reacquire immediately on a failed decode.
export class CameraTracker{
 constructor(){this.reset();}
 reset(){this.points=null;this.locatedAt=-Infinity;this.retry=0;}
 read(image,locate,now,recover=false){
  if(this.points&&now-this.locatedAt<200){const frame=decodeCamera(image,this.points);if(frame)return {frame,points:this.points};}
  const candidates=locate();this.points=null;this.locatedAt=now;
  for(const points of candidates){const frame=decodeCamera(image,points);if(frame){this.points=points;return {frame,points};}}
  const points=candidates[0]||null;
  if(recover&&points){for(let attempt=0;attempt<3;attempt++){const [x,y,scale=1]=OFFSETS[this.retry++%OFFSETS.length],frame=decodeCamera(image,points,x,y,scale);if(frame)return {frame,points};}}
  return {frame:null,points};
 }
}
