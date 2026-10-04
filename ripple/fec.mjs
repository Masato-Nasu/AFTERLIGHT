// K9 convolutional code (557/663), shared with the earlier optical protocol.
const P=[0o557,0o663],parity=x=>{x^=x>>>4;x^=x>>>2;x^=x>>>1;return x&1;};
const signs=Array.from({length:512},(_,r)=>P.map(p=>parity(r&p)?1:-1));
export const convEncode=bytes=>{let state=0;const out=new Uint8Array((bytes.length*8+8)*2);for(let t=0;t<bytes.length*8+8;t++){const bit=t<bytes.length*8?(bytes[t>>3]>>(7-(t&7)))&1:0;state=((state<<1)|bit)&511;for(let j=0;j<2;j++)out[t*2+j]=(signs[state][j]+1)/2;}return out;};
export const convDecode=(scores,nbytes)=>{const steps=nbytes*8+8,path=new Uint8Array(steps*256);let cost=new Float64Array(256).fill(-1e30),next=new Float64Array(256);cost[0]=0;for(let t=0;t<steps;t++){
 for(let st=0;st<256;st++){const a=st>>>1,b=a+128,ra=st,rb=st+256,sa=signs[ra],sb=signs[rb],x=scores[t*2],y=scores[t*2+1],ca=cost[a]+sa[0]*x+sa[1]*y,cb=cost[b]+sb[0]*x+sb[1]*y;next[st]=ca>=cb?ca:cb;path[t*256+st]=ca>=cb?0:1;}[cost,next]=[next,cost];
 }let state=0;const out=new Uint8Array(nbytes);for(let t=steps-1;t>=0;t--){if(t<nbytes*8)out[t>>3]|=(state&1)<<(7-(t&7));state=(state>>>1)+(path[t*256+state]?128:0);}return out;};

