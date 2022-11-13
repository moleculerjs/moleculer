import { EventEmitter2 } from "eventemitter2";

declare namespace Moleculer {
	/**
	 * Moleculer uses global.Promise as the default promise library
	 * If you are using a third-party promise library (e.g. Bluebird), you will need to
	 * assign type definitions to use for your promise library.  You will need to have a .d.ts file
	 * with the following code when you compile:
	 *
	 * - import Bluebird from "bluebird";
	 *   declare module "moleculer" {
	 *     type Promise<T> = Bluebird<T>;
	 *   }
	 */

	type GenericObject = { [name: string]: any };

	type LogLevels = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

	class LoggerFactory {
		constructor(broker: ServiceBroker);
		init(opts: LoggerConfig | Array<LoggerConfig>): void;
		stop(): void;
		getLogger(bindings: GenericObject): LoggerInstance;
		getBindingsKey(bindings: GenericObject): string;

		broker: ServiceBroker;
	}

	interface LoggerBindings {
		nodeID: string;
		ns: string;
		mod: string;
		svc: string;
		ver: string | void;
	}

	class LoggerInstance {
		fatal(...args: any[]): void;
		error(...args: any[]): void;
		warn(...args: any[]): void;
		info(...args: any[]): void;
		debug(...args: any[]): void;
		trace(...args: any[]): void;
	}

	type ActionHandler<T = any> = (ctx: Context<any, any>) => Promise<T> | T;
	type ActionParamSchema = { [key: string]: any };
	type ActionParamTypes =
		| "any"
		| "array"
		| "boolean"
		| "custom"
		| "date"
		| "email"
		| "enum"
		| "forbidden"
		| "function"
		| "number"
		| "object"
		| "string"
		| "url"
		| "uuid"
		| boolean
		| string
		| ActionParamSchema;
	type ActionParams = { [key: string]: ActionParamTypes };

	interface HotReloadOptions {
		modules?: Array<string>;
	}

	interface TracerExporterOptions {
		type: string;
		options?: GenericObject;
	}

	interface TracerOptions {
		enabled?: boolean;
		exporter?: string | TracerExporterOptions | Array<TracerExporterOptions | string> | null;
		sampling?: {
			rate?: number | null;
			tracesPerSecond?: number | null;
			minPriority?: number | null;
		};

		actions?: boolean;
		events?: boolean;

		errorFields?: Array<string>;
		stackTrace?: boolean;

		defaultTags?: GenericObject | Function | null;

		tags?: {
			action?: TracingActionTags;
			event?: TracingEventTags;
		};
	}

	class Tracer {
		constructor(broker: ServiceBroker, opts: TracerOptions | boolean);

		broker: ServiceBroker;
		logger: LoggerInstance;
		opts: GenericObject;

		exporter: Array<BaseTraceExporter>;

		isEnabled(): boolean;
		shouldSample(span: Span): boolean;

		startSpan(name: string, opts?: GenericObject): Span;

		//getCurrentSpan(): Span | null;
		getCurrentTraceID(): string | null;
		getActiveSpanID(): string | null;
	}

	interface SpanLogEntry {
		name: string;
		fields: GenericObject;
		time: number;
		elapsed: number;
	}

	class Span {
		constructor(tracer: Tracer, name: string, opts: GenericObject);

		tracer: Tracer;
		logger: LoggerInstance;
		opts: GenericObject;
		meta: GenericObject;

		name: string;
		id: string;
		traceID: string;
		parentID: string | null;

		service?: {
			name: string;
			version: string | number | null | undefined;
		};

		priority: number;
		sampled: boolean;

		startTime: number | null;
		finishTime: number | null;
		duration: number | null;

		error: Error | null;

		logs: Array<SpanLogEntry>;
		tags: GenericObject;

		start(time?: number): Span;
		addTags(obj: GenericObject): Span;
		log(name: string, fields?: GenericObject, time?: number): Span;
		setError(err: Error): Span;
		finish(time?: number): Span;
		startSpan(name: string, opts?: GenericObject): Span;
	}

	type TracingActionTagsFuncType = (ctx: Context, response?: any) => GenericObject;
	type TracingActionTags =
		| TracingActionTagsFuncType
		| {
				params?: boolean | string[];
				meta?: boolean | string[];
				response?: boolean | string[];
		  };

	type TracingEventTagsFuncType = (ctx: Context) => GenericObject;
	type TracingEventTags =
		| TracingEventTagsFuncType
		| {
				params?: boolean | string[];
				meta?: boolean | string[];
		  };

	interface TracingOptions {
		enabled?: boolean;
		tags?: TracingActionTags | TracingEventTags;
	}

	interface TracingActionOptions extends TracingOptions {
		tags?: TracingActionTags;
	}

	interface TracingEventOptions extends TracingOptions {
		tags?: TracingEventTags;
	}

	class BaseTraceExporter {
		opts: GenericObject;
		tracer: Tracer;
		logger: LoggerInstance;

		constructor(opts: GenericObject);
		init(tracer: Tracer): void;

		spanStarted(span: Span): void;
		spanFinished(span: Span): void;

		flattenTags(obj: GenericObject, convertToString?: boolean, path?: string): GenericObject;
		errorToObject(err: Error): GenericObject;
	}

	namespace TracerExporters {
		class Base extends BaseTraceExporter {}
		class Console extends BaseTraceExporter {}
		class Datadog extends BaseTraceExporter {}
		class Event extends BaseTraceExporter {}
		class EventLegacy extends BaseTraceExporter {}
		class Jaeger extends BaseTraceExporter {}
		class Zipkin extends BaseTraceExporter {}
	}

	interface MetricsReporterOptions {
		type: string;
		options?: MetricReporterOptions;
	}

	interface MetricRegistryOptions {
		enabled?: boolean;
		collectProcessMetrics?: boolean;
		collectInterval?: number;
		reporter?: string | MetricsReporterOptions | Array<MetricsReporterOptions | string> | null;
		defaultBuckets?: Array<number>;
		defaultQuantiles?: Array<number>;
		defaultMaxAgeSeconds?: number;
		defaultAgeBuckets?: number;
		defaultAggregator?: string;
	}

	type MetricSnapshot = GaugeMetricSnapshot | InfoMetricSnapshot | HistogramMetricSnapshot;
	interface BaseMetricPOJO {
		type: string;
		name: string;
		description?: string;
		labelNames: Array<string>;
		unit?: string;
		values: Array<MetricSnapshot>;
	}

	class BaseMetric {
		type: string;
		name: string;
		description?: string;
		labelNames: Array<string>;
		unit?: string;
		aggregator: string;

