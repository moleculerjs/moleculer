"use strict";

/*
	This is an async external configuration file (downloaded via HTTP request) for Moleculer Runner

	Start Broker

		Windows:
			node bin\moleculer-runner.js -c examples/runner/moleculer.config.async.js -r examples/user.service.js

		Linux:
			node ./bin/moleculer-runner -c examples/runner/moleculer.config.async.js -r examples/user.service.js

*/

const fetch = require("node-fetch");

module.exports = async function () {
	const res = await fetch("https://pastebin.com/raw/SLZRqfHX");
	return await res.json();
};
