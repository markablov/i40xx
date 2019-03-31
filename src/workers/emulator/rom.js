import { SYNC, D0, D1, D2, D3 } from './cpu/pins.js';

class ROM {
  constructor(cpuPins) {
    this.cpu = cpuPins;
    this.data = new Uint8Array(0);
    this.state = 0;
    this.address = 0;
  }

  /*
   * Check if provided address is in range for ROM
   */
  isAddressValid(address) {
    return address > 0 && address < this.data.length;
  }

  /*
   * Load dump to ROM
   */
  loadDump(dump) {
    this.data = dump;
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
        this.address = this.cpu.getPinsData([D0, D1, D2, D3]);
        break;
      // A2 stage
      case 1:
        this.address |= (this.cpu.getPinsData([D0, D1, D2, D3]) << 4);
        break;
      // A3 stage
      case 2:
        this.address |= (this.cpu.getPinsData([D0, D1, D2, D3]) << 8);
        break;
      // M1 stage
      case 3:
        if (!this.isAddressValid(this.address))
          throw `Address ${this.address} is not valid`;
        this.cpu.setPinsData([D0, D1, D2, D3], this.data[this.address] >> 4);
        break;
      // M2 stage
      case 4:
        this.cpu.setPinsData([D0, D1, D2, D3], this.data[this.address] & 0xF);
        break;
    }

    this.state++;
  }
}

export default ROM;
