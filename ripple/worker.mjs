import {initialState,generate} from './generator.mjs?v=1.0';
let acknowledge=null;
self.onmessage=async e=>{
 if(e.data.type==='ack'){acknowledge?.();acknowledge=null;return;}
 try{
  const {frames}=e.data,start=performance.now();self.postMessage({type:'progress',done:0,total:frames.length,phase:'模様を準備しています'});
  let state=initialState();
  for(let i=0;i<frames.length;i++){
   const result=generate(state,frames[i]);state=result.state;
   const compressed=!!globalThis.CompressionStream,packed=compressed?new Uint8Array(await new Response(new Blob([result.gray]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()):result.gray.slice();
   const saved=new Promise(resolve=>{acknowledge=resolve;});self.postMessage({type:'frame',index:i,gray:result.gray,packed,compressed},[result.gray.buffer,packed.buffer]);await saved;
   self.postMessage({type:'progress',done:i+1,total:frames.length,phase:'生成・送信中',seconds:Math.round((performance.now()-start)/1000)});
  }
  self.postMessage({type:'done'});
 }catch(e){self.postMessage({type:'error',message:e.message});}
};