		lastSnapshot: GenericObject | null;
		dirty: boolean;
		values: Map<string, GenericObject>;

		constructor(opts: BaseMetricOptions, registry: MetricRegistry);
		setDirty(): void;
		clearDirty(): void;
		get(labels?: GenericObject): GenericObject | null;
		reset(labels?: GenericObject, timestamp?: number): GenericObject | null;
		resetAll(timestamp?: number): GenericObject | null;
		clear(): void;
		hashingLabels(labels?: GenericObject): string;
		snapshot(): Array<MetricSnapshot>;
		generateSnapshot(): Array<MetricSnapshot>;
		changed(value: any | null, labels?: GenericObject, timestamp?: number): void;
		toObject(): BaseMetricPOJO;
	}

	interface GaugeMetricSnapshot {
		value: number;
		labels: GenericObject;
		timestamp: number;
	}

	class GaugeMetric extends BaseMetric {
		increment(labels?: GenericObject, value?: number, timestamp?: number): void;
		decrement(labels?: GenericObject, value?: number, timestamp?: number): void;
		set(value: number, labels?: GenericObject, timestamp?: number): void;
		generateSnapshot(): Array<GaugeMetricSnapshot>;
	}

	class CounterMetric extends BaseMetric {
		increment(labels?: GenericObject, value?: number, timestamp?: number): void;
		set(value: number, labels?: GenericObject, timestamp?: number): void;
		generateSnapshot(): Array<GaugeMetricSnapshot>;
	}

	interface InfoMetricSnapshot {
		value: any;
		labels: GenericObject;
		timestamp: number;
	}

	class InfoMetric extends BaseMetric {
		set(value: any | null, labels?: GenericObject, timestamp?: number): void;
		generateSnapshot(): Array<InfoMetricSnapshot>;
	}

	interface HistogramMetricSnapshot {
		labels: GenericObject;
		count: number;
		sum: number;
		timestamp: number;

		buckets?: {
			[key: string]: number;
		};

		min?: number | null;
		mean?: number | null;
		variance?: number | null;
		stdDev?: number | null;
		max?: number | null;
		quantiles?: {
			[key: string]: number;
		};
	}

	class HistogramMetric extends BaseMetric {
		buckets: Array<number>;
		quantiles: Array<number>;
		maxAgeSeconds?: number;
		ageBuckets?: number;

		observe(value: number, labels?: GenericObject, timestamp?: number): void;
		generateSnapshot(): Array<HistogramMetricSnapshot>;

		static generateLinearBuckets(start: number, width: number, count: number): Array<number>;
		static generateExponentialBuckets(
			start: number,
			factor: number,
			count: number
		): Array<number>;
	}

	namespace MetricTypes {
		class Base extends BaseMetric {}
		class Counter extends CounterMetric {}
		class Gauge extends GaugeMetric {}
		class Histogram extends HistogramMetric {}
		class Info extends InfoMetric {}
	}

	interface BaseMetricOptions {
		type: string;
		name: string;
		description?: string;
		labelNames?: Array<string>;
		unit?: string;
		aggregator?: string;
		[key: string]: unknown;
	}

	interface MetricListOptions {
		type: string | Array<string>;
		includes: string | Array<string>;
		excludes: string | Array<string>;
	}

	class MetricRegistry {
		broker: ServiceBroker;
		logger: LoggerInstance;
		dirty: boolean;
		store: Map<string, BaseMetric>;
		reporter: Array<MetricBaseReporter>;

		constructor(broker: ServiceBroker, opts?: MetricRegistryOptions);
		init(broker: ServiceBroker): void;
		stop(): void;
		isEnabled(): boolean;
		register(opts: BaseMetricOptions): BaseMetric | null;

		hasMetric(name: string): boolean;
		getMetric(name: string): BaseMetric;

		increment(name: string, labels?: GenericObject, value?: number, timestamp?: number): void;
		decrement(name: string, labels?: GenericObject, value?: number, timestamp?: number): void;
		set(name: string, value: any | null, labels?: GenericObject, timestamp?: number): void;
		observe(name: string, value: number, labels?: GenericObject, timestamp?: number): void;

		reset(name: string, labels?: GenericObject, timestamp?: number): void;
		resetAll(name: string, timestamp?: number): void;

		timer(name: string, labels?: GenericObject, timestamp?: number): () => number;

		changed(
			metric: BaseMetric,
			value: any | null,
			labels?: GenericObject,
			timestamp?: number
		): void;

		list(opts?: MetricListOptions): Array<BaseMetricPOJO>;
	}

	interface MetricReporterOptions {
		includes?: string | Array<string>;
		excludes?: string | Array<string>;

		metricNamePrefix?: string;
		metricNameSuffix?: string;

		metricNameFormatter?: (name: string) => string;
		labelNameFormatter?: (name: string) => string;

		[key: string]: any;
	}

	class MetricBaseReporter {
		opts: MetricReporterOptions;

		constructor(opts: MetricReporterOptions);
		init(registry: MetricRegistry): void;

		matchMetricName(name: string): boolean;
		formatMetricName(name: string): string;
		formatLabelName(name: string): string;
		metricChanged(
			metric: BaseMetric,
			value: any,
			labels?: GenericObject,
			timestamp?: number
		): void;
	}

	namespace MetricReporters {
		class Base extends MetricBaseReporter {}
		class Console extends MetricBaseReporter {}
		class CSV extends MetricBaseReporter {}
		class Event extends MetricBaseReporter {}
		class Datadog extends MetricBaseReporter {}
		class Prometheus extends MetricBaseReporter {}
		class StatsD extends MetricBaseReporter {}
	}

	interface BulkheadOptions {
		enabled?: boolean;
		concurrency?: number;
		maxQueueSize?: number;
	}

	type ActionCacheEnabledFuncType = (ctx: Context<any, any>) => boolean;

	interface ActionCacheOptions<P = Record<string, unknown>, M = unknown> {
		enabled?: boolean | ActionCacheEnabledFuncType;
		ttl?: number;
		keys?: Array<string>;
		keygen?: CacherKeygenFunc<P, M>;
		lock?: {
			enabled?: boolean;
			staleTime?: number;
		};
	}

	type ActionVisibility = "published" | "public" | "protected" | "private";

	type ActionHookBefore = (ctx: Context<any, any>) => Promise<void> | void;
	type ActionHookAfter = (ctx: Context<any, any>, res: any) => Promise<any> | any;
	type ActionHookError = (ctx: Context<any, any>, err: Error) => Promise<void> | void;

