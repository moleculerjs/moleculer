const { assert, createNode, executeScenarios, addScenario } = require("../../utils");
const fs = require("fs");
const path = require("path");

const SERVICES_DIR = path.join(__dirname, "services");

const FILES = {
	greeter: path.join(SERVICES_DIR, "greeter.service.js"),
	shared: path.join(SERVICES_DIR, "shared.js"),
	chainA: path.join(SERVICES_DIR, "chain/A.js")
};

// Snapshot original contents and restore them when the test ends so a
// failed run does not leave the working tree dirty.
const SNAPSHOTS = Object.fromEntries(
	Object.entries(FILES).map(([k, f]) => [k, fs.readFileSync(f, "utf8")])
);

function restoreAll() {
	for (const [k, content] of Object.entries(SNAPSHOTS)) {
		try {
			fs.writeFileSync(FILES[k], content);
		} catch (err) {
			console.error(`Failed to restore ${FILES[k]}`, err);
		}
	}
}
process.on("exit", restoreAll);
process.on("SIGINT", () => process.exit(2));

const broker = createNode("supervisor");

/**
 * Poll an action until it returns `expected` or `timeout` ms elapses.
 * The hot-reload middleware debounces reloads (~500 ms), so we need
 * some slack.
 */
async function waitFor(actionName, expected, timeout = 10000) {
	const start = Date.now();
	let last;
	while (Date.now() - start < timeout) {
		try {
			last = await broker.call(actionName);
			if (last === expected) return;
		} catch (err) {
			last = err.message;
		}
		await broker.Promise.delay(200);
	}
	throw Object.assign(new Error("Timeout"), {
		name: "AssertionError",
		diff: `expected ${actionName} == ${JSON.stringify(expected)}, got ${JSON.stringify(last)}`
	});
}

addScenario("reload service file", async () => {
	await waitFor("greeter.hello", "Hello (v1)");
	fs.writeFileSync(
		FILES.greeter,
		SNAPSHOTS.greeter.replace("return GREETING;", 'return "direct edit";')
	);
	await waitFor("greeter.hello", "direct edit");
});

addScenario("reload on transitive dep change (1 hop)", async () => {
	// First restore greeter so it returns GREETING again.
	fs.writeFileSync(FILES.greeter, SNAPSHOTS.greeter);
	await waitFor("greeter.hello", "Hello (v1)");

	fs.writeFileSync(FILES.shared, 'module.exports = "Hello (v2)";\n');
	await waitFor("greeter.hello", "Hello (v2)");
});

addScenario("reload on transitive dep change (3 hops: A>B>C>service)", async () => {
	const baseline = await broker.call("chained.say");
	assert(baseline, "C wraps: [B says color is blue]");

	fs.writeFileSync(FILES.chainA, 'module.exports = "red";\n');
	await waitFor("chained.say", "C wraps: [B says color is red]");
});

executeScenarios(broker, ["greeter", "chained"]);
