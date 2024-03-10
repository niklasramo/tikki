# Tikki

Tikki is a game/animation loop _orchestrator_ suitable for various use cases where you need to control the execution order of different tasks/phases on every animation frame.

It allows you to define _phases_ and then add listeners to them. On every animation frame Tikki will call the listeners of each phase in the order you have specified. This allows for a very ergonomic (and familiar) API for controlling the execution order of different tasks/phases.

It's built on top of [`eventti`](https://github.com/niklasramo/eventti), a highly optimized and battle-tested event emitter.

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

```typescript
import { Ticker, PhaseListener } from 'tikki';

// Create a ticker instance and define the initial phases. Note that the order
// of phases is meaningful as the ticker will emit the phases in the order you
// specify. To make TypeScript happy we also need to provide all the
// allowed phases too (in whatever order you wish) which might not be defined
// via the phases option at this point yet. If you don't provide the
// allowed types to the constructor they will be inferred from the phases
// option.
type AllowedPhases = 'a' | 'b' | 'c' | 'd';
const ticker = new Ticker<AllowedPhases>({ phases: ['a', 'b', 'c'] });

// Let's create some listeners for testing. Note that by default we are always
// guranteed to receive the frame's time as the first argument. You can
// provide your own requestFrame method via the ticker options and configure
// more arguments to be provided to the listeners, but let's focus on that
// later on.
const listenerA: PhaseListener = (time) => console.log('a', time);
const listenerB: PhaseListener = (time) => console.log('b', time);
const listenerC: PhaseListener = (time) => console.log('c', time);

// Let's add some listeners to the ticker. At this point the ticker will start
// ticking automatically and will keep on ticking as long as there are listeners
// in the ticker.
const listnerIdA = ticker.on('a', listenerA);
const listnerIdB = ticker.on('b', listenerB);
const listnerIdC = ticker.on('c', listenerC);

// At this point the ticker would be console logging "a", "b", "c" on every
// animation frame, but we can change the order of phases dynamically at any
// time and even declare the same phase multiple times. For example's sake let's
// make the ticker console log "c", "b", "a", "a" on every animation frame.
ticker.phases = ['c', 'b', 'a', 'a'];

// You can also remove and add active phases dynamically. If you are using
// TypeScript you just need to make sure all the phases you will be using are
// defined in the AllowedPhases type when instantiating the ticker. So let's set
// "b" and "d" (in that order) to phases. What happens here is probably what
// you'd expect - all listeners are kept intact and the ticker will keep on
// ticking as usual, but only the listeners for "b" and "d" phases will be
// emitted on every animation frame. So only "b" would be console logged on
// every animation frame as we have not added any listeners for "d" yet.
ticker.phases = ['b', 'd'];

// Removing listeners from a phase is as simple as providing the phase and the
// listener id to the .off() method.
ticker.off('a', listenerIdA);

// You can also remove all the listeners from a specific phase in one go.
ticker.off('b');

// Or just remove all listeners from the ticker.
ticker.off();
```

## Manual ticking

By default Tikki will automatically tick on every animation frame, but you can also manually tick the ticker if you wish.