	interface ActionHooks {
		before?: string | ActionHookBefore | Array<string | ActionHookBefore>;
		after?: string | ActionHookAfter | Array<string | ActionHookAfter>;
		error?: string | ActionHookError | Array<string | ActionHookError>;
	}

	interface RestSchema {
		path?: string;
		method?: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
		fullPath?: string;
		basePath?: string;
	}

	type ActionSchema<S = ServiceSettingSchema> = {
		name?: string;
		rest?: RestSchema | string | string[];
		visibility?: ActionVisibility;
		params?: ActionParams;
		service?: Service;
		cache?: boolean | ActionCacheOptions;
		handler?: ActionHandler;
		tracing?: boolean | TracingActionOptions;
		bulkhead?: BulkheadOptions;
		circuitBreaker?: BrokerCircuitBreakerOptions;
		retryPolicy?: RetryPolicyOptions;
		fallback?: string | FallbackHandler;
		hooks?: ActionHooks;

		[key: string]: any;
	} & ThisType<Service<S>>;

	type EventSchema<S = ServiceSettingSchema> = {
		name?: string;
		group?: string;
		params?: ActionParams;
		service?: Service;
		tracing?: boolean | TracingEventOptions;
		bulkhead?: BulkheadOptions;
		handler?: ActionHandler;
		context?: boolean;

		[key: string]: any;
	} & ThisType<Service<S>>;

	type ServiceActionsSchema<S = ServiceSettingSchema> = {
		[key: string]: ActionSchema | ActionHandler | boolean;
	} & ThisType<Service<S>>;

	class BrokerNode {
		id: string;
		instanceID: string | null;
		available: boolean;
		local: boolean;
		lastHeartbeatTime: number;
		config: GenericObject;
		client: GenericObject;
		metadata: GenericObject;

		ipList: Array<string>;
		port: number | null;
		hostname: string | null;
		udpAddress: string | null;

		rawInfo: GenericObject;
		services: [GenericObject];

		cpu: number | null;
		cpuSeq: number | null;

		seq: number;
		offlineSince: number | null;

		heartbeat(payload: GenericObject): void;
		disconnected(): void;
	}

	class Context<P = unknown, M extends object = {}, L = GenericObject> {
		constructor(broker: ServiceBroker, endpoint: Endpoint);
		id: string;
		broker: ServiceBroker;
		endpoint: Endpoint | null;
		action: ActionSchema | null;
		event: EventSchema | null;
		service: Service | null;
		nodeID: string | null;

		eventName: string | null;
		eventType: string | null;
		eventGroups: Array<string> | null;

		options: CallingOptions;

		parentID: string | null;
		caller: string | null;

		tracing: boolean | null;
		span: Span | null;

		needAck: boolean | null;
		ackID: string | null;

		locals: L;

		level: number;

		params: P;
		meta: M;

		requestID: string | null;

		cachedResult: boolean;

		setEndpoint(endpoint: Endpoint): void;
		setParams(newParams: P, cloning?: boolean): void;
		call<T>(actionName: string): Promise<T>;
		call<T, P>(actionName: string, params: P, opts?: CallingOptions): Promise<T>;

		mcall<T>(
			def: Record<string, MCallDefinition>,
			opts?: MCallCallingOptions
		): Promise<Record<string, T>>;
		mcall<T>(def: Array<MCallDefinition>, opts?: MCallCallingOptions): Promise<Array<T>>;

		emit<D>(eventName: string, data: D, opts: GenericObject): Promise<void>;
		emit<D>(eventName: string, data: D, groups: Array<string>): Promise<void>;
		emit<D>(eventName: string, data: D, groups: string): Promise<void>;
		emit<D>(eventName: string, data: D): Promise<void>;
		emit(eventName: string): Promise<void>;

		broadcast<D>(eventName: string, data: D, opts: GenericObject): Promise<void>;
		broadcast<D>(eventName: string, data: D, groups: Array<string>): Promise<void>;
		broadcast<D>(eventName: string, data: D, groups: string): Promise<void>;
		broadcast<D>(eventName: string, data: D): Promise<void>;
		broadcast(eventName: string): Promise<void>;

		copy(endpoint: Endpoint): this;
		copy(): this;

		startSpan(name: string, opts?: GenericObject): Span;
		finishSpan(span: Span, time?: number): void;

		toJSON(): GenericObject;

		static create(
			broker: ServiceBroker,
			endpoint: Endpoint,
			params: GenericObject,
			opts: GenericObject
		): Context;
		static create(broker: ServiceBroker, endpoint: Endpoint, params: GenericObject): Context;
		static create(broker: ServiceBroker, endpoint: Endpoint): Context;
		static create(broker: ServiceBroker): Context;
	}

	interface ServiceSettingSchema {
		$noVersionPrefix?: boolean;
		$noServiceNamePrefix?: boolean;
		$dependencyTimeout?: number;
		$shutdownTimeout?: number;
		$secureSettings?: Array<string>;
		[name: string]: any;
	}

	type ServiceEventLegacyHandler = (
		payload: any,
		sender: string,
		eventName: string,
		ctx: Context
	) => void | Promise<void>;

	type ServiceEventHandler = (ctx: Context) => void | Promise<void>;

	type ServiceEvent<S = ServiceSettingSchema> = {
		name?: string;
		group?: string;
		params?: ActionParams;
		context?: boolean;
		debounce?: number;
		throttle?: number;
		handler?: ServiceEventHandler | ServiceEventLegacyHandler;
	} & ThisType<Service<S>>;

	type ServiceEvents = {
		[key: string]: ServiceEventHandler | ServiceEventLegacyHandler | ServiceEvent;
	};

	type ServiceMethods = { [key: string]: (...args: any[]) => any } & ThisType<Service>;

	type CallMiddlewareHandler = (
		actionName: string,
		params: any,
		opts: CallingOptions
	) => Promise<any>;
	type Middleware = {
		[name: string]:
			| ((handler: ActionHandler, action: ActionSchema) => any)
			| ((handler: ActionHandler, event: ServiceEvent) => any)
			| ((handler: ActionHandler) => any)
			| ((service: Service) => any)
			| ((broker: ServiceBroker) => any)
			| ((handler: CallMiddlewareHandler) => CallMiddlewareHandler);
	};

	type MiddlewareInit = (broker: ServiceBroker) => Middleware;
	interface MiddlewareCallHandlerOptions {
		reverse?: boolean;
	}

	interface MiddlewareHandler {
		list: Middleware[];

