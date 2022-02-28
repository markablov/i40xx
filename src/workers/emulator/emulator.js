import System from '../../../libs/emulator/system.js';

let system;
let breakpoints = {};

const sendState = () =>
  postMessage({ command: 'state', ram: system.memory, registers: system.registers, selectedBank: system.selectedBank });

const commands = {
  breakpoints: ({ breakpoints: inputBreakpoints }) => {
    breakpoints = inputBreakpoints;
  },

  continue: () => {
    while (!system.isFinished()) {
      system.instruction();

      if (breakpoints[system.registers.pc]) {
        sendState();
        return;
      }
    }

    sendState();
    postMessage({ command: 'finish' });
  },

  run: ({ dump, mode }) => {
    if (mode !== 'debug' && mode !== 'run') {
      throw 'Unknown emulator mode';
    }

    system = new System(dump);

    system.on('output', ({ address, data, type }) => postMessage({ address, command: 'IOOutput', data, type }));

    sendState();

    if (mode === 'run') {
      while (!system.isFinished()) {
        system.instruction();
      }

      sendState();
      postMessage({ command: 'finish' });
    }
  },

  stepInto: () => {
    if (!system.isFinished()) {
      system.instruction();
      sendState();
    } else {
      postMessage({ command: 'finish' });
    }
  },

  stepOver: () => {
    const currentNestingLevel = system.registers.sp;
    if (!system.isFinished()) {
      system.instruction();
      while (currentNestingLevel !== system.registers.sp) {
        if (system.isFinished()) {
          sendState();
          postMessage({ command: 'finish' });
          return;
        }
        system.instruction();
      }
      sendState();
    } else {
      postMessage({ command: 'finish' });
    }
  },

  stop: () => {
    system = null;
    postMessage({ command: 'finish' });
  },
};

onmessage = ({ data: { command, ...args } }) => {
  try {
    if (!commands[command]) {
      postMessage({ command, error: 'Unknown command' });
      return;
    }

    commands[command](args);
  } catch (err) {
    postMessage({ command, error: err.toString() });
  }
};
