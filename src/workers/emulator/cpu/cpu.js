import CPUPins from './pins.js';

class CPU {
  registers = {
    pc: 0
  };

  constructor() {
    this._pins = new CPUPins();
  }

  get pins() {
    return this._pins;
  }

  /*
   * Main function, that is called every machine cycle
   */
  tick() {
  }
}

export default CPU;
