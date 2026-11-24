import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Code2,
  Download,
  FileCode,
  FolderOpen,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { ActionButton, ButtonAccent } from './ActionButton';
import { DSBadge } from './DSBadge';
import { HighlightedCodeBlock, SyntaxCodeEditor } from './SyntaxCodeEditor';
import {
  ALL_PROJECT_LANGUAGES,
  DownloadExtension,
  ProjectLanguage,
  ProjectSnippet,
  detectCodeLanguages,
  getExtensionForLanguage,
} from '../dsa/ProjectStoreCollection';

type DownloadFormatChoice = DownloadExtension | 'bundle';

interface ProjectStorePanelProps {
  projects: ProjectSnippet[];
  arrayCapacity: number;
  deletingProjectId: string | null;
  restoredProjectId: string | null;
  onSaveProject: (payload: {
    id?: string;
    title: string;
    code: string;
    languages: ProjectLanguage[];
    matchedSignals: Record<ProjectLanguage, string[]>;
    isManualOverride: boolean;
  }) => boolean;
  onDeleteProject: (projectId: string) => void;
  onDownloadProject: (
    title: string,
    code: string,
    languages: ProjectLanguage[],
    extension: DownloadExtension | 'bundle'
  ) => void;
}

const LANGUAGE_ACCENT: Record<ProjectLanguage, ButtonAccent> = {
  'C++': 'indigo',
  C: 'teal',
  Python: 'violet',
  Java: 'rose',
};

const LANGUAGE_BADGE_STYLE: Record<ProjectLanguage, string> = {
  'C++': 'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE]',
  C: 'bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]',
  Python: 'bg-[#F3E8FF] text-[#5B21B6] border-[#DDD6FE]',
  Java: 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]',
};

