export const MAX_TEXT_BYTES=20000,MAX_TEXT_CHARS=5000;
const MAGIC=new Uint8Array([71,83,69,1]);
export function isEncrypted(a){return a?.length>=49&&MAGIC.slice(0,3).every((v,i)=>a[i]===v)&&(a[3]===1||a[3]===2);}
async function key(password,salt){if(!password)throw Error('合い言葉を入力してください。');const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:600000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function transform(bytes,Stream){return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('gzip'))).arrayBuffer());}
export async function encryptMessage(text,password){
 let plain=new TextEncoder().encode(text);if(!plain.length||plain.length>MAX_TEXT_BYTES||Array.from(text).length>MAX_TEXT_CHARS)throw Error('文章は1〜5,000文字にしてください。');if(password.length<8)throw Error('合い言葉は8文字以上にしてください。');
 let compressed=false;if(globalThis.CompressionStream){const packed=await transform(plain,CompressionStream);if(packed.length<plain.length){plain.fill(0);plain=packed;compressed=true;}}
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),header=new Uint8Array(32);header.set(MAGIC);header[3]=compressed?2:1;header.set(salt,4);header.set(iv,20);
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:header,tagLength:128},await key(password,salt),plain)),result=new Uint8Array(32+encrypted.length);result.set(header);result.set(encrypted,32);plain.fill(0);return result;
}
export async function decryptMessage(bytes,password){
 if(!isEncrypted(bytes))throw Error('対応する暗号化データではありません。');let plain;
 try{plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(20,32),additionalData:bytes.slice(0,32),tagLength:128},await key(password,bytes.slice(4,20)),bytes.slice(32)));}catch{throw Error('合い言葉が違うか、データが破損しています。');}
 if(bytes[3]===2){if(!globalThis.DecompressionStream)throw Error('このブラウザは圧縮文章に対応していません。新しいChromeまたはSafariをお使いください。');const reader=new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),chunks=[];let total=0;try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>MAX_TEXT_BYTES){await reader.cancel();throw Error('展開後の文章が上限を超えています。');}chunks.push(value);}plain=new Uint8Array(total);let at=0;for(const c of chunks){plain.set(c,at);at+=c.length;}}finally{reader.releaseLock();}}
 const text=new TextDecoder('utf-8',{fatal:true}).decode(plain);if(plain.length>MAX_TEXT_BYTES||Array.from(text).length>MAX_TEXT_CHARS)throw Error('文章が上限を超えています。');return text;
}
