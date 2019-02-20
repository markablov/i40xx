const worker = new Worker('../workers/compiler/compiler.js');

worker.onmessage = () => {
};
