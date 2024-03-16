// Copied the idea for this test suite from the awesome mitt library:
// https://github.com/developit/mitt/blob/main/test/test-types-compilation.ts
// All credit goes there!

import { Ticker, AutoTicker, createRequestFrame } from '../../src/index.js';

//
// Ticker
//

{
  // Allowed phases should be inferred from Ticker options if not explicitly
  // provided.

  const ticker = new Ticker({ phases: ['a', 'b'] });

  ticker.on('a', () => {});
  ticker.on('b', () => {});

  ticker.once('a', () => {});
  ticker.once('b', () => {});

  // @ts-expect-error
  ticker.on('c', () => {});

  // @ts-expect-error
  ticker.once('c', () => {});
}

{
  // Allowed phases should be respected when explicitly provided.

  const ticker = new Ticker<'a' | 'b' | symbol | 1>({ phases: ['a'] });

  ticker.on('a', () => {});
  ticker.on('b', () => {});
  ticker.on(Symbol(), () => {});
  ticker.on(1, () => {});

  ticker.once('a', () => {});
  ticker.once('b', () => {});
  ticker.once(Symbol(), () => {});
  ticker.once(1, () => {});

  // @ts-expect-error
  ticker.on('c', () => {});

  // @ts-expect-error
  ticker.on(0, () => {});

  // @ts-expect-error
  ticker.once('c', () => {});

  // @ts-expect-error
  ticker.once(0, () => {});
}

{
  // By default listeners should accept any arguments.

  const ticker = new Ticker({ phases: ['a'] });

  ticker.tick(1);

  ticker.on('a', () => {});
  ticker.on('a', (_arg1: number) => {});
  ticker.on('a', (_arg1: string, _arg2: any) => {});

  ticker.once('a', () => {});
  ticker.once('a', (_arg1: number) => {});
  ticker.once('a', (_arg1: string, _arg2: any) => {});

  ticker.tick();
  ticker.tick('foo', 'bar', 1, 2, [], {});
}

{
  type CustomFrameCallback =
    | ((a: number, b?: undefined) => void)
    | ((a: string, b: [number]) => void);

  const ticker = new Ticker<'test', CustomFrameCallback>({
    phases: ['test'],
  });

  ticker.tick('', [1]);

  ticker.tick(1);

  ticker.on('test', (a, b) => {
    const foo: string | number = a;
    const bar: undefined | [number] = b;
    console.log(foo, bar);
  });

  ticker.on('test', (a) => {
    const foo: string | number = a;
    console.log(foo);
  });

  // @ts-expect-error
  ticker.tick(1, 2);

  // @ts-expect-error
  ticker.tick('');
}

//
// AutoTicker
//

{
  // By default tick method arguments should be equal with listener arguments.
  // By default listeners should accept only one argument, a timestamp,
  // which is a number.

  const ticker = new AutoTicker({ phases: ['a'] });

  ticker.tick(1);

  ticker.on('a', () => {});
  ticker.on('a', (_t: number) => {});

  ticker.once('a', () => {});
  ticker.once('a', (_t: number) => {});

  // @ts-expect-error
  ticker.tick();

  // @ts-expect-error
  ticker.tick('foo');

  // @ts-expect-error
  ticker.tick(1, 2);

  // @ts-expect-error
  ticker.on('a', (_t: string) => {});

  // @ts-expect-error
  ticker.on('a', (_t: number, x: any) => {});

  // @ts-expect-error
  ticker.once('a', (_t: string) => {});

  // @ts-expect-error
  ticker.once('a', (_t: number, x: any) => {});
}

{
  // When FrameCallback type is explicitly provided the listeners and tick
  // method should respect the callback's arguments.

  type CustomFrameCallback = (time: number, deltaTime: number) => void;

  const requestFrame = (callback: CustomFrameCallback) => {
    const handle = setTimeout(() => callback(1, 2), 1000 / 60);
    return () => clearTimeout(handle);
  };

  const ticker = new AutoTicker<string, CustomFrameCallback>({
    phases: ['a'],
    requestFrame,
  });

  ticker.on('a', () => {});
  ticker.on('a', (_t: number) => {});
  ticker.on('a', (_t: number, _dt: number) => {});

  ticker.once('a', () => {});
  ticker.once('a', (_t: number) => {});
  ticker.once('a', (_t: number, _dt: number) => {});

  ticker.tick(1, 2);

  // @ts-expect-error
  ticker.on('a', (_t: string) => {});

  // @ts-expect-error
  ticker.on('a', (_t: number, _dt: string) => {});

  // @ts-expect-error
  ticker.on('a', (_t: number, _dt: number, _foo: any) => {});

  // @ts-expect-error
  ticker.once('a', (_t: string) => {});

  // @ts-expect-error
  ticker.once('a', (_t: number, _dt: string) => {});

  // @ts-expect-error
  ticker.once('a', (_t: number, _dt: number, _foo: any) => {});

  // @ts-expect-error
  ticker.tick();

  // @ts-expect-error
  ticker.tick(1);

  // @ts-expect-error
  ticker.tick('foo');

  // @ts-expect-error
  ticker.tick(1, 'foo');
}

{
  // FrameCallback type should be inferred from requestFrame method if not
  // explicitly provided.

  type CustomFrameCallback = (time: number, deltaTime: number) => void;

  const requestFrame = (callback: CustomFrameCallback) => {
    const handle = setTimeout(() => callback(1, 2), 1000 / 60);
    return () => clearTimeout(handle);
  };

  const ticker = new AutoTicker({
    phases: ['a'],
    requestFrame,
  });

  ticker.on('a', () => {});
  ticker.on('a', (_t: number) => {});
  ticker.on('a', (_t: number, _dt: number) => {});

  ticker.once('a', () => {});
  ticker.once('a', (_t: number) => {});
  ticker.once('a', (_t: number, _dt: number) => {});

  ticker.tick(1, 2);

  // @ts-expect-error
  ticker.on('a', (_t: string) => {});

  // @ts-expect-error
  ticker.on('a', (_t: number, _dt: string) => {});

  // @ts-expect-error
  ticker.on('a', (_t: number, _dt: number, _foo: any) => {});

  // @ts-expect-error
  ticker.once('a', (_t: string) => {});

  // @ts-expect-error
  ticker.once('a', (_t: number, _dt: string) => {});

  // @ts-expect-error
  ticker.once('a', (_t: number, _dt: number, _foo: any) => {});

  // @ts-expect-error
  ticker.tick();

  // @ts-expect-error
  ticker.tick(1);

  // @ts-expect-error
  ticker.tick('foo');

  // @ts-expect-error
  ticker.tick(1, 'foo');
}

{
  // You should not be able to provide a requestFrame method with incorrect
  // signature.

  type CustomFrameCallback = (time: number, deltaTime: number) => void;

  new AutoTicker<string, CustomFrameCallback>({
    phases: ['a'],
    // @ts-expect-error
    requestFrame: createRequestFrame(),
  });
}
