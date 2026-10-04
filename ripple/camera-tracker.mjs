import {decodeCamera} from './codec.mjs?v=1.0';
// Reuse only CRC-validated geometry; reacquire immediately on a failed decode.
export class CameraTracker{
 constructor(){this.reset();}
 reset(){this.points=null;this.locatedAt=-Infinity;}
 read(image,locate,now){
  if(this.points&&now-this.locatedAt<200){const frame=decodeCamera(image,this.points);if(frame)return {frame,points:this.points};}
  const candidates=locate();this.points=null;this.locatedAt=now;
  for(const points of candidates){const frame=decodeCamera(image,points);if(frame){this.points=points;return {frame,points};}}
  return {frame:null,points:candidates[0]||null};
 }
}
