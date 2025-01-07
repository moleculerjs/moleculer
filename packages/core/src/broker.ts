import os from "node:os";
import pkg from "../package.json";
import type { BrokerOptions } from "./brokerOptions";
import { Service } from "./service";
import type { ServiceDependencies, ServiceSchema } from "./serviceSchema";
import { generateUUID, isPlainObject, isString } from "./utils";

export enum BrokerState {
	CREATED = 1,
	STARTING = 2,
	STARTED = 3,
	STOPPING = 4,
	STOPPED = 5,
}

export enum MiddlewareHookNames {
	LOCAL_METHOD = "localMethod",
	LOCAL_ACTION = "localAction",
}

const MOLECULER_VERSION = pkg.version;

export class ServiceBroker {
	public static MOLECULER_VERSION = MOLECULER_VERSION;
	public MOLECULER_VERSION = MOLECULER_VERSION;

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
	protected services: Service<Record<string, unknown>, Record<string, unknown>>[];

	// Service starting flag. It's need when a service loads another service in started
	// handler because in this case we should start the newly loaded service as well.
	private serviceStarting = false;

	/**
	 * Create a ServiceBroker instance
	 *
	 * @param options Broker options
	 */
	public constructor(options?: BrokerOptions) {
		try {
			this.options = options ?? {};

			this.namespace = this.options.namespace ?? "";

			this.nodeID = this.options.nodeID ?? this.generateNodeID();

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
	 * TODO:
	 * @returns
	 */
	public getLogger(name: string, bindings?: Record<string, unknown>): Console {
		return this.logger;
	}

	/**
	 * Create a local service based on ServiceSchema
	 *
	 * @param schema Service schema
	 * @returns Instance of the created service
	 */
	public async createService(
		schema: ServiceSchema<Record<string, unknown>, Record<string, unknown>>,
	): Promise<Service> {
		// Create from schema
		const svc = Service.createFromSchema(schema, this);

		// Load the service
		await this.loadService(svc);

		return svc;
	}

	/**
	 * Load a service from a file or an instance
	 *
	 * @param service file path or service instance
	 */
	public async loadService(service: Service | string): Promise<void> {
		if (isString(service)) {
			// Load a service from a file
		} else if (service instanceof Service) {
			this.logger.debug(`Service '${service.fullName}' is creating...`);
			await this.callMiddlewareHook("serviceCreating", [service]);

			await service.init(this);

			// Load a service instance
			this.services.push(service);

			await this.callMiddlewareHook("serviceCreated", [service]);
			this.logger.debug(`Service '${service.fullName}' created.`);
		} else {
			this.logger.error(
				"Invalid parameter type for loadService. It accepts only Service instance or string",
				{ type: typeof service },
			);
		}

		return Promise.resolve();
	}

	/**
	 * Find a local service instace by name or name+version object.
	 *
	 * Example:
	 * 	broker.getLocalService("v2.posts");
	 * 	broker.getLocalService({ name: "posts", version: 2 });
	 * 	broker.getLocalService({ name: "posts" });
	 *
	 * @param name
	 * @returns
	 */
	public getLocalService(
		name: string | { name: string; version?: string | number },
	): Service | undefined {
		if (isString(name)) {
			return this.services.find((service) => service.fullName === name);
		}
		if (isPlainObject(name)) {
			return this.services.find(
				// eslint-disable-next-line eqeqeq
				(service) => service.name === name.name && service.version == name.version,
			);
		}

		return undefined;
	}

	/**
	 * Return the number of loaded local services.
	 *
	 * @returns
	 */
	public getLocalServiceCount(): number {
		return this.services.length;
	}

	/**
	 * Register a local service instance
	 *
	 * @param svc
	 */
	public registerLocalService(svc: Service): void {
		// this.services.push(svc);
	}

	/**
	 * TODO:
	 *
	 * @param serviceNames
	 * @param timeout
	 * @param interval
	 */
	public async waitForServices(
		serviceNames: ServiceDependencies,
		timeout?: number,
		interval?: number,
	): Promise<void> {
		return Promise.reject(new Error("Method not implemented yet."));
	}

	/**
	 * Start the broker
	 */
	public async start(): Promise<void> {
		const startTime = Date.now();

		this.state = BrokerState.STARTING;
		await this.callMiddlewareHook("starting", [this]);

		// TODO: await this.transporter.connect();

		// Start services
		this.serviceStarting = true;

		let shouldFatal = false;
		const res = await Promise.allSettled(
			this.services.map(async (svc) => {
				this.logger.debug(`Service '${svc.fullName}' is starting...`);
				await this.callMiddlewareHook("serviceStarting", [svc]);

				await svc.start();

				await this.callMiddlewareHook("serviceStarted", [svc]);
				this.logger.info(`Service '${svc.fullName}' started.`);

				this.registerLocalService(svc);
			}),
		);
		for (const item of res) {
			if (item.status === "rejected") {
				this.logger.error("Unable to start service", item.reason);
				shouldFatal = true;
			}
		}
		if (shouldFatal) {
			this.fatal("Some services are unable to start.", null, true);
		}

		this.serviceStarting = false;

		// TODO: await this.transporter.ready();

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

			const res = await Promise.allSettled(
				this.services.map(async (svc) => {
					this.logger.debug(`Service '${svc.fullName}' is stopping...`);
					await this.callMiddlewareHook("serviceStopping", [svc]);

					await svc.stop();

					await this.callMiddlewareHook("serviceStopped", [svc]);
					this.logger.info(`Service '${svc.fullName}' stopped.`);
				}),
			);
			for (const item of res) {
				if (item.status === "rejected") {
					this.logger.error("Unable to stop service", item.reason);
				}
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

	/**
	 * TODO:
	 *
	 * @param hookName
	 * @param args
	 * @param options
	 * @returns
	 */
	public callMiddlewareHook(
		hookName: string,
		args: unknown[],
		options: { reverse: boolean } = { reverse: false },
	): Promise<void> {
		return Promise.resolve();
	}

	/**
	 * TODO:
	 *
	 * @param hookName
	 * @param args
	 * @param options
	 */
	public callMiddlewareHookSync(
		hookName: string,
		args: unknown[],
		options: { reverse: boolean } = { reverse: false },
	): void {
		// Do nothing
	}

	/**
	 * TODO:
	 *
	 * @param hookName
	 * @param handler
	 * @param def
	 * @returns
	 */

	public wrapMiddlewareHandler<THandler extends Function>(
		hookName: string,
		handler: THandler,
		def?: object,
	): THandler {
		return handler;
	}

	/**
	 * Graceful stop function, It is called from process SIG... events
	 */
	private brokerClose(): void {
		if ([BrokerState.CREATED, BrokerState.STOPPING, BrokerState.STOPPED].includes(this.state)) {
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
