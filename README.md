# Tikki

Tikki is a game/animation loop _orchestrator_ suitable for various use cases where you need to control the execution order of different tasks/phases on every animation frame.

It allows you to define _phases_ and then add frame callbacks to them. On every animation frame Tikki will call the frame callbacks of each phase in the order you have specified. This allows for a very ergonomic (and familiar) API for controlling the execution order of different tasks/phases.

It's built on top of [`Eventti`](https://github.com/niklasramo/eventti), a highly optimized and battle-tested event emitter.

- 🎯 Simple and intuitive API.
- 🪶 Small footprint (around 900 bytes minified and gzipped).
- ⚙️ Works in Node.js and browser environments out of the box.
- 🍦 Written in TypeScript with strict type definitions.
- 🤖 Extensively tested.
- 💝 Free and open source, MIT Licensed.

## Install

### Node

```
npm install tikki eventti
```

```ts
import { Ticker } from 'tikki';
const ticker = new Ticker();
```

### Browser

```html
<script type="importmap">
  {
    "imports": {
      "eventti": "https://cdn.jsdelivr.net/npm/eventti@4.0.0/dist/index.js",
      "tikki": "https://cdn.jsdelivr.net/npm/tikki@3.0.0/dist/index.js"
    }
  }
</script>
<script type="module">
  import { Ticker } from 'tikki';
  const ticker = new Ticker();
</script>
```

## Usage

