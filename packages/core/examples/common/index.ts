import { assert } from "node:console";
import { ServiceBroker } from "../../src";
import { BrokerState } from "../../src/broker";
import type { Context } from "../../src/context";
import { Service } from "../../src/service";
import { Action, MoleculerService } from "../../src/serviceDecorators";

@MoleculerService("my-service")
class MyNativeService extends Service {
	public override metadata = {
		region: "us-east",
		zone: "a",
		cluster: true,
	};

	public override settings = {
		a: 5,
		b: "Test",
	};

	private localVar?: number;

	public constructor(broker: ServiceBroker) {
		super(broker, "my-native-service");
		this.settings.a = 7;
	}

	@Action({
		params: {
			name: "string",
		},
	})
	public async hello(ctx: Context<{ name: string }>): Promise<string> {
		return Promise.resolve(`Hello ${this.uppercase(ctx.params.name)}!`);
	}

	public override async init(broker: ServiceBroker): Promise<void> {
		await super.init(broker);

		this.localVar = 123;

		const region = this.uppercase(this.metadata.region);
		this.broker.logger.info(
			`${this.fullName} service initialized. settings.a: ${this.settings.a}, metadata.region: ${region}, localVar: ${this.localVar}`,
		);
		// this.schema.settings.a;

		return Promise.resolve();
	}

	public override async start(): Promise<void> {
		await super.start();

		this.broker.logger.info(`${this.fullName} service started.`);

		return Promise.resolve();
	}

	public override async stop(): Promise<void> {
		await super.stop();

		this.broker.logger.info(`${this.fullName} service stopped.`);
		return Promise.resolve();
	}

	private uppercase(str: string): string {
		return str.toUpperCase();
	}
}

async function start() {
	// --- CREATE BROKER ---
	const broker = new ServiceBroker({
		namespace: "my-namespace",
	});
	assert(broker.getLocalServiceCount() === 0, "Invalid services length (0)");

	// --- CREATE NATIVE CLASS SERVICE ---
	await broker.loadService(MyNativeService);
	assert(broker.getLocalServiceCount() === 1, "Invalid services length (1)");
	assert(
		broker.getLocalService("my-native-service") instanceof MyNativeService,
		"Not found service by name",
	);
	assert(
		broker.getLocalService({ name: "my-native-service" }) instanceof MyNativeService,
		"Not found service by name object",
	);
	assert(
		broker.getLocalService({ name: "my-native-service", version: 2 }) === undefined,
		"Found service by version but it has no version",
	);

	// --- CREATE SERVICE FROM SCHEMA ---
	const svc = Service.createFromSchema(
		{
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
					// @ts-expect-error: Params is not defined
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
		},
		broker,
	);

	await broker.loadService(svc);

	assert(broker.getLocalServiceCount() === 2, "Invalid services length (2)");

	// --- START BROKER ---
	assert(broker.state === BrokerState.CREATED, "Wrong broker state");
	await broker.start();
	assert(broker.state === BrokerState.STARTED, "Wrong broker state");
	assert(broker.namespace === "my-namespace", "Invalid namespace");
	assert(!!broker.instanceID, "Missing instanceID");
	assert(!!broker.nodeID, "Missing nodeID");
	console.log(
		"Broker started. Node ID:",
		broker.nodeID,
		", InstanceID:",
		broker.instanceID,
		`, Version: ${broker.MOLECULER_VERSION}`,
	);

	// --- STOP BROKER ---
	await broker.stop();
	assert(broker.state === BrokerState.STOPPED, "Wrong broker state");
}

start().catch(console.error);
