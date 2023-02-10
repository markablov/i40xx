import { Store } from 'pullstate';

export default new Store({
  error: '',
  initialRam: null,
  IOLog: [],
  isRunning: false,
  ram: [],
  registers: {},
  runningMode: null,
  selectedRamBank: null,
});
