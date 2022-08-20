(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('chai'), require('eventti')) :
    typeof define === 'function' && define.amd ? define(['chai', 'eventti'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.chai, global.eventti));
})(this, (function (chai, eventti) { 'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    const { r: DEFAULT_REQUEST_TICK, c: DEFAULT_CANCEL_TICK } = (() => {
        if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
            return {
                r: (callback) => requestAnimationFrame(callback),
                c: (handle) => cancelAnimationFrame(handle),
            };
        }
        else {
            const frameTime = 1000 / 60;
            const now = typeof performance === 'undefined' ? () => Date.now() : () => performance.now();
            return {
                r: (callback) => setTimeout(() => callback(now()), frameTime),
                c: (requestId) => clearTimeout(requestId),
            };
        }
    })();
    var AutoTickState;
    (function (AutoTickState) {
        AutoTickState[AutoTickState["OFF"] = 0] = "OFF";
        AutoTickState[AutoTickState["ON"] = 1] = "ON";
        AutoTickState[AutoTickState["PAUSED"] = 2] = "PAUSED";
    })(AutoTickState || (AutoTickState = {}));
    class Ticker {
        constructor(options = {}) {
            const { phases = [], autoTick = AutoTickState.ON, allowDuplicateListeners = true, idDedupeMode = 'replace', requestTick = DEFAULT_REQUEST_TICK, cancelTick = DEFAULT_CANCEL_TICK, } = options;
            this.phases = phases;
            this.allowDuplicateListeners = allowDuplicateListeners;
            this._autoTick = autoTick;
            this._autoTickId = null;
            this._requestTick = requestTick;
            this._cancelTick = cancelTick;
            this._emitter = new eventti.Emitter({ allowDuplicateListeners, idDedupeMode });
            this._queue = [];
            this.tick = this.tick.bind(this);
        }
        get autoTick() {
            return this._autoTick;
        }
        set autoTick(autoTickState) {
            if (autoTickState === AutoTickState.ON) {
                if (this._emitter.listenerCount()) {
                    this._requestFrame();
                }
            }
            else {
                this._cancelFrame();
            }
            this._autoTick = autoTickState;
        }
        get idDedupeMode() {
            return this._emitter.idDedupeMode;
        }
        set idDedupeMode(idDedupeMode) {
            this._emitter.idDedupeMode = idDedupeMode;
        }
        tick(time) {
            this._autoTickId = null;
            const { _queue } = this;
            if (_queue.length) {
                throw new Error(`Can't tick before the previous tick has finished.`);
            }
            this._requestFrame();
            const { phases, _emitter } = this;
            let i;
            let j;
            let iCount;
            let jCount;
            let listeners;
            let maybeListeners;
            for (i = 0, iCount = phases.length; i < iCount; i++) {
                maybeListeners = _emitter['_getListeners'](phases[i]);
                if (maybeListeners)
                    _queue.push(maybeListeners);
            }
            for (i = 0, iCount = _queue.length; i < iCount; i++) {
                listeners = _queue[i];
                for (j = 0, jCount = listeners.length; j < jCount; j++) {
                    listeners[j](time);
                }
            }
            _queue.length = 0;
            if (this._autoTickId !== null && !_emitter.listenerCount()) {
                this._cancelFrame();
            }
        }
        on(phase, listener, listenerId) {
            const id = this._emitter.on(phase, listener, listenerId);
            this._requestFrame();
            return id;
        }
        once(phase, listener, listenerId) {
            const id = this._emitter.once(phase, listener, listenerId);
            this._requestFrame();
            return id;
        }
        off(phase, listener) {
            return this._emitter.off(phase, listener);
        }
        listenerCount(phase) {
            return this._emitter.listenerCount(phase);
        }
        _requestFrame() {
            if (this._autoTick === AutoTickState.ON && this._autoTickId === null) {
                this._autoTickId = this._requestTick(this.tick);
            }
        }
        _cancelFrame() {
            if (this._autoTickId !== null) {
                this._cancelTick(this._autoTickId);
                this._autoTickId = null;
            }
        }
    }

    it(`Add a phase listener.`, () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const ticker = new Ticker({ phases: ['a'] });
            let counter = 0;
            ticker.on('a', () => {
                if (++counter === 3) {
                    ticker.off();
                    chai.assert.equal(1, 1);
                    resolve();
                }
            });
        });
    }));
    it(`Add a once phase listener.`, () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const ticker = new Ticker({ phases: ['a'] });
            let counter = 0;
            ticker.once('a', () => {
                if (++counter > 1) {
                    ticker.off();
                    chai.assert.fail();
                }
            });
            setTimeout(() => {
                ticker.off();
                chai.assert.equal(1, 1);
                resolve();
            }, 500);
        });
    }));
    it(`Remove a phase listener by id.`, () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const ticker = new Ticker({ phases: ['a'] });
            let counter = 0;
            const aId = ticker.on('a', () => {
                if (++counter === 3) {
                    ticker.off('a', aId);
                }
            });
            const aOnceId = ticker.on('a', () => {
                chai.assert.fail();
            });
            ticker.off('a', aOnceId);
            setTimeout(() => {
                chai.assert.equal(counter, 3);
                resolve();
            }, 500);
        });
    }));
    it(`Remove a phase listener by reference.`, () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const ticker = new Ticker({ phases: ['a'] });
            let counter = 0;
            const listener = () => {
                if (++counter === 3) {
                    ticker.off('a', listener);
                }
            };
            ticker.on('a', listener);
            setTimeout(() => {
                chai.assert.equal(counter, 3);
                resolve();
            }, 500);
        });
    }));
    it(`Auto-tick mode is enabled by default.`, () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const ticker = new Ticker({ phases: ['a'] });
            ticker.once('a', () => {
                chai.assert.equal(1, 1);
                resolve();
            });
        });
    }));
    it(`Auto-tick mode can be disabled on instantiation.`, () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const ticker = new Ticker({ phases: ['a'], autoTick: AutoTickState.OFF });
            ticker.once('a', () => {
                chai.assert.fail();
            });
            setTimeout(() => {
                ticker.off();
                ticker.once('a', () => {
                    chai.assert.equal(1, 1);
                    resolve();
                });
                ticker.tick(Date.now());
            }, 500);
        });
    }));
    it(`Phase listener has frame timestamp as it's only argument.`, () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const ticker = new Ticker({ phases: ['a'] });
            ticker.once('a', (...args) => {
                chai.assert.equal(args.length, 1);
                chai.assert.equal(typeof args[0], 'number');
                resolve();
            });
        });
    }));
    it('Change phases dynamically after instantiation.', () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const ticker = new Ticker({ phases: ['a', 'b', 'x'] });
            let data = '';
            ticker.on('a', () => {
                data += 'a';
            });
            ticker.on('b', () => {
                data += 'b';
            });
            ticker.on('x', () => {
                ticker.phases = ['b', 'a', 'x'];
                if (data.length >= 4) {
                    ticker.off();
                    chai.assert.equal(data, 'abba');
                    resolve();
                }
            });
        });
    }));
    it('Execute the same phase multiple times in a single tick.', () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const ticker = new Ticker({ phases: ['a', 'b', 'b', 'a', 'x'] });
            let data = '';
            ticker.on('a', () => {
                data += 'a';
            });
            ticker.on('b', () => {
                data += 'b';
            });
            ticker.on('x', () => {
                ticker.off();
                chai.assert.equal(data, 'abba');
                resolve();
            });
        });
    }));

}));