		add(mw: string | Middleware | MiddlewareInit): void;
		wrapHandler(method: string, handler: ActionHandler, def: ActionSchema): typeof handler;
		callHandlers(
			method: string,
			args: any[],
			opts: MiddlewareCallHandlerOptions
		): Promise<void>;
		callSyncHandlers(method: string, args: any[], opts: MiddlewareCallHandlerOptions): void;
		count(): number;
		wrapMethod(
			method: string,
			handler: ActionHandler,
			bindTo?: any,
			opts?: MiddlewareCallHandlerOptions
		): typeof handler;
	}

	interface ServiceHooksBefore {
		[key: string]: string | ActionHookBefore | Array<string | ActionHookBefore>;
	}

	interface ServiceHooksAfter {
		[key: string]: string | ActionHookAfter | Array<string | ActionHookAfter>;
	}

	interface ServiceHooksError {
		[key: string]: string | ActionHookError | Array<string | ActionHookError>;
	}

	interface ServiceHooks {
		before?: ServiceHooksBefore;
		after?: ServiceHooksAfter;
		error?: ServiceHooksError;
	}

	interface ServiceDependency {
		name: string;
		version?: string | number;
	}

	interface ServiceSchema<S = ServiceSettingSchema> {
		name: string;
		version?: string | number;
		settings?: S;
		dependencies?: string | ServiceDependency | Array<string | ServiceDependency>;
		metadata?: any;
		actions?: ServiceActionsSchema;
		mixins?: Array<Partial<ServiceSchema>>;
		methods?: ServiceMethods;
		hooks?: ServiceHooks;

		events?: ServiceEvents;
		created?: (() => void) | Array<() => void>;
		started?: (() => Promise<void> | void) | Array<() => Promise<void> | void>;
		stopped?: (() => Promise<void> | void) | Array<() => Promise<void> | void>;

		[name: string]: any;
	}

	type ServiceAction = <T = Promise<any>, P extends GenericObject = GenericObject>(
		params?: P,
		opts?: CallingOptions
	) => T;

	interface ServiceActions {
		[name: string]: ServiceAction;
	}

	interface WaitForServicesResult {
		services: string[];
		statuses: Array<{ name: string; available: boolean }>;
	}

	class Service<S = ServiceSettingSchema> implements ServiceSchema<S> {
		constructor(broker: ServiceBroker, schema?: ServiceSchema<S>);

		protected parseServiceSchema(schema: ServiceSchema<S>): void;

		name: string;
		fullName: string;
		version?: string | number;
		settings: S;
		metadata: GenericObject;
		dependencies: string | ServiceDependency | Array<string | ServiceDependency>;
		schema: ServiceSchema<S>;
		originalSchema: ServiceSchema<S>;
		broker: ServiceBroker;
		logger: LoggerInstance;
		actions: ServiceActions;
		Promise: PromiseConstructorLike;

		_init(): void;
		_start(): Promise<void>;
		_stop(): Promise<void>;

		/**
		 * Call a local event handler. Useful for unit tests.
		 *
		 * @param eventName The event name
		 * @param params The event parameters
		 * @param opts The event options
		 */
		emitLocalEventHandler(eventName: string, params?: any, opts?: any): any

		/**
		 * Wait for the specified services to become available/registered with this broker.
		 *
		 * @param serviceNames The service, or services, we are waiting for.
		 * @param timeout The total time this call may take. If this time has passed and the service(s)
		 * 						    are not available an error will be thrown. (In milliseconds)
		 * @param interval The time we will wait before once again checking if the service(s) are available (In milliseconds)
		 */
		waitForServices(
		  serviceNames: string | Array<string> | Array<ServiceDependency>,
		  timeout?: number,
		  interval?: number,
		): Promise<WaitForServicesResult>;

		[name: string]: any;

		/**
		 * Apply `mixins` list in schema. Merge the schema with mixins schemas. Returns with the mixed schema
		 *
		 * @param schema Schema containing the mixins to merge
		 */
		applyMixins(schema: ServiceSchema): ServiceSchema;

		/**
		 * Merge two Service schema
		 *
		 * @param mixinSchema Mixin schema
		 * @param svcSchema Service schema
		 */
		mergeSchemas(mixinSchema: ServiceSchema, svcSchema: ServiceSchema): ServiceSchema;

		/**
		 * Merge `settings` property in schema
		 *
		 * @param src Source schema property
		 * @param target Target schema property
		 */
		mergeSchemaSettings(src: GenericObject, target: GenericObject): GenericObject;

		/**
		 * Merge `metadata` property in schema
		 *
		 * @param src Source schema property
		 * @param target Target schema property
		 */
		mergeSchemaMetadata(src: GenericObject, target: GenericObject): GenericObject;

		/**
		 * Merge `mixins` property in schema
		 *
		 * @param src Source schema property
		 * @param target Target schema property
		 */
		mergeSchemaUniqArray(src: GenericObject, target: GenericObject): GenericObject;

		/**
		 * Merge `dependencies` property in schema
		 *
		 * @param src Source schema property
		 * @param target Target schema property
		 */
		mergeSchemaDependencies(src: GenericObject, target: GenericObject): GenericObject;

		/**
		 * Merge `hooks` property in schema
		 *
		 * @param src Source schema property
		 * @param target Target schema property
		 */
		mergeSchemaHooks(src: GenericObject, target: GenericObject): GenericObject;

		/**
		 * Merge `actions` property in schema
		 *
		 * @param src Source schema property
		 * @param target Target schema property
		 */
		mergeSchemaActions(src: GenericObject, target: GenericObject): GenericObject;

		/**
		 * Merge `methods` property in schema
		 *
		 * @param src Source schema property
		 * @param target Target schema property
		 */
		mergeSchemaMethods(src: GenericObject, target: GenericObject): GenericObject;

		/**
		 * Merge `events` property in schema
		 *
		 * @param src Source schema property
		 * @param target Target schema property
		 */
		mergeSchemaEvents(src: GenericObject, target: GenericObject): GenericObject;

		/**
		 * Merge `started`, `stopped`, `created` event handler properties in schema
		 *
		 * @param src Source schema property
		 * @param target Target schema property
		 */
		mergeSchemaLifecycleHandlers(
		  src: GenericObject,
		  target: GenericObject
		): GenericObject;

		/**
		 * Merge unknown properties in schema
		 *
		 * @param src Source schema property
		 * @param target Target schema property
		 */
		mergeSchemaUnknown(src: GenericObject, target: GenericObject): GenericObject;

		/**
		 * Return a versioned full service name.
		 *
		 * @param name The name
		 * @param version The version
		 */
		static getVersionedFullName(name: string, version?: string|number): string;
	}

	type CheckRetryable = (err: Errors.MoleculerError | Error) => boolean;

