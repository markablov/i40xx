import { Panel } from 'react-bulma-components';

import formatIOLogEntry from '../../utilities/IOLogEntryFormatter.js';
import emulatorStore from '../../stores/emulatorStore.js';

export default function IO() {
  const IOLog = emulatorStore.useState((state) => state.IOLog);

  return (
    <Panel>
      {IOLog.map((entry, idx) => <Panel.Block key={`io-log-entry-${idx}`}>{formatIOLogEntry(entry)}</Panel.Block>)}
    </Panel>
  );
}
