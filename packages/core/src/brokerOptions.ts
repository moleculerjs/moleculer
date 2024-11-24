// It will be augmented by the registries
export interface RegistryTypes {}

export interface BrokerOptions {
	namespace?: string | null;
	nodeID?: string | null;
	metadata?: Record<string, unknown>;

	registry?: RegistryTypes[keyof RegistryTypes];

	processEventRegistration?: boolean;
}
