/**
 * Empty context meta definition. Populate it from your project.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ContextMeta {}

/**
 * Empty context header definition. Populate it from your project.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ContextHeaders {}

export class Context<TParams = unknown, TMeta = ContextMeta, THeaders = ContextHeaders> {
	public params: TParams = {} as TParams;
	public meta: TMeta = {} as TMeta;
	public headers: THeaders = {} as THeaders;
}
