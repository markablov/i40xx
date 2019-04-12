import React from 'react';

import FramedBox from '../../UI/FramedBox/FramedBox.js';
import { toHex } from '../../../utilities/string.js';

import './Register.css';

const Register = ({ data, index }) => (
  <FramedBox title={`Register #${index}`} narrow={true}>
    <span>{data.main.slice(0, 10).map(toHex).join(' ')}</span>
    <br/>
    <span>{data.main.slice(10).map(toHex).join(' ') + ' '}</span>
    <span className="statusCharacters">{data.status.map(toHex).join(' ')}</span>
  </FramedBox>
);

export default Register;
