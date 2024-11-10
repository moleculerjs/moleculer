/* eslint-disable max-classes-per-file */

import type { Nullable } from "./helperTypes";
import type { ServiceSchema } from "./serviceSchema";

export class MoleculerError extends Error {
	public code?: string;
	public statusCode: number;
	public data?: unknown;
	public retryable: boolean;

	public constructor(
		message: string,
		code?: string,
		statusCode?: number,
		cause?: Nullable<Error>,
		data?: unknown,
	) {
		super(message, { cause });
		this.statusCode = statusCode ?? 500;
		this.code = code;
		this.data = data;
		this.retryable = false;
	}
}

export class ServiceSchemaError extends MoleculerError {
	public constructor(
		message: string,
		schema: ServiceSchema<Record<string, unknown>, Record<string, unknown>>,
	) {
		super(message, "SERVICE_SCHEMA_ERROR", 500, null, { schema });
	}
}
