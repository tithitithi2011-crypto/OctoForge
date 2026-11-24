import { EditorCommand } from './types';

interface StackNode<T> {
  value: T;
  below: StackNode<T> | null;
}

export interface StackPopResult<T> {
  ok: boolean;
  value?: T;
  error?: 'STACK_UNDERFLOW';
}

export class ManualStack<T> {
  private topNode: StackNode<T> | null = null;
  private count = 0;

  public push(item: T): number {
    const newNode: StackNode<T> = {
      value: item,
      below: this.topNode,
    };
    this.topNode = newNode;
    this.count += 1;
    return this.count;
  }

  public pop(): StackPopResult<T> {
    if (this.topNode === null) {
      return { ok: false, error: 'STACK_UNDERFLOW' };
    }
    const poppedValue = this.topNode.value;
    const nextTop = this.topNode.below;
    this.topNode.below = null;
    this.topNode = nextTop;
    this.count -= 1;
    return { ok: true, value: poppedValue };
  }

  public peek(): T | null {
    return this.topNode !== null ? this.topNode.value : null;
  }

  public isEmpty(): boolean {
    return this.count === 0;
  }

  public size(): number {
    return this.count;
  }

  public clear(): void {
    let curr = this.topNode;
    while (curr !== null) {
      const next = curr.below;
      curr.below = null;
      curr = next;
    }
    this.topNode = null;
    this.count = 0;
  }

  // Returns frames from TOP (index 0) to BOTTOM
  public getFrames(): T[] {
    const frames: T[] = [];
    let curr = this.topNode;
    while (curr !== null) {
      frames[frames.length] = curr.value;
      curr = curr.below;
    }
    return frames;
  }
}

export class UndoStack extends ManualStack<EditorCommand> {}
export class RedoStack extends ManualStack<EditorCommand> {}
