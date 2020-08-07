const fs = require("fs");
const { ServiceBroker } = require("../");

const broker1 = new ServiceBroker({
	nodeID: "node1",
	transporter: "NATS",
	options: {
		url: "nats://localhost:4222",
	},
	disableBalancer: true,
	logLevel: "debug",
});

const broker2 = new ServiceBroker({
	nodeID: "node2",
	transporter: "NATS",
	options: {
		url: "nats://localhost:4222",
	},
	disableBalancer: true,
	logLevel: "debug",
});

broker1.createService({
	name: "fileReader",
	actions: {
		async getFileContents(ctx) {
			const { filePath } = ctx.params;
			const stream = fs.createReadStream(filePath);
			return ctx.call("fileReader.readStreamWithDataEvents", stream); // This one never returns a result to the caller
			//return ctx.call("fileReader.readStreamWithReadableEvent", stream); // This one calls readStreamWithReadableEvent twice

			//return ctx.call("service2.readStreamWithDataEvents", stream); // This one works fine
			//return ctx.call("service2.readStreamWithReadableEvent", stream); // This one works fine
		},
		async readStreamWithDataEvents(ctx) {
			console.log("called fileReader.readStreamWithDataEvents");
			const result = await new Promise(resolve => {
				const chunks = [];
				ctx.params.on("data", chunk => {
					chunks.push(chunk);
				});
				ctx.params.on("end", () => {
					resolve(Buffer.concat(chunks)); // resolving after the 'end' event fires
				});
			});
			return result.toString();
		},
		async readStreamWithReadableEvent(ctx) {
			console.log("called fileReader.readStreamWithReadableEvent");
			const result = await new Promise(resolve => {
				const chunks = [];
				ctx.params.on("readable", () => {
					let chunk = ctx.params.read();
					while (chunk != null) {
						chunks.push(chunk);
						chunk = ctx.params.read();
					}
					//resolve(Buffer.concat(chunks)); // resolving once we have all the data but before the 'end' event fires
				});
				ctx.params.on("end", () => {
					resolve(Buffer.concat(chunks)); // resolving after the 'end' event fires
				});
			});
			return result.toString();
		},
	}
});

broker2.createService({
	name: "service2",
	actions: {
		async readStreamWithDataEvents(ctx) {
			console.log("called streamReader.readStreamWithDataEvents");
			const result = await new Promise(resolve => {
				const chunks = [];
				ctx.params.on("data", chunk => {
					chunks.push(chunk);
				});
				ctx.params.on("end", () => {
					resolve(Buffer.concat(chunks)); // resolving after the 'end' event fires
				});
			});
			return result.toString();
		},
		async readStreamWithReadableEvent(ctx) {
			console.log("called streamReader.readStreamWithReadableEvent");
			const result = await new Promise(resolve => {
				ctx.params.on("readable", () => {
					const chunks = [];
					let chunk = ctx.params.read();
					while (chunk != null) {
						chunks.push(chunk);
						chunk = ctx.params.read();
					}
					resolve(Buffer.concat(chunks)); // resolving once we have all the data but before the 'end' event fires
				});
			});
			return result.toString();
		},
	}
});

broker2.start()
	.then(() => broker1.start())
	.then(() => broker1.call("fileReader.getFileContents", { filePath: "d:/rnd.txt" }))
	.then(res => console.log("Read file contents:", res))
	.catch(err => console.error(`Error occurred! ${err.message}`));
