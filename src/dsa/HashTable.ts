export interface HashEntry {
  key: string;
  count: number;
  lineNumbers: number[];
  next: HashEntry | null;
}

export interface HashLookupResult {
  found: boolean;
  key: string;
  count: number;
  lineNumbers: number[];
  bucketIndex: number;
  probeSteps: number;
}

export interface HashBucketSnapshot {
  index: number;
  chain: { key: string; count: number; lineNumbers: number[] }[];
}

export interface WordFrequencyEntry {
  word: string;
  count: number;
  lineNumbers: number[];
  bucketIndex: number;
}

export class WordFrequencyHashTable {
  public readonly bucketCount: number;
  private buckets: (HashEntry | null)[];
  private uniqueKeyCount = 0;
  private totalWordOccurrences = 0;

  constructor(bucketCount = 16) {
    this.bucketCount = bucketCount;
    this.buckets = new Array<HashEntry | null>(bucketCount);
    for (let i = 0; i < bucketCount; i += 1) {
      this.buckets[i] = null;
    }
  }

  public normalizeKey(raw: string): string {
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

  // Polynomial rolling hash (base 31 mod bucketCount)
  public hash(key: string): number {
    let hashVal = 0;
    const prime = 31;
    for (let i = 0; i < key.length; i += 1) {
      hashVal = (hashVal * prime + key.charCodeAt(i)) % this.bucketCount;
    }
    return hashVal;
  }

  private addLineNumberUnique(arr: number[], lineNumber: number): void {
    for (let i = 0; i < arr.length; i += 1) {
      if (arr[i] === lineNumber) {
        return;
      }
    }
    arr[arr.length] = lineNumber;
  }

  public put(rawWord: string, lineNumber: number): void {
    const key = this.normalizeKey(rawWord);
    if (key.length === 0) {
      return;
    }

    const idx = this.hash(key);
    let curr = this.buckets[idx];

    while (curr !== null) {
      if (curr.key === key) {
        curr.count += 1;
        this.addLineNumberUnique(curr.lineNumbers, lineNumber);
        this.totalWordOccurrences += 1;
        return;
      }
      curr = curr.next;
    }

    const newEntry: HashEntry = {
      key,
      count: 1,
      lineNumbers: [lineNumber],
      next: this.buckets[idx],
    };
    this.buckets[idx] = newEntry;
    this.uniqueKeyCount += 1;
    this.totalWordOccurrences += 1;
  }

  public get(rawWord: string): HashLookupResult {
    const key = this.normalizeKey(rawWord);
    if (key.length === 0) {
      return {
        found: false,
        key: '',
        count: 0,
        lineNumbers: [],
        bucketIndex: -1,
        probeSteps: 0,
      };
    }

    const idx = this.hash(key);
    let curr = this.buckets[idx];
    let steps = 0;

    while (curr !== null) {
      steps += 1;
      if (curr.key === key) {
        return {
          found: true,
          key,
          count: curr.count,
          lineNumbers: [...curr.lineNumbers],
          bucketIndex: idx,
          probeSteps: steps,
        };
      }
      curr = curr.next;
    }

    return {
      found: false,
      key,
      count: 0,
      lineNumbers: [],
      bucketIndex: idx,
      probeSteps: steps,
    };
  }

  public clear(): void {
    for (let i = 0; i < this.bucketCount; i += 1) {
      this.buckets[i] = null;
    }
    this.uniqueKeyCount = 0;
    this.totalWordOccurrences = 0;
  }

  public rebuildFromLines(lines: string[]): void {
    this.clear();
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
      const line = lines[lineIdx];
      const lineNumber = lineIdx + 1;
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
          this.put(token, lineNumber);
          token = '';
        }
      }
      if (token.length > 0) {
        this.put(token, lineNumber);
      }
    }
  }

  public getBucketsSnapshot(): HashBucketSnapshot[] {
    const result: HashBucketSnapshot[] = [];
    for (let i = 0; i < this.bucketCount; i += 1) {
      const chain: { key: string; count: number; lineNumbers: number[] }[] = [];
      let curr = this.buckets[i];
      while (curr !== null) {
        chain[chain.length] = {
          key: curr.key,
          count: curr.count,
          lineNumbers: [...curr.lineNumbers],
        };
        curr = curr.next;
      }
      result[i] = { index: i, chain };
    }
    return result;
  }

  public getTopWords(limit = 8): WordFrequencyEntry[] {
    const all: WordFrequencyEntry[] = [];
    for (let i = 0; i < this.bucketCount; i += 1) {
      let curr = this.buckets[i];
      while (curr !== null) {
        all[all.length] = {
          word: curr.key,
          count: curr.count,
          lineNumbers: [...curr.lineNumbers],
          bucketIndex: i,
        };
        curr = curr.next;
      }
    }

    // Manual insertion sort descending by count, then alphabetical
    for (let i = 1; i < all.length; i += 1) {
      const current = all[i];
      let j = i - 1;
      while (
        j >= 0 &&
        (all[j].count < current.count ||
          (all[j].count === current.count && all[j].word > current.word))
      ) {
        all[j + 1] = all[j];
        j -= 1;
      }
      all[j + 1] = current;
    }

    const capped: WordFrequencyEntry[] = [];
    const maxLen = all.length < limit ? all.length : limit;
    for (let i = 0; i < maxLen; i += 1) {
      capped[i] = all[i];
    }
    return capped;
  }

  public getStats(): {
    uniqueKeys: number;
    totalOccurrences: number;
    loadFactor: number;
    collisions: number;
  } {
    let collisions = 0;
    for (let i = 0; i < this.bucketCount; i += 1) {
      let chainLen = 0;
      let curr = this.buckets[i];
      while (curr !== null) {
        chainLen += 1;
        curr = curr.next;
      }
      if (chainLen > 1) {
        collisions += chainLen - 1;
      }
    }
    return {
      uniqueKeys: this.uniqueKeyCount,
      totalOccurrences: this.totalWordOccurrences,
      loadFactor: Number((this.uniqueKeyCount / this.bucketCount).toFixed(2)),
      collisions,
    };
  }
}

// Helper: case-insensitive whole-word replacement without regex pitfalls
export function replaceWholeWordInLine(
  line: string,
  targetWord: string,
  replacement: string
): { updatedLine: string; replacements: number } {
  const lowerTarget = targetWord.toLowerCase();
  if (lowerTarget.length === 0) {
    return { updatedLine: line, replacements: 0 };
  }

  let output = '';
  let token = '';
  let replacements = 0;

  const isAlphaNum = (code: number): boolean =>
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    (code >= 48 && code <= 57);

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (isAlphaNum(line.charCodeAt(i))) {
      token += ch;
    } else {
      if (token.length > 0) {
        if (token.toLowerCase() === lowerTarget) {
          output += replacement;
          replacements += 1;
        } else {
          output += token;
        }
        token = '';
      }
      output += ch;
    }
  }

  if (token.length > 0) {
    if (token.toLowerCase() === lowerTarget) {
      output += replacement;
      replacements += 1;
    } else {
      output += token;
    }
  }

  return { updatedLine: output, replacements };
}
