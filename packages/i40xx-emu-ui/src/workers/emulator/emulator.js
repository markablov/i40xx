import Emulator from 'i40xx-emu';

let system;
let breakpoints = new Set();

const sendState = () => {
  postMessage({
    command: 'state',
    ram: system.memory,
    registers: system.registers,
    selectedRamBank: system.selectedRamBank,
  });
};

/*
 * Interrupt execution loop to check if there is some messages into channel
 */
const yieldToMacrotasks = () => new Promise((resolve) => {
  setTimeout(() => resolve(), 0);
});

const YIELD_PERIOD_TO_CHECK_FOR_NEW_MESSAGES_IN_EMULATOR_INSTRUCTIONS = 100000;

const commands = {
  breakpoints: ({ breakpoints: inputBreakpoints }) => {
    breakpoints = inputBreakpoints;
  },

  continue: async () => {
    let stepsFromLastChannelCheck = 0;
    while (!system.isFinished()) {
      system.instruction();

      if (breakpoints.has(`${system.registers.selectedRomBank}:${system.registers.pc}`)) {
        sendState();
        return;
      }

      stepsFromLastChannelCheck++;
      if (stepsFromLastChannelCheck % YIELD_PERIOD_TO_CHECK_FOR_NEW_MESSAGES_IN_EMULATOR_INSTRUCTIONS === 0) {
        await yieldToMacrotasks();
        stepsFromLastChannelCheck = 0;
      }
    }

    sendState();
    postMessage({ command: 'finish' });
  },

  run: async ({ breakpoints: inputBreakpoints, mode, ramDump, romDump }) => {
    if (mode !== 'debug' && mode !== 'run') {
      throw 'Unknown emulator mode';
    }

    breakpoints = inputBreakpoints || new Set();

    system = new Emulator({
      ramDump,
      ramOutputHandler: ({ address, data, type }) => postMessage({ address, command: 'IOOutput', data, type }),
      romDump,
    });

    sendState();

    if (mode === 'run') {
      let stepsFromLastChannelCheck = 0;
      while (!system.isFinished()) {
        system.instruction();

        stepsFromLastChannelCheck++;
        if (stepsFromLastChannelCheck % YIELD_PERIOD_TO_CHECK_FOR_NEW_MESSAGES_IN_EMULATOR_INSTRUCTIONS === 0) {
          await yieldToMacrotasks();
          stepsFromLastChannelCheck = 0;
        }
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

  stepOver: async () => {
    const currentNestingLevel = system.registers.sp;
    if (!system.isFinished()) {
      system.instruction();
      let stepsFromLastChannelCheck = 0;

      while (currentNestingLevel !== system.registers.sp) {
        if (system.isFinished()) {
          sendState();
          postMessage({ command: 'finish' });
          return;
        }
        system.instruction();

        stepsFromLastChannelCheck++;
        if (stepsFromLastChannelCheck % YIELD_PERIOD_TO_CHECK_FOR_NEW_MESSAGES_IN_EMULATOR_INSTRUCTIONS === 0) {
          await yieldToMacrotasks();
          stepsFromLastChannelCheck = 0;
        }
      }
      sendState();
    } else {
      postMessage({ command: 'finish' });
    }
  },

  stop: () => {
    system.terminate();
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
