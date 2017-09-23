/* eslint-disable security/detect-child-process */

/* istanbul ignore next*/
const debugExec = (cmd, args=[]) =>
	new Promise(function (resolve, reject) {
		require("child_process")
			.spawn(cmd, args, { stdio: "inherit", shell: true })
			.on("exit", resolve)
			.on("error", reject);
	});

/* istanbul ignore next*/
const exec = (cmd, args=[]) =>
	new Promise(function (resolve, reject) {
		let data = "";
		const process = require("child_process")
			.spawn(cmd, args, { stdio: "pipe", shell: true });

		process
			.stdout.on("data", function (chunk) {
				data += chunk;
			});
		process
			.on("exit", () => resolve(data))
			.on("error", () => reject(data));
	});

/* istanbul ignore next*/
const callIn = (cb, timeout) =>
	new Promise(res => {
		setTimeout(() => {
			cb().then(res);
		}, timeout);
	});

module.exports = {
	exec,
	debugExec,
	callIn,
};
