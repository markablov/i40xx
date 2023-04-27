/* eslint-disable no-console */

export const runWithProfiler = (system, symbols) => {
  const { registers } = system;
  const labelByOffset = Object.fromEntries(symbols.map(({ label, romAddress }) => [romAddress, label]));

  const stacktraces = new Map();
  const calls = new Map();
  const currentStack = [];
  let currentSP = 0;

  while (!system.isFinished()) {
    system.instruction();

    if (currentSP < registers.sp) {
      const functionName = labelByOffset[registers.pc] || 'unknown';
      calls.set(functionName, (calls.get(functionName) || 0n) + 1n);
      currentStack.push({
        name: functionName,
        entranceCycle: system.instructionCycles,
        subroutinesExecutionCycles: 0n,
      });
      currentSP = registers.sp;
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
