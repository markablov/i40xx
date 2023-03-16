/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToHex } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { writeValueToMainChars, writeValueToStatusChars } from '#utilities/memory.js';

import {
  updateCodeForUseInEmulator, generateMemoryBankSwitch, generateMemoryStatusCharactersInitialization,
  generateRegisterInitialization, generateMemoryMainCharactersInitialization,
} from '#utilities/codeGenerator.js';

import RAM_DUMP from './data/ramWithLookupTables.json' assert { type: 'json' };

const PROLOGUE_CYCLES_COUNT = 5;

const runSingleTestFast = (romDump, { divisor, dividend }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });
  const { memory, registers } = system;

  writeValueToStatusChars(hexToHWNumber(divisor), memory, 0x1, 7);
  writeValueToStatusChars(hexToHWNumber(dividend), memory, 0x2, 7);

  registers.ramControl = 0b1110;
  registers.indexBanks[0][8] = 0x1;
  registers.indexBanks[0][9] = 0x2;

  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    result: {
      reminder: hwNumberToHex([
        registers.indexBanks[0][0],
        registers.indexBanks[0][1],
        registers.indexBanks[0][2],
        registers.indexBanks[0][3],
      ]),
      quotient: hwNumberToHex([
        registers.indexBanks[0][8],
        registers.indexBanks[0][9],
        registers.indexBanks[0][14],
        registers.indexBanks[0][15],
      ]),
    },
    elapsed: system.instructionCycles,
  };
};

const runSingleTestStandard = (romDump, { divisor, dividend }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });
  const { memory, registers } = system;

  writeValueToMainChars(hexToHWNumber(dividend), memory, 0x08, 7);
  writeValueToMainChars(hexToHWNumber(divisor), memory, 0x09, 7);

  registers.ramControl = 0b1110;
  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    result: {
      reminder: hwNumberToHex(memory[7].registers[0x08].main),
      quotient: hwNumberToHex(memory[7].registers[0x0A].main),
    },
    elapsed: system.instructionCycles,
  };
};

