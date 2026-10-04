import {writePixels} from './palette.mjs';
import {FrameStore} from './frame-store.mjs?v=1.0';
import {encryptMessage,decryptMessage,isEncrypted,MAX_TEXT_BYTES,MAX_TEXT_CHARS} from './crypto.mjs?v=1.0';
import {recordVideo} from './export.mjs?v=1.0';
import {encodeBytes,Receiver} from './packet.mjs?v=1.2';
import {paintMarkers,detectMarkers} from './markers.mjs?v=1.0';
import {CameraTracker} from './camera-tracker.mjs?v=1.2';
const tracker=new CameraTracker();
const $=id=>document.getElementById(id),out=$('output'),ctx=out.getContext('2d'),view=$('cameraView'),vctx=view.getContext('2d',{willReadFrequently:true}),video=$('camera');let frameStore=null,painting=false;let mode='send',worker=null,prepared=[],active=false,started=0,index=-1,stream=null,epoch=0,lastSample=0,receiver=new Receiver(),wake=null,preparing=false,generation=0,complete=false,exporter=null,downloadURL=null,lastAttempt=null,decryptEpoch=0,lastReceived=0;
const alignmentHelp='4つの目印と模様全体を映してください。位置は自動で合わせます。';
function receiveHint(){const missing=receiver.missing();$('alignHelp').textContent=receiver.bytes?'全ての模様を受信しました。':receiver.parts.size&&missing.length<=10?`未受信：${missing.map(i=>i+1).join('、')}番 / ${receiver.total}枚。受信をリセットせず、動画を繰り返してください。`:alignmentHelp;}
const frameCanvas=document.createElement('canvas');frameCanvas.width=frameCanvas.height=512;const fctx=frameCanvas.getContext('2d');const finder=document.createElement('canvas'),fc=finder.getContext('2d',{willReadFrequently:true});
function count(){const n=new TextEncoder().encode($('message').value).length;$('byteCount').textContent=`${Array.from($('message').value).length.toLocaleString()} / 5,000文字 · ${n.toLocaleString()} bytes`;}count();$('message').oninput=count;
async function awake(){try{wake=await navigator.wakeLock?.request('screen');}catch{}}
function release(){wake?.release();wake=null;}
function stopSend(){generation++;preparing=false;exporter?.cancel();worker?.terminate();worker=null;active=false;$('message').disabled=false;$('sendKey').disabled=false;$('gsProgress').hidden=true;$('generate').textContent='波紋を生成して送信';$('sendStatus').textContent='送信停止';release();}
function paint(gray){ctx.fillStyle='#050b15';ctx.fillRect(0,0,760,760);if(gray){const img=fctx.createImageData(512,512);writePixels(gray,img.data);fctx.putImageData(img,0,0);ctx.drawImage(frameCanvas,60,60,640,640);}else{ctx.fillStyle='#9ba7b3';ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText('波紋を生成して送信',380,380);}paintMarkers(ctx);}paint(null);
$('generate').onclick=async()=>{if(worker||active||preparing){stopSend();return;}try{const text=$('message').value,n=new TextEncoder().encode(text).length;if(n>MAX_TEXT_BYTES||Array.from(text).length>MAX_TEXT_CHARS)throw Error('5,000文字以内にしてください。');const token=++generation;preparing=true;$('generate').textContent='生成を中止';$('message').disabled=true;$('sendKey').disabled=true;$('sendStatus').textContent='暗号化しています';complete=false;$('saveVideo').disabled=true;$('download').hidden=true;const sealed=await encryptMessage(text,$('sendKey').value);if(token!==generation||mode!=='send')return;await frameStore?.dispose();if(token!==generation||mode!=='send')return;const storage=await FrameStore.create();if(token!==generation||mode!=='send'){await storage.dispose();return;}frameStore=storage;preparing=false;const frames=encodeBytes(sealed,crypto.getRandomValues(new Uint8Array(1))[0]);prepared=[];$('transferInfo').dataset.frames=frames.length;$('transferInfo').textContent=`圧縮・暗号化後 ${sealed.length.toLocaleString()} bytes · ${frames.length.toLocaleString()}枚 · 1周 約${Math.ceil(frames.length*+$('speed').value/1000)}秒。生成中から受信できます。`;paint(null);$('sendError').textContent='';$('message').disabled=true;$('generate').textContent='生成を中止';$('gsProgress').hidden=false;$('gsProgress').value=0;awake();worker=new Worker('./worker.mjs?v=1.0',{type:'module'});worker.onmessage=async e=>{if(token!==generation)return;const m=e.data;if(m.type==='progress'){$('sendStatus').textContent=`${m.phase} · ${m.done} / ${m.total}${m.seconds ? ` · ${m.seconds}秒経過${m.done ? ` · 残り約${Math.ceil(m.seconds/m.done*(m.total-m.done)/60)}分` : ''}` : ''}`;$('gsProgress').value=m.done/m.total;}else if(m.type==='frame'){try{await frameStore.put(m.index,m.packed,m.compressed);if(token!==generation)return;prepared[m.index]=true;paint(m.gray);worker?.postMessage({type:'ack'});}catch(e){if(token!==generation)return;stopSend();$('sendError').textContent='模様を一時保存できません。空き容量を確認して再度お試しください。';}}else if(m.type==='error'){stopSend();$('sendError').textContent=m.message;}else if(m.type==='done'){worker.terminate();worker=null;complete=true;$('saveVideo').disabled=false;active=true;started=performance.now();index=-1;$('generate').textContent='送信を止める';$('gsProgress').hidden=true;}};worker.onerror=()=>{stopSend();$('sendError').textContent='生成処理を実行できませんでした。ページを再読み込みしてください。';};worker.postMessage({frames});}catch(e){stopSend();$('sendError').textContent=e.message;}};
async function paintIndex(i){const store=frameStore,gray=await store.get(i);if(store!==frameStore)return;paint(gray);store.get((i+1)%prepared.length).catch(()=>{});}
async function tick(t){
 if(active&&prepared.length&&!exporter&&!painting&&(index<0||t-started>=+$('speed').value)){
  painting=true;const token=generation,i=(index+1)%prepared.length;
  try{const gray=await frameStore.get(i);if(token===generation&&active&&!exporter){paint(gray);index=i;started=performance.now();frameStore.get((i+1)%prepared.length).catch(()=>{});$('sendStatus').textContent=`波紋送信中 · ${i+1} / ${prepared.length} · 1周 約${Math.ceil(prepared.length*+$('speed').value/1000)}秒`;}}
  catch(e){stopSend();$('sendError').textContent=e.message;}finally{painting=false;}
 }
 requestAnimationFrame(tick);
}requestAnimationFrame(tick);$('speed').onchange=()=>{started=performance.now();index=-1;const n=+$('transferInfo').dataset.frames;if(n)$('transferInfo').textContent=$('transferInfo').textContent.replace(/1周 約\d+秒/,`1周 約${Math.ceil(n*+$('speed').value/1000)}秒`);};
$('fullscreen').onclick=()=>$('transmitStage').classList.add('expanded');$('exitFull').onclick=()=>$('transmitStage').classList.remove('expanded');document.addEventListener('keydown',e=>{if(e.key==='Escape')$('transmitStage').classList.remove('expanded');});
function stopCamera(){epoch++;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;$('cameraPlaceholder').hidden=false;$('startCamera').textContent='カメラを起動';$('startCamera').disabled=false;$('receiveStatus').textContent='カメラ停止中';release();}
function setMode(next){mode=next;$('sendPanel').hidden=next!=='send';$('receivePanel').hidden=next!=='receive';for(const n of ['send','receive']){$(n+'Tab').classList.toggle('selected',n===next);$(n+'Tab').setAttribute('aria-pressed',String(n===next));}if(next==='send')stopCamera();else stopSend();}$('sendTab').onclick=()=>setMode('send');$('receiveTab').onclick=()=>setMode('receive');
$('startCamera').onclick=async()=>{if(stream){stopCamera();return;}const token=++epoch;$('startCamera').disabled=true;$('cameraError').textContent='';try{if(!navigator.mediaDevices?.getUserMedia)throw Error('SafariまたはChromeで直接開き、カメラを許可してください。');const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960}},audio:false});if(token!==epoch||mode!=='receive'){s.getTracks().forEach(t=>t.stop());return;}stream=s;video.srcObject=s;await video.play();view.width=video.videoWidth;view.height=video.videoHeight;tracker.reset();lastSample=-Infinity;view.parentElement.style.aspectRatio=`${view.width}/${view.height}`;finder.width=Math.min(640,view.width);finder.height=Math.round(view.height*finder.width/view.width);$('cameraPlaceholder').hidden=true;$('startCamera').textContent='カメラを止める';$('receiveStatus').textContent='目印を探しています';awake();queueCamera(token);}catch(e){stopCamera();$('cameraError').textContent=e.name==='NotAllowedError'?'カメラを許可して、もう一度起動してください。':e.message;}finally{$('startCamera').disabled=false;}};
function queueCamera(token){requestAnimationFrame(t=>{if(token===epoch)cameraLoop(t,token);});}
function cameraLoop(t,token){
 if(!stream||token!==epoch)return;
 try{
  if(video.readyState>=2){
   vctx.drawImage(video,0,0,view.width,view.height);
   if(t-lastSample>=32){
    lastSample=t;
    const img=vctx.getImageData(0,0,view.width,view.height);
    const {frame,points}=tracker.read(img,()=>{
     fc.drawImage(view,0,0,finder.width,finder.height);
     return detectMarkers(fc.getImageData(0,0,finder.width,finder.height)).map(candidate=>candidate.map(p=>({x:p.x*view.width/finder.width,y:p.y*view.height/finder.height})));
    },t,receiver.parts.size>0&&receiver.bytes===null&&t-lastReceived>1500);
    if(points){vctx.strokeStyle='#a8d5ff';vctx.lineWidth=3;vctx.beginPath();points.forEach((p,i)=>i?vctx.lineTo(p.x,p.y):vctx.moveTo(p.x,p.y));vctx.closePath();vctx.stroke();}
    if(frame){
     const prior=`${receiver.id}/${receiver.total}/${receiver.size}`;const before=receiver.parts.size;receiver.accept(frame);if(receiver.parts.size>before||prior!==`${receiver.id}/${receiver.total}/${receiver.size}`)lastReceived=t;receiveHint();
     if(prior!==`${receiver.id}/${receiver.total}/${receiver.size}`){decryptEpoch++;lastAttempt=null;$('copy').disabled=true;$('receivedText').textContent='受信しています…';}
     $('progress').value=receiver.parts.size/receiver.total;$('packetCount').textContent=`${Math.round(receiver.parts.size/receiver.total*100)}%`;
     $('receiveStatus').textContent=receiver.bytes!==null?($('copy').disabled?'受信完了 · 復号待ち':'復号完了'):`波紋受信中 · ${receiver.parts.size} / ${receiver.total}`;
     if(receiver.bytes!==null)tryDecrypt();
    }else if(receiver.bytes===null){$('receiveStatus').textContent=receiver.parts.size?`波紋受信中 · ${receiver.parts.size} / ${receiver.total}${t-lastReceived>1500?' · 読み取りを調整中':''}`:points?'模様を解析中 · 近づけて、少し静止してください':'4つの目印を探しています';}
   }
  }
 }catch(e){$('cameraError').textContent='読み取り処理でエラーが発生しました。カメラを起動し直してください。';stopCamera();return;}
 queueCamera(token);
}
$('reset').onclick=()=>{receiver.reset();tracker.reset();lastReceived=0;receiveHint();lastAttempt=null;decryptEpoch++;$('progress').value=0;$('packetCount').textContent='0%';$('receivedText').textContent='まだ受信していません。';$('copy').disabled=true;};$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('receivedText').textContent);$('copy').textContent='コピーしました';setTimeout(()=>{$('copy').textContent='コピー';},1800);}catch{$('cameraError').textContent='文章を長押ししてコピーしてください。';}};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopSend();stopCamera();}});window.addEventListener('pagehide',()=>{stopSend();stopCamera();frameStore?.dispose().catch(()=>{});});if(location.hash==='#receive')setMode('receive');

