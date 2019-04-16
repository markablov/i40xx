import React, { Component } from 'react';
import { Field, Control, Select } from 'react-bulma-components/lib/components/form';

class Memory extends Component {
  handleBankSelect = () => {
  };

  render(){
    return (
      <>
        <Field>
          <Control>
            <Select onChange={this.handleBankSelect}>
            </Select>
          </Control>
        </Field>
      </>
    );
  }
}

export default Memory;
