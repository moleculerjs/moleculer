const ServiceBroker = require("../../src/service-broker");

const Stream = require("stream");

describe("Test to send stream as ctx.param", () => {
	let b1 = new ServiceBroker({
		logger: false,
		namespace: "test-1",
		transporter: "Fake",
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		logger: false,
		namespace: "test-1",
		transporter: "Fake",
		nodeID: "node-2"
	});

	let FLOW = [];
	let stream = new Stream.Readable({
		read() {}
	});

	b2.createService({
		name: "file",
		actions: {
			save(ctx) {
				expect(FLOW).toEqual([]);
				expect(ctx.params).toBeInstanceOf(Stream.Readable);
				ctx.params.on("data", msg => FLOW.push(msg.toString()));
				ctx.params.on("error", err => {
					FLOW.push("<ERROR:" + err.message + ">");
				});
				ctx.params.on("end", () => FLOW.push("<END>"));

				return "OK";
			}
		}
	});

	beforeAll(() => Promise.all([b1.start(), b2.start()]));
	afterAll(() => Promise.all([b1.stop(), b2.stop()]));

	it("should receive stream on b2", () => {
		FLOW = [];
		return b1.Promise.resolve()
			.then(() => b1.call("file.save", stream))
			.then(res => expect(res).toBe("OK"))
			.then(() => stream.push("first chunk"))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["first chunk"]);
				stream.push(Buffer.from("second chunk"));
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["first chunk", "second chunk"]);
				stream.emit("end");
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["first chunk", "second chunk", "<END>"]);
			});
	});

	it("should receive stream & handle error", () => {
		FLOW = [];
		stream = new Stream.Readable({
			read() {}
		});

		return b1.Promise.resolve()
			.then(() => b1.call("file.save", stream))
			.then(res => expect(res).toBe("OK"))
			.then(() => stream.push("first chunk"))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["first chunk"]);
				stream.emit("error", new Error("Something happened"));
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["first chunk", "<ERROR:Something happened>", "<END>"]);
			});
	});
});

describe("Test to receive a stream as response", () => {
	let b1 = new ServiceBroker({
		logger: false,
		namespace: "test-2",
		transporter: "Fake",
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		logger: false,
		namespace: "test-2",
		transporter: "Fake",
		nodeID: "node-2"
	});

	const stream = new Stream.Readable({
		read() {}
	});

	b2.createService({
		name: "file",
		actions: {
			get() {
				return stream;
			}
		}
	});

	beforeAll(() => Promise.all([b1.start(), b2.start()]));
	afterAll(() => Promise.all([b1.stop(), b2.stop()]));

	it("should receive stream", () => {
		const FLOW = [];
		return b1.Promise.resolve()
			.then(() => b1.call("file.get"))
			.then(res => {
				expect(res).toBeInstanceOf(Stream.Readable);
				res.on("data", msg => FLOW.push(msg.toString()));
				res.on("error", err => FLOW.push("<ERROR:" + err.message + ">"));
				res.on("end", () => FLOW.push("<END>"));
			})
			.then(() => stream.push("first chunk"))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["first chunk"]);
				stream.push(Buffer.from("second chunk"));
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["first chunk", "second chunk"]);
				stream.emit("end");
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["first chunk", "second chunk", "<END>"]);
			});
	});

	it("should receive stream & handle error", () => {
		const FLOW = [];
		return b1.Promise.resolve()
			.then(() => b1.call("file.get"))
			.then(res => {
				expect(res).toBeInstanceOf(Stream.Readable);
				res.on("data", msg => FLOW.push(msg.toString()));
				res.on("error", err => FLOW.push("<ERROR:" + err.message + ">"));
				res.on("end", () => FLOW.push("<END>"));
			})
			.then(() => stream.push("first chunk"))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["first chunk"]);
				stream.emit("error", new Error("Something happened"));
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["first chunk", "<ERROR:Something happened>", "<END>"]);
			});
	});
});

