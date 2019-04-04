export default `  NOP
  INC rr1 // set target address to 0x01     
  FIN r1  // load data to rr2 / rr3, it should be 8-bit bytecode for INC instruction
`;
