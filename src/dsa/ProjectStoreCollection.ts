export type ProjectLanguage = 'C++' | 'C' | 'Python' | 'Java';

export const ALL_PROJECT_LANGUAGES: ProjectLanguage[] = ['C++', 'C', 'Python', 'Java'];

export type DownloadExtension = 'txt' | 'cpp' | 'c' | 'py' | 'java';

export interface LanguageDetectionResult {
  languages: ProjectLanguage[];
  matchedSignals: Record<ProjectLanguage, string[]>;
}

export interface ProjectSnippet {
  id: string;
  title: string;
  code: string;
  languages: ProjectLanguage[];
  matchedSignals: Record<ProjectLanguage, string[]>;
  isManualOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getExtensionForLanguage(lang: ProjectLanguage): DownloadExtension {
  if (lang === 'C++') return 'cpp';
  if (lang === 'C') return 'c';
  if (lang === 'Python') return 'py';
  return 'java';
}

export function sanitizeFileSlug(title: string): string {
  let out = '';
  let lastDash = false;
  for (let i = 0; i < title.length; i += 1) {
    const ch = title[i].toLowerCase();
    const code = ch.charCodeAt(0);
    const isAlphaNum = (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
    if (isAlphaNum) {
      out += ch;
      lastDash = false;
    } else if (!lastDash && out.length > 0) {
      out += '-';
      lastDash = true;
    }
  }
  while (out.endsWith('-')) {
    out = out.slice(0, out.length - 1);
  }
  return out.length > 0 ? out : 'project-snippet';
}

function addSignal(list: string[], label: string): void {
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] === label) return;
  }
  list[list.length] = label;
}

/**
 * Deterministic multi-language syntax analyzer.
 * Evaluates C++, C, Python, and Java patterns independently so mixed/combined code
 * highlights all matching languages simultaneously.
 */