	interface BrokerCircuitBreakerOptions {
		enabled?: boolean;
		threshold?: number;
		windowTime?: number;
		minRequestCount?: number;
		halfOpenTime?: number;
		check?: CheckRetryable;
	}

	interface RetryPolicyOptions {
		enabled?: boolean;
		retries?: number;
		delay?: number;
		maxDelay?: number;
		factor?: number;
		check?: CheckRetryable;
	}

	interface BrokerRegistryOptions {
		strategy?: Function | string;
		strategyOptions?: GenericObject;
		preferLocal?: boolean;
		discoverer?: RegistryDiscovererOptions | BaseDiscoverer | string;
	}

	interface RegistryDiscovererOptions {
		type: string;
		options: DiscovererOptions;
	}

	interface DiscovererOptions extends GenericObject {
		heartbeatInterval?: number;
		heartbeatTimeout?: number;
		disableHeartbeatChecks?: boolean;
		disableOfflineNodeRemoving?: boolean;
		cleanOfflineNodesTimeout?: number;
	}

	interface BrokerTransitOptions {
		maxQueueSize?: number;
		disableReconnect?: boolean;
		disableVersionCheck?: boolean;
		maxChunkSize?: number;
	}

	interface BrokerTrackingOptions {
		enabled?: boolean;
		shutdownTimeout?: number;
	}

	interface LogLevelConfig {
		[module: string]: boolean | LogLevels;
	}

	interface LoggerConfig {
		type: string;
		options?: GenericObject;
	}

	interface BrokerOptions {
		namespace?: string;
		nodeID?: string;

		logger?: Loggers.Base | LoggerConfig | Array<LoggerConfig> | boolean;
		logLevel?: LogLevels | LogLevelConfig;

		transporter?: Transporter | string | GenericObject;
		requestTimeout?: number;
		retryPolicy?: RetryPolicyOptions;

		contextParamsCloning?: boolean;
		maxCallLevel?: number;
		heartbeatInterval?: number;
		heartbeatTimeout?: number;

		tracking?: BrokerTrackingOptions;

		disableBalancer?: boolean;

		registry?: BrokerRegistryOptions;

		circuitBreaker?: BrokerCircuitBreakerOptions;

		bulkhead?: BulkheadOptions;

		transit?: BrokerTransitOptions;

		uidGenerator?: () => string;

		errorHandler?: (err: Error, info: any) => void;

		cacher?: boolean | Cacher | string | GenericObject;
		serializer?: Serializer | string | GenericObject;
		validator?: boolean | BaseValidator | ValidatorNames | ValidatorOptions;
		errorRegenerator?: Errors.Regenerator;

		metrics?: boolean | MetricRegistryOptions;
		tracing?: boolean | TracerOptions;

		internalServices?:
			| boolean
			| {
					[key: string]: Partial<ServiceSchema>;
			  };
		internalMiddlewares?: boolean;

		dependencyInterval?: number;
		dependencyTimeout?: number;

		hotReload?: boolean | HotReloadOptions;

		middlewares?: Array<Middleware | string>;

		replCommands?: Array<GenericObject> | null;
		replDelimiter?: string;

		metadata?: GenericObject;

		ServiceFactory?: typeof Service;
		ContextFactory?: typeof Context;
		Promise?: PromiseConstructorLike;

		created?: (broker: ServiceBroker) => void;
		started?: (broker: ServiceBroker) => void;
		stopped?: (broker: ServiceBroker) => void;

		/**
		 * If true, process.on("beforeExit/exit/SIGINT/SIGTERM", ...) handler won't be registered!
		 * You have to register this manually and stop broker in this case!
		 */
		skipProcessEventRegistration?: boolean;

		maxSafeObjectSize?: number;
	}

	interface NodeHealthStatus {
		cpu: {
			load1: number;
			load5: number;
			load15: number;
			cores: number;
			utilization: number;
		};
		mem: {
			free: number;
			total: number;
			percent: number;
		};
		os: {
			uptime: number;
			type: string;
			release: string;
			hostname: string;
			arch: string;
			platform: string;
			user: string;
		};
		process: {
			pid: NodeJS.Process["pid"];
			memory: NodeJS.MemoryUsage;
			uptime: number;
			argv: string[];
		};
		client: {
			type: string;
			version: string;
			langVersion: NodeJS.Process["version"];
		};
		net: {
			ip: string[];
		};
		time: {
			now: number;
			iso: string;
			utc: string;
		};
	}

	type FallbackHandler = (ctx: Context, err: Errors.MoleculerError) => Promise<any>;
	type FallbackResponse = string | number | GenericObject;
	type FallbackResponseHandler = (ctx: Context, err: Errors.MoleculerError) => Promise<any>;

	interface CallingOptions {
		timeout?: number;
		retries?: number;
		fallbackResponse?: FallbackResponse | Array<FallbackResponse> | FallbackResponseHandler;
		nodeID?: string;
		meta?: GenericObject;
		parentCtx?: Context;
		requestID?: string;
		tracking?: boolean;
		paramsCloning?: boolean;
		caller?: string;
	}

	interface MCallCallingOptions extends CallingOptions {
		settled?: boolean;
	}

	interface CallDefinition<P extends GenericObject = GenericObject> {
		action: string;
		params: P;
	}

	interface MCallDefinition<P extends GenericObject = GenericObject> extends CallDefinition<P> {
		options?: CallingOptions;
	}

	interface Endpoint {
		broker: ServiceBroker;

		id: string;
		node: GenericObject;

		local: boolean;
		state: boolean;
	}

	interface ActionEndpoint extends Endpoint {
		service: Service;
		action: ActionSchema;
	}

	interface EventEndpoint extends Endpoint {
		service: Service;
		event: EventSchema;
	}

	interface PongResponse {
		nodeID: string;
		elapsedTime: number;
		timeDiff: number;
	}

	interface PongResponses {
		[name: string]: PongResponse;
	}

	interface ServiceSearchObj {
		name: string;
		version?: string | number;
	}

	namespace Loggers {
		class Base {
			constructor(opts?: GenericObject);
			init(loggerFactory: LoggerFactory): void;
			stop(): void;
			getLogLevel(mod: string): string;
			getLogHandler(bindings: GenericObject): GenericObject;
		}
	}

	class ServiceBroker {
		constructor(options?: BrokerOptions);

		options: BrokerOptions;

		Promise: PromiseConstructorLike;
		ServiceFactory: typeof Service;
		ContextFactory: typeof Context;

		started: boolean;

		namespace: string;
		nodeID: string;
		instanceID: string;

		logger: LoggerInstance;

		services: Array<Service>;

		localBus: EventEmitter2;

		scope: AsyncStorage;
		metrics: MetricRegistry;

