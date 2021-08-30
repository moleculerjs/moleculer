"use strict";

// !!! WORK-IN-PROGRESS !!!

const ServiceBroker = require("../src/service-broker");
const { isString } = require("../src/utils");
const ObservableSlim = require("observable-slim");

// Create broker #1
const broker1 = new ServiceBroker({
	namespace: "streaming",
	nodeID: "client-" + process.pid,
	transporter: "NATS",
	serializer: "JSON",
	logger: console,
	logLevel: "info"
});

// Create broker #2
const broker2 = new ServiceBroker({
	namespace: "streaming",
	nodeID: "encrypter-" + process.pid,
	transporter: "NATS",
	serializer: "JSON",
	logger: console,
	logLevel: "info"
});

function createSharedObj(data, notifier) {
	return ObservableSlim.create(test, true, notifier);
}

const SharedObj = function (opts) {
	let self = null;

	const res = {
		events: {},
		created() {
			self = this;
		}
	};

	const sharedObjects = [];

	const getOnChanges = name => changes => {
		console.log(name, JSON.stringify(changes));
		self.broadcast(`sharedObject.${name}`, changes);
	};

	if (opts) {
		if (!Array.isArray(opts)) opts = [opts];

		opts.forEach(opt => {
			const name = isString(opt) ? opt : opt.name;
			sharedObjects[opt] = createSharedObj({}, getOnChanges(opt));
			res.events[`sharedObject.${name}`] = function (changes) {
				// TODO: apply changes
				console.log("Received changes:", changes);
			};
		});
	}

	return res;
};

broker2.createService({
	name: "aes",
	actions: {}
});

broker1.Promise.all([broker1.start(), broker2.start()])
	.delay(2000)
	.then(() => broker1.repl());
