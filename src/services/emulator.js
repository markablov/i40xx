const worker = new Worker('../workers/emulator/emulator.js');

worker.onmessage = () => {
};

export { };
