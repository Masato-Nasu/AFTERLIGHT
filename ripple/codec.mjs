import {convDecode} from './fec.mjs';
import {parseBits,bits,projector} from './packet.mjs';
import {N,FREQUENCIES as F,MODES,WAVE_SIN,WAVE_COS} from './waves.mjs';
export {N};
const cos=Array.from({length:F+1},(_,u)=>Float64Array.from({length:N},(_,x)=>Math.cos(Math.PI*(x+.5)*u/N)));
export function spectrum(gray){const tmp=new Float64Array(N*(F+1)),spec=new Float64Array((F+1)*(F+1));for(let y=0;y<N;y++)for(let u=1;u<=F;u++){let sum=0;for(let x=0;x<N;x++)sum+=gray[y*N+x]*cos[u][x];tmp[y*(F+1)+u]=sum;}for(let v=1;v<=F;v++)for(let u=1;u<=F;u++){let sum=0;for(let y=0;y<N;y++)sum+=tmp[y*(F+1)+u]*cos[v][y];spec[v*(F+1)+u]=sum;}return MODES.map(([u,v])=>spec[v*(F+1)+u]);}
export function shrink(gray){const out=new Float64Array(N*N);for(let y=0;y<N;y++)for(let x=0;x<N;x++){let sum=0;for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++)sum+=gray[(y*4+dy)*512+x*4+dx];out[y*N+x]=sum/16;}return out;}
const waveA=spectrum(shrink(WAVE_SIN)),waveB=spectrum(shrink(WAVE_COS));
let aa=0,ab=0,bb=0;for(let i=0;i<waveA.length;i++){aa+=waveA[i]**2;ab+=waveA[i]*waveB[i];bb+=waveB[i]**2;}const determinant=aa*bb-ab*ab;
export function decodeGray(gray){const scores=spectrum(gray);let ax=0,bx=0;for(let i=0;i<scores.length;i++){ax+=scores[i]*waveA[i];bx+=scores[i]*waveB[i];}const a=(ax*bb-bx*ab)/determinant,b=(bx*aa-ax*ab)/determinant;const residual=scores.map((s,i)=>s-a*waveA[i]-b*waveB[i]);return parseBits(bits(convDecode(residual,35)));}
export function cameraGray(image,points,offsetX=0,offsetY=0,scale=1){const map=projector(points),{width:w,height:h,data}=image,out=new Float64Array(N*N);for(let y=0;y<N;y++)for(let x=0;x<N;x++){let sum=0;for(const oy of [.25,.75])for(const ox of [.25,.75]){const p=map(((x+ox)/N-.5)*scale+.5+offsetX,((y+oy)/N-.5)*scale+.5+offsetY);const px=Math.max(0,Math.min(w-1.001,p.x)),py=Math.max(0,Math.min(h-1.001,p.y)),ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const i=((iy+dy)*w+ix+dx)*4;sum+=(data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)*(dx?fx:1-fx)*(dy?fy:1-fy);}}out[y*N+x]=sum/4;}return out;}
export function decodeCamera(image,points,offsetX=0,offsetY=0,scale=1){return decodeGray(cameraGray(image,points,offsetX,offsetY,scale));}
