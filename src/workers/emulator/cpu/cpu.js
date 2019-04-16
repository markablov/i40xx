import CPUPins, { SYNC, D0, D1, D2, D3, CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3 } from './pins.js';

class CPU {
  registers = {
    pc: 0,
    carry: 0,
    acc: 0,
    index: Array.from(Array(16), () => 0),
    stack: [0, 0, 0],
    sp: 0,
    // CM-RAM0 should be selected by default
    ramControl: 0b0001
  };

  constructor() {
    this._pins = new CPUPins();
    this.syncStep = 0;
  }

  // it's circular buffer
  _push(value) {
    this.registers.stack[this.registers.sp] = value;
    this.registers.sp = (this.registers.sp + 1) % this.registers.stack.length;
  }

  _pop() {
    const value = this.registers.stack[this.registers.sp];
    this.registers.sp = (this.registers.sp - 1 + this.registers.stack.length) % this.registers.stack.length;
    return value;
  }

  _add(value) {
    const result = this.registers.acc + value + this.registers.carry;
    this.registers.acc = result & 0xF;
    this.registers.carry = +(result > 0xF);
  }

  // acc = acc - reg - carry = acc + ~reg + ~carry, set carry = 1 if no borrow, 0 otherwise
  _sub(value) {
    this.registers.carry = (~this.registers.carry) & 0x1;
    this._add((~value) & 0xF);
  }

  _getFullAddressFromShort(pm, pl) {
    const ph = (this.registers.pc & 0xF00) + ((this.registers.pc & 0xFF) === 0xFF ? 0x100 : 0);
    return ph | (pm << 4) | (pl);
  }

  /*
   * Return new value for PC if it's 2nd cycle for two-cycle operation or "undefined" otherwise
   */
  _executeTwoCycleOperation(currentOpr, currentOpa) {
    if (!this.previousOp)
      return;

    const { opr: previousOpr, opa: previousOpa, pc: previousPC } = this.previousOp;

    switch (previousOpr) {
      /*
       * FIN instruction (Fetch indirect from ROM)
       */
      case 0x3: {
        // check if it was JIN instruction, which is regular one-cycle operation
        if ((previousOpa & 0x1) !== 0x0)
          return;
        this.registers.index[previousOpa] = currentOpr;
        this.registers.index[previousOpa + 1] = currentOpa;
        return previousPC + 1;
      }

      /*
       * JUN instruction (Jump unconditional)
       */
      case 0x4:
        return (previousOpa << 8) | (currentOpr << 4) | (currentOpa);

      /*
       * JMS instruction (Jump to Subroutine)
       */
      case 0x5:
        this._push(this.registers.pc + 1);
        return (previousOpa << 8) | (currentOpr << 4) | (currentOpa);


      /*
      * JCN instruction (Jump conditional)
      */
      case 0x1: {
        const invert = (previousOpa & 0x8) === 0x8;
        const accIsZero = (previousOpa & 0x4) === 0x4;
        const cfIsSet = (previousOpa & 0x2) === 0x2;
        const cond = (accIsZero && (this.registers.acc === 0)) || (cfIsSet && (this.registers.carry === 1));
        const finalCond = invert ? !cond : cond;
        return finalCond ? this._getFullAddressFromShort(currentOpr, currentOpa) : this.registers.pc + 1;
      }

      /*
       * ISZ instruction (Increment index register skip if zero)
       */
      case 0x7:
        this.registers.index[previousOpa]++;
        return this.registers.index[previousOpa] === 0 ? this.registers.pc + 1 : this._getFullAddressFromShort(currentOpr, currentOpa);

      /*
       * FIM instruction (Fetched immediate from ROM)
      */
      case 0x2:
        // check if it was SRC instruction, which is regular one-cycle operation
        if ((previousOpa & 0x1) === 0x1)
          return;
        this.registers.index[previousOpa] = currentOpr;
        this.registers.index[previousOpa + 1] = currentOpa;
        return this.registers.pc + 1;
    }
  }

