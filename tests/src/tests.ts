import { assert } from 'chai';
import { Ticker, AutoTickState } from '../../src/index';

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
      const listener = () => {};
      ticker.on('test', listener);
      assert.equal(ticker.allowDuplicateListeners, false);
      assert.throws(() => ticker.on('test', listener));
    });
  });

  describe('ticker.on(phase, listener, listenerId)', () => {
    it(`should accept any string, number or symbol as the listener id and always return the provided listener id, which can be used to remove the listener`, () => {
      ['', 'foo', 0, 1, -1, Infinity, -Infinity, Symbol()].forEach((listenerId) => {
        (['ignore', 'replace', 'update', 'throw'] as const).forEach((idDedupeMode) => {
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
            } catch (e) {}
          } else {
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
      emitter.on('test', () => {}, 'foo');
      assert.throws(() => emitter.on('test', () => {}, 'foo'));
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
      const listener = () => {};
      ticker.once('test', listener);
      assert.equal(ticker.allowDuplicateListeners, false);
      assert.throws(() => ticker.once('test', listener));
    });
  });

  describe('ticker.once(phase, listener, listenerId)', () => {
    it(`should accept any string, number or symbol as the listener id and always return the provided listener id, which can be used to remove the listener`, () => {
      ['', 'foo', 0, 1, -1, Infinity, -Infinity, Symbol()].forEach((listenerId) => {
        (['ignore', 'replace', 'update', 'throw'] as const).forEach((idDedupeMode) => {
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
          } else {
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
      ticker.once('test', () => {}, 'foo');
      assert.throws(() => ticker.once('test', () => {}, 'foo'));
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

    it('should allow changing ticker.phases dynamically', async () => {
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
    });

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
  });
});

describe('ticker.listenerCount()', () => {
  describe('ticker.listenerCount(phase)', () => {
    it(`should return the amount of listeners for the provided phase`, () => {
      const ticker = new Ticker({
        phases: ['a', 'b', 'c'],
        autoTick: AutoTickState.PAUSED,
      });

      ticker.on('a', () => {});
      ticker.on('b', () => {});
      ticker.on('b', () => {});
      ticker.on('c', () => {});
      ticker.on('c', () => {});
      ticker.on('c', () => {});

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

      ticker.on('a', () => {});
      ticker.on('b', () => {});
      ticker.on('b', () => {});
      ticker.on('c', () => {});
      ticker.on('c', () => {});
      ticker.on('c', () => {});

      assert.equal(ticker.listenerCount(), 6);
    });
  });
});

describe('ticker.autoTick', () => {
  it(`should be AutoTickerState.ON_DEMAND by default`, async () => {
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
  });

  it(`should be pauseable and continuable`, async () => {
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
  });
});
