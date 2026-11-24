import { TaskItem, TaskStatus } from './types';

export interface DynamicArrayPushResult {
  index: number;
  resized: boolean;
  oldCapacity: number;
  newCapacity: number;
}

export interface DynamicArrayRemoveResult {
  removed: TaskItem | null;
  shrunk: boolean;
  oldCapacity: number;
  newCapacity: number;
}

export class TaskDynamicArray {
  private buffer: (TaskItem | null)[];
  private count = 0;
  private capacityValue: number;
  private resizeHistory: string[] = [];

  constructor(initialCapacity = 4) {
    this.capacityValue = initialCapacity;
    this.buffer = new Array<TaskItem | null>(initialCapacity);
    for (let i = 0; i < initialCapacity; i += 1) {
      this.buffer[i] = null;
    }
  }

  public get length(): number {
    return this.count;
  }

  public get capacity(): number {
    return this.capacityValue;
  }

  public isEmpty(): boolean {
    return this.count === 0;
  }

  private resize(newCapacity: number): void {
    const nextBuffer = new Array<TaskItem | null>(newCapacity);
    for (let i = 0; i < newCapacity; i += 1) {
      nextBuffer[i] = i < this.count ? this.buffer[i] : null;
    }
    this.resizeHistory[this.resizeHistory.length] = `${this.capacityValue} → ${newCapacity}`;
    this.buffer = nextBuffer;
    this.capacityValue = newCapacity;
  }

  public push(task: TaskItem): DynamicArrayPushResult {
    const oldCapacity = this.capacityValue;
    let resized = false;

    if (this.count === this.capacityValue) {
      this.resize(this.capacityValue * 2);
      resized = true;
    }

    const insertIdx = this.count;
    this.buffer[insertIdx] = task;
    this.count += 1;

    return {
      index: insertIdx,
      resized,
      oldCapacity,
      newCapacity: this.capacityValue,
    };
  }

  public get(index: number): TaskItem | null {
    if (index < 0 || index >= this.count) {
      return null;
    }
    return this.buffer[index];
  }

  public findIndexById(id: string): number {
    for (let i = 0; i < this.count; i += 1) {
      const item = this.buffer[i];
      if (item !== null && item.id === id) {
        return i;
      }
    }
    return -1;
  }

  public findById(id: string): TaskItem | null {
    const idx = this.findIndexById(id);
    if (idx === -1) return null;
    return this.buffer[idx];
  }

  public updateStatus(id: string, status: TaskStatus): TaskItem | null {
    const idx = this.findIndexById(id);
    if (idx === -1) {
      return null;
    }
    const existing = this.buffer[idx];
    if (existing === null) {
      return null;
    }
    const updated: TaskItem = { ...existing, status };
    this.buffer[idx] = updated;
    return updated;
  }

  public removeById(id: string): DynamicArrayRemoveResult {
    const idx = this.findIndexById(id);
    if (idx === -1) {
      return {
        removed: null,
        shrunk: false,
        oldCapacity: this.capacityValue,
        newCapacity: this.capacityValue,
      };
    }

    const removed = this.buffer[idx];
    // Manual left-shift from idx + 1 to count - 1
    for (let i = idx; i < this.count - 1; i += 1) {
      this.buffer[i] = this.buffer[i + 1];
    }
    this.count -= 1;
    this.buffer[this.count] = null;

    const oldCapacity = this.capacityValue;
    let shrunk = false;
    if (this.capacityValue > 4 && this.count > 0 && this.count <= Math.floor(this.capacityValue / 4)) {
      this.resize(Math.max(4, Math.floor(this.capacityValue / 2)));
      shrunk = true;
    }

    return {
      removed,
      shrunk,
      oldCapacity,
      newCapacity: this.capacityValue,
    };
  }

  public toArray(): TaskItem[] {
    const out: TaskItem[] = [];
    for (let i = 0; i < this.count; i += 1) {
      const item = this.buffer[i];
      if (item !== null) {
        out[out.length] = item;
      }
    }
    return out;
  }

  public getRawSlots(): (TaskItem | null)[] {
    const slots: (TaskItem | null)[] = [];
    for (let i = 0; i < this.capacityValue; i += 1) {
      slots[i] = this.buffer[i];
    }
    return slots;
  }

  public getResizeHistory(): string[] {
    return [...this.resizeHistory];
  }

  public clear(): void {
    this.capacityValue = 4;
    this.buffer = new Array<TaskItem | null>(4);
    for (let i = 0; i < 4; i += 1) {
      this.buffer[i] = null;
    }
    this.count = 0;
    this.resizeHistory = [];
  }
}
