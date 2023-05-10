import CPUPins, { SYNC, D0, D1, D2, D3, CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3, CM_ROM0, CM_ROM1 } from './pins.js';

const STACK_DEPTH = 7;

class CPU {
  halted = false;

  registers = {
    acc: 0,
    carry: 0,
    indexBanks: [
      Array.from(Array(16), () => 0),
      Array.from(Array(16), () => 0),
    ],
    pc: 0,
    // CM-RAM0 should be selected by default
    ramControl: 0b0001,
    selectedRomBank: 0,
    selectedRegisterBank: 0,
    sp: 0,
    stack: Array.from(Array(STACK_DEPTH), () => 0),
  };

  #pins;

  #syncStep = 0;

  #requestToSwitchRomBank = null;

  #system;

  constructor(system) {
    this.#pins = new CPUPins();
    this.#system = system;
  }

  // it's circular buffer
  #push(value) {
    this.registers.stack[this.registers.sp] = value;
    this.registers.sp = (this.registers.sp + 1) % STACK_DEPTH;
  }

  #pop() {
    this.registers.sp = (this.registers.sp - 1 + STACK_DEPTH) % STACK_DEPTH;
    return this.registers.stack[this.registers.sp];
  }

  #add(value, ignoreCarry = false) {
    const result = this.registers.acc + value + (ignoreCarry ? 0 : this.registers.carry);
    this.registers.acc = result & 0xF;
    this.registers.carry = +(result > 0xF);
  }

  // acc = acc - reg - carry = acc + ~reg + ~carry, set carry = 1 if no borrow, 0 otherwise
  #sub(value, ignoreCarry = false) {
    this.registers.carry = ignoreCarry ? 1 : ((~this.registers.carry) & 0x1);
    this.#add((~value) & 0xF);
  }

  #getFullAddressFromShort(pm, pl) {
    const ph = (this.registers.pc & 0xF00) + ((this.registers.pc & 0xFF) === 0xFF ? 0x100 : 0);
    return ph | (pm << 4) | (pl);
  }

  isExecutingTwoCycleOperation() {
    if (!this.previousOp) {
      return false;
    }

    // JUN/JMS/JCN/ISZ
    if ([0x4, 0x5, 0x1, 0x7].includes(this.previousOp.opr)) {
      return true;
    }

    // FIN/FIM
    return ([0x3, 0x2].includes(this.previousOp.opr) && (this.previousOp.opa & 0x1) === 0x0);
  }

  #readIndexRegister(regNo) {
    return this.registers.indexBanks[this.registers.selectedRegisterBank][regNo];
  }

  #writeIndexRegister(regNo, value) {
    if (regNo < 8) {
      this.registers.indexBanks[this.registers.selectedRegisterBank][regNo] = value;
      return;
    }

    // high segment of index register file is shared between banks
    for (const indexBank of this.registers.indexBanks) {
      indexBank[regNo] = value;
    }
  }

  /*
   * Return new value for PC if it's 2nd cycle for two-cycle operation or "undefined" otherwise
   */
  #executeTwoCycleOperation(currentOpr, currentOpa) {
    const { opa: previousOpa, opr: previousOpr, pc: previousPC } = this.previousOp;

    switch (previousOpr) {
      /*
       * FIN instruction (Fetch indirect from ROM)
       */
      case 0x3: {
        // check if it was JIN instruction, which is regular one-cycle operation
        if ((previousOpa & 0x1) === 0x1) {
          return 0;
        }

        this.#writeIndexRegister(previousOpa, currentOpr);
        this.#writeIndexRegister(previousOpa + 1, currentOpa);
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
        this.#push(this.registers.pc + 1);
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
        return finalCond ? this.#getFullAddressFromShort(currentOpr, currentOpa) : this.registers.pc + 1;
      }

      /*
       * ISZ instruction (Increment index register skip if zero)
       */
      case 0x7: {
        const newValue = (this.#readIndexRegister(previousOpa) + 1) & 0xF;
        this.#writeIndexRegister(previousOpa, newValue);
        return newValue === 0 ? this.registers.pc + 1 : this.#getFullAddressFromShort(currentOpr, currentOpa);
      }

      /*
       * FIM instruction (Fetched immediate from ROM)
      */
      case 0x2:
        // check if it was SRC instruction, which is regular one-cycle operation
        if ((previousOpa & 0x1) === 0x1) {
          return 0;
        }

        this.#writeIndexRegister(previousOpa, currentOpr);
        this.#writeIndexRegister(previousOpa + 1, currentOpa);
        return this.registers.pc + 1;

      default:
        return 0;
    }
  }

  #executeAtX3(opr, opa) {
    if (this.halted) {
      return this.registers.pc;
    }

    switch (opr) {
      case 0x0:
        switch (opa) {
          /*
           * NOP instruction (No Operation)
           */
          case 0x0:
            break;

          /*
           * HLT instruction
           */
          case 0x1:
            this.halted = true;
            break;

          /*
          * OR4 instruction
          */
          case 0x4:
            this.registers.acc |= this.#readIndexRegister(4);
            break;

          /*
          * OR5 instruction
          */
          case 0x5:
            this.registers.acc |= this.#readIndexRegister(5);
            break;

          /*
          * AN6 instruction
          */
          case 0x6:
            this.registers.acc &= this.#readIndexRegister(6);
            break;

          /*
          * AN7 instruction
          */
          case 0x7:
            this.registers.acc &= this.#readIndexRegister(7);
            break;

          /*
          * DB0 instruction
          */
          case 0x8:
            this.#requestToSwitchRomBank = { targetCycle: this.#system.instructionCycles + 2n, bankNo: 0 };
            break;

          /*
          * DB1 instruction
          */
          case 0x9:
            this.#requestToSwitchRomBank = { targetCycle: this.#system.instructionCycles + 2n, bankNo: 1 };
            break;

          /*
          * SB0 instruction
          */
          case 0xA:
            this.registers.selectedRegisterBank = 0;
            break;

          /*
          * SB1 instruction
          */
          case 0xB:
            this.registers.selectedRegisterBank = 1;
            break;

          default:
            throw 'Unknown instruction';
        }
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
        this.registers.acc = this.#readIndexRegister(opa);
        break;

      /*
       * XCH instruction (Exchange index register and accumulator)
       */
      case 0xB: {
        const t = this.registers.acc;
        this.registers.acc = this.#readIndexRegister(opa);
        this.#writeIndexRegister(opa, t);
        break;
      }

      /*
       * ADD instruction (Add index register to accumulator with carry)
       */
      case 0x8:
        this.#add(this.#readIndexRegister(opa));
        break;

      /*
       * SUB instruction (Subtract index register to accumulator with borrow)
       */
      case 0x9:
        this.#sub(this.#readIndexRegister(opa));
        break;

      /*
       * INC instruction (Increment index register)
       */
      case 0x6:
        this.#writeIndexRegister(opa, (this.#readIndexRegister(opa) + 1) & 0xF);
        break;

      /*
       * BBL instruction (Branch back and load data to the accumulator)
       */
      case 0xC:
        this.registers.acc = opa;
        return this.#pop();

      /*
       * JIN instruction (Jump indirect) or FIN instruction (Fetch indirect from ROM)
       */
      case 0x3: {
        // for FIN we are using reg pair 0 for indirect addressing
        const reg = (opa & 0x1) === 0x0 ? 0 : opa & 0xE;
        return this.#getFullAddressFromShort(this.#readIndexRegister(reg), this.#readIndexRegister(reg + 1));
      }

      case 0x2:
        /*
         * SRC instruction (Send register control)
         *
         * At X3 stage we need to send low 4bit of address
         */
        if ((opa & 0x1) === 0x1) {
          this.#pins.setPinsData([D0, D1, D2, D3], this.#readIndexRegister((opa & 0xE) + 1));
          // need to reset CM_RAM lines
          this.#pins.setPinsData([CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3], 0);
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
            this.registers.acc = this.#pins.getPinsData([D0, D1, D2, D3]);
            break;

          /*
           * RD0 instruction (Read RAM status character 0)
           */
          case 0xC:
            this.registers.acc = this.#pins.getPinsData([D0, D1, D2, D3]);
            break;

          /*
           * RD1 instruction (Read RAM status character 1)
           */
          case 0xD:
            this.registers.acc = this.#pins.getPinsData([D0, D1, D2, D3]);
            break;

          /*
           * RD2 instruction (Read RAM status character 2)
           */
          case 0xE:
            this.registers.acc = this.#pins.getPinsData([D0, D1, D2, D3]);
            break;

          /*
           * RD3 instruction (Read RAM status character 3)
           */
          case 0xF:
            this.registers.acc = this.#pins.getPinsData([D0, D1, D2, D3]);
            break;

          /*
           * ADM instruction (Add from memory with carry)
           */
          case 0xB:
            this.#add(this.#pins.getPinsData([D0, D1, D2, D3]));
            break;

          /*
           * SBM instruction (Subtract from memory with borrow)
           */
          case 0x8:
            this.#sub(this.#pins.getPinsData([D0, D1, D2, D3]));
            break;

          default:
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
           * STC instruction (Set carry)
           */
          case 0xA:
            this.registers.carry = 1;
            break;

          /*
           * CMA instruction (Complement Accumulator)
           */
          case 0x4:
            this.registers.acc = (~this.registers.acc) & 0xF;
            break;

          /*
           * IAC instruction (Increment accumulator)
           */
          case 0x2:
            this.#add(1, true);
            break;

          /*
           * DAC instruction (decrement accumulator)
           */
          case 0x8:
            this.#sub(1, true);
            break;

          /*
           * RAL instruction (Rotate left)
           */
          case 0x5: {
            const oldCarry = this.registers.carry;
            this.registers.carry = this.registers.acc >> 3;
            this.registers.acc = ((this.registers.acc << 1) & 0xF) | oldCarry;
            break;
          }

          /*
           * RAR instruction (Rotate right)
           */
          case 0x6: {
            const oldCarry = this.registers.carry;
            this.registers.carry = this.registers.acc & 0x1;
            this.registers.acc = (this.registers.acc >> 1) | (oldCarry << 3);
            break;
          }

          /*
           * TCC instruction (Transmit carry and clear)
           */
          case 0x7:
            this.registers.acc = this.registers.carry;
            this.registers.carry = 0;
            break;

          /*
           * DAA instruction (Decimal adjust accumulator)
           */
          case 0xB:
            if (this.registers.carry === 1 || this.registers.acc > 9) {
              const result = this.registers.acc + 6;
              this.registers.acc = result & 0xF;
              if (result > 0xF) {
                this.registers.carry = 1;
              }
            }
            break;

          /*
           * TCS instruction (Transfer carry subtract)
           */
          case 0x9:
            this.registers.acc = this.registers.carry === 1 ? 10 : 9;
            this.registers.carry = 0;
            break;

          /*
           * KBP instruction (Keyboard process)
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

          /*
           * DCL instruction (Designate command line)
           */
          case 0xD: {
            const accBits = this.registers.acc & 0x7;
            this.registers.ramControl = accBits === 0 ? 0b0001 : (accBits << 1);
            break;
          }

          default:
            throw 'Unknown instruction';
        }
        break;

      default:
        throw 'Unknown instruction';
    }

    return this.registers.pc + 1;
  }

  #executeAtX2(opr, opa) {
    if (this.isExecutingTwoCycleOperation() || this.halted) {
      return;
    }

    switch (opr) {
      case 0x2:
        /*
         * SRC instruction (Send register control)
         *
         * At X2 stage we need to send high 4bit of address
         */
        if ((opa & 0x1) === 0x1) {
          this.#pins.setPinsData([D0, D1, D2, D3], this.#readIndexRegister(opa & 0xE));
          this.#pins.setPinsData([CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3], this.registers.ramControl);
        }
        break;

      default:
        break;
    }
  }

  #executeAtX1(opr, opa) {
    if (this.isExecutingTwoCycleOperation() || this.halted) {
      return;
    }

    switch (opr) {
      case 0xE:
        switch (opa) {
          /*
           * WRM instruction (Write accumulator into RAM character)
           */
          case 0x0:
            this.#pins.setPinsData([D0, D1, D2, D3], this.registers.acc);
            break;

          /*
           * WMP instruction (Write RAM port)
           */
          case 0x1:
            this.#pins.setPinsData([D0, D1, D2, D3], this.registers.acc);
            break;

          /*
           * WR0 instruction (Write accumulator into RAM status character 0)
           */
          case 0x4:
            this.#pins.setPinsData([D0, D1, D2, D3], this.registers.acc);
            break;

          /*
           * WR1 instruction (Write accumulator into RAM status character 1)
           */
          case 0x5:
            this.#pins.setPinsData([D0, D1, D2, D3], this.registers.acc);
            break;

          /*
           * WR2 instruction (Write accumulator into RAM status character 2)
           */
          case 0x6:
            this.#pins.setPinsData([D0, D1, D2, D3], this.registers.acc);
            break;

          /*
           * WR3 instruction (Write accumulator into RAM status character 3)
           */
          case 0x7:
            this.#pins.setPinsData([D0, D1, D2, D3], this.registers.acc);
            break;

          default:
            break;
        }
        break;

      default:
        break;
    }
  }

  get pins() {
    return this.#pins;
  }

  /*
   * Main function, that is called every machine cycle
   */
  tick() {
    // generate SYNC signal every 8 cycles
    switch (this.#syncStep) {
      // X3 stage
      case 0:
        if (this.opr !== undefined) {
          // decode and execute instruction
          if (this.isExecutingTwoCycleOperation()) {
            this.registers.pc = this.#executeTwoCycleOperation(this.opr, this.opa);
            this.previousOp = null;
          } else {
            const oldPC = this.registers.pc;
            this.registers.pc = this.#executeAtX3(this.opr, this.opa);
            this.previousOp = { opa: this.opa, opr: this.opr, pc: oldPC };
          }
        }

        if (this.#requestToSwitchRomBank?.targetCycle === this.#system.instructionCycles) {
          this.registers.selectedRomBank = this.#requestToSwitchRomBank.bankNo;
          this.#requestToSwitchRomBank = null;
        }

        this.#pins.setPin(SYNC, 1);
        break;
      // A1 stage
      case 1:
        this.#pins.setPin(SYNC, 0);
        this.#pins.setPinsData([D0, D1, D2, D3], this.registers.pc & 0x000F);
        break;
      // A2 stage
      case 2:
        this.#pins.setPinsData([D0, D1, D2, D3], (this.registers.pc & 0x00F0) >> 4);
        break;
      // A3 stage
      case 3:
        this.#pins.setPinsData([D0, D1, D2, D3], (this.registers.pc & 0x0F00) >> 8);
        this.#pins.setPinsData([CM_ROM0, CM_ROM1], this.registers.selectedRomBank === 1 ? 0b10 : 0b01);
        break;
      // M1 stage
      case 4:
        // highest 4bit of instruction
        this.opr = this.#pins.getPinsData([D0, D1, D2, D3]);
        break;
      // M2 stage
      case 5:
        // if it's I/O or RAM instruction we need to trigger CM-RAMx lines
        if (this.opr === 0xE && !this.isExecutingTwoCycleOperation()) {
          this.#pins.setPinsData([CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3], this.registers.ramControl);
        }
        // lowest 4bit of instruction
        this.opa = this.#pins.getPinsData([D0, D1, D2, D3]);
        this.#pins.setPinsData([CM_ROM0, CM_ROM1], 0b00);
        break;
      // X1 stage
      case 6:
        // reset CM-RAMx lines if they were set at M2 stage
        if (this.#pins.getPinsData([CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3])) {
          this.#pins.setPinsData([CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3], 0);
        }
        this.#executeAtX1(this.opr, this.opa);
        break;
      // X2 stage
      case 7:
        this.#executeAtX2(this.opr, this.opa);
        this.#syncStep = -1;
        break;

      default:
        break;
    }

    this.#syncStep++;
  }
}

export default CPU;
