class RAM {
  constructor(cpuPins) {
    this.cpu = cpuPins;
  }

  /*
   * Main function, that is called every machine cycle and works with internal state and CPU pins
   */
  tick() {
  }
}

export default RAM;
