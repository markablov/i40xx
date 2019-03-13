import i4004 from './cpu/4004.js';
import i4001 from './rom/4001.js';
import Bus from './bus.js';

const CPU_CLASS_MAP = { 4004: i4004 };
const ROM_CLASS_MAP = { 4001: i4001 };

let bus, components = [];

const commands = {
  configure: ({ cpu, rom }) => {
    const cpuClass = CPU_CLASS_MAP[cpu.chip], romClass = ROM_CLASS_MAP[rom.chip];
    bus = new Bus();
    components = [];
    components.push(new cpuClass(bus));
    components.push(Array.from(Array(rom.amount || 1), () => new romClass(bus)));
  }
};

onmessage = ({ data: { command, ...args } }) => {
  try {
    if (!commands[command])
      return postMessage({ command, error: 'Unknown command' });

    commands[command](...args);

    postMessage({ command });
  } catch (err) {
    postMessage({ command, error: err.toString() });
  }
};
