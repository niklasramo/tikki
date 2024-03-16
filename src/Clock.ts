import type { Writeable } from './types.js';

export class Clock {
  readonly ticks: number;
  readonly startTime: number;
  readonly time: number;
  readonly deltaTime: number;
  readonly elapsedTime: number;
  timescale: number;

  constructor() {
    this.ticks = 0;
    this.time = 0;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.deltaTime = 0;
    this.timescale = 1;
  }

  tick(time: number, dt?: number) {
    if (!this.ticks) {
      (this as Writeable<Clock>).startTime = time;
      (this as Writeable<Clock>).time = time;
      (this as Writeable<Clock>).deltaTime = (dt || 0) * this.timescale;
      (this as Writeable<Clock>).elapsedTime += this.deltaTime;
    } else {
      (this as Writeable<Clock>).deltaTime =
        (dt === undefined ? time - this.time : dt) * this.timescale;
      (this as Writeable<Clock>).elapsedTime += this.deltaTime;
      (this as Writeable<Clock>).time = time;
    }

    ++(this as Writeable<Clock>).ticks;
  }
}
