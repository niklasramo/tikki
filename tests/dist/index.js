// tests/src/index.ts
import { assert } from "chai";

// src/Ticker.ts
import { Emitter, EmitterDedupe } from "eventti";
var TickerDedupe = EmitterDedupe;
var Ticker = class {
  constructor(options = {}) {
    const { phases = [], dedupe, getId } = options;
    this._phases = phases;
    this._emitter = new Emitter({ getId, dedupe });
    this._queue = [];
    this.tick = this.tick.bind(this);
    this._getListeners = this._emitter["_getListeners"].bind(this._emitter);
  }
  get phases() {
    return this._phases;
  }
  set phases(phases) {
    this._phases = phases;
  }
  get dedupe() {
    return this._emitter.dedupe;
  }
  set dedupe(dedupe) {
    this._emitter.dedupe = dedupe;
  }
  get getId() {
    return this._emitter.getId;
  }
  set getId(getId) {
    this._emitter.getId = getId;
  }
  tick(...args) {
    this._assertEmptyQueue();
    this._fillQueue();
    this._processQueue(...args);
  }
  on(phase, frameCallback, frameCallbackId) {
    return this._emitter.on(phase, frameCallback, frameCallbackId);
  }
  once(phase, frameCallback, frameCallbackId) {
    return this._emitter.once(phase, frameCallback, frameCallbackId);
  }
  off(phase, frameCallbackId) {
    return this._emitter.off(phase, frameCallbackId);
  }
  count(phase) {
    return this._emitter.listenerCount(phase);
  }
  _assertEmptyQueue() {
    if (this._queue.length) {
      throw new Error(`Ticker: Can't tick before the previous tick has finished!`);
    }
  }
  _fillQueue() {
    const { _queue, _phases, _getListeners } = this;
    let i = 0;
    let phaseCount = _phases.length;
    let batch;
    for (; i < phaseCount; i++) {
      batch = _getListeners(_phases[i]);
      if (batch)
        _queue.push(batch);
    }
    return _queue;
  }
  _processQueue(...args) {
    const { _queue } = this;
    if (_queue.length) {
      let i = 0;
      let j = 0;
      let iLength = _queue.length;
      let jLength;
      let batch;
      for (; i < iLength; i++) {
        batch = _queue[i];
        j = 0;
        jLength = batch.length;
        for (; j < jLength; j++) {
          batch[j](...args);
        }
      }
      _queue.length = 0;
    }
  }
};

// src/utils/createRequestFrame.ts
function createRequestFrame(fallbackFPS = 60) {
  if (typeof requestAnimationFrame === "function" && typeof cancelAnimationFrame === "function") {
    return (callback) => {
      const id = requestAnimationFrame(callback);
      return () => cancelAnimationFrame(id);
    };
  } else {
    const frameTime = 1e3 / fallbackFPS;
    const now = typeof performance === "undefined" ? () => Date.now() : () => performance.now();
    return (callback) => {
      const id = setTimeout(() => callback(now()), frameTime);
      return () => clearTimeout(id);
    };
  }
}

// src/AutoTicker.ts
var AutoTicker = class extends Ticker {
  constructor(options = {}) {
    const {
      paused = false,
      onDemand = false,
      requestFrame = createRequestFrame(),
      ...tickerOptions
    } = options;
    super(tickerOptions);
    this._paused = paused;
    this._onDemand = onDemand;
    this._requestFrame = requestFrame;
    this._cancelFrame = null;
    this._empty = true;
    if (!paused && !onDemand)
      this._request();
  }
  get phases() {
    return this._phases;
  }
  set phases(phases) {
    this._phases = phases;
    if (phases.length) {
      this._empty = false;
      this._request();
    } else {
      this._empty = true;
    }
  }
  get paused() {
    return this._paused;
  }
  set paused(paused) {
    this._paused = paused;
    paused ? this._cancel() : this._request();
  }
  get onDemand() {
    return this._paused;
  }
  set onDemand(onDemand) {
    this._onDemand = onDemand;
    if (!onDemand)
      this._request();
  }
  get requestFrame() {
    return this._requestFrame;
  }
  set requestFrame(requestFrame) {
    if (this._requestFrame === requestFrame)
      return;
    this._requestFrame = requestFrame;
    if (this._cancelFrame) {
      this._cancel();
      this._request();
    }
  }
  tick(...args) {
    this._assertEmptyQueue();
    this._cancelFrame = null;
    if (!this._onDemand)
      this._request();
    if (this._empty)
      return;
    this._fillQueue();
    if (!this._queue.length) {
      this._empty = true;
      return;
    }
    if (this._onDemand)
      this._request();
    this._processQueue(...args);
  }
  on(phase, frameCallback, frameCallbackId) {
    const id = super.on(phase, frameCallback, frameCallbackId);
    this._empty = false;
    this._request();
    return id;
  }
  once(phase, frameCallback, frameCallbackId) {
    const id = super.once(phase, frameCallback, frameCallbackId);
    this._empty = false;
    this._request();
    return id;
  }
  _request() {
    if (this._paused || this._cancelFrame)
      return;
    this._cancelFrame = this._requestFrame(this.tick);
  }
  _cancel() {
    if (!this._cancelFrame)
      return;
    this._cancelFrame();
    this._cancelFrame = null;
  }
};

