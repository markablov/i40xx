/* eslint-env node */
/* eslint-disable no-console */

/*
 * Sample code to show how to use parser/emulator from node.js script
 */

const fs = require('fs');
const path = require('path');

// eslint-disable-next-line no-global-assign
require = require('esm')(module);

const { default: parse } = require('../libs/parser/parser.js');
const { default: System } = require('../libs/emulator/system.js');

const numberToMW = val => {
  const wordCount = Math.max(1, Math.ceil(Math.log2(val + 1) / 4));
  const words = Array(wordCount);
  for (let i = 0; i < wordCount; i++) {
    words[i] = val & 0xF;
    val = val >> 4;
  }
  return words;
};

const MWToNumber = words => {
  let val = 0;
  for (let i = words.length - 1; i >= 0; i--)
    val = (val << 4) | words[i];
  return val;
};

const SOURCE_CODE = `
  LDM 7
  DCL
  FIM r0, 0xF5
  SRC r0
  LDM $$DIVISOR0
  WRM
  INC rr1
  SRC r0
  LDM $$DIVISOR1
  WRM
  INC rr1
  SRC r0
  LDM $$DIVISOR2
  WRM
  INC rr1
  SRC r0
  LDM 0x0
  WRM

  FIM r0, 0xF0
  SRC r0
  LDM $$DIVIDEND0
  WRM
  INC rr1
  SRC r0
  LDM $$DIVIDEND1
  WRM
  INC rr1
  SRC r0
  LDM $$DIVIDEND2
  WRM
  INC rr1
  SRC r0
  LDM $$DIVIDEND3
  WRM
  INC rr1
  SRC r0
  LDM 0x0
  WRM

  JMS div_buf_by_numerator
  JUN end_of_ram


// divide 8bit number by 4bit number
// INPUT:
//   rr0 - high word of dividend, rr1 - low word of dividend, rr2 - divisor
// OUTPUT:
//   rr0 - quotient, rr1 - reminder, CARRY flag would be set in case of overflow (quotient > 15)
// REGISTERS MODIFIED:
//   rr3 - temporal quotient
//   rr6 - zero
div8bitBy4bit:
  CLB
  XCH rr3
  CLB
  XCH rr6
div8bitBy4bit_subtract:
  CLC
  LD rr1
  SUB rr2
  XCH rr1
  CMC
  LD rr0
  SUB rr6
  XCH rr0
  JCN nc, div8bitBy4bit_return
  ISZ rr3, div8bitBy4bit_subtract
  // overflow occurs
  BBL 0
div8bitBy4bit_return:
  LD rr1
  ADD rr2
  XCH rr1
  LD rr3
  XCH rr0
  CLC
  BBL 0

// check if dividend bigger or equal than divisor
// OUTPUT:
//   CARRY is set if dividend is bigger or equal than divisor
div_buf_by_numerator_is_dividend_bigger_or_equal_than_divisor:
  FIM r0, 0xF0
  FIM r1, 0xF5
  LDM 0xB
  XCH rr5
  STC
div_buf_by_numerator_is_dividend_bigger_or_equal_than_divisor_next_word:
  SRC r0
  RDM
  SRC r1
  CMC
  SBM
  INC rr1
  INC rr3
  ISZ rr5, div_buf_by_numerator_is_dividend_bigger_or_equal_than_divisor_next_word
  BBL 0

// shift left multiword number
// INPUT:
//   rr6 - shift value
//   rr7 - (4 - shift value)
//   rr1 - (character index in memory for MSW shifting number) + 1
//   rr2 - number of words
div_buf_by_numerator_shift_number_left:
  LDM 0xF
  XCH rr0
  LD rr2
  CMA
  IAC
  XCH rr2
div_buf_by_numerator_shift_number_left_shift_digit:
  // shift right next digit, some bits would be transferred to current difit
  LD rr1
  DAC
  XCH rr1
  SRC r0
  RDM
  XCH rr4
  JMS shift_right
  // shift left current digit
  INC rr1
  SRC r0
  RDM
  XCH rr3
  JMS shift_left
  LD rr3
  ADD rr4
  WRM
  LD rr1
  DAC
  XCH rr1
  ISZ rr2, div_buf_by_numerator_shift_number_left_shift_digit
  // shift left LSW
  SRC r0
  RDM
  XCH rr3
  JMS shift_left
  LD rr3
  WRM
  BBL 0

// shift right multiword number
// INPUT:
//   rr7 - shift value
//   rr6 - (4 - shift value)
//   rr1 - character index in memory for LSW
//   rr2 - number of words
div_buf_by_numerator_shift_number_right:
  LDM 0xF
  XCH rr0
  LD rr2
  CMA
  IAC
  XCH rr2
div_buf_by_numerator_shift_number_right_digit:
  SRC r0
  RDM
  XCH rr4
  JMS shift_right
  INC rr1
  SRC r0
  RDM
  XCH rr3
  JMS shift_left
  LD rr1
  DAC
  XCH rr1
  SRC r0
  CLC
  LD rr3
  ADD rr4
  WRM
  INC rr1
  ISZ rr2, div_buf_by_numerator_shift_number_right_digit
  BBL 0

// multiply 1-word number by 1-word number, output is 2-word
// INPUT:
//   rr0 - multiplier
//   rr1 - multiplicand
// OUTPUT:
//   rr2 - low word
//   rr3 - high word
mul4bitBy4bit:
  FIM r1, 0x00
  LD rr1
  JCN z, mul4bitBy4bit_return
  CMA
  IAC
  XCH rr1
mul4bitBy4bit_add:
  LD rr2
  ADD rr0
  XCH rr2
  LDM 0
  ADD rr3
  XCH rr3
  ISZ rr1, mul4bitBy4bit_add
mul4bitBy4bit_return:
  BBL 0
  
// shift right 4bit number
// INPUT:
//   rr7 - shift value
//   rr4 - value
// OUTPUT:
//   rr4 - shifter value
shift_right:
  LD rr7
  CMA
  IAC
  XCH rr5
  LD rr4
shift_right_bit:
  RAR
  CLC
  ISZ rr5, shift_right_bit
  XCH rr4
  BBL 0

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

// get word count for number (detected by 0 at most significant word)
// INPUT:
//   rr1 - index for last character in memory allocated for number + 1
//   rr2 - max possible length of number + 1
// OUTPUT:
//   rr2 - word count
div_buf_by_numerator_number_len:
  LDM 0xF
  XCH rr0
div_buf_by_numerator_number_len_check_prev_word:
  LD rr1
  DAC
  XCH rr1
  LD rr2
  DAC
  XCH rr2
  SRC r0
  RDM
  JCN z, div_buf_by_numerator_number_len_check_prev_word
  CLC
  BBL 0
  
// shift left 4bit number
// INPUT:
//   rr6 - shift value
//   rr3 - value
// OUTPUT:
//   rr3 - shifter value
shift_left:
  LD rr6
  CMA
  IAC
  XCH rr5
  LD rr3
shift_left_bit:
  RAL
  CLC
  ISZ rr5, shift_left_bit
  XCH rr3
  BBL 0

NOP
NOP
NOP
NOP
NOP
NOP
NOP
NOP
NOP
NOP
NOP
NOP
NOP
NOP
NOP
NOP
NOP
NOP

// get single quotient digit at specified position
// INPUT:
//   rr7 - quotient digit idx
//   rr10 - number of words for dividend
//   rr11 - number of words for divisor
//   dividend - bank #7, register #F, main characters [0..4], LSW at #0 character
//   divisor - bank #7, register #F, main characters [5..9]
// OUTPUT:
//   rr6 - quotient digit
// REGISTER MODIFIED:
//   rr0/rr1/rr2/rr3/rr4/rr5
//   rr8 - temporal variable, we can use it because it would be overwritten by low quotient digit after call
div_buf_by_numerator_get_quotient_digit:
  FIM r2, 0xF4
  LD rr11
  ADD rr5
  XCH rr5
  SRC r2
  RDM
  // divisor[divisorDigits - 1]
  XCH rr2
  LD rr11
  DAC
  CLC
  ADD rr7
  XCH rr5
  SRC r2
  RDM
  // dividend[divisorDigits + quotentDigitIdx - 1]
  XCH rr1
  INC rr5
  SRC r2
  RDM
  // dividend[divisorDigits + quotentDigitIdx]
  XCH rr0
  JMS div8bitBy4bit
  LD rr1
  XCH rr8
  LD rr0
  XCH rr6
  // quotient digit should be in range [0..F]
  JCN nc, div_buf_by_numerator_get_quotient_digit_quotient_is_not_overflown
  LDM 0xF
  XCH rr6
  JUN div_buf_by_numerator_get_quotient_digit_mulsub
div_buf_by_numerator_get_quotient_digit_quotient_is_not_overflown:
  LDM 3
  ADD rr11
  XCH rr5
  SRC r2
  // divisor[divisorDigits - 2]
  RDM
  XCH rr1
  LD rr6
  XCH rr0
  JMS mul4bitBy4bit
  LD rr8
  SUB rr3
  JCN nc, div_buf_by_numerator_get_quotient_digit_rough_tune_estimated_quotient
  JCN nz, div_buf_by_numerator_get_quotient_digit_mulsub
  // we have carry flag there, so it would be added to rr7, take it into account
  LDM 3
  XCH rr0
  LD rr11
  ADD rr7
  SUB rr0
  CLC
  XCH rr5
  SRC r2
  // dividend[divisorDigits + quotentDigitIdx - 2]
  RDM
  SUB rr2
  JCN c, div_buf_by_numerator_get_quotient_digit_mulsub
div_buf_by_numerator_get_quotient_digit_rough_tune_estimated_quotient:
  LD rr6
  DAC
  CLC
  XCH rr6
  LDM 4
  ADD rr11
  XCH rr5
  SRC r2
  // divisor[divisorDigits - 1]
  RDM
  ADD rr8
  XCH rr8
  JCN nc, div_buf_by_numerator_get_quotient_digit_quotient_is_not_overflown
div_buf_by_numerator_get_quotient_digit_mulsub:
  // rr4 - carry
  // rr5 - digit idx
  // rr8 - loop iterator
  LDM 0
  XCH rr4
  LDM 0
  XCH rr5
  LD rr11
  CMA
  IAC
  XCH rr8
div_buf_by_numerator_get_quotient_digit_mulsub_digit:
  FIM r0, 0xF5
  LDM 0x5
  ADD rr5
  XCH rr1
  SRC r0
  // divisor[divisorDigitIdx]
  RDM
  XCH rr1
  LD rr6
  XCH rr0
  JMS mul4bitBy4bit
  // rr2 = product[0], rr3 = product[1]
  FIM r0, 0xF0
  LD rr5
  ADD rr7
  XCH rr1
  SRC r0
  // dividend[divisorDigitIdx + quotentDigitIdx]
  RDM
  SUB rr4
  XCH rr0
  CMC
  TCC
  XCH rr4
  LD rr0
  SUB rr2
  CMC
  JCN nc, div_buf_by_numerator_get_quotient_digit_mulsub_digit_no_more_carry
  INC rr4
  CLC
div_buf_by_numerator_get_quotient_digit_mulsub_digit_no_more_carry:
  WRM
  LD rr4
  ADD rr3
  XCH rr4
  INC rr5
  ISZ rr8, div_buf_by_numerator_get_quotient_digit_mulsub_digit
div_buf_by_numerator_get_quotient_digit_mulsub_last_digit:
  FIM r0, 0xF0
  LD rr11
  ADD rr7
  XCH rr1
  SRC r0
  // dividend[dividendDigitIdx]
  RDM
  SUB rr4
  CMC
  WRM
  JCN nc, div_buf_by_numerator_get_quotient_digit_return
  // compensate if current reminder is negative now
  LD rr6
  DAC
  XCH rr6
  // rr4 - carry
  // rr5 - digit idx
  // rr8 - loop iterator
  LDM 0
  XCH rr4
  LDM 0
  XCH rr5
  LD rr11
  CMA
  IAC
  XCH rr8
div_buf_by_numerator_get_quotient_digit_add_digit:
  FIM r0, 0xF0
  LDM 0x5
  ADD rr5
  XCH rr1
  SRC r0
  // divisor[divisorDigitIdx]
  RDM
  XCH rr2
  LD rr5
  ADD rr7
  XCH rr1
  SRC r0
  // dividend[divisorDigitIdx + quotentDigitIdx]
  RDM
  ADD rr2
  XCH rr3
  TCC
  XCH rr0
  LD rr3
  ADD rr4
  WRM
  TCC
  ADD rr0
  XCH rr4
  INC rr5
  ISZ rr8, div_buf_by_numerator_get_quotient_digit_add_digit
div_buf_by_numerator_get_quotient_digit_add_digit_last_digit:
  FIM r0, 0xF0
  LD rr11
  ADD rr7
  XCH rr1
  SRC r0
  // dividend[dividendDigitIdx]
  RDM
  ADD rr4
  WRM
  CLC
div_buf_by_numerator_get_quotient_digit_return:
  BBL 0

  
// divide N-word by 1-word
// REGISTER MODIFIED:
//   rr6/rr7 - dividend digit RAM address
//   rr2 - divisor
// INPUT:
//   dividend - bank #7, register #F, main characters [0..4], LSW at #0 character
//   divisor - bank #7, register #F, main characters [5..9]
// OUTPUT:
//   quotient - rr8/rr9
//   reminder - bank #7, register #F, main characters [0..4]
// NOTES:
//   quotient is always 1 or 2 digits, so we know that if dividend is 3-word number, then MSW < divisor
div_buf_by_numerator_one_word_divisor:
  // load divisor
  FIM r3, 0xF5
  SRC r3
  RDM
  XCH rr2
  // calculate MSW for quotient
  LDM 2
  XCH rr7
  SRC r3
  RDM
  XCH rr0
  LDM 0
  WRM
  LDM 1
  XCH rr7
  SRC r3
  RDM
  XCH rr1
  LDM 0
  WRM
  // call div8bitBy4bit(dividend[2], dividend[1], divisor)
  JMS div8bitBy4bit
  // rr0 - quotient, rr1 - reminder
  LD rr0
  XCH rr9
  // calculate LSW for quotient
  LD rr1
  XCH rr0
  FIM r3, 0xF0
  SRC r3
  RDM
  XCH rr1
  // call div8bitBy4bit(reminder, dividend[0], divisor)
  JMS div8bitBy4bit
  // rr0 - quotient, rr1 - reminder
  LD rr0
  XCH rr8
  LD rr1
  WRM
  BBL 0
  
// divide N-word number from buffer by M-word number
// INPUT:
//   dividend - bank #7, register #F, main characters [0..4], LSW at #0 character
//   divisor - bank #7, register #F, main characters [5..9]
// OUTPUT:
//   quotient - rr8/rr9
//   reminder - bank #7, register #F, main characters [0..4]
// REGISTER UNMODIFIED:
//   rr12/rr13/rr14/rr15
// REGISTER MODIFIED:
//   rr10 - number of words for dividend
//   rr11 - number of words for divisor
div_buf_by_numerator:
  // get word count for dividend
  LDM 0x5
  XCH rr1
  LDM 0x6
  XCH rr2
  JMS div_buf_by_numerator_number_len
  LD rr2
  XCH rr10
  // get word count for divisor
  LDM 0xA
  XCH rr1
  LDM 0x6
  XCH rr2
  JMS div_buf_by_numerator_number_len
  LD rr2
  XCH rr11
  // check if dividend >= divisor, otherwise return quotient = 0
  JMS div_buf_by_numerator_is_dividend_bigger_or_equal_than_divisor
  JCN c, div_buf_by_numerator_dividend_is_bigger_or_equal_than_divisor
  FIM r4, 0x00
  BBL 0
div_buf_by_numerator_dividend_is_bigger_or_equal_than_divisor:
  // check if we have 4bit divisor, in that case we use faster and simpler calculations
  CLC
  LDM 1
  SUB rr11
  JCN z, div_buf_by_numerator_one_word_divisor
  // shift divisor and dividend to X bits to make sure that MSB for divisor is set
  // in that case we can estimate quotient digit with high probability to match real digit
  JMS div_buf_by_numerator_normalize_get_shift_value
  FIM r0, 0xF9
  SRC r0
  LD rr6
  WRM
  JCN z, div_buf_by_numerator_normalize_finish
  LDM 4
  SUB rr6
  CLC
  XCH rr7
  LD rr10
  XCH rr2
  LDM 0
  ADD rr2
  XCH rr1
  JMS div_buf_by_numerator_shift_number_left
  LD rr11
  XCH rr2
  LDM 5
  ADD rr2
  XCH rr1
  JMS div_buf_by_numerator_shift_number_left
div_buf_by_numerator_normalize_finish:
  LD rr10
  SUB rr11
  CLC
  JCN z, div_buf_by_numerator_get_lsw_for_quotient
  // 2nd digit for quotient, if necessary
  LDM 1
  XCH rr7
  JMS div_buf_by_numerator_get_quotient_digit
  LD rr6
  XCH rr9
div_buf_by_numerator_get_lsw_for_quotient:
  // 1st digit for quotient
  LDM 0
  XCH rr7
  JMS div_buf_by_numerator_get_quotient_digit
  LD rr6
  XCH rr8
  // denormalization
  FIM r0, 0xF9
  SRC r0
  RDM
  JCN z, div_buf_by_numerator_return
  XCH rr7
  LDM 4
  SUB rr7
  CLC
  XCH rr6
  LDM 0x0
  XCH rr1
  LD rr11
  XCH rr2
  JMS div_buf_by_numerator_shift_number_right
  LDM 0x5
  XCH rr1
  LD rr11
  XCH rr2
  JMS div_buf_by_numerator_shift_number_right
  FIM r0, 0xF9
  SRC r0
  LDM 0x0
  WRM
div_buf_by_numerator_return:
  BBL 0
  
end_of_ram:
`;

