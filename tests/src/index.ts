import { assert } from 'chai';
import { Ticker, AutoTicker, TickerDedupe } from '../../src/index.js';

const VALID_FRAME_CALLBACK_IDS = [
  null,
  '',
  'foo',
  0,
  1,
  -1,
  Infinity,
  -Infinity,
  Symbol(),
  true,
  false,
  [],
  {},
  () => {},
];

describe('Ticker', () => {
  describe('options', () => {
    describe('phases', () => {
      it(`should default to an empty array if omitted`, () => {
        const ticker = new Ticker();
        assert.deepEqual(ticker.phases, []);
      });

      it(`should accept an array of strings, numbers and/or symbols and propagate the value to ticker.phases`, () => {
        const phases = ['', 'foo', 0, 1, -1, Infinity, -Infinity, NaN, Symbol()];
        const ticker = new Ticker({ phases });
        assert.deepEqual(ticker.phases, phases);

        phases.forEach((phase) => {
          let counter = 0;

          ticker.on(phase, () => {
            ++counter;
          });
          ticker.once(phase, () => {
            ++counter;
          });

          assert.equal(counter, 0);
          assert.equal(ticker.count(phase), 2);

          ticker.tick();

          assert.equal(counter, 2);
          assert.equal(ticker.count(phase), 1);

          ticker.off(phase);

          assert.equal(counter, 2);
          assert.equal(ticker.count(phase), 0);
        });
      });
    });

    describe('getId', () => {
      it(`should default to creating a new Symbol if omitted`, () => {
        const ticker = new Ticker({ phases: ['test'] });
        const idA = ticker.on('test', () => {});
        const idB = ticker.once('test', () => {});
        assert.equal(typeof idA, 'symbol');
        assert.equal(typeof idB, 'symbol');
        assert.notEqual(idA, idB);
      });

      it(`should accept a function that generates a new frame callback id`, () => {
        let id = 0;
        const customGetId = () => ++id;
        const ticker = new Ticker({
          phases: ['test'],
          getId: customGetId,
        });
        assert.equal(ticker.getId, customGetId);

        const idA = ticker.on('test', () => {});
        assert.equal(idA, id);

        const idB = ticker.once('test', () => {});
        assert.equal(idB, id);
      });

      it(`should receive the frame callback as it's only argument`, () => {
        const ticker = new Ticker({
          phases: ['test'],
          getId: (...args) => {
            assert.equal(args.length, 1);
            return args[0];
          },
        });

        const fcA = () => {};
        assert.equal(ticker.on('test', fcA), fcA);

        const fcB = () => {};
        assert.equal(ticker.once('test', fcB), fcB);
      });
    });

    describe('dedupe', () => {
      it(`should default to "add" if omitted`, () => {
        const ticker = new Ticker({ phases: ['test'] });
        assert.equal(ticker.dedupe, TickerDedupe.ADD);

        let result = '';
        ticker.on('test', () => void (result += '1'), 'foo');
        ticker.on('test', () => void (result += '2'));
        ticker.on('test', () => void (result += '3'), 'foo');
        ticker.tick(1);
        assert.equal(result, '23');
      });

      it('should accept a TickerDedupe value and propagate the value to ticker.dedupe', () => {
        const tickerAdd = new Ticker({ dedupe: TickerDedupe.ADD });
        assert.equal(tickerAdd.dedupe, TickerDedupe.ADD);

        const tickerUpdate = new Ticker({ dedupe: TickerDedupe.UPDATE });
        assert.equal(tickerUpdate.dedupe, TickerDedupe.UPDATE);

        const tickerIgnore = new Ticker({ dedupe: TickerDedupe.IGNORE });
        assert.equal(tickerIgnore.dedupe, TickerDedupe.IGNORE);

        const tickerThrow = new Ticker({ dedupe: TickerDedupe.THROW });
        assert.equal(tickerThrow.dedupe, TickerDedupe.THROW);
      });

      describe('add', () => {
        it(`should add the duplicate frame callback to the end of the queue`, () => {
          const ticker = new Ticker({
            phases: ['test'],
            dedupe: TickerDedupe.ADD,
          });
          let result = '';
          ticker.on('test', () => void (result += '1'), 'foo');
          ticker.on('test', () => void (result += '2'));
          ticker.on('test', () => void (result += '3'), 'foo');
          ticker.tick(1);
          assert.equal(result, '23');
        });
      });

      describe('update', () => {
        it(`should update the existing frame callback with the new frame callback`, () => {
          const ticker = new Ticker({
            phases: ['test'],
            dedupe: TickerDedupe.UPDATE,
          });
          let result = '';
          ticker.on('test', () => void (result += '1'), 'foo');
          ticker.on('test', () => void (result += '2'));
          ticker.on('test', () => void (result += '3'), 'foo');
          ticker.tick(1);
          assert.equal(result, '32');
        });
      });

      describe('ignore', () => {
        it(`should ignore the duplicate frame callback`, () => {
          const ticker = new Ticker({
            phases: ['test'],
            dedupe: TickerDedupe.IGNORE,
          });
          let result = 0;
          ticker.on('test', () => void (result = 1), 'foo');
          ticker.on('test', () => void (result = 2), 'foo');
          ticker.tick(1);
          assert.equal(result, 1);
        });
      });

      describe('throw', () => {
        it(`should throw an error`, () => {
          const ticker = new Ticker({
            phases: ['test'],
            dedupe: TickerDedupe.THROW,
          });
          ticker.on('test', () => {}, 'foo');
          assert.throws(() => ticker.on('test', () => {}, 'foo'));
        });
      });
    });
  });

  describe('ticker.on()', () => {
    describe('ticker.on(phase, frameCallback)', () => {
      it(`should return a symbol (frame callback id) by default`, () => {
        const ticker = new Ticker({ phases: ['test'] });
        assert.equal(typeof ticker.on('test', () => {}), 'symbol');
      });

      it(`should add a frame callback to a phase`, () => {
        const ticker = new Ticker({ phases: ['test'] });
        let counter = 0;

        ticker.on('test', () => void ++counter);

        ticker.tick(1);
        assert.equal(counter, 1);

        ticker.tick(2);
        assert.equal(counter, 2);
      });

      it('should allow duplicate frame callbacks', () => {
        const ticker = new Ticker({ phases: ['test'] });
        let counter = 0;
        const fc = () => void ++counter;

        ticker.on('test', fc);
        ticker.on('test', fc);
        ticker.tick(1);
        assert.equal(counter, 2);
      });
    });

    describe('ticker.on(phase, frameCallback, frameCallbackId)', () => {
      it(`should return the provided frame callback id`, () => {
        const ticker = new Ticker({ phases: ['test'] });
        assert.equal(
          ticker.on('test', () => {}, 'foo'),
          'foo',
        );
      });

      it(`should allow the id to be any value except undefined`, () => {
        VALID_FRAME_CALLBACK_IDS.forEach((frameCallbackId) => {
          const ticker = new Ticker({ phases: ['test'] });
          let counter = 0;

          ticker.on(
            'test',
            () => {
              ++counter;
            },
            frameCallbackId,
          );

          ticker.tick();
          assert.equal(ticker.count(), 1);
          assert.equal(counter, 1);

          ticker.off('test', frameCallbackId);
          assert.equal(ticker.count(), 0);
          ticker.tick();
          assert.equal(counter, 1);
        });
      });
    });
  });

  describe('ticker.once()', () => {
    describe('ticker.once(phase, frameCallback)', () => {
      it(`should return a symbol (frame callback id) by default`, () => {
        const ticker = new Ticker({ phases: ['test'] });
        assert.equal(typeof ticker.once('test', () => {}), 'symbol');
      });

      it(`should add a frame callback that triggers only once`, () => {
        const ticker = new Ticker({ phases: ['test'] });
        let counter = 0;

        ticker.once('test', () => void ++counter);

        ticker.tick(1);
        assert.equal(counter, 1);

        ticker.tick(2);
        assert.equal(counter, 1);
      });

      it('should allow duplicate frame callbacks', () => {
        const ticker = new Ticker({ phases: ['test'] });
        let counter = 0;
        const fc = () => void ++counter;

        ticker.once('test', fc);
        ticker.once('test', fc);
        ticker.tick(1);
        assert.equal(counter, 2);
      });
    });

    describe('ticker.once(phase, frameCallback, frameCallbackId)', () => {
      it(`should return the provided frame callback id`, () => {
        const ticker = new Ticker({ phases: ['test'] });
        assert.equal(
          ticker.once('test', () => {}, 'foo'),
          'foo',
        );
      });

      it(`should allow the id to be any value except undefined`, () => {
        VALID_FRAME_CALLBACK_IDS.forEach((frameCallbackId) => {
          const ticker = new Ticker({ phases: ['test'] });
          let counter = 0;

          ticker.once(
            'test',
            () => {
              ++counter;
            },
            frameCallbackId,
          );
          assert.equal(ticker.count(), 1);
          ticker.off('test', frameCallbackId);
          ticker.tick();
          assert.equal(ticker.count(), 0);
          assert.equal(counter, 0);
        });
      });
    });
  });

  describe('ticker.off()', () => {
    describe('ticker.off()', () => {
      it(`should remove all frame callbacks from the ticker`, () => {
        const ticker = new Ticker({ phases: ['a', 'b', 'c'] });

        ticker.on('a', () => assert.fail());
        ticker.on('b', () => assert.fail());
        ticker.on('c', () => assert.fail());
        ticker.off();
        ticker.tick(1);

        assert.equal(1, 1);
      });
    });

    describe('ticker.off(phase)', () => {
      it(`should remove all frame callbacks of a specific phase`, () => {
        const ticker = new Ticker({ phases: ['pass', 'fail'] });

        ticker.on('pass', () => {});
        ticker.on('fail', () => assert.fail());
        ticker.on('fail', () => assert.fail());
        ticker.off('fail');
        ticker.tick(1);

        assert.equal(1, 1);
      });
    });

    describe('ticker.off(phase, frameCallbackId)', () => {
      it(`should remove specific frame callback of a specific phase that matches the provided frame callback id`, () => {
        const ticker = new Ticker({ phases: ['test'] });
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
        ticker.tick(1);
        assert.equal(value, 'ac');
      });
    });
  });

  describe('ticker.tick()', () => {
    it(`should emit the phases once in the defined order with correct arguments`, () => {
      const ticker = new Ticker({
        phases: ['b', 'c', 'a', 'a', 'b'],
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

    it('should allow changing ticker.phases dynamically', () => {
      const ticker = new Ticker({ phases: ['a', 'b'] });
      let data = '';
      ticker.on('a', () => {
        data += 'a';
      });
      ticker.on('b', () => {
        data += 'b';
        ticker.phases = ['b', 'a'];
      });
      ticker.tick(1);
      ticker.tick(2);
      assert.equal(data, 'abba');
    });

    it(`should throw an error if tick is called within a listener`, () => {
      const ticker = new Ticker({
        phases: ['test'],
      });
      ticker.on('test', () => {
        assert.throws(() => ticker.tick(0));
      });
      ticker.tick(0);
    });

    it(`should pass all the arguments to the listeners`, () => {
      const ticker = new Ticker({
        phases: ['a', 'b'],
      });

      let count = 0;

      ticker.on('a', (time, deltaTime, message, ...args) => {
        assert.equal(args.length, 0);
        assert.equal(time, 1);
        assert.equal(deltaTime, 2);
        assert.equal(message, 'test');
        ++count;
      });

      ticker.on('b', (time, deltaTime, message, ...args) => {
        assert.equal(args.length, 0);
        assert.equal(time, 1);
        assert.equal(deltaTime, 2);
        assert.equal(message, 'test');
        ++count;
      });

      ticker.tick(1, 2, 'test');
      assert.equal(count, 2);
    });

    it(`should only emit the listeners of the active phases`, () => {
      const ticker = new Ticker<'a' | 'b' | 'c'>({
        phases: ['a', 'b'],
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

  describe('ticker.count()', () => {
    describe('ticker.count(phase)', () => {
      it(`should return the amount of frame callbacks for the provided phase`, () => {
        const ticker = new Ticker({ phases: ['a', 'b', 'c'] });

        ticker.on('a', () => {});
        ticker.on('b', () => {});
        ticker.on('b', () => {});
        ticker.on('c', () => {});
        ticker.on('c', () => {});
        ticker.on('c', () => {});

        assert.equal(ticker.count('a'), 1);
        assert.equal(ticker.count('b'), 2);
        assert.equal(ticker.count('c'), 3);
      });
    });

    describe('ticker.count()', () => {
      it(`should return the amount of all frame callbacks in the ticker`, () => {
        const ticker = new Ticker({ phases: ['a', 'b', 'c'] });

        ticker.on('a', () => {});
        ticker.on('b', () => {});
        ticker.on('b', () => {});
        ticker.on('c', () => {});
        ticker.on('c', () => {});
        ticker.on('c', () => {});

        assert.equal(ticker.count(), 6);
      });
    });
  });
});

describe('AutoTicker', () => {
  it(`should tick automatically by default`, async () => {
    return new Promise((resolve) => {
      const ticker = new AutoTicker({ phases: ['test'] });
      let counter = 0;
      ticker.on('test', () => {
        if (++counter === 10) {
          ticker.paused = true;
          ticker.off();
          resolve();
        }
      });
    });
  });

  describe('options', () => {
    describe('defaults', () => {
      const ticker = new AutoTicker();
      assert.deepEqual(ticker.phases, []);
      assert.equal(ticker.dedupe, TickerDedupe.ADD);
      assert.equal(typeof ticker.getId(() => {}), 'symbol');
      assert.equal(ticker.paused, false);
      assert.equal(ticker.onDemand, false);
    });

    describe('paused', () => {
      it(`should accept boolean and propagate value to ticker.paused`, () => {
        const tickerA = new AutoTicker({ paused: true });
        const tickerB = new AutoTicker({ paused: false });
        assert.equal(tickerA.paused, true);
        assert.equal(tickerB.paused, false);
      });
    });

    describe('onDemand', () => {
      it(`should accept boolean and propagate value to ticker.onDemand`, () => {
        const tickerA = new AutoTicker({ onDemand: true });
        const tickerB = new AutoTicker({ onDemand: false });
        assert.equal(tickerA.onDemand, true);
        assert.equal(tickerB.onDemand, false);
      });
    });

    describe('requestFrame', () => {
      it(`should accept a frame request function and propagate value to ticker.requestFrame`, () => {
        const requestFrame = (callback: () => void) => {
          const id = setTimeout(() => callback(), 1000);
          return () => clearTimeout(id);
        };
        const ticker = new AutoTicker({ requestFrame });
        assert.equal(ticker.requestFrame, requestFrame);
      });
    });
  });

  describe('ticker.paused', () => {
    it(`should pause/resume the ticking`, async () => {
      return new Promise((resolve) => {
        const ticker = new AutoTicker({ phases: ['test'] });
        let counter = 0;
        ticker.on('test', () => {
          ++counter;

          if (ticker.paused) {
            assert.fail();
          }

          if (counter === 10) {
            ticker.paused = true;
            setTimeout(() => {
              ticker.paused = false;
            }, 200);
          }

          if (counter === 20) {
            ticker.off();
            resolve();
          }
        });
      });
    });
  });

  describe('ticker.requestFrame', () => {
    it(`should call the next frame and return a function to cancel the requested frame`, async () => {
      return new Promise((resolve) => {
        let reqCount = 0;
        let cancelCount = 0;

        const requestFrame = (callback: () => void) => {
          const id = setTimeout(() => {
            ++reqCount;
            callback();
          }, 100);
          return () => {
            ++cancelCount;
            clearTimeout(id);
          };
        };

        const ticker = new AutoTicker({ phases: ['test'], requestFrame });

        ticker.on('test', () => {
          assert.equal(reqCount, 1);
          ticker.paused = true;
          assert.equal(cancelCount, 1);
          ticker.off();
          resolve();
        });
      });
    });
  });

  describe('ticker.onDemand', () => {
    it(`should tick only when there are active phases with frame callbacks when true`, async () => {
      return new Promise((resolve) => {
        let reqCount = 0;
        let cancelCount = 0;

        const requestFrame = (callback: () => void) => {
          ++reqCount;
          const id = setTimeout(() => {
            callback();
          }, 1000 / 60);
          return () => {
            ++cancelCount;
            clearTimeout(id);
          };
        };

        const ticker = new AutoTicker({ phases: ['test'], requestFrame, onDemand: true });

        setTimeout(() => {
          // We expect the ticker to not request a frame until the first
          // listener is added.
          assert.equal(reqCount, 0);
          assert.equal(cancelCount, 0);
          ticker.once('test', () => {
            setTimeout(() => {
              // By the time the first listener is called, the ticker should
              // have requested frame twice. Once when the listener was added
              // and once in the tick method before the listener was called.
              assert.equal(reqCount, 2);
              assert.equal(cancelCount, 0);
              resolve();
            }, 100);
          });
        }, 100);
      });
    });
  });
});
