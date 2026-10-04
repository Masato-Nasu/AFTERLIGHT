const CACHE='afterlight-ripple-pwa-v3';
const ASSETS=["./", "../style.css", "./app.mjs", "./camera-tracker.mjs", "./codec.mjs", "./crypto.mjs", "./export.mjs", "./fec.mjs", "./frame-store.mjs", "./generator.mjs", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon.svg", "./icons/maskable-512.png", "./manifest.webmanifest", "./markers.mjs", "./packet.mjs", "./palette.mjs", "./pwa.mjs", "./waves.mjs", "./worker.mjs"];
const urls=ASSETS.map(p=>new URL(p,self.location).href);
const allowed=new Set(urls);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 for(const url of urls){
  const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin'}));
  if(!response.ok||response.redirected)throw Error('App asset unavailable: '+new URL(url).pathname);
  const type=response.headers.get('content-type')||'';
  if(new URL(url).pathname.endsWith('.mjs')&&type.includes('text/html'))throw Error('Sign-in page is not an app asset');
  if(url===new URL('./',self.location).href&&!(await response.clone().text()).includes('AFTERLIGHT / RIPPLE'))throw Error('App page unavailable');
  await cache.put(url,response);
 }
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('afterlight-ripple-pwa-')&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 url.search='';url.hash='';
 const base=new URL('./',self.location);let key=url.href;
 if(request.mode==='navigate'&&url.pathname.startsWith(base.pathname))key=base.href;
 if(!allowed.has(key))return;
 event.respondWith((async()=>{const cached=await (await caches.open(CACHE)).match(key);return cached||fetch(request);})());
});
