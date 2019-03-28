class ROM {
  constructor(cpuPins) {
    this.cpu = cpuPins;
  }

  /*
   * Check if provided address is in range for ROM
   */
  isAddressValid() {
  }

  /*
   * Load dump to ROM
   */
  loadDump() {
  }

  /*
   * Main function, that is called every machine cycle and works with internal state and CPU pins
   */
  tick() {
  }
}

export default ROM;
