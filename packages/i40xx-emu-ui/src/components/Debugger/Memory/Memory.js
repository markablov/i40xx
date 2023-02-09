import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Form } from 'react-bulma-components';

import Register from './Register.js';
import FramedBox from '../../UI/FramedBox/FramedBox.js';
import setInitialRamDumpAction from '../../../redux/actions/setInitialRamDump.js';

import './Memory.css';

class Memory extends Component {
  state = { uploadedRAMDumpName: '' };

  uploadRAMDump = async (file) => {
    const { setInitialRamDump } = this.props;

    const dump = await file.text();
    setInitialRamDump(JSON.parse(dump));

    this.setState({ uploadedRAMDumpName: file.name });
  };

  render() {
    const { ram, selectedBank } = this.props;
    const { uploadedRAMDumpName } = this.state;

    return (
      <>
        <div className="mb-2">
          <Form.InputFile label="Initial RAM dump..." onChange={(e) => this.uploadRAMDump(e.target.files[0])} />
          <span>
            Loaded dump:
            {uploadedRAMDumpName || 'none'}
          </span>
        </div>
        {
          ram.map(({ registers, selectedCharacter, selectedRegister }, bankIdx) => (
            <FramedBox key={`ram-bank-${bankIdx}`} narrow active={selectedBank === bankIdx} title={`Bank #${bankIdx}`}>
              <div className="memoryBank">
                {
                  registers.map((reg, regIdx) => (
                    <div key={`ram-bank-${bankIdx}-reg-${regIdx}`}>
                      {
                        (regIdx && regIdx % 4 === 0)
                          ? <div className="registerSeparator" />
                          : null
                      }
                      <Register
                        data={reg}
                        selectedCharacter={selectedRegister === regIdx ? selectedCharacter : undefined}
                      />
                    </div>
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
