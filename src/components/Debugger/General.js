import React, { Component } from 'react';
import { connect } from 'react-redux';
import Button from 'react-bulma-components/lib/components/button';

class General extends Component {
  handleBuild = () => {
  };

  render() {
    return (
      <>
        <Button color="warning" onClick={this.handleBuild} disabled={!this.props.editor}>Build</Button>
      </>
    );
  }
}

export default connect(state => ({ editor: state.editor }))(General);
