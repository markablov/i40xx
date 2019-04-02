import CPUPins, { SYNC, D0, D1, D2, D3 } from './pins.js';

class CPU {
  registers = {
    pc: 0,
    carry: 0,
    acc: 0,
    index: Array.from(Array(16), () => 0),
    stack: [0, 0, 0],
    sp: 0
  };

  constructor() {
    this._pins = new CPUPins();
    this.syncStep = 0;
  }

  _execute(opr, opa) {
    switch (opr) {
      /*
       * NOP instruction (No Operation)
       */
      case 0x0:
        break;

      /*
       * LDM instruction (Load Data to Accumulator)
       */
      case 0xD:
        this.registers.acc = opa;
        break;

      /*
       * LD instruction (Load index register to Accumulator)
       */
      case 0xA:
        this.registers.acc = this.registers.index[opa];
        break;

      /*
       * XCH instruction (Exchange index register and accumulator)
       */
      case 0xB: {
        const t = this.registers.acc;
        this.registers.acc = this.registers.index[opa];
        this.registers.index[opa] = t;
        break;
      }

      /*
       * ADD instruction (Add index register to accumulator with carry)
       */
      case 0x8: {
        const result = this.registers.acc + this.registers.index[opa] + this.registers.carry;
        this.registers.acc = result & 0xF;
        this.registers.carry = +(result > 0xF);
        break;
      }

      /*
       * SUB instruction (Subtract index register to accumulator with borrow)
       *
       * acc = acc - reg - carry = acc + ~reg + ~carry, set carry = 1 if no borrow, 0 otherwise
       */
      case 0x9: {
        const result = this.registers.acc + ((~this.registers.index[opa]) & 0xF) + (this.registers.carry ? 0 : 1);
        this.registers.acc = result & 0xF;
        this.registers.carry = +(result > 0xF);
        break;
      }

      /*
       * INC instruction (Increment index register)
       */
      case 0x6:
        this.registers.index[opa] = (this.registers.index[opa] + 1) & 0xF;
        break;

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
