import { TaskItem } from './types';

export interface QueueEnqueueResult {
  resized: boolean;
  oldCapacity: number;
  newCapacity: number;
}

export interface QueueDequeueResult {
  ok: boolean;
  value?: TaskItem;
  error?: 'QUEUE_UNDERFLOW';
}

// Circular Buffer FIFO Queue with explicit front, rear, count, and capacity doubling
export class TaskFIFOQueue {
  private buffer: (TaskItem | null)[];
  private frontIdx = 0;
  private rearIdx = 0;
  private count = 0;
  private capacityValue: number;

  constructor(initialCapacity = 8) {
    this.capacityValue = initialCapacity;
    this.buffer = new Array<TaskItem | null>(initialCapacity);
    for (let i = 0; i < initialCapacity; i += 1) {
      this.buffer[i] = null;
    }
  }

  public get size(): number {
    return this.count;
  }

  public get capacity(): number {
    return this.capacityValue;
  }

  public get frontIndex(): number {
    return this.frontIdx;
  }

  public get rearIndex(): number {
    return this.rearIdx;
  }

  public isEmpty(): boolean {
    return this.count === 0;
  }

  private resize(newCapacity: number): void {
    const nextBuffer = new Array<TaskItem | null>(newCapacity);
    for (let i = 0; i < newCapacity; i += 1) {
      nextBuffer[i] = null;
    }
    for (let i = 0; i < this.count; i += 1) {
      const physicalIdx = (this.frontIdx + i) % this.capacityValue;
      nextBuffer[i] = this.buffer[physicalIdx];
    }
    this.buffer = nextBuffer;
    this.frontIdx = 0;
    this.rearIdx = this.count;
    this.capacityValue = newCapacity;
  }

  public enqueue(task: TaskItem): QueueEnqueueResult {
    const oldCapacity = this.capacityValue;
    let resized = false;
    if (this.count === this.capacityValue) {
      this.resize(this.capacityValue * 2);
      resized = true;
    }

    this.buffer[this.rearIdx] = task;
    this.rearIdx = (this.rearIdx + 1) % this.capacityValue;
    this.count += 1;

    return {
      resized,
      oldCapacity,
      newCapacity: this.capacityValue,
    };
  }

  public dequeue(): QueueDequeueResult {
    if (this.count === 0) {
      return { ok: false, error: 'QUEUE_UNDERFLOW' };
    }
    const item = this.buffer[this.frontIdx];
    this.buffer[this.frontIdx] = null;
    this.frontIdx = (this.frontIdx + 1) % this.capacityValue;
    this.count -= 1;

    if (this.count === 0) {
      this.frontIdx = 0;
      this.rearIdx = 0;
    }

    return item !== null
      ? { ok: true, value: item }
      : { ok: false, error: 'QUEUE_UNDERFLOW' };
  }

  public peek(): TaskItem | null {
    if (this.count === 0) {
      return null;
    }
    return this.buffer[this.frontIdx];
  }

  public removeById(taskId: string): boolean {
    if (this.count === 0) {
      return false;
    }
    const kept: TaskItem[] = [];
    let removed = false;
    for (let i = 0; i < this.count; i += 1) {
      const idx = (this.frontIdx + i) % this.capacityValue;
      const item = this.buffer[idx];
      if (item !== null) {
        if (!removed && item.id === taskId) {
          removed = true;
        } else {
          kept[kept.length] = item;
        }
      }
    }

    if (!removed) {
      return false;
    }

    for (let i = 0; i < this.capacityValue; i += 1) {
      this.buffer[i] = i < kept.length ? kept[i] : null;
    }
    this.frontIdx = 0;
    this.count = kept.length;
    this.rearIdx = kept.length % this.capacityValue;
    return true;
  }

  public toArray(): TaskItem[] {
    const out: TaskItem[] = [];
    for (let i = 0; i < this.count; i += 1) {
      const idx = (this.frontIdx + i) % this.capacityValue;
      const item = this.buffer[idx];
      if (item !== null) {
        out[out.length] = item;
      }
    }
    return out;
  }

  public getBufferSlots(): (TaskItem | null)[] {
    const slots: (TaskItem | null)[] = [];
    for (let i = 0; i < this.capacityValue; i += 1) {
      slots[i] = this.buffer[i];
    }
    return slots;
  }

  public clear(): void {
    this.capacityValue = 8;
    this.buffer = new Array<TaskItem | null>(8);
    for (let i = 0; i < 8; i += 1) {
      this.buffer[i] = null;
    }
    this.frontIdx = 0;
    this.rearIdx = 0;
    this.count = 0;
  }
}
