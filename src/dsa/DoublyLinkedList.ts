export interface LineNode {
  id: string;
  prev: LineNode | null;
  lineText: string;
  lineNumber: number;
  next: LineNode | null;
}

export interface DLLNodeSnapshot {
  id: string;
  lineNumber: number;
  lineText: string;
  prevLineNumber: number | null;
  nextLineNumber: number | null;
}

export class DocumentLinkedList {
  public head: LineNode | null = null;
  public tail: LineNode | null = null;
  public length = 0;
  private nextIdCounter = 1;

  private createNode(lineText: string, lineNumber: number): LineNode {
    const id = `node-${this.nextIdCounter}`;
    this.nextIdCounter += 1;
    return {
      id,
      prev: null,
      lineText,
      lineNumber,
      next: null,
    };
  }

  private renumberFrom(startNode: LineNode | null, startNumber: number): void {
    let curr = startNode;
    let num = startNumber;
    while (curr !== null) {
      curr.lineNumber = num;
      num += 1;
      curr = curr.next;
    }
  }

  public isEmpty(): boolean {
    return this.length === 0;
  }

  public getNodeAt(lineNumber: number): LineNode | null {
    if (lineNumber < 1 || lineNumber > this.length) {
      return null;
    }
    // Bidirectional traversal optimization: start from head or tail
    if (lineNumber <= Math.floor(this.length / 2)) {
      let curr = this.head;
      while (curr !== null) {
        if (curr.lineNumber === lineNumber) {
          return curr;
        }
        curr = curr.next;
      }
    } else {
      let curr = this.tail;
      while (curr !== null) {
        if (curr.lineNumber === lineNumber) {
          return curr;
        }
        curr = curr.prev;
      }
    }
    return null;
  }

  public insertAtEnd(lineText: string): LineNode {
    const newNode = this.createNode(lineText, this.length + 1);
    if (this.tail === null) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      newNode.prev = this.tail;
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.length += 1;
    return newNode;
  }

  public insertAt(lineNumber: number, lineText: string): LineNode {
    if (lineNumber <= 1 || this.head === null) {
      const newNode = this.createNode(lineText, 1);
      if (this.head === null) {
        this.head = newNode;
        this.tail = newNode;
      } else {
        newNode.next = this.head;
        this.head.prev = newNode;
        this.head = newNode;
      }
      this.length += 1;
      this.renumberFrom(this.head, 1);
      return newNode;
    }

    if (lineNumber > this.length) {
      return this.insertAtEnd(lineText);
    }

    const target = this.getNodeAt(lineNumber);
    if (target === null) {
      return this.insertAtEnd(lineText);
    }

    const newNode = this.createNode(lineText, lineNumber);
    const prevNode = target.prev;

    newNode.prev = prevNode;
    newNode.next = target;
    target.prev = newNode;
    if (prevNode !== null) {
      prevNode.next = newNode;
    } else {
      this.head = newNode;
    }

    this.length += 1;
    this.renumberFrom(newNode, lineNumber);
    return newNode;
  }

  public updateLine(lineNumber: number, newText: string): { ok: boolean; prevText?: string } {
    const node = this.getNodeAt(lineNumber);
    if (node === null) {
      return { ok: false };
    }
    const prevText = node.lineText;
    node.lineText = newText;
    return { ok: true, prevText };
  }

  public deleteLine(lineNumber: number): { ok: boolean; deletedText?: string; nextFocusLine: number } {
    if (this.length === 0) {
      return { ok: false, nextFocusLine: 0 };
    }
    const target = this.getNodeAt(lineNumber);
    if (target === null) {
      return { ok: false, nextFocusLine: 1 };
    }

    const deletedText = target.lineText;
    const prevNode = target.prev;
    const nextNode = target.next;

    if (prevNode !== null) {
      prevNode.next = nextNode;
    } else {
      this.head = nextNode;
    }

    if (nextNode !== null) {
      nextNode.prev = prevNode;
    } else {
      this.tail = prevNode;
    }

    target.prev = null;
    target.next = null;
    this.length -= 1;

    if (nextNode !== null) {
      this.renumberFrom(nextNode, lineNumber);
    }

    const nextFocusLine = this.length === 0 ? 0 : lineNumber > this.length ? this.length : lineNumber;
    return { ok: true, deletedText, nextFocusLine };
  }

  public movePrev(currentLineNumber: number): LineNode | null {
    const curr = this.getNodeAt(currentLineNumber);
    if (curr === null || curr.prev === null) {
      return null;
    }
    return curr.prev;
  }

  public moveNext(currentLineNumber: number): LineNode | null {
    const curr = this.getNodeAt(currentLineNumber);
    if (curr === null || curr.next === null) {
      return null;
    }
    return curr.next;
  }

  /**
   * Manually swaps a node with its predecessor by rewiring prev/next pointers.
   */
  public swapWithPrev(lineNumber: number): { ok: boolean; newLineNumber: number } {
    const node = this.getNodeAt(lineNumber);
    if (node === null || node.prev === null) {
      return { ok: false, newLineNumber: lineNumber };
    }

    const prevNode = node.prev;
    const beforePrev = prevNode.prev;
    const afterNode = node.next;

    // Rewire outer neighbors
    if (beforePrev !== null) {
      beforePrev.next = node;
    } else {
      this.head = node;
    }

    if (afterNode !== null) {
      afterNode.prev = prevNode;
    } else {
      this.tail = prevNode;
    }

    // Rewire node and prevNode pointers
    node.prev = beforePrev;
    node.next = prevNode;
    prevNode.prev = node;
    prevNode.next = afterNode;

    this.renumberFrom(node, lineNumber - 1);
    return { ok: true, newLineNumber: node.lineNumber };
  }

  /**
   * Manually swaps a node with its successor by rewiring prev/next pointers.
   */
  public swapWithNext(lineNumber: number): { ok: boolean; newLineNumber: number } {
    const node = this.getNodeAt(lineNumber);
    if (node === null || node.next === null) {
      return { ok: false, newLineNumber: lineNumber };
    }
    const res = this.swapWithPrev(node.next.lineNumber);
    return { ok: res.ok, newLineNumber: node.lineNumber };
  }

  public replaceLinesFromArray(lines: string[]): void {
    this.clear();
    for (let i = 0; i < lines.length; i += 1) {
      this.insertAtEnd(lines[i]);
    }
  }

  public clear(): void {
    let curr = this.head;
    while (curr !== null) {
      const next = curr.next;
      curr.prev = null;
      curr.next = null;
      curr = next;
    }
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  public toTextArray(): string[] {
    const result: string[] = [];
    let curr = this.head;
    while (curr !== null) {
      result[result.length] = curr.lineText;
      curr = curr.next;
    }
    return result;
  }

  public getSnapshot(): DLLNodeSnapshot[] {
    const nodes: DLLNodeSnapshot[] = [];
    let curr = this.head;
    while (curr !== null) {
      nodes[nodes.length] = {
        id: curr.id,
        lineNumber: curr.lineNumber,
        lineText: curr.lineText,
        prevLineNumber: curr.prev !== null ? curr.prev.lineNumber : null,
        nextLineNumber: curr.next !== null ? curr.next.lineNumber : null,
      };
      curr = curr.next;
    }
    return nodes;
  }
}
