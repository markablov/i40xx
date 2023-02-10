import { useCallback, useRef } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-searchbox';
import { Button } from 'react-bulma-components';

import AssemblyMode from './AssemblyMode/AssemblyMode.js';
import SampleCode from './SampleCode.js';
import emulator from '../../services/emulator.js';
import editorStore from '../../stores/editorStore.js';
import emulatorStore from '../../stores/emulatorStore.js';
import compilerStore from '../../stores/compilerStore.js';

import './Editor.css';

/*
 * Handle for save operation
 */
const handleSave = (editor) => (editor ? localStorage.setItem('source_code', editor.getValue()) : null);

/*
 * Checks if emulator is running and in debug mode
 */
const isDebugging = () => {
  const { isRunning, runningMode } = emulatorStore.getRawState();
  return isRunning && runningMode === 'debug';
};

/*
 * Configure shortcuts for editor
 */
const setupEditorShortcuts = (editor) => {
  // ACE editor already have Ctrl+D to remove line, but i prefer Ctrl+Y
  editor.commands.addCommand({
    bindKey: { mac: 'Command-Y', win: 'Ctrl-Y' },
    exec: () => editor.removeLines(),
    multiSelectAction: 'forEachLine',
    name: 'removeline2',
    scrollIntoView: 'cursor',
  });

  editor.commands.addCommand({
    bindKey: { mac: 'F7', win: 'F7' },
    exec: () => isDebugging() && emulator.stepInto(),
    multiSelectAction: 'forEach',
    name: 'emulatorStepInto',
    readOnly: true,
    scrollIntoView: 'cursor',
  });

  editor.commands.addCommand({
    bindKey: { mac: 'F8', win: 'F8' },
    exec: () => isDebugging() && emulator.stepOver(),
    multiSelectAction: 'forEach',
    name: 'emulatorStepOver',
    readOnly: true,
    scrollIntoView: 'cursor',
  });

  editor.commands.addCommand({
    bindKey: { mac: 'F9', win: 'F9' },
    exec: () => isDebugging() && emulator.continueExec(),
    multiSelectAction: 'forEach',
    name: 'emulatorContinue',
    readOnly: true,
  });

  editor.commands.addCommand({
    bindKey: { mac: 'Cmd-S', win: 'Ctrl-S' },
    exec: () => handleSave(editor),
    multiSelectAction: 'forEach',
    name: 'save',
  });
};

/*
 * Creates handler for clicks on gutter (to set/unset breakpoints)
 */
const createGutterClickHandler = (session) => (e) => {
  const { row } = e.getDocumentPosition();
  if (session.getBreakpoints()[row]) {
    editorStore.update((state) => {
      state.breakpoints.delete(row + 1);
    });

    session.clearBreakpoint(row);
  } else {
    editorStore.update((state) => {
      state.breakpoints.add(row + 1);
    });

    session.setBreakpoint(row);
  }

  return e.preventDefault();
};

/*
 * Subscribes to changes, caused by emulator and process them accordingly
 *   (updates currently executed line, shows errors, etc...)
 */
const handleEmulatorUpdates = (editor, session) => {
  compilerStore.subscribe(
    (state) => state.errors,
    (errors) => session.setAnnotations((errors || []).map((error) => ({ ...error, type: 'error' }))),
  );

  emulatorStore.subscribe(
    (state) => state.isRunning,
    (isRunning, state) => {
      Object.values(session.getMarkers() || {}).forEach(({ id }) => session.removeMarker(id));
      editor.setReadOnly(isRunning && state.runningMode === 'debug');
    },
  );

  emulatorStore.subscribe(
    (state) => state.registers.pc,
    (pc, state) => {
      if (!state.isRunning || state.runningMode !== 'debug') {
        return;
      }

      // remove previous line highlight
      Object.values(session.getMarkers() || {}).forEach(({ id }) => session.removeMarker(id));

      const line = compilerStore.getRawState().sourceCodeLineByRomOffsetMap.get(pc);
      if (line === undefined || line === -1) {
        return;
      }

      const row = line - 1;
      session.highlightLines(row, row);
      editor.moveCursorTo(row, 0);
      editor.clearSelection();
      if (!editor.isRowFullyVisible(row)) {
        editor.scrollToLine(row);
      }
    },
  );
};

/*
 * Configure settings for ACE editor
 */
const setupEditor = (editor) => {
  const session = editor.getSession();
  session.setMode(new AssemblyMode());
  session.setTabSize(2);

  editor.renderer.setOptions({ fixedWidthGutter: true, showPrintMargin: false });

  editor.$blockScrolling = Infinity;
  editor.on('guttermousedown', createGutterClickHandler(session));
  editor.setValue(localStorage.getItem('source_code') || SampleCode, -1);

  setupEditorShortcuts(editor);
  handleEmulatorUpdates(editor, session);
};

export default function Editor() {
  const editorRef = useRef(null);

  const setEditorRef = useCallback((node) => {
    if (!node) {
      return;
    }

    const { editor } = node;
    editorRef.current = editor;
    editorStore.update((state) => {
      state.editor = editor;
      state.breakpoints = new Set();
    });

    setupEditor(editor);
  }, []);

  return (
    <>
      <AceEditor ref={setEditorRef} height="1024px" mode="text" name="editor" theme="monokai" width="auto" />
      <div className="buttons">
        <Button color="success" onClick={() => handleSave(editorRef?.current)}>Save</Button>
      </div>
    </>
  );
}