// tests/src/index.ts
describe("ticker", () => {
  it(`should tick automatically by default`, async () => {
    return new Promise((resolve) => {
      const ticker = new AutoTicker({ phases: ["test"] });
      let counter = 0;
      ticker.on("test", () => {
        if (++counter === 10) {
          ticker.paused = true;
          ticker.off();
          resolve();
        }
      });
    });
  });
});
describe("phase", () => {
  it(`should be allowed to be a string, number or symbol`, () => {
    ["", "foo", 0, 1, -1, Infinity, -Infinity, Symbol()].forEach((phase) => {
      const ticker = new AutoTicker({ paused: true, phases: [phase] });
      let counter = 0;
      ticker.on(phase, () => {
        ++counter;
      });
      ticker.once(phase, () => {
        ++counter;
      });
      assert.equal(ticker.count(phase), 2);
      ticker.tick(1);
      assert.equal(counter, 2);
      ticker.off(phase);
      assert.equal(ticker.count(phase), 0);
    });
  });
});
describe("frame callback id", () => {
  it(`should be allowed to be any value except undefined`, () => {
    [
      null,
      "",
      "foo",
      0,
      1,
      -1,
      Infinity,
      -Infinity,
      Symbol(),
      true,
      false,
      [],
      {},
      () => {
      }
    ].forEach((frameCallbackId) => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      let counter = 0;
      ticker.once(
        "test",
        () => {
          ++counter;
        },
        frameCallbackId
      );
      assert.equal(ticker.count(), 1);
      ticker.tick(1);
      assert.equal(ticker.count(), 0);
      assert.equal(counter, 1);
      ticker.on(
        "test",
        () => {
          ++counter;
        },
        frameCallbackId
      );
      ticker.tick(2);
      assert.equal(ticker.count(), 1);
      assert.equal(counter, 2);
      ticker.off("test", frameCallbackId);
      assert.equal(ticker.count(), 0);
    });
  });
});
describe("constructor options", () => {
  describe("getId", () => {
    it(`should default to creating a new Symbol if omitted`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      const idA = ticker.on("test", () => {
      });
      const idB = ticker.once("test", () => {
      });
      assert.equal(typeof idA, "symbol");
      assert.equal(typeof idB, "symbol");
      assert.notEqual(idA, idB);
    });
    it(`should be a function that generates a new frame callback id`, () => {
      let id = 0;
      const ticker = new AutoTicker({
        paused: true,
        phases: ["test"],
        getId: () => ++id
      });
      const idA = ticker.on("test", () => {
      });
      assert.equal(idA, id);
      const idB = ticker.once("test", () => {
      });
      assert.equal(idB, id);
    });
    it(`should receive the frame callback as it's only argument`, () => {
      const ticker = new AutoTicker({
        paused: true,
        phases: ["test"],
        getId: (...args) => {
          assert.equal(args.length, 1);
          return args[0];
        }
      });
      const fcA = () => {
      };
      assert.equal(ticker.on("test", fcA), fcA);
      const fcB = () => {
      };
      assert.equal(ticker.once("test", fcB), fcB);
    });
  });
  describe("dedupe", () => {
    it(`should default to "add" if omitted`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      let result = "";
      ticker.on("test", () => void (result += "1"), "foo");
      ticker.on("test", () => void (result += "2"));
      ticker.on("test", () => void (result += "3"), "foo");
      ticker.tick(1);
      assert.equal(result, "23");
    });
    describe("add", () => {
      it(`should add the duplicate frame callback to the end of the queue`, () => {
        const ticker = new AutoTicker({ paused: true, phases: ["test"], dedupe: TickerDedupe.ADD });
        let result = "";
        ticker.on("test", () => void (result += "1"), "foo");
        ticker.on("test", () => void (result += "2"));
        ticker.on("test", () => void (result += "3"), "foo");
        ticker.tick(1);
        assert.equal(result, "23");
      });
    });
    describe("update", () => {
      it(`should update the existing frame callback with the new frame callback`, () => {
        const ticker = new AutoTicker({
          paused: true,
          phases: ["test"],
          dedupe: TickerDedupe.UPDATE
        });
        let result = "";
        ticker.on("test", () => void (result += "1"), "foo");
        ticker.on("test", () => void (result += "2"));
        ticker.on("test", () => void (result += "3"), "foo");
        ticker.tick(1);
        assert.equal(result, "32");
      });
    });
    describe("ignore", () => {
      it(`should ignore the duplicate frame callback`, () => {
        const ticker = new AutoTicker({
          paused: true,
          phases: ["test"],
          dedupe: TickerDedupe.IGNORE
        });
        let result = 0;
        ticker.on("test", () => void (result = 1), "foo");
        ticker.on("test", () => void (result = 2), "foo");
        ticker.tick(1);
        assert.equal(result, 1);
      });
    });
    describe("throw", () => {
      it(`should throw an error`, () => {
        const ticker = new AutoTicker({
          paused: true,
          phases: ["test"],
          dedupe: TickerDedupe.THROW
        });
        ticker.on("test", () => {
        }, "foo");
        assert.throws(() => ticker.on("test", () => {
        }, "foo"));
      });
    });
  });
});
describe("ticker.on()", () => {
  describe("ticker.on(phase, frameCallback)", () => {
    it(`should return a symbol (frame callback id) by default`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      assert.equal(typeof ticker.on("test", () => {
      }), "symbol");
    });
    it(`should add a frame callback to a phase`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      let counter = 0;
      ticker.on("test", () => void ++counter);
      ticker.tick(1);
      assert.equal(counter, 1);
      ticker.tick(2);
      assert.equal(counter, 2);
    });
    it("should allow duplicate frame callbacks", () => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      let counter = 0;
      const fc = () => void ++counter;
      ticker.on("test", fc);
      ticker.on("test", fc);
      ticker.tick(1);
      assert.equal(counter, 2);
    });
  });
  describe("ticker.on(phase, frameCallback, frameCallbackId)", () => {
    it(`should return the provided frame callback id`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      assert.equal(
        ticker.on("test", () => {
        }, "foo"),
        "foo"
      );
    });
  });
});
describe("ticker.once()", () => {
  describe("ticker.once(phase, frameCallback)", () => {
    it(`should return a symbol (frame callback id) by default`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      assert.equal(typeof ticker.once("test", () => {
      }), "symbol");
    });
    it(`should add a frame callback that triggers only once`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      let counter = 0;
      ticker.once("test", () => void ++counter);
      ticker.tick(1);
      assert.equal(counter, 1);
      ticker.tick(2);
      assert.equal(counter, 1);
    });
    it("should allow duplicate frame callbacks", () => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      let counter = 0;
      const fc = () => void ++counter;
      ticker.once("test", fc);
      ticker.once("test", fc);
      ticker.tick(1);
      assert.equal(counter, 2);
    });
  });
  describe("ticker.once(phase, frameCallback, frameCallbackId)", () => {
    it(`should return the provided frame callback id`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      assert.equal(
        ticker.once("test", () => {
        }, "foo"),
        "foo"
      );
    });
  });
});
describe("ticker.off()", () => {
  describe("ticker.off()", () => {
    it(`should remove all frame callbacks from the ticker`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["a", "b", "c"] });
      ticker.on("a", () => assert.fail());
      ticker.on("b", () => assert.fail());
      ticker.on("c", () => assert.fail());
      ticker.off();
      ticker.tick(1);
      assert.equal(1, 1);
    });
  });
  describe("ticker.off(phase)", () => {
    it(`should remove all frame callbacks of a specific phase`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["pass", "fail"] });
      ticker.on("pass", () => {
      });
      ticker.on("fail", () => assert.fail());
      ticker.on("fail", () => assert.fail());
      ticker.off("fail");
      ticker.tick(1);
      assert.equal(1, 1);
    });
  });
  describe("ticker.off(phase, frameCallbackId)", () => {
    it(`should remove specific frame callback of a specific phase that matches the provided frame callback id`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["test"] });
      let value = "";
      ticker.on("test", () => {
        value += "a";
      });
      const b = ticker.on("test", () => {
        value += "b";
      });
      ticker.on("test", () => {
        value += "c";
      });
      ticker.off("test", b);
      ticker.tick(1);
      assert.equal(value, "ac");
    });
  });
});
describe("ticker.tick()", () => {
  describe("ticker.tick(time)", () => {
    it(`should emit the phases once in the defined order with correct arguments`, () => {
      const ticker = new AutoTicker({
        paused: true,
        phases: ["b", "c", "a", "a", "b"]
      });
      let result = "";
      ticker.on("a", (...args) => {
        assert.equal(args.length, 1);
        assert.equal(args[0], 10);
        result += "a";
      });
      ticker.on("b", (...args) => {
        assert.equal(args.length, 1);
        assert.equal(args[0], 10);
        result += "b";
      });
      ticker.on("c", (...args) => {
        assert.equal(args.length, 1);
        assert.equal(args[0], 10);
        result += "c";
      });
      ticker.tick(10);
      assert.equal(result, ticker.phases.join(""));
    });
    it("should allow changing ticker.phases dynamically", () => {
      const ticker = new AutoTicker({ paused: true, phases: ["a", "b"] });
      let data = "";
      ticker.on("a", () => {
        data += "a";
      });
      ticker.on("b", () => {
        data += "b";
        ticker.phases = ["b", "a"];
      });
      ticker.tick(1);
      ticker.tick(2);
      assert.equal(data, "abba");
    });
    it(`should throw an error if tick is called within a listener`, () => {
      const ticker = new AutoTicker({
        paused: true,
        phases: ["test"]
      });
      ticker.on("test", () => {
        assert.throws(() => ticker.tick(0));
      });
      ticker.tick(0);
    });
    it(`should pass all the arguments to the listeners`, () => {
      const ticker = new AutoTicker({
        paused: true,
        phases: ["a", "b"],
        requestFrame: void 0
      });
      let count = 0;
      ticker.on("a", (time, deltaTime, message, ...args) => {
        assert.equal(args.length, 0);
        assert.equal(time, 1);
        assert.equal(deltaTime, 2);
        assert.equal(message, "test");
        ++count;
      });
      ticker.on("b", (time, deltaTime, message, ...args) => {
        assert.equal(args.length, 0);
        assert.equal(time, 1);
        assert.equal(deltaTime, 2);
        assert.equal(message, "test");
        ++count;
      });
      ticker.tick(1, 2, "test");
      assert.equal(count, 2);
    });
    it(`should only emit the listeners of the active phases`, () => {
      const ticker = new AutoTicker({
        paused: true,
        phases: ["a", "b"]
      });
      let result = "";
      ticker.on("a", () => result += "a");
      ticker.on("b", () => result += "b");
      ticker.on("c", () => result += "c");
      ticker.tick(0);
      assert.equal(result, "ab");
      ticker.phases = ["c", "c"];
      ticker.tick(0);
      assert.equal(result, "abcc");
    });
  });
});
describe("ticker.count()", () => {
  describe("ticker.count(phase)", () => {
    it(`should return the amount of frame callbacks for the provided phase`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["a", "b", "c"] });
      ticker.on("a", () => {
      });
      ticker.on("b", () => {
      });
      ticker.on("b", () => {
      });
      ticker.on("c", () => {
      });
      ticker.on("c", () => {
      });
      ticker.on("c", () => {
      });
      assert.equal(ticker.count("a"), 1);
      assert.equal(ticker.count("b"), 2);
      assert.equal(ticker.count("c"), 3);
    });
  });
  describe("ticker.count()", () => {
    it(`should return the amount of all frame callbacks in the ticker`, () => {
      const ticker = new AutoTicker({ paused: true, phases: ["a", "b", "c"] });
      ticker.on("a", () => {
      });
      ticker.on("b", () => {
      });
      ticker.on("b", () => {
      });
      ticker.on("c", () => {
      });
      ticker.on("c", () => {
      });
      ticker.on("c", () => {
      });
      assert.equal(ticker.count(), 6);
    });
  });
});
