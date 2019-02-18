import React, { Component } from 'react';
import AceEditor from 'react-ace';
import 'brace/mode/javascript';
import 'brace/theme/monokai';

import GutterRenderer from './GutterRenderer.js';
import OffsetCalculator from './OffsetCalculator.js';
import AssemblyMode from './AssemblyMode/AssemblyMode.js';

const TEST_SOURCE_CODE = `  NOP
  LDM 9
  // test comment
  LD r0
  XCH r1
  ADD r2
  SUB r3
  INC r4
  # test comment 1
  BBL 0xF
  JIN rr0
  SRC rr1
  FIN rr2
  JUN label1
  JMS 00:0xFF
  JCN NZ, label2 // test comment 2
  ISZ r9, 123
  FIM rr7, label3
label1:
  RDM
  RD0
  RD1
  RD2
  RD3
  RDR
  WRM
  WR0
  WR1
  WR2
label2: WR3
  WRR
  WMP
  ADM
  SBM
  CLB
  CLC
  CMC
  STC
  CMA
  IAC
  DAC
  RAL
label3:  
  RAR
  TCC
  DAA
  TCS
  KBP
  DCL`;

class Editor extends Component {
  editorRef = React.createRef();
  offsetCalculator = new OffsetCalculator();

  get editor(){
    return this.editorRef.current.editor;
  }

  componentDidMount() {
    const editor = this.editor, session = editor.getSession();

    session.setMode(new AssemblyMode());

    const gutterRenderer = new GutterRenderer(editor);

    // we want to show ROM offset for instructions, so need to change
    // gutter with line numbers to custom renderer
    // (gutter annotations / decorations adds just css class, but don't change text)
    editor.renderer.$gutterLayer.$renderer = gutterRenderer;
    editor.on('changeSelection', () => gutterRenderer.update());
    gutterRenderer.update();

    session.on('change', delta => {
      this.offsetCalculator.update(delta);
      if (this.offsetCalculator.updated)
        gutterRenderer.update();
    });

    editor.setValue(TEST_SOURCE_CODE);
  }

  render(){
    return (
      <>
        <AceEditor mode="javascript" theme="monokai" name="editor" width="auto" ref={this.editorRef} />
      </>
    );
  }
}

export default Editor;
