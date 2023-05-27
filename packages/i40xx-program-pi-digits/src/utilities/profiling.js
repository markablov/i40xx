/* eslint-disable no-console */

const CYCLES_PER_SECOND = 95000n;
const REPORT_FREQ_IN_SECONDS = 100n;

export const runWithProfiler = (system, symbolsPerRom) => {
  const { registers } = system;

  const labelsByRom = symbolsPerRom.map(
    (symbols) => Object.fromEntries(symbols.map(({ label, romAddress }) => [romAddress, label])),
  );

  const stacktraces = new Map();
  const calls = new Map();
  const currentStack = [];
  let currentSP = 0;
  let lastReportTick = 0n;

  while (!system.isFinished()) {
    system.instruction();

    if (currentSP < registers.sp) {
      const currentTick = system.instructionCycles;
      const functionName = labelsByRom[registers.selectedRomBank][registers.pc] || 'unknown';
      calls.set(functionName, (calls.get(functionName) || 0n) + 1n);
      currentStack.push({
        name: functionName,
        entranceCycle: currentTick,
        subroutinesExecutionCycles: 0n,
      });
      currentSP = registers.sp;

      if (currentTick - lastReportTick > REPORT_FREQ_IN_SECONDS * CYCLES_PER_SECOND) {
        console.log(`Elapsed ${currentTick / CYCLES_PER_SECOND} seconds...`);
        lastReportTick = currentTick;
      }
    } else if (currentSP > registers.sp) {
      const stacktrace = currentStack.map(({ name }) => name).join(';');
      const { entranceCycle, subroutinesExecutionCycles } = currentStack.pop();
      const fnTotalExecutionCycles = system.instructionCycles - entranceCycle;
      const fnRawExecutionCycles = fnTotalExecutionCycles - subroutinesExecutionCycles;
      const stacktraceCycles = (stacktraces.get(stacktrace) || 0n) + fnRawExecutionCycles;
      stacktraces.set(stacktrace, stacktraceCycles);
      const parent = currentStack.at(-1);
      if (parent) {
        parent.subroutinesExecutionCycles += fnTotalExecutionCycles;
      }
      currentSP = registers.sp;
    }
  }

  return { stacktraces, calls };
};
