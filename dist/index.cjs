"use strict";var u=Object.defineProperty;var h=Object.getOwnPropertyDescriptor;var d=Object.getOwnPropertyNames;var F=Object.prototype.hasOwnProperty;var _=(a,e)=>{for(var t in e)u(a,t,{get:e[t],enumerable:!0})},C=(a,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of d(e))!F.call(a,r)&&r!==t&&u(a,r,{get:()=>e[r],enumerable:!(s=h(e,r))||s.enumerable});return a};var f=a=>C(u({},"__esModule",{value:!0}),a);var q={};_(q,{AutoTicker:()=>m,Ticker:()=>o,TickerDedupe:()=>k,createRequestFrame:()=>l,createXrRequestFrame:()=>b});module.exports=f(q);var c=require("eventti"),k=c.EmitterDedupe,o=class{constructor(e={}){let{phases:t=[],dedupe:s,getId:r}=e;this._phases=t,this._emitter=new c.Emitter({getId:r,dedupe:s}),this._queue=[],this.tick=this.tick.bind(this),this._getListeners=this._emitter._getListeners.bind(this._emitter)}get phases(){return this._phases}set phases(e){this._phases=e}get dedupe(){return this._emitter.dedupe}set dedupe(e){this._emitter.dedupe=e}get getId(){return this._emitter.getId}set getId(e){this._emitter.getId=e}tick(...e){this._assertEmptyQueue(),this._fillQueue(),this._processQueue(...e)}on(e,t,s){return this._emitter.on(e,t,s)}once(e,t,s){return this._emitter.once(e,t,s)}off(e,t){return this._emitter.off(e,t)}count(e){return this._emitter.listenerCount(e)}_assertEmptyQueue(){if(this._queue.length)throw new Error("Ticker: Can't tick before the previous tick has finished!")}_fillQueue(){let e=this._queue,t=this._phases,s=this._getListeners,r=0,i=t.length,n;for(;r<i;r++)n=s(t[r]),n&&e.push(n);return e}_processQueue(...e){let t=this._queue,s=t.length;if(!s)return;let r=0,i=0,n,p;for(;r<s;r++)for(n=t[r],i=0,p=n.length;i<p;i++)n[i](...e);t.length=0}};function l(a=60){if(typeof requestAnimationFrame=="function"&&typeof cancelAnimationFrame=="function")return e=>{let t=requestAnimationFrame(e);return()=>cancelAnimationFrame(t)};{let e=1e3/a,t=typeof performance>"u"?()=>Date.now():()=>performance.now();return s=>{let r=setTimeout(()=>s(t()),e);return()=>clearTimeout(r)}}}var m=class extends o{constructor(e={}){let{paused:t=!1,onDemand:s=!1,requestFrame:r=l(),...i}=e;super(i),this._paused=t,this._onDemand=s,this._requestFrame=r,this._cancelFrame=null,this._empty=!0,!t&&!s&&this._request()}get phases(){return this._phases}set phases(e){this._phases=e,e.length?(this._empty=!1,this._request()):this._empty=!0}get paused(){return this._paused}set paused(e){this._paused=e,e?this._cancel():this._request()}get onDemand(){return this._paused}set onDemand(e){this._onDemand=e,e||this._request()}get requestFrame(){return this._requestFrame}set requestFrame(e){this._requestFrame!==e&&(this._requestFrame=e,this._cancelFrame&&(this._cancel(),this._request()))}tick(...e){if(this._assertEmptyQueue(),this._cancelFrame=null,this._onDemand||this._request(),!this._empty){if(!this._fillQueue().length){this._empty=!0;return}this._onDemand&&this._request(),this._processQueue(...e)}}on(e,t,s){let r=super.on(e,t,s);return this._empty=!1,this._request(),r}once(e,t,s){let r=super.once(e,t,s);return this._empty=!1,this._request(),r}_request(){this._paused||this._cancelFrame||(this._cancelFrame=this._requestFrame(this.tick))}_cancel(){this._cancelFrame&&(this._cancelFrame(),this._cancelFrame=null)}};function b(a){return e=>{let t=a.requestAnimationFrame(e);return()=>a.cancelAnimationFrame(t)}}0&&(module.exports={AutoTicker,Ticker,TickerDedupe,createRequestFrame,createXrRequestFrame});