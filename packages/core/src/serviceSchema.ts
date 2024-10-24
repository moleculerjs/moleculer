import type { Nullable } from "./helperTypes";
import type { Service, ServiceVersion } from "./service";

export type ServiceSchemaLifecycleHandler = (this: Service) => Promise<void>;

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

export interface ServiceSchema<TSettings = Record<string, unknown>> {
	name: string;
	version?: Nullable<ServiceVersion>;
	metadata?: Record<string, unknown>;
	settings?: TSettings;
	dependencies?: ServiceDependencies;
	// actions?: Record<string, unknown>;
	// events?: Record<string, unknown>;
	methods?: Record<string, (...args: unknown[]) => unknown>;
	created?: ServiceSchemaLifecycleHandler;
	started?: ServiceSchemaLifecycleHandler;
	stopped?: ServiceSchemaLifecycleHandler;
}
