/* eslint-disable no-console */
const _ = require("lodash");
const kleur = require("kleur");
const path = require("path");
const diff = require("jest-diff").default;
const { ServiceBroker } = require("../../");

const SCENARIOS = [];

function addScenario(name, fn) {
	SCENARIOS.push({ name, fn });
}

async function executeScenarios(broker, waitForServices, waitForNodeIDs) {
	let failed = 0;
	const total = SCENARIOS.length;

	await broker.start();

	if (waitForNodeIDs) {
		await waitForNodes(broker, waitForNodeIDs);
	}

	if (waitForServices) {
		await broker.waitForServices(waitForServices, 10 * 1000);
	}

	if (!process.env.TRANSPORTER || process.env.TRANSPORTER == "TCP") {
		// Wait for extra time for discovering
		await broker.Promise.delay(10 * 1000);
	}

	await ServiceBroker.Promise.mapSeries(SCENARIOS, async scenario => {
		console.log();
		console.log(kleur.white().bold(`SCENARIO '${scenario.name}': Start...`));
		try {
			await scenario.fn();
			console.log(kleur.green().bold(`SCENARIO '${scenario.name}': OK`));

		} catch(err) {
			failed++;
			console.error(kleur.red().bold(`SCENARIO '${scenario.name}': ERROR`));
			if (err.name == "AssertionError") {
				console.error(err.name, err.stack);
				console.error(err.diff);
			} else {
				console.error(err);
			}
		}
	});

	console.log("-----------------------");
	console.log(kleur[failed > 0 ? "red" : "green"]().bold(`RESULT: ${total - failed} / ${total}`));
	broker.broadcast("$shutdown", { error: failed > 0 });

	return failed == 0;
}

function waitForNodes(broker, nodes, timeout = 10 * 1000) {
	const startTime = Date.now();
	broker.logger.info("Waiting for nodes...", nodes);
	return new Promise((resolve, reject) => {
		const check = () => {
			const available = broker.registry.nodes.list({ onlyAvailable: true }).map(node => node.id);

			if (nodes.every(nodeID => available.includes(nodeID))) {
				broker.logger.info(`Nodes '${nodes.join(", ")}' are available.`);
				return resolve();
			}

			if (timeout && Date.now() - startTime > timeout)
				return reject(new Error("Nodes waiting is timed out."));

			setTimeout(check, 1000);
		};

		check();
	});
}

function createNode(nodeID, brokerOpts = {}) {
	let transporter = process.env.TRANSPORTER || "TCP";
	if (transporter == "Kafka")
		transporter = "kafka://localhost:9093";

	const broker = new ServiceBroker({
		namespace: process.env.NAMESPACE,
		nodeID,
		logLevel: process.env.LOGLEVEL || "warn",
		transporter,
		serializer: process.env.SERIALIZER || "JSON",
		...brokerOpts
	});

	broker.loadService(path.join(__dirname, "./services/helper.service.js"));

	return broker;
}

function assert(actual, expected) {
	if (!_.isEqual(actual, expected)) {
		const err = new Error("Assertion error");
		err.name = "AssertionError";
		err.diff = diff(expected, actual);
		throw err;
	}
}

module.exports = {
	assert,
	createNode,
	addScenario,
	executeScenarios
};