const performTest = (dividend, divisor) => {
  const divisorMW = numberToMW(divisor);
  const dividendMW = numberToMW(dividend);


  const sourceCode = SOURCE_CODE.replace(
    /\$\$([A-Z]+)(\d)/g,
    (match, type, idx) => type === 'DIVISOR' ? (divisorMW[idx] || 0) : (dividendMW[idx] || 0)
  );

  const { errors, data }  = parse(sourceCode);
  if (Array.isArray(errors) && errors.length) {
    console.log('COULD NOT PARSE SOURCE CODE!');
    console.log(errors);
    process.exit(1);
  }

  const system = new System(data);
  while (!system.isFinished())
    system.instruction();

  const quotient = MWToNumber([system.registers.index[8], system.registers.index[9]]);
  const reminder = MWToNumber(system.ram.banks[7].registers[0xF].main.slice(0, 5));

  const quotientExpected = Math.floor(dividend / divisor);
  const reminderExpected = dividend % divisor;

  if (quotient === quotientExpected && reminder === reminderExpected)
    return true;

  console.log(`ERROR! dividend = ${dividend}, divisor = ${divisor}, quotient = ${quotient}, reminder = ${reminder}`);

  return false;
};

(function main(){
  console.log('DIV TEST');

  const data = fs.readFileSync(path.join(__dirname, './test.dat'), 'utf8');
  const tests = data.split('\n');

  let step = 0, total = tests.length;

  for (const [dividend, divisor] of tests.map(x => x.split(', ').map(x => +x))) {
    if (!performTest(dividend, divisor)) {
      console.log(`${step} tests was passed successfully!`);
      process.exit();
    }

    step++;
    if (step % 1000 === 0)
      console.log(`${step} / ${total}`);
  }
})();