  _executeAtX3(opr, opa) {
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
      case 0x8:
        this._add(this.registers.index[opa]);
        break;

      /*
       * SUB instruction (Subtract index register to accumulator with borrow)
       */
      case 0x9:
        this._sub(this.registers.index[opa]);
        break;

      /*
       * INC instruction (Increment index register)
       */
      case 0x6:
        this.registers.index[opa] = (this.registers.index[opa] + 1) & 0xF;
        break;

      /*
       * BBL instruction (Branch back and load data to the accumulator)
       */
      case 0xC:
        this.registers.acc = opa;
        return this._pop();

      /*
       * JIN instruction (Jump indirect) or FIN instruction (Fetch indirect from ROM)
       */
      case 0x3: {
        // for FIN we are using reg pair 0 for indirect addressing
        const reg = (opa & 0x1) === 0x0 ? 0 : opa & 0xE;
        return this._getFullAddressFromShort(this.registers.index[reg], this.registers.index[reg + 1]);
      }

      case 0x2:
        /*
         * SRC instruction (Send register control)
         *
         * At X3 stage we need to send low 4bit of address
         */
        if ((opa & 0x1) === 0x1) {
          this._pins.setPinsData([D0, D1, D2, D3], this.registers.index[(opa & 0xE) + 1]);
          // need to reset CM_RAM lines
          this._pins.setPinsData([CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3], 0);
        }

        /*
         * FIM instruction (Fetched immediate from ROM)
         *
         * It's two-byte operator, wait 2nd byte to come before processing it
         */
        break;

      /*
       * JUN instruction (Jump unconditional)
       *
       * It's two-byte operator, wait 2nd byte to come before processing it
       */
      case 0x4:
        break;

      /*
       * JMS instruction (Jump to Subroutine)
       *
       * It's two-byte operator, wait 2nd byte to come before processing it
       */
      case 0x5:
        break;

      /*
       * JCN instruction (Jump conditional)
       *
       * It's two-byte operator, wait 2nd byte to come before processing it
       */
      case 0x1:
        break;

      /*
       * ISZ instruction (Increment index register skip if zero)
       *
       * It's two-byte operator, wait 2nd byte to come before processing it
       */
      case 0x7:
        break;

      case 0xE:
        switch (opa) {
          /*
           * RDM instruction (Read RAM character)
           */
          case 0x9:
            this.registers.acc = this._pins.getPinsData([D0, D1, D2, D3]);
            break;

          /*
           * RD0 instruction (Read RAM status character 0)
           */
          case 0xC:
            this.registers.acc = this._pins.getPinsData([D0, D1, D2, D3]);
            break;

          /*
           * RD1 instruction (Read RAM status character 1)
           */
          case 0xD:
            this.registers.acc = this._pins.getPinsData([D0, D1, D2, D3]);
            break;

          /*
           * RD2 instruction (Read RAM status character 2)
           */
          case 0xE:
            this.registers.acc = this._pins.getPinsData([D0, D1, D2, D3]);
            break;

          /*
           * RD3 instruction (Read RAM status character 3)
           */
          case 0xF:
            this.registers.acc = this._pins.getPinsData([D0, D1, D2, D3]);
            break;

          /*
           * ADM instruction (Add from memory with carry)
           */
          case 0xB:
            this._add(this._pins.getPinsData([D0, D1, D2, D3]));
            break;

          /*
           * SBM instruction (Subtract from memory with borrow)
           */
          case 0x8:
            this._sub(this._pins.getPinsData([D0, D1, D2, D3]));
            break;
        }
        break;

      case 0xF:
        switch (opa) {
          /*
           * CLB instruction (Clear both)
           */
          case 0x0:
            this.registers.acc = 0;
            this.registers.carry = 0;
            break;

          /*
           * CLC instruction (Clear carry)
           */
          case 0x1:
            this.registers.carry = 0;
            break;

          /*
           * CMC instruction (Complement carry)
           */
          case 0x3:
            this.registers.carry = (~this.registers.carry) & 0x1;
            break;

          /*
           * STC (Set carry)
           */
          case 0xA:
            this.registers.carry = 1;
            break;

          /*
           * CMA (Complement Accumulator)
           */
          case 0x4:
            this.registers.acc = (~this.registers.acc) & 0xF;
            break;

          /*
           * IAC (Increment accumulator)
           */
          case 0x2:
            this._add(1);
            break;

          /*
           * DAC (decrement accumulator)
           */
          case 0x8:
            this._sub(1);
            break;

          /*
           * RAL (Rotate left)
           */
          case 0x5: {
            const oldCarry = this.registers.carry;
            this.registers.carry = this.registers.acc >> 3;
            this.registers.acc = ((this.registers.acc << 1) & 0xF) | oldCarry;
            break;
          }

          /*
           * RAR (Rotate right)
           */
          case 0x6: {
            const oldCarry = this.registers.carry;
            this.registers.carry = this.registers.acc & 0x1;
            this.registers.acc = (this.registers.acc >> 1) | (oldCarry << 3);
            break;
          }

          /*
           * TCC (Transmit carry and clear)
           */
          case 0x7:
            this.registers.acc = this.registers.carry;
            this.registers.carry = 0;
            break;

          /*
           * DAA (Decimal adjust accumulator)
           */
          case 0xB:
            if (this.registers.carry === 1 || this.registers.acc > 9) {
              const result = this.registers.acc + 6;
              this.registers.acc = result & 0xF;
              if (result > 0xF)
                this.registers.carry = 1;
            }
            break;

          /*
           * TCS (Transfer carry subtract)
           */
          case 0x9:
            this.registers.acc = this.registers.carry === 1 ? 10 : 9;
            this.registers.carry = 0;
            break;

          /*
           * KBP (Keyboard process)
           */
          case 0xC:
            switch (this.registers.acc) {
              case 0x0:
                this.registers.acc = 0;
                break;
              case 0x1:
                this.registers.acc = 1;
                break;
              case 0x2:
                this.registers.acc = 2;
                break;
              case 0x4:
                this.registers.acc = 3;
                break;
              case 0x8:
                this.registers.acc = 4;
                break;
              default:
                this.registers.acc = 0xF;
            }
            break;
        }
        break;

      default:
        throw 'Unknown instruction';
    }

