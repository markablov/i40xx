import { SYNC, D0, D1, D2, D3, CM_ROM1 } from './cpu/pins.js';

class ROM {
  state = 0;

  address = 0;

  banks = [new Uint8Array(0), new Uint8Array(0)];

  selectedBank = 0;

  constructor(cpuPins) {
    this.cpu = cpuPins;
  }

  /*
   * Check if provided address is in range for ROM
   */
  isAddressValid(address) {
    return address >= 0 && address < this.banks[this.selectedBank].length;
  }

  /*
   * Load dump to ROM
   */
  loadDump(banks) {
    this.banks = banks;
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
        this.selectedBank = this.cpu.getPin(CM_ROM1) === 1 ? 1 : 0;
        if (!this.isAddressValid(this.address)) {
          throw `Address ${this.address} is not valid`;
        }

        this.cpu.setPinsData([D0, D1, D2, D3], this.banks[this.selectedBank][this.address] >> 4);
        break;
      // M1 stage
      case 3:
        this.cpu.setPinsData([D0, D1, D2, D3], this.banks[this.selectedBank][this.address] & 0xF);
        break;
      // M2 stage
      case 4:
        break;
      default:
        break;
    }

    this.state++;
  }
}

export default ROM;
