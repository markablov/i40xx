import PropTypes from 'prop-types';
import React from 'react';

import { toHex } from '../../../utilities/string.js';

import './Register.css';

const wrapSelectedChar = (val) => <span className="selectedMemoryChar">{toHex(val)}</span>;

function Register({ data, selectedCharacter }) {
  const statusChars = data.status.map(toHex).join('');
  const mainChars = selectedCharacter !== undefined
    ? data.main.map((val, charIdx) => (charIdx === selectedCharacter ? wrapSelectedChar(val) : toHex(val)))
    : data.main.map(toHex);

  return (
    <div>
      {mainChars}
      |
      {statusChars}
    </div>
  );
}

Register.propTypes = {
  data: PropTypes.shape({
    main: PropTypes.arrayOf(PropTypes.number),
    status: PropTypes.arrayOf(PropTypes.number),
  }).isRequired,

  selectedCharacter: PropTypes.number,
};

Register.defaultProps = {
  selectedCharacter: undefined,
};

export default Register;