describe("Test duplex streaming", () => {
	let b1 = new ServiceBroker({
		logger: false,
		namespace: "test-3",
		transporter: "Fake",
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		logger: false,
		namespace: "test-3",
		transporter: "Fake",
		nodeID: "node-2"
	});

	b2.createService({
		name: "file",
		actions: {
			convert(ctx) {
				const pass = new Stream.Transform({
					transform: function (chunk, encoding, done) {
						this.push(chunk.toString().toUpperCase());
						return done();
					}
				});
				ctx.params.on("error", err => pass.emit("error", err));
				return ctx.params.pipe(pass);
			}
		}
	});

	beforeAll(() => Promise.all([b1.start(), b2.start()]));
	afterAll(() => Promise.all([b1.stop(), b2.stop()]));

	it("should send & receive stream", () => {
		const FLOW = [];
		const stream = new Stream.Readable({
			read() {}
		});

		return b1.Promise.resolve()
			.then(() => b1.call("file.convert", stream))
			.then(res => {
				expect(res).toBeInstanceOf(Stream.Readable);
				res.on("data", msg => FLOW.push(msg.toString()));
				res.on("error", err => FLOW.push("<ERROR:" + err.message + ">"));
				res.on("end", () => FLOW.push("<END>"));
			})
			.then(() => stream.push("first chunk"))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["FIRST CHUNK"]);
				stream.push(Buffer.from("second chunk"));
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["FIRST CHUNK", "SECOND CHUNK"]);
				stream.emit("end");
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["FIRST CHUNK", "SECOND CHUNK", "<END>"]);
			});
	});

	it("should receive stream & handle error", () => {
		const FLOW = [];
		const stream = new Stream.Readable({
			read() {}
		});
		return b1.Promise.resolve()
			.then(() => b1.call("file.convert", stream))
			.then(res => {
				expect(res).toBeInstanceOf(Stream.Readable);
				res.on("data", msg => FLOW.push(msg.toString()));
				res.on("error", err => FLOW.push("<ERROR:" + err.message + ">"));
				res.on("end", () => FLOW.push("<END>"));
			})
			.then(() => stream.push("first chunk"))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["FIRST CHUNK"]);
				stream.emit("error", new Error("Something happened"));
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual(["FIRST CHUNK", "<ERROR:Something happened>", "<END>"]);
			});
	});
});

describe("Test to send stream in objectMode as ctx.param", () => {
	let b1 = new ServiceBroker({
		logger: false,
		namespace: "test-4",
		transporter: "Fake",
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		logger: false,
		namespace: "test-4",
		transporter: "Fake",
		nodeID: "node-2"
	});

	let FLOW = [];
	let stream = new Stream.Readable({
		objectMode: true,
		read() {}
	});

	b2.createService({
		name: "data",
		actions: {
			store(ctx) {
				expect(FLOW).toEqual([]);
				expect(ctx.params).toBeInstanceOf(Stream.Readable);
				expect(
					ctx.params.readableObjectMode === true ||
						(ctx.params._readableState && ctx.params._readableState.objectMode === true)
				).toBe(true);
				ctx.params.on("data", msg => FLOW.push(msg));
				ctx.params.on("error", err => {
					FLOW.push("<ERROR:" + err.message + ">");
				});
				ctx.params.on("end", () => FLOW.push("<END>"));

				return "OK";
			}
		}
	});

	beforeAll(() => Promise.all([b1.start(), b2.start()]));
	afterAll(() => Promise.all([b1.stop(), b2.stop()]));

	it("should receive stream in objectMode on b2", () => {
		FLOW = [];
		return b1.Promise.resolve()
			.then(() => b1.call("data.store", stream))
			.then(res => expect(res).toBe("OK"))
			.then(() => stream.push({ id: 123, data: "first record" }))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([{ id: 123, data: "first record" }]);
				stream.push({ id: 786, data: "second record" });
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([
					{ id: 123, data: "first record" },
					{ id: 786, data: "second record" }
				]);
				stream.emit("end");
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([
					{ id: 123, data: "first record" },
					{ id: 786, data: "second record" },
					"<END>"
				]);
			});
	});

	it("should receive stream in objectMode & handle error", () => {
		FLOW = [];
		stream = new Stream.Readable({
			objectMode: true,
			read() {}
		});

		return b1.Promise.resolve()
			.then(() => b1.call("data.store", stream))
			.then(res => expect(res).toBe("OK"))
			.then(() => stream.push({ id: 123, data: "first record" }))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([{ id: 123, data: "first record" }]);
				stream.emit("error", new Error("Something happened"));
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([
					{ id: 123, data: "first record" },
					"<ERROR:Something happened>",
					"<END>"
				]);
			});
	});
});

