import React, { Component } from 'react';
import { connect } from 'react-redux';
import Button from 'react-bulma-components/lib/components/button';

import { compile } from '../../services/compiler.js';

class General extends Component {
  handleBuild = () => compile(this.props.editor.getValue());

  render() {
    return (
      <>
        <Button color="warning" onClick={this.handleBuild} disabled={!this.props.editor}>Build</Button>
      </>
    );
  }
}

export default connect(state => ({ editor: state.editor }))(General);
