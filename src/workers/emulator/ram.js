class RAM {
  constructor(cpuPins) {
    this.cpu = cpuPins;
    // 8 banks, every bank contains 2^8 = 256 words
    this.banks = Array.from(Array(8), () => Array.from(Array(256), () => 0));
  }

  /*
   * Main function, that is called every machine cycle and works with internal state and CPU pins
   */
  tick() {
  }
}

export default RAM;
