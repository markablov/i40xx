import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Field, Control, Select } from 'react-bulma-components/lib/components/form';

import selectMemoryBank from '../../../redux/actions/selectMemoryBank.js';

class Memory extends Component {
  handleBankSelect = ({ target: { value } }) => {
    this.props.selectMemoryBank(value);
  };

  render(){
    const { emulator: { ram }, selectedMemoryBank } = this.props;

    return (
      <>
        <Field>
          <Control>
            <Select onChange={this.handleBankSelect} value={selectedMemoryBank}>
              { Array.from(Array(ram.length), (_, idx) => <option value={idx} key={`ram-bank-${idx}`}>Bank #{idx}</option>) }
            </Select>
          </Control>
        </Field>
      </>
    );
  }
}

export default connect(({ emulator, selectedMemoryBank }) => ({ emulator, selectedMemoryBank }), { selectMemoryBank })(Memory);
