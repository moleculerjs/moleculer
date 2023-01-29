import ServiceBroker from "./service-broker";

export declare class ExtendableError extends Error {
	message: string;

	name: string;

	stack: string;
}

export declare class MoleculerError extends ExtendableError {
	code: number;

	type: string;

	data: any;

	retryable: boolean;

	constructor(message: string, code: number, type: string, data: any);
	constructor(message: string, code: number, type: string);
	constructor(message: string, code: number);
	constructor(message: string);
}

export declare class MoleculerRetryableError extends MoleculerError {}

export declare class BrokerDisconnectedError extends MoleculerRetryableError {}

export declare class MoleculerServerError extends MoleculerRetryableError {}

export declare class MoleculerClientError extends MoleculerError {}

export declare class ServiceNotFoundError extends MoleculerRetryableError {
	constructor(data: any);
}

export declare class ServiceNotAvailableError extends MoleculerRetryableError {
	constructor(data: any);
}

export declare class RequestTimeoutError extends MoleculerRetryableError {
	constructor(data: any);
}

export declare class RequestSkippedError extends MoleculerError {
	constructor(data: any);
}

export declare class RequestRejectedError extends MoleculerRetryableError {
	constructor(data: any);
}

export declare class QueueIsFullError extends MoleculerRetryableError {
	constructor(data: any);
}

export declare class ValidationError extends MoleculerClientError {
	constructor(message: string, type: string, data: Record<string, any>);
	constructor(message: string, type: string);
	constructor(message: string);
}

export declare class MaxCallLevelError extends MoleculerError {
	constructor(data: any);
}

export declare class ServiceSchemaError extends MoleculerError {
	constructor(message: string, data: any);
}

export declare class BrokerOptionsError extends MoleculerError {
	constructor(message: string, data: any);
}

export declare class GracefulStopTimeoutError extends MoleculerError {
	constructor(data: any);
}

export declare class ProtocolVersionMismatchError extends MoleculerError {
	constructor(data: any);
}

export declare class InvalidPacketDataError extends MoleculerError {
	constructor(data: any);
}

interface PlainMoleculerError extends MoleculerError {
	nodeID?: string;

	[key: string]: any;
}

export declare class Regenerator {
	init(broker: ServiceBroker): void;

	restore(plainError: PlainMoleculerError, payload: Record<string, any>): Error;

	extractPlainError(err: Error): PlainMoleculerError;

	restoreCustomError(
		plainError: PlainMoleculerError,
		payload: Record<string, any>
	): Error | undefined;
}
