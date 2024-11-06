/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
import "reflect-metadata";

import type { ActionDefinition, ParameterSchema } from "./serviceSchema";
import { isFunction } from "./utils";

export const META_PREFIX = "moleculer:decorators";

export function Action(name?: string): MethodDecorator {
	return <T>(
		target: object,
		propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<T>,
	) => {
		const handler = descriptor.value;

		if (!isFunction(handler)) {
			throw new TypeError("An action must be a function");
		}

		const actionSchema: ActionDefinition<unknown> =
			Reflect.getMetadata(`${META_PREFIX}:action`, target, propertyKey) ?? {};

		actionSchema.name = name != null && name !== "" ? name : propertyKey.toString();

		Reflect.defineMetadata(`${META_PREFIX}:action`, { ...actionSchema }, target, propertyKey);

		return descriptor;
	};
}

export function ActionParams(params?: ParameterSchema): MethodDecorator {
	return <T>(
		target: object,
		propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<T>,
	) => {
		const handler = descriptor.value;

		if (!isFunction(handler)) {
			throw new TypeError("An action must be a function");
		}

		const actionSchema =
			Reflect.getMetadata(`${META_PREFIX}:action`, target, propertyKey) ?? {};
		Reflect.defineMetadata(
			`${META_PREFIX}:action`,
			{ ...actionSchema, params },
			target,
			propertyKey,
		);

		return descriptor;
	};
}
