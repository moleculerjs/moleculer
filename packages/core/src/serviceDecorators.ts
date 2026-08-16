/* eslint-disable @typescript-eslint/naming-convention */
import type { ServiceVersion } from "./service.ts";
import { Service as ServiceClass } from "./service.ts";
import type { ActionDefinition, ServiceSchema } from "./serviceSchema.ts";
import { isFunction, isObject, isString } from "./utils.ts";

export const META_PREFIX = "moleculer:decorators:service";

type DecoratableClass = abstract new (...args: never[]) => object;

export type ServiceConstructor = new (...args: unknown[]) => ServiceClass;
export type ServiceDecorator = <T extends DecoratableClass>(
	target: T,
	context: ClassDecoratorContext<T>,
) => T;

export function isServiceClass(constructor: unknown): constructor is ServiceConstructor {
	return (
		typeof constructor === "function" &&
		Object.prototype.isPrototypeOf.call(ServiceClass, constructor)
	);
}

/**
 * Get (or create) the service schema stored on the decorator metadata object.
 * Method decorators run before the class decorator and share the same
 * `context.metadata` object, so the schema accumulates across decorators.
 *
 * An own-property check is used because `context.metadata` inherits from the
 * parent class metadata; a subclass must not mutate its parent's schema.
 */
function getSchemaFromMetadata(
	metadata: DecoratorMetadataObject | undefined,
): ServiceSchema<Record<string, unknown>, Record<string, unknown>> {
	if (metadata == null) {
		throw new TypeError("Decorator metadata is not available");
	}
	if (!Object.hasOwn(metadata, META_PREFIX)) {
		// eslint-disable-next-line no-param-reassign -- decorator metadata is designed to be mutated
		metadata[META_PREFIX] = {};
	}
	return metadata[META_PREFIX] as ServiceSchema<Record<string, unknown>, Record<string, unknown>>;
}

/**
 * Service decorator (TC39 standard class decorator)
 *
 * @param def
 * @param version
 * @returns
 */
export function MoleculerService<
	TSettings extends Record<string, unknown>,
	TMetadata extends Record<string, unknown>,
>(def?: string | ServiceSchema<TSettings, TMetadata>, version?: ServiceVersion): ServiceDecorator {
	return <T extends DecoratableClass>(target: T, context: ClassDecoratorContext<T>): T => {
		if (!isServiceClass(target)) {
			throw new TypeError("Class must extend Service");
		}

		const schema = getSchemaFromMetadata(context.metadata);

		if (isObject(def)) {
			Object.assign(schema, def);
		} else if (isString(def) && def != null && def !== "") {
			schema.name = def;
		}
		schema.name ??= target.name;

		if (version != null) {
			schema.version = version;
		}

		// @ts-expect-error: This is a hack to make the constructor type work
		return class extends target {
			public constructor(...args: never[]) {
				super(...args);
				(this as unknown as ServiceClass).parseServiceSchema(schema);
			}
		};
	};
}

/**
 * Action decorator (TC39 standard class method decorator)
 *
 * @param def
 * @returns
 */
export function Action(def?: string | ActionDefinition) {
	return (method: unknown, context: ClassMethodDecoratorContext): void => {
		if (!isFunction(method)) {
			throw new TypeError("Action must be a function");
		}

		const schema = getSchemaFromMetadata(context.metadata);
		schema.actions ??= {};

		const methodName = context.name.toString();

		let actionSchema: ActionDefinition;
		if (!(methodName in schema.actions)) {
			actionSchema = {};
			schema.actions[methodName] = actionSchema;
		} else {
			actionSchema = schema.actions[methodName] as ActionDefinition;
		}

		if (isObject(def)) {
			Object.assign(actionSchema, def);
		} else if (isString(def) && def != null && def !== "") {
			actionSchema.name = def;
		}

		actionSchema.name ??= methodName;

		if (actionSchema.skipHandler !== true) {
			actionSchema.handler = method;
		}
	};
}

/**
 * Event decorator TODO:
 */

/**
 * Method decorator TODO:
 */
