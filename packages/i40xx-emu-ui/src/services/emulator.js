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
        state.IOLog.push({ address: rest.address, data: rest.data, type: rest.type });
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
  const { romOffsetBySourceCodePerBank } = compilerStore.getRawState();
  const emulatorBreakpoints = new Set();

  for (const line of lineBreakpoints) {
    for (const [bankNo, romOffsetBySourceCodeMap] of romOffsetBySourceCodePerBank.entries()) {
      if (romOffsetBySourceCodeMap.has(line)) {
        emulatorBreakpoints.add(`${bankNo}:${romOffsetBySourceCodeMap.get(line)}`);
      }
    }
  }

  return emulatorBreakpoints;
};

editorStore.subscribe(
  (state) => state.breakpoints,
  (breakpoints) => {
    worker.postMessage({ breakpoints: convertBreakpointsFromLineToOffset(breakpoints), command: 'breakpoints' });
  },
);

const run = (romDump, mode = 'run') => {
  emulatorStore.update((state) => {
    state.isRunning = true;
    state.runningMode = mode;
    state.error = '';
    state.IOLog = [];
  });

  worker.postMessage({
    breakpoints: convertBreakpointsFromLineToOffset(editorStore.getRawState().breakpoints),
    command: 'run',
    mode,
    ramDump: emulatorStore.getRawState().initialRam,
    romDump,
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
