import CPUPins, { SYNC, D0, D1, D2, D3 } from './pins.js';

class CPU {
  registers = {
    pc: 0,
    acc: 0,
    index: Array.from(Array(16), () => 0)
  };

  constructor() {
    this._pins = new CPUPins();
    this.syncStep = 0;
  }

  _execute(opr, opa) {
    switch (opr) {
      /*
       * NOP instruction
       */
      case 0x0:
        break;

      /*
       * LDM instruction
       *
       * Rewrite accumulator register with new value, carry flag is unaffected
       */
      case 0xD:
        this.registers.acc = opa;
        break;

      /*
       * XCH instruction
       *
       * Exchange accumulator register and index register, carry flag is unaffected
       */
      case 0xB: {
        const t = this.registers.acc;
        this.registers.acc = this.registers.index[opa];
        this.registers.index[opa] = t;
        break;
      }
      default:
        throw 'Unknown instruction';
    }

    return this.registers.pc + 1;
  }

  get pins() {
    return this._pins;
  }

  /*
   * Main function, that is called every machine cycle
   */
  tick() {
    // generate SYNC signal every 8 cycles
    switch (this.syncStep) {
      // X3 stage
      case 0:
        if (this.opr !== undefined) {
          // decode and execute instruction
          this.registers.pc = this._execute(this.opr, this.opa);
        }
        this._pins.setPin(SYNC, 1);
        break;
      // A1 stage
      case 1:
        this._pins.setPin(SYNC, 0);
        this._pins.setPinsData([D0, D1, D2, D3], this.registers.pc & 0x000F);
        break;
      // A2 stage
      case 2:
        this._pins.setPinsData([D0, D1, D2, D3], (this.registers.pc & 0x00F0) >> 4);
        break;
      // A3 stage
      case 3:
        this._pins.setPinsData([D0, D1, D2, D3], (this.registers.pc & 0x0F00) >> 8);
        break;
      // M1 stage
      case 4:
        // highest 4bit of instruction
        this.opr = this._pins.getPinsData([D0, D1, D2, D3]);
        break;
      // M2 stage
      case 5:
        // lowest 4bit of instruction
        this.opa = this._pins.getPinsData([D0, D1, D2, D3]);
        break;
      // X1 stage
      case 6:
        break;
      // X2 stage
      case 7:
        this.syncStep = -1;
        break;
    }

    this.syncStep++;
  }
}

export default CPU;
