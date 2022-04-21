import React from 'react';
import cx from 'classnames';
import PropTypes from 'prop-types';

import './FramedBox.css';

function FramedBox({ active, children, narrow, title }) {
  return (
    <div className={cx('framedBox', { active, 'is-inline-block': narrow !== undefined })}>
      <h1><span>{title}</span></h1>
      {children}
    </div>
  );
}

FramedBox.propTypes = {
  active: PropTypes.bool,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
  narrow: PropTypes.bool,
  title: PropTypes.string.isRequired,
};

FramedBox.defaultProps = {
  active: false,
  narrow: false,
};

export default FramedBox;
