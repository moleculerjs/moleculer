import type { Nullable } from "./helperTypes";

export interface ServiceSchema {
	name: string;
	version?: Nullable<string>;
	// metadata?: Record<string, unknown>;
	// settings?: Record<string, unknown>;
	// actions?: Record<string, unknown>;
	// events?: Record<string, unknown>;
	// methods?: Record<string, unknown>;
	// created?(broker: unknown): Promise<void>;
	// started?(broker: unknown): Promise<void>;
	// stopped?(broker: unknown): Promise<void>;
}
