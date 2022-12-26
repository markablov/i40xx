import { SYNC, CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3, D0, D1, D2, D3 } from './cpu/pins.js';

class RAM {
  #cpu;

  #outputHandler;

  constructor(cpuPins, ramDump, outputHandler) {
    this.#outputHandler = outputHandler;
    this.#cpu = cpuPins;

    this.banks = RAM.#constructRAMBanks(ramDump || RAM.#getEmptyRAM());
    this.state = 0;
  }

  static #constructRAMBanks(dump) {
    return dump.map((registers) => ({
      registers,
      outputs: Array(4).fill(0),
      selectedRegister: 0,
      selectedCharacter: 0,
    }));
  }

  static #getEmptyRAM() {
    return Array.from(
      Array(8),
      () => Array.from(Array(16), () => ({ main: Array(16).fill(0), status: Array(4).fill(0) })),
    );
  }

  static getBankNoFromPinsData(pins) {
    // if CM_RAM0 is set, it's always bank #0
    if ((pins & 0x1) === 0x1) {
      return 0;
    }

    pins >>= 1;
    switch (pins) {
      // CM_RAM1 => bank #1
      case 0b001: return 1;

      // CM_RAM2 => bank #2
      case 0b010: return 2;

      // CM_RAM3 => bank #3
      case 0b100: return 3;

      // CM_RAM1 + CM_RAM2 => bank #4
      case 0b011: return 4;

      // CM_RAM1 + CM_RAM3 => bank #5
      case 0b101: return 5;

      // CM_RAM2 + CM_RAM3 => bank #6
      case 0b110: return 6;

      // CM_RAM1 + CM_RAM2 + CM_RAM3 => bank #7
      case 0b111: return 7;

      default:
        throw Error('Unknown value for CMRAM!');
    }
  }

  #selectedBank() {
    const cmRam = this.#cpu.getPinsData([CM_RAM0, CM_RAM1, CM_RAM2, CM_RAM3]);
    return cmRam ? this.banks[RAM.getBankNoFromPinsData(cmRam)] : null;
  }

  #execute(bank, opa, data) {
    switch (opa) {
      /*
       * RDM instruction (Read RAM character)
       */
      case 0x9:
        this.#cpu.setPinsData([D0, D1, D2, D3], bank.registers[bank.selectedRegister].main[bank.selectedCharacter]);
        break;

      /*
       * RD0 instruction (Read RAM status character 0)
       */
      case 0xC:
        this.#cpu.setPinsData([D0, D1, D2, D3], bank.registers[bank.selectedRegister].status[0]);
        break;

      /*
       * RD1 instruction (Read RAM status character 1)
       */
      case 0xD:
        this.#cpu.setPinsData([D0, D1, D2, D3], bank.registers[bank.selectedRegister].status[1]);
        break;

      /*
       * RD2 instruction (Read RAM status character 2)
       */
      case 0xE:
        this.#cpu.setPinsData([D0, D1, D2, D3], bank.registers[bank.selectedRegister].status[2]);
        break;

      /*
      * RD3 instruction (Read RAM status character 3)
      */
      case 0xF:
        this.#cpu.setPinsData([D0, D1, D2, D3], bank.registers[bank.selectedRegister].status[3]);
        break;

      /*
       * WRM instruction (Write accumulator into RAM character)
       */
      case 0x0:
        bank.registers[bank.selectedRegister].main[bank.selectedCharacter] = data;
        break;

      /*
       * WMP instruction (Write RAM port)
       */
      case 0x1:
        this.emit('output', { chip: bank.selectedRegister >> 2, data });
        bank.outputs[bank.selectedRegister >> 2] = data;
        break;

      /*
       * WR0 instruction (Write accumulator into RAM status character 0)
       */
      case 0x4:
        bank.registers[bank.selectedRegister].status[0] = data;
        break;

      /*
       * WR1 instruction (Write accumulator into RAM status character 1)
       */
      case 0x5:
        bank.registers[bank.selectedRegister].status[1] = data;
        break;

      /*
       * WR2 instruction (Write accumulator into RAM status character 2)
       */
      case 0x6:
        bank.registers[bank.selectedRegister].status[2] = data;
        break;

      /*
       * WR3 instruction (Write accumulator into RAM status character 3)
       */
      case 0x7:
        bank.registers[bank.selectedRegister].status[3] = data;
        break;

      /*
       * ADM instruction (Add from memory with carry)
       */
      case 0xB:
        this.#cpu.setPinsData([D0, D1, D2, D3], bank.registers[bank.selectedRegister].main[bank.selectedCharacter]);
        break;

      /*
       * SBM instruction (Subtract from memory with borrow)
       */
      case 0x8:
        this.#cpu.setPinsData([D0, D1, D2, D3], bank.registers[bank.selectedRegister].main[bank.selectedCharacter]);
        break;

      default:
        break;
    }
  }

  /*
   * Main function, that is called every machine cycle and works with internal state and CPU pins
   */
  tick() {
    // X3 stage
    if (this.#cpu.getPin(SYNC) || this.state === 7) {
      // check if SRC command is executing, in that case need to store character index in selected register
      if (this.bankToSetOffset) {
        this.bankToSetOffset.selectedCharacter = this.#cpu.getPinsData([D0, D1, D2, D3]);
        this.bankToSetOffset = null;
      }

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
        this.bankForExecution = this.#selectedBank();
        if (this.bankForExecution) {
          this.opa = this.#cpu.getPinsData([D0, D1, D2, D3]);
        }
        break;

      // X1 stage
      case 5:
        break;

      // X2 stage
      case 6: {
        const data = this.#cpu.getPinsData([D0, D1, D2, D3]);

        // check if SRC command is executing, in that case need to store chip index and register index in this chip
        this.bankToSetOffset = this.#selectedBank();
        if (this.bankToSetOffset) {
          this.bankToSetOffset.selectedRegister = data;
        }

        // at M2 we have received instruction to execute, so perform it now
        if (this.bankForExecution) {
          this.#execute(this.bankForExecution, this.opa, data);
          this.bankForExecution = null;
        }

        break;
      }

      default:
        break;
    }

    this.state++;
  }
}

export default RAM;
