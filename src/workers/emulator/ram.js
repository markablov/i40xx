import { SYNC } from './cpu/pins.js';

class RAM {
  constructor(cpuPins) {
    this.cpu = cpuPins;
    // 8 banks, every bank contains 2^8 = 256 words
    this.banks = Array.from(Array(8), () => ({ data: Array.from(Array(256), () => 0), selectedAddress: 0 }));
    this.state = 0;
  }

  /*
   * Main function, that is called every machine cycle and works with internal state and CPU pins
   */
  tick() {
    if (this.cpu.getPin(SYNC)) {
      this.state = 0;
      return;
    }

    switch (this.state) {
      // A1 stage
      case 0:
        break;
      // A2 stage
      case 1:
        break;
      // A3 stage
      case 2:
        break;
      // M1 stage
      case 3:
        break;
      // M2 stage
      case 4:
        break;
      // X1 stage
      case 5:
        break;
      // X2 stage
      case 6:
        break;
      // X3 stage
      case 7:
        break;
    }

    this.state++;
  }
}

export default RAM;
