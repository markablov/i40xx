import React, { Component } from 'react';
import Button from 'react-bulma-components/lib/components/button';

class General extends Component {
  handleBuild = () => {
  };

  render() {
    return (
      <>
        <Button color="warning" onClick={this.handleBuild}>Build</Button>
      </>
    );
  }
}

export default General;