    return this.registers.pc + 1;
  }

  _executeAtX2(opr, opa) {
    switch (opr) {
      case 0x2:
        /*
         * SRC instruction (Send register control)
         *
         * At X2 stage we need to send high 4bit of address
         */
        if ((opa & 0x1) === 0x1) {
          this._pins.setPinsData([D0, D1, D2, D3], this.registers.index[opa & 0xE]);
          this._pins.setPinsData([CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3], this.registers.ramControl);
        }
        break;
    }
  }

  _executeAtX1(opr, opa) {
    switch (opr) {
      case 0xE:
        switch (opa) {
          /*
           * WRM instruction (Write accumulator into RAM character)
           */
          case 0x0:
            this._pins.setPinsData([D0, D1, D2, D3], this.registers.acc);
            break;

          /*
           * WR0 instruction (Write accumulator into RAM status character 0)
           */
          case 0x4:
            this._pins.setPinsData([D0, D1, D2, D3], this.registers.acc);
            break;

          /*
           * WR1 instruction (Write accumulator into RAM status character 1)
           */
          case 0x5:
            this._pins.setPinsData([D0, D1, D2, D3], this.registers.acc);
            break;

          /*
           * WR2 instruction (Write accumulator into RAM status character 2)
           */
          case 0x6:
            this._pins.setPinsData([D0, D1, D2, D3], this.registers.acc);
            break;

          /*
           * WR3 instruction (Write accumulator into RAM status character 3)
           */
          case 0x7:
            this._pins.setPinsData([D0, D1, D2, D3], this.registers.acc);
            break;
        }
        break;
    }
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
          const oldPC = this.registers.pc;
          const newPC = this._executeTwoCycleOperation(this.opr, this.opa);

          if (newPC !== undefined) {
            this.registers.pc = newPC;
            this.previousOp = null;
          } else {
            this.registers.pc = this._executeAtX3(this.opr, this.opa);
            this.previousOp = { opr: this.opr, opa: this.opa, pc: oldPC };
          }
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
        // if it's I/O or RAM instruction we need to trigger CM-RAMx lines
        if (this.opr === 0xE)
          this._pins.setPinsData([CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3], this.registers.ramControl);
        // lowest 4bit of instruction
        this.opa = this._pins.getPinsData([D0, D1, D2, D3]);
        break;
      // X1 stage
      case 6:
        // reset CM-RAMx lines if they were set at M2 stage
        if (this._pins.getPinsData([CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3]))
          this._pins.setPinsData([CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3], 0);
        this._executeAtX1(this.opr, this.opa);
        break;
      // X2 stage
      case 7:
        this._executeAtX2(this.opr, this.opa);
        this.syncStep = -1;
        break;
    }

    this.syncStep++;
  }
}

export default CPU;
