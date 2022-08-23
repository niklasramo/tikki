# Tikki

Tikki is a minimalistic game/animation loop, or a "ticker" if you prefer, with the power of an event emitter baked in it. In practice this means that you can use Tikki like an event emitter with the exception that there is no `emit` method. Instead, Tikki automatically emits the events (or phases as they are called in Tikki's context) in the order you have specified on every animation frame. This allows for a very ergonomic (and familiar) API for controlling the exection order of different tasks/phases.

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

```typescript
import { Ticker } from 'tikki';

// Create a ticker instance and define initial phases.
const ticker = new Ticker({ phases: ['a', 'b', 'c'] });

// Bind some listeners. As long as the ticker has listeners it will be
// automatically ticking unless paused with .stop() method.
const refA = ticker.on('a', () => console.log('a'));
const refB = ticker.on('b', () => console.log('b'));
const refC = ticker.on('c', () => console.log('c'));

// If you want to change the order of phases you can just directly manipulate
// the ticker.phases like this, whenever you like. Note that you can add the
// same phase multiple times in the array.
ticker.phases = ['c', 'b', 'a', 'c'];

// Removing listeners from a phase is as simple as providing the phase and the
// listener id (or the actual listener if you wish) to .off method.
ticker.off('a', refA);

// .once method will add a listener that's called only once on the next
// frame and then automatically removed.
ticker.once('a', () => console.log('a'));
```

<h2><a id="api" href="#api" aria-hidden="true">#</a> API</h2>

<h3><a id="ticker" href="#ticker" aria-hidden="true">#</a> Ticker</h3>

`Ticker` is a constructor function which creates a ticker instance when instantiated with the `new` keyword. When using with TypeScript it's recommended to provide the allowed phases.

```typescript
import { Ticker } from 'tikki';

// Define all the allowed phases.
type AllowedPhases = 'read' | 'write' | 'foo' | 'bar';

// Instantiate ticker.
const ticker = new Ticker<AllowedPhases>(
  // Optionally, you can provide initial settings.
  {
    // Defaults to an empty array if omitted in which case nothing gets emitted
    // on tick. You should probably always define the phases unless you
    // you intentionally want to skip emitting anything.
    phases: ['read', 'write'],
    // Defaults to true if omitted. If this is set to false then you have to
    // manually call the tick method within your custom loop.
    autoTick: true,
    // You can provide your own requestAnimationFrame function here. Defaults to
    // requestAnimationFrame in browser and a setTimeout based fallback in
    // node.js.
    raf: (callback) => setTimeout(() => callback(Date.now()), 1000 / 60),
    // You can provide your own cancelAnimationFrame function here. Defaults to
    // cancelAnimationFrame in browser and a setTimeout based fallback in
    // node.js.
    caf: (requestId) => clearTimeout(requestId),
  }
);

// You can update phases and autoTick options after instantiation.
ticker.phases = ['foo', 'read', 'write', 'bar'];
ticker.autoTick = false;
```

**Methods**

- [on( phase, listener )](#ticker-on)
- [once( phase, listener, )](#ticker-once)
- [off( [phase], [target] )](#ticker-off)
- [listenerCount( [phase] )](#ticker-listenerCount)
- [tick( time )](#ticker-tick)

<h3><a id="ticker-on" href="#ticker-on" aria-hidden="true">#</a> <code>ticker.on( phase, listener )</code></h3>

Add a listener to a phase. You can add the same listener multiple times.

**Arguments**

- **phase** &nbsp;&mdash;&nbsp; _String / Number / Symbol_
  - The phase specified as a string, number or symbol.
- **listener** &nbsp;&mdash;&nbsp; _Function_
  - A listener function that will be called on tick.

**Returns** &nbsp;&mdash;&nbsp; _Symbol_

A listener id, which can be used to remove this specific listener.

**Examples**

```typescript
import { Ticker } from 'tikki';

const ticker = new Ticker({ phases: ['test'] });

const a = () => console.log('a');
const b = () => console.log('b');

const id1 = ticker.on('test', a);
const id2 = ticker.on('test', b);
const id3 = ticker.on('test', a);
const id4 = ticker.on('test', b);

ticker.emit('test');
// a
// b
// a
// b

ticker.off('test', id2);
ticker.emit('test');
// a
// a
// b

ticker.off('test', a);
ticker.emit('test');
// b
```

<h3><a id="ticker-once" href="#ticker-once" aria-hidden="true">#</a> <code>ticker.once( phase, listener )</code></h3>

Add a one-off listener to a phase. You can add the same listener multiple times.

**Arguments**

- **phase** &nbsp;&mdash;&nbsp; _String / Number / Symbol_
  - The phase specified as a string, number or symbol.
- **listener** &nbsp;&mdash;&nbsp; _Function_
  - A listener function that will be called on tick.

**Returns** &nbsp;&mdash;&nbsp; _Symbol_

A listener id, which can be used to remove this specific listener.

**Examples**

```typescript
import { Ticker } from 'tikki';

const ticker = new Ticker({ phases: ['test'] });
const a = () => console.log('a');
const b = () => console.log('b');

ticker.on('test', a);
ticker.once('test', b);

ticker.emit('test');
// a
// b

ticker.emit('test');
// a
```

<h3><a id="ticker-off" href="#ticker-off" aria-hidden="true">#</a> <code>ticker.off( [phase], [target] )</code></h3>

Remove a phase listener or multiple phase listeners. If no _target_ is provided all listeners for the specified phase will be removed. If no _phase_ is provided all listeners from the ticker will be removed.

**Arguments**

- **phase** &nbsp;&mdash;&nbsp; _String / Number / Symbol_ &nbsp;&mdash;&nbsp; _optional_
  - The phase specified as a string, number or symbol.
- **target** &nbsp;&mdash;&nbsp; _Function / Symbol_ &nbsp;&mdash;&nbsp; _optional_
  - Target removable listeners by specific function or listener id. If no _target_ is provided all listeners for the specified phase will be removed.

**Examples**

```typescript
import { Ticker } from 'tikki';

const ticker = new Ticker({ phases: ['test'] });

const a = () => console.log('a');
const b = () => console.log('b');

const id1 = ticker.on('test', a);
const id2 = ticker.on('test', b);
const id3 = ticker.on('test', a);
const id4 = ticker.on('test', b);

// Remove specific listener by id.
ticker.off('test', id2);

// Remove all instances of a specific listener function.
ticker.off('test', a);

// Remove all listeners from a phase.
ticker.off('test');

// Remove all listeners from the ticker.
ticker.off();
```

<h3><a id="ticker-listenerCount" href="#ticker-listenerCount" aria-hidden="true">#</a> <code>ticker.listenerCount( [phase] )</code></h3>

Returns the listener count for a phase if _phase_ is provided. Otherwise returns the listener count for the whole ticker.

**Arguments**

- **phase** &nbsp;&mdash;&nbsp; _String / Number / Symbol_
  - The phase specified as a string, number or symbol.

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

<h3><a id="ticker-tick" href="#ticker-tick" aria-hidden="true">#</a> <code>ticker.tick( time )</code></h3>

The tick method, which you can use to manually tick the ticker.

**Arguments**

- **time** &nbsp;&mdash;&nbsp; _Number_
  - Current time in milliseconds.

**Examples**

```typescript
import { Ticker } from 'tikki';

const ticker = new Ticker({
  // Disable default auto ticking.
  autoTick: false,
});

// Tick every second.
setInterval(() => {
  ticker.tick(Date.now());
}, 1000);
```

<h2><a id="license" href="#license" aria-hidden="true">#</a> License</h2>

Copyright © 2022, Niklas Rämö (inramo@gmail.com). Licensed under the MIT license.
