export default `  NOP
  LDM 9
  // test comment
  LD r0
  XCH r1
  ADD r2
  SUB r3
  INC r4
  # test comment 1
  BBL 0xF
  JIN rr0
  SRC rr1
  FIN rr2
  JUN label1
  JMS 00:0xFF
  JCN NZ, label2 // test comment 2
  ISZ r9, 123
  FIM rr7, label3
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
