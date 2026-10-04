const install=document.getElementById('installApp'),update=document.getElementById('updateApp'),status=document.getElementById('pwaStatus');
let prompt=null,waiting=null,reloading=false;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function say(text){status.textContent=text;status.hidden=false;}
function installed(){install.hidden=true;if(!waiting)say('アプリとして利用中');}
if(standalone())installed();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;if(!standalone())install.hidden=false;});
install.onclick=async()=>{if(!prompt)return;const choice=prompt;prompt=null;install.hidden=true;await choice.prompt();const result=await choice.userChoice;if(result.outcome!=='accepted')say('ブラウザのメニューからもインストールできます。');};
window.addEventListener('appinstalled',installed);
function offerUpdate(worker){waiting=worker;update.hidden=false;say('新しい版があります。更新すると送受信を停止して再起動します。');}
update.onclick=()=>{if(!waiting)return;reloading=true;update.disabled=true;waiting.postMessage({type:'SKIP_WAITING'});};
if('serviceWorker' in navigator){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();});
 window.addEventListener('load',async()=>{try{
  const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
  if(registration.waiting)offerUpdate(registration.waiting);
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){if(navigator.serviceWorker.controller)offerUpdate(worker);else if(!standalone())say('オフラインで使う準備ができました。');}});});
  if(registration.active&&!waiting&&!standalone())say('オフラインで使えます。');
 }catch{say('オフラインの準備ができませんでした。通信できる状態でもう一度開いてください。');}});
}
