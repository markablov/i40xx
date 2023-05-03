import { useState, useEffect } from 'react';
import { Form, Table, Button } from 'react-bulma-components';

import emulatorStore from '../../stores/emulatorStore.js';
import { toHex, padHex } from '../../utilities/string.js';

const WATCHERS_STORAGE_KEY = 'watchers';

export default function Memory() {
  const [watchName, setWatchName] = useState('');
  const [watchSpec, setWatchSpec] = useState('');
  const [watchers, setWatchers] = useState(() => JSON.parse(localStorage.getItem(WATCHERS_STORAGE_KEY)) || []);

  const { isRunning, memory, registers } = emulatorStore.useState(
    (state) => ({ isRunning: state.isRunning, memory: state.ram, registers: state.registers }),
  );

  useEffect(() => localStorage.setItem(WATCHERS_STORAGE_KEY, JSON.stringify(watchers)), [watchers]);

  const handleAddWatcherClick = () => {
    setWatchers([...watchers, { name: watchName, spec: watchSpec }]);
    setWatchSpec('');
    setWatchName('');
  };

  const renderedWatchers = new Map();
  const renderWatcher = (name, spec) => {
    if (!spec.includes(',')) {
      const [, var1, op, var2] = spec.match(/(\w+)\s*([+\-%*])\s*(\w+)/);

      if (!renderedWatchers.has(var1)) {
        renderWatcher(var1, watchers.find((watcher) => watcher.name === var1).spec);
      }

      if (!renderedWatchers.has(var2)) {
        renderWatcher(var2, watchers.find((watcher) => watcher.name === var2).spec);
      }

      const val1 = parseInt(renderedWatchers.get(var1), 16);
      const val2 = parseInt(renderedWatchers.get(var2), 16);

      let computedValue = 0;
      switch (op) {
        case '%':
          computedValue = val1 % val2;
          break;
        case '+':
          computedValue = val1 + val2;
          break;
        case '-':
          computedValue = val1 - val2;
          break;
        case '*':
          computedValue = val1 * val2;
          break;
        default:
          break;
      }

      const renderedValue = padHex(computedValue || 0, 4);
      renderedWatchers.set(name, renderedValue);
      return;
    }

    const parts = spec.split(',').map((part) => part.trim());
    const words = parts.map((part) => {
      const [, regNo] = part.match(/rr(\d+)/) || [];
      if (regNo) {
        return toHex(registers.indexBanks?.[registers.selectedRegisterBank][regNo]);
      }

      const [, bankNo, memRegNo, charSpec] = part.match(/\[(\d)([0-9A-F])]:((?:s\d)|(?:[0-9A-F]))/);
      if (charSpec[0] === 's') {
        return toHex(memory[Number(bankNo)]?.registers[parseInt(memRegNo, 16)]?.status[Number(charSpec[1])] || 0);
      }

      return toHex(memory[Number(bankNo)]?.registers[parseInt(memRegNo, 16)]?.main[parseInt(charSpec, 16)] || 0);
    });

    const renderedValue = words.join('');
    renderedWatchers.set(name, renderedValue);
  };

  for (const { name, spec } of watchers) {
    if (renderedWatchers.has(name)) {
      continue;
    }

    renderWatcher(name, spec);
  }

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
              <td>{ isRunning && renderedWatchers.get(name) }</td>
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
