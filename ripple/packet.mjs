export const COLS=10, ROWS=8, FRAME_MS=350, MAX_BYTES=20471;
export function crc16(data){let c=65535;for(const b of data){c^=b<<8;for(let i=0;i<8;i++)c=c&32768?(c<<1)^0x1021:c<<1;c&=65535;}return c;}
export function encode(text,id=1){return encodeBytes(new TextEncoder().encode(text),id);}
export function encodeBytes(bytes,id=1){
 if(!bytes.length||bytes.length>MAX_BYTES)throw Error('送信データが上限を超えています。');
 const data=new Uint8Array(bytes.length+4);data[0]=bytes.length>>8;data[1]=bytes.length&255;data.set(bytes,2);const c=crc16(bytes);data[data.length-2]=c>>8;data[data.length-1]=c&255;
 const count=Math.ceil(data.length/28);
 return Array.from({length:count},(_,i)=>{const f=new Uint8Array(35);f.set([0xd7,id,i>>4,((i&15)<<4)|(count>>8),count&255]);f.set(data.slice(i*28,i*28+28),5);const c=crc16(f.slice(0,33));f[33]=c>>8;f[34]=c&255;return f;});
}
export function bits(frame){return Array.from(frame).flatMap(b=>Array.from({length:8},(_,i)=>(b>>(7-i))&1));}
export function packetInfo(f){if(f.length===35&&f[0]===0xd7)return {id:f[1],index:(f[2]<<4)|(f[3]>>4),total:((f[3]&15)<<8)|f[4],size:28,offset:5};return null;}
export function parseBits(values){if(values.length!==280)return null;const f=new Uint8Array(35);values.forEach((b,i)=>{f[i>>3]|=(b?1:0)<<(7-i%8);});const p=packetInfo(f);if(!p||p.total<1||p.index>=p.total||crc16(f.slice(0,33))!==((f[33]<<8)|f[34]))return null;return f;}
export class Receiver{
 constructor(){this.reset();}
 reset(){this.id=null;this.total=0;this.size=0;this.parts=new Map();this.text=null;this.bytes=null;}
 missing(){return Array.from({length:this.total},(_,i)=>i).filter(i=>!this.parts.has(i));}
 accept(f){if(!f)return false;const p=packetInfo(f);if(!p||!parseBits(bits(f)))return false;if(this.id!==p.id||this.total!==p.total||this.size!==p.size){this.reset();this.id=p.id;this.total=p.total;this.size=p.size;}this.parts.set(p.index,f.slice(p.offset,p.offset+p.size));if(this.parts.size===this.total&&!this.bytes){const a=new Uint8Array(this.total*p.size);for(const[i,part]of this.parts)a.set(part,i*p.size);const n=(a[0]<<8)|a[1];if(n>0&&n<=MAX_BYTES&&n+4<=a.length&&crc16(a.slice(2,n+2))===((a[n+2]<<8)|a[n+3])){this.bytes=a.slice(2,n+2);try{this.text=new TextDecoder('utf-8',{fatal:true}).decode(this.bytes);}catch{this.text=null;}}}return true;}
}
// Project a normalized rectangle into four camera points (TL, TR, BR, BL).
export function projector(p){const [a,b,c,d]=p;const dx1=b.x-c.x,dx2=d.x-c.x,dx3=a.x-b.x+c.x-d.x,dy1=b.y-c.y,dy2=d.y-c.y,dy3=a.y-b.y+c.y-d.y;const det=dx1*dy2-dx2*dy1;if(Math.abs(det)<1e-8)throw Error('四隅を選び直してください。');const g=(dx3*dy2-dx2*dy3)/det,h=(dx1*dy3-dx3*dy1)/det;return(u,v)=>{const z=g*u+h*v+1;return{x:((b.x-a.x+g*b.x)*u+(d.x-a.x+h*d.x)*v+a.x)/z,y:((b.y-a.y+g*b.y)*u+(d.y-a.y+h*d.y)*v+a.y)/z};};}
