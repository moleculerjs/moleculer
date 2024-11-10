/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
import "reflect-metadata";

import type { ServiceVersion } from "./service";
import { Service as ServiceClass } from "./service";
import type { ActionDefinition, ServiceSchema } from "./serviceSchema";
import { isFunction, isObject, isString } from "./utils";

export const META_PREFIX = "moleculer:decorators:service";

export type ServiceConstructor = new (...args: unknown[]) => ServiceClass;
export type ServiceDecorator = <T extends ServiceConstructor>(constructor: T) => T;

export function isServiceClass(constructor: unknown): constructor is ServiceConstructor {
	return (
		typeof constructor === "function" &&
		Object.prototype.isPrototypeOf.call(ServiceClass, constructor)
	);
}

/**
 * Service decorator
 *
 * @param def
 * @param version
 * @returns
 */
export function MoleculerService<
	TSettings extends Record<string, unknown>,
	TMetadata extends Record<string, unknown>,
>(def?: string | ServiceSchema<TSettings, TMetadata>, version?: ServiceVersion): ServiceDecorator {
	return <T extends ServiceConstructor>(constructor: T) => {
		if (!isServiceClass(constructor)) {
			throw TypeError("Class must extend Service");
		}

		const schema: ServiceSchema<
			Record<string, unknown>,
			Record<string, unknown>
		> = Reflect.getMetadata(META_PREFIX, constructor) ?? {};

		if (isObject(def)) {
			Object.assign(schema, def);
		} else if (isString(def) && def != null && def !== "") {
			schema.name = def;
		}
		if (schema.name == null) {
			schema.name = constructor.name;
		}

		if (version != null) {
			schema.version = version;
		}

		Reflect.defineMetadata(META_PREFIX, schema, constructor);

		// @ts-expect-error: This is a hack to make the constructor type work
		return class extends constructor {
			public constructor(...args: unknown[]) {
				super(...args);
				this.parseServiceSchema(schema);
			}
		};
	};
}

/**
 * Action decorator
 *
 * @param def
 * @returns
 */
export function Action(def?: string | ActionDefinition): MethodDecorator {
	return <T>(
		target: object,
		propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<T>,
	) => {
		const handler = descriptor.value;

		if (!isFunction(handler)) {
			throw new TypeError("Action must be a function");
		}

		const schema: ServiceSchema<
			Record<string, unknown>,
			Record<string, unknown>
		> = Reflect.getMetadata(META_PREFIX, target.constructor) ?? {};

		if (!schema.actions) {
			schema.actions = {};
		}

		let actionSchema: ActionDefinition;
		if (!(propertyKey in schema.actions)) {
			actionSchema = {};
			schema.actions[propertyKey.toString()] = actionSchema;
		} else {
			actionSchema = schema.actions[propertyKey.toString()] as ActionDefinition;
		}

		if (isObject(def)) {
			Object.assign(actionSchema, def);
		} else if (isString(def) && def != null && def !== "") {
			actionSchema.name = def;
		}

		if (actionSchema.name == null) {
			actionSchema.name = propertyKey.toString();
		}

		if (actionSchema.skipHandler !== true) {
			actionSchema.handler = handler;
		}

		Reflect.defineMetadata(META_PREFIX, schema, target.constructor);

		return descriptor;
	};
}

/**
 * Event decorator TODO:
 */

/**
 * Method decorator TODO:
 */
