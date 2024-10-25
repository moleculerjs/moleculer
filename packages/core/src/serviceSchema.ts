import type { Context } from "./context";
import type { Service, ServiceVersion } from "./service";

export type ServiceSchemaLifecycleHandler<TThis> = (this: TThis) => Promise<void>;

export interface ServiceSchemaInternalSettings {
	$dependencyTimeout?: number;
	$shutdownTimeout?: number;
	$secureSettings?: string[];
}

export interface ServiceDependencyItem {
	name: string;
	version?: string | number;
}

type ServiceThis<
	TMetadata extends Record<string, unknown>,
	TSettings extends Record<string, unknown>,
	TMethods,
> = TMethods & Service<TMetadata, TSettings>;

export type ServiceDependencies =
	| string
	| ServiceDependencyItem
	| (string | ServiceDependencyItem)[];

interface TParamTypes {
	string: string;
	number: number;
	boolean: boolean;
}
type ParamTypes = keyof TParamTypes;

type ExtractParam<TParam extends ParamTypes | ParameterObject> = TParam extends ParameterObject
	? TParam["type"]
	: TParam;

type ParamType<TParam extends ParamTypes | ParameterObject> =
	ExtractParam<TParam> extends "string"
		? string
		: ExtractParam<TParam> extends "number"
			? number
			: never;

type ActionParamType<TParams extends ParameterSchema> = {
	[key in keyof TParams]: ParamType<TParams[key]>;
};

export type ActionHandler<TParams extends ParameterSchema> = (
	ctx: Context<ActionParamType<TParams>>,
) => unknown;

export interface ActionDefinition<TParams extends ParameterSchema> {
	params?: TParams;
	handler?: ActionHandler<TParams>;
}

interface ParameterObject {
	type: keyof TParamTypes;
}

type ParameterSchema = Record<string, keyof TParamTypes | ParameterObject>;
declare function defineAction<TParams extends ParameterSchema>(
	def: ActionDefinition<TParams>,
): unknown;

const a = defineAction({
	params: {
		name: "string",
		age: "number",
		status: "boolean",
		city: { type: "string" },
	},
	handler(ctx) {
		return `Hello ${ctx.params.name} ${ctx.params.age * 2} ${ctx.params.status ? "Active" : "Inactive"} ${ctx.params.city}!`;
	},
});

export interface ServiceSchema<
	TMetadata extends Record<string, unknown>,
	TSettings extends Record<string, unknown>,
	TMethods,
> {
	name: string;
	version?: ServiceVersion;
	metadata?: TMetadata;
	settings?: TSettings;
	dependencies?: ServiceDependencies;
	actions?: Record<string, ActionDefinition<unknown> | ActionHandler<unknown>> &
		ThisType<ServiceThis<TMetadata, TSettings, TMethods>>;
	// events?: Record<string, unknown>;
	methods?: TMethods & ThisType<ServiceThis<TMetadata, TSettings, TMethods>>;

	created?: (this: ServiceThis<TMetadata, TSettings, TMethods>) => Promise<void>;
	started?: (this: ServiceThis<TMetadata, TSettings, TMethods>) => Promise<void>;
	stopped?: (this: ServiceThis<TMetadata, TSettings, TMethods>) => Promise<void>;
}
