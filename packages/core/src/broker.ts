import os from "node:os";
import pkg from "../package.json";
import type { BrokerOptions } from "./brokerOptions";
import { Service } from "./service";
import { generateUUID } from "./utils";

export enum BrokerState {
	CREATED = 1,
	STARTING = 2,
	STARTED = 3,
	STOPPING = 4,
	STOPPED = 5,
}

const MOLECULER_VERSION = pkg.version;

export class ServiceBroker {
	// Broker options
	public options: BrokerOptions;

	// Current state of the broker
	public state: BrokerState;

	// Namespace of the broker nodes
	public namespace: string;

	// Broker NodeID
	public nodeID: string;

	// Unique instance ID
	public instanceID: string;

	// Node-related metadata
	public metadata: Record<string, unknown> = {};

	public logger: Console; // TODO: Logger

	// Store local service instances
	protected services: Service[];

	// Service starting flag
	private serviceStarting = false;

	/**
	 * Create a ServiceBroker instance
	 *
	 * @param options Broker options
	 */
	public constructor(options: BrokerOptions) {
		try {
			this.options = options;

			this.namespace = options.namespace ?? "";

			this.nodeID = options.nodeID ?? this.generateNodeID();

			this.instanceID = generateUUID();

			this.services = [];

			this.state = BrokerState.CREATED;

			this.logger = console;

			this.logger.info(`Moleculer v${MOLECULER_VERSION} is starting...`);
			this.logger.info(`Namespace: ${this.namespace || "<not defined>"}`);
			this.logger.info(`Node ID: ${this.nodeID}`);

			this.callMiddlewareHookSync("created", [this]);

			process.setMaxListeners(0);
			if (this.options.processEventRegistration !== false) {
				process.on("beforeExit", () => this.brokerClose());
				process.on("exit", () => this.brokerClose());
				process.on("SIGINT", () => this.brokerClose());
				process.on("SIGTERM", () => this.brokerClose());
			}
		} catch (err: unknown) {
			this.fatal("Unable to create ServiceBroker.", err, true);
			process.exit(1);
		}
	}

	/**
	 * Fatal error. Print the message to console and exit the process (if need)
	 *
	 * @param message
	 * @param err
	 * @param needExit
	 *
	 * @memberof ServiceBroker
	 */
	public fatal(message: string, err: unknown, needExit = true): void {
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		if (this.logger) this.logger.error(message, err);
		else console.error(message, err); // eslint-disable-line no-console

		if (needExit) process.exit(1);
	}

	/**
	 * Create a local services based on ServiceSchema
	 *
	 * @param schema Service schema
	 * @returns Instance of the created service
	 */
	public async createService(schema: Service): Promise<Service> {
		// Create a new service instance based on schema
		return Promise.resolve(new Service(schema.name));
	}

	/**
	 * Load a service from a file or an instance
	 *
	 * @param service file path or service instance
	 */
	public async loadService(service: Service | string): Promise<void> {
		if (typeof service === "string") {
			// Load a service from a file
		} else {
			// Load a service instance
		}

		return Promise.resolve();
	}

	/**
	 * Start the broker
	 */
	public async start(): Promise<void> {
		const startTime = Date.now();

		this.state = BrokerState.STARTING;
		await this.callMiddlewareHook("starting", [this]);

		// TODO: await transporter.connect();

		// Start services
		this.serviceStarting = true;

		try {
			await Promise.all(this.services.map((service) => service.init(this)));
		} catch (err) {
			this.logger.error("Error while starting services", err);
		}

		this.serviceStarting = false;

		// TODO: await transporter.ready();

		this.state = BrokerState.STARTED;
		await this.callMiddlewareHook("started", [this]);

		this.logger.info(
			`✔ ServiceBroker with ${
				this.services.length
			} service(s) started successfully in ${Date.now() - startTime} milliseconds.`,
		);
	}

	/**
	 * Stop the broker
	 */
	public async stop(): Promise<void> {
		const startTime = Date.now();

		this.state = BrokerState.STOPPING;

		try {
			// TODO: await transporter.unready();

			await this.callMiddlewareHook("stopping", [this], { reverse: true });

			try {
				await Promise.all(this.services.map((service) => service.stop()));
			} catch (err) {
				this.logger.error("Error while stopping services", err);
			}

			// TODO: await transporter.disconnect();

			this.state = BrokerState.STOPPED;

			await this.callMiddlewareHook("stopped", [this], { reverse: true });
		} catch (err) {
			this.logger.error("Error while stopping broker", err);
		}

		this.logger.info(
			`✔ ServiceBroker stopped successfully in ${Date.now() - startTime} milliseconds.`,
		);
	}

	public callMiddlewareHook(
		hookName: string,
		args: unknown[],
		options: { reverse: boolean } = { reverse: false },
	): Promise<void> {
		return Promise.resolve();
	}

	public callMiddlewareHookSync(
		hookName: string,
		args: unknown[],
		options: { reverse: boolean } = { reverse: false },
	): void {
		// Do nothing
	}

	/**
	 * Graceful stop function
	 */
	private brokerClose(): void {
		if (this.state === BrokerState.STOPPING || this.state === BrokerState.STOPPED) {
			return;
		}

		this.stop()
			.then(() => process.exit(0))
			.catch((err) => {
				this.logger.error("Unable to stop broker gracefully.", err);
				process.exit(1);
			});
	}

	/**
	 * Generate the node ID
	 *
	 * @returns Node ID
	 */
	private generateNodeID(): string {
		return `${os.hostname().toLowerCase()}-${process.pid}`;
	}
}
