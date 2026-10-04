import {convEncode} from './fec.mjs';
import {SIDE as N,FREQUENCIES as F,MODES,WAVE_SIN,WAVE_COS,AMPLITUDE} from './waves.mjs';
import {decodeGray,shrink} from './codec.mjs';
const cos=Array.from({length:F+1},(_,u)=>Float64Array.from({length:N},(_,x)=>Math.cos(Math.PI*(x+.5)*u/N)));
export function initialState(){return null;}
export function generate(state,frame){
 const coded=convEncode(frame),tmp=new Float64Array(N*(F+1)),gray=new Uint8Array(N*N),index=(frame[2]<<4)|(frame[3]>>4),phase=index*Math.PI/5,cp=Math.cos(phase),sp=Math.sin(phase);
 for(let i=0;i<coded.length;i++){const[u,v]=MODES[i],a=coded[i]?AMPLITUDE:-AMPLITUDE;for(let x=0;x<N;x++)tmp[v*N+x]+=a*cos[u][x];}
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){let sum=0;for(let v=1;v<=F;v++)sum+=tmp[v*N+x]*cos[v][y];const i=y*N+x;gray[i]=Math.max(0,Math.min(255,Math.round(128+60*(WAVE_SIN[i]*cp-WAVE_COS[i]*sp)+sum)));}
 const decoded=decodeGray(shrink(gray));if(!decoded||decoded.some((b,i)=>b!==frame[i]))throw Error('波紋の自己検証に失敗しました。もう一度お試しください。');
 return {state:null,gray};
}
