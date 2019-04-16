import System from './system.js';

let system;

const sendState = () =>
  postMessage({ command: 'state', registers: system.registers, ram: system.memory, selectedBank: system.selectedBank });

const commands = {
  run: ({ mode, dump }) => {
    if (mode !== 'debug' && mode !== 'run')
      throw 'Unknown emulator mode';

    system = new System(dump);

    sendState();

    if (mode === 'run') {
      while (!system.isFinished())
        system.instruction();

      sendState();
      postMessage({ command: 'finish' });
    }
  },

  stop: () => {
    system = null;
    postMessage({ command: 'finish' });
  },

  continue: () => {
    while (!system.isFinished())
      system.instruction();

    sendState();
    postMessage({ command: 'finish' });
  },

  step: () => {
    if (!system.isFinished()) {
      system.instruction();
      sendState();
    } else
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
