import React from 'react';
import { connect } from 'react-redux';
import LoadingOverlay from 'react-loading-overlay';

const BusyOverlay = ({ children, isCompiling, isConfigurating }) => (
  <LoadingOverlay active={isCompiling || isConfigurating} spinner text={isCompiling ? 'Compiling...' : 'Configurating...'}>
    {children}
  </LoadingOverlay>
);

export default connect(state => ({ isCompiling: state.compiling, isConfigurating: state.configurating }))(BusyOverlay);
