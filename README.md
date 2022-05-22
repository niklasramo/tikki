# Tikki

Tikki is a fusion of a minimalistic animation loop and an event emitter. It's meant for situations where you need to control the execution flow of different phases within an animation loop, e.g. if you want to batch DOM reads and writes for better performance or orchestrate different tasks within a game loop.

In practice this means that you can use Tikki like an event emitter (`on(event, listener)` / `once(event, listener)` / `off(event, listener)`) with the exception that there is no `emit` method. Instead, Tikki provides a `tick()` method which emits all the registered events in a batch. You can fully control the execution order of the events at any time.

By default Tikki will automatically _tick_ (using `requestAnimationFrame`) whenever there are event listeners and will also automatically stop ticking when there are none. However, you can also turn off the auto-tick mode and just call `tick()` manually if need be.

- Small footprint (around 500 bytes gzipped).
- One (tiny) dependency -> [Eventti](https://github.com/niklasramo/eventti).
- Written in TypeScript.
- MIT licensed.

<h2><a id="install" href="#install" aria-hidden="true">#</a> Install</h2>

Node

```
npm install tikki
```

Browser

```html
<script src="eventti.umd.js"></script>
<script src="tikki.umd.js"></script>
```

You can access Tikki via `window.tikki` global variable in browser context.

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

// Removing listeners is as simple as this.
ticker.off('a', refA);

// .once method will add a listener that's called only once on the next tick.
ticker.once('a', () => console.log('a'));

// You can always manually start and stop ticking, if needed.
ticker.start();
ticker.stop();
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
  }
);

// You can change the initial settings any time you want after instantiation.
ticker.phases = ['foo', 'read', 'write', 'bar'];
ticker.autoTick = false;
```

**Methods**

- [on( phase, listener )](#ticker-on)
- [once( phase, listener, )](#ticker-once)
- [off( [phase], [target] )](#ticker-off)
- [listenerCount( [phase] )](#ticker-listenerCount)
- [tick( time )](#ticker-tick)
- [start()](#ticker-start)
- [stop()](#ticker-stop)

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

```javascript
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
  - Target removable event listeners by specific function or listener id. If no _target_ is provided all listeners for the specified event will be removed.

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

<h3><a id="ticker-start" href="#ticker-start" aria-hidden="true">#</a> <code>ticker.start()</code></h3>

Manually start auto-ticking. Note that this method will have no effect if auto ticking is disabled.

**Examples**

```typescript
import { Ticker } from 'tikki';

const ticker = new Ticker({ phases: ['a'] });

// Add a listener so ticker starts ticking.
const refA = ticker.on('a', () => console.log('a'));

// Pause ticker for one second every other second.
// Why? For example's sake.
let isPaused = false;
setInterval(() => {
  isPaused = !isPaused;
  if (isPaused) {
    ticker.stop();
  } else {
    ticker.start();
  }
}, 1000);
```

<h3><a id="ticker-stop" href="#ticker-stop" aria-hidden="true">#</a> <code>ticker.stop()</code></h3>

Manually stop auto-ticking. Note that this method will have no effect if auto ticking is disabled.

**Examples**

```typescript
import { Ticker } from 'tikki';

const ticker = new Ticker({ phases: ['a'] });

// Add a listener so ticker starts ticking.
const refA = ticker.on('a', () => console.log('a'));

// Pause ticker for one second every other second.
// Why? For example's sake.
let isPaused = false;
setInterval(() => {
  isPaused = !isPaused;
  if (isPaused) {
    ticker.stop();
  } else {
    ticker.start();
  }
}, 1000);
```

<h2><a id="license" href="#license" aria-hidden="true">#</a> License</h2>

Copyright © 2022, Niklas Rämö (inramo@gmail.com). Licensed under the MIT license.
