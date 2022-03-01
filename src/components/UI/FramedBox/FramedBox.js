import React from 'react';
import cx from 'classnames';
import PropTypes from 'prop-types';

import './FramedBox.css';

function FramedBox({ children, narrow, title }) {
  return (
    <div className={cx('framedBox', { 'is-inline-block': narrow !== undefined })}>
      <h1><span>{title}</span></h1>
      {children}
    </div>
  );
}

FramedBox.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.element), PropTypes.element]).isRequired,
  narrow: PropTypes.bool,
  title: PropTypes.string.isRequired,
};

FramedBox.defaultProps = {
  narrow: false,
};

export default FramedBox;
