import React, { Component } from 'react';
import { connect } from 'react-redux';
import Button from 'react-bulma-components/lib/components/button';

import { compile } from '../../services/compiler.js';
import { run } from '../../services/emulator.js';

class General extends Component {
  handleBuild = () => compile(this.props.editor.getValue());

  handleRun = () => run(this.props.dump);

  render() {
    const { editor, dump, emulator } = this.props;

    return (
      <div className="buttons">
        <Button color="warning" onClick={this.handleBuild} disabled={!editor}>Build</Button>
        <Button color="success" onClick={this.handleRun} disabled={!dump || emulator.running}>Run</Button>
      </div>
    );
  }
}

export default connect(state => ({ editor: state.editor, dump: state.dump, emulator: state.emulator }))(General);
