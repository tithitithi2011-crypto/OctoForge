import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Braces } from 'lucide-react';
import { ActionButton } from './ActionButton';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportText: (rawText: string, sourceName: string) => void;
  onImportJson: (rawJson: string, sourceName: string) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportText,
  onImportJson,
}) => {
  const [mode, setMode] = useState<'txt' | 'json'>('txt');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState<string>('pasted-input');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (file.name.toLowerCase().endsWith('.json')) {
      setMode('json');
    } else {
      setMode('txt');
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setContent(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'json') {
      onImportJson(content, fileName);
    } else {
      onImportText(content, fileName);
    }
    setContent('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B18]/45 p-4 backdrop-blur-xs animate-fade-slide-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-[#D6C7B2] bg-[#FFFDF9] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5D9C5] bg-[#F4ECE0] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Upload className="w-5 h-5 text-[#4338CA]" aria-hidden="true" />
            <h2 id="import-modal-title" className="font-display text-lg font-semibold text-[#1E1B18]">
              Import TXT Lines or JSON Workbench
            </h2>
          </div>
          <ActionButton size="sm" accent="indigo" onClick={onClose}>
            <X className="w-4 h-4" />
            <span>Close</span>
          </ActionButton>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ActionButton
                size="sm"
                accent="indigo"
                isActive={mode === 'txt'}
                onClick={() => setMode('txt')}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Plain Text (.txt)</span>
              </ActionButton>
              <ActionButton
                size="sm"
                accent="teal"
                isActive={mode === 'json'}
                onClick={() => setMode('json')}
              >
                <Braces className="w-3.5 h-3.5" />
                <span>Workbench JSON (.json)</span>
              </ActionButton>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json,text/plain,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <ActionButton
                size="sm"
                accent="violet"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Choose File</span>
              </ActionButton>
            </div>
          </div>

          <textarea
            rows={7}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              mode === 'txt'
                ? 'Paste plain text lines here (each line becomes a Doubly Linked List node)...'
                : 'Paste exported workbench JSON ({ "noteTitle": "...", "lines": [...], "tasks": [...] })...'
            }
            className="w-full rounded-lg border border-[#D6C7B2] bg-[#FBF7F0] p-3 font-mono text-xs text-[#1E1B18] placeholder-[#78716C] focus:border-[#4338CA] focus:bg-[#FFFDF9] focus:outline-none"
          />

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[#57534E]">
              Importing runs a staggered cascade settle effect and re-indexes all 8 structures.
            </span>
            <ActionButton type="submit" accent="indigo" isActive>
              <Upload className="w-4 h-4" />
              <span>Import Data</span>
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
};
