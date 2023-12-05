import { oneDark } from '@codemirror/theme-one-dark'
import { keymap, EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { forwardRef } from 'preact/compat'
import { useEffect, useImperativeHandle, useRef, useState } from 'preact/hooks';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import s from './editor.module.css'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';

export interface EditorRef {
  getValue: () => string;
}

interface EditorProps {
  defaultValue: string;
}

const extensions = [
  lineNumbers(),
  history(),
  closeBrackets(),
  highlightActiveLine(),
  oneDark,
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    indentWithTab,
  ])
]

export const Editor = forwardRef<EditorRef, EditorProps>(({
  defaultValue,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView>()

  useImperativeHandle(ref, () => ({
    getValue: () => viewRef.current?.state.doc.toString() ?? '',
  }))

  useEffect(() => {
    const view = new EditorView({
      state: EditorState.create({
        doc: defaultValue,
        extensions,
      }),
    })

    containerRef.current?.appendChild(view.dom)
    viewRef.current = view
  }, [])

  return (
    <div ref={containerRef} className={s.container} />
  )
})
