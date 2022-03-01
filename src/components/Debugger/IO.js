import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { Panel } from 'react-bulma-components';

import formatIOLogEntry from '../../utilities/IOLogEntryFormatter.js';

function IO({ IOLog }) {
  return (
    <Panel>
      {IOLog.map((entry, idx) => <Panel.Block key={`io-log-entry-${idx}`}>{formatIOLogEntry(entry)}</Panel.Block>)}
    </Panel>
  );
}

IO.propTypes = {
  IOLog: PropTypes.arrayOf(
    PropTypes.shape({
      address: PropTypes.string,
      data: PropTypes.number,
      type: PropTypes.string,
    }),
  ).isRequired,
};

export default connect(({ emulator: { IOLog } }) => ({ IOLog }), {})(IO);
