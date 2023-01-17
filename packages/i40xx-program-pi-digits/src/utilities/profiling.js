/* eslint-disable no-console */

export const runWithProfiler = (system, labelsOffsets, progressTrackingPC) => {
  const { registers } = system;
  const labelByOffset = Object.fromEntries(Object.entries(labelsOffsets).map(([name, offset]) => [offset, name]));

  const stacktraces = new Map();
  const functionCalls = new Map();
  const currentStack = [];
  let currentSP = 0;
  let iters = 0;

  while (!system.isFinished()) {
    system.instruction();

    if (registers.pc === progressTrackingPC) {
      iters++;
      if (iters % 100 === 0) {
        console.log(`Iterations passed: ${iters}...`);
      }
    }

    if (currentSP < registers.sp) {
      const functionName = labelByOffset[registers.pc] || 'unknown';
      functionCalls.set(functionName, (functionCalls.get(functionName) || 0) + 1);

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

  return { stacktraces, functionCalls };
};