		middlewares: MiddlewareHandler;

		registry: ServiceRegistry;

		cacher?: Cacher;
		serializer?: Serializer;
		validator?: BaseValidator;
		errorRegenerator?: Errors.Regenerator;

		tracer: Tracer;

		transit?: Transit;

		start(): Promise<void>;
		stop(): Promise<void>;

		errorHandler(err: Error, info: GenericObject): void;

		wrapMethod(
			method: string,
			handler: ActionHandler,
			bindTo?: any,
			opts?: MiddlewareCallHandlerOptions
		): typeof handler;
		callMiddlewareHookSync(
			name: string,
			args: any[],
			opts: MiddlewareCallHandlerOptions
		): Promise<void>;
		callMiddlewareHook(name: string, args: any[], opts: MiddlewareCallHandlerOptions): void;

		isMetricsEnabled(): boolean;
		isTracingEnabled(): boolean;

		getLogger(module: string, props?: GenericObject): LoggerInstance;
		fatal(message: string, err?: Error, needExit?: boolean): void;

		loadServices(folder?: string, fileMask?: string): number;
		loadService(filePath: string): Service;
		createService(schema: ServiceSchema, schemaMods?: ServiceSchema): Service;
		destroyService(service: Service | string | ServiceSearchObj): Promise<void>;

		getLocalService(name: string | ServiceSearchObj): Service;
		waitForServices(
			serviceNames: string | Array<string> | Array<ServiceSearchObj>,
			timeout?: number,
			interval?: number,
			logger?: LoggerInstance
		): Promise<void>;

		findNextActionEndpoint(
			actionName: string,
			opts?: GenericObject,
			ctx?: Context
		): ActionEndpoint | Errors.MoleculerRetryableError;

		call<T>(actionName: string): Promise<T>;
		call<T, P>(actionName: string, params: P, opts?: CallingOptions): Promise<T>;

		mcall<T>(
			def: Record<string, MCallDefinition>,
			opts?: MCallCallingOptions
		): Promise<Record<string, T>>;
		mcall<T>(def: Array<MCallDefinition>, opts?: MCallCallingOptions): Promise<Array<T>>;

		emit<D>(eventName: string, data: D, opts: GenericObject): Promise<void>;
		emit<D>(eventName: string, data: D, groups: Array<string>): Promise<void>;
		emit<D>(eventName: string, data: D, groups: string): Promise<void>;
		emit<D>(eventName: string, data: D): Promise<void>;
		emit(eventName: string): Promise<void>;

		broadcast<D>(eventName: string, data: D, opts: GenericObject): Promise<void>;
		broadcast<D>(eventName: string, data: D, groups: Array<string>): Promise<void>;
		broadcast<D>(eventName: string, data: D, groups: string): Promise<void>;
		broadcast<D>(eventName: string, data: D): Promise<void>;
		broadcast(eventName: string): Promise<void>;

		broadcastLocal<D>(eventName: string, data: D, opts: GenericObject): Promise<void>;
		broadcastLocal<D>(eventName: string, data: D, groups: Array<string>): Promise<void>;
		broadcastLocal<D>(eventName: string, data: D, groups: string): Promise<void>;
		broadcastLocal<D>(eventName: string, data: D): Promise<void>;
		broadcastLocal(eventName: string): Promise<void>;

		ping(): Promise<PongResponses>;
		ping(nodeID: string | Array<string>, timeout?: number): Promise<PongResponse>;

		getHealthStatus(): NodeHealthStatus;
		getLocalNodeInfo(): BrokerNode;

		getCpuUsage(): Promise<any>;
		generateUid(): string;

		hasEventListener(eventName: string): boolean;
		getEventListener(eventName: string): Array<EventEndpoint>;

		getConstructorName(obj: any): string;

		MOLECULER_VERSION: string;
		PROTOCOL_VERSION: string;
		[name: string]: any;

		static MOLECULER_VERSION: string;
		static PROTOCOL_VERSION: string;
		static INTERNAL_MIDDLEWARES: Array<string>;
		static defaultOptions: BrokerOptions;
		static Promise: PromiseConstructorLike;
	}

	class Packet {
		constructor(type: string, target: string, payload?: any);
	}

	namespace Packets {
		type PROTOCOL_VERSION = "4";
		type PACKET_UNKNOWN = "???";
		type PACKET_EVENT = "EVENT";
		type PACKET_REQUEST = "REQ";
		type PACKET_RESPONSE = "RES";
		type PACKET_DISCOVER = "DISCOVER";
		type PACKET_INFO = "INFO";
		type PACKET_DISCONNECT = "DISCONNECT";
		type PACKET_HEARTBEAT = "HEARTBEAT";
		type PACKET_PING = "PING";
		type PACKET_PONG = "PONG";

		type PACKET_GOSSIP_REQ = "GOSSIP_REQ";
		type PACKET_GOSSIP_RES = "GOSSIP_RES";
		type PACKET_GOSSIP_HELLO = "GOSSIP_HELLO";

		const PROTOCOL_VERSION: PROTOCOL_VERSION;
		const PACKET_UNKNOWN: PACKET_UNKNOWN;
		const PACKET_EVENT: PACKET_EVENT;
		const PACKET_REQUEST: PACKET_REQUEST;
		const PACKET_RESPONSE: PACKET_RESPONSE;
		const PACKET_DISCOVER: PACKET_DISCOVER;
		const PACKET_INFO: PACKET_INFO;
		const PACKET_DISCONNECT: PACKET_DISCONNECT;
		const PACKET_HEARTBEAT: PACKET_HEARTBEAT;
		const PACKET_PING: PACKET_PING;
		const PACKET_PONG: PACKET_PONG;

		const PACKET_GOSSIP_REQ: PACKET_GOSSIP_REQ;
		const PACKET_GOSSIP_RES: PACKET_GOSSIP_RES;
		const PACKET_GOSSIP_HELLO: PACKET_GOSSIP_HELLO;

		interface PacketPayload {
			ver: PROTOCOL_VERSION;
			sender: string | null;
		}

		interface Packet {
			type:
				| PACKET_UNKNOWN
				| PACKET_EVENT
				| PACKET_DISCONNECT
				| PACKET_DISCOVER
				| PACKET_INFO
				| PACKET_HEARTBEAT
				| PACKET_REQUEST
				| PACKET_PING
				| PACKET_PONG
				| PACKET_RESPONSE
				| PACKET_GOSSIP_REQ
				| PACKET_GOSSIP_RES
				| PACKET_GOSSIP_HELLO;
			target?: string;
			payload: PacketPayload;
		}
	}

