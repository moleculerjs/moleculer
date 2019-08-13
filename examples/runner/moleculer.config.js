"use strict";

/*
	This is an external configuration file for Moleculer Runner

	Start Broker

		Windows:
			node bin\moleculer-runner.js -c examples\runner\moleculer.config.js -r examples/user.service.js

		Linux:
			node ./bin/moleculer-runner -c examples/runner/moleculer.config.js -r examples/user.service.js

*/

module.exports = {
	namespace: "bbb",
	logger: true,
	logLevel: "debug",
	//transporter: "TCP"
};
