/* eslint-env node */
/* eslint-disable no-console */

// eslint-disable-next-line no-global-assign
require = require('esm')(module);

const { default: parse } = require('../libs/parser/parser.js');
const { default: System } = require('../libs/emulator/system.js');

const SOURCE_CODE = `
  LDM 7
  DCL
  FIM r0, 0xF5
  SRC r0
  LDM $$NUMBER
  WRM
  
  LDM 0x1
  XCH rr11

  JMS div_buf_by_numerator_normalize_get_shift_value
  JUN end_of_ram

// determine on how many bits we need to shift divisor left to set MSB to 1
// OUTPUT:
//   shift value - rr6
div_buf_by_numerator_normalize_get_shift_value:
  LDM 0x0
  XCH rr6
  LDM 0xC
  XCH rr5
  // read MSW for divisor
  FIM r0, 0xF4
  LD rr11
  ADD rr1
  XCH rr1
  SRC r0
  RDM
div_buf_by_numerator_normalize_get_shift_value_check_binary_digit:  
  RAL
  JCN c, div_buf_by_numerator_normalize_get_shift_value_return
  INC rr6
  ISZ rr5, div_buf_by_numerator_normalize_get_shift_value_check_binary_digit
div_buf_by_numerator_normalize_get_shift_value_return:
  CLC
  BBL 0
  
end_of_ram:
`;

const getShiftForDivisor = (msd) => {
  if (msd >= 0b1000)
    return 0;
  if (msd >= 0b0100)
    return 1;
  if (msd >= 0b0010)
    return 2;
  return 3;
};

const performTest = value => {
  const sourceCode = SOURCE_CODE.replace('$$NUMBER', value);

  const { errors, data }  = parse(sourceCode);
  if (Array.isArray(errors) && errors.length) {
    console.log('COULD NOT PARSE SOURCE CODE!');
    console.log(errors);
    process.exit(1);
  }

  const system = new System(data);
  while (!system.isFinished())
    system.instruction();

  const shiftValue = system.registers.index[6];
  const shiftValueExpected = getShiftForDivisor(value);

  console.log(`value = 0b${value.toString(2).padStart(4, '0')}, shiftValue = ${shiftValue}`);

  if (shiftValue === shiftValueExpected)
    return true;

  console.log('ERROR!');

  return false;
};

(function main(){
  for (let value = 1; value < 16; value++) {
    if (!performTest(value))
      process.exit();
  }
  console.log('SUCCESS!');
})();
