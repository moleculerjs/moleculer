const { createNode, getStreamSHA } = require("../../utils");
const _ = require("lodash");
const Stream = require("stream");
const TransmitCompression = require("../../../../src/middlewares/transmit/compression");

const broker = createNode("node1", {
	middlewares: [TransmitCompression({ method: "gzip" })]
});

broker.createService({
	name: "echo",

	actions: {
		replyStream: {
			async handler(ctx) {
				const meta = _.cloneDeep(ctx.meta);
				const hash = await getStreamSHA(ctx.params);

				return {
					meta,
					hash
				};
			}
		},

		sendStream: {
			async handler(ctx) {
				const participants = [];
				for (let i = 0; i < 100000; i++) {
					participants.push({ entry: i });
				}

				const stream = new Stream.Readable();
				stream.push(Buffer.from(JSON.stringify(participants)));
				stream.push(null);

				ctx.meta.resMeta = "resMeta";
				ctx.meta.participants = participants.slice(0, 100);

				return stream;
			}
		}
	}
});

broker.start();
