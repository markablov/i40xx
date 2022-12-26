import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Form } from 'react-bulma-components';

import Register from './Register.js';
import FramedBox from '../../UI/FramedBox/FramedBox.js';
import setInitialRamDumpAction from '../../../redux/actions/setInitialRamDump.js';

import './Memory.css';

class Memory extends Component {
  uploadRAMDump = async (file) => {
    const { setInitialRamDump } = this.props;

    const dump = await file.text();
    setInitialRamDump(JSON.parse(dump));
  };

  render() {
    const { ram, selectedBank } = this.props;

    return (
      <>
        <div className="mb-2">
          <Form.InputFile label="Initial RAM dump..." onChange={(e) => this.uploadRAMDump(e.target.files[0])} />
        </div>
        {
          ram.map(({ registers, selectedCharacter, selectedRegister }, bankIdx) => (
            <FramedBox key={`ram-bank-${bankIdx}`} narrow active={selectedBank === bankIdx} title={`Bank #${bankIdx}`}>
              <div className="memoryBank">
                {
                  registers.map((reg, regIdx) => (
                    <>
                      {
                        (regIdx && regIdx % 4 === 0)
                          ? <div key={`ram-bank-${bankIdx}-sep-${regIdx}`} className="registerSeparator" />
                          : null
                      }
                      <Register
                        key={`ram-bank-${bankIdx}-reg-${regIdx}`}
                        data={reg}
                        selectedCharacter={selectedRegister === regIdx ? selectedCharacter : undefined}
                      />
                    </>
                  ))
                }
              </div>
            </FramedBox>
          ))
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
      selectedCharacter: PropTypes.number,
      selectedRegister: PropTypes.number,
    }),
  ).isRequired,

  selectedBank: PropTypes.number,

  setInitialRamDump: PropTypes.func.isRequired,
};

Memory.defaultProps = {
  selectedBank: 0,
};

const mapFn = connect(
  ({ emulator: { ram, selectedBank } }) => ({ ram, selectedBank }),
  { setInitialRamDump: setInitialRamDumpAction },
);

export default mapFn(Memory);
