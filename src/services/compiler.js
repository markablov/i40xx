const worker = new Worker('../workers/compiler/compiler.js');

worker.onmessage = () => {
};

const compile = () => {
};

export { compile };
