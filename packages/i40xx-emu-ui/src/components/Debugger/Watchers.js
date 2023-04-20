import { useState, useEffect } from 'react';
import { Form, Table, Button } from 'react-bulma-components';

import emulatorStore from '../../stores/emulatorStore.js';

const WATCHERS_STORAGE_KEY = 'watchers';

export default function Memory() {
  const [watchName, setWatchName] = useState('');
  const [watchSpec, setWatchSpec] = useState('');
  const [watchers, setWatchers] = useState(() => JSON.parse(localStorage.getItem(WATCHERS_STORAGE_KEY)) || []);

  const { isRunning, registers } = emulatorStore.useState(
    (state) => ({ isRunning: state.isRunning, registers: state.registers }),
  );

  const handleAddWatcherClick = () => {
    setWatchers([...watchers, { name: watchName, spec: watchSpec }]);
    setWatchSpec('');
    setWatchName('');
  };

  const renderWatcher = (spec) => {
    const parts = spec.split(',').map((part) => part.trim());
    const words = parts.map((part) => {
      const [, regNo] = part.match(/rr(\d+)/) || [];
      return registers.indexBanks?.[registers.selectedRegisterBank][regNo].toString(16).toUpperCase();
    });
    return words.join('');
  };

  useEffect(() => localStorage.setItem(WATCHERS_STORAGE_KEY, JSON.stringify(watchers)), [watchers]);

  return (
    <Table bordered={false} size="narrow" striped={false}>
      <tbody>
        <tr>
          <td>
            <Form.Input onChange={(e) => setWatchName(e.target.value)} placeholder="Name" type="text" value={watchName} />
          </td>
          <td>
            <Form.Input onChange={(e) => setWatchSpec(e.target.value)} placeholder="Spec" type="text" value={watchSpec} />
          </td>
          <td />
          <td>
            <Button color="success" onClick={handleAddWatcherClick}>+</Button>
          </td>
        </tr>
        {
          watchers.map(({ name, spec }, watcherIdx) => (
            <tr key={`watcher-${watcherIdx}`}>
              <td>{name}</td>
              <td>{spec}</td>
              <td>{ isRunning && renderWatcher(spec) }</td>
              <td>
                <Button color="warning" onClick={() => setWatchers(watchers.filter((_, idx) => idx !== watcherIdx))}>
                  -
                </Button>
              </td>
            </tr>
          ))
        }
      </tbody>
    </Table>
  );
}