const TESTS = [
  { input: { dividend: '0xC', divisor: '0x7' }, expected: { quotient: '0x1', reminder: '0x5' } },
  { input: { dividend: '0xB', divisor: '0x4' }, expected: { quotient: '0x2', reminder: '0x3' } },
  { input: { dividend: '0xA', divisor: '0x9' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x5', divisor: '0x3' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0x8', divisor: '0x7' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x3', divisor: '0x2' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0xC', divisor: '0xB' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x3', divisor: '0x2' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0xE', divisor: '0x5' }, expected: { quotient: '0x2', reminder: '0x4' } },
  { input: { dividend: '0x3', divisor: '0x2' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0xB', divisor: '0x5' }, expected: { quotient: '0x2', reminder: '0x1' } },
  { input: { dividend: '0xF', divisor: '0x2' }, expected: { quotient: '0x7', reminder: '0x1' } },
  { input: { dividend: '0x4', divisor: '0x3' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0xB', divisor: '0x8' }, expected: { quotient: '0x1', reminder: '0x3' } },
  { input: { dividend: '0xF', divisor: '0x2' }, expected: { quotient: '0x7', reminder: '0x1' } },
  { input: { dividend: '0x9', divisor: '0x8' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x5', divisor: '0x2' }, expected: { quotient: '0x2', reminder: '0x1' } },
  { input: { dividend: '0xC', divisor: '0xB' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x3', divisor: '0x2' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x5', divisor: '0x2' }, expected: { quotient: '0x2', reminder: '0x1' } },
  { input: { dividend: '0x5', divisor: '0x2' }, expected: { quotient: '0x2', reminder: '0x1' } },
  { input: { dividend: '0x9', divisor: '0x2' }, expected: { quotient: '0x4', reminder: '0x1' } },
  { input: { dividend: '0x5', divisor: '0x3' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0x8', divisor: '0x3' }, expected: { quotient: '0x2', reminder: '0x2' } },
  { input: { dividend: '0x7', divisor: '0x3' }, expected: { quotient: '0x2', reminder: '0x1' } },
  { input: { dividend: '0x3', divisor: '0x2' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x5', divisor: '0x3' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0xB', divisor: '0x6' }, expected: { quotient: '0x1', reminder: '0x5' } },
  { input: { dividend: '0x5', divisor: '0x3' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0x9', divisor: '0x4' }, expected: { quotient: '0x2', reminder: '0x1' } },
  { input: { dividend: '0xC', divisor: '0x5' }, expected: { quotient: '0x2', reminder: '0x2' } },
  { input: { dividend: '0x7', divisor: '0x4' }, expected: { quotient: '0x1', reminder: '0x3' } },
  { input: { dividend: '0x4', divisor: '0x3' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x5', divisor: '0x3' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0x3', divisor: '0x2' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x8', divisor: '0x3' }, expected: { quotient: '0x2', reminder: '0x2' } },
  { input: { dividend: '0xF', divisor: '0x4' }, expected: { quotient: '0x3', reminder: '0x3' } },
  { input: { dividend: '0x7', divisor: '0x4' }, expected: { quotient: '0x1', reminder: '0x3' } },
  { input: { dividend: '0x7', divisor: '0x3' }, expected: { quotient: '0x2', reminder: '0x1' } },
  { input: { dividend: '0x7', divisor: '0x5' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0x4', divisor: '0x3' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x9', divisor: '0x2' }, expected: { quotient: '0x4', reminder: '0x1' } },
  { input: { dividend: '0xA', divisor: '0x3' }, expected: { quotient: '0x3', reminder: '0x1' } },
  { input: { dividend: '0xD', divisor: '0x3' }, expected: { quotient: '0x4', reminder: '0x1' } },
  { input: { dividend: '0x3', divisor: '0x2' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0xB', divisor: '0x4' }, expected: { quotient: '0x2', reminder: '0x3' } },
  { input: { dividend: '0x4', divisor: '0x3' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x5', divisor: '0x2' }, expected: { quotient: '0x2', reminder: '0x1' } },
  { input: { dividend: '0xF', divisor: '0xD' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0x9', divisor: '0x4' }, expected: { quotient: '0x2', reminder: '0x1' } },
  { input: { dividend: '0x3', divisor: '0x2' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x5', divisor: '0x4' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x9', divisor: '0x7' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0x1B94', divisor: '0x2B' }, expected: { quotient: '0xA4', reminder: '0x8' } },
  { input: { dividend: '0x1D1E', divisor: '0x57' }, expected: { quotient: '0x55', reminder: '0x3B' } },
  { input: { dividend: '0x1F85', divisor: '0xF6' }, expected: { quotient: '0x20', reminder: '0xC5' } },
  { input: { dividend: '0x68', divisor: '0x2D' }, expected: { quotient: '0x2', reminder: '0xE' } },
  { input: { dividend: '0xCE', divisor: '0x57' }, expected: { quotient: '0x2', reminder: '0x20' } },
  { input: { dividend: '0x33', divisor: '0x1C' }, expected: { quotient: '0x1', reminder: '0x17' } },
  { input: { dividend: '0x5D', divisor: '0x10' }, expected: { quotient: '0x5', reminder: '0xD' } },
  { input: { dividend: '0x9B', divisor: '0x48' }, expected: { quotient: '0x2', reminder: '0xB' } },
  { input: { dividend: '0x95', divisor: '0x65' }, expected: { quotient: '0x1', reminder: '0x30' } },
  { input: { dividend: '0xE3', divisor: '0x11' }, expected: { quotient: '0xD', reminder: '0x6' } },
  { input: { dividend: '0x26', divisor: '0x1B' }, expected: { quotient: '0x1', reminder: '0xB' } },
  { input: { dividend: '0x6B', divisor: '0x55' }, expected: { quotient: '0x1', reminder: '0x16' } },
  { input: { dividend: '0xB7', divisor: '0x92' }, expected: { quotient: '0x1', reminder: '0x25' } },
  { input: { dividend: '0xDD', divisor: '0x63' }, expected: { quotient: '0x2', reminder: '0x17' } },
  { input: { dividend: '0x36', divisor: '0x13' }, expected: { quotient: '0x2', reminder: '0x10' } },
  { input: { dividend: '0x3D', divisor: '0x33' }, expected: { quotient: '0x1', reminder: '0xA' } },
  { input: { dividend: '0xB9', divisor: '0x45' }, expected: { quotient: '0x2', reminder: '0x2F' } },
  { input: { dividend: '0xDA', divisor: '0x93' }, expected: { quotient: '0x1', reminder: '0x47' } },
  { input: { dividend: '0x4B', divisor: '0x3D' }, expected: { quotient: '0x1', reminder: '0xE' } },
  { input: { dividend: '0x5F', divisor: '0x31' }, expected: { quotient: '0x1', reminder: '0x2E' } },
  { input: { dividend: '0x53', divisor: '0x13' }, expected: { quotient: '0x4', reminder: '0x7' } },
  { input: { dividend: '0x43', divisor: '0x33' }, expected: { quotient: '0x1', reminder: '0x10' } },
  { input: { dividend: '0x44', divisor: '0x2F' }, expected: { quotient: '0x1', reminder: '0x15' } },
  { input: { dividend: '0x99', divisor: '0x6B' }, expected: { quotient: '0x1', reminder: '0x2E' } },
  { input: { dividend: '0x35', divisor: '0x24' }, expected: { quotient: '0x1', reminder: '0x11' } },
  { input: { dividend: '0x4E', divisor: '0x1D' }, expected: { quotient: '0x2', reminder: '0x14' } },
  { input: { dividend: '0x59', divisor: '0x21' }, expected: { quotient: '0x2', reminder: '0x17' } },
  { input: { dividend: '0xC1', divisor: '0x16' }, expected: { quotient: '0x8', reminder: '0x11' } },
  { input: { dividend: '0x2B', divisor: '0x2A' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x4B', divisor: '0x44' }, expected: { quotient: '0x1', reminder: '0x7' } },
  { input: { dividend: '0xA4', divisor: '0x8B' }, expected: { quotient: '0x1', reminder: '0x19' } },
  { input: { dividend: '0x2E', divisor: '0x21' }, expected: { quotient: '0x1', reminder: '0xD' } },
  { input: { dividend: '0x82', divisor: '0x3D' }, expected: { quotient: '0x2', reminder: '0x8' } },
  { input: { dividend: '0x15', divisor: '0x13' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0xBA', divisor: '0xA7' }, expected: { quotient: '0x1', reminder: '0x13' } },
  { input: { dividend: '0x1D', divisor: '0x17' }, expected: { quotient: '0x1', reminder: '0x6' } },
  { input: { dividend: '0xC4', divisor: '0x65' }, expected: { quotient: '0x1', reminder: '0x5F' } },
  { input: { dividend: '0xD8', divisor: '0x89' }, expected: { quotient: '0x1', reminder: '0x4F' } },
  { input: { dividend: '0x5D', divisor: '0x1A' }, expected: { quotient: '0x3', reminder: '0xF' } },
  { input: { dividend: '0x62', divisor: '0x57' }, expected: { quotient: '0x1', reminder: '0xB' } },
  { input: { dividend: '0xA3', divisor: '0x22' }, expected: { quotient: '0x4', reminder: '0x1B' } },
  { input: { dividend: '0xDA', divisor: '0x4D' }, expected: { quotient: '0x2', reminder: '0x40' } },
  { input: { dividend: '0x8E', divisor: '0x2D' }, expected: { quotient: '0x3', reminder: '0x7' } },
  { input: { dividend: '0x1D', divisor: '0x1B' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0x3F', divisor: '0x11' }, expected: { quotient: '0x3', reminder: '0xC' } },
  { input: { dividend: '0x46', divisor: '0x1B' }, expected: { quotient: '0x2', reminder: '0x10' } },
  { input: { dividend: '0xA4', divisor: '0x6D' }, expected: { quotient: '0x1', reminder: '0x37' } },
  { input: { dividend: '0xC1', divisor: '0x65' }, expected: { quotient: '0x1', reminder: '0x5C' } },
  { input: { dividend: '0xB2', divisor: '0x71' }, expected: { quotient: '0x1', reminder: '0x41' } },
  { input: { dividend: '0x53', divisor: '0x28' }, expected: { quotient: '0x2', reminder: '0x3' } },
  { input: { dividend: '0x73', divisor: '0x66' }, expected: { quotient: '0x1', reminder: '0xD' } },
  { input: { dividend: '0x53', divisor: '0x1A' }, expected: { quotient: '0x3', reminder: '0x5' } },
  { input: { dividend: '0x49', divisor: '0x1B' }, expected: { quotient: '0x2', reminder: '0x13' } },
  { input: { dividend: '0x19', divisor: '0x15' }, expected: { quotient: '0x1', reminder: '0x4' } },
  { input: { dividend: '0x62', divisor: '0x25' }, expected: { quotient: '0x2', reminder: '0x18' } },
  { input: { dividend: '0x28', divisor: '0x17' }, expected: { quotient: '0x1', reminder: '0x11' } },
  { input: { dividend: '0x6D', divisor: '0x33' }, expected: { quotient: '0x2', reminder: '0x7' } },
  { input: { dividend: '0x1D', divisor: '0x1C' }, expected: { quotient: '0x1', reminder: '0x1' } },
  { input: { dividend: '0x9D', divisor: '0x16' }, expected: { quotient: '0x7', reminder: '0x3' } },
  { input: { dividend: '0xBD', divisor: '0xBB' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0x6A', divisor: '0x17' }, expected: { quotient: '0x4', reminder: '0xE' } },
  { input: { dividend: '0x4F', divisor: '0x42' }, expected: { quotient: '0x1', reminder: '0xD' } },
  { input: { dividend: '0x35', divisor: '0x12' }, expected: { quotient: '0x2', reminder: '0x11' } },
  { input: { dividend: '0xD4', divisor: '0xD1' }, expected: { quotient: '0x1', reminder: '0x3' } },
  { input: { dividend: '0x80', divisor: '0x17' }, expected: { quotient: '0x5', reminder: '0xD' } },
  { input: { dividend: '0x5D', divisor: '0x52' }, expected: { quotient: '0x1', reminder: '0xB' } },
  { input: { dividend: '0x86', divisor: '0x61' }, expected: { quotient: '0x1', reminder: '0x25' } },
  { input: { dividend: '0x53', divisor: '0x40' }, expected: { quotient: '0x1', reminder: '0x13' } },
  { input: { dividend: '0x4B', divisor: '0x1C' }, expected: { quotient: '0x2', reminder: '0x13' } },
  { input: { dividend: '0xA0', divisor: '0x11' }, expected: { quotient: '0x9', reminder: '0x7' } },
  { input: { dividend: '0x48', divisor: '0x41' }, expected: { quotient: '0x1', reminder: '0x7' } },
  { input: { dividend: '0x4B', divisor: '0x17' }, expected: { quotient: '0x3', reminder: '0x6' } },
  { input: { dividend: '0xAC', divisor: '0x19' }, expected: { quotient: '0x6', reminder: '0x16' } },
  { input: { dividend: '0xBB', divisor: '0x7C' }, expected: { quotient: '0x1', reminder: '0x3F' } },
  { input: { dividend: '0x1D', divisor: '0x17' }, expected: { quotient: '0x1', reminder: '0x6' } },
  { input: { dividend: '0x19', divisor: '0x17' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0x37', divisor: '0x35' }, expected: { quotient: '0x1', reminder: '0x2' } },
  { input: { dividend: '0xB5', divisor: '0x16' }, expected: { quotient: '0x8', reminder: '0x5' } },
  { input: { dividend: '0x5B', divisor: '0x55' }, expected: { quotient: '0x1', reminder: '0x6' } },
  { input: { dividend: '0x99', divisor: '0x10' }, expected: { quotient: '0x9', reminder: '0x9' } },
  { input: { dividend: '0x65', divisor: '0x14' }, expected: { quotient: '0x5', reminder: '0x1' } },
  { input: { dividend: '0x8D', divisor: '0x17' }, expected: { quotient: '0x6', reminder: '0x3' } },
  { input: { dividend: '0x4F', divisor: '0x19' }, expected: { quotient: '0x3', reminder: '0x4' } },
  { input: { dividend: '0x47', divisor: '0x15' }, expected: { quotient: '0x3', reminder: '0x8' } },
  { input: { dividend: '0x3B', divisor: '0x12' }, expected: { quotient: '0x3', reminder: '0x5' } },
  { input: { dividend: '0x14', divisor: '0xD' }, expected: { quotient: '0x1', reminder: '0x7' } },
  { input: { dividend: '0x1B', divisor: '0xB' }, expected: { quotient: '0x2', reminder: '0x5' } },
  { input: { dividend: '0x2A', divisor: '0x5' }, expected: { quotient: '0x8', reminder: '0x2' } },
  { input: { dividend: '0x1F', divisor: '0x5' }, expected: { quotient: '0x6', reminder: '0x1' } },
  { input: { dividend: '0x1F', divisor: '0xD' }, expected: { quotient: '0x2', reminder: '0x5' } },
  { input: { dividend: '0x15', divisor: '0x2' }, expected: { quotient: '0xA', reminder: '0x1' } },
  { input: { dividend: '0x74', divisor: '0xB' }, expected: { quotient: '0xA', reminder: '0x6' } },
  { input: { dividend: '0x17', divisor: '0x2' }, expected: { quotient: '0xB', reminder: '0x1' } },
  { input: { dividend: '0x13', divisor: '0x9' }, expected: { quotient: '0x2', reminder: '0x1' } },
  { input: { dividend: '0x19', divisor: '0x7' }, expected: { quotient: '0x3', reminder: '0x4' } },
  { input: { dividend: '0x12', divisor: '0x5' }, expected: { quotient: '0x3', reminder: '0x3' } },
  { input: { dividend: '0x15', divisor: '0x8' }, expected: { quotient: '0x2', reminder: '0x5' } },
  { input: { dividend: '0x28', divisor: '0x3' }, expected: { quotient: '0xD', reminder: '0x1' } },
  { input: { dividend: '0x18', divisor: '0x7' }, expected: { quotient: '0x3', reminder: '0x3' } },
  { input: { dividend: '0x31', divisor: '0xA' }, expected: { quotient: '0x4', reminder: '0x9' } },
  { input: { dividend: '0x69', divisor: '0x4' }, expected: { quotient: '0x1A', reminder: '0x1' } },
  { input: { dividend: '0x12', divisor: '0xB' }, expected: { quotient: '0x1', reminder: '0x7' } },
  { input: { dividend: '0x10', divisor: '0xD' }, expected: { quotient: '0x1', reminder: '0x3' } },
  { input: { dividend: '0x3B', divisor: '0x3' }, expected: { quotient: '0x13', reminder: '0x2' } },
  { input: { dividend: '0x2F', divisor: '0x2' }, expected: { quotient: '0x17', reminder: '0x1' } },
  { input: { dividend: '0xBC', divisor: '0x3' }, expected: { quotient: '0x3E', reminder: '0x2' } },
  { input: { dividend: '0x48', divisor: '0x7' }, expected: { quotient: '0xA', reminder: '0x2' } },
  { input: { dividend: '0x43', divisor: '0x2' }, expected: { quotient: '0x21', reminder: '0x1' } },
  { input: { dividend: '0x88', divisor: '0xD' }, expected: { quotient: '0xA', reminder: '0x6' } },
  { input: { dividend: '0x1F', divisor: '0xE' }, expected: { quotient: '0x2', reminder: '0x3' } },
  { input: { dividend: '0x11', divisor: '0xC' }, expected: { quotient: '0x1', reminder: '0x5' } },
  { input: { dividend: '0x2F', divisor: '0xE' }, expected: { quotient: '0x3', reminder: '0x5' } },
  { input: { dividend: '0x35', divisor: '0xC' }, expected: { quotient: '0x4', reminder: '0x5' } },
  { input: { dividend: '0x34', divisor: '0x7' }, expected: { quotient: '0x7', reminder: '0x3' } },
  { input: { dividend: '0x95', divisor: '0x4' }, expected: { quotient: '0x25', reminder: '0x1' } },
  { input: { dividend: '0x18', divisor: '0x7' }, expected: { quotient: '0x3', reminder: '0x3' } },
  { input: { dividend: '0x35', divisor: '0x9' }, expected: { quotient: '0x5', reminder: '0x8' } },
  { input: { dividend: '0x1D', divisor: '0x5' }, expected: { quotient: '0x5', reminder: '0x4' } },
  { input: { dividend: '0x13', divisor: '0x2' }, expected: { quotient: '0x9', reminder: '0x1' } },
  { input: { dividend: '0x13', divisor: '0xE' }, expected: { quotient: '0x1', reminder: '0x5' } },
  { input: { dividend: '0x17', divisor: '0x2' }, expected: { quotient: '0xB', reminder: '0x1' } },
  { input: { dividend: '0x20', divisor: '0xD' }, expected: { quotient: '0x2', reminder: '0x6' } },
  { input: { dividend: '0x51', divisor: '0x2' }, expected: { quotient: '0x28', reminder: '0x1' } },
  { input: { dividend: '0x17', divisor: '0x7' }, expected: { quotient: '0x3', reminder: '0x2' } },
  { input: { dividend: '0x2D', divisor: '0xB' }, expected: { quotient: '0x4', reminder: '0x1' } },
  { input: { dividend: '0x71', divisor: '0x3' }, expected: { quotient: '0x25', reminder: '0x2' } },
  { input: { dividend: '0x19', divisor: '0x3' }, expected: { quotient: '0x8', reminder: '0x1' } },
  { input: { dividend: '0x1127', divisor: '0x267' }, expected: { quotient: '0x7', reminder: '0x56' } },
  { input: { dividend: '0x112D', divisor: '0x9F6' }, expected: { quotient: '0x1', reminder: '0x737' } },
  { input: { dividend: '0x1319', divisor: '0x555' }, expected: { quotient: '0x3', reminder: '0x31A' } },
  { input: { dividend: '0x134F', divisor: '0x8CD' }, expected: { quotient: '0x2', reminder: '0x1B5' } },
  { input: { dividend: '0x19A1', divisor: '0xB48' }, expected: { quotient: '0x2', reminder: '0x311' } },
  { input: { dividend: '0x1C24', divisor: '0x89D' }, expected: { quotient: '0x3', reminder: '0x24D' } },
  { input: { dividend: '0x1003', divisor: '0x23D' }, expected: { quotient: '0x7', reminder: '0x58' } },
  { input: { dividend: '0x11A7', divisor: '0xB46' }, expected: { quotient: '0x1', reminder: '0x661' } },
  { input: { dividend: '0x121D', divisor: '0x963' }, expected: { quotient: '0x1', reminder: '0x8BA' } },
  { input: { dividend: '0x12CD', divisor: '0x267' }, expected: { quotient: '0x7', reminder: '0x1FC' } },
  { input: { dividend: '0x1615', divisor: '0xEEE' }, expected: { quotient: '0x1', reminder: '0x727' } },
  { input: { dividend: '0x1669', divisor: '0xCB4' }, expected: { quotient: '0x1', reminder: '0x9B5' } },
  { input: { dividend: '0x1733', divisor: '0x348' }, expected: { quotient: '0x7', reminder: '0x3B' } },
  { input: { dividend: '0x1BD7', divisor: '0xBD4' }, expected: { quotient: '0x2', reminder: '0x42F' } },
  { input: { dividend: '0x1BF7', divisor: '0x22D' }, expected: { quotient: '0xC', reminder: '0x1DB' } },
  { input: { dividend: '0x1C8B', divisor: '0xD88' }, expected: { quotient: '0x2', reminder: '0x17B' } },
  { input: { dividend: '0x1C8B', divisor: '0xEE9' }, expected: { quotient: '0x1', reminder: '0xDA2' } },
  { input: { dividend: '0x1783', divisor: '0x5EE' }, expected: { quotient: '0x3', reminder: '0x5B9' } },
  { input: { dividend: '0x14BC', divisor: '0x9D3' }, expected: { quotient: '0x2', reminder: '0x116' } },
  { input: { dividend: '0x1176', divisor: '0xE2F' }, expected: { quotient: '0x1', reminder: '0x347' } },
  { input: { dividend: '0x184E', divisor: '0x767' }, expected: { quotient: '0x3', reminder: '0x219' } },
  { input: { dividend: '0x1790', divisor: '0xABB' }, expected: { quotient: '0x2', reminder: '0x21A' } },
  { input: { dividend: '0x1BA0', divisor: '0x6D5' }, expected: { quotient: '0x4', reminder: '0x4C' } },
  { input: { dividend: '0x269B', divisor: '0x4DC' }, expected: { quotient: '0x7', reminder: '0x497' } },
  { input: { dividend: '0x133F', divisor: '0x2F7' }, expected: { quotient: '0x6', reminder: '0x175' } },
  { input: { dividend: '0x2A8B', divisor: '0xA28' }, expected: { quotient: '0x4', reminder: '0x1EB' } },
  { input: { dividend: '0x2A49', divisor: '0x436' }, expected: { quotient: '0xA', reminder: '0x2D' } },
  { input: { dividend: '0x12E0', divisor: '0xAF9' }, expected: { quotient: '0x1', reminder: '0x7E7' } },
  { input: { dividend: '0x101', divisor: '0x9A' }, expected: { quotient: '0x1', reminder: '0x67' } },
  { input: { dividend: '0x15B', divisor: '0xA4' }, expected: { quotient: '0x2', reminder: '0x13' } },
  { input: { dividend: '0x1D3', divisor: '0x1B' }, expected: { quotient: '0x11', reminder: '0x8' } },
  { input: { dividend: '0x1C9', divisor: '0x70' }, expected: { quotient: '0x4', reminder: '0x9' } },
  { input: { dividend: '0x10F', divisor: '0x97' }, expected: { quotient: '0x1', reminder: '0x78' } },
  { input: { dividend: '0x861', divisor: '0xA6' }, expected: { quotient: '0xC', reminder: '0x99' } },
  { input: { dividend: '0x478', divisor: '0x87' }, expected: { quotient: '0x8', reminder: '0x40' } },
  { input: { dividend: '0x213', divisor: '0x2C' }, expected: { quotient: '0xC', reminder: '0x3' } },
  { input: { dividend: '0x317', divisor: '0xDB' }, expected: { quotient: '0x3', reminder: '0x86' } },
  { input: { dividend: '0x141', divisor: '0xEF' }, expected: { quotient: '0x1', reminder: '0x52' } },
  { input: { dividend: '0xB34', divisor: '0x79' }, expected: { quotient: '0x17', reminder: '0x55' } },
  { input: { dividend: '0x1BB', divisor: '0x8B' }, expected: { quotient: '0x3', reminder: '0x1A' } },
  { input: { dividend: '0x5CF', divisor: '0x2A' }, expected: { quotient: '0x23', reminder: '0x11' } },
  { input: { dividend: '0x727', divisor: '0xB2' }, expected: { quotient: '0xA', reminder: '0x33' } },
  { input: { dividend: '0x434', divisor: '0xF1' }, expected: { quotient: '0x4', reminder: '0x70' } },
  { input: { dividend: '0x9DC', divisor: '0x1B' }, expected: { quotient: '0x5D', reminder: '0xD' } },
  { input: { dividend: '0x9CD', divisor: '0xB4' }, expected: { quotient: '0xD', reminder: '0xA9' } },
  { input: { dividend: '0x17D', divisor: '0x88' }, expected: { quotient: '0x2', reminder: '0x6D' } },
  { input: { dividend: '0x106', divisor: '0x73' }, expected: { quotient: '0x2', reminder: '0x20' } },
  { input: { dividend: '0xCF1', divisor: '0x17' }, expected: { quotient: '0x90', reminder: '0x1' } },
  { input: { dividend: '0x121', divisor: '0xD8' }, expected: { quotient: '0x1', reminder: '0x49' } },
  { input: { dividend: '0x29E', divisor: '0x27' }, expected: { quotient: '0x11', reminder: '0x7' } },
  { input: { dividend: '0xFA1', divisor: '0xB3' }, expected: { quotient: '0x16', reminder: '0x3F' } },
  { input: { dividend: '0xF8A', divisor: '0xEF' }, expected: { quotient: '0x10', reminder: '0x9A' } },
  { input: { dividend: '0x1DD', divisor: '0x22' }, expected: { quotient: '0xE', reminder: '0x1' } },
  { input: { dividend: '0x815', divisor: '0xDB' }, expected: { quotient: '0x9', reminder: '0x62' } },
  { input: { dividend: '0x8C5', divisor: '0xB7' }, expected: { quotient: '0xC', reminder: '0x31' } },
  { input: { dividend: '0x6AF', divisor: '0x34' }, expected: { quotient: '0x20', reminder: '0x2F' } },
  { input: { dividend: '0x14D', divisor: '0x6D' }, expected: { quotient: '0x3', reminder: '0x6' } },
  { input: { dividend: '0x79C', divisor: '0xCB' }, expected: { quotient: '0x9', reminder: '0x79' } },
  { input: { dividend: '0x1AF', divisor: '0x57' }, expected: { quotient: '0x4', reminder: '0x53' } },
  { input: { dividend: '0x342', divisor: '0xE5' }, expected: { quotient: '0x3', reminder: '0x93' } },
  { input: { dividend: '0x2E1', divisor: '0x70' }, expected: { quotient: '0x6', reminder: '0x41' } },
  { input: { dividend: '0xECC', divisor: '0x7B' }, expected: { quotient: '0x1E', reminder: '0x62' } },
  { input: { dividend: '0x20B', divisor: '0x72' }, expected: { quotient: '0x4', reminder: '0x43' } },
  { input: { dividend: '0x131', divisor: '0x9F' }, expected: { quotient: '0x1', reminder: '0x92' } },
  { input: { dividend: '0x19A', divisor: '0xA1' }, expected: { quotient: '0x2', reminder: '0x58' } },
  { input: { dividend: '0x317', divisor: '0xB4' }, expected: { quotient: '0x4', reminder: '0x47' } },
  { input: { dividend: '0x269', divisor: '0x6E' }, expected: { quotient: '0x5', reminder: '0x43' } },
  { input: { dividend: '0x2AB', divisor: '0x7F' }, expected: { quotient: '0x5', reminder: '0x30' } },
  { input: { dividend: '0x2971', divisor: '0x19D5' }, expected: { quotient: '0x1', reminder: '0xF9C' } },
  { input: { dividend: '0x1541', divisor: '0x1353' }, expected: { quotient: '0x1', reminder: '0x1EE' } },
  { input: { dividend: '0x1A7B', divisor: '0x1266' }, expected: { quotient: '0x1', reminder: '0x815' } },
  { input: { dividend: '0x1AFF', divisor: '0x16E1' }, expected: { quotient: '0x1', reminder: '0x41E' } },
  { input: { dividend: '0x1BC5', divisor: '0x164F' }, expected: { quotient: '0x1', reminder: '0x576' } },
  { input: { dividend: '0x1C09', divisor: '0x1667' }, expected: { quotient: '0x1', reminder: '0x5A2' } },
  { input: { dividend: '0x1C3D', divisor: '0x15ED' }, expected: { quotient: '0x1', reminder: '0x650' } },
  { input: { dividend: '0x20E3', divisor: '0x1394' }, expected: { quotient: '0x1', reminder: '0xD4F' } },
  { input: { dividend: '0x22E5', divisor: '0x1EBE' }, expected: { quotient: '0x1', reminder: '0x427' } },
  { input: { dividend: '0x29ED', divisor: '0x25D7' }, expected: { quotient: '0x1', reminder: '0x416' } },
  { input: { dividend: '0x1C06', divisor: '0x13BD' }, expected: { quotient: '0x1', reminder: '0x849' } },
  { input: { dividend: '0x3037', divisor: '0x16DA' }, expected: { quotient: '0x2', reminder: '0x283' } },
  { input: { dividend: '0x5BF', divisor: '0x4A7' }, expected: { quotient: '0x1', reminder: '0x118' } },
  { input: { dividend: '0xA99', divisor: '0xA51' }, expected: { quotient: '0x1', reminder: '0x48' } },
  { input: { dividend: '0x4BE', divisor: '0x169' }, expected: { quotient: '0x3', reminder: '0x83' } },
  { input: { dividend: '0xC95', divisor: '0x9AC' }, expected: { quotient: '0x1', reminder: '0x2E9' } },
  { input: { dividend: '0xCFB', divisor: '0x13B' }, expected: { quotient: '0xA', reminder: '0xAD' } },
  { input: { dividend: '0x483', divisor: '0x449' }, expected: { quotient: '0x1', reminder: '0x3A' } },
  { input: { dividend: '0x3FE', divisor: '0x1D3' }, expected: { quotient: '0x2', reminder: '0x58' } },
  { input: { dividend: '0x838', divisor: '0x6C1' }, expected: { quotient: '0x1', reminder: '0x177' } },
  { input: { dividend: '0x45E', divisor: '0x36B' }, expected: { quotient: '0x1', reminder: '0xF3' } },
  { input: { dividend: '0x65B', divisor: '0x48F' }, expected: { quotient: '0x1', reminder: '0x1CC' } },
  { input: { dividend: '0x1AD', divisor: '0x18A' }, expected: { quotient: '0x1', reminder: '0x23' } },
  { input: { dividend: '0x47E', divisor: '0x1BF' }, expected: { quotient: '0x2', reminder: '0x100' } },
  { input: { dividend: '0x2CB', divisor: '0x29D' }, expected: { quotient: '0x1', reminder: '0x2E' } },
  { input: { dividend: '0x2ED', divisor: '0x248' }, expected: { quotient: '0x1', reminder: '0xA5' } },
  { input: { dividend: '0xA80', divisor: '0x7E1' }, expected: { quotient: '0x1', reminder: '0x29F' } },
  { input: { dividend: '0x1BB', divisor: '0x112' }, expected: { quotient: '0x1', reminder: '0xA9' } },
  { input: { dividend: '0x2B3', divisor: '0x223' }, expected: { quotient: '0x1', reminder: '0x90' } },
  { input: { dividend: '0x371', divisor: '0x272' }, expected: { quotient: '0x1', reminder: '0xFF' } },
  { input: { dividend: '0x287', divisor: '0x140' }, expected: { quotient: '0x2', reminder: '0x7' } },
  { input: { dividend: '0x32C', divisor: '0x113' }, expected: { quotient: '0x2', reminder: '0x106' } },
  { input: { dividend: '0x50B', divisor: '0x271' }, expected: { quotient: '0x2', reminder: '0x29' } },
  { input: { dividend: '0x43F', divisor: '0x2BE' }, expected: { quotient: '0x1', reminder: '0x181' } },
  { input: { dividend: '0x74B', divisor: '0x54F' }, expected: { quotient: '0x1', reminder: '0x1FC' } },
  { input: { dividend: '0x2F6', divisor: '0x1B1' }, expected: { quotient: '0x1', reminder: '0x145' } },
  { input: { dividend: '0x232', divisor: '0x161' }, expected: { quotient: '0x1', reminder: '0xD1' } },
  { input: { dividend: '0x905', divisor: '0x11A' }, expected: { quotient: '0x8', reminder: '0x35' } },
  { input: { dividend: '0x925', divisor: '0x8E1' }, expected: { quotient: '0x1', reminder: '0x44' } },
  { input: { dividend: '0xA67', divisor: '0x433' }, expected: { quotient: '0x2', reminder: '0x201' } },
  { input: { dividend: '0x1AA', divisor: '0x143' }, expected: { quotient: '0x1', reminder: '0x67' } },
  { input: { dividend: '0x49A', divisor: '0x229' }, expected: { quotient: '0x2', reminder: '0x48' } },
  { input: { dividend: '0x438', divisor: '0x35B' }, expected: { quotient: '0x1', reminder: '0xDD' } },
  { input: { dividend: '0x580', divisor: '0x1BB' }, expected: { quotient: '0x3', reminder: '0x4F' } },
  { input: { dividend: '0x58F', divisor: '0x20D' }, expected: { quotient: '0x2', reminder: '0x175' } },
  { input: { dividend: '0x387', divisor: '0x14C' }, expected: { quotient: '0x2', reminder: '0xEF' } },
  { input: { dividend: '0x6F8', divisor: '0x645' }, expected: { quotient: '0x1', reminder: '0xB3' } },
  { input: { dividend: '0x351', divisor: '0x34C' }, expected: { quotient: '0x1', reminder: '0x5' } },
  { input: { dividend: '0xDC7', divisor: '0xA98' }, expected: { quotient: '0x1', reminder: '0x32F' } },
  { input: { dividend: '0xEF9', divisor: '0xE55' }, expected: { quotient: '0x1', reminder: '0xA4' } },
  { input: { dividend: '0xF0B', divisor: '0xAA4' }, expected: { quotient: '0x1', reminder: '0x467' } },
  { input: { dividend: '0xFA1', divisor: '0x4DB' }, expected: { quotient: '0x3', reminder: '0x110' } },
  { input: { dividend: '0x4B3', divisor: '0x1C0' }, expected: { quotient: '0x2', reminder: '0x133' } },
  { input: { dividend: '0x3A2', divisor: '0x2BD' }, expected: { quotient: '0x1', reminder: '0xE5' } },
  { input: { dividend: '0x311', divisor: '0x205' }, expected: { quotient: '0x1', reminder: '0x10C' } },
  { input: { dividend: '0x1B5', divisor: '0x105' }, expected: { quotient: '0x1', reminder: '0xB0' } },
  { input: { dividend: '0x26C', divisor: '0x10B' }, expected: { quotient: '0x2', reminder: '0x56' } },
  { input: { dividend: '0xCF4', divisor: '0x855' }, expected: { quotient: '0x1', reminder: '0x49F' } },
  { input: { dividend: '0xF00', divisor: '0x715' }, expected: { quotient: '0x2', reminder: '0xD6' } },
  { input: { dividend: '0x1E3', divisor: '0x172' }, expected: { quotient: '0x1', reminder: '0x71' } },
  { input: { dividend: '0xCF9', divisor: '0xC1C' }, expected: { quotient: '0x1', reminder: '0xDD' } },
  { input: { dividend: '0x720', divisor: '0x3F1' }, expected: { quotient: '0x1', reminder: '0x32F' } },
  { input: { dividend: '0x7D7', divisor: '0x2E6' }, expected: { quotient: '0x2', reminder: '0x20B' } },
  { input: { dividend: '0x12E', divisor: '0x11D' }, expected: { quotient: '0x1', reminder: '0x11' } },
  { input: { dividend: '0x6F6', divisor: '0x5E7' }, expected: { quotient: '0x1', reminder: '0x10F' } },
  { input: { dividend: '0x983', divisor: '0x82B' }, expected: { quotient: '0x1', reminder: '0x158' } },
  { input: { dividend: '0x203', divisor: '0x1C5' }, expected: { quotient: '0x1', reminder: '0x3E' } },
  { input: { dividend: '0x391', divisor: '0x14D' }, expected: { quotient: '0x2', reminder: '0xF7' } },
  { input: { dividend: '0x3F2', divisor: '0x1C3' }, expected: { quotient: '0x2', reminder: '0x6C' } },
  { input: { dividend: '0xD58', divisor: '0x6FF' }, expected: { quotient: '0x1', reminder: '0x659' } },
  { input: { dividend: '0xB8E', divisor: '0xB83' }, expected: { quotient: '0x1', reminder: '0xB' } },
  { input: { dividend: '0x889', divisor: '0x4A5' }, expected: { quotient: '0x1', reminder: '0x3E4' } },
  { input: { dividend: '0x776', divisor: '0x6C9' }, expected: { quotient: '0x1', reminder: '0xAD' } },
  { input: { dividend: '0x2A6', divisor: '0x11B' }, expected: { quotient: '0x2', reminder: '0x70' } },
  { input: { dividend: '0x150', divisor: '0x145' }, expected: { quotient: '0x1', reminder: '0xB' } },
  { input: { dividend: '0x397', divisor: '0x218' }, expected: { quotient: '0x1', reminder: '0x17F' } },
  { input: { dividend: '0x1C2', divisor: '0x1AF' }, expected: { quotient: '0x1', reminder: '0x13' } },
  { input: { dividend: '0x2F9', divisor: '0x165' }, expected: { quotient: '0x2', reminder: '0x2F' } },
  { input: { dividend: '0xF94', divisor: '0xB5B' }, expected: { quotient: '0x1', reminder: '0x439' } },
  { input: { dividend: '0x679', divisor: '0x2C4' }, expected: { quotient: '0x2', reminder: '0xF1' } },
  { input: { dividend: '0x50B', divisor: '0x105' }, expected: { quotient: '0x4', reminder: '0xF7' } },
  { input: { dividend: '0x119', divisor: '0xF' }, expected: { quotient: '0x12', reminder: '0xB' } },
  { input: { dividend: '0x1E3', divisor: '0x4' }, expected: { quotient: '0x78', reminder: '0x3' } },
  { input: { dividend: '0x41C', divisor: '0x9' }, expected: { quotient: '0x74', reminder: '0x8' } },
  { input: { dividend: '0x1963', divisor: '0x5' }, expected: { quotient: '0x513', reminder: '0x4' } },
];

(function () {
  const variant = process.argv[2];

  if (!['fast', 'standard'].includes(variant)) {
    console.log(`Unknown code variant "${variant}"!`);
    process.exit(0);
  }

  const { rom, sourceCode, sourceMap, symbols } = compileCodeForTest(
    variant === 'standard' ? 'submodules/divMulti.i4040' : 'submodules/div16_fast.i4040',
    variant === 'standard' ? 'divMWxMW' : 'div16x16',
  );

  const runSingleTest = variant === 'fast' ? runSingleTestFast : runSingleTestStandard;

  let sum = 0;
  for (const [idx, { input, expected }] of TESTS.entries()) {
    if (idx % 10 === 0) {
      console.log(`Run test ${idx + 1} / ${TESTS.length}...`);
    }

    const { result, elapsed } = runSingleTest(rom, input);

    if (
      parseInt(expected.quotient, 16) !== parseInt(result.quotient, 16)
      || parseInt(expected.reminder, 16) !== parseInt(result.reminder, 16)
    ) {
      console.log(`Test failed, input = ${JSON.stringify(input)}, expected = ${JSON.stringify(expected)}, result = ${JSON.stringify(result)}`);
      console.log('Code to reproduce:');
      const initializators = variant === 'fast'
        ? [
          generateMemoryBankSwitch(0x7),
          generateMemoryStatusCharactersInitialization(0x1, hexToHWNumber(input.divisor)),
          generateMemoryStatusCharactersInitialization(0x2, hexToHWNumber(input.dividend)),
          generateRegisterInitialization(8, 0x1),
          generateRegisterInitialization(9, 0x2),
        ]
        : [
          generateMemoryBankSwitch(0x7),
          generateMemoryMainCharactersInitialization(0x9, hexToHWNumber(input.divisor)),
          generateMemoryMainCharactersInitialization(0x8, hexToHWNumber(input.dividend)),
        ];

      console.log(updateCodeForUseInEmulator(sourceCode, initializators, sourceMap, symbols));
      process.exit(1);
    }

    sum += (Number(elapsed) - PROLOGUE_CYCLES_COUNT);
  }

  console.log(`Avg execution time: ${Math.round((sum / TESTS.length) * 100) / 100}`);
}());
