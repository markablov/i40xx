import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Form } from 'react-bulma-components';

const { Field, Control, Select } = Form;

import selectMemoryBank from '../../../redux/actions/selectMemoryBank.js';
import Register from './Register.js';
import FramedBox from '../../UI/FramedBox/FramedBox.js';

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
        {
          ram.length ?
            <FramedBox title={`Bank #${selectedMemoryBank}`} narrow={true}>
              {ram[selectedMemoryBank].registers.map((register, idx) => <Register data={register} index={idx} key={`ram-register-${idx}`} />)}
            </FramedBox>
            : null
        }
      </>
    );
  }
}

export default connect(({ emulator, selectedMemoryBank }) => ({ emulator, selectedMemoryBank }), { selectMemoryBank })(Memory);