async function tryDecrypt(force=false){if(!receiver.bytes)return;const bytes=receiver.bytes,password=$('receiveKey').value,signature=Array.from(bytes).join(',')+'|'+password;if(!force&&signature===lastAttempt)return;lastAttempt=signature;const token=++decryptEpoch;$('copy').disabled=true;$('receivedText').textContent='復号しています…';try{if(!isEncrypted(bytes)){if(receiver.text===null)throw Error('データを読み取れません。');$('receivedText').textContent=receiver.text;}else{if(!password){$('receivedText').textContent='暗号化された文章を受信しました。合い言葉を入力して「復号する」を押してください。';return;}const text=await decryptMessage(bytes,password);if(token!==decryptEpoch)return;$('receivedText').textContent=text;}$('receiveStatus').textContent='復号完了';$('copy').disabled=false;}catch(e){if(token!==decryptEpoch)return;$('receivedText').textContent=e.message;$('receiveStatus').textContent='受信完了 · 合い言葉を確認';}}
$('decrypt').onclick=()=>tryDecrypt(true);
$('saveVideo').onclick=async()=>{if(exporter){exporter.cancel();return;}if(!complete)return;try{if(downloadURL)URL.revokeObjectURL(downloadURL);$('download').hidden=true;$('generate').disabled=true;$('speed').disabled=true;$('saveVideo').textContent='動画保存を中止';exporter=recordVideo(out,paintIndex,prepared.length,+$('speed').value,p=>{$('exportStatus').textContent=`動画を保存中 · ${Math.round(p*100)}%`;});await awake();const result=await exporter.promise;downloadURL=URL.createObjectURL(result.blob);$('download').href=downloadURL;$('download').download='AFTERLIGHT-RIPPLE.'+result.extension;$('download').textContent=result.extension.toUpperCase()+'をダウンロード';$('download').hidden=false;$('exportStatus').textContent='保存用動画ができました。下のリンクからダウンロードしてください。';}catch(e){$('exportStatus').textContent=e.message;}finally{exporter=null;$('generate').disabled=false;$('speed').disabled=false;$('saveVideo').textContent='動画を保存';started=performance.now();index=-1;if(!active)release();}};
