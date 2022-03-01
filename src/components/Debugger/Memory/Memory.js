import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Form } from 'react-bulma-components';

import selectMemoryBankAction from '../../../redux/actions/selectMemoryBank.js';
import Register from './Register.js';
import FramedBox from '../../UI/FramedBox/FramedBox.js';

const { Control, Field, Select } = Form;

class Memory extends Component {
  handleBankSelect = ({ target: { value } }) => {
    const { selectMemoryBank } = this.props;

    selectMemoryBank(value);
  };

  render() {
    const { ram, selectedMemoryBank } = this.props;

    return (
      <>
        <Field>
          <Control>
            <Select onChange={this.handleBankSelect} value={selectedMemoryBank}>
              {
                Array.from(
                  Array(ram.length),
                  (_, idx) => (<option key={`ram-bank-${idx}`} value={idx}>{`Bank #${idx}`}</option>),
                )
              }
            </Select>
          </Control>
        </Field>
        {
          ram.length
            ? (
              <FramedBox narrow title={`Bank #${selectedMemoryBank}`}>
                {ram[selectedMemoryBank].registers.map((register, idx) => <Register key={`ram-register-${idx}`} data={register} index={idx} />)}
              </FramedBox>
            )
            : null
        }
      </>
    );
  }
}

Memory.propTypes = {
  ram: PropTypes.arrayOf(
    PropTypes.shape({
      registers: PropTypes.arrayOf(
        PropTypes.shape({
          main: PropTypes.arrayOf(PropTypes.number),
          status: PropTypes.arrayOf(PropTypes.number),
        }),
      ),
    }),
  ).isRequired,

  selectedMemoryBank: PropTypes.number.isRequired,
  selectMemoryBank: PropTypes.func.isRequired,
};

const mapFn = connect(
  ({ emulator: { ram }, selectedMemoryBank }) => ({ ram, selectedMemoryBank }),
  { selectMemoryBank: selectMemoryBankAction },
);

export default mapFn(Memory);
