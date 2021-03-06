// Copied the idea for this test suite from the awesome mitt library:
// https://github.com/developit/mitt/blob/main/test/test-types-compilation.ts
// All credit goes there!

import { Ticker } from '..';

const ticker = new Ticker({ phases: ['a', 'b'] });

{
  ticker.on('a', () => {});
  ticker.on('a', (t: number) => {});

  ticker.on('b', () => {});
  ticker.on('b', (t: number) => {});

  // @ts-expect-error
  ticker.on('a', (t: string) => {});

  // @ts-expect-error
  ticker.on('c', () => {});
}

{
  ticker.once('a', () => {});
  ticker.once('a', (t: number) => {});

  ticker.once('b', () => {});
  ticker.once('b', (t: number) => {});

  // @ts-expect-error
  ticker.once('a', (t: string) => {});

  // @ts-expect-error
  ticker.once('c', () => {});
}

{
  ticker.off('a', Symbol());
  ticker.off('b', Symbol());

  ticker.off('a', () => {});
  ticker.off('b', () => {});

  ticker.off('a');
  ticker.off('b');

  ticker.off();

  // @ts-expect-error
  ticker.off('c', Symbol());

  // @ts-expect-error
  ticker.off('c', () => {});

  // @ts-expect-error
  ticker.off('c');
}

{
  ticker.tick(1);

  // @ts-expect-error
  ticker.tick();
}
