!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports,require("eventti")):"function"==typeof define&&define.amd?define(["exports","eventti"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).tikki={},t.eventti)}(this,(function(t,e){"use strict";const i="undefined"==typeof performance?Date:performance;function n(t=1e3/60){return{requestAnimationFrame:e=>setTimeout((()=>{e(i.now())}),t),cancelAnimationFrame:t=>{clearTimeout(t)}}}function s(){return"function"==typeof requestAnimationFrame&&"function"==typeof cancelAnimationFrame?{requestAnimationFrame:(...t)=>requestAnimationFrame(...t),cancelAnimationFrame:(...t)=>cancelAnimationFrame(...t)}:n()}const{requestAnimationFrame:r,cancelAnimationFrame:o}=s();t.Ticker=class{constructor(t={}){const{phases:i=[],autoTick:n=!0,raf:s=r,caf:a=o}=t;this.phases=i,this.autoTick=n,this._raf=s,this._caf=a,this._rafId=null,this._emitter=new e.Emitter,this._queue=[],this.tick=this.tick.bind(this)}tick(t){this._rafId=null;const{_queue:e}=this;if(e.length)throw new Error("Can't tick before the previous tick has finished.");this.start();const{phases:i,_emitter:n}=this;let s,r,o,a,c,f;for(s=0,o=i.length;s<o;s++)f=n._getListeners(i[s]),f&&e.push(f);for(s=0,o=e.length;s<o;s++)for(c=e[s],r=0,a=c.length;r<a;r++)c[r](t);e.length=0,this.autoTick&&!n.listenerCount()&&this.stop()}start(){this.autoTick&&null===this._rafId&&(this._rafId=this._raf(this.tick))}stop(){null!==this._rafId&&(this._caf(this._rafId),this._rafId=null)}on(t,e){const i=this._emitter.on(t,e);return this.start(),i}once(t,e){const i=this._emitter.once(t,e);return this.start(),i}off(t,e){return this._emitter.off(t,e)}listenerCount(t){return this._emitter.listenerCount(t)}},t.getRafFallbackMethods=n,t.getRafMethods=s,Object.defineProperty(t,"__esModule",{value:!0})}));