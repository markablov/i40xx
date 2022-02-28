import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import LoadingOverlay from 'react-loading-overlay';

function BusyOverlay({ children, isCompiling }) {
  return (
    <LoadingOverlay spinner active={isCompiling} text="Compiling...">
      {children}
    </LoadingOverlay>
  );
}

BusyOverlay.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.element), PropTypes.element]).isRequired,
  isCompiling: PropTypes.bool.isRequired,
};

export default connect((state) => ({ isCompiling: state.compiling }))(BusyOverlay);
