/* eslint-env node */
/* eslint-disable no-console */

/*
 * Sample code to show how to use parser/emulator from node.js script
 */

// eslint-disable-next-line no-global-assign
require = require('esm')(module);

const { default: parse } = require('../libs/parser/parser.js');
const { default: System } = require('../libs/emulator/system.js');

(function main(){
  const { errors, data }  = parse('ldm 0xA');
  if (Array.isArray(errors) && errors.length) {
    console.log('COULD NOT PARSE SOURCE CODE!');
    console.log(errors);
    process.exit(1);
  }

  const system = new System(data);
  while (!system.isFinished())
    system.instruction();

  console.log('Program is finished.');
  console.log('Dump of system registers:');
  console.log(system.registers);
})();
