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
	methods?: TMethods & ThisType<ServiceThis<TMetadata, TSettings, TMethods>>;

	created?: (this: ServiceThis<TMetadata, TSettings, TMethods>) => Promise<void>;
	started?: (this: ServiceThis<TMetadata, TSettings, TMethods>) => Promise<void>;
	stopped?: (this: ServiceThis<TMetadata, TSettings, TMethods>) => Promise<void>;
}
