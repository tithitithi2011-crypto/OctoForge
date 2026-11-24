export interface TrieNode {
  char: string;
  children: Record<string, TrieNode>;
  isEndOfWord: boolean;
  frequency: number;
  nodeId: string;
}

export interface TrieSuggestion {
  word: string;
  frequency: number;
}

export interface TrieNodeInspection {
  nodeId: string;
  char: string;
  prefix: string;
  isEndOfWord: boolean;
  frequency: number;
  childKeys: string[];
  depth: number;
}

export const SEED_DICTIONARY_WORDS: string[] = [
  'algorithm',
  'array',
  'balance',
  'binary',
  'bucket',
  'capacity',
  'complexity',
  'data',
  'deadline',
  'delete',
  'dequeue',
  'doubly',
  'dynamic',
  'editor',
  'enqueue',
  'frequency',
  'hash',
  'heap',
  'heapify',
  'inorder',
  'insert',
  'linked',
  'list',
  'node',
  'pointer',
  'prefix',
  'priority',
  'queue',
  'redo',
  'resize',
  'scheduler',
  'search',
  'stack',
  'structure',
  'task',
  'traversal',
  'tree',
  'trie',
  'underflow',
  'undo',
  'update',
  'workbench',
];

export class AutocompleteTrie {
  public root: TrieNode;
  private totalWords = 0;
  private totalNodes = 1;
  private nodeCounter = 1;

  constructor() {
    this.root = this.createNode('');
  }

  private createNode(char: string): TrieNode {
    const nodeId = `t-${this.nodeCounter}`;
    this.nodeCounter += 1;
    return {
      char,
      children: {},
      isEndOfWord: false,
      frequency: 0,
      nodeId,
    };
  }

  private normalizeWord(raw: string): string {
    let cleaned = '';
    for (let i = 0; i < raw.length; i += 1) {
      const code = raw.charCodeAt(i);
      const isUpper = code >= 65 && code <= 90;
      const isLower = code >= 97 && code <= 122;
      const isDigit = code >= 48 && code <= 57;
      if (isUpper) {
        cleaned += String.fromCharCode(code + 32);
      } else if (isLower || isDigit) {
        cleaned += raw[i];
      }
    }
    return cleaned;
  }

  public insert(rawWord: string, weight = 1): boolean {
    const word = this.normalizeWord(rawWord);
    if (word.length === 0) {
      return false;
    }

    let curr = this.root;
    for (let i = 0; i < word.length; i += 1) {
      const ch = word[i];
      if (curr.children[ch] === undefined) {
        curr.children[ch] = this.createNode(ch);
        this.totalNodes += 1;
      }
      curr = curr.children[ch];
    }

    if (!curr.isEndOfWord) {
      curr.isEndOfWord = true;
      this.totalWords += 1;
    }
    curr.frequency += weight;
    return true;
  }

  public search(rawWord: string): boolean {
    const word = this.normalizeWord(rawWord);
    if (word.length === 0) {
      return false;
    }
    let curr = this.root;
    for (let i = 0; i < word.length; i += 1) {
      const next = curr.children[word[i]];
      if (next === undefined) {
        return false;
      }
      curr = next;
    }
    return curr.isEndOfWord;
  }

  public startsWith(rawPrefix: string): TrieNode | null {
    const prefix = this.normalizeWord(rawPrefix);
    if (prefix.length === 0) {
      return null;
    }
    let curr = this.root;
    for (let i = 0; i < prefix.length; i += 1) {
      const next = curr.children[prefix[i]];
      if (next === undefined) {
        return null;
      }
      curr = next;
    }
    return curr;
  }

  private collectWordsDFS(node: TrieNode, currentPrefix: string, results: TrieSuggestion[]): void {
    if (node.isEndOfWord) {
      results[results.length] = {
        word: currentPrefix,
        frequency: node.frequency,
      };
    }

    const keys: string[] = [];
    for (const k in node.children) {
      if (Object.prototype.hasOwnProperty.call(node.children, k)) {
        keys[keys.length] = k;
      }
    }

    // Manual insertion sort of child keys alphabetically
    for (let i = 1; i < keys.length; i += 1) {
      const key = keys[i];
      let j = i - 1;
      while (j >= 0 && keys[j] > key) {
        keys[j + 1] = keys[j];
        j -= 1;
      }
      keys[j + 1] = key;
    }

    for (let i = 0; i < keys.length; i += 1) {
      const childChar = keys[i];
      this.collectWordsDFS(node.children[childChar], currentPrefix + childChar, results);
    }
  }

