import assert from 'node:assert/strict';
import {recordVideo} from '../ripple/export.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let captures=[],redraws=0,packet=-1,stopped=0,manual=true,rates=[];
const track={stop(){stopped++;},get requestFrame(){return manual?()=>captures.push(packet):undefined;}};
const canvas={getContext(){return{drawImage(){redraws++;if(!manual)captures.push(packet);}};},captureStream(rate){rates.push(rate);return{getTracks:()=>[track],getVideoTracks:()=>[track]};}};
class Recorder{static isTypeSupported(){return true;}constructor(stream,options){this.state='inactive';this.mimeType=options.mimeType;}start(){this.state='recording';}stop(){this.state='inactive';setTimeout(()=>{this.ondataavailable({data:new Blob(['test'])});this.onstop();},0);}}
globalThis.MediaRecorder=Recorder;
for(const fallback of [false,true]){manual=!fallback;captures=[];redraws=0;stopped=0;rates=[];const draws=[];
 const result=recordVideo(canvas,async i=>{await delay(10);packet=i;draws.push(i);},2,100,()=>{});await result.promise;
 assert.deepEqual(draws,[0,1,0,1]);assert.ok(captures.length>=10,'record repeated images, not only four packet changes');assert.ok(captures.filter(i=>i===0).length>=4);assert.ok(captures.filter(i=>i===1).length>=4);assert.ok(redraws>=10);assert.deepEqual(rates,fallback?[0,30]:[0]);const before=captures.length;await delay(50);assert.equal(captures.length,before,'capture stops on completion');assert.ok(stopped);
}
manual=true;captures=[];const cancelled=recordVideo(canvas,async i=>{packet=i;},3,100,()=>{});const rejected=assert.rejects(cancelled.promise,/中止/);await delay(45);cancelled.cancel();await rejected;const before=captures.length;await delay(50);assert.equal(captures.length,before);
console.log('PASS repeated-frame capture at 30fps, both loops, browser fallback, completion and cancellation cleanup');
