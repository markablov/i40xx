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

    postMessage({ command: 'state', registers: cpu.registers, ram: ram.banks });

    const tick = () => {
      cpu.tick();
      rom.tick();
      ram.tick();
    };

    // initial tick to set SYNC signal and on next tick it would be A1 stage and first machine cycle
    tick();

    while (rom.isAddressValid(cpu.registers.pc)) {
      // every machine cycle has 8 stages
      for (let stage = 0; stage < 8; stage++)
        tick();
    }

    postMessage({ command: 'state', registers: cpu.registers, ram: ram.banks });
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
