import React from 'react';
import LoadingOverlay from 'react-loading-overlay';

const CompilingOverlay = ({ children }) => (
  <LoadingOverlay active={false} spinner text='Compiling...'>
    {children}
  </LoadingOverlay>
);

export default CompilingOverlay;
