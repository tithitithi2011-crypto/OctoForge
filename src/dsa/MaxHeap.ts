import { PriorityLevel, TaskItem } from './types';

export interface HeapExtractResult {
  ok: boolean;
  value?: TaskItem;
  error?: 'HEAP_UNDERFLOW';
}

export function computeTaskHeapScore(priority: PriorityLevel, deadlineTimestamp: number): number {
  const tierWeight =
    priority === PriorityLevel.HIGH
      ? 3_000_000_000
      : priority === PriorityLevel.MEDIUM
      ? 2_000_000_000
      : 1_000_000_000;

  // Earlier deadline gets slightly higher urgency tie-breaker within same priority tier
  const normalizedTime = Math.floor(deadlineTimestamp / 60000);
  const urgencyBonus = Math.max(0, 999_999_999 - (normalizedTime % 999_999_999));
  return tierWeight + urgencyBonus;
}

export class TaskMaxHeap {
  private heap: TaskItem[] = [];

  public get size(): number {
    return this.heap.length;
  }

  public isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private parentIndex(i: number): number {
    return Math.floor((i - 1) / 2);
  }

  private leftIndex(i: number): number {
    return 2 * i + 1;
  }

  private rightIndex(i: number): number {
    return 2 * i + 2;
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  private isHigherPriority(a: TaskItem, b: TaskItem): boolean {
    if (a.heapScore !== b.heapScore) {
      return a.heapScore > b.heapScore;
    }
    return a.createdAt < b.createdAt;
  }

  // Restore max-heap property upward from child index
  private bubbleUp(startIdx: number): void {
    let idx = startIdx;
    while (idx > 0) {
      const pIdx = this.parentIndex(idx);
      if (this.isHigherPriority(this.heap[idx], this.heap[pIdx])) {
        this.swap(idx, pIdx);
        idx = pIdx;
      } else {
        break;
      }
    }
  }

  // Restore max-heap property downward from parent index
  private sinkDown(startIdx: number): void {
    let idx = startIdx;
    const n = this.heap.length;

    while (true) {
      const left = this.leftIndex(idx);
      const right = this.rightIndex(idx);
      let largest = idx;

      if (left < n && this.isHigherPriority(this.heap[left], this.heap[largest])) {
        largest = left;
      }
      if (right < n && this.isHigherPriority(this.heap[right], this.heap[largest])) {
        largest = right;
      }

      if (largest !== idx) {
        this.swap(idx, largest);
        idx = largest;
      } else {
        break;
      }
    }
  }

  public insert(task: TaskItem): void {
    this.heap[this.heap.length] = task;
    this.bubbleUp(this.heap.length - 1);
  }

  public peekMax(): TaskItem | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  public extractMax(): HeapExtractResult {
    if (this.heap.length === 0) {
      return { ok: false, error: 'HEAP_UNDERFLOW' };
    }
    const maxItem = this.heap[0];
    const lastIdx = this.heap.length - 1;
    if (lastIdx === 0) {
      this.heap.length = 0;
      return { ok: true, value: maxItem };
    }

    this.heap[0] = this.heap[lastIdx];
    this.heap.length = lastIdx;
    this.sinkDown(0);
    return { ok: true, value: maxItem };
  }

  public removeById(taskId: string): boolean {
    let targetIdx = -1;
    for (let i = 0; i < this.heap.length; i += 1) {
      if (this.heap[i].id === taskId) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx === -1) {
      return false;
    }

    const lastIdx = this.heap.length - 1;
    if (targetIdx === lastIdx) {
      this.heap.length = lastIdx;
      return true;
    }

    this.heap[targetIdx] = this.heap[lastIdx];
    this.heap.length = lastIdx;
    this.bubbleUp(targetIdx);
    this.sinkDown(targetIdx);
    return true;
  }

  public getHeapArray(): TaskItem[] {
    const copy: TaskItem[] = [];
    for (let i = 0; i < this.heap.length; i += 1) {
      copy[i] = this.heap[i];
    }
    return copy;
  }

  // Produces priority-ordered view by cloning heap and repeatedly extracting max (no Array.sort)
  public toPriorityOrderedArray(): TaskItem[] {
    const tempHeap = new TaskMaxHeap();
    for (let i = 0; i < this.heap.length; i += 1) {
      tempHeap.insert(this.heap[i]);
    }
    const ordered: TaskItem[] = [];
    while (!tempHeap.isEmpty()) {
      const res = tempHeap.extractMax();
      if (res.ok && res.value) {
        ordered[ordered.length] = res.value;
      }
    }
    return ordered;
  }

  public clear(): void {
    this.heap.length = 0;
  }
}
