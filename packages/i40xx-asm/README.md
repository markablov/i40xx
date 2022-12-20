# i40xx-asm

[![npm version](https://img.shields.io/npm/v/i40xx-asm)](https://www.npmjs.com/package/i40xx-asm)

Assembly for Intel 4004/4040 architecture

## Installation

Install globally:

```sh
npm install -g i40xx-asm
```

## Usage

Compiles `program.i4004` into ROM image and store it into `program.bin`

```sh
i40xx-asm program.i4004 program.bin 
```

You can omit output file name, in that case assembler would replace extension of input file name to `.bin`

## Assembly Syntax

Comments started with `#`:
```
# comment
```

Labels could be used:
```
label:
  NOP
label2: DCL
```

Each instruction should be on separate line and can have 0, 1, or 2 operands:
```
  instruction
  instruction operand
  instruction operand1, operand2
```
Operand could be one of kind:
- 4-bit index register, format is `rrX`, where X is [1..16]: `LD rr10`
- 8-bit index register pair, format is `rX`, where X is [1..8]: `FIN r3`
- immediate value, either hex or decimal: `LDM 0xF` / `FIM r2, 200`
- bank address, format is `XX:YYY`, where XX is bank number (in decimal form) and YYY is offset inside bank: `JUN 5:0xDD`
- label name: `ISZ rr5, do_loop`
- condition (for `JCN` instruction), combination of symbols `n` (invert condition), `z` (if zero), `t` (if test signal is 0), `c` (if carry): `JCN nz, non_zero`

Sample program (iterate through all RAM banks, RAM chips and their registers and fill RAM words by specific value):
```
  FIM r0, 0x80
loop_bank:
  // select bank
  LD rr1
  DCL
  // iterate through reg number
  FIM r1, 0x00
loop_reg:
  LDM 0
  XCH rr3
  SRC r1
  LD rr1
  WRM // write rr1 to [#rr1, #rr2, M0]
  WR0 // write rr1 to [#rr1, #rr2, S0]
  INC rr3
  SRC r1
  LD rr2
  WRM // write rr2 to [#rr1, #rr2, M1]
  WR1 // write rr2 to [#rr1, #rr2, S1]
  ISZ rr2, loop_reg
  INC rr1
  ISZ rr0, loop_bank
halt:
  JUN halt
```

## Module/Programmatic Usage

i40xx-asm can be required as a module:

```js
const parse = require('i40xx-asm');

const { errors, data } = parse('nop');
if (Array.isArray(errors) && errors.length) {
  console.log(errors);
  process.exit(1);
}

console.log(`First byte of ROM is ${data[0]}`);
```
