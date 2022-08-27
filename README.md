# Tikki

Tikki is a minimalistic game/animation loop, or a "ticker" if you prefer, with the power of an event emitter baked in it. In practice this means that you can use Tikki like an event emitter with the exception that there is no `emit` method. Instead, Tikki automatically emits the events (or phases as they are called in Tikki's context) in the order you have specified on every animation frame. This allows for a very ergonomic (and familiar) API for controlling the execution order of different tasks/phases.

- Small footprint (around 900 bytes gzipped).
- Works in Node.js and browser environments out of the box.
- One (tiny) dependency -> [Eventti](https://github.com/niklasramo/eventti).
- Written in TypeScript.
- MIT licensed.

<h2><a id="install" href="#install" aria-hidden="true">#</a> Install</h2>

Node

```bash
$ npm install eventti tikki
```

Browser

```html
<script src="https://cdn.jsdelivr.net/npm/eventti@3.0.0/dist/eventti.umd.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tikki@2.0.0/dist/tikki.umd.js"></script>
```

Access `Ticker` via `window.tikki.Ticker` in browser context.

<h2><a id="usage" href="#usage" aria-hidden="true">#</a> Usage</h2>

All of [Eventti](https://github.com/niklasramo/eventti)'s features and methods are available in `Ticker` except for the `emit` method, which is replaced by the `tick` method. Please check out Eventti's [docs](https://github.com/niklasramo/eventti#usage) if something is missing here related to the usage of event emitter features.

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
ticker.on('a', listenerA);
ticker.on('b', listenerB);
ticker.on('c', listenerC);

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
// listener (or listener id) to the .off() method.
ticker.off('a', listenerA);

// You can also remove all the listeners from a specific phase in one go.
ticker.off('b');

// Or just remove all listeners from the ticker, which will cause it to stop
// ticking automatically.
ticker.off();
```

<h3><a id="ticker" href="#ticker" aria-hidden="true">#</a> Auto-tick states</h3>

There are three states for auto-ticking: "on demand", "continuous" and "paused". The default is "on demand", which will only tick when there are listeners in the ticker. In "continuous" state the ticker will tick continuously and in "paused" state the ticker will not tick at all. The "paused" state is mostly meant for situations where you want to manually call `tick` method, e.g. in your custom animation loop. You can also change the auto-tick state dynamically on the fly and ticker will automatically resume/pause ticking depending on the new state.

```typescript
import { Ticker, AutoTickState } from 'tikki';

// Let's create a paused ticker.
const ticker = new Ticker({ phases: ['test'], autoTick: AutoTickState.PAUSED });

// Adding a new listener will not start the ticking.
ticker.on('test', () => console.log('test'));

// We can now manually tick if need be. Note that the tick method always
// requires the current time in milliseconds as the first argument, it will
// be propagated to the phase listeners.
ticker.tick(Date.now());

// We can change the auto-tick state on the fly back to the default state and
// ticking will be automatically resumed (if there are phase listeners).
ticker.autoTick = AutoTickState.ON_DEMAND;

// Or we can switch to continuous state, which will tick constantly whether or
// not there are listeners.
ticker.autoTick = AutoTickState.CONTINUOUS;
```

<h3><a id="ticker" href="#ticker" aria-hidden="true">#</a> Custom frame request methods</h3>

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
      const time = Date.now();
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
ticker.autoTick = AutoTickState.PAUSED;
ticker.tick(Date.now(), 1000 / 60 /* Just a good guess*/);
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

<h2><a id="api" href="#api" aria-hidden="true">#</a> API</h2>

<h3><a id="ticker" href="#ticker" aria-hidden="true">#</a> Ticker</h3>

A class that accepts an optional configuration object (via constructor) with the following properties:

- **phases** &nbsp;&mdash;&nbsp; _array_
  - Define the initial phases as an array of phase names (string).
  - You can provide the same phase multiple times in which case it's listeners are emitted multiple times on tick.
  - You can change this option dynamically after instantiation via `ticker.phases`.
  - Optional. Defaults to an empty array.
- **autoTick** &nbsp;&mdash;&nbsp; _AutoTickState_
  - `AutoTickState.ON_DEMAND`: ticker will tick automatically while there are listeners.
  - `AutoTickState.CONTINUOUS`: ticker will tick continuously.
  - `AutoTickState.PAUSED`: ticker will not tick automatically.
  - You can change this option dynamically after instantiation via `ticker.autoTick`.
  - Optional. Defaults to `AutoTickState.ON_DEMAND` if omitted.
- **requestFrame** &nbsp;&mdash;&nbsp; _Function | null_
  - Define the method which is used to request the next frame.
  - You can change this option dynamically after instantiation via `ticker.idDedupeMode`.
  - Optional. Defaults to `createRequestFrame()`, which uses `requestAnimationFrame` (if available) and falls back to `setTimeout`.
- **allowDuplicateListeners** &nbsp;&mdash;&nbsp; _boolean_
  - When set to `false` `on` and `once` methods will throw an error if a duplicate listener is added.
  - You can change this option dynamically after instantiation via `ticker.allowDuplicateListeners`.
  - Optional. Defaults to `true` if omitted.
- **idDedupeMode** &nbsp;&mdash;&nbsp; _"ignore" | "throw" | "replace" | "update"_
  - Defines how a duplicate listener id is handled when you provide it manually via `on` or `once` method.
    - `"ignore"`: the new listener is silently ignored and not added to the phase.
    - `"throw"`: as the name suggests an error will be thrown.
    - `"replace"`: the existing listener id is removed fully before the new listener is added to the phase (at the end of the listener queue).
    - `"update"`: the existing listener of the listener id is replaced with the new listener without changing the index of the listener id.
  - You can change this option dynamically after instantiation via `ticker.idDedupeMode`.
  - Optional. Defaults to `"replace"` if omitted.

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

**Methods**

- [on( phase, listener, [listenerId] )](#ticker-on)
- [once( phase, listener, [listenerId] )](#ticker-once)
- [off( [phase], [target] )](#ticker-off)
- [listenerCount( [phase] )](#ticker-listenerCount)
- [tick( time, [...args] )](#ticker-tick)

<h3><a id="ticker-on" href="#ticker-on" aria-hidden="true">#</a> <code>ticker.on( phase, listener, [listenerId] )</code></h3>

Add a listener to a phase.

**Arguments**

- **phase** &nbsp;&mdash;&nbsp; _string | number | symbol_
  - The phase name specified as a string, number or symbol.
- **listener** &nbsp;&mdash;&nbsp; _Function_
  - A listener function that will be called on tick.
- **listenerId** &nbsp;&mdash;&nbsp; _string | number | symbol_ &nbsp;&mdash;&nbsp; _optional_
  - Optionally provide listener id manually.

**Returns** &nbsp;&mdash;&nbsp; _string | number | symbol_

A listener id, which can be used to remove this specific listener. By default this will always be a symbol unless manually provided.

```typescript
import { Ticker } from 'ticker';

const ticker = new Ticker({ phases: ['foo', 'bar'] });

// Add listener to "test" phase. A listener id will be returned which
// you can use to remove this specific listener.
const listenerId1 = ticker.on('foo', (time) => console.log('foo', time));

// You can also provide the listener id manually. Here we provide "testId" as
// the listener id and it can be used to remove this specific listener.
ticker.on('bar', (time) => console.log('bar', time), 'testId');
```

<h3><a id="ticker-once" href="#ticker-once" aria-hidden="true">#</a> <code>ticker.once( phase, listener, [listenerId] )</code></h3>

Add a one-off listener to a phase.

**Arguments**

- **phase** &nbsp;&mdash;&nbsp; _string | number | symbol_
  - The phase name specified as a string, number or symbol.
- **listener** &nbsp;&mdash;&nbsp; _Function_
  - A listener function that will be called on tick.
- **listenerId** &nbsp;&mdash;&nbsp; _string | number | symbol_ &nbsp;&mdash;&nbsp; _optional_
  - Optionally provide listener id manually.

**Returns** &nbsp;&mdash;&nbsp; _string | number | symbol_

A listener id, which can be used to remove this specific listener. By default this will always be a symbol unless manually provided.

```typescript
import { Ticker, AutoTickState } from 'ticker';

const ticker = new Ticker({ phases: ['test'], autoTick: AutoTickState.PAUSED });

ticker.once('test', (time) => console.log(time));

ticker.tick(1);
// 1

ticker.tick(2);
// -> ...chirp chirp...
```

<h3><a id="ticker-off" href="#ticker-off" aria-hidden="true">#</a> <code>ticker.off( [phase], [target] )</code></h3>

Remove listener(s) from the ticker:

- If **phase** and a **listener** (as target) are provided all instances of the listener will be removed from the phase.
- If **phase** and a **listener id** (as target) are provided the specific listener, which is linked to the id, will be removed.
- If only **phase** is provided all listeners from the phase will be removed.
- If no arguments are provided all listeners from the ticker will be removed.

**Arguments**

- **phase** &nbsp;&mdash;&nbsp; _string | number | symbol_ &nbsp;&mdash;&nbsp; _optional_
  - The phase name specified as a string, number or symbol.
- **target** &nbsp;&mdash;&nbsp; _Function | string | number | symbol_ &nbsp;&mdash;&nbsp; _optional_
  - The listener or listener id, which needs to be removed.

**Examples**

```typescript
import { Ticker } from 'tikki';

const ticker = new Ticker({ phases: ['test'] });

const a = () => console.log('a');
const b = () => console.log('b');

const aId1 = ticker.on('test', a);
const bId1 = ticker.on('test', b);
const aId2 = ticker.on('test', a);
const bId2 = ticker.on('test', b);

// Remove specific listener by id.
ticker.off('test', bId1);

// Remove all instances of a specific listener.
ticker.off('test', a);

// Remove all listeners from a phase.
ticker.off('test');

// Remove all listeners from the ticker.
ticker.off();
```

<h3><a id="ticker-listenerCount" href="#ticker-listenerCount" aria-hidden="true">#</a> <code>ticker.listenerCount( [phase] )</code></h3>

Returns phase's listener count if **phase** is provided. Otherwise returns the amount of all listeners in the ticker.

**Arguments**

- **phase** &nbsp;&mdash;&nbsp; _string / number / symbol_
  - The phase name specified as a string, number or symbol.

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

<h3><a id="ticker-tick" href="#ticker-tick" aria-hidden="true">#</a> <code>ticker.tick( time, [...args] )</code></h3>

Manually ticks the ticker. This is mainly meant for situations where you do not want to use the auto-tick feature.

**Arguments**

- **time** &nbsp;&mdash;&nbsp; _number_
  - Current time in milliseconds.
- **...args** &nbsp;&mdash;&nbsp; _any_
  - Any other arguments you see fit. Just remember to provide your custom `FrameCallback` type to `Ticker`, when using TS, as demonstrated in the example below.

**Examples**

```typescript
import { Ticker, AutoTickState } from 'tikki';

type FrameCallback = (time: number, deltaTime: number) => void;

const ticker = new Ticker<'a', FrameCallback>({
  phases: ['a',]
  // Disable default auto-ticking.
  autoTick: AutoTickState.PAUSED,
  // We are ticking manually so no requestFrame is needed.
  requestFrame: undefined,
});

ticker.on('a', (time, deltaTime) => {
  console.log(time, deltaTime);
});

// Tick manually every second.
let lastTime = Date.now();
setInterval(() => {
  const time = Date.now();
  const deltaTime = time - lastTime;
  lastTime = time;
  ticker.tick(time, deltaTime);
}, 1000);
```

<h2><a id="license" href="#license" aria-hidden="true">#</a> License</h2>

Copyright © 2022, Niklas Rämö (inramo@gmail.com). Licensed under the MIT license.
