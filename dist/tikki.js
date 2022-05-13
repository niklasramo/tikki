import{Emitter}from"eventti";class Ticker{lanes;autoTick;_rafId;_emitter;_callbackLists;constructor(){this.lanes=[],this.autoTick=!0,this._rafId=null,this._emitter=new Emitter,this._callbackLists=[],this.tick=this.tick.bind(this)}tick(t){this._rafId=null;const{_callbackLists:i,lanes:e}=this;let s,r,n,c,h,a;for(s=0,n=e.length;s<n;s++)a=this._emitter._getListeners(e[s]),a&&i.push(a);for(s=0,n=i.length;s<n;s++)for(h=i[s],r=0,c=h.length;r<c;r++)h[r](t);i.length=0,this.autoTick&&this._emitter.listenerCount()&&this.requestTick()}requestTick(){this.autoTick&&null===this._rafId&&(this._rafId=requestAnimationFrame(this.tick))}cancelTick(){null!==this._rafId&&(cancelAnimationFrame(this._rafId),this._rafId=null)}on(t,i){const e=this._emitter.on(t,i);return this.requestTick(),e}once(t,i){const e=this._emitter.once(t,i);return this.requestTick(),e}off(t,i){return this._emitter.off(t,i)}}export{Ticker};