import _ from "lodash";
import type { ServiceBroker } from "./broker";
import { ServiceSchemaError } from "./errors";
import type { Nullable } from "./helperTypes";
import type { ServiceSchema } from "./serviceSchema";
import { isFunction } from "./utils";

export type ServiceVersion = Nullable<string | number>;

export type ServiceLocalActionHandler = (
	params?: Record<string, unknown>,
	opts?: unknown,
) => Promise<unknown>;

export class Service<
	TMetadata extends Record<string, unknown> = Record<string, unknown>,
	TSettings extends Record<string, unknown> = Record<string, unknown>,
> {
	public broker!: ServiceBroker;
	public logger!: Console;

	public name: string;
	public version: ServiceVersion;
	public fullName: string;

	public schema!: ServiceSchema<TMetadata, TSettings, unknown>;

	public metadata: TMetadata = {} as TMetadata;
	public settings: TSettings = {} as TSettings;

	protected actions: Record<string, ServiceLocalActionHandler> = {};
	protected events: Record<string, unknown> = {};

	public constructor(name: string, version?: ServiceVersion) {
		this.name = name;
		this.version = version ?? null;
		this.fullName = Service.getVersionedFullName(name, version);

		this.schema = {
			name,
			version,
		};
	}

	public static getVersionedFullName(name: string, version?: ServiceVersion): string {
		if (version != null) {
			if (typeof version === "number") {
				return `v${version}.${name}`;
			}
			return `${version}.${name}`;
		}
		return name;
	}

	public static createFromSchema<
		TMetadata extends Record<string, unknown>,
		TSettings extends Record<string, unknown>,
		TMethods,
	>(
		schema: ServiceSchema<TMetadata, TSettings, TMethods>,
		broker: ServiceBroker,
	): Service<TMetadata, TSettings> & TMethods {
		if (!schema.name)
			throw new ServiceSchemaError(
				"Service name can't be empty! Is it not a service schema?",
				schema,
			);
		const svc = new Service<TMetadata, TSettings>(schema.name, schema.version);
		svc.schema = schema;

		if (schema.metadata != null) svc.metadata = _.cloneDeep(schema.metadata);
		if (schema.settings != null) svc.settings = _.cloneDeep(schema.settings);

		if (schema.methods) {
			for (const key in schema.methods) {
				if (isFunction(schema.methods[key])) {
					svc[key] = broker.wrapMiddlewareHandler("localMethod", schema.methods[key]);
				}
			}
		}

		return svc as Service<TMetadata, TSettings> & TMethods;
	}

	public async init(broker: ServiceBroker): Promise<void> {
		this.broker = broker;
		this.logger = broker.getLogger(this.fullName, {
			svc: this.name,
			ver: this.version,
		});

		if (this.schema.created) {
			if (isFunction(this.schema.created)) {
				await this.schema.created.call(this);
			}

			// TODO: Handle if array
		}
	}

	public async start(): Promise<void> {
		if (this.schema.started) {
			if (isFunction(this.schema.started)) {
				await this.schema.started.call(this);
			}

			// TODO: Handle if array
		}
	}

	public async stop(): Promise<void> {
		if (this.schema.stopped) {
			if (isFunction(this.schema.stopped)) {
				await this.schema.stopped.call(this);
			}

			// TODO: Handle if array
		}
	}
}
