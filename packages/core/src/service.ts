import _ from "lodash";
import { MiddlewareHookNames, type ServiceBroker } from "./broker";
import { ServiceSchemaError } from "./errors";
import type { Nullable } from "./helperTypes";
import type { ServiceSchema } from "./serviceSchema";
import { isFunction, isObject } from "./utils";

export type ServiceVersion = Nullable<string | number>;

export type ServiceLocalActionHandler = (
	params?: Record<string, unknown>,
	opts?: unknown,
) => Promise<unknown>;

export interface ServiceMethodDefinition {
	name?: string;
	service?: Service;
	handler?: Function;
}

function callSyncLifecycleHandler(
	func: Function | Function[],
	svc: Service,
	...args: unknown[]
): void {
	if (isFunction(func)) {
		func.call(svc, ...args);
	} else if (Array.isArray(func)) {
		for (const fn of func) {
			fn.call(svc, ...args);
		}
	}
}

async function callAsyncLifecycleHandler(
	func: Function | Function[],
	svc: Service,
	...args: unknown[]
): Promise<void> {
	if (isFunction(func)) {
		await func.call(svc, ...args);
	} else if (Array.isArray(func)) {
		for (const fn of func) {
			await fn.call(svc, ...args);
		}
	}
}

export class Service<
	TSettings extends Record<string, unknown> = Record<string, unknown>,
	TMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
	public broker!: ServiceBroker;
	public logger!: Console;

	public name!: string;
	public version: ServiceVersion;
	public fullName!: string;

	public schema!: ServiceSchema<TSettings, TMetadata>;
	public $originalSchema!: ServiceSchema<TSettings, TMetadata>;

	public settings: TSettings = {} as TSettings;
	public metadata: TMetadata = {} as TMetadata;

	public actions: Record<string, ServiceLocalActionHandler> = {};
	public events: Record<string, unknown> = {};

	public constructor(name?: string, version?: ServiceVersion) {
		if (name != null) {
			this.name = name;
			this.version = version ?? null;
			this.fullName = Service.getVersionedFullName(name, version);
			this.schema = {
				name,
				version,
			};
		}
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
		TSettings extends Record<string, unknown> = Record<string, unknown>,
		TMetadata extends Record<string, unknown> = Record<string, unknown>,
		TMethods extends Record<string, unknown> = Record<string, unknown>,
	>(
		schema: ServiceSchema<TSettings, TMetadata, TMethods>,
	): Service<TSettings, TMetadata> & TMethods {
		if (!isObject(schema)) {
			throw new ServiceSchemaError(
				"The service schema can't be null. Maybe is it not a service schema?",
				schema,
			);
		}

		if (!schema.name)
			throw new ServiceSchemaError(
				"Service name can't be empty! Is it not a service schema?",
				schema,
			);
		const svc = new Service<TSettings, TMetadata>(schema.name, schema.version);
		svc.parseServiceSchema(schema);

		return svc as Service<TSettings, TMetadata> & TMethods;
	}

	/**
	 * Parse service schema to Service class instance.
	 *
	 * @param schema
	 */
	public parseServiceSchema(schema: ServiceSchema<TSettings, TMetadata>): void {
		if (!isObject(schema)) {
			throw new ServiceSchemaError(
				"The service schema can't be null. Maybe is it not a service schema?",
				schema,
			);
		}

		this.$originalSchema = _.cloneDeep(schema);

		// if (schema.mixins) {
		// 	schema = this.applyMixins(schema);
		// }

		if (schema.merged != null) {
			callSyncLifecycleHandler(schema.merged, this, schema);
		}

		if (!schema.name) {
			/* eslint-disable-next-line no-console */
			console.error(
				"Service name can't be empty! Maybe it is not a valid Service schema. Maybe is it not a service schema?",
				{ schema },
			);
			throw new ServiceSchemaError(
				"Service name can't be empty! Maybe it is not a valid Service schema. Maybe is it not a service schema?",
				schema,
			);
		}

		if (schema.name != null) {
			this.name = schema.name;
		}

		if (schema.version != null) {
			this.version = schema.version;
		}

		this.settings = schema.settings ?? ({} as TSettings);
		this.metadata = schema.metadata ?? ({} as TMetadata);
		this.schema = schema;

		this.fullName = Service.getVersionedFullName(this.name, this.version);

		this.actions = {}; // external access to actions
		this.events = {}; // external access to event handlers.

		if (schema.methods != null) {
			Object.entries(schema.methods).forEach((entry: [string, Function]) => {
				this.createMethod(entry[0], entry[1]);
			});
		}
	}

	public async init(broker: ServiceBroker): Promise<void> {
		this.broker = broker;
		this.logger = broker.getLogger(this.fullName, {
			svc: this.name,
			ver: this.version,
		});

		if (this.schema.created != null) {
			await callAsyncLifecycleHandler(this.schema.created, this);
		}
	}

	public async start(): Promise<void> {
		if (this.schema.started != null) {
			await callAsyncLifecycleHandler(this.schema.started, this);
		}
	}

	public async stop(): Promise<void> {
		if (this.schema.stopped != null) {
			await callAsyncLifecycleHandler(this.schema.stopped, this);
		}
	}

	protected createMethod(
		name: string,
		def: ServiceMethodDefinition | Function,
	): ServiceMethodDefinition {
		let methodDef: ServiceMethodDefinition;

		if (isFunction(def)) {
			methodDef = {
				name,
				service: this,
				handler: def,
			};
		} else if (isObject<ServiceMethodDefinition>(def)) {
			if (def.handler == null) {
				throw new ServiceSchemaError(
					`Missing method handler in '${this.fullName}.${name}' method definition!`,
					this.schema,
				);
			}
			methodDef = {
				name,
				...def,
				service: this,
				handler: def.handler.bind(this) as Function,
			};
		} else {
			throw new ServiceSchemaError(
				`Invalid method definition in '${this.fullName}.${name}' method!`,
				this.schema,
			);
		}

		// @ts-expect-error: Dynamic method creation
		this[name] = this.broker.wrapMiddlewareHandler(
			MiddlewareHookNames.LOCAL_METHOD,
			methodDef.handler!,
			methodDef,
		);

		return methodDef;
	}
}
