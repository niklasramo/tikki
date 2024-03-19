# Tikki

Tikki is a game/animation loop _orchestrator_ that allows you to group frame callbacks into _phases_ and dynamically modify their execution order. It's a simple and powerful abstraction that covers many use cases. Tikki is built on top of [`Eventti`](https://github.com/niklasramo/eventti), a highly optimized and battle-tested event emitter.

- 🎯 Simple and intuitive API.
- 🪶 Small footprint (~1kB minified and brotlied).
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

Tikki comes in two flavors: `Ticker` and `AutoTicker`.

`Ticker` class is basically just a thin wrapper around [Eventti](https://github.com/niklasramo/eventti)'s `Emitter` with a few tweaks to make it more suitable for our specific use case of orchestrating frame callbacks:

- It replaces the concept of events with _phases_ which are a group of frame callbacks that are executed together. The order of phases can be changed dynamically whenever you want, it's just an array of phase names (`ticker.phases`). This can be useful for e.g. separating game/physics/rendering logic into different phases. You can even provide the same phase multiple times in which case it's callbacks are emitted multiple times on tick.
- It replaces the `emit` method with a `tick` method, which executes all the frame callbacks of all the phases (in the order defined in `ticker.phases`) with the arguments you provide. You can think of it as a "batched emit" method.

`AutoTicker` class extends the `Ticker` class and provides extra features to automatically tick the ticker on every animation frame, so it can be used as a drop-in replacement for your basic animation loop. It defaults to `requestAnimationFrame` and falls back to `setTimeout` in environments where `requestAnimationFrame` is not supported. You can also provide your own `requestFrame` method if you wish.

### Basic usage

```ts
import { Ticker, FrameCallback } from 'tikki';

// Define allowed phases. If you don't provide these explicitly then the allowed
// phases are inferred from the phases you provide to the ticker on
// instantiation. If you don't provide any phases then any string, number or
// symbol will be allowed as a valid phase.
type Phases = 'a' | 'b' | 'c';

// Define the frame callback type. This is optional, but it's recommended to
// provide a custom type if you want to enforce the frame callback arguments.
type FrameCallback = (time: number, dt: number) => void;

// Create a ticker instance and define the phases.
const ticker = new Ticker<Phases, FrameCallback>({ phases: ['a', 'b', 'c'] });

// Let's create a game loop that ticks the ticker manually.
let prevTime = 0;
let frameId: number | undefined = undefined;
function gameLoop(time = 0) {
  frameId = requestAnimationFrame(gameLoop);
  if (prevTime < time) {
    const deltaTime = time - prevTime;
    ticker.tick(time, deltaTime);
  }
  prevTime = time;
  return () => {
    cancelAnimationFrame(frameId);
  };
}

// Start the game loop.
let stopGameLoop = gameLoop();

// Stop the game loop when needed.
// stopGameLoop();

// And resume it again when needed
// stopGameLoop = gameLoop(prevTime);

// Add some frame callbacks to the phases.
const idA = ticker.on('a', (time, dt) => console.log('a', time, dt));
const idB = ticker.on('b', (time, dt) => console.log('b', time, dt));
const idC = ticker.on('c', (time, dt) => console.log('c', time, dt));

// Add some frame callbacks to the phases that will be called only once.
ticker.once('a', (time, dt) => console.log('a once', time, dt));
ticker.once('b', (time, dt) => console.log('b once', time, dt));
ticker.once('c', (time, dt) => console.log('c once', time, dt));

// Change the phases dynamically.
ticker.phases = ['c', 'a'];

// Remove a frame callback from a phase by id.
ticker.off('a', idA);

// You can also remove all the callbacks from a specific phase in one go.
ticker.off('b');

// Or just remove all callbacks from the ticker.
ticker.off();
```

### Automatic ticking

Using `AutoTicker` is the same as using `Ticker`, but it ticks automatically on every animation frame. You can also pause and unpause the ticker at any time.

```ts
// Create ticker. It will start ticking automatically right away.
const ticker = new AutoTicker({ phases: ['a', 'b', 'c'] });

// Add some frame callbacks to the phases. By default the AutoTicker provides
// only the time of the frame to the frame callbacks.
ticker.on('a', (time) => console.log('a', time));
ticker.on('b', (time) => console.log('b', time));
ticker.on('c', (time) => console.log('c', time));

// Pause the ticker any time you want.
ticker.paused = true;

// And unpause it again when needed.
ticker.paused = false;
```

### On-demand ticking

`AutoTicker` also supports on-demand ticking, which means that the ticker will tick only when there are frame callbacks in it. This can be useful if you don't care about the frame time and just want the ticker to tick when there are frame callbacks in it.

```ts
// Create ticker with onDemand option set to true.
const ticker = new AutoTicker({ phases: ['a', 'b', 'c'], onDemand: true });

// Once you add a frame callback to the ticker it will start ticking
// automatically, and keeps ticking as long as there are frame callbacks in it.
ticker.on('a', (time) => console.log('a', time));

// If you remove all the frame callbacks from the ticker it will stop ticking.
ticker.off();

// And if you add a frame callback again it will start ticking again.
ticker.on('a', (time) => console.log('a', time));
```

### Custom frame request

You can provide your own frame request to the ticker. This can be useful if you want to e.g. track the delta time between frames and provide it to the frame callbacks.

```typescript
import { AutoTicker } from 'tikki';

// Define the frame callback type.
type FrameCallback = (time: number, deltaTime: number) => void;

// Create a custom frame request that tracks time and delta time.
const createRequestFrame = () => {
  let prevTime = 0;

  // The frame request method should accept a single argument - a callback which
  // receives any arguments you see fit. These arguments are then passed to the
  // frame callbacks.
  return (callback: FrameCallback) => {
    const rafId = requestAnimationFrame((time) => {
      const deltaTime = prevTime < time ? time - prevTime : 0;
      prevTime = time;
      callback(time, deltaTime);
    });

    // The frame request method should return a function that cancels the
    // frame request.
    return () => {
      cancelAnimationFrame(rafId);
    };
  };
};

// Provide the custom requestFrame method to the ticker on init.
const ticker = new AutoTicker<'test', FrameCallback>({
  phases: ['test'],
  requestFrame: createRequestFrame(),
});

// Add a frame callback to the ticker.
ticker.on('test', (time, deltaTime) => {
  console.log(time, deltaTime);
});
```

Tikki also exports a `createXrRequestFrame` method, which you can use to request [XRSession](https://developer.mozilla.org/en-US/docs/Web/API/XRSession) animation frames.

```typescript
import { AutoTicker, createXrRequestFrame, XrFrameCallback } from 'tikki';

const xrTicker = await navigator.xr?.requestSession('immersive-vr').then((xrSession) => {
  return new AutoTicker<'test', XrFrameCallback>({
    phases: ['test'],
    requestFrame: createXrRequestFrame(xrSession),
  });
});
```

Sometimes you might need to switch the `requestFrame` method on the fly, e.g. when entering/exiting [XRSession](https://developer.mozilla.org/en-US/docs/Web/API/XRSession). Tikki covers this use case and allows you to change the `requestFrame` method dynamically at any time. We just need to inform `AutoTicker` of all the possible `requestFrame` type variations.

```typescript
import { AutoTicker, createXrRequestFrame, XrFrameCallback } from 'tikki';

// Define the frame callback types as a union of all the possible frame callback
// types that the ticker might encounter. Note that due to limits of TypeScript
// all the variations must have the same number of arguments, but you can use
// `undefined` to mark optional arguments. Alternatively you can just create a
// single custom frame callback type that has all the possible arguments and use
// that.
type FrameCallback = ((time: number, frame?: undefined) => void) | XrFrameCallback;

// Create ticker.
const ticker = new AutoTicker<'test', FrameCallback>({
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

## API

- [Ticker](#ticker)
  - [phases](#tickerphases)
  - [dedupe](#tickerdedupe)
  - [getId](#tickergetid)
  - [on( phase, frameCallback, [ frameCallbackId ] )](#tickeron)
  - [once( phase, frameCallback, [ frameCallbackId ] )](#tickeronce)
  - [off( [ phase ], [ frameCallbackId ] )](#tickeroff)
  - [count( [ phase ] )](#tickercount)
  - [tick( [ ...args ] )](#tickertick)
- [AutoTicker](#autoticker)
  - [paused](#autotickerpaused)
  - [onDemand](#autotickerondemand)
  - [requestFrame](#autotickerrequestframe)

### Ticker

`Ticker` class wraps [`Eventti`](https://github.com/niklasramo/eventti)'s API and replaces the `emit` method with a `tick` method.

The `tick` method loops over the active phases (events) and collects all the frame callbacks (listeners) from them into a queue, and finally processes the queue executing the frame callbacks with the arguments you provide to the `tick` method. You can think of it as a "batched emit" method.

Accepts a [`TickerOptions`](#tickeroptions) object as it's only argument.

**Syntax**

```
const ticker = new Ticker( [ options ] );
```

**Options**

- **phases**
  - See [phases](#tickerphases) docs.
  - Accepts: [`Phase[]`](#phase).
  - Optional. Defaults to `[]`.
- **dedupe**
  - See [dedupe](#tickerdedupe) docs.
  - Accepts: [`TickerDedupe`](#tickerdedupe).
  - Optional. Defaults to `"add"`.
- **getId**
  - See [getId](#tickergetid) docs.
  - Accepts: `(frameCallback: FrameCallback) => FrameCallbackId`.
  - Optional. Defaults to `() => Symbol()`.

#### ticker.phases

Type: [`Phase[]`](#phase).

An array of phase names. You can change this array dynamically at any time to change the order of the phases. If you provide the same phase multiple times then it's callbacks are emitted multiple times on tick.

#### ticker.dedupe

Type: [`TickerDedupe`](#tickerdedupe).

Defines how a duplicate frame callback id is handled:

- `"add"`: the existing callback (of the id) is removed and the new callback is appended to the phase's callback queue.
- `"update"`: the existing callback (of the id) is replaced with the new callback without changing the index of the callback in the phase's callback queue.
- `"ignore"`: the new callback is silently ignored and not added to the phase.
- `"throw"`: as the name suggests an error will be thrown.

#### ticker.getId

Type:

```ts
(frameCallback: FrameCallback) => FrameCallbackId;
```

A function which is used to get the frame callback id. By default Tikki uses `Symbol()` to create unique ids, but you can provide your own function if you want to use something else. Receives the frame callback as the first (and only) argument.

#### ticker.on()

Add a frame callback to a phase.

**Syntax**

```
ticker.on( phase, frameCallback, [ frameCallbackId ] );
```

**Parameters**

1. **phase**
   - The name of the phase you want to add the frame callback to.
   - Accepts: [`Phase`](#phase).
2. **frameCallback**
   - A frame callback that will be called on tick (if the phase is active).
   - Accepts: [`FrameCallback`](#framecallback).
3. **frameCallbackId**
   - The id for the frame callback. If not provided, the id will be generated by the `ticker.getId` method.
   - Accepts: [`FrameCallbackId`](#framecallbackid).
   - Optional.

**Returns**

A [frame callback id](#framecallbackid), which can be used to remove this specific callback. Unless manually provided via arguments this will be whatever the `ticker.getId` method spits out, and by default it spits out symbols which are guaranteed to be always unique.

#### ticker.once()

Add a one-off frame callback to a phase. This works identically to the `on` method with the exception that the frame callback is removed immediately after it has been called once. Please refer to the [`on`](#tickeron) method for more information.

**Syntax**

```
ticker.once( phase, frameCallback, [ frameCallbackId ] );
```

#### ticker.off()

Remove a frame callback or multiple frame callbacks. If no _frameCallbackId_ is provided all frame callbacks for the specified phase will be removed. If no _phase_ is provided all frame callbacks from the ticker will be removed.

**Syntax**

```
ticker.off( [ phase ], [ frameCallbackId ] );
```

**Parameters**

1. **phase**
   - The phase you want to remove frame callbacks from.
   - Accepts: [`Phase`](#phase).
   - _optional_
2. **frameCallbackId**
   - The id of the frame callback you want to remove.
   - Accepts: [`FrameCallbackId`](#framecallbackid).
   - _optional_

#### ticker.count()

Returns the frame callback count for a phase if _phase_ is provided. Otherwise returns the frame callback count for the whole ticker.

**Syntax**

```
ticker.count( [ phase ] )
```

**Parameters**

1. **phase**
   - The phase you want to get the frame callback count for.
   - Accepts: [`Phase`](#phase).
   - Optional.

#### ticker.tick()

Collects all the frame callbacks (in the currently active phases) into a queue and calls the frame callbacks with the arguments you provide to this method.

**Syntax**

```
ticker.tick( [ ...args ] )
```

**Parameters**

1. **...args**
   - Any arguments you see fit. Just remember to provide your custom `FrameCallback` type to `Ticker` when using TypeScript, as demonstrated in the example below.
   - Accepts: `any`.
   - Optional.

### AutoTicker

`AutoTicker` class extends `Ticker` class and (as the name says) ticks automatically so you don't have to manually call the `tick` method in your own loop. It defaults to `requestAnimationFrame` and falls back to `setTimeout` in environments where `requestAnimationFrame` is not supported.

`AutoTicker` has all the same methods and options as `Ticker`, and a few extra options/properties to control the auto-ticking. Please refer to the [Ticker](#ticker)'s API for anything that's not explicitly documented here. We only document the differences and additions here.

Accepts an [`AutoTickerOptions`](#autotickeroptions) object as it's only argument.

**Syntax**

```
const ticker = new AutoTicker( [ options ] );
```

**Options**

- **paused**
  - See [paused](#autotickerpaused) docs.
  - Accepts: `boolean`.
  - Optional. Defaults to `false`.
- **onDemand**
  - See [onDemand](#autotickerondemand) docs.
  - Accepts: `boolean`.
  - Optional. Defaults to `false`.
- **requestFrame**
  - See [requestFrame](#autotickerrequestframe) docs.
  - Accepts: [`FrameCallback`](#framecallback).
  - Optional. Defaults to `createRequestFrame()`, which uses `requestAnimationFrame` (if available) and falls back to `setTimeout`.

#### autoticker.paused

Type: `boolean`.

Defines if the ticker is paused. If `true` the ticker won't tick automatically until unpaused. You can change this property dynamically at any time to pause/unpause the ticker.

#### autoticker.onDemand

Type: `boolean`.

Defines if the ticker should tick only when there are frame callbacks in the ticker. If `true` the ticker will tick only when there are frame callbacks in it. If `false` the ticker will tick continuously. You can change this property dynamically at any time to switch between on-demand and continuous ticking.

#### autoticker.requestFrame

Type: [`RequestFrame`](#requestframe).

Defines the method which is used to request the next frame. You can change this property dynamically at any time to switch the frame request method.

### Types

Here's a list of all the types that you can import from `tikki`.

```ts
import {
  Phase,
  FrameCallback,
  FrameCallbackId,
  TickerDedupe,
  TickerOptions,
  AutoTickerOptions,
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

#### TickerDedupe

```ts
type TickerDedupe = 'add' | 'update' | 'ignore' | 'throw';
```

#### TickerOptions

```ts
interface TickerOptions<P extends Phase> {
  phases?: P[];
  dedupe?: TickerDedupe;
  getId?: (frameCallback: FrameCallback) => FrameCallbackId;
}
```

#### AutoTickerOptions

```ts
interface AutoTickerOptions<P extends Phase, FC extends FrameCallback> extends TickerOptions<P> {
  paused?: boolean;
  onDemand?: boolean;
  requestFrame?: RequestFrame<FC>;
}
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
