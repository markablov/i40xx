import System from './system.js';

let system;

const commands = {
  run: ({ mode, dump }) => {
    if (mode !== 'debug' && mode !== 'run')
      throw 'Unknown emulator mode';

    system = new System(dump);

    postMessage({ command: 'state', registers: system.registers, ram: system.memory });

    while (!system.isFinished())
      system.cycle();

    postMessage({ command: 'state', registers: system.registers, ram: system.memory });
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
