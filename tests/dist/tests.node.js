import { assert } from 'chai';
import { Emitter } from 'eventti';

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

function createRequestFrame(fallbackFPS = 60) {
    if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
        return (callback) => {
            const handle = requestAnimationFrame(callback);
            return () => cancelAnimationFrame(handle);
        };
    }
    else {
        const frameTime = 1000 / fallbackFPS;
        const now = typeof performance === 'undefined' ? () => Date.now() : () => performance.now();
        return (callback) => {
            const handle = setTimeout(() => callback(now()), frameTime);
            return () => clearTimeout(handle);
        };
    }
}

var AutoTickState;
(function (AutoTickState) {
    AutoTickState[AutoTickState["PAUSED"] = 1] = "PAUSED";
    AutoTickState[AutoTickState["ON_DEMAND"] = 2] = "ON_DEMAND";
    AutoTickState[AutoTickState["CONTINUOUS"] = 3] = "CONTINUOUS";
})(AutoTickState || (AutoTickState = {}));
class Ticker {
    constructor(options = {}) {
        const { phases = [], autoTick = AutoTickState.ON_DEMAND, allowDuplicateListeners = true, idDedupeMode = 'replace', requestFrame = createRequestFrame(), } = options;
        this.phases = phases;
        this._autoTick = autoTick;
        this._requestFrame = requestFrame;
        this._cancelFrame = null;
        this._queue = [];
        this._emitter = new Emitter({ allowDuplicateListeners, idDedupeMode });
        this.tick = this.tick.bind(this);
    }
    get requestFrame() {
        return this._requestFrame;
    }
    set requestFrame(requestFrame) {
        this._requestFrame = requestFrame;
        this._kickstart();
    }
    get autoTick() {
        return this._autoTick;
    }
    set autoTick(autoTickState) {
        this._autoTick = autoTickState;
        this._kickstart();
    }
    get allowDuplicateListeners() {
        return this._emitter.allowDuplicateListeners;
    }
    set allowDuplicateListeners(allowDuplicateListeners) {
        this._emitter.allowDuplicateListeners =
            allowDuplicateListeners;
    }
    get idDedupeMode() {
        return this._emitter.idDedupeMode;
    }
    set idDedupeMode(idDedupeMode) {
        this._emitter.idDedupeMode = idDedupeMode;
    }
    tick(...args) {
        this._cancelFrame = null;
        const { _queue } = this;
        if (_queue.length) {
            throw new Error(`Ticker: Can't tick before the previous tick has finished!`);
        }
        this._request();
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
                listeners[j](...args);
            }
        }
        _queue.length = 0;
        if (this._autoTick === AutoTickState.ON_DEMAND && !_emitter.listenerCount()) {
            this._cancel();
        }
    }
    on(phase, listener, listenerId) {
        const id = this._emitter.on(phase, listener, listenerId);
        this._request();
        return id;
    }
    once(phase, listener, listenerId) {
        const id = this._emitter.once(phase, listener, listenerId);
        this._request();
        return id;
    }
    off(phase, listener) {
        return this._emitter.off(phase, listener);
    }
    listenerCount(phase) {
        return this._emitter.listenerCount(phase);
    }
    _request() {
        if (this._requestFrame && !this._cancelFrame && this._autoTick >= AutoTickState.ON_DEMAND) {
            this._cancelFrame = this._requestFrame(this.tick);
        }
    }
    _cancel() {
        if (this._cancelFrame) {
            this._cancelFrame();
            this._cancelFrame = null;
        }
    }
    _kickstart() {
        if (this._autoTick === AutoTickState.ON_DEMAND) {
            if (this._emitter.listenerCount())
                this._request();
        }
        else if (this._autoTick === AutoTickState.CONTINUOUS) {
            this._request();
        }
        else {
            this._cancel();
        }
    }
}