```typescript
import { Ticker } from 'tikki';

// Let's create a paused ticker.
const ticker = new Ticker({ phases: ['test'], paused: true });

// Let's add a listener to the "test" phase. Note that the listener will not be
// called until we manually tick the ticker.
ticker.on('test', () => console.log('test'));

// We can now manually tick if need be. Note that the tick method always
// requires the current time in milliseconds as the first argument, it will
// be propagated to the phase listeners. The timestamp itself can be relative to
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
// it to the phase listeners.
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

// Time and delta time are now passed to the listeners automatically and
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

// We can then check the arguments with type-safety inside the listeners.
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
- [on( phase, listener, [listenerId] )](#tickeron)
- [once( phase, listener, [listenerId] )](#tickeronce)
- [off( [phase], [target] )](#tickeroff)
- [listenerCount( [phase] )](#tickerlistenercount)
- [tick( time, [...args] )](#tickertick)

### Constructor

`Ticker` is a class which's constructor accepts an optional [`TickerOptions`](#tickeroptions) object with the following properties:

- **phases**
  - Define the initial phases as an array of phase names.
  - You can provide the same phase multiple times in which case it's listeners are emitted multiple times on tick.
  - You can change this option dynamically after instantiation via `ticker.phases`.
  - Accepts: [`PhaseName[]`](#phasename).
  - Optional, defaults to an empty array.
- **paused**
  - Define if the ticker should be paused initially. Meaning that it won't tick automatically until unpaused.
  - You can change this option dynamically after instantiation via `ticker.paused`.
  - Accepts: `boolean`.
  - Optional, defaults to `false`.
- **onDemand**
  - Define if the ticker should tick only when there are listeners in the ticker. It is recommended to use this option only if you don't care about the frame time and just want the ticker to tick when there are listeners in it. If you need to e.g. compute the delta time between frames then you should let the ticker tick continuously and leave this option as `false`.
  - You can change this option dynamically after instantiation via `ticker.onDemand`.
  - Accepts: `boolean`.
  - Optional, defaults to `false`.
- **requestFrame**
  - Define the method which is used to request the next frame.
  - You can change this option dynamically after instantiation via `ticker.requestFrame`.
  - Accepts: [`PhaseListener`](#phaselistener).
  - Optional, defaults to `createRequestFrame()`, which uses `requestAnimationFrame` (if available) and falls back to `setTimeout`.
- **dedupe**
  - Defines how a duplicate listener id is handled. Refer to the [Eventti's docs](https://github.com/niklasramo/eventti?tab=readme-ov-file#constructor) for more information.
- **getId**
  - A function which is used to get the listener id for a listener callback. Refer to the [Eventti's docs](https://github.com/niklasramo/eventti?tab=readme-ov-file#constructor) for more information.

```typescript
import { Ticker, AutoTickState } from 'ticker';

// Define the allowed phases. If you don't provide these then basically
// any string, number or symbol will be allowed as phase.
type AllowedPhases = 'a' | 'b' | 'c';

// Frame callback type needs to be provided only in the cases where you wish
// to provide more arguments than time to the listeners. You can just omit
// this if you don't provide a custom frameRequest.
type FrameCallback = (time: number) => void;

// Create ticker.
const ticker = new Ticker<AllowedPhases, FrameCallback>({
  phases: ['a', 'b'],
  autoTick: AutoTickState.PAUSED,
  idDedupeMode: 'throw',
});

// Change some option on the fly dynamically.
ticker.phases = ['c', 'a'];
ticker.idDedupeMode = 'ignore';
ticker.autoTick = AutoTickState.CONTINUOUS;
```

### ticker.on()

Add a listener to a phase.

**Syntax**

```
ticker.on(phase, listener, [listenerId]);
```

**Parameters**

1. **phase**
   - The name of the phase you want to add a listener to.
   - Accepts: [`PhaseName`](#phasename).
2. **listener**
   - A listener function that will be called on tick (if the phase is active).
   - Accepts: [`PhaseListener`](#phaselistener).
3. **listenerId**
   - The id for the listener. If not provided, the id will be generated by the `ticker.getId` method.
   - Accepts: [`PhaseListenerId`](#phaselistenerid).
   - _optional_

**Returns**

A [listener id](#phaselistenerid), which can be used to remove this specific listener. Unless manually provided via arguments this will be whatever the `ticker.getId` method spits out, and by default it spits out symbols which are guaranteed to be always unique.

**Examples**

```ts
import { Ticker } from 'tikki';

// Create a paused ticker (to better demonstrate the usage).
const ticker = new Ticker({ phases: ['test'], paused: true });

// Bind a couple of listeners to the "test" phase. We don't provide the third
// argument for listener id so it is created automatically and returned by the
// .on() method.
const idA = ticker.on('test', (time) => console.log('a', time));
const idB = ticker.on('test', (time) => console.log('b', time));

// Bind a couple of listeners again to "test" phase, but this time we provide
// the listener ids manually.
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

