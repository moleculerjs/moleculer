export interface BrokerOptions {
	namespace?: string | null;
	nodeID?: string | null;
	metadata?: Record<string, unknown>;

	processEventRegistration?: boolean;
}
