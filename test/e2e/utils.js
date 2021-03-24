/* eslint-disable no-console */
const _ = require("lodash");
const kleur = require("kleur");
const path = require("path");
const { ServiceBroker } = require("../../");

const SCENARIOS = [];

function addScenario(name, fn) {
	SCENARIOS.push({ name, fn });
}

async function executeScenarios(broker, waitForServices) {
	let failed = 0;
	const total = SCENARIOS.length;

	await broker.start();
	if (waitForServices)
		await broker.waitForServices(waitForServices, 10 * 1000);

	await ServiceBroker.Promise.mapSeries(SCENARIOS, async scenario => {
		console.log(kleur.white().bold(`SCENARIO '${scenario.name}': Start...`));
		try {
			await scenario.fn();
			console.log(kleur.green().bold(`SCENARIO '${scenario.name}': OK`));

		} catch(err) {
			failed++;
			console.error(kleur.red().bold(`SCENARIO '${scenario.name}': ERROR`));
			console.error(err);
		}
	});

	console.log("-----------------------");
	console.log(kleur[failed > 0 ? "red" : "green"]().bold(`RESULT: ${total - failed} / ${total}`));
	broker.broadcast("$shutdown", { error: failed > 0 });

	return failed == 0;
}

function createNode(nodeID, brokerOpts = {}) {
	const broker = new ServiceBroker({
		namespace: process.env.NAMESPACE,
		nodeID,
		logLevel: process.env.LOGLEVEL || "warn",
		transporter: process.env.TRANSPORTER || "TCP",
		serializer: process.env.SERIALIZER || "JSON",
		...brokerOpts
	});

	broker.loadService(path.join(__dirname, "./services/helper.service.js"));

	return broker;
}

function assert(actual, expected) {
	if (!_.isEqual(actual, expected)) {
		const err = new Error("Assertion error");
		err.actual = actual;
		err.expected = expected;
		throw err;
	}
}

module.exports = {
	assert,
	createNode,
	addScenario,
	executeScenarios
};
