import { TaskItem, TaskStatus } from './types';

export interface BSTNode {
  task: TaskItem;
  left: BSTNode | null;
  right: BSTNode | null;
}

export interface BSTSearchResult {
  found: boolean;
  matches: TaskItem[];
  comparisons: number;
  visitedIds: string[];
}

export interface BSTVisualNode {
  id: string;
  task: TaskItem;
  x: number;
  y: number;
  leftId: string | null;
  rightId: string | null;
}

export class TaskDeadlineBST {
  public root: BSTNode | null = null;
  private nodeCount = 0;

  public get size(): number {
    return this.nodeCount;
  }

  public isEmpty(): boolean {
    return this.root === null;
  }

  private compareKeys(a: TaskItem, b: TaskItem): number {
    if (a.deadlineTimestamp < b.deadlineTimestamp) {
      return -1;
    }
    if (a.deadlineTimestamp > b.deadlineTimestamp) {
      return 1;
    }
    if (a.id < b.id) {
      return -1;
    }
    if (a.id > b.id) {
      return 1;
    }
    return 0;
  }

  public insert(task: TaskItem): void {
    const newNode: BSTNode = { task, left: null, right: null };
    if (this.root === null) {
      this.root = newNode;
      this.nodeCount += 1;
      return;
    }

    let curr: BSTNode | null = this.root;
    while (curr !== null) {
      const cmp = this.compareKeys(task, curr.task);
      if (cmp < 0) {
        if (curr.left === null) {
          curr.left = newNode;
          this.nodeCount += 1;
          return;
        }
        curr = curr.left;
      } else {
        if (curr.right === null) {
          curr.right = newNode;
          this.nodeCount += 1;
          return;
        }
        curr = curr.right;
      }
    }
  }

  public updateTaskStatus(taskId: string, deadlineTimestamp: number, status: TaskStatus): boolean {
    let curr = this.root;
    while (curr !== null) {
      if (curr.task.id === taskId) {
        curr.task = { ...curr.task, status };
        return true;
      }
      if (deadlineTimestamp < curr.task.deadlineTimestamp) {
        curr = curr.left;
      } else if (deadlineTimestamp > curr.task.deadlineTimestamp) {
        curr = curr.right;
      } else {
        // Equal timestamp: search both subtrees if id differed
        if (taskId < curr.task.id) {
          curr = curr.left;
        } else {
          curr = curr.right;
        }
      }
    }
    return false;
  }

  private findMinNode(node: BSTNode): BSTNode {
    let curr = node;
    while (curr.left !== null) {
      curr = curr.left;
    }
    return curr;
  }

  public delete(taskId: string, deadlineTimestamp: number): boolean {
    let deleted = false;

    const deleteRec = (node: BSTNode | null, targetId: string, targetTs: number): BSTNode | null => {
      if (node === null) {
        return null;
      }

      if (targetTs < node.task.deadlineTimestamp || (targetTs === node.task.deadlineTimestamp && targetId < node.task.id)) {
        node.left = deleteRec(node.left, targetId, targetTs);
        return node;
      }

      if (targetTs > node.task.deadlineTimestamp || (targetTs === node.task.deadlineTimestamp && targetId > node.task.id)) {
        node.right = deleteRec(node.right, targetId, targetTs);
        return node;
      }

      // Found matching node
      deleted = true;
      if (node.left === null && node.right === null) {
        return null;
      }
      if (node.left === null) {
        return node.right;
      }
      if (node.right === null) {
        return node.left;
      }

      // Two children: replace with in-order successor (minimum in right subtree)
      const successor = this.findMinNode(node.right);
      node.task = successor.task;
      node.right = deleteRec(node.right, successor.task.id, successor.task.deadlineTimestamp);
      return node;
    };

    this.root = deleteRec(this.root, taskId, deadlineTimestamp);
    if (deleted) {
      this.nodeCount -= 1;
    }
    return deleted;
  }

  // Range search by calendar date (YYYY-MM-DD) exploiting BST ordering to prune branches
  public searchByDate(datePrefix: string): BSTSearchResult {
    const startTs = new Date(`${datePrefix}T00:00:00`).getTime();
    const endTs = new Date(`${datePrefix}T23:59:59.999`).getTime();

    if (Number.isNaN(startTs) || Number.isNaN(endTs)) {
      return { found: false, matches: [], comparisons: 0, visitedIds: [] };
    }

    const matches: TaskItem[] = [];
    const visitedIds: string[] = [];
    let comparisons = 0;

    const rangeTraverse = (node: BSTNode | null): void => {
      if (node === null) {
        return;
      }
      visitedIds[visitedIds.length] = node.task.id;
      comparisons += 1;

      if (node.task.deadlineTimestamp > startTs) {
        rangeTraverse(node.left);
      }

      if (node.task.deadlineTimestamp >= startTs && node.task.deadlineTimestamp <= endTs) {
        matches[matches.length] = node.task;
      }

      if (node.task.deadlineTimestamp < endTs) {
        rangeTraverse(node.right);
      }
    };

    rangeTraverse(this.root);
    return {
      found: matches.length > 0,
      matches,
      comparisons,
      visitedIds,
    };
  }

  public inOrderTraversal(): TaskItem[] {
    const ordered: TaskItem[] = [];
    const walk = (node: BSTNode | null): void => {
      if (node === null) {
        return;
      }
      walk(node.left);
      ordered[ordered.length] = node.task;
      walk(node.right);
    };
    walk(this.root);
    return ordered;
  }

  public getTreeLayout(): BSTVisualNode[] {
    if (this.root === null) {
      return [];
    }
    const nodes: BSTVisualNode[] = [];
    let inOrderCounter = 0;

    const assignCoords = (node: BSTNode | null, depth: number): void => {
      if (node === null) {
        return;
      }
      assignCoords(node.left, depth + 1);
      const xSlot = inOrderCounter;
      inOrderCounter += 1;
      nodes[nodes.length] = {
        id: node.task.id,
        task: node.task,
        x: xSlot,
        y: depth,
        leftId: node.left !== null ? node.left.task.id : null,
        rightId: node.right !== null ? node.right.task.id : null,
      };
      assignCoords(node.right, depth + 1);
    };

    assignCoords(this.root, 0);
    return nodes;
  }

  public clear(): void {
    this.root = null;
    this.nodeCount = 0;
  }
}