Add a one-off listener to a phase. This works identically to the `on` method with the exception that the listener is removed immediately after it has been called once. Please refer to the [`on`](#tickeron) method for more information.

**Syntax**

```
ticker.once(phase, listener, [listenerId]);
```

### ticker.off()

Remove a phase listener or multiple phase listeners. If no _listenerId_ is provided all listeners for the specified phase will be removed. If no _phase_ is provided all listeners from the ticker will be removed.

**Syntax**

```
ticker.off( [ phase ], [ listenerId ] );
```

**Parameters**

1. **phase**
   - The phase you want to remove listeners from.
   - Accepts: [`PhaseName`](#phasename).
   - _optional_
2. **listenerId**
   - The id of the listener you want to remove.
   - Accepts: [`PhaseListenerId`](#phaselistenerid).
   - _optional_

**Examples**

```ts
import { Ticker } from 'tikki';

const ticker = new Ticker({ phases: ['foo', 'bar'] });

const fooA = ticker.on('foo', () => console.log('foo a'));
const fooB = ticker.on('foo', () => console.log('foo b'));
const barA = ticker.on('bar', () => console.log('bar a'));
const barB = ticker.on('bar', () => console.log('bar b'));

// Remove specific listener by id.
ticker.off('foo', fooB);

// Remove all listeners from a phase.
ticker.off('bar');

// Remove all listeners from the ticker.
ticker.off();
```

### ticker.listenerCount()

Returns the listener count for a phase if _phase_ is provided. Otherwise returns the listener count for the whole ticker.

**Syntax**

```
ticker.listenerCount( [ phase ] )
```

**Parameters**

1. **phase**
   - The phase you want to get the listener count for.
   - Accepts: [`PhaseName`](#phasename).
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

ticker.listenerCount('a'); // 1
ticker.listenerCount('b'); // 2
ticker.listenerCount('c'); // 3
ticker.listenerCount(); // 6
```

### ticker.tick()

Manually ticks the ticker.

**Syntax**

```
ticker.tick( time, [...args] )
```

**Parameters**

1. **time**
   - Frame time in milliseconds.
   - Accepts: `number`.
2. **...args**
   - Any other arguments you see fit. Just remember to provide your custom `FrameCallback` type to `Ticker` when using TS, as demonstrated in the example below.
   - Accepts: `any`.
   - Optional.

**Examples**

```ts
import { Ticker } from 'tikki';

// You don't have to provide the custom frame callback type if you don't provide
// any additional arguments to the listeners, but here's an example of how you
// can provide additional arguments to the listeners.
type CustomFrameCallback = (time: number, deltaTime: number) => void;

// Create a paused ticker.
const ticker = new Ticker<'test', CustomFrameCallback>({
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

// Add a listener.
ticker.on('test', (time, deltaTime) => {
  console.log(time, deltaTime);
});
```

### Types

Here's a list of all the types that you can import from `tikki`.

```ts
import {
  PhaseName,
  PhaseListener,
  PhaseListenerId,
  TickerPhase,
  TickerPhaseListener,
  TickerOptions,
  RequestFrame,
  CancelFrame,
} from 'tikki';
```

#### PhaseName

```ts
type PhaseName = string | number | symbol;
```

#### PhaseListener

```ts
type PhaseListener = (time: number, ...args: any) => void;
```

#### PhaseListenerId

```ts
type PhaseListenerId = null | string | number | symbol | bigint | Function | Object;
```

#### RequestFrame

```ts
type RequestFrame<FC extends PhaseListener = (time: number) => void> = (
  callback: FC,
) => CancelFrame;
```

#### CancelFrame

```ts
type CancelFrame = () => void;
```

#### TickerPhase

```ts
type TickerPhase<T extends Ticker<PhaseName>> = Parameters<T['on']>[0];
```

#### TickerPhaseListener

```ts
type TickerPhaseListener<
  T extends Ticker<PhaseName, PhaseListener> = Ticker<PhaseName, (time: number) => void>,
> = Parameters<T['on']>[1];
```

#### TickerOptions

```ts
type TickerOptions<P extends PhaseName, FC extends PhaseListener> = {
  phases?: P[];
  paused?: boolean;
  onDemand?: boolean;
  requestFrame?: RequestFrame<FC>;
  dedupe?: 'add' | 'update' | 'ignore' | 'throw';
  getId?: (listener: PhaseListener) => PhaseListenerId;
};
```

## License

Copyright © 2022-2024, Niklas Rämö (inramo@gmail.com). Licensed under the MIT license.
