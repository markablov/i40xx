class ROM {
  constructor(cpuPins) {
    this.cpu = cpuPins;
    this.data = new Uint8Array(0);
  }

  /*
   * Check if provided address is in range for ROM
   */
  isAddressValid() {
  }

  /*
   * Load dump to ROM
   */
  loadDump(dump) {
    this.data = dump;
  }

  /*
   * Main function, that is called every machine cycle and works with internal state and CPU pins
   */
  tick() {
  }
}

export default ROM;
