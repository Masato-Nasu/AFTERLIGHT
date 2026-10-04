export const SIDE=512,N=128,FREQUENCIES=24,AMPLITUDE=1.8;
export const MODES=[];
for(let v=1;v<=FREQUENCIES;v++)for(let u=1;u<=FREQUENCIES;u++)MODES.push([u,v]);
// Interleave neighbouring code bits across spatial frequencies.
let rand=4177;for(let i=MODES.length-1;i>0;i--){rand=(Math.imul(rand,1664525)+1013904223)>>>0;const j=rand%(i+1);[MODES[i],MODES[j]]=[MODES[j],MODES[i]];}
export const WAVE_SIN=new Float32Array(SIDE*SIDE),WAVE_COS=new Float32Array(SIDE*SIDE);
for(let y=0;y<SIDE;y++)for(let x=0;x<SIDE;x++){const phase=Math.hypot(x-255.5,y-255.5)*Math.PI/20;WAVE_SIN[y*SIDE+x]=Math.sin(phase);WAVE_COS[y*SIDE+x]=Math.cos(phase);}
