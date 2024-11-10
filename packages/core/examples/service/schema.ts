import { assert } from "node:console";
import { ServiceBroker } from "../../src";
import { Service } from "../../src/service";

async function start() {
	// --- CREATE BROKER ---
	const broker = new ServiceBroker();

	// --- CREATE SERVICE FROM SCHEMA ---
	const svc = Service.createFromSchema({
		name: "posts",
		version: 2,

		metadata: {
			region: "us-west",
			zone: "b",
			cluster: false,
		},
		settings: {
			a: 10,
			b: "Test2",
		},

		actions: {
			hello: {
				params: {
					name: "string",
					age: "number",
					active: { type: "boolean" },
					city: { type: "string" },
				},
				handler(ctx): string {
					assert(ctx.params.name === "John", "Invalid name");
					assert(ctx.params.age === 25, "Invalid age");
					assert(ctx.params.active === true, "Invalid active");
					assert(ctx.params.city === "NY", "Invalid city");

					return `Hello ${this.uppercase(ctx.params.name)}!`;
				},
			},

			welcome(ctx): string {
				assert(ctx.params.age !== 25, "Invalid age");
				return `Welcome ${this.uppercase("Moleculer")}! ${this.metadata.region}`;
			},
		},

		methods: {
			uppercase(str: string): string {
				console.log(this.name, this.version, this.settings.a, this.metadata.region);
				return str.toUpperCase();
			},
		},

		created() {
			assert(this.name === "posts", "Wrong service name");
			assert(this.version === 2, "Wrong service version");
			assert(this.fullName === "v2.posts", "Wrong service fullName");

			this.logger.info(`>>> '${this.fullName}' created is called.`);
			const region = this.uppercase(this.metadata.region);

			this.logger.info(`>>> settings.a: ${this.settings.a}, metadata.region: ${region}`);
			return Promise.resolve();
		},

		started() {
			this.logger.info(`>>> '${this.fullName}' started is called.`);
			return Promise.resolve();
		},

		stopped() {
			this.logger.info(`>>> '${this.fullName}' stopped is called.`);
			return Promise.resolve();
		},
	});

	await broker.loadService(svc);

	// --- START BROKER ---
	await broker.start();

	// --- TESTING ---

	// --- STOP BROKER ---
	await broker.stop();
}

start().catch(console.error);
