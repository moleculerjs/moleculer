"use strict";

const glob = require("glob");
const path = require("path");
const _ = require("lodash");

const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
	logger: console,
	nodeID: process.argv[2] || "node-" + process.pid,
	transporter: "NATS",
});

broker.createService({
	name: "$agent",

	settings: {
		serviceFolder: "./examples"
	},

	actions: {

		start(ctx) {
			if (ctx.params.service) {
				const schema = Object.values(this.services).find(schema => schema.name == ctx.params.service);
				if (schema) {
					broker.createService(schema);
				}
			}
		},

		stop(ctx) {
			const service = broker.getLocalService(ctx.params.service);
			if (service)
				broker.destroyService(service);
		},

		services(ctx) {
			return Object.values(this.services).map(schema => _.pick(schema, ["name", "version", "settings", "metadata"]));
		},

		startAll(ctx) {

		},

		stopAll(ctx) {

		},

		startNewNode(ctx) {

		},

		exitProcess(ctx) {

		}
	},

	methods: {
		readServiceFolder() {
			const folder = path.resolve(this.settings.serviceFolder);
			this.logger.info(`Read all services from '${folder}' folder...`);
			const serviceFiles = glob.sync(path.join(folder, "**", "*.service.js"));
			this.services = {};
			serviceFiles.forEach(file => {
				const schema = require(file);
				if (schema.name)
					this.services[file] = schema;
			});

			this.logger.info(`Found ${Object.keys(this.services).length} service(s).`);
		}
	},

	created() {
		this.services = [];

		this.readServiceFolder();
	}
});

broker.start().then(() => broker.repl());
