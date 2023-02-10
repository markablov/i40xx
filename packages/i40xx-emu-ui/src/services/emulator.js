import emulatorStore from '../stores/emulatorStore.js';
import compilerStore from '../stores/compilerStore.js';
import editorStore from '../stores/editorStore.js';

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

const convertBreakpointsFromLineToOffset = (lineBreakpoints) => {
  const { romOffsetBySourceCodeMap } = compilerStore.getRawState();
  return new Set([...lineBreakpoints].map((line) => romOffsetBySourceCodeMap.get(line)));
};

editorStore.subscribe(
  (state) => state.breakpoints,
  (breakpoints) => {
    worker.postMessage({ breakpoints: convertBreakpointsFromLineToOffset(breakpoints), command: 'breakpoints' });
  },
);

const run = (dump, mode = 'run') => {
  emulatorStore.update((state) => {
    state.isRunning = true;
    state.runningMode = mode;
    state.error = '';
    state.IOLog = [];
  });

  worker.postMessage({
    breakpoints: convertBreakpointsFromLineToOffset(editorStore.getRawState().breakpoints),
    command: 'run',
    dump,
    mode,
    ramDump: emulatorStore.getRawState().initialRam,
  });
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

const continueExec = () => {
  worker.postMessage({ command: 'continue' });
};

export default { continueExec, run, stepInto, stepOver, stop };
