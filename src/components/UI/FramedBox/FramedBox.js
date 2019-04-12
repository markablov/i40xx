import React from 'react';
import cx from 'classnames';

import './FramedBox.css';

const FramedBox = ({ children, title, narrow }) => (
  <div className={cx('framedBox', { 'is-inline-block': narrow !== undefined })}>
    <h1><span>{title}</span></h1>
    {children}
  </div>
);

export default FramedBox;
