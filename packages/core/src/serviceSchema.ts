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

export type ServiceDependencies =
	| string
	| ServiceDependencyItem
	| (string | ServiceDependencyItem)[];

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
	// actions?: Record<string, unknown>;
	// events?: Record<string, unknown>;
	methods?: TMethods & ThisType<TMethods & Service<TMetadata, TSettings>>;

	created?: ServiceSchemaLifecycleHandler<TMethods & Service<TMetadata, TSettings>>;
	started?: ServiceSchemaLifecycleHandler<TMethods & Service<TMetadata, TSettings>>;
	stopped?: ServiceSchemaLifecycleHandler<TMethods & Service<TMetadata, TSettings>>;
}
