import type { Nullable } from "./helperTypes";
import type { Service, ServiceVersion } from "./service";

export type ServiceSchemaLifecycleHandler = (this: Service) => Promise<void>;
export interface ServiceSchema {
	name: string;
	version?: Nullable<ServiceVersion>;
	metadata?: Record<string, unknown>;
	settings?: Record<string, unknown>;
	// actions?: Record<string, unknown>;
	// events?: Record<string, unknown>;
	// methods?: Record<string, unknown>;
	created?: ServiceSchemaLifecycleHandler;
	started?: ServiceSchemaLifecycleHandler;
	stopped?: ServiceSchemaLifecycleHandler;
}
