import React, { Component } from 'react';
import { connect } from 'react-redux';
import List from 'react-bulma-components/lib/components/list';

import { formatIOLogEntry } from '../../utilities/formatters.js';

class IO extends Component {
  render(){
    const { emulator: { IOLog } } = this.props;

    return (
      <List>
        {IOLog.map((entry, idx) => <List.Item key={`io-log-entry-${idx}`}>{formatIOLogEntry(entry)}</List.Item>)}
      </List>
    );
  }
}

export default connect(({ emulator }) => ({ emulator }), {})(IO);
