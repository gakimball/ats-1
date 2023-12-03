import { EditorView, basicSetup } from 'codemirror';
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { forwardRef } from 'preact/compat'
import { useEffect, useImperativeHandle, useRef, useState } from 'preact/hooks';
import { indentWithTab } from '@codemirror/commands';
import s from './editor.module.css'

export interface EditorRef {
  getValue: () => string;
}

interface EditorProps {
  defaultValue: string;
}

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
        extensions: [
          basicSetup,
          oneDark,
          keymap.of([indentWithTab]),
        ],
      }),
    })

    containerRef.current?.appendChild(view.dom)
    viewRef.current = view
  }, [])

  return (
    <div ref={containerRef} className={s.container} />
  )
})
