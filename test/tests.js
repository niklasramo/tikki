import test from 'ava';
import { Ticker } from '../dist/tikki.js';

test(`You can add a phase listener`, async (t) => {
  return new Promise((resolve) => {
    const ticker = new Ticker({ phases: ['a'] });
    let counter = 0;
    ticker.on('a', () => {
      if (++counter === 3) {
        ticker.off();
        t.pass();
        resolve();
      }
    });
  });
});

test(`You can add a once phase listener`, async (t) => {
  return new Promise((resolve) => {
    const ticker = new Ticker({ phases: ['a'] });
    let counter = 0;
    ticker.once('a', () => {
      if (++counter > 1) {
        ticker.off();
        t.fail();
        resolve();
      }
    });
    setTimeout(() => {
      ticker.off();
      t.pass();
      resolve();
    }, 500);
  });
});

test(`You can remove a phase listener by id`, async (t) => {
  return new Promise((resolve) => {
    const ticker = new Ticker({ phases: ['a'] });
    let counter = 0;
    const aId = ticker.on('a', () => {
      if (++counter === 3) {
        ticker.off('a', aId);
      }
    });
    setTimeout(() => {
      t.is(counter, 3);
      resolve();
    }, 500);
  });
});

test(`You can remove a phase listener by reference`, async (t) => {
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
      t.is(counter, 3);
      resolve();
    }, 500);
  });
});

test(`Auto-tick mode is enabled by default.`, async (t) => {
  return new Promise((resolve) => {
    const ticker = new Ticker({ phases: ['a'] });
    ticker.once('a', () => {
      t.pass();
      resolve();
    });
  });
});

test(`Auto-tick mode can be turned off on instantiation.`, async (t) => {
  return new Promise((resolve, reject) => {
    const ticker = new Ticker({ phases: ['a'], autoTick: false });
    ticker.once('a', () => {
      t.fail();
      reject();
    });
    setTimeout(() => {
      ticker.off();
      ticker.once('a', () => {
        t.pass();
        resolve();
      });
      ticker.tick();
    }, 500);
  });
});

test(`Phase listener has frame timestamp as it's only argument.`, async (t) => {
  return new Promise((resolve) => {
    const ticker = new Ticker({ phases: ['a'] });
    ticker.once('a', (...args) => {
      t.is(args.length, 1);
      t.is(typeof args[0], 'number');
      resolve();
    });
  });
});

test('Phases can be changed dynamically after instantiation.', async (t) => {
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
        t.is(data, 'abba');
        resolve();
      }
    });
  });
});

test('You can execute the same phase multiple times in a single tick.', async (t) => {
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
      t.is(data, 'abba');
      resolve();
    });
  });
});
