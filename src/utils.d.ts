export declare function isFunction(func: unknown): func is Function;

export declare function isString(str: unknown): str is string;

export declare function isObject(obj: unknown): obj is object;

export declare function isPlainObject(obj: unknown): obj is object;

export declare function isDate(date: unknown): date is Date;

export declare function flatten<T>(arr: readonly T[] | readonly T[][]): T[];

export declare function humanize(millis?: number | null): string;

export declare function generateToken(): string;

export declare function removeFromArray<T>(arr: T[], item: T): T[];

export declare function getNodeID(): string;

export declare function getIpList(): string[];

export declare function isPromise<T>(promise: unknown): promise is Promise<T>;

export declare function polyfillPromise(P: typeof Promise): void;

export declare function promiseAllControl(promises: any[], settled?: boolean, promise?: any): Promise<{
    [p: string]: PromiseSettledResult<any>;
}> | Promise<unknown[]>;

export declare function clearRequireCache(filename: string): void;

export declare function match(text: string, pattern: string): boolean;

export declare function deprecate(prop: unknown, msg?: string): void;

export declare function safetyObject(obj: unknown, options?: { maxSafeObjectSize?: number }): any;

export declare function dotSet<T extends object>(obj: T, path: string, value: unknown): T;

export declare function makeDirs(path: string): void;

export declare function parseByteString(value: string|number): number;

export declare function uniq(arr: Array<String|Number>): Array<String|Number>;

export declare function getConstructorName(obj: any): string;

export declare function isInheritedClass(instance: object, baseClass: object): boolean;

export declare function random(a?: number, b?: number): number;

export declare function randomInt(a?: number, b?: number): number;
