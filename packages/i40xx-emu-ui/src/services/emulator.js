import emulatorStore from '../stores/emulatorStore.js';

const worker = new Worker(new URL('../workers/emulator/emulator.js', import.meta.url), { type: 'module' });

worker.onmessage = ({ data: { command, error, ...rest } }) => {
  if (error) {
    emulatorStore.update((state) => {
      state.error = error;
      state.isRunning = false;
    });
    return;
  }

  switch (command) {
    case 'finish':
      emulatorStore.update((state) => {
        state.isRunning = false;
      });
      break;

    case 'IOOutput':
      emulatorStore.update((state) => {
        state.IOLog.push({ address: state.address, data: state.data, type: state.type });
      });
      break;

    case 'state':
      emulatorStore.update((state) => {
        state.ram = rest.ram;
        state.registers = rest.registers;
        state.selectedRamBank = rest.selectedRamBank;
      });
      break;

    default:
      break;
  }
};

const run = (dump, mode = 'run') => {
  emulatorStore.update((state) => {
    state.isRunning = true;
    state.runningMode = mode;
    state.error = '';
    state.IOLog = [];
  });

  worker.postMessage({ command: 'run', dump, mode, ramDump: emulatorStore.getRawState().initialRam });
};

const stop = () => {
  worker.postMessage({ command: 'stop' });
};

const stepInto = () => {
  worker.postMessage({ command: 'stepInto' });
};

const stepOver = () => {
  worker.postMessage({ command: 'stepOver' });
};

const setBreakpoints = (breakpoints) => {
  worker.postMessage({ breakpoints, command: 'breakpoints' });
};

const continueExec = () => {
  worker.postMessage({ command: 'continue' });
};

export default { continueExec, run, setBreakpoints, stepInto, stepOver, stop };
