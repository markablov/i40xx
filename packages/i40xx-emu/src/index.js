import ROM from './rom.js';
import RAM from './ram.js';
import CPU from './cpu/cpu.js';

class System {
  #cpu;

  #rom;

  #ram;

  #terminated = false;

  #instructionCycles = 0n;

  constructor({ romDump, ramDump, ramOutputHandler }) {
    this.#cpu = new CPU();
    this.#rom = new ROM(this.#cpu.pins);
    this.#rom.loadDump(romDump);

    this.#ram = new RAM(
      this.#cpu.pins,
      ramDump,
      ({ chip, data }) => ramOutputHandler?.({ address: `${this.selectedBank}:${chip}`, data, type: 'RAM' }),
    );

    // initial tick to set SYNC signal and on next tick it would be A1 stage and first machine cycle
    this.#tick();
  }

  #tick() {
    this.#cpu.tick();
    this.#rom.tick();
    this.#ram.tick();
  }

  #cycle() {
    // every machine cycle has 8 stages
    for (let stage = 0; stage < 8; stage++) {
      this.#tick();
    }

    this.#instructionCycles += 1n;
  }

  instruction() {
    this.#cycle();
    if (this.#cpu.isExecutingTwoCycleOperation() && !this.isFinished()) {
      this.#cycle();
    }
  }

  isFinished() {
    return this.#terminated || !this.#rom.isAddressValid(this.#cpu.registers.pc);
  }

  terminate() {
    this.#terminated = true;
  }

  get registers() {
    return this.#cpu.registers;
  }

  get memory() {
    return this.#ram.banks;
  }

  get selectedBank() {
    return RAM.getBankNoFromPinsData(this.#cpu.registers.ramControl);
  }

  get instructionCycles() {
    return this.#instructionCycles;
  }
}

export default System;
