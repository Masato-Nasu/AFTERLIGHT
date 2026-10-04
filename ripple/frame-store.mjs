// Keep long transmissions on disk; only a few decoded frames stay in memory.
const DB='afterlight-ripple-frames';
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const finished=t=>new Promise((resolve,reject)=>{t.oncomplete=resolve;t.onerror=t.onabort=()=>reject(t.error||Error('模様を一時保存できませんでした。空き容量を確認してください。'));});
export class FrameStore{
 constructor(db){this.db=db;this.id=crypto.randomUUID();this.cache=new Map();this.closed=false;}
 static async create(){
  if(!globalThis.indexedDB)throw Error('長文の一時保存に対応したブラウザで開いてください。');
  const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore('frames');r.result.createObjectStore('runs');};const db=await request(r),s=new FrameStore(db);
  const tx=db.transaction(['runs','frames'],'readwrite'),done=finished(tx),runs=tx.objectStore('runs'),all=await request(runs.getAll());
  for(const run of all)if(Date.now()-run.created>86400000){tx.objectStore('frames').delete(IDBKeyRange.bound([run.id,0],[run.id,4095]));runs.delete(run.id);}
  runs.put({id:s.id,created:Date.now()},s.id);await done;return s;
 }
 async put(index,data,compressed){const tx=this.db.transaction('frames','readwrite'),done=finished(tx);tx.objectStore('frames').put({data,compressed},[this.id,index]);await done;}
 get(index){if(this.closed)return Promise.reject(Error('送信を停止しました。'));if(this.cache.has(index))return this.cache.get(index);const result=(async()=>{const tx=this.db.transaction('frames'),value=await request(tx.objectStore('frames').get([this.id,index]));if(!value)throw Error('模様を読み出せません。再生成してください。');return value.compressed?new Uint8Array(await new Response(new Blob([value.data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()):value.data;})();this.cache.set(index,result);while(this.cache.size>3)this.cache.delete(this.cache.keys().next().value);return result;}
 async dispose(){if(this.closed)return;this.closed=true;this.cache.clear();const tx=this.db.transaction(['runs','frames'],'readwrite'),done=finished(tx);tx.objectStore('frames').delete(IDBKeyRange.bound([this.id,0],[this.id,4095]));tx.objectStore('runs').delete(this.id);try{await done;}finally{this.db.close();}}
}
