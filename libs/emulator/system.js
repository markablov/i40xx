import EventEmitter from 'eventemitter3';

import ROM from './rom.js';
import RAM from './ram.js';
import CPU from './cpu/cpu.js';

class System extends EventEmitter {
  #terminated = false;

  constructor(dump) {
    super();

    this.cpu = new CPU();
    this.rom = new ROM(this.cpu.pins);
    this.ram = new RAM(this.cpu.pins);
    this.rom.loadDump(dump);
    // initial tick to set SYNC signal and on next tick it would be A1 stage and first machine cycle
    this.#tick();

    this.ram.on('output', this.#onRAMOutput.bind(this));
  }

  #onRAMOutput({ chip, data }) {
    this.emit('output', { address: `${this.selectedBank}:${chip}`, data, type: 'RAM' });
  }

  #tick() {
    this.cpu.tick();
    this.rom.tick();
    this.ram.tick();
  }

  #cycle() {
    // every machine cycle has 8 stages
    for (let stage = 0; stage < 8; stage++) {
      this.#tick();
    }
  }

  instruction() {
    this.#cycle();
    if (this.cpu.isExecutingTwoCycleOperation() && !this.isFinished()) {
      this.#cycle();
    }
  }

  isFinished() {
    return this.#terminated || !this.rom.isAddressValid(this.cpu.registers.pc);
  }

  terminate() {
    this.#terminated = true;
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
