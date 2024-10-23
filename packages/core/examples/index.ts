"use strict";

const moduleName = process.argv[2] || "common/index";
process.argv.splice(2, 1);

async function start() {
	await import(`./${moduleName}`);
}

// eslint-disable-next-line no-void
void start();
