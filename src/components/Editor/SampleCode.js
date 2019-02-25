export default `  NOP
  LDM 9
  // test comment
  LD rr0
  XCH rr1
  ADD rr2
  SUB rr3
  INC rr4
  # test comment 1
  BBL 0xF
  JIN r0
  SRC r1
  FIN r2
  JUN label1
  JMS 00:0xFF
  JCN NZ, label2 // test comment 2
  ISZ rr9, 66
  FIM r7, 0xF0
label1:
  RDM
  RD0
  RD1
  RD2
  RD3
  RDR
  WRM
  WR0
  WR1
  WR2
label2: WR3
  WRR
  WMP
  WPM
  ADM
  SBM
  CLB
  CLC
  CMC
  STC
  CMA
  IAC
  DAC
  RAL
label3:
  RAR
  TCC
  DAA
  TCS
  KBP
  DCL`;
