"use strict";

/*
	This is an async external configuration file for Moleculer Runner

	Start Broker

		Windows:
			node bin\moleculer-runner.js -c examples\runner\moleculer.config.async.js -r examples/user.service.js

		Linux:
			node ./bin/moleculer-runner -c examples/runner/moleculer.config.async.js -r examples/user.service.js

*/

module.exports = async function() {
	return {
		namespace: "bbb",
		nodeID: "async-config-node",
		logger: true,
		logLevel: "debug",
		//transporter: "TCP"
	};
};
