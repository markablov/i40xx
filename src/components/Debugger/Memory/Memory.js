import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Field, Control, Select } from 'react-bulma-components/lib/components/form';

class Memory extends Component {
  handleBankSelect = () => {
  };

  render(){
    const { emulator: { ram } } = this.props;

    return (
      <>
        <Field>
          <Control>
            <Select onChange={this.handleBankSelect}>
              { Array.from(Array(ram.length), (_, idx) => <option value={idx} key={`ram-bank-${idx}`}>Bank #{idx}</option>) }
            </Select>
          </Control>
        </Field>
      </>
    );
  }
}

export default connect(({ emulator }) => ({ emulator }))(Memory);