	class Transporter {
		constructor(opts?: GenericObject);
		hasBuiltInBalancer: boolean;

		init(
			transit: Transit,
			messageHandler: (cmd: string, msg: string) => void,
			afterConnect: (wasReconnect: boolean) => void
		): void;
		connect(): Promise<any>;
		disconnect(): Promise<any>;
		onConnected(wasReconnect?: boolean): Promise<any>;

		makeSubscriptions(topics: Array<GenericObject>): Promise<void>;
		subscribe(cmd: string, nodeID?: string): Promise<void>;
		subscribeBalancedRequest(action: string): Promise<void>;
		subscribeBalancedEvent(event: string, group: string): Promise<void>;
		unsubscribeFromBalancedCommands(): Promise<void>;

		incomingMessage(cmd: string, msg: Buffer): Promise<void>;
		receive(cmd: string, data: Buffer): Promise<void>;

		prepublish(packet: Packet): Promise<void>;
		publish(packet: Packet): Promise<void>;
		publishBalancedEvent(packet: Packet, group: string): Promise<void>;
		publishBalancedRequest(packet: Packet): Promise<void>;
		send(topic: string, data: Buffer, meta: GenericObject): Promise<void>;

		getTopicName(cmd: string, nodeID?: string): string;
		makeBalancedSubscriptions(): Promise<void>;

		serialize(packet: Packet): Buffer;
		deserialize(type: string, data: Buffer): Packet;
	}

	type CacherKeygenFunc<P = Record<string, unknown>, M = unknown> = (
		actionName: string,
		params: P,
		meta: M,
		keys?: string[]
	) => string;
	interface CacherOptions {
		ttl?: number;
		keygen?: CacherKeygenFunc;
		maxParamsLength?: number;
		[key: string]: any;
	}

	interface MemoryCacherOptions extends CacherOptions {
		clone?: boolean;
	}

	interface MemoryLRUCacherOptions extends MemoryCacherOptions {
		max?: number;
	}

	interface RedisCacherOptions extends CacherOptions {
		prefix?: string;
		redis?: GenericObject;
		redlock?: GenericObject;
		monitor?: boolean;
		pingInterval?: number;
	}

	namespace Cachers {
		class Base {
			constructor(opts?: CacherOptions);
			opts: CacherOptions;

			init(broker: ServiceBroker): void;
			close(): Promise<any>;
			get(key: string): Promise<null | GenericObject>;
			getWithTTL(key: string): Promise<null | GenericObject>;
			set(key: string, data: any, ttl?: number): Promise<any>;
			del(key: string | Array<string>): Promise<any>;
			clean(match?: string | Array<string>): Promise<any>;
			getCacheKey(
				actionName: string,
				params: object,
				meta: object,
				keys: Array<string> | null
			): string;
			defaultKeygen(
				actionName: string,
				params: object | null,
				meta: object | null,
				keys: Array<string> | null
			): string;
		}

		class Memory extends Base {
			constructor(opts?: MemoryCacherOptions);
			opts: MemoryCacherOptions;
		}

		class MemoryLRU extends Base {
			constructor(opts?: MemoryLRUCacherOptions);
			opts: MemoryLRUCacherOptions;
		}

		class Redis<C = any> extends Base {
			constructor(opts?: string | RedisCacherOptions);
			opts: RedisCacherOptions;

			client: C;
			prefix: string | null;
		}
	}

	type Cacher<T extends Cachers.Base = Cachers.Base> = T;

	class Serializer {
		constructor(opts?: any);
		init(broker: ServiceBroker): void;
		serialize(obj: GenericObject, type?: string): Buffer;
		deserialize(buf: Buffer, type?: string): GenericObject;
	}

	const Serializers: {
		Base: typeof Serializer;
		JSON: typeof Serializer;
		Avro: typeof Serializer;
		CBOR: typeof Serializer;
		MsgPack: typeof Serializer;
		ProtoBuf: typeof Serializer;
		Thrift: typeof Serializer;
		Notepack: typeof Serializer;
		resolve: (type: string | GenericObject | Serializer) => Serializer;
	};

	class BaseValidator {
		constructor();
		init(broker: ServiceBroker): void;
		compile(schema: GenericObject): Function;
		validate(params: GenericObject, schema: GenericObject): boolean;
		middleware(): (handler: ActionHandler, action: ActionSchema) => any;
		convertSchemaToMoleculer(schema: any): GenericObject;
	}

	class Validator extends BaseValidator {} // deprecated

	abstract class BaseStrategy {
		constructor(registry: ServiceRegistry, broker: ServiceBroker, opts?: object);
		select(list: any[], ctx?: Context): Endpoint;
	}

	type ValidatorNames = "Fastest";

	class RoundRobinStrategy extends BaseStrategy {}
	class RandomStrategy extends BaseStrategy {}
	class CpuUsageStrategy extends BaseStrategy {}
	class LatencyStrategy extends BaseStrategy {}
	class ShardStrategy extends BaseStrategy {}

	namespace Strategies {
		class Base extends BaseStrategy {}
		class RoundRobin extends RoundRobinStrategy {}
		class Random extends RandomStrategy {}
		class CpuUsage extends CpuUsageStrategy {}
		class Latency extends LatencyStrategy {}
		class Shard extends ShardStrategy {}
	}

	abstract class BaseDiscoverer {
		constructor(opts?: DiscovererOptions);

		transit?: Transit;
		localNode?: BrokerNode;

		heartbeatTimer: NodeJS.Timeout;
		checkNodesTimer: NodeJS.Timeout;
		offlineTimer: NodeJS.Timeout;

		init(registry: ServiceRegistry): void;

		stop(): Promise<void>;
		startHeartbeatTimers(): void;
		stopHeartbeatTimers(): void;
		disableHeartbeat(): void;
		beat(): Promise<void>;
		checkRemoteNodes(): void;
		checkOfflineNodes(): void;
		heartbeatReceived(nodeID: string, payload: GenericObject): void;
		processRemoteNodeInfo(nodeID: string, payload: GenericObject): BrokerNode;
		sendHeartbeat(): Promise<void>;
		discoverNode(nodeID: string): Promise<BrokerNode | void>;
		discoverAllNodes(): Promise<BrokerNode[] | void>;
		localNodeReady(): Promise<void>;
		sendLocalNodeInfo(nodeID: string): Promise<void>;
		localNodeDisconnected(): Promise<void>;
		remoteNodeDisconnected(nodeID: string, isUnexpected: boolean): void;
	}

	namespace Discoverers {
		class Base extends BaseDiscoverer {}
		class Local extends BaseDiscoverer {}
		class Redis extends BaseDiscoverer {}
		class Etcd3 extends BaseDiscoverer {}
	}

