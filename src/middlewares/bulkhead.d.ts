declare namespace Bulkhead {
	export interface BulkheadOptions {
		enabled?: boolean;
		concurrency?: number;
		maxQueueSize?: number;
	}
}

export = Bulkhead;