describe('phase', () => {
    it(`should be allowed to be a string, number or symbol in all methods`, () => {
        ['', 'foo', 0, 1, -1, Infinity, -Infinity, Symbol()].forEach((eventName) => {
            const ticker = new Ticker({ phases: [eventName], autoTick: AutoTickState.PAUSED });
            let counter = 0;
            ticker.on(eventName, () => {
                ++counter;
            });
            ticker.once(eventName, () => {
                ++counter;
            });
            assert.equal(ticker.listenerCount(eventName), 2);
            ticker.tick(0);
            assert.equal(counter, 2);
            ticker.off(eventName);
            assert.equal(ticker.listenerCount(eventName), 0);
        });
    });
});
describe('ticker.on()', () => {
    describe('ticker.on(phase, listener)', () => {
        it(`should return a symbol which serves as a unique id and can be used to remove the listener`, () => {
            const ticker = new Ticker({ phases: ['test'], autoTick: AutoTickState.PAUSED });
            let counter = 0;
            const listenerId = ticker.on('test', () => {
                ++counter;
            });
            ticker.off('test', listenerId);
            ticker.tick(0);
            assert.equal(typeof listenerId, 'symbol');
            assert.equal(counter, 0);
        });
        it('should allow duplicate listeners by default', () => {
            const ticker = new Ticker({ phases: ['test'], autoTick: AutoTickState.PAUSED });
            let counter = 0;
            const listener = () => {
                ++counter;
            };
            ticker.on('test', listener);
            ticker.on('test', listener);
            ticker.tick(0);
            assert.equal(ticker.allowDuplicateListeners, true);
            assert.equal(counter, 2);
        });
        it('should throw an error when ticker.allowDuplicateListeners is false and a duplicate listener is added', () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
                allowDuplicateListeners: false,
            });
            const listener = () => { };
            ticker.on('test', listener);
            assert.equal(ticker.allowDuplicateListeners, false);
            assert.throws(() => ticker.on('test', listener));
        });
    });
    describe('ticker.on(phase, listener, listenerId)', () => {
        it(`should accept any string, number or symbol as the listener id and always return the provided listener id, which can be used to remove the listener`, () => {
            ['', 'foo', 0, 1, -1, Infinity, -Infinity, Symbol()].forEach((listenerId) => {
                ['ignore', 'replace', 'update', 'throw'].forEach((idDedupeMode) => {
                    const ticker = new Ticker({
                        phases: ['test'],
                        autoTick: AutoTickState.PAUSED,
                        idDedupeMode,
                    });
                    let count = 0;
                    const listener = () => {
                        ++count;
                    };
                    assert.equal(ticker.on('test', listener, listenerId), listenerId);
                    if (idDedupeMode === 'throw') {
                        try {
                            assert.throws(() => ticker.on('test', listener, listenerId));
                        }
                        catch (e) { }
                    }
                    else {
                        assert.equal(ticker.on('test', listener, listenerId), listenerId);
                    }
                    ticker.tick(0);
                    assert.equal(count, 1);
                    assert.equal(ticker.listenerCount('test'), 1);
                    ticker.off('test', listenerId);
                    assert.equal(ticker.listenerCount('test'), 0);
                    ticker.tick(0);
                    assert.equal(count, 1);
                });
            });
        });
        it('should ignore the listener silenty when duplicate id is provided and ticker.idDedupeMode is set to "ignore"', () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
                idDedupeMode: 'ignore',
            });
            let result = 0;
            ticker.on('test', () => void (result = 1), 'foo');
            ticker.on('test', () => void (result = 2), 'foo');
            ticker.tick(0);
            assert.equal(result, 1);
        });
        it('should throw an error when duplicate id is provided and ticker.idDedupeMode is set to "throw"', () => {
            const emitter = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
                idDedupeMode: 'throw',
            });
            emitter.on('test', () => { }, 'foo');
            assert.throws(() => emitter.on('test', () => { }, 'foo'));
        });
        it('should remove the existing listener id and add the new listener id to the end of the listener queue when duplicate id is provided and ticker.idDedupeMode is set to "replace"', () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
                idDedupeMode: 'replace',
            });
            let result = '';
            ticker.on('test', () => void (result += '1'), 'foo');
            ticker.on('test', () => void (result += '2'));
            ticker.on('test', () => void (result += '3'), 'foo');
            ticker.tick(0);
            assert.equal(result, '23');
        });
        it('should replace (in place) the existing listener id`s listener with the new listener when duplicate id is provided and ticker.idDedupeMode is set to "update"', () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
                idDedupeMode: 'update',
            });
            let result = '';
            ticker.on('test', () => void (result += '1'), 'foo');
            ticker.on('test', () => void (result += '2'));
            ticker.on('test', () => void (result += '3'), 'foo');
            ticker.tick(0);
            assert.equal(result, '32');
        });
    });
});
describe('ticker.once()', () => {
    describe('ticker.once(eventName, listener)', () => {
        it(`should return a symbol which serves as a unique id and can be used to remove the listener`, () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
            });
            let counter = 0;
            const listenerId = ticker.once('test', () => {
                ++counter;
            });
            ticker.off('test', listenerId);
            ticker.tick(0);
            assert.equal(typeof listenerId, 'symbol');
            assert.equal(counter, 0);
        });
        it('should allow duplicate listeners by default', () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
            });
            let counter = 0;
            const listener = () => {
                ++counter;
            };
            ticker.once('test', listener);
            ticker.once('test', listener);
            ticker.tick(0);
            assert.equal(ticker.allowDuplicateListeners, true);
            assert.equal(counter, 2);
        });
        it('should throw an error when ticker.allowDuplicateListeners is false and a duplicate listener is added', () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
                allowDuplicateListeners: false,
            });
            const listener = () => { };
            ticker.once('test', listener);
            assert.equal(ticker.allowDuplicateListeners, false);
            assert.throws(() => ticker.once('test', listener));
        });
    });
    describe('ticker.once(phase, listener, listenerId)', () => {
        it(`should accept any string, number or symbol as the listener id and always return the provided listener id, which can be used to remove the listener`, () => {
            ['', 'foo', 0, 1, -1, Infinity, -Infinity, Symbol()].forEach((listenerId) => {
                ['ignore', 'replace', 'update', 'throw'].forEach((idDedupeMode) => {
                    const ticker = new Ticker({
                        phases: ['test'],
                        autoTick: AutoTickState.PAUSED,
                        idDedupeMode,
                    });
                    let count = 0;
                    const listener = () => {
                        ++count;
                    };
                    assert.equal(ticker.once('test', listener, listenerId), listenerId);
                    if (idDedupeMode === 'throw') {
                        assert.throws(() => ticker.once('test', listener, listenerId));
                    }
                    else {
                        assert.equal(ticker.once('test', listener, listenerId), listenerId);
                    }
                    ticker.tick(0);
                    assert.equal(count, 1);
                    ticker.once('test', listener, listenerId);
                    ticker.off('test', listenerId);
                    ticker.tick(0);
                    assert.equal(count, 1);
                });
            });
        });
        it('should ignore the listener silenty when duplicate id is provided and ticker.idDedupeMode is set to "ignore"', () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
                idDedupeMode: 'ignore',
            });
            let result = 0;
            ticker.once('test', () => void (result = 1), 'foo');
            ticker.once('test', () => void (result = 2), 'foo');
            ticker.tick(0);
            assert.equal(result, 1);
        });
        it('should throw an error when duplicate id is provided and ticker.idDedupeMode is set to "throw"', () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
                idDedupeMode: 'throw',
            });
            ticker.once('test', () => { }, 'foo');
            assert.throws(() => ticker.once('test', () => { }, 'foo'));
        });
        it('should remove the existing listener id and add the new listener id to the end of the listener queue when duplicate id is provided and ticker.idDedupeMode is set to "replace"', () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
                idDedupeMode: 'replace',
            });
            let result = '';
            ticker.once('test', () => void (result += '1'), 'foo');
            ticker.once('test', () => void (result += '2'));
            ticker.once('test', () => void (result += '3'), 'foo');
            ticker.tick(0);
            assert.equal(result, '23');
        });
        it('should replace (in place) the existing listener id`s listener with the new listener when duplicate id is provided and ticker.idDedupeMode is set to "update"', () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
                idDedupeMode: 'update',
            });
            let result = '';
            ticker.once('test', () => void (result += '1'), 'foo');
            ticker.once('test', () => void (result += '2'));
            ticker.once('test', () => void (result += '3'), 'foo');
            ticker.tick(0);
            assert.equal(result, '32');
        });
    });
});
describe('ticker.off()', () => {
    describe('ticker.off(phase, listenerId)', () => {
        it(`should remove specific listener of a specific phase that matches the provided listener id`, () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
            });
            let value = '';
            ticker.on('test', () => {
                value += 'a';
            });
            const b = ticker.on('test', () => {
                value += 'b';
            });
            ticker.on('test', () => {
                value += 'c';
            });
            ticker.off('test', b);
            ticker.tick(0);
            assert.equal(value, 'ac');
        });
    });
    describe('ticker.off(phase, listener)', () => {
        it(`should remove all listeners of a specific phase that matches the provided listener`, () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
            });
            let value = '';
            const listenerA = () => {
                value += 'a';
            };
            const listenerB = () => {
                value += 'b';
            };
            const listenerC = () => {
                value += 'c';
            };
            ticker.on('test', listenerA);
            ticker.on('test', listenerB);
            ticker.on('test', listenerC);
            ticker.off('test', listenerB);
            ticker.tick(0);
            assert.equal(value, 'ac');
        });
    });
    describe('ticker.off(eventName)', () => {
        it(`should remove all listeners of a specific phase`, () => {
            const ticker = new Ticker({
                phases: ['pass', 'fail'],
                autoTick: AutoTickState.PAUSED,
            });
            let result = '';
            ticker.on('pass', () => {
                result += 'pass';
            });
            ticker.on('fail', () => {
                result += 'fail';
            });
            ticker.on('fail', () => {
                result += 'fail';
            });
            ticker.off('fail');
            ticker.tick(0);
            assert.equal(result, 'pass');
        });
    });
    describe('ticker.off()', () => {
        it(`should remove all phases and their listeners from the ticker`, () => {
            const ticker = new Ticker({
                phases: ['a', 'b', 'c'],
                autoTick: AutoTickState.PAUSED,
            });
            ticker.on('a', () => assert.fail());
            ticker.on('b', () => assert.fail());
            ticker.on('c', () => assert.fail());
            ticker.off();
            ticker.tick(0);
            assert.equal(1, 1);
        });
    });
});
describe('ticker.tick()', () => {
    describe('ticker.tick(time)', () => {
        it(`should emit the phases once in the defined order with correct arguments`, () => {
            const ticker = new Ticker({
                phases: ['b', 'c', 'a', 'a', 'b'],
                autoTick: AutoTickState.PAUSED,
            });
            let result = '';
            ticker.on('a', (...args) => {
                assert.equal(args.length, 1);
                assert.equal(args[0], 10);
                result += 'a';
            });
            ticker.on('b', (...args) => {
                assert.equal(args.length, 1);
                assert.equal(args[0], 10);
                result += 'b';
            });
            ticker.on('c', (...args) => {
                assert.equal(args.length, 1);
                assert.equal(args[0], 10);
                result += 'c';
            });
            ticker.tick(10);
            assert.equal(result, ticker.phases.join(''));
        });
        it('should allow changing ticker.phases dynamically', () => __awaiter(void 0, void 0, void 0, function* () {
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
                        assert.equal(data, 'abba');
                        resolve();
                    }
                });
            });
        }));
        it(`should throw an error if tick is called within a listener`, () => {
            const ticker = new Ticker({
                phases: ['test'],
                autoTick: AutoTickState.PAUSED,
            });
            ticker.on('test', () => {
                assert.throws(() => ticker.tick(0));
            });
            ticker.tick(0);
        });
        it(`should pass all the arguments to the listeners`, () => __awaiter(void 0, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const ticker = new Ticker({
                    phases: ['a', 'b'],
                    autoTick: AutoTickState.PAUSED,
                    requestFrame: undefined,
                });
                ticker.on('a', (time, deltaTime, message, ...args) => {
                    assert.equal(args.length, 0);
                    assert.equal(time, 1);
                    assert.equal(deltaTime, 2);
                    assert.equal(message, 'test');
                });
                ticker.on('b', (time, deltaTime, message, ...args) => {
                    assert.equal(args.length, 0);
                    assert.equal(time, 1);
                    assert.equal(deltaTime, 2);
                    assert.equal(message, 'test');
                    resolve();
                });
                ticker.tick(1, 2, 'test');
            });
        }));
        it(`should only emit the listeners of the active phases`, () => {
            const ticker = new Ticker({
                phases: ['a', 'b'],
                autoTick: AutoTickState.PAUSED,
            });
            let result = '';
            ticker.on('a', () => (result += 'a'));
            ticker.on('b', () => (result += 'b'));
            ticker.on('c', () => (result += 'c'));
            ticker.tick(0);
            assert.equal(result, 'ab');
            ticker.phases = ['c', 'c'];
            ticker.tick(0);
            assert.equal(result, 'abcc');
        });
    });
});
describe('ticker.listenerCount()', () => {
    describe('ticker.listenerCount(phase)', () => {
        it(`should return the amount of listeners for the provided phase`, () => {
            const ticker = new Ticker({
                phases: ['a', 'b', 'c'],
                autoTick: AutoTickState.PAUSED,
            });
            ticker.on('a', () => { });
            ticker.on('b', () => { });
            ticker.on('b', () => { });
            ticker.on('c', () => { });
            ticker.on('c', () => { });
            ticker.on('c', () => { });
            assert.equal(ticker.listenerCount('a'), 1);
            assert.equal(ticker.listenerCount('b'), 2);
            assert.equal(ticker.listenerCount('c'), 3);
        });
    });
    describe('ticker.listenerCount()', () => {
        it(`should return the amount of all listeners in the emitter`, () => {
            const ticker = new Ticker({
                phases: ['a', 'b', 'c'],
                autoTick: AutoTickState.PAUSED,
            });
            ticker.on('a', () => { });
            ticker.on('b', () => { });
            ticker.on('b', () => { });
            ticker.on('c', () => { });
            ticker.on('c', () => { });
            ticker.on('c', () => { });
            assert.equal(ticker.listenerCount(), 6);
        });
    });
});
describe('ticker.autoTick', () => {
    it(`should be AutoTickerState.ON_DEMAND by default`, () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const ticker = new Ticker({ phases: ['test'] });
            assert.equal(ticker.autoTick, AutoTickState.ON_DEMAND);
            let counter = 0;
            ticker.on('test', () => {
                if (++counter === 10) {
                    ticker.off();
                    assert.equal(1, 1);
                    resolve();
                }
            });
        });
    }));
    it(`should be pauseable and continuable`, () => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const ticker = new Ticker({ phases: ['test'] });
            let counter = 0;
            ticker.on('test', () => {
                ++counter;
                if (counter === 2 || counter === 10) {
                    ticker.autoTick = AutoTickState.PAUSED;
                }
            });
            setTimeout(() => {
                assert.equal(counter, 2);
                counter = 3;
                ticker.autoTick = AutoTickState.CONTINUOUS;
                setTimeout(() => {
                    assert.equal(counter, 10);
                    resolve();
                }, 500);
            }, 500);
        });
    }));
});
