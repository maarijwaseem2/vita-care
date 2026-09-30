'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useRef } from 'react';
import {
  Bold, Italic, Underline as UIcon, Strikethrough, Heading2, Heading3, Pilcrow, List, ListOrdered,
  Quote, AlignLeft, AlignCenter, AlignRight, Link2, ImagePlus, Minus, Undo2, Redo2, RemoveFormatting,
} from 'lucide-react';
import { adminApi } from '@/lib/admin';
import { mediaUrl } from '@/lib/media';
import { getErrorMessage } from '@/lib/api';
import styles from './editor.module.css';

function Btn({
  on, active, label, children, disabled,
}: { on: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`${styles.tb} ${active ? styles.tbActive : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onError }: { editor: Editor; onError: (m: string) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const c = () => editor.chain().focus();

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link address (https://…). Leave empty to remove.', prev ?? 'https://');
    if (url === null) return;
    if (!url.trim()) return c().unsetLink().run();
    if (!/^https?:\/\//.test(url) && !url.startsWith('/')) return onError('Links must start with https:// or /');
    c().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = async (f?: File) => {
    if (!f) return;
    try {
      const path = await adminApi.upload(f);
      c().setImage({ src: mediaUrl(path), alt: f.name.replace(/\.[^.]+$/, '') }).run();
    } catch (e) {
      onError(getErrorMessage(e));
    } finally {
      if (file.current) file.current.value = '';
    }
  };

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
      <div className={styles.group}>
        <Btn label="Paragraph" on={() => c().setParagraph().run()} active={editor.isActive('paragraph')}><Pilcrow size={17} /></Btn>
        <Btn label="Heading" on={() => c().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 size={17} /></Btn>
        <Btn label="Subheading" on={() => c().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 size={17} /></Btn>
      </div>
      <div className={styles.group}>
        <Btn label="Bold" on={() => c().toggleBold().run()} active={editor.isActive('bold')}><Bold size={17} /></Btn>
        <Btn label="Italic" on={() => c().toggleItalic().run()} active={editor.isActive('italic')}><Italic size={17} /></Btn>
        <Btn label="Underline" on={() => c().toggleUnderline().run()} active={editor.isActive('underline')}><UIcon size={17} /></Btn>
        <Btn label="Strikethrough" on={() => c().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough size={17} /></Btn>
      </div>
      <div className={styles.group}>
        <Btn label="Bulleted list" on={() => c().toggleBulletList().run()} active={editor.isActive('bulletList')}><List size={17} /></Btn>
        <Btn label="Numbered list" on={() => c().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered size={17} /></Btn>
        <Btn label="Quote" on={() => c().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote size={17} /></Btn>
        <Btn label="Divider" on={() => c().setHorizontalRule().run()}><Minus size={17} /></Btn>
      </div>
      <div className={styles.group}>
        <Btn label="Align left" on={() => c().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}><AlignLeft size={17} /></Btn>
        <Btn label="Align centre" on={() => c().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}><AlignCenter size={17} /></Btn>
        <Btn label="Align right (Urdu)" on={() => c().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}><AlignRight size={17} /></Btn>
      </div>
      <div className={styles.group}>
        <Btn label="Add or edit link" on={setLink} active={editor.isActive('link')}><Link2 size={17} /></Btn>
        <Btn label="Insert image" on={() => file.current?.click()}><ImagePlus size={17} /></Btn>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => addImage(e.target.files?.[0])} />
        <Btn label="Clear formatting" on={() => c().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={17} /></Btn>
      </div>
      <div className={styles.group}>
        <Btn label="Undo" on={() => c().undo().run()} disabled={!editor.can().undo()}><Undo2 size={17} /></Btn>
        <Btn label="Redo" on={() => c().redo().run()} disabled={!editor.can().redo()}><Redo2 size={17} /></Btn>
      </div>
    </div>
  );
}

export default function RichEditor({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (html: string, words: number) => void;
  onError: (m: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing the article… Use “Heading” for sections so readers and Google can scan it.' }),
    ],
    content: value,
    editorProps: { attributes: { class: styles.prose, 'aria-label': 'Article content' } },
    onUpdate: ({ editor: e }) => {
      const words = e.getText().split(/\s+/).filter(Boolean).length;
      onChange(e.getHTML(), words);
    },
  });

  if (!editor) return <div className={styles.frame} style={{ minHeight: 360 }} />;

  return (
    <div className={styles.frame}>
      <Toolbar editor={editor} onError={onError} />
      <EditorContent editor={editor} id="blog-editor" />
    </div>
  );
}