	interface ValidatorOptions {
		type: string;
		options?: GenericObject;
	}

	namespace Validators {
		class Base extends BaseValidator {}
		class Fastest extends BaseValidator {}
	}

	namespace Transporters {
		class Base extends Transporter {}
		class Fake extends Base {}
		class NATS extends Base {}
		class MQTT extends Base {}
		class Redis extends Base {}
		class AMQP extends Base {}
		class Kafka extends Base {}
		class STAN extends Base {}
		class TCP extends Base {}
	}

	namespace Errors {
		class MoleculerError extends Error {
			public code: number;
			public type: string;
			public data: any;
			public retryable: boolean;

			constructor(message: string, code: number, type: string, data: any);
			constructor(message: string, code: number, type: string);
			constructor(message: string, code: number);
			constructor(message: string);
		}
		class MoleculerRetryableError extends MoleculerError {}
		class MoleculerServerError extends MoleculerRetryableError {}
		class MoleculerClientError extends MoleculerError {}

		class ServiceNotFoundError extends MoleculerRetryableError {
			constructor(data: any);
		}
		class ServiceNotAvailableError extends MoleculerRetryableError {
			constructor(data: any);
		}

		class RequestTimeoutError extends MoleculerRetryableError {
			constructor(data: any);
		}
		class RequestSkippedError extends MoleculerError {
			constructor(data: any);
		}
		class RequestRejectedError extends MoleculerRetryableError {
			constructor(data: any);
		}

		class QueueIsFullError extends MoleculerRetryableError {
			constructor(data: any);
		}
		class ValidationError extends MoleculerClientError {
			constructor(message: string, type: string, data: GenericObject);
			constructor(message: string, type: string);
			constructor(message: string);
		}
		class MaxCallLevelError extends MoleculerError {
			constructor(data: any);
		}

		class ServiceSchemaError extends MoleculerError {
			constructor(message: string, data: any);
		}

		class BrokerOptionsError extends MoleculerError {
			constructor(message: string, data: any);
		}

		class GracefulStopTimeoutError extends MoleculerError {
			constructor(data: any);
		}

		class ProtocolVersionMismatchError extends MoleculerError {
			constructor(data: any);
		}

		class InvalidPacketDataError extends MoleculerError {
			constructor(data: any);
		}

		interface PlainMoleculerError extends MoleculerError {
			nodeID?: string;

			[key: string]: any;
		}

		class Regenerator {
			init(broker: ServiceBroker): void;
			restore(plainError: PlainMoleculerError, payload: GenericObject): Error;
			extractPlainError(err: Error): PlainMoleculerError;
			restoreCustomError(
				plainError: PlainMoleculerError,
				payload: GenericObject
			): Error | undefined;
		}
	}

	interface TransitRequest {
		action: string;
		nodeID: string;
		ctx: Context;
		resolve: (value: any) => void;
		reject: (reason: any) => void;
		stream: boolean;
	}

	interface Transit {
		pendingRequests: Map<string, TransitRequest>;
		nodeID: string;
		logger: LoggerInstance;
		connected: boolean;
		disconnecting: boolean;
		isReady: boolean;
		tx: Transporter;

		afterConnect(wasReconnect: boolean): Promise<void>;
		connect(): Promise<void>;
		disconnect(): Promise<void>;
		ready(): Promise<void>;
		sendDisconnectPacket(): Promise<void>;
		makeSubscriptions(): Promise<Array<void>>;
		messageHandler(cmd: string, msg: GenericObject): boolean | Promise<void> | undefined;
		request(ctx: Context): Promise<void>;
		sendEvent(ctx: Context): Promise<void>;
		removePendingRequest(id: string): void;
		removePendingRequestByNodeID(nodeID: string): void;
		sendResponse(nodeID: string, id: string, data: GenericObject, err: Error): Promise<void>;
		sendResponse(nodeID: string, id: string, data: GenericObject): Promise<void>;
		discoverNodes(): Promise<void>;
		discoverNode(nodeID: string): Promise<void>;
		sendNodeInfo(info: BrokerNode, nodeID?: string): Promise<void | Array<void>>;
		sendPing(nodeID: string, id?: string): Promise<void>;
		sendPong(payload: GenericObject): Promise<void>;
		processPong(payload: GenericObject): void;
		sendHeartbeat(localNode: BrokerNode): Promise<void>;
		subscribe(topic: string, nodeID: string): Promise<void>;
		publish(packet: Packet): Promise<void>;
	}

	interface ActionCatalogListOptions {
		onlyLocal?: boolean;
		onlyAvailable?: boolean;
		skipInternal?: boolean;
		withEndpoints?: boolean;
	}

	class ServiceRegistry {
		broker: ServiceBroker;
		metrics: MetricRegistry;
		logger: LoggerInstance;

		opts: BrokerRegistryOptions;

		StrategyFactory: BaseStrategy;

		nodes: any;
		services: any;
		actions: any;
		events: any;

		getServiceList(opts?: ActionCatalogListOptions): ServiceSchema[];
	}

	class AsyncStorage {
		broker: ServiceBroker;
		store: Map<string, any>;

		constructor(broker: ServiceBroker);

		enable(): void;
		disable(): void;
		stop(): void;
		getAsyncId(): number;
		setSessionData(data: any): void;
		getSessionData(): any | null;
	}

	const CIRCUIT_CLOSE: string;
	const CIRCUIT_HALF_OPEN: string;
	const CIRCUIT_OPEN: string;

	namespace Utils {
		function isFunction(func: unknown): func is Function;
		function isString(str: unknown): str is string;
		function isObject(obj: unknown): obj is object;
		function isPlainObject(obj: unknown): obj is object;
		function isDate(date: unknown): date is Date;
		function flatten<T>(arr: readonly T[] | readonly T[][]): T[];
		function humanize(millis?: number | null): string;
		function generateToken(): string;
		function removeFromArray<T>(arr: T[], item: T): T[];
		function getNodeID(): string;
		function getIpList(): string[];
		function isPromise<T>(promise: unknown): promise is Promise<T>;
		function polyfillPromise(P: typeof Promise): void;
		function clearRequireCache(filename: string): void;
		function match(text: string, pattern: string): boolean;
		function deprecate(prop: unknown, msg?: string): void;
		function safetyObject(obj: unknown, options?: { maxSafeObjectSize?: number }): any;
		function dotSet<T extends object>(obj: T, path: string, value: unknown): T;
		function makeDirs(path: string): void;
		function parseByteString(value: string): number;
	}
}

export = Moleculer;
