import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Notification } from 'react-bulma-components';

function CompilerInfo({ compilerErrors }) {
  return compilerErrors?.length
    ? (
      <Notification color="danger">
        {compilerErrors.map(({ text }) => <div>{text}</div>)}
      </Notification>
    )
    : null;
}

CompilerInfo.propTypes = {
  compilerErrors: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string })).isRequired,
};

const mapFn = connect(({ compilerErrors }) => ({ compilerErrors }));

export default mapFn(CompilerInfo);
