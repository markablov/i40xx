import CPUPins, { SYNC } from './pins.js';

class CPU {
  registers = {
    pc: 0
  };

  constructor() {
    this._pins = new CPUPins();
    this.syncStep = 0;
  }

  get pins() {
    return this._pins;
  }

  /*
   * Main function, that is called every machine cycle, by phi1 clock
   */
  tick1() {
    // generate SYNC signal every 8 cycles
    switch (this.syncStep) {
      case 0:
        this._pins.setPin(SYNC, 1);
        break;
      case 1:
        this._pins.setPin(SYNC, 0);
        break;
      case 8:
        this.syncStep = -1;
        break;
    }

    this.syncStep++;
  }

  /*
   * Main function, that is called every machine cycle, by phi2 clock
   */
  tick2() {
  }
}

export default CPU;
