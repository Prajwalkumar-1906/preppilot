import React from 'react';
import { Type, AlertCircle } from 'lucide-react';

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minWords?: number;
  timeSuggestionSec?: number;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  value,
  onChange,
  disabled = false,
  minWords = 20,
  timeSuggestionSec,
}) => {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;
  // Average speaking pace ~140 wpm
  const estimatedSpeakMinutes = Math.max(1, Math.round(wordCount / 140));

  return (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Type className="w-4 h-4 text-indigo-400" />
          <span className="font-medium text-slate-300">Written Response</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>
            {wordCount} {wordCount === 1 ? 'word' : 'words'} ({charCount} chars)
          </span>
          {wordCount > 0 && (
            <span className="text-slate-500">
              ~{estimatedSpeakMinutes} min read
            </span>
          )}
          {timeSuggestionSec && (
            <span className="text-indigo-400/80">
              Target: ~{Math.round(timeSuggestionSec / 60)} min
            </span>
          )}
        </div>
      </div>

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={10}
          placeholder="Structure your answer clearly. Consider providing context, your approach or rationale, technical specifics, and edge cases or trade-offs..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-500 text-sm md:text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {wordCount > 0 && wordCount < minWords && (
        <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Answers with at least {minWords} words typically receive more accurate and detailed rubric feedback. (Currently {wordCount})
          </span>
        </div>
      )}
    </div>
  );
};