describe("Test to receive a stream in objectMode as response", () => {
	let b1 = new ServiceBroker({
		logger: false,
		namespace: "test-5",
		transporter: "Fake",
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		logger: false,
		namespace: "test-5",
		transporter: "Fake",
		nodeID: "node-2"
	});

	const stream = new Stream.Readable({
		objectMode: true,
		read() {}
	});

	b2.createService({
		name: "db",
		actions: {
			query() {
				return stream;
			}
		}
	});

	beforeAll(() => Promise.all([b1.start(), b2.start()]));
	afterAll(() => Promise.all([b1.stop(), b2.stop()]));

	it("should receive stream in objectMode", () => {
		const FLOW = [];
		return b1.Promise.resolve()
			.then(() => b1.call("db.query"))
			.then(res => {
				expect(res).toBeInstanceOf(Stream.Readable);
				expect(
					res.readableObjectMode === true ||
						(res._readableState && res._readableState.objectMode === true)
				).toBe(true);
				res.on("data", msg => FLOW.push(msg));
				res.on("error", err => FLOW.push("<ERROR:" + err.message + ">"));
				res.on("end", () => FLOW.push("<END>"));
			})
			.then(() => stream.push({ id: 123, data: "first record" }))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([{ id: 123, data: "first record" }]);
				stream.push({ id: 786, data: "second record" });
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([
					{ id: 123, data: "first record" },
					{ id: 786, data: "second record" }
				]);
				stream.emit("end");
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([
					{ id: 123, data: "first record" },
					{ id: 786, data: "second record" },
					"<END>"
				]);
			});
	});

	it("should receive stream in objectMode & handle error", () => {
		const FLOW = [];
		return b1.Promise.resolve()
			.then(() => b1.call("db.query"))
			.then(res => {
				expect(res).toBeInstanceOf(Stream.Readable);
				expect(
					res.readableObjectMode === true ||
						(res._readableState && res._readableState.objectMode === true)
				).toBe(true);
				res.on("data", msg => FLOW.push(msg));
				res.on("error", err => FLOW.push("<ERROR:" + err.message + ">"));
				res.on("end", () => FLOW.push("<END>"));
			})
			.then(() => stream.push({ id: 123, data: "first record" }))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([{ id: 123, data: "first record" }]);
				stream.emit("error", new Error("Something happened"));
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([
					{ id: 123, data: "first record" },
					"<ERROR:Something happened>",
					"<END>"
				]);
			});
	});
});

describe("Test duplex streaming, result in objectMode", () => {
	let b1 = new ServiceBroker({
		logger: false,
		namespace: "test-6",
		transporter: "Fake",
		nodeID: "node-1"
	});

	let b2 = new ServiceBroker({
		logger: false,
		namespace: "test-6",
		transporter: "Fake",
		nodeID: "node-2"
	});

	b2.createService({
		name: "csv",
		actions: {
			parse(ctx) {
				const pass = new Stream.Readable({
					objectMode: true,
					read() {}
				});

				// this fake parser only works if each chunk is exactly one line
				let line = 0;
				ctx.params.on("data", msg => pass.push({ line: ++line, data: msg }));
				ctx.params.on("end", () => pass.emit("end"));
				ctx.params.on("error", err => pass.emit("error", err));
				return pass;
			}
		}
	});

	beforeAll(() => Promise.all([b1.start(), b2.start()]));
	afterAll(() => Promise.all([b1.stop(), b2.stop()]));

	it("should send & receive stream in objectMode", () => {
		const FLOW = [];
		const stream = new Stream.Readable({
			objectMode: true,
			read() {}
		});

		return b1.Promise.resolve()
			.then(() => b1.call("csv.parse", stream))
			.then(res => {
				expect(res).toBeInstanceOf(Stream.Readable);
				expect(
					res.readableObjectMode === true ||
						(res._readableState && res._readableState.objectMode === true)
				).toBe(true);
				res.on("data", msg => FLOW.push(msg));
				res.on("error", err => FLOW.push("<ERROR:" + err.message + ">"));
				res.on("end", () => FLOW.push("<END>"));
			})
			.then(() => stream.push({ id: 123, data: "first record" }))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([{ line: 1, data: { id: 123, data: "first record" } }]);
				stream.push({ id: 786, data: "second record" });
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([
					{ line: 1, data: { id: 123, data: "first record" } },
					{ line: 2, data: { id: 786, data: "second record" } }
				]);
				stream.emit("end");
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([
					{ line: 1, data: { id: 123, data: "first record" } },
					{ line: 2, data: { id: 786, data: "second record" } },
					"<END>"
				]);
			});
	});

	it("should receive stream in objectMode & handle error", () => {
		const FLOW = [];
		const stream = new Stream.Readable({
			objectMode: true,
			read() {}
		});
		return b1.Promise.resolve()
			.then(() => b1.call("csv.parse", stream))
			.then(res => {
				expect(res).toBeInstanceOf(Stream.Readable);
				expect(
					res.readableObjectMode === true ||
						(res._readableState && res._readableState.objectMode === true)
				).toBe(true);
				res.on("data", msg => FLOW.push(msg));
				res.on("error", err => FLOW.push("<ERROR:" + err.message + ">"));
				res.on("end", () => FLOW.push("<END>"));
			})
			.then(() => stream.push({ id: 123, data: "first record" }))
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([{ line: 1, data: { id: 123, data: "first record" } }]);
				stream.emit("error", new Error("Something happened"));
			})
			.delay(100)
			.then(() => {
				expect(FLOW).toEqual([
					{ line: 1, data: { id: 123, data: "first record" } },
					"<ERROR:Something happened>",
					"<END>"
				]);
			});
	});
});
