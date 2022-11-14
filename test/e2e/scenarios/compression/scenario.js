const { assert, createNode, executeScenarios, addScenario, getStreamSHA } = require("../../utils");
const Stream = require("stream");
const TransmitCompression = require("../../../../src/middlewares/transmit/compression");

const broker = createNode("supervisor", {
	middlewares: [TransmitCompression({ method: "gzip" })]
});
broker.loadService("../../services/scenario.service.js");

const participants = [];
for (let i = 0; i < 100000; i++) {
	participants.push({ entry: i });
}

addScenario("send a stream with big metadata", async () => {
	await broker.call("$scenario.clear");
	// ---- ^ SETUP ^ ---

	const stream = new Stream.Readable();
	stream.push(Buffer.from(JSON.stringify(participants)));
	stream.push(null);

	const meta = {
		reqMeta: "reqMeta",
		participants: participants.slice(0, 100)
	};

	const res = await broker.call("echo.replyStream", stream, { meta });

	// ---- ˇ ASSERTS ˇ ---
	assert(res, {
		hash: "8e06ca55aa3b98c482545819b522a327a720fcd8",
		meta
	});
});

addScenario("receive a stream with big metadata", async () => {
	await broker.call("$scenario.clear");
	// ---- ^ SETUP ^ ---

	const p = broker.call("echo.sendStream");
	const res = await p;

	const hash = await getStreamSHA(res);

	// ---- ˇ ASSERTS ˇ ---
	assert(hash, "8e06ca55aa3b98c482545819b522a327a720fcd8");
	assert(p.ctx.meta, {
		resMeta: "resMeta",
		participants: participants.slice(0, 100)
	});
});

executeScenarios(broker, ["echo"]);