All of [Eventti](https://github.com/niklasramo/eventti)'s features and methods are available in `Ticker` except for the `emit` method, which is replaced by the `tick` method (if you need to tick manually). Please check out [Eventti's docs](https://github.com/niklasramo/eventti#usage) if something is missing here related to the usage of the event emitter features.

Note that compared to your basic event emitter, the naming conventions have been changed to better suit the specific use cases of Tikki. For example "listeners" are called "frame callbacks" and "events" are called "phases". Functionality-wise they are the same thing though.

```typescript
import { Ticker, FrameCallback } from 'tikki';

// Create a ticker instance and define the initial phases. Note that the order
// of phases is meaningful as the ticker will emit the phases in the order you
// specify. To make TypeScript happy we also need to provide all the
// allowed phases too (in whatever order you wish) which might not be defined
// via the phases option at this point yet. If you don't provide the
// allowed types to the constructor they will be inferred from the phases
// option.
type AllowedPhases = 'a' | 'b' | 'c' | 'd';
const ticker = new Ticker<AllowedPhases>({ phases: ['a', 'b', 'c'] });

// Let's create some frame callbacks for testing. Note that by default we are
// always guranteed to receive the frame's time as the first argument. You can
// provide your own frame request method via the ticker options and configure
// more arguments to be provided to the callbacks, but let's focus on that
// later on.
const fcA: FrameCallback = (time) => console.log('a', time);
const fcB: FrameCallback = (time) => console.log('b', time);
const fcC: FrameCallback = (time) => console.log('c', time);

// Let's add some frame callbacks to the ticker. At this point the ticker will
// start ticking automatically.
const idA = ticker.on('a', fcA);
const idB = ticker.on('b', fcB);
const idC = ticker.on('c', fcC);

// At this point the ticker would be console logging "a", "b", "c" on every
// animation frame, but we can change the order of phases dynamically at any
// time and even declare the same phase multiple times. For example's sake let's
// make the ticker console log "c", "b", "a", "a" on every animation frame.
ticker.phases = ['c', 'b', 'a', 'a'];

// You can also remove and add active phases dynamically. If you are using
// TypeScript you just need to make sure all the phases you will be using are
// defined in the AllowedPhases type when instantiating the ticker. So let's set
// "b" and "d" (in that order) to phases. What happens here is probably what
// you'd expect - all callbacks are kept intact and the ticker will keep on
// ticking as usual, but only the callbacks for "b" and "d" phases will be
// emitted on every animation frame. So only "b" would be console logged on
// every animation frame as we have not added any callbacks for "d" yet.
ticker.phases = ['b', 'd'];

// Removing callbacks from a phase is as simple as providing the phase and the
// callback id to the .off() method.
ticker.off('a', idA);

// You can also remove all the callbacks from a specific phase in one go.
ticker.off('b');

// Or just remove all callbacks from the ticker.
ticker.off();
```

## Manual ticking

By default Tikki will automatically tick on every animation frame, but you can also manually tick the ticker if you wish.

```typescript
import { Ticker } from 'tikki';

// Let's create a paused ticker.
const ticker = new Ticker({ phases: ['test'], paused: true });

// Let's add a frame callback to the "test" phase. Note that the frame callback
// will not be called until we manually tick the ticker.
ticker.on('test', () => console.log('test'));

// We can now manually tick if need be. Note that the tick method always
// requires the current time in milliseconds as the first argument, it will
// be propagated to the frame callbacks. The timestamp itself can be relative to
// anything as long as it's consistent between the ticks so that the delta time
// can be calculated. For example, Date.now() is relative to the Unix epoch
// while performance.now() is relative to the time when navigation has started.
ticker.tick(performance.now());

// We can unpause the ticker at any time and it will start ticking
// automatically. Note that it's probably not a good idea to switch between
// manual and automatic ticking on the fly as there might be some
// inconsistencies with the timestamps depending on the requestFrame method
// you are using and the timestamps you have used while manually ticking.
ticker.paused = false;
```

## Custom frame request methods

By default Tikki uses `requestAnimationFrame` if available globally (e.g. in browsers) and falls back to `setTimeout` (e.g. in Node.js) for the method that queries the next frame. You can also provide your own `requestFrame` method via `Ticker`'s options or even change it dynamically on the fly after instantiation.

There's only one rule -> the first argument of the callback that's used for ticking must be a timestamp in milliseconds. Otherwise you are free to provide any other arguments to the callback.

```typescript
import { Ticker } from 'tikki';

// Let's create a custom frame request that also tracks delta time and provides
// it to the frame callbacks.
type CustomFrameCallback = (time: number, deltaTime: number) => void;
const createCustomRequestFrame = () => {
  const frameTime = 1000 / 60;
  let _prevTime = 0;

  // The frame request method should accept a single argument - a callback which
  // receives the frame time as the first argument and optionally any amount
  // of arguments after that.
  return (callback: CustomFrameCallback) => {
    const handle = setTimeout(() => {
      const time = performance.now();
      const deltaTime = _prevTime ? time - _prevTime : 0;
      _prevTime = time;
      callback(time, deltaTime);
    }, frameTime);

    // The frame request method should return a function that cancels the
    // frame request.
    return () => {
      clearTimeout(handle);
    };
  };
};

// Let's provide the custom requestFrame method to the ticker on init.
const ticker = new Ticker<'test', CustomFrameCallback>({
  phases: ['test'],
  requestFrame: createCustomRequestFrame(),
});

// Time and delta time are now passed to the frame callbacks automatically and
// TypeScript is aware of their types.
ticker.on('test', (time, deltaTime) => console.log({ time, deltaTime }));

// If manually ticking we must pass the time and delta time to the tick
// method.
ticker.paused = true;
let time = performance.now();
setInterval(() => {
  const newTime = performance.now();
  const deltaTime = newTime - time;
  time = newTime;
  ticker.tick(time, deltaTime);
}, 1000 / 60);
```

Tikki also exports a `createXrRequestFrame` method, which you can use to request [XRSession](https://developer.mozilla.org/en-US/docs/Web/API/XRSession) animation frames.

```typescript
import { Ticker, createXrRequestFrame, XrFrameCallback } from 'tikki';
const xrTicker = await navigator.xr?.requestSession('immersive-vr').then((xrSession) => {
  return new Ticker<'test', XrFrameCallback>({
    phases: ['test'],
    requestFrame: createXrRequestFrame(xrSession),
  });
});
```

Sometimes you might need to switch the `requestFrame` method on the fly, e.g. when entering/exiting [XRSession](https://developer.mozilla.org/en-US/docs/Web/API/XRSession). Tikki covers this use case and allows you to change the `requestFrame` method dynamically at any time. We just need to inform `Ticker` of all the possible `requestFrame` type variations.

```typescript
import { Ticker, createXrRequestFrame, XrFrameCallback } from 'tikki';

// This will start the ticker normally, we just provide a custom FrameCallback
// type that accounts for the frame callback variations.
type CustomFrameCallback = (time: number, frame?: Parameters<XrFrameCallback>[1]) => void;
const ticker = new Ticker<'test', CustomFrameCallback>({
  phases: ['test'],
});

// At any point later on we can switch the requestFrame method.
navigator.xr?.requestSession('immersive-vr').then((xrSession) => {
  ticker.requestFrame = createXrRequestFrame(xrSession);
});

// We can then check the arguments with type-safety inside the frame callbacks.
ticker.on('test', (time, frame) => {
  if (frame) {
    console.log('XR Frame!', time);
  } else {
    console.log('Normal Frame', time);
  }
});
```

## Ticker API

- [Constructor](#constructor)
- [on( phase, frameCallback, [ frameCallbackId ] )](#tickeron)
- [once( phase, frameCallback, [ frameCallbackId ] )](#tickeronce)
- [off( [ phase ], [ frameCallbackId ] )](#tickeroff)
- [count( [ phase ] )](#tickercount)
- [tick( time, [ ...args ] )](#tickertick)

### Constructor

`Ticker` is a class which's constructor accepts an optional [`TickerOptions`](#tickeroptions) object with the following properties:

- **phases**
  - Define the initial phases as an array of phase names. You can change this option dynamically after instantiation via `ticker.phases`. Note that you can also provide the same phase multiple times in which case it's callbacks are emitted multiple times on tick.
  - Accepts: [`Phase[]`](#Phase).
  - Optional, defaults to an empty array.
- **paused**
  - Define if the ticker should be paused initially, in which case it won't tick automatically until unpaused. You can change this option dynamically after instantiation via `ticker.paused`.
  - Accepts: `boolean`.
  - Optional, defaults to `false`.
- **onDemand**
  - Define if the ticker should tick only when there are frame callbacks in the ticker. It is recommended to use this option only if you don't care about the frame time and just want the ticker to tick when there are frame callbacks in it. If you need to e.g. compute the delta time between frames then you should let the ticker tick continuously and leave this option as `false`. You can change this option dynamically after instantiation via `ticker.onDemand`.
  - Accepts: `boolean`.
  - Optional, defaults to `false`.
- **requestFrame**
  - Define the method which is used to request the next frame. You can change this option dynamically after instantiation via `ticker.requestFrame`.
  - Accepts: [`FrameCallback`](#FrameCallback).
  - Optional, defaults to `createRequestFrame()`, which uses `requestAnimationFrame` (if available) and falls back to `setTimeout`.
- **dedupe**
  - Defines how a duplicate frame callback id is handled:
    - `"add"`: the existing callback (of the id) is removed and the new callback is appended to the phase's callback queue.
    - `"update"`: the existing callback (of the id) is replaced with the new callback without changing the index of the callback in the phase's callback queue.
    - `"ignore"`: the new callback is silently ignored and not added to the phase.
    - `"throw"`: as the name suggests an error will be thrown.
  - Accepts: [`TickerDedupe`](#tickerdedupe).
  - Optional, defaults to `"add"` if omitted.
- **getId**
  - A function which is used to get the frame callback id. By default Tikki uses `Symbol()` to create unique ids, but you can provide your own function if you want to use something else. Receives the frame callback as the first (and only) argument.
  - Accepts: `(frameCallback: FrameCallback) => FrameCallbackId`.
  - Optional, defaults to `() => Symbol()` if omitted.

```typescript
import { Ticker } from 'ticker';

// Define the allowed phases. If you don't provide these then basically
// any string, number or symbol will be allowed as phase.
type AllowedPhases = 'a' | 'b' | 'c';

// Frame callback type needs to be provided only in the cases where you wish
// to provide more arguments than time to the frame callbacks. You can just omit
// this if you don't provide a custom frame request method.
type FrameCallback = (time: number) => void;

// Create ticker.
const ticker = new Ticker<AllowedPhases, FrameCallback>({
  phases: ['a', 'b'],
  paused: true,
  dedupe: 'throw',
});

// Change some option on the fly dynamically.
ticker.phases = ['c', 'a'];
ticker.dedupe = 'ignore';
ticker.paused = false;
ticker.onDemand = true;
```

### ticker.on()

Add a frame callback to a phase.

**Syntax**

```
ticker.on(phase, frameCallback, [ frameCallbackId ]);
```

**Parameters**

1. **phase**
   - The name of the phase you want to add the frame callback to.
   - Accepts: [`Phase`](#Phase).
2. **frameCallback**
   - A frame callback that will be called on tick (if the phase is active).
   - Accepts: [`FrameCallback`](#FrameCallback).
3. **frameCallbackId**
   - The id for the frame callback. If not provided, the id will be generated by the `ticker.getId` method.
   - Accepts: [`FrameCallbackId`](#FrameCallbackId).
   - Optional.

**Returns**

A [frame callback id](#FrameCallbackId), which can be used to remove this specific callback. Unless manually provided via arguments this will be whatever the `ticker.getId` method spits out, and by default it spits out symbols which are guaranteed to be always unique.

**Examples**

```ts
import { Ticker } from 'tikki';

// Create a paused ticker (to better demonstrate the usage).
const ticker = new Ticker({ phases: ['test'], paused: true });

// Bind a couple of callbacks to the "test" phase. We don't provide the
// callback id so it is created automatically and returned by the method.
const idA = ticker.on('test', (time) => console.log('a', time));
const idB = ticker.on('test', (time) => console.log('b', time));

// Bind a couple of callbacks again to "test" phase, but this time we provide
// the callback ids manually.
ticker.on('test', console.log('foo', time), 'foo');
ticker.on('test', console.log('bar', time), 'bar');

ticker.tick(1);
// a 1
// b 1
// foo 1
// bar 1

ticker.off('test', idB);
ticker.tick(2);
// a 2
// foo 2
// bar 2

ticker.off('test', 'foo');
ticker.tick(3);
// a 3
// bar 3
```

### ticker.once()

Add a one-off frame callback to a phase. This works identically to the `on` method with the exception that the frame callback is removed immediately after it has been called once. Please refer to the [`on`](#tickeron) method for more information.

**Syntax**

```
ticker.once(phase, frameCallback, [ frameCallbackId ]);
```

### ticker.off()

Remove a frame callback or multiple frame callbacks. If no _frameCallbackId_ is provided all frame callbacks for the specified phase will be removed. If no _phase_ is provided all frame callbacks from the ticker will be removed.

**Syntax**

```
ticker.off( [ phase ], [ frameCallbackId ] );
```

**Parameters**

1. **phase**
   - The phase you want to remove frame callbacks from.
   - Accepts: [`Phase`](#Phase).
   - _optional_
2. **frameCallbackId**
   - The id of the frame callback you want to remove.
   - Accepts: [`FrameCallbackId`](#FrameCallbackId).
   - _optional_

**Examples**

```ts
import { Ticker } from 'tikki';

const ticker = new Ticker({ phases: ['foo', 'bar'] });

const fooA = ticker.on('foo', () => console.log('foo a'));
const fooB = ticker.on('foo', () => console.log('foo b'));
const barA = ticker.on('bar', () => console.log('bar a'));
const barB = ticker.on('bar', () => console.log('bar b'));

// Remove specific frame callback by id.
ticker.off('foo', fooB);

// Remove all frame callbacks from a phase.
ticker.off('bar');

// Remove all frame callbacks from the ticker.
ticker.off();
```

### ticker.count()

Returns the frame callback count for a phase if _phase_ is provided. Otherwise returns the frame callback count for the whole ticker.

**Syntax**

```
ticker.count( [ phase ] )
```

**Parameters**

1. **phase**
   - The phase you want to get the frame callback count for.
   - Accepts: [`Phase`](#Phase).
   - Optional.

**Examples**

```typescript
import { Ticker } from 'tikki';

const ticker = new Ticker({ phases: ['a', 'b', 'c'] });

ticker.on('a', () => {});
ticker.on('b', () => {});
ticker.on('b', () => {});
ticker.on('c', () => {});
ticker.on('c', () => {});
ticker.on('c', () => {});

ticker.count('a'); // 1
ticker.count('b'); // 2
ticker.count('c'); // 3
ticker.count(); // 6
```

### ticker.tick()

Manually ticks the ticker. The arguments are propagated to the frame callbacks.

**Syntax**

```
ticker.tick( time, [...args] )
```

**Parameters**

1. **time**
   - Frame time in milliseconds.
   - Accepts: `number`.
2. **...args**
   - Any other arguments you see fit. Just remember to provide your custom `FrameCallback` type to `Ticker` when using TypeScript, as demonstrated in the example below.
   - Accepts: `any`.
   - Optional.

**Examples**

```ts
import { Ticker } from 'tikki';

// You don't have to provide the custom frame callback type if you don't provide
// any additional arguments to the frame callbacks, but here's an example of how
// you can provide additional arguments.
type CustomFC = (time: number, deltaTime: number) => void;

// Create a paused ticker.
const ticker = new Ticker<'test', CustomFC>({
  phases: ['test',]
  paused: true,
});

// Tick manually whenever you want.
let time = Date.now();
setInterval(() => {
  const newTime = Date.now();
  const deltaTime = newTime - time;
  time = newTime;
  ticker.tick(time, deltaTime);
}, 1000 / 60);

// Add a frame callback.
ticker.on('test', (time, deltaTime) => {
  console.log(time, deltaTime);
});
```

### Types

Here's a list of all the types that you can import from `tikki`.

```ts
import {
  Phase,
  FrameCallback,
  FrameCallbackId,
  TickerPhase,
  TickerFrameCallback,
  TickerDedupe,
  TickerOptions,
  RequestFrame,
  CancelFrame,
} from 'tikki';
```

#### Phase

```ts
type Phase = string | number | symbol;
```

#### FrameCallback

```ts
type FrameCallback = (time: number, ...args: any) => void;
```

#### FrameCallbackId

```ts
type FrameCallbackId = null | string | number | symbol | bigint | Function | Object;
```

#### TickerPhase

```ts
type TickerPhase<T extends Ticker<Phase>> = Parameters<T['on']>[0];
```

#### TickerFrameCallback

```ts
type TickerFrameCallback<
  T extends Ticker<Phase, FrameCallback> = Ticker<Phase, (time: number) => void>,
> = Parameters<T['on']>[1];
```

#### TickerDedupe

```ts
type TickerDedupe = 'add' | 'update' | 'ignore' | 'throw';
```

#### TickerOptions

```ts
type TickerOptions<P extends Phase, FC extends FrameCallback> = {
  phases?: P[];
  paused?: boolean;
  onDemand?: boolean;
  requestFrame?: RequestFrame<FC>;
  dedupe?: 'add' | 'update' | 'ignore' | 'throw';
  getId?: (frameCallback: FrameCallback) => FrameCallbackId;
};
```

#### RequestFrame

```ts
type RequestFrame<FC extends FrameCallback = (time: number) => void> = (
  callback: FC,
) => CancelFrame;
```

#### CancelFrame

```ts
type CancelFrame = () => void;
```

## License

Copyright © 2022-2024, Niklas Rämö (inramo@gmail.com). Licensed under the MIT license.
