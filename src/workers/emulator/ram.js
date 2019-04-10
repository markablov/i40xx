import { SYNC, CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3, D0, D1, D2, D3 } from './cpu/pins.js';

class RAM {
  constructor(cpuPins) {
    this.cpu = cpuPins;

    this.banks = Array.from(Array(8), () => ({
      data: Array(256).fill(0),
      selectedRegister: 0,
      selectedCharacter: 0
    }));

    this.state = 0;
  }

  _selectedBank() {
    // if CM_RAM0 is set, it's always bank #0
    if (this.cpu.getPin(CM_RAM0))
      return this.banks[0];

    switch (this.cpu.getPinsData([CM_RAM1, CM_RAM2, CM_RAM3])) {
      // CM_RAM1 => bank #1
      case 0b001: return this.banks[1];
      // CM_RAM2 => bank #2
      case 0b010: return this.banks[2];
      // CM_RAM3 => bank #3
      case 0b100: return this.banks[3];
      // CM_RAM1 + CM_RAM2 => bank #4
      case 0b011: return this.banks[4];
      // CM_RAM1 + CM_RAM3 => bank #5
      case 0b101: return this.banks[5];
      // CM_RAM2 + CM_RAM3 => bank #6
      case 0b110: return this.banks[6];
      // CM_RAM1 + CM_RAM2 + CM_RAM3 => bank #7
      case 0b111: return this.banks[7];
    }
  }

  _execute() {
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
        this.bankForExecution = this._selectedBank();
        if (this.bankForExecution)
          this.opa = this.cpu.getPinsData([D0, D1, D2, D3]);
        break;
      // X1 stage
      case 5:
        break;
      // X2 stage
      case 6: {
        const data = this.cpu.getPinsData([D0, D1, D2, D3]);

        // check if SRC command is executing, in that case need to store chip index and register index in this chip
        this.bankToSetOffset = this._selectedBank();
        if (this.bankToSetOffset)
          this.bankToSetOffset.selectedRegister = data;

        // at M2 we have received instruction to execute, so perform it now
        if (this.bankForExecution) {
          this._execute(this.bankForExecution, this.opa, data);
          this.bankForExecution = null;
        }

        break;
      }
      // X3 stage
      case 7: {
        // check if SRC command is executing, in that case need to store character index in selected register
        if (this.bankToSetOffset) {
          this.bankToSetOffset.selectedCharacter = this.cpu.getPinsData([D0, D1, D2, D3]);
          this.bankToSetOffset = null;
        }
        break;
      }
    }

    this.state++;
  }
}

export default RAM;
