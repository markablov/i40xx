import ROM from './rom.js';
import RAM from './ram.js';
import CPU from './cpu/cpu.js';

const commands = {
  run: ({ mode, dump }) => {
    if (mode !== 'debug' && mode !== 'run')
      throw 'Unknown emulator mode';

    const cpu = new CPU();
    const rom = new ROM(cpu.pins);
    const ram = new RAM(cpu.pins);

    rom.loadDump(dump);

    postMessage({ command: 'state', registers: cpu.registers });

    while (rom.isAddressValid(cpu.registers.pc)) {
      cpu.tick();
      rom.tick();
      ram.tick();
    }

    postMessage({ command: 'state', registers: cpu.registers });
    postMessage({ command: 'finish' });
  }
};

onmessage = ({ data: { command, ...args } }) => {
  try {
    if (!commands[command])
      return postMessage({ command, error: 'Unknown command' });

    commands[command](args);
  } catch (err) {
    postMessage({ command, error: err.toString() });
  }
};
