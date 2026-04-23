/** Collapsible interview prep section: notes, checklist, and practice questions. */

import { useState, useRef, useCallback } from "react";

import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import {
  PREP_NOTES_MAX_LENGTH,
  PREP_NOTES_DEBOUNCE_MS,
  MAX_PREP_QUESTIONS,
  PREP_CHECKLIST_STARTER_SUGGESTIONS,
} from "../lib/constants";
import { ChecklistItem, AddChecklistItem } from "./PrepChecklist";

function QuestionItem({ question, onDelete }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="mt-0.5 flex-shrink-0 text-gray-400 text-sm">•</span>
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{question}</span>
      <button
        type="button"
        onClick={onDelete}
        className="flex-shrink-0 rounded p-0.5 text-gray-300 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
        aria-label={`Delete question: ${question}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddQuestionItem({ onAdd, disabled }) {
  const [text, setText] = useState("");

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = text.trim();
      if (trimmed && !disabled) { onAdd(trimmed); setText(""); }
    }
  }, [text, onAdd, disabled]);

  return (
    <div className="flex items-center gap-2 pt-1">
      <Plus className="h-4 w-4 flex-shrink-0 text-gray-400" />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? `Max ${MAX_PREP_QUESTIONS} questions` : "Add question and press Enter"}
        disabled={disabled}
        className="flex-1 border border-gray-200 bg-white rounded-input px-2 py-1 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="New practice question"
        maxLength={200}
      />
    </div>
  );
}

function usePrepData(initialPrepData, onPrepChange) {
  const [notes, setNotes] = useState(initialPrepData?.notes ?? "");
  const [checklist, setChecklist] = useState(initialPrepData?.checklist ?? []);
  const [questions, setQuestions] = useState(initialPrepData?.questions ?? []);
  const debounceRef = useRef(null);
  const stateRef = useRef({ notes, checklist, questions });
  stateRef.current = { notes, checklist, questions };

  const handleNotesChange = useCallback((e) => {
    const val = e.target.value; setNotes(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onPrepChange({ ...stateRef.current, notes: val }), PREP_NOTES_DEBOUNCE_MS);
  }, [onPrepChange]);

  const handleAddItem = useCallback((text) => {
    setChecklist((prev) => { const u = [...prev, { id: crypto.randomUUID(), text, checked: false }]; onPrepChange({ ...stateRef.current, checklist: u }); return u; });
  }, [onPrepChange]);

  const handleToggleItem = useCallback((itemId) => {
    setChecklist((prev) => { const u = prev.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item); onPrepChange({ ...stateRef.current, checklist: u }); return u; });
  }, [onPrepChange]);

  const handleDeleteItem = useCallback((itemId) => {
    setChecklist((prev) => { const u = prev.filter((item) => item.id !== itemId); onPrepChange({ ...stateRef.current, checklist: u }); return u; });
  }, [onPrepChange]);

  const handleAddQuestion = useCallback((text) => {
    setQuestions((prev) => { const u = [...prev, text]; onPrepChange({ ...stateRef.current, questions: u }); return u; });
  }, [onPrepChange]);

  const handleDeleteQuestion = useCallback((idx) => {
    setQuestions((prev) => { const u = prev.filter((_, i) => i !== idx); onPrepChange({ ...stateRef.current, questions: u }); return u; });
  }, [onPrepChange]);

  return { notes, checklist, questions, handleNotesChange, handleAddItem, handleToggleItem, handleDeleteItem, handleAddQuestion, handleDeleteQuestion };
}

function PrepNotesField({ notes, onNotesChange }) {
  return (
    <div>
      <label htmlFor="prep-notes" className="text-xs font-medium text-gray-500 dark:text-gray-400">Prep Notes</label>
      <textarea
        id="prep-notes"
        value={notes}
        onChange={onNotesChange}
        maxLength={PREP_NOTES_MAX_LENGTH}
        placeholder="Add your prep notes here…"
        rows={4}
        className="mt-1 w-full resize-none border border-gray-200 bg-white rounded-input px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
      />
      <p className="mt-1 text-right text-xs text-gray-400">{notes.length} / {PREP_NOTES_MAX_LENGTH}</p>
    </div>
  );
}

function PrepChecklistSection({ checklist, onAddItem, onToggleItem, onDeleteItem }) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Checklist</span>
      <div className="mt-1 flex flex-col gap-0.5">
        {checklist.map((item) => (
          <ChecklistItem key={item.id} item={item} onToggle={onToggleItem} onDelete={onDeleteItem} />
        ))}
        {checklist.length === 0 && (
          <div className="flex flex-col gap-1 py-1">
            <p className="text-xs text-gray-400 mb-1">Suggestions:</p>
            {PREP_CHECKLIST_STARTER_SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => onAddItem(suggestion)}
                className="text-left text-xs text-brand-600 hover:text-brand-800 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 rounded">
                + {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      <AddChecklistItem onAdd={onAddItem} />
    </div>
  );
}

function PrepQuestionsSection({ questions, onAddQuestion, onDeleteQuestion }) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Practice Questions</span>
      <div className="mt-1 flex flex-col gap-0.5">
        {questions.map((q, idx) => (
          <QuestionItem key={idx} question={q} onDelete={() => onDeleteQuestion(idx)} />
        ))}
      </div>
      <AddQuestionItem onAdd={onAddQuestion} disabled={questions.length >= MAX_PREP_QUESTIONS} />
    </div>
  );
}

/**
 * PrepSection — collapsible interview prep panel.
 *
 * Props:
 *   initialPrepData  {object}    { notes, checklist, questions }
 *   onPrepChange     {function}  Called with full prepData on every mutation
 */
export function PrepSection({ initialPrepData, onPrepChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const { notes, checklist, questions, handleNotesChange, handleAddItem, handleToggleItem, handleDeleteItem, handleAddQuestion, handleDeleteQuestion } = usePrepData(initialPrepData, onPrepChange);
  return (
    <div className="border-b border-gray-100 dark:border-gray-700">
      <button type="button" onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500"
        aria-expanded={isOpen}>
        <span className="text-xs font-medium uppercase text-gray-400">Interview Prep</span>
        {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="px-6 pb-4 flex flex-col gap-4">
          <PrepNotesField notes={notes} onNotesChange={handleNotesChange} />
          <PrepChecklistSection checklist={checklist} onAddItem={handleAddItem} onToggleItem={handleToggleItem} onDeleteItem={handleDeleteItem} />
          <PrepQuestionsSection questions={questions} onAddQuestion={handleAddQuestion} onDeleteQuestion={handleDeleteQuestion} />
        </div>
      )}
    </div>
  );
}
