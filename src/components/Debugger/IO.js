import React, { Component } from 'react';
import { connect } from 'react-redux';
import Panel from 'react-bulma-components/lib/components/panel';

import { formatIOLogEntry } from '../../utilities/formatters.js';

class IO extends Component {
  render(){
    const { emulator: { IOLog } } = this.props;

    return (
      <Panel>
        {IOLog.map((entry, idx) => <Panel.Block key={`io-log-entry-${idx}`}>{formatIOLogEntry(entry)}</Panel.Block>)}
      </Panel>
    );
  }
}

export default connect(({ emulator }) => ({ emulator }), {})(IO);
