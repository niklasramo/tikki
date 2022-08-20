import { assert } from 'chai';
import { Ticker, AutoTickState } from '../../src/index';

it(`Add a phase listener.`, async () => {
  return new Promise((resolve) => {
    const ticker = new Ticker({ phases: ['a'] });
    let counter = 0;
    ticker.on('a', () => {
      if (++counter === 3) {
        ticker.off();
        assert.equal(1, 1);
        resolve();
      }
    });
  });
});

it(`Add a once phase listener.`, async () => {
  return new Promise((resolve) => {
    const ticker = new Ticker({ phases: ['a'] });
    let counter = 0;
    ticker.once('a', () => {
      if (++counter > 1) {
        ticker.off();
        assert.fail();
      }
    });
    setTimeout(() => {
      ticker.off();
      assert.equal(1, 1);
      resolve();
    }, 500);
  });
});

it(`Remove a phase listener by id.`, async () => {
  return new Promise((resolve) => {
    const ticker = new Ticker({ phases: ['a'] });
    let counter = 0;
    const aId = ticker.on('a', () => {
      if (++counter === 3) {
        ticker.off('a', aId);
      }
    });
    const aOnceId = ticker.on('a', () => {
      assert.fail();
    });
    ticker.off('a', aOnceId);
    setTimeout(() => {
      assert.equal(counter, 3);
      resolve();
    }, 500);
  });
});

it(`Remove a phase listener by reference.`, async () => {
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
      assert.equal(counter, 3);
      resolve();
    }, 500);
  });
});

it(`Auto-tick mode is enabled by default.`, async () => {
  return new Promise((resolve) => {
    const ticker = new Ticker({ phases: ['a'] });
    ticker.once('a', () => {
      assert.equal(1, 1);
      resolve();
    });
  });
});

it(`Auto-tick mode can be disabled on instantiation.`, async () => {
  return new Promise((resolve) => {
    const ticker = new Ticker({ phases: ['a'], autoTick: AutoTickState.OFF });
    ticker.once('a', () => {
      assert.fail();
    });
    setTimeout(() => {
      ticker.off();
      ticker.once('a', () => {
        assert.equal(1, 1);
        resolve();
      });
      ticker.tick(Date.now());
    }, 500);
  });
});

it(`Phase listener has frame timestamp as it's only argument.`, async () => {
  return new Promise((resolve) => {
    const ticker = new Ticker({ phases: ['a'] });
    ticker.once('a', (...args) => {
      assert.equal(args.length, 1);
      assert.equal(typeof args[0], 'number');
      resolve();
    });
  });
});

it('Change phases dynamically after instantiation.', async () => {
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

it('Execute the same phase multiple times in a single tick.', async () => {
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
      assert.equal(data, 'abba');
      resolve();
    });
  });
});
