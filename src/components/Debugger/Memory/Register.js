import React from 'react';
import cx from 'classnames';

import FramedBox from '../../UI/FramedBox/FramedBox.js';
import { toHex } from '../../../utilities/string.js';

import './Register.css';

const Register = ({ data, index }) => (
  <FramedBox title={`Register #${index}`} narrow={true}>
    { data.main.slice(0, 10).map(toHex).map((x, i) => <span key={`reg-${index}-char-${i}`} className={cx('character', { zero: +x === 0 })}>{x}</span>) }
    <br/>
    { data.main.slice(10).map(toHex).map((x, i) => <span key={`reg-${index}-char-${i + 10}`} className={cx('character', { zero: +x === 0 })}>{x}</span>) }
    <span className="statusCharacters">
      { data.status.map(toHex).map((x, i) => <span key={`reg-${index}-status-${i}`} className={cx('character', { zero: +x === 0 })}>{x}</span>) }
    </span>
  </FramedBox>
);

export default Register;