const DEMO_SAMPLES: { label: string; title: string; code: string }[] = [
  {
    label: 'Java + C++ Combo',
    title: 'Dual-Language Priority Queue Demo',
    code: `// Java Implementation
import java.util.*;

public class TaskRunner {
    public static void main(String[] args) {
        System.out.println("Running Java Priority Queue...");
    }
}

// C++ Implementation
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> heap = {10, 4, 8};
    std::cout << "C++ Max-Heap size: " << heap.size() << std::endl;
    return 0;
}`,
  },
  {
    label: 'Python Sample',
    title: 'Trie Prefix Search (Python)',
    code: `# Manual Trie Prefix Search
def search_prefix(words, prefix):
    matches = []
    for w in words:
        if w.startswith(prefix):
            matches.append(w)
    return matches

if __name__ == "__main__":
    print(search_prefix(["heap", "hash", "head"], "he"))`,
  },
  {
    label: 'C Sample',
    title: 'Doubly Linked List Node (C)',
    code: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int line;
    struct Node* prev;
    struct Node* next;
} Node;

int main(void) {
    printf("Manual C Doubly Linked List ready\\n");
    return 0;
}`,
  },
];

function resolveAutoDownloadFormat(languages: ProjectLanguage[]): DownloadFormatChoice {
  if (languages.length === 1) {
    return getExtensionForLanguage(languages[0]);
  }
  if (languages.length > 1) {
    return 'bundle';
  }
  return 'txt';
}

export const ProjectStorePanel: React.FC<ProjectStorePanelProps> = ({
  projects,
  arrayCapacity,
  deletingProjectId,
  restoredProjectId,
  onSaveProject,
  onDeleteProject,
  onDownloadProject,
}) => {
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [titleShakeKey, setTitleShakeKey] = useState(0);
  const [code, setCode] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<ProjectLanguage[]>([]);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [filterLanguage, setFilterLanguage] = useState<ProjectLanguage | 'ALL'>('ALL');
  const [editorDownloadExt, setEditorDownloadExt] = useState<DownloadFormatChoice>('txt');
  const [cardExtensions, setCardExtensions] = useState<Record<string, DownloadFormatChoice>>({});

  const titleInputRef = useRef<HTMLInputElement>(null);
  const justPastedRef = useRef(false);

  const liveDetection = detectCodeLanguages(code);
  const activeLanguages = isManualOverride ? selectedLanguages : liveDetection.languages;

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);
    if (titleError && nextTitle.trim().length > 0) {
      setTitleError(null);
    }
  };

  const handleCodeChange = (nextCode: string, forceAutoDetect = false) => {
    const shouldAuto = forceAutoDetect || justPastedRef.current || !isManualOverride;
    justPastedRef.current = false;
    setCode(nextCode);
    const detected = detectCodeLanguages(nextCode);
    if (shouldAuto) {
      if (forceAutoDetect) setIsManualOverride(false);
      setSelectedLanguages(detected.languages);
      setEditorDownloadExt(resolveAutoDownloadFormat(detected.languages));
    }
  };

  const handleCodePaste = () => {
    // Ensure the immediate post-paste onChange runs full multi-language auto-detection
    justPastedRef.current = true;
    setIsManualOverride(false);
  };

  const handleToggleLanguage = (lang: ProjectLanguage) => {
    setIsManualOverride(true);
    const base = isManualOverride ? selectedLanguages : liveDetection.languages;
    const exists = base.includes(lang);
    const next = exists ? base.filter((l) => l !== lang) : [...base, lang];
    setSelectedLanguages(next);
    setEditorDownloadExt(resolveAutoDownloadFormat(next));
  };

  const handleRunAutoDetect = () => {
    const detected = detectCodeLanguages(code);
    setIsManualOverride(false);
    setSelectedLanguages(detected.languages);
    setEditorDownloadExt(resolveAutoDownloadFormat(detected.languages));
  };

  const handleLoadSample = (sample: { title: string; code: string }) => {
    setEditingId(undefined);
    setTitle(sample.title);
    setTitleError(null);
    handleCodeChange(sample.code, true);
  };

  const handleResetDraft = () => {
    setEditingId(undefined);
    setTitle('');
    setTitleError(null);
    setCode('');
    setSelectedLanguages([]);
    setIsManualOverride(false);
    setEditorDownloadExt('txt');
  };

  const handleSubmitSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (title.trim().length === 0) {
      setTitleError('Project title is required before saving. Enter a descriptive title above.');
      setTitleShakeKey((k) => k + 1);
      if (titleInputRef.current) {
        titleInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => {
          titleInputRef.current?.focus();
        }, 120);
      }
      onSaveProject({
        id: editingId,
        title,
        code,
        languages: activeLanguages,
        matchedSignals: liveDetection.matchedSignals,
        isManualOverride,
      });
      return;
    }

    const ok = onSaveProject({
      id: editingId,
      title,
      code,
      languages: activeLanguages,
      matchedSignals: liveDetection.matchedSignals,
      isManualOverride,
    });
    if (ok) {
      handleResetDraft();
    }
  };

  const handleLoadSavedProject = (proj: ProjectSnippet) => {
    setEditingId(proj.id);
    setTitle(proj.title);
    setTitleError(null);
    setCode(proj.code);
    setSelectedLanguages(proj.languages);
    setIsManualOverride(proj.isManualOverride);
    setEditorDownloadExt(resolveAutoDownloadFormat(proj.languages));
  };

  const filteredProjects =
    filterLanguage === 'ALL'
      ? projects
      : projects.filter((p) => p.languages.includes(filterLanguage));

  const codeLineCount = code.length === 0 ? 0 : code.split('\n').length;

  return (
    <section
      id="project-store"
      aria-label="Project Store Multi-Language Code Repository"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      {/* Left Column: Code Editor & Auto-Detector */}
      <div className="lg:col-span-7 rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] overflow-hidden shadow-xs">
        <div className="border-b border-[#E5D9C5] bg-[#F4ECE0] px-5 py-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DSBadge label="Dynamic Array & Language Detector" accent="indigo" />
            <div className="text-xs text-[#57534E] tabular-nums">
              {editingId ? (
                <span className="font-semibold text-[#4338CA]">Editing Saved Project</span>
              ) : (
                <span>New Project Snippet</span>
              )}
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{codeLineCount} lines · {code.length} chars</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-[#1E1B18] flex items-center gap-2">
              <Code2 className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
              <span>Project Store — Code Editor &amp; Language Detector</span>
            </h2>
            {editingId && (
              <ActionButton size="sm" accent="neutral" onClick={handleResetDraft}>
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </ActionButton>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmitSave} className="p-5 space-y-4">
          {/* Project Title Input with Strict Red Validation */}
          <div key={`title-box-${titleShakeKey}`} className={`space-y-1.5 ${titleError ? 'animate-title-shake' : ''}`}>
            <label
              htmlFor="project-store-title"
              className={`block text-xs font-semibold ${
                titleError ? 'text-[#DC2626]' : 'text-[#1E1B18]'
              }`}
            >
              Project Title {titleError ? '— Required *' : ''}
            </label>
            <input
              ref={titleInputRef}
              id="project-store-title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? 'project-title-error' : undefined}
              placeholder="Enter project title (e.g., Dijkstra Shortest Path in C++ & Java)..."
              className={`w-full rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 ${
                titleError
                  ? 'border-[#DC2626] bg-[#FEF2F2] text-[#991B1B] placeholder-[#DC2626]/60 focus:border-[#DC2626] focus:ring-[#DC2626]/25'
                  : 'border-[#D6C7B2] bg-[#FBF7F0] text-[#1E1B18] placeholder-[#78716C] focus:border-[#4338CA] focus:bg-[#FFFDF9] focus:ring-[#4338CA]/20'
              }`}
            />
            {titleError && (
              <div
                id="project-title-error"
                role="alert"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#DC2626]"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{titleError}</span>
              </div>
            )}
          </div>

          {/* Language Format Strip */}
          <div className="rounded-xl border border-[#E5D9C5] bg-[#F7F1E5] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E1B18]">
                <Sparkles className="w-3.5 h-3.5 text-[#6D28D9]" aria-hidden="true" />
                <span>Language Formats (Auto-Detected &amp; Multi-Select)</span>
              </div>
              <ActionButton size="sm" accent="violet" onClick={handleRunAutoDetect}>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Auto-Detect</span>
              </ActionButton>
            </div>

            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Detected programming languages">
              {ALL_PROJECT_LANGUAGES.map((lang) => {
                const isMarked = activeLanguages.includes(lang);
                const isDetected = liveDetection.languages.includes(lang);
                return (
                  <ActionButton
                    key={lang}
                    size="sm"
                    accent={LANGUAGE_ACCENT[lang]}
                    isActive={isMarked}
                    onClick={() => handleToggleLanguage(lang)}
                    title={
                      isDetected
                        ? `Auto-detected ${lang} syntax (${liveDetection.matchedSignals[lang].join(', ')})`
                        : `Toggle ${lang} format manually`
                    }
                  >
                    {isMarked && <Check className="w-3.5 h-3.5" />}
                    <span className="font-semibold">{lang}</span>
                    {isDetected && (
                      <span
                        className={`ml-0.5 rounded px-1 py-0.5 text-[10px] font-mono ${
                          isMarked
                            ? 'bg-white/20 text-white'
                            : 'bg-[#E5D9C5] text-[#1E1B18]'
                        }`}
                      >
                        Auto
                      </span>
                    )}
                  </ActionButton>
                );
              })}
            </div>

            {/* Detection Breakdown & Auto-Selected Format Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E]">
              <div className="min-w-0">
                {activeLanguages.length === 0 ? (
                  <span>
                    Paste or write C++, C, Python, or Java code below to highlight matching language format(s) and set the download extension automatically.
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold text-[#1E1B18]">
                      Active ({activeLanguages.length}):
                    </span>
                    {activeLanguages.map((lang) => {
                      const signals = liveDetection.matchedSignals[lang];
                      return (
                        <span key={`sig-${lang}`} className="font-mono text-[11px]">
                          <strong className="text-[#1E1B18]">{lang}</strong>
                          {signals.length > 0 ? ` [${signals.join(', ')}]` : ' [manual]'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <span className="inline-flex items-center rounded border border-[#D6C7B2] bg-[#FFFDF9] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#0F766E] shrink-0">
                Auto Format: {editorDownloadExt === 'bundle' ? 'Multi-Lang (.txt)' : `.${editorDownloadExt}`}
              </span>
            </div>
          </div>

          {/* Code::Blocks / VS Code Style Syntax-Highlighted Code Editor */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="project-store-code" className="text-xs font-semibold text-[#1E1B18]">
                Syntax-Highlighted Code Editor (Code::Blocks / VS Code Theme)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {DEMO_SAMPLES.map((sample) => (
                  <ActionButton
                    key={sample.label}
                    size="sm"
                    accent="neutral"
                    onClick={() => handleLoadSample(sample)}
                  >
                    <span>{sample.label}</span>
                  </ActionButton>
                ))}
              </div>
            </div>

            <SyntaxCodeEditor
              id="project-store-code"
              value={code}
              onChange={(next) => handleCodeChange(next, false)}
              onPaste={handleCodePaste}
              placeholder="Paste plain C++, C, Python, Java, or multi-language code here — syntax colors apply instantly..."
            />

            {/* Compact Syntax Color Legend */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#57534E] px-1">
              <span className="font-semibold text-[#1E1B18]">Syntax Colors:</span>
              <span className="font-mono font-semibold text-[#1D4ED8]">Keywords</span>
              <span className="font-mono font-semibold text-[#7C3AED]">Control</span>
              <span className="font-mono font-medium text-[#0F766E]">Types</span>
              <span className="font-mono font-semibold text-[#047857]">#include</span>
              <span className="font-mono text-[#B91C1C]">"Strings"</span>
              <span className="font-mono italic text-[#15803D]">// Comments</span>
              <span className="font-mono font-medium text-[#C2410C]">Numbers</span>
              <span className="font-mono font-medium text-[#92400E]">Functions()</span>
            </div>
          </div>

          {/* Save & Auto-Selected Download Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton type="submit" accent="indigo" isActive>
                <Save className="w-4 h-4" />
                <span>{editingId ? 'Update Saved Project' : 'Save Project'}</span>
              </ActionButton>
              {(title.length > 0 || code.length > 0) && (
                <ActionButton size="md" accent="neutral" onClick={handleResetDraft}>
                  <span>Clear Editor</span>
                </ActionButton>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={editorDownloadExt}
                onChange={(e) => setEditorDownloadExt(e.target.value as DownloadFormatChoice)}
                aria-label="Choose download extension for current code"
                className="rounded-lg border border-[#D6C7B2] bg-[#FBF7F0] px-2.5 py-2 text-xs font-mono font-semibold text-[#1E1B18] focus:border-[#0F766E] focus:outline-none"
              >
                <option value="txt">.txt (Plain Text)</option>
                <option value="cpp">.cpp (C++)</option>
                <option value="c">.c (C)</option>
                <option value="py">.py (Python)</option>
                <option value="java">.java (Java)</option>
                <option value="bundle">.txt (Multi-Lang Bundle)</option>
              </select>
              <ActionButton
                size="sm"
                accent="teal"
                onClick={() =>
                  onDownloadProject(
                    title.trim() || 'untitled-project',
                    code,
                    activeLanguages,
                    editorDownloadExt
                  )
                }
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {editorDownloadExt === 'bundle'
                    ? 'Download Bundle (.txt)'
                    : `Download .${editorDownloadExt}`}
                </span>
              </ActionButton>
            </div>
          </div>
        </form>
      </div>

      {/* Right Column: Saved Projects Library */}
      <div className="lg:col-span-5 rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] overflow-hidden shadow-xs">
        <div className="border-b border-[#E5D9C5] bg-[#F4ECE0] px-5 py-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DSBadge label="Dynamic Array & Hash/Index Map" accent="teal" />
            <span className="text-xs text-[#57534E] font-mono tabular-nums">
              {projects.length} saved · cap {arrayCapacity}
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#1E1B18] flex items-center gap-2">
            <FileCode className="w-5 h-5 text-[#0F766E]" aria-hidden="true" />
            <span>Saved Projects ({projects.length})</span>
          </h2>

          {/* Filter by Language */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1" role="tablist" aria-label="Filter saved projects by language">
            <ActionButton
              size="sm"
              accent="neutral"
              isActive={filterLanguage === 'ALL'}
              onClick={() => setFilterLanguage('ALL')}
            >
              All ({projects.length})
            </ActionButton>
            {ALL_PROJECT_LANGUAGES.map((lang) => {
              const count = projects.filter((p) => p.languages.includes(lang)).length;
              return (
                <ActionButton
                  key={`filter-${lang}`}
                  size="sm"
                  accent={LANGUAGE_ACCENT[lang]}
                  isActive={filterLanguage === lang}
                  onClick={() => setFilterLanguage(lang)}
                >
                  {lang} ({count})
                </ActionButton>
              );
            })}
          </div>
        </div>

        <div className="max-h-[680px] overflow-y-auto divide-y divide-[#E5D9C5] bg-[#FFFDF9]">
          {filteredProjects.length === 0 ? (
            <div className="px-6 py-14 text-center space-y-2">
              <p className="text-sm font-semibold text-[#1E1B18]">
                {projects.length === 0
                  ? 'No saved projects yet'
                  : `No saved projects tagged with ${filterLanguage}`}
              </p>
              <p className="text-xs text-[#57534E] max-w-xs mx-auto">
                Enter a project title and paste C++, C, Python, or Java code on the left, then click Save Project to store it persistently.
              </p>
            </div>
          ) : (
            filteredProjects.map((proj) => {
              const isDeleting = deletingProjectId === proj.id;
              const isRestored = restoredProjectId === proj.id;
              const autoExt = resolveAutoDownloadFormat(proj.languages);
              const selectedExt = cardExtensions[proj.id] ?? autoExt;

              return (
                <div
                  key={proj.id}
                  className={`p-4 space-y-3 transition-all duration-200 ${
                    isDeleting
                      ? 'opacity-0 scale-95 -translate-x-2'
                      : isRestored
                      ? 'animate-restore-pop'
                      : 'animate-fade-slide-in hover:bg-[#F7F1E5]/65'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm font-bold text-[#1E1B18] truncate" title={proj.title}>
                        {proj.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {proj.languages.length > 0 ? (
                          proj.languages.map((lang) => (
                            <span
                              key={`${proj.id}-${lang}`}
                              className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold ${LANGUAGE_BADGE_STYLE[lang]}`}
                            >
                              {lang}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center rounded border border-[#D6C7B2] bg-[#F4ECE0] px-2 py-0.5 text-[11px] font-medium text-[#57534E]">
                            Plain Text
                          </span>
                        )}
                        <span className="text-[11px] text-[#57534E] tabular-nums">
                          · Saved {proj.updatedAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <ActionButton
                        size="sm"
                        accent="indigo"
                        onClick={() => handleLoadSavedProject(proj)}
                        title="Load project into editor"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Load</span>
                      </ActionButton>
                      <ActionButton
                        size="sm"
                        accent="rose"
                        onClick={() => onDeleteProject(proj.id)}
                        title={`Delete ${proj.title}`}
                        aria-label={`Delete ${proj.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </ActionButton>
                    </div>
                  </div>

                  {/* Syntax-Highlighted Code Preview */}
                  <HighlightedCodeBlock code={proj.code} maxLines={4} className="max-h-24" />

                  {/* Flexible Multi-Format Download Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ActionButton
                        size="sm"
                        accent="neutral"
                        onClick={() =>
                          onDownloadProject(proj.title, proj.code, proj.languages, 'txt')
                        }
                      >
                        <Download className="w-3 h-3" />
                        <span>.txt</span>
                      </ActionButton>
                      {proj.languages.map((lang) => {
                        const ext = getExtensionForLanguage(lang);
                        return (
                          <ActionButton
                            key={`${proj.id}-dl-${lang}`}
                            size="sm"
                            accent={LANGUAGE_ACCENT[lang]}
                            onClick={() =>
                              onDownloadProject(proj.title, proj.code, proj.languages, ext)
                            }
                          >
                            <Download className="w-3 h-3" />
                            <span>.{ext}</span>
                          </ActionButton>
                        );
                      })}
                      {proj.languages.length > 1 && (
                        <ActionButton
                          size="sm"
                          accent="violet"
                          onClick={() =>
                            onDownloadProject(proj.title, proj.code, proj.languages, 'bundle')
                          }
                          title="Download multi-language annotated bundle"
                        >
                          <Download className="w-3 h-3" />
                          <span>Bundle</span>
                        </ActionButton>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={selectedExt}
                        onChange={(e) =>
                          setCardExtensions((prev) => ({
                            ...prev,
                            [proj.id]: e.target.value as DownloadFormatChoice,
                          }))
                        }
                        aria-label={`Pick download format for ${proj.title}`}
                        className="rounded-md border border-[#D6C7B2] bg-[#FBF7F0] px-2 py-1 text-[11px] font-mono font-semibold text-[#1E1B18] focus:border-[#0F766E] focus:outline-none"
                      >
                        <option value="txt">.txt</option>
                        <option value="cpp">.cpp</option>
                        <option value="c">.c</option>
                        <option value="py">.py</option>
                        <option value="java">.java</option>
                        <option value="bundle">bundle .txt</option>
                      </select>
                      <ActionButton
                        size="sm"
                        accent="teal"
                        onClick={() =>
                          onDownloadProject(proj.title, proj.code, proj.languages, selectedExt)
                        }
                      >
                        <Download className="w-3 h-3" />
                        <span>
                          {selectedExt === 'bundle' ? 'Save Bundle' : `Save .${selectedExt}`}
                        </span>
                      </ActionButton>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
