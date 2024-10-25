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

export type ActionHandler<TParamTypes> = (ctx: Context<TParamTypes>) => unknown;

export interface ActionDefinition<TParams> {
	params?: TParams;
	handler?: ActionHandler<ActionParamType<TParams>>;
}

type TParamType<TParam> = TParam extends "string"
	? string
	: TParam extends "number"
		? number
		: never;

type ActionParamType<TParams> = {
	[key in keyof TParams]: TParamType<TParams[key]>;
};

type Bb = ActionParamType<{ name: "string"; age: "number" }>;
type Cc = ActionDefinition<{
	params: {
		name: "string";
		age: "number";
	};
}>;

declare function defineAction<TParams>(def: ActionDefinition<TParams>): unknown;

const a = defineAction({
	params: {
		name: "string",
		age: "number",
	},
	handler(ctx) {
		return `Hello ${ctx.params.name} ${ctx.params.age * 2}!`;
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
	actions?: Record<string, ActionDefinition<unknown> | ActionHandler<Record<string, unknown>>> &
		ThisType<ServiceThis<TMetadata, TSettings, TMethods>>;
	// events?: Record<string, unknown>;
	methods?: TMethods & ThisType<ServiceThis<TMetadata, TSettings, TMethods>>;

	created?: (this: ServiceThis<TMetadata, TSettings, TMethods>) => Promise<void>;
	started?: (this: ServiceThis<TMetadata, TSettings, TMethods>) => Promise<void>;
	stopped?: (this: ServiceThis<TMetadata, TSettings, TMethods>) => Promise<void>;
}
