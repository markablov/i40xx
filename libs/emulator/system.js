import ROM from './rom.js';
import RAM from './ram.js';
import CPU from './cpu/cpu.js';

class System {
  constructor(dump) {
    this.cpu = new CPU();
    this.rom = new ROM(this.cpu.pins);
    this.ram = new RAM(this.cpu.pins);
    this.rom.loadDump(dump);
    // initial tick to set SYNC signal and on next tick it would be A1 stage and first machine cycle
    this._tick();
  }

  _tick() {
    this.cpu.tick();
    this.rom.tick();
    this.ram.tick();
  }

  _cycle() {
    // every machine cycle has 8 stages
    for (let stage = 0; stage < 8; stage++)
      this._tick();
  }

  instruction() {
    this._cycle();
    if (this.cpu.isExecutingTwoCycleOperation() && !this.isFinished())
      this._cycle();
  }

  isFinished() {
    return !this.rom.isAddressValid(this.cpu.registers.pc);
  }

  get registers() {
    return this.cpu.registers;
  }

  get memory() {
    return this.ram.banks;
  }

  get selectedBank() {
    return RAM.getBankNoFromPinsData(this.cpu.registers.ramControl);
  }
}

export default System;