export function detectCodeLanguages(code: string): LanguageDetectionResult {
  const matchedSignals: Record<ProjectLanguage, string[]> = {
    'C++': [],
    C: [],
    Python: [],
    Java: [],
  };

  if (code.trim().length === 0) {
    return { languages: [], matchedSignals };
  }

  // --- C++ Patterns ---
  if (/#include\s*<(iostream|vector|algorithm|map|unordered_map|set|queue|stack|bits\/stdc\+\+\.h|string)>/.test(code)) {
    addSignal(matchedSignals['C++'], '#include <C++ header>');
  }
  if (/\bstd::/.test(code)) addSignal(matchedSignals['C++'], 'std::');
  if (/\busing\s+namespace\s+std\s*;/.test(code)) addSignal(matchedSignals['C++'], 'using namespace std');
  if (/\b(cout|cerr)\s*<</.test(code) || /\bcin\s*>>/.test(code)) addSignal(matchedSignals['C++'], 'cout / cin');
  if (/\b(vector|unordered_map|priority_queue|pair)\s*</.test(code)) addSignal(matchedSignals['C++'], 'STL template <...>');
  if (/\bnullptr\b/.test(code)) addSignal(matchedSignals['C++'], 'nullptr');
  if (/\btemplate\s*</.test(code)) addSignal(matchedSignals['C++'], 'template <...>');

  // --- C Patterns ---
  if (/#include\s*<(stdio\.h|stdlib\.h|string\.h|stdbool\.h|ctype\.h|math\.h)>/.test(code)) {
    addSignal(matchedSignals.C, '#include <stdio.h/stdlib.h>');
  }
  if (/\b(printf|fprintf|sprintf)\s*\(/.test(code)) addSignal(matchedSignals.C, 'printf(...)');
  if (/\b(scanf|fscanf|sscanf)\s*\(/.test(code)) addSignal(matchedSignals.C, 'scanf(...)');
  if (/\b(malloc|calloc|realloc|free)\s*\(/.test(code)) addSignal(matchedSignals.C, 'malloc/free(...)');
  if (/\btypedef\s+struct\b/.test(code)) addSignal(matchedSignals.C, 'typedef struct');
  if (/\bint\s+main\s*\(\s*(void)?\s*\)/.test(code) && !/\bstd::|\bcout\s*<<|#include\s*<iostream>/.test(code)) {
    addSignal(matchedSignals.C, 'int main()');
  }

  // --- Java Patterns ---
  if (/\bpublic\s+class\s+[A-Za-z_]\w*/.test(code)) addSignal(matchedSignals.Java, 'public class');
  if (/\bpublic\s+static\s+void\s+main\s*\(\s*String/.test(code)) addSignal(matchedSignals.Java, 'public static void main');
  if (/\bSystem\.out\.(println|print|printf)\s*\(/.test(code)) addSignal(matchedSignals.Java, 'System.out.println');
  if (/\bimport\s+java\./.test(code)) addSignal(matchedSignals.Java, 'import java.*');
  if (/\bnew\s+Scanner\s*\(\s*System\.in\s*\)/.test(code)) addSignal(matchedSignals.Java, 'Scanner(System.in)');
  if (/\b(ArrayList|HashMap|LinkedList|StringBuilder)\s*</.test(code)) addSignal(matchedSignals.Java, 'Java Collections');
  if (/@Override\b/.test(code)) addSignal(matchedSignals.Java, '@Override');

  // --- Python Patterns ---
  if (/^\s*def\s+[A-Za-z_]\w*\s*\([^)]*\)\s*:/m.test(code)) addSignal(matchedSignals.Python, 'def func():');
  if (/^\s*elif\b.*:/m.test(code)) addSignal(matchedSignals.Python, 'elif ...:');
  if (/^\s*from\s+[A-Za-z_][\w.]*\s+import\s+/m.test(code)) addSignal(matchedSignals.Python, 'from ... import');
  if (/^\s*import\s+[A-Za-z_]\w*(\s+as\s+[A-Za-z_]\w*)?(\s*,\s*[A-Za-z_]\w*)*\s*$/m.test(code)) {
    addSignal(matchedSignals.Python, 'import module');
  }
  if (/(^|[^\w.])print\s*\([^)]*\)\s*(#.*)?$/m.test(code) && !/;\s*$/.test(code.match(/(^|[^\w.])print\s*\([^)]*\).*/m)?.[0] ?? '')) {
    addSignal(matchedSignals.Python, 'print(...)');
  }
  if (/if\s+__name__\s*==\s*['"]__main__['"]\s*:/.test(code)) addSignal(matchedSignals.Python, '__name__ == "__main__"');
  if (/\b(True|False|None)\b/.test(code) && !/\bSystem\.out|\bpublic\s+class|\b#include\b/.test(code)) {
    addSignal(matchedSignals.Python, 'True/False/None');
  }
  if (/\b(range|len|enumerate)\s*\(/.test(code) && /:\s*(#.*)?$/m.test(code)) {
    addSignal(matchedSignals.Python, 'range()/len() + :');
  }

  const languages: ProjectLanguage[] = [];
  for (let i = 0; i < ALL_PROJECT_LANGUAGES.length; i += 1) {
    const lang = ALL_PROJECT_LANGUAGES[i];
    if (matchedSignals[lang].length > 0) {
      languages[languages.length] = lang;
    }
  }

  return { languages, matchedSignals };
}

export type SyntaxTokenType =
  | 'comment'
  | 'preprocessor'
  | 'string'
  | 'number'
  | 'control'
  | 'keyword'
  | 'type'
  | 'function'
  | 'operator'
  | 'plain';

export interface SyntaxToken {
  type: SyntaxTokenType;
  value: string;
}

const CONTROL_KEYWORDS = [
  'if', 'else', 'elif', 'for', 'while', 'do', 'switch', 'case', 'default', 'break',
  'continue', 'return', 'try', 'catch', 'finally', 'throw', 'throws', 'except',
  'raise', 'with', 'as', 'yield', 'import', 'from', 'package', 'using',
];

const GENERAL_KEYWORDS = [
  'public', 'private', 'protected', 'static', 'final', 'const', 'constexpr', 'virtual',
  'override', 'class', 'struct', 'typedef', 'enum', 'interface', 'extends', 'implements',
  'namespace', 'template', 'typename', 'def', 'lambda', 'new', 'delete', 'sizeof',
  'this', 'self', 'super', 'in', 'is', 'not', 'and', 'or', 'pass', 'global', 'nonlocal',
  'nullptr', 'null', 'NULL', 'true', 'false', 'True', 'False', 'None', 'async', 'await',
];

const TYPE_AND_BUILTIN_TOKENS = [
  'void', 'int', 'long', 'short', 'double', 'float', 'char', 'bool', 'boolean', 'byte',
  'auto', 'unsigned', 'signed', 'size_t', 'String', 'string', 'Scanner', 'System', 'out',
  'std', 'cout', 'cin', 'cerr', 'endl', 'vector', 'map', 'unordered_map', 'set', 'queue',
  'stack', 'priority_queue', 'pair', 'ArrayList', 'HashMap', 'LinkedList',
  'StringBuilder', 'Node', 'list', 'dict', 'tuple', 'str',
];

function containsToken(list: string[], target: string): boolean {
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] === target) return true;
  }
  return false;
}

function isWordStartChar(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || ch === '_' || ch === '@';
}

function isWordPartChar(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || ch === '_';
}

function isDigitChar(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return c >= 48 && c <= 57;
}

/**
 * Manual single-pass syntax tokenizer mirroring C++ smart_dsa::tokenizeCodeForHighlight.
 * Preserves every character and whitespace 1:1 so overlaid textarea cursor alignment stays exact.
 */
export function tokenizeCodeForHighlight(code: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  const n = code.length;
  let i = 0;

  while (i < n) {
    const ch = code[i];

    // Line comment // ...
    if (ch === '/' && i + 1 < n && code[i + 1] === '/') {
      let end = i + 2;
      while (end < n && code[end] !== '\n') end += 1;
      tokens[tokens.length] = { type: 'comment', value: code.slice(i, end) };
      i = end;
      continue;
    }

    // Block comment /* ... */
    if (ch === '/' && i + 1 < n && code[i + 1] === '*') {
      let end = i + 2;
      while (end + 1 < n && !(code[end] === '*' && code[end + 1] === '/')) {
        end += 1;
      }
      end = end + 1 < n ? end + 2 : n;
      tokens[tokens.length] = { type: 'comment', value: code.slice(i, end) };
      i = end;
      continue;
    }

    // Preprocessor directive (#include, #define, etc.) vs Python # comment
    if (ch === '#') {
      const rest = code.slice(i, i + 16);
      if (/^#(include|define|ifdef|ifndef|endif|pragma|if|else|elif)\b/.test(rest)) {
        let end = i + 1;
        while (end < n && code[end] !== '\n') end += 1;
        tokens[tokens.length] = { type: 'preprocessor', value: code.slice(i, end) };
        i = end;
        continue;
      }
      let end = i + 1;
      while (end < n && code[end] !== '\n') end += 1;
      tokens[tokens.length] = { type: 'comment', value: code.slice(i, end) };
      i = end;
      continue;
    }

    // Strings ("..." or '...')
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let end = i + 1;
      while (end < n) {
        if (code[end] === '\\' && end + 1 < n) {
          end += 2;
          continue;
        }
        if (code[end] === quote || code[end] === '\n') {
          if (code[end] === quote) end += 1;
          break;
        }
        end += 1;
      }
      tokens[tokens.length] = { type: 'string', value: code.slice(i, end) };
      i = end;
      continue;
    }

    // Numbers
    if (isDigitChar(ch)) {
      let end = i + 1;
      while (end < n && (isWordPartChar(code[end]) || code[end] === '.')) {
        end += 1;
      }
      tokens[tokens.length] = { type: 'number', value: code.slice(i, end) };
      i = end;
      continue;
    }

    // Identifiers & Keywords
    if (isWordStartChar(ch)) {
      let end = i + 1;
      while (end < n && isWordPartChar(code[end])) {
        end += 1;
      }
      const word = code.slice(i, end);

      let type: SyntaxTokenType = 'plain';
      if (word.startsWith('@')) {
        type = 'preprocessor';
      } else if (containsToken(CONTROL_KEYWORDS, word)) {
        type = 'control';
      } else if (containsToken(GENERAL_KEYWORDS, word)) {
        type = 'keyword';
      } else if (containsToken(TYPE_AND_BUILTIN_TOKENS, word)) {
        type = 'type';
      } else {
        let look = end;
        while (look < n && code[look] === ' ') look += 1;
        if (look < n && code[look] === '(') {
          type = 'function';
        }
      }

      tokens[tokens.length] = { type, value: word };
      i = end;
      continue;
    }

    // Operators / Punctuation
    if ('{}()[]<>+-*/%=!&|^~:;,.?'.includes(ch)) {
      tokens[tokens.length] = { type: 'operator', value: ch };
      i += 1;
      continue;
    }

    // Whitespace & newlines (preserve strictly for 1:1 overlay alignment)
    let end = i + 1;
    while (
      end < n &&
      (code[end] === ' ' || code[end] === '\t' || code[end] === '\n' || code[end] === '\r')
    ) {
      end += 1;
    }
    tokens[tokens.length] = { type: 'plain', value: code.slice(i, end) };
    i = end;
  }

  return tokens;
}

interface HashEntryNode {
  key: string;
  project: ProjectSnippet;
  next: HashEntryNode | null;
}

/**
 * Manual Dynamic Array + Separate-Chaining Hash Index backing the Project Store.
 */
export class ProjectStoreCollection {
  private buffer: (ProjectSnippet | null)[];
  private count = 0;
  private capacityValue = 4;
  private buckets: (HashEntryNode | null)[];
  private readonly bucketCount = 16;

  constructor(initialCapacity = 4) {
    this.capacityValue = initialCapacity;
    this.buffer = new Array<ProjectSnippet | null>(initialCapacity);
    for (let i = 0; i < initialCapacity; i += 1) {
      this.buffer[i] = null;
    }
    this.buckets = new Array<HashEntryNode | null>(this.bucketCount);
    for (let i = 0; i < this.bucketCount; i += 1) {
      this.buckets[i] = null;
    }
  }

  public get length(): number {
    return this.count;
  }

  public get capacity(): number {
    return this.capacityValue;
  }

  private hashKey(key: string): number {
    let hash = 5381;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash * 33 + key.charCodeAt(i)) % 1000000007;
    }
    return Math.abs(hash) % this.bucketCount;
  }

  private rebuildHashIndex(): void {
    for (let i = 0; i < this.bucketCount; i += 1) {
      this.buckets[i] = null;
    }
    for (let i = 0; i < this.count; i += 1) {
      const item = this.buffer[i];
      if (item !== null) {
        const idx = this.hashKey(item.id);
        const node: HashEntryNode = {
          key: item.id,
          project: item,
          next: this.buckets[idx],
        };
        this.buckets[idx] = node;
      }
    }
  }

  private resize(newCapacity: number): void {
    const nextBuffer = new Array<ProjectSnippet | null>(newCapacity);
    for (let i = 0; i < newCapacity; i += 1) {
      nextBuffer[i] = i < this.count ? this.buffer[i] : null;
    }
    this.buffer = nextBuffer;
    this.capacityValue = newCapacity;
  }

  public findById(id: string): ProjectSnippet | null {
    const idx = this.hashKey(id);
    let curr = this.buckets[idx];
    while (curr !== null) {
      if (curr.key === id) {
        return curr.project;
      }
      curr = curr.next;
    }
    return null;
  }

  public pushOrUpdate(project: ProjectSnippet): { updated: boolean; resized: boolean; oldCap: number; newCap: number } {
    for (let i = 0; i < this.count; i += 1) {
      const item = this.buffer[i];
      if (item !== null && item.id === project.id) {
        this.buffer[i] = project;
        this.rebuildHashIndex();
        return { updated: true, resized: false, oldCap: this.capacityValue, newCap: this.capacityValue };
      }
    }

    const oldCap = this.capacityValue;
    let resized = false;
    if (this.count === this.capacityValue) {
      this.resize(this.capacityValue * 2);
      resized = true;
    }

    // Insert newest at index 0 by shifting right manually so newest saved projects appear first
    for (let i = this.count; i > 0; i -= 1) {
      this.buffer[i] = this.buffer[i - 1];
    }
    this.buffer[0] = project;
    this.count += 1;
    this.rebuildHashIndex();
    return { updated: false, resized, oldCap, newCap: this.capacityValue };
  }

  public removeById(id: string): ProjectSnippet | null {
    let foundIdx = -1;
    for (let i = 0; i < this.count; i += 1) {
      const item = this.buffer[i];
      if (item !== null && item.id === id) {
        foundIdx = i;
        break;
      }
    }
    if (foundIdx === -1) return null;

    const removed = this.buffer[foundIdx];
    for (let i = foundIdx; i < this.count - 1; i += 1) {
      this.buffer[i] = this.buffer[i + 1];
    }
    this.count -= 1;
    this.buffer[this.count] = null;
    this.rebuildHashIndex();
    return removed;
  }

  public filterByLanguage(lang: ProjectLanguage | 'ALL'): ProjectSnippet[] {
    const out: ProjectSnippet[] = [];
    for (let i = 0; i < this.count; i += 1) {
      const item = this.buffer[i];
      if (item === null) continue;
      if (lang === 'ALL') {
        out[out.length] = item;
      } else {
        for (let j = 0; j < item.languages.length; j += 1) {
          if (item.languages[j] === lang) {
            out[out.length] = item;
            break;
          }
        }
      }
    }
    return out;
  }

  public toArray(): ProjectSnippet[] {
    return this.filterByLanguage('ALL');
  }

  public replaceAll(items: ProjectSnippet[]): void {
    this.clear();
    // Push in reverse so original array order is preserved when inserting at index 0
    for (let i = items.length - 1; i >= 0; i -= 1) {
      this.pushOrUpdate(items[i]);
    }
  }

  public clear(): void {
    this.capacityValue = 4;
    this.buffer = new Array<ProjectSnippet | null>(4);
    for (let i = 0; i < 4; i += 1) {
      this.buffer[i] = null;
    }
    this.count = 0;
    this.rebuildHashIndex();
  }
}