  public getSuggestions(rawPrefix: string, limit = 6): TrieSuggestion[] {
    const prefix = this.normalizeWord(rawPrefix);
    if (prefix.length === 0) {
      return [];
    }

    const prefixNode = this.startsWith(prefix);
    if (prefixNode === null) {
      return [];
    }

    const collected: TrieSuggestion[] = [];
    this.collectWordsDFS(prefixNode, prefix, collected);

    // Manual insertion sort: highest frequency first, then alphabetical
    for (let i = 1; i < collected.length; i += 1) {
      const current = collected[i];
      let j = i - 1;
      while (
        j >= 0 &&
        (collected[j].frequency < current.frequency ||
          (collected[j].frequency === current.frequency && collected[j].word > current.word))
      ) {
        collected[j + 1] = collected[j];
        j -= 1;
      }
      collected[j + 1] = current;
    }

    const capped: TrieSuggestion[] = [];
    const maxLen = collected.length < limit ? collected.length : limit;
    for (let i = 0; i < maxLen; i += 1) {
      capped[i] = collected[i];
    }
    return capped;
  }

  public clear(): void {
    this.nodeCounter = 1;
    this.root = this.createNode('');
    this.totalWords = 0;
    this.totalNodes = 1;
  }

  public rebuildFromLines(lines: string[], includeSeedWords = true): void {
    this.clear();
    if (includeSeedWords) {
      for (let i = 0; i < SEED_DICTIONARY_WORDS.length; i += 1) {
        this.insert(SEED_DICTIONARY_WORDS[i], 1);
      }
    }
    for (let l = 0; l < lines.length; l += 1) {
      const line = lines[l];
      let token = '';
      for (let c = 0; c < line.length; c += 1) {
        const code = line.charCodeAt(c);
        const isAlphaNum =
          (code >= 65 && code <= 90) ||
          (code >= 97 && code <= 122) ||
          (code >= 48 && code <= 57);
        if (isAlphaNum) {
          token += line[c];
        } else if (token.length > 0) {
          this.insert(token, 2);
          token = '';
        }
      }
      if (token.length > 0) {
        this.insert(token, 2);
      }
    }
  }

  public getStats(): { totalWords: number; totalNodes: number } {
    return {
      totalWords: this.totalWords,
      totalNodes: this.totalNodes,
    };
  }

  // BFS/DFS level inspection for visualizer up to maxNodes
  public inspectPrefixBranch(rawPrefix: string, maxNodes = 40): TrieNodeInspection[] {
    const prefix = this.normalizeWord(rawPrefix);
    const startNode = prefix.length > 0 ? this.startsWith(prefix) : this.root;
    if (startNode === null) {
      return [];
    }

    const result: TrieNodeInspection[] = [];
    const traverse = (node: TrieNode, currPrefix: string, depth: number): void => {
      if (result.length >= maxNodes) {
        return;
      }
      const childKeys: string[] = [];
      for (const k in node.children) {
        if (Object.prototype.hasOwnProperty.call(node.children, k)) {
          childKeys[childKeys.length] = k;
        }
      }
      // Manual insertion sort of child keys
      for (let i = 1; i < childKeys.length; i += 1) {
        const key = childKeys[i];
        let j = i - 1;
        while (j >= 0 && childKeys[j] > key) {
          childKeys[j + 1] = childKeys[j];
          j -= 1;
        }
        childKeys[j + 1] = key;
      }

      result[result.length] = {
        nodeId: node.nodeId,
        char: node.char === '' ? 'ROOT' : node.char,
        prefix: currPrefix === '' ? 'ε' : currPrefix,
        isEndOfWord: node.isEndOfWord,
        frequency: node.frequency,
        childKeys,
        depth,
      };

      for (let i = 0; i < childKeys.length; i += 1) {
        const ck = childKeys[i];
        traverse(node.children[ck], currPrefix + ck, depth + 1);
      }
    };

    traverse(startNode, prefix, 0);
    return result;
  }
}
