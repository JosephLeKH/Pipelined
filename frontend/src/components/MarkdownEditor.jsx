/** WYSIWYG rich-text editor for notes. Emits markdown so backend length cap
 * and existing markdown-stored notes stay compatible. */

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Bold from "lucide-react/dist/esm/icons/bold";
import Italic from "lucide-react/dist/esm/icons/italic";
import UnderlineIcon from "lucide-react/dist/esm/icons/underline";
import List from "lucide-react/dist/esm/icons/list";
import ListOrdered from "lucide-react/dist/esm/icons/list-ordered";

import { Button } from "./ui/button";

const TOOLBAR_BTN =
  "h-8 w-8 text-text-2 hover:text-text-1 hover:bg-surface-2 " +
  "data-[active=true]:bg-surface-2 data-[active=true]:text-text-1 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-1";

const EDITOR_CLASS =
  "min-h-[7.5rem] rounded-md px-3 py-2 text-sm text-text-1 outline-none focus:outline-none " +
  "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_p]:my-1 [&_strong]:font-semibold";

function ToolbarButton({ label, icon: Icon, isActive, onClick }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={isActive}
      data-active={isActive}
      onClick={onClick}
      className={TOOLBAR_BTN}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

function EditorToolbar({ editor }) {
  if (!editor) return null;
  return (
    <div
      className="mb-1 flex h-8 flex-wrap gap-0.5 border-b border-border-1 pb-1"
      role="toolbar"
      aria-label="Formatting options"
    >
      <ToolbarButton
        label="Bold"
        icon={Bold}
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="Italic"
        icon={Italic}
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="Underline"
        icon={UnderlineIcon}
        isActive={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        label="Bulleted list"
        icon={List}
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="Numbered list"
        icon={ListOrdered}
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
    </div>
  );
}

function MarkdownEditor({ id, value, onChange, className, onBlur }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        code: false,
        link: false,
      }),
      Markdown.configure({ html: false, tightLists: true, bulletListMarker: "-" }),
    ],
    content: value ?? "",
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown();
      onChange(md);
    },
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: { id: id ?? "", class: EDITOR_CLASS, "data-testid": "rich-text-editor" },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if ((value ?? "") !== current) {
      editor.commands.setContent(value ?? "", false);
    }
  }, [value, editor]);

  return (
    <div className={className}>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

export default MarkdownEditor;
