export function recordVideo(canvas,draw,count,frameMs,onProgress){
 if(!canvas.captureStream||!globalThis.MediaRecorder)throw Error('このブラウザは動画保存に対応していません。PCのChromeで試してください。');
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)throw Error('保存できる動画形式が見つかりません。');
 let stream=canvas.captureStream(0),track=stream.getVideoTracks()[0];
 if(!track.requestFrame){stream.getTracks().forEach(t=>t.stop());stream=canvas.captureStream(30);track=stream.getVideoTracks()[0];}
 const context=canvas.getContext('2d'),rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000}),chunks=[];let timer=null,captureTimer=null,cancelled=false,done=false,failure=null,position=0;const total=count*2,holdMs=Math.max(100,frameMs);
 const promise=new Promise((resolve,reject)=>{
  const cleanup=()=>{done=true;clearTimeout(timer);clearInterval(captureTimer);stream.getTracks().forEach(t=>t.stop());};
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  rec.onerror=()=>{cleanup();reject(Error('動画の保存に失敗しました。'));};
  rec.onstop=()=>{cleanup();if(cancelled)reject(Error('動画保存を中止しました。'));else if(failure)reject(failure);else resolve({blob:new Blob(chunks,{type:rec.mimeType}),extension:rec.mimeType.includes('mp4')?'mp4':'webm'});};
  // Redraw even while the packet is unchanged: canvas streams otherwise record
  // only packet changes, yielding ~9fps for a 0.1-second transmission.
  const capture=()=>{if(rec.state!=='recording')return;context.drawImage(canvas,0,0);track.requestFrame?.();};
  // Wait for disk reads before each packet's hold time; never skip a packet.
  async function next(){if(done||cancelled)return;try{await draw(position%count);if(done||cancelled)return;if(rec.state==='inactive'){rec.start(1000);capture();captureTimer=setInterval(capture,1000/30);}onProgress(position/total);timer=setTimeout(()=>{position++;if(position>=total){onProgress(1);clearInterval(captureTimer);rec.stop();}else next();},holdMs);}catch(e){failure=e;clearInterval(captureTimer);if(rec.state!=='inactive')rec.stop();else{cleanup();reject(e);}}}
  next();
 });
 return{promise,cancel(){if(done)return;cancelled=true;clearTimeout(timer);clearInterval(captureTimer);if(rec.state!=='inactive')rec.stop();else rec.onstop();}};
}
