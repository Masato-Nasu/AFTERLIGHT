export function recordVideo(canvas,draw,count,frameMs,onProgress){
 if(!canvas.captureStream||!globalThis.MediaRecorder)throw Error('このブラウザは動画保存に対応していません。PCのChromeで試してください。');
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)throw Error('保存できる動画形式が見つかりません。');
 const stream=canvas.captureStream(30),rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000}),chunks=[];let timer=null,cancelled=false,done=false,failure=null,position=0;const total=count*2;
 const promise=new Promise((resolve,reject)=>{
  const cleanup=()=>{done=true;clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());};
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  rec.onerror=()=>{cleanup();reject(Error('動画の保存に失敗しました。'));};
  rec.onstop=()=>{cleanup();if(cancelled)reject(Error('動画保存を中止しました。'));else if(failure)reject(failure);else resolve({blob:new Blob(chunks,{type:rec.mimeType}),extension:rec.mimeType.includes('mp4')?'mp4':'webm'});};
  // Wait for disk reads before each frame's hold time; never skip a packet.
  async function next(){if(done||cancelled)return;try{await draw(position%count);if(done||cancelled)return;if(rec.state==='inactive')rec.start(1000);onProgress(position/total);timer=setTimeout(()=>{position++;if(position>=total){onProgress(1);rec.stop();}else next();},frameMs);}catch(e){failure=e;if(rec.state!=='inactive')rec.stop();else{cleanup();reject(e);}}}
  next();
 });
 return{promise,cancel(){if(done)return;cancelled=true;clearTimeout(timer);if(rec.state!=='inactive')rec.stop();else rec.onstop();}};
}
