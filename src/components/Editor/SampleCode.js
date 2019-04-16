export default `  NOP
  FIM r1, 0x53
  SRC r1 // select register #5, character #3
  LDM 6
  WRM // write 6 to selected RAM main character
  LDM 7
  WR2 // write 7 to selected RAM register and status character #2
  FIM r2, 0x42
  SRC r2 // select register #4, character #2
  LDM 0xA
  WRM // write 0xA to selected RAM main character
  LDM 2
  SRC r1 // select register #5, character #3
  ADM // expect 6 + 2 = 8 to be at accumulator
  XCH rr8
  SRC r2 // select register #4, character #2
  RDM // read 0xA to accumulator
  // expected state: 
  //   ACC = 0xA
  //   rr2 = 0x5
  //   rr3 = 0x3
  //   rr4 = 0x4
  //   rr5 = 0x2
  //   rr8 = 0x8
  //   [reg#5, main#3] = 0x6
  //   [reg#5, status#2] = 0x7
  //   [reg#4, main#2] = 0xA  
`;
