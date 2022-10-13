import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';

import Register from './Register.js';
import FramedBox from '../../UI/FramedBox/FramedBox.js';

import './Memory.css';

function Memory({ ram, selectedBank }) {
  return (
    <>
      {
        ram.map(({ registers, selectedCharacter, selectedRegister }, bankIdx) => (
          <FramedBox key={`ram-bank-${bankIdx}`} narrow active={selectedBank === bankIdx} title={`Bank #${bankIdx}`}>
            <div className="memoryBank">
              {
                registers.map((reg, regIdx) => (
                  <>
                    {(regIdx && regIdx % 4 === 0) ? <div className="registerSeparator" /> : null}
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
};

Memory.defaultProps = {
  selectedBank: 0,
};

const mapFn = connect(({ emulator: { ram, selectedBank } }) => ({ ram, selectedBank }));

export default mapFn(Memory);
