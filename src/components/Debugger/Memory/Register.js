import PropTypes from 'prop-types';
import React from 'react';
import cx from 'classnames';

import FramedBox from '../../UI/FramedBox/FramedBox.js';
import { toHex } from '../../../utilities/string.js';

import './Register.css';

function Register({ data, index }) {
  return (
    <FramedBox narrow title={`Register #${index}`}>
      { data.main.slice(0, 10).map(toHex).map((x, i) => <span key={`reg-${index}-char-${i}`} className={cx('character', { zero: +x === 0 })}>{x}</span>) }
      <br />
      { data.main.slice(10).map(toHex).map((x, i) => <span key={`reg-${index}-char-${i + 10}`} className={cx('character', { zero: +x === 0 })}>{x}</span>) }
      <span className="statusCharacters">
        { data.status.map(toHex).map((x, i) => <span key={`reg-${index}-status-${i}`} className={cx('character', { zero: +x === 0 })}>{x}</span>) }
      </span>
    </FramedBox>
  );
}

Register.propTypes = {
  data: PropTypes.shape({
    main: PropTypes.arrayOf(PropTypes.number),
    status: PropTypes.arrayOf(PropTypes.number),
  }).isRequired,

  index: PropTypes.number.isRequired,
};

export default Register;
