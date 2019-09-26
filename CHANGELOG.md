
--------------------------------------------------
<a name="0.14.0"></a>
# [0.14.0](https://github.com/moleculerjs/moleculer/compare/v0.13.9...v0.14.0) (2019-xx-xx)

# Breaking changes

## Communication protocol has been changed
The Moleculer communication protocol has been changed. The new protocol version is `4`.
It means the new Moleculer 0.14 nodes can't communicate with old <= 0.13 nodes.

## Logger settings changed
The whole logging function has been rewritten in this version. It means, it has a lot of new features, but the configuration of loggers has contains breaking changes. You can't use some old custom logger configuration form. The new configuration same as the other Moleculer module configurations. This new version supports all famous loggers like [Pino](https://github.com/pinojs/pino), [Winston](https://github.com/winstonjs/winston), [Bunyan](https://github.com/trentm/node-bunyan), [Debug](https://github.com/visionmedia/debug) & [Log4js](https://github.com/log4js-node/log4js-node).

_If you are using the built-in default console logger, this breaking change doesn't affect you._

The `logFormatter` and `logObjectPrinter` broker options has been removed and moved into the `Console` and `File` logger options.

**Not changed usable configurations**
```js
// moleculer.config.js
module.exports = {
    // Enable console logger
    logger: true,

    // Disable all loggers
    logger: false
};
```

**You CANNOT use these legacy configurations**
```js
// moleculer.config.js
module.exports = {
    // DON'T use a custom create function, like
    logger: bindings => pino.child(bindings),

    // DON'T use a custom logger, like
    logger: {
        error: () => { ... },
        warn: () => { ... },
        info: () => { ... },
        debug: () => { ... }
    }
};
```

### Console logger
This logger prints all log messags to the `console`. It supports several built-in formatters or you can use your custom formatter, as well.

**Shorthand configuration with default options**
```js
// moleculer.config.js
module.exports = {
    logger: "Console",
};
```

**Full configuration**
```js
// moleculer.config.js
module.exports = {
    logger: {
        type: "Console",
        options: {
            // Logging level
            level: "info",
            // Using colors on the output
            colors: true,
            // Print module names with different colors (like docker-compose for containers)
            moduleColors: false,
            // Line formatter. It can be "json", "short", "simple", "full", a `Function` or a template string like "{timestamp} {level} {nodeID}/{mod}: {msg}"
            formatter: "full",
            // Custom object printer. If not defined, it uses the `util.inspect` method.
            objectPrinter: null,
            // Auto-padding the module name in order to messages begin at the same column.
            autoPadding: false
        }
    }
};
```

### File logger
This logger saves all log messages to file(s). It supports JSON & formatted text files or you can use your custom formatter, as well.

**Shorthand configuration with default options**
```js
// moleculer.config.js
module.exports = {
    logger: "File",
};
```
_It will save the log messages to the `logs` folder in the current directory with `moleculer-{date}.log` filename._

**Full configuration**
```js
// moleculer.config.js
module.exports = {
    logger: {
        type: "File",
        options: {
            // Logging level
            level: "info",
            // Folder path to save files. You can use {nodeID} & {namespace} variables.
            folder: "./logs",
            // Filename template. You can use {date}, {nodeID} & {namespace} variables.
            filename: "moleculer-{date}.log",
            // Line formatter. It can be "json", "short", "simple", "full", a `Function` or a template string like "{timestamp} {level} {nodeID}/{mod}: {msg}"
            formatter: "json",
            // Custom object printer. If not defined, it uses the `util.inspect` method.
            objectPrinter: null,
            // End of line. Default values comes from the OS settings.
            eol: "\n",
            // File appending interval in milliseconds.
            interval: 1 * 1000
        }
    }
};
```

### Pino logger
This logger uses the [Pino](https://github.com/pinojs/pino) logger.

**Shorthand configuration with default options**
```js
// moleculer.config.js
module.exports = {
    logger: "Pino",
};
```

**Full configuration**
```js
// moleculer.config.js
module.exports = {
    logger: {
        type: "Pino",
        options: {
            // Logging level
            level: "info",

            pino: {
                // More info: http://getpino.io/#/docs/api?id=options-object
                options: null,

                // More info: http://getpino.io/#/docs/api?id=destination-sonicboom-writablestream-string
                destination: "/logs/moleculer.log",
            }
        }
    }
};
```

> To use this logger please install the `pino` module with `npm install pino --save` command.


### Bunyan logger
This logger uses the [Bunyan](https://github.com/trentm/node-bunyan) logger.

**Shorthand configuration with default options**
```js
// moleculer.config.js
module.exports = {
    logger: "Bunyan",
};
```

**Full configuration**
```js
// moleculer.config.js
module.exports = {
    logger: {
        type: "Bunyan",
        options: {
            // Logging level
            level: "info",

            bunyan: {
                // More settings: https://github.com/trentm/node-bunyan#constructor-api
                name: "moleculer"
            }
        }
    }
};
```

> To use this logger please install the `bunyan` module with `npm install bunyan --save` command.


### Winston logger
This logger uses the [Winston](https://github.com/winstonjs/winston) logger.

**Shorthand configuration with default options**
```js
// moleculer.config.js
module.exports = {
    logger: "Winston",
};
```

**Full configuration**
```js
// moleculer.config.js
const winston = require("winston");

module.exports = {
    logger: {
        type: "Winston",
        options: {
            // Logging level
            level: "info",

            winston: {
                // More settings: https://github.com/winstonjs/winston#creating-your-own-logger
                transports: [
                    new winston.transports.Console(),
                    new winston.transports.File({ filename: "/logs/moleculer.log" })
                ]
            }
        }
    }
};
```

> To use this logger please install the `winston` module with `npm install winston --save` command.

### `debug` logger
This logger uses the [debug](https://github.com/visionmedia/debug) logger.
To see messages you have to set the `DEBUG` environment variable to `export DEBUG=moleculer:*`.

**Shorthand configuration with default options**
```js
// moleculer.config.js
module.exports = {
    logger: "Debug",
};
```

**Full configuration**
```js
// moleculer.config.js
module.exports = {
    logger: {
        type: "Debug",
        options: {
            // Logging level
            level: "info",
        }
    }
};
```

> To use this logger please install the `debug` module with `npm install debug --save` command.

### Log4js logger
This logger uses the [Log4js](https://github.com/log4js-node/log4js-node) logger.

**Shorthand configuration with default options**
```js
// moleculer.config.js
module.exports = {
    logger: "Log4js",
};
```

**Full configuration**
```js
// moleculer.config.js
module.exports = {
    logger: {
        type: "Log4js",
        options: {
            // Logging level
            level: "info",
            
            log4js: {
                // More info: https://github.com/log4js-node/log4js-node#usage
                appenders: {
                    app: { type: "file", filename: "/logs/moleculer.log" }
                },
                categories: {
                    default: { appenders: [ "app" ], level: "debug" }
                }
            }
        }
    }
};
```

> To use this logger please install the `log4js` module with `npm install log4js --save` command.

### Datadog logger
This logger uploads log messages to the [Datadog](https://www.datadoghq.com/) server.

> Please note, this logger doesn't print any messages to the console, just collects & uploads. Use it beside another logger which also prints the messages.

**Shorthand configuration with default options**
```js
// moleculer.config.js
module.exports = {
    logger: "Datadog",
};
```

**Full configuration**
```js
// moleculer.config.js
module.exports = {
    logger: {
        type: "Datadog",
        options: {
            // Logging level
            level: "info",

            // Datadog server endpoint. https://docs.datadoghq.com/api/?lang=bash#send-logs-over-http
            url: "https://http-intake.logs.datadoghq.com/v1/input/",
            // Datadog API key
            apiKey: process.env.DATADOG_API_KEY,
            // Datadog source variable
            ddSource: "moleculer",
            // Datadog env variable
            env: undefined,
            // Datadog hostname variable
            hostname: os.hostname(),
            // Custom object printer function for `Object` & `Ąrray`
            objectPrinter: null,
            // Data uploading interval
            interval: 10 * 1000
        }
    }
};
```

### Multiple loggers
This new logger configuration admits to use multiple loggers even from the same logger type and different logging levels.

**Define multiple loggers with different logging levels**

This configuration demonstrates how you can define a `Console` logger, a `File` logger to save all log messages in formatted text file and another `File` logger to save only error messages in JSON format.

```js
// moleculer.config.js
module.exports = {
    logger: [
        {
            type: "Console",
            options: {
                level: "info",
            }
        },
        {            
            type: "File",
            options: {
                level: "info",
                folder: "/logs/moleculer",
                filename: "all-{date}.log",
                formatter: "{timestamp} {level} {nodeID}/{mod}: {msg}"
            }
        },
        {
            type: "File",
            options: {
                level: "error",
                folder: "/logs/moleculer",
                filename: "errors-{date}.json",
                formatter: "json"
            }
        }
    ]   
};
```

**Using different loggers for different modules**

This configuration demonstrates how you can define loggers for certain modules.

```js
// moleculer.config.js
module.exports = {
    logger: [
        // Shorthand `Console` logger configuration
        "Console",
        {            
            // This logger saves messages from all modules except "greeter" service.
            type: "File",
            options: {
                level: {
                    "GREETER": false,
                    "**": "info"
                },
                filename: "moleculer-{date}.log"
            }
        },
        {
            // This logger saves messages from only "greeter" service.
            type: "File",
            options: {
                level: {
                    "GREETER": "debug",
                    "**": false
                },
                filename: "greeter-{date}.log"
            }
        }
    ],

    logLevel: "info" // global log level. All loggers inherits it. 
};
```

## Logging level setting.
To configure logging levels, you can use the well-known `logLevel` broker option which can be a `String` or an `Object`. But it is possible to overwrite it in all logger `options` with the `level` property.

**Complex logging level configuration**
```js
// moleculer.config.js
module.exports = {
    logger: [
        // The console logger will use the `logLevel` global setting.
        "Console",
        {            
            type: "File",
            options: {
                // Overwrite the global setting.
                level: {
                    "GREETER": false,
                    "**": "warn"
                }
            }
        }
    ],

    logLevel: {
        "TRACING": "trace",
        "TRANS*": "warn",
        "GREETER": "debug",
        "**": "info",
    }
};
```


## Validation settings changed
The `validation: true` broker options was removed to follow other module configuration. Use `validator` option, instead.

**Enable validation with built-in validator (default option)**
```js
const broker = new ServiceBroker({
    validator: true
});
```

**Disable validation/validator**
```js
const broker = new ServiceBroker({
    validator: false
});
```

**Use custom validation**
```js
const broker = new ServiceBroker({
    validator: new MyCustomValidator()
});
```

## The `broker.use` removed
The `broker.use` has been deprecated in version 0.13 and now it is removed. Use `middleware: []` broker options to define middlewares. 

_loading middleware after the broker has started is no longer available._

## The `$node.health` response changed
The `$node.health` action's response has been changed. The `transit` property is removed. To get transit metrics, use the new `$node.metrics` internal action.

## Middleware shorthand definition is dropped
In previous versions you could define middleware which wraps the `localAction` hook with a simple `Function`.
In version 0.14 this legacy shorthand is dropped. When you define a middleware as a `Function`, the middleware handler will call it as an initialization and pass the ServiceBroker instance as a parameter.

**Old shorthand middleware definition as a `Function`**
```js
const MyMiddleware = function(next, action) {
    return ctx => next(ctx);
};

const broker = new ServiceBroker({
    middlewares: [MyMiddleware]
});
```

**New middleware definition as a `Function`**
```js
const MyMiddleware = function(broker) {
    // Create a custom named logger
    const myLogger = broker.getLogger("MY-LOGGER");

    return {
        localAction: function(next, action) {
            return ctx => {
                myLogger.info(`${action.name} has been called`);
                return next(ctx);
            }
        }
    }
};

const broker = new ServiceBroker({
    middlewares: [MyMiddleware]
});
```

## The `localEvent` middleware hook signature changed

**Old signature**
```js
// my-middleware.js
module.exports = {
    // Wrap local event handlers
    localEvent(next, event) {
        return (payload, sender, event) => {
            return next(payload, sender, event);
        };
    },
};
```

**New context-based signature**
```js
// my-middleware.js
module.exports = {
    // Wrap local event handlers
    localEvent(next, event) {
        return (ctx) => {
            return next(ctx);
        };
    },
};
```


# New

## Experimental transporters have become stable
The Kafka, NATS Streaming & TCP transporter have become stable because we didn't find and receive any issue about them.

## Context-based events
The new 0.14 version comes context-based event handler. It is very useful when you are using event-driven architecture and you would like to tracing the event. The Event Context is same as Action Context. They are the same properties except a few new properties related to the event.
It doesn't mean you should rewrite all existing event handlers. Moleculer detects the signature if your event handler. If it finds that the signature is `"user.created(ctx) { ... }`, it will call it with Event Context. If not, it will call with old arguments & the 4th argument will be the Event Context, like `"user.created"(payload, sender, eventName, ctx) {...}`

**Use Context-based event handler & emit a nested event**
```js
module.exports = {
    name: "accounts",
    events: {
        "user.created"(ctx) {
            console.log("Payload:", ctx.params);
            console.log("Sender:", ctx.nodeID);
            console.log("We have also metadata:", ctx.meta);
            console.log("The called event name:", ctx.eventName);

            ctx.emit("accounts.created", { user: ctx.params.user });
        }
    }
};
```


## New built-in metrics
Moleculer v0.14 comes with a brand-new and entirely rewritten metrics module. It is now a built-in module. It collects a lot of internal Moleculer & process metric values. You can easily define your custom metrics. There are several built-in metrics reporters like `Console`, `Prometheus`, `Datadog`, ...etc.
Multiple reporters can be defined.

**Enable metrics & define console reporter**
```js
const broker = new ServiceBroker({
    metrics: {
        enabled: true,
        reporter: [
            "Console"
        ]
    }
});
```

**Define custom metrics**
```js
// posts.service.js
module.exports = {
    name: "posts",

    actions: {
        get(ctx) {
            // Update metrics
            this.broker.metrics.increment("posts.get.total");
            return posts;
        }
    },

    created() {
        // Register new custom metrics
        this.broker.metrics.register({ type: "counter", name: "posts.get.total" });
    }
};
```

**Enable metrics & define Prometheus reporter with filtering**
```js
const broker = new ServiceBroker({
    metrics: {
        enabled: true,
        reporter: [
            {
                type: "Prometheus",
                options: {
                    port: 3030,
                    includes: ["moleculer.**"],
                    excludes: ["moleculer.transit.**"]
                }
            }
        ]
    }
});
```

### Supported metric types
- `counter` - A counter is a cumulative metric that represents a single monotonically increasing counter whose value can only increase or be reset to zero. For example, you can use a counter to represent the number of requests served, tasks completed, or errors.

- `gauge` - A gauge is a metric that represents a single numerical value that can arbitrarily go up and down. Gauges are typically used for measured values like current memory usage, but also "counts" that can go up and down, like the number of concurrent requests.

- `histogram` - A histogram samples observations (usually things like request durations or response sizes) and counts them in configurable buckets. It also provides a sum of all observed values and calculates configurable quantiles over a sliding time window.

- `info` - An info is a single string or number value like process arguments, hostname or version numbers.

### Internal metrics

**Process metrics**
- `process.arguments` (info)
- `process.pid` (info)
- `process.ppid` (info)
- `process.eventloop.lag.min` (gauge)
- `process.eventloop.lag.avg` (gauge)
- `process.eventloop.lag.max` (gauge)
- `process.eventloop.lag.count` (gauge)
- `process.memory.heap.size.total` (gauge)
- `process.memory.heap.size.used` (gauge)
- `process.memory.rss` (gauge)
- `process.memory.external` (gauge)
- `process.memory.heap.space.size.total` (gauge)
- `process.memory.heap.space.size.used` (gauge)
- `process.memory.heap.space.size.available` (gauge)
- `process.memory.heap.space.size.physical` (gauge)
- `process.memory.heap.stat.heap.size.total` (gauge)
- `process.memory.heap.stat.executable.size.total` (gauge)
- `process.memory.heap.stat.physical.size.total` (gauge)
- `process.memory.heap.stat.available.size.total` (gauge)
- `process.memory.heap.stat.used.heap.size` (gauge)
- `process.memory.heap.stat.heap.size.limit` (gauge)
- `process.memory.heap.stat.mallocated.memory` (gauge)
- `process.memory.heap.stat.peak.mallocated.memory` (gauge)
- `process.memory.heap.stat.zap.garbage` (gauge)
- `process.uptime` (gauge)
- `process.internal.active.handles` (gauge)
- `process.internal.active.requests` (gauge)
- `process.versions.node` (info)
- `process.gc.time` (gauge)
- `process.gc.total.time` (gauge)
- `process.gc.executed.total` (gauge)

**OS metrics**
- `os.memory.free` (gauge)
- `os.memory.total` (gauge)
- `os.uptime` (gauge)
- `os.type` (info)
- `os.release` (info)
- `os.hostname` (info)
- `os.arch` (info)
- `os.platform` (info)
- `os.user.uid` (info)
- `os.user.gid` (info)
- `os.user.username` (info)
- `os.user.homedir` (info)
- `os.network.address` (info)
- `os.network.mac` (info)
- `os.datetime.unix` (gauge)
- `os.datetime.iso` (info)
- `os.datetime.utc` (info)
- `os.datetime.tz.offset` (gauge)
- `os.cpu.load.1` (gauge)
- `os.cpu.load.5` (gauge)
- `os.cpu.load.15` (gauge)
- `os.cpu.utilization` (gauge)
- `os.cpu.user` (gauge)
- `os.cpu.system` (gauge)
- `os.cpu.total` (gauge)
- `os.cpu.info.model` (info)
- `os.cpu.info.speed` (gauge)
- `os.cpu.info.times.user` (gauge)
- `os.cpu.info.times.sys` (gauge)

**Moleculer metrics**
- `moleculer.node.type` (info)
- `moleculer.node.versions.moleculer` (info)
- `moleculer.node.versions.protocol` (info)
- `moleculer.broker.namespace` (info)
- `moleculer.broker.started` (gauge)
- `moleculer.broker.local.services.total` (gauge)
- `moleculer.broker.middlewares.total` (gauge)
- `moleculer.registry.nodes.total` (gauge)
- `moleculer.registry.nodes.online.total` (gauge)
- `moleculer.registry.services.total` (gauge)
- `moleculer.registry.service.endpoints.total` (gauge)
- `moleculer.registry.actions.total` (gauge)
- `moleculer.registry.action.endpoints.total` (gauge)
- `moleculer.registry.events.total` (gauge)
- `moleculer.registry.event.endpoints.total` (gauge)
- `moleculer.request.bulkhead.inflight` (gauge)
- `moleculer.request.bulkhead.queue.size` (gauge)
- `moleculer.event.bulkhead.inflight` (gauge)
- `moleculer.event.bulkhead.queue.size` (gauge)
- `moleculer.request.timeout.total` (counter)
- `moleculer.request.retry.attempts.total` (counter)
- `moleculer.request.fallback.total` (counter)
- `moleculer.request.total` (counter)
- `moleculer.request.active` (gauge)
- `moleculer.request.error.total` (counter)
- `moleculer.request.time` (histogram)
- `moleculer.request.levels` (counter)
- `moleculer.event.emit.total` (counter)
- `moleculer.event.broadcast.total` (counter)
- `moleculer.event.broadcast-local.total` (counter)
- `moleculer.event.received.total` (counter)
- `moleculer.transit.publish.total` (counter)
- `moleculer.transit.receive.total` (counter)
- `moleculer.transit.requests.active` (gauge)
- `moleculer.transit.streams.send.active` (gauge)
- `moleculer.transporter.packets.sent.total` (counter)
- `moleculer.transporter.packets.sent.bytes` (counter)
- `moleculer.transporter.packets.received.total` (counter)
- `moleculer.transporter.packets.received.bytes` (counter)

### Built-in reporters

All reporters have the following options:
```js
{
    includes: null,
    excludes: null,

    metricNamePrefix: null,
    metricNameSuffix: null,

    metricNameFormatter: null,
    labelNameFormatter: null
}
```

#### Console reporter
This is a debugging reporter which prints metrics to the console periodically.

```js
const broker = new ServiceBroker({
    metrics: {
        enabled: true,
        reporter: [
            {
                type: "Console",
                options: {
                    interval: 5 * 1000,
                    logger: null,
                    colors: true,
                    onlyChanges: true
                }
            }
        ]
    }
});
```

#### CSV reporter
CSV reporter saves changed to CSV file.

```js
const broker = new ServiceBroker({
    metrics: {
        enabled: true,
        reporter: [
            {
                type: "CSV",
                options: {
                    folder: "./reports/metrics",
                    delimiter: ",",
                    rowDelimiter: "\n",

                    mode: MODE_METRIC, // MODE_METRIC, MODE_LABEL

                    types: null,

                    interval: 5 * 1000,

                    filenameFormatter: null,
                    rowFormatter: null,
                }
            }
        ]
    }
});
```

#### Datadog reporter
Datadog reporter sends metrics to the [Datadog server](https://www.datadoghq.com/).

```js
const broker = new ServiceBroker({
    metrics: {
        enabled: true,
        reporter: [
            {
                type: "Datadog",
                options: {
                    host: "my-host",
                    apiVersion: "v1",
                    path: "/series",
                    apiKey: process.env.DATADOG_API_KEY,
                    defaultLabels: (registry) => ({
                        namespace: registry.broker.namespace,
                        nodeID: registry.broker.nodeID
                    }),
                    interval: 10 * 1000
                }
            }
        ]
    }
});
```

#### Event reporter
Event reporter sends Moleculer events with metric values.

```js
const broker = new ServiceBroker({
    metrics: {
        enabled: true,
        reporter: [
            {
                type: "Event",
                options: {
                    eventName: "$metrics.snapshot",

                    broadcast: false,
                    groups: null,

                    onlyChanges: false,

                    interval: 5 * 1000,
                }
            }
        ]
    }
});
```

#### Prometheus reporter
Prometheus reporter publishes metrics in Prometheus format. The [Prometheus](https://prometheus.io/) server can collect them. Default port is `3030`.

```js
const broker = new ServiceBroker({
    metrics: {
        enabled: true,
        reporter: [
            {
                type: "Prometheus",
                options: {
                    port: 3030,
                    path: "/metrics",
                    defaultLabels: registry => ({
                        namespace: registry.broker.namespace,
                        nodeID: registry.broker.nodeID
                    })
                }
            }
        ]
    }
});
```

#### StatsD reporter
The StatsD reporter sends metric values to [StatsD](https://github.com/statsd/statsd) server via UDP.

```js
const broker = new ServiceBroker({
    metrics: {
        enabled: true,
        reporter: [
            {
                type: "StatsD",
                options: {
                    protocol: "udp",
                    host: "localhost",
                    port: 8125,

                    maxPayloadSize: 1300,
                }
            }
        ]
    }
});
```

## New tracing feature
An enhanced tracing middleware has been implemented in version 0.14. It support several exporters, custom tracing spans and integration with instrumentation libraries (like `dd-trace`).

**Enable tracing**
```js
const broker = new ServiceBroker({
    tracing: true
});
```

**Tracing with console exporter**
```js
const broker = new ServiceBroker({
    tracing: {
        enabled: true,
        exporter: [
            {
                type: "Console",
                options: {
                    width: 80,
                    colors: true,
                }
            }
        ]        
    }
});
```

**Tracing with Zipkin exporter**
```js
const broker = new ServiceBroker({
    tracing: {
        enabled: true,
        exporter: [
            {
                type: "Zipkin",
                options: {
                    baseURL: "http://zipkin-server:9411",
                }
            }
        ]        
    }
});
```

### Add context values to span tags
In action defintion you can define which Context params or meta values want to add to the span tags.

**Example**
```js
// posts.service.js
module.exports = {
    name: "posts",
    actions: {
        get: {
            tracing: {
                // Add `ctx.params.id` and `ctx.meta.loggedIn.username` values
                // to tracing span tags.
                tags: {
                    params: ["id"],
                    meta: ["loggedIn.username"],
                    response: ["id", "title"] // add data to tags from the action response.
            },
            async handler(ctx) {
                // ...
            }
        }
    }
});
```

**Example with all properties of params without meta _(actually it is the default)_**
```js
// posts.service.js
module.exports = {
    name: "posts",
    actions: {
        get: {
            tracing: {
                // Add all params without meta
                tags: {
                    params: true,
                    meta: false,
            },
            async handler(ctx) {
                // ...
            }
        }
    }
});
```

**Example with custom function**
Please note, the `tags` function will be called two times in case of success execution. First with `ctx`, and second times with `ctx` & `response` as the response of action call.
```js
// posts.service.js
module.exports = {
    name: "posts",
    actions: {
        get: {
            tracing: {
                tags(ctx, response) {
                    return {
                        params: ctx.params,
                        meta: ctx.meta,
                        custom: {
                            a: 5
                        },
                        response
                    };
                }
            },
            async handler(ctx) {
                // ...
            }
        }
    }
});
```

**Example with all properties of params in event definition**
```js
// posts.service.js
module.exports = {
    name: "posts",
    events: {
        "user.created": {
            tracing: {
                // Add all params without meta
                tags: {
                    params: true,
                    meta: false,
            },
            async handler(ctx) {
                // ...
            }
        }
    }
});
```

### Built-in exporters

#### Console exporter
This is a debugging exporter which prints the full local trace to the console.

>Please note that it can't follow remote calls, only locals.

```js
const broker = new ServiceBroker({
    tracing: {
        enabled: true,
        exporter: [
            {
                type: "Console",
                options: {
                    logger: null,
                    colors: true,
                    width: 100,
                    gaugeWidth: 40
                }
            }
        ]
    }
});
```

#### Datadog exporter
Datadog exporter sends tracing data to Datadog server via `dd-trace`. It is able to merge tracing spans between instrumented Node.js modules and Moleculer modules.

>TODO screenshot

```js
const broker = new ServiceBroker({
    tracing: {
        enabled: true,
        exporter: [
            {
                type: "Datadog",
                options: {
                    agentUrl: process.env.DD_AGENT_URL || "http://localhost:8126",
                    env: process.env.DD_ENVIRONMENT || null,
                    samplingPriority: "AUTO_KEEP",
                    defaultTags: null,
                    tracerOptions: null,
                }
            }
        ]
    }
});
```

>To use this exporter, install the `dd-trace` module with `npm install dd-trace --save` command.

#### Event exporter
Event exporter sends Moleculer events (`$tracing.spans`) with tracing data.
```js
const broker = new ServiceBroker({
    tracing: {
        enabled: true,
        exporter: [
            {
                type: "Event",
                options: {
                    eventName: "$tracing.spans",

                    sendStartSpan: false,
                    sendFinishSpan: true,

                    broadcast: false,

                    groups: null,

                    /** @type {Number} Batch send time interval. */
                    interval: 5,

                    spanConverter: null,

                    /** @type {Object?} Default span tags */
                    defaultTags: null

                }
            }
        ]
    }
});
```

#### Event (legacy) exporter
This is another event exporter which sends legacy moleculer events (`metrics.trace.span.start` & `metrics.trace.span.finish`). _It is compatible with <= 0.13 Moleculer metrics trace events._
```js
const broker = new ServiceBroker({
    tracing: {
        enabled: true,
        exporter: [
            "EventLegacy"
        ]
    }
});
```

#### Jaeger exporter
Jaeger exporter sends tracing spans information to a [Jaeger](https://www.jaegertracing.io) server.

```js
const broker = new ServiceBroker({
    tracing: {
        enabled: true,
        exporter: [
            {
                type: "Jaeger",
                options: {
                    /** @type {String?} HTTP Reporter endpoint. If set, HTTP Reporter will be used. */
                    endpoint: null,                    
                    /** @type {String} UDP Sender host option. */
                    host: "127.0.0.1",
                    /** @type {Number?} UDP Sender port option. */
                    port: 6832,

                    /** @type {Object?} Sampler configuration. */
                    sampler: {
                        /** @type {String?} Sampler type */
                        type: "Const",

                        /** @type: {Object?} Sampler specific options. */
                        options: {}
                    },

                    /** @type {Object?} Additional options for `Jaeger.Tracer` */
                    tracerOptions: {},

                    /** @type {Object?} Default span tags */
                    defaultTags: null
                }
            }
        ]
    }
});
```

>To use this exporter, install the `jaeger-client` module with `npm install jaeger-client --save` command.


#### Zipkin exporter
Zipkin exporter sends tracing spans information to a [Zipkin](https://zipkin.apache.org/) server.

```js
const broker = new ServiceBroker({
    tracing: {
        enabled: true,
        exporter: [
            {
                type: "Zipkin",
                options: {
                    /** @type {String} Base URL for Zipkin server. */
                    baseURL: process.env.ZIPKIN_URL || "http://localhost:9411",

                    /** @type {Number} Batch send time interval. */
                    interval: 5,

                    /** @type {Object} Additional payload options. */
                    payloadOptions: {

                        /** @type {Boolean} Set `debug` property in v2 payload. */
                        debug: false,

                        /** @type {Boolean} Set `shared` property in v2 payload. */
                        shared: false
                    },

                    /** @type {Object?} Default span tags */
                    defaultTags: null
                }
            }
        ]
    }
});
```


### Custom tracing spans
```js
// posts.service.js
module.exports = {
    name: "posts",
    actions: {
        async find(ctx) {
            const span1 = ctx.startSpan("get data from DB", {
                tags: {
                    ...ctx.params
                }
            }); 
            const data = await this.getDataFromDB(ctx.params);
            ctx.finishSpan(span1);

            const span2 = ctx.startSpan("populating");
            const res = await this.populate(data);
            ctx.finishSpan(span2);

            return res;
        }
    }
};
```
## Caller action
There is a new `caller` property in Context. It contains the service name of the caller when you use `ctx.call` in action or event handlers.

```js
broker2.createService({
    name: "greeter",
    actions: {
        hello(ctx) {
            this.logger.info(`This action is called from '${ctx.caller}' on '${ctx.nodeID}'`);
        }
    }
});
```

## Bulkhead supports events
Bulkhead feature supports service event handlers, as well.

```js
// my.service.js
module.exports = {
    name: "my-service",
    events: {
        "user.created": {
            bulkhead: {
                enabled: true,
                concurrency: 1
            },
            async handler(ctx) {
                // Do something.
            }
        }
    }
}
```
_Use `async/await` or return `Promise` in event handlers._


## NodeID conflict handling
Having remote nodes with same `nodeID` in the same `namespace` can cause communication problems. In v0.14 ServiceBroker checks the nodeIDs of remote nodes. If some node has the same nodeID, the broker will throw a fatal error and stop the process.

## Sharding built-in strategy
There is a new built-in shard invocation strategy. It uses a key value from context params or meta to route the request a specific node. It means the same key value will be route to the same node.

**Example with shard key as `name` param in context**
```js
const broker = new ServiceBroker({
    registry: {
        strategy: "Shard",
        strategyOptions: {
            shardKey: "name"
        }
    }
});
```

**Example with shard key as `user.id` meta value in context**
```js
const broker = new ServiceBroker({
    registry: {
        strategy: "Shard",
        strategyOptions: {
            shardKey: "#user.id"
        }
    }
});
```

**All available options of Shard strategy**
```js
const broker = new ServiceBroker({
    registry: {
        strategy: "Shard",
        strategyOptions: {
            shardKey: "#user.id",
            vnodes: 10,
            ringSize: 1000,
            cacheSize: 1000
        }
    }
});
```

## Extending internal services
Now the internal services can be extended. You can define mixin schema for every internal service under `internalServices` broker option.

```js
// moleculer.config.js
module.exports = {
    nodeID: "node-1",
    logger: true,
    internalServices: {
        $node: {
            actions: {
                // Call as `$node.hello`
                hello(ctx) {
                    return `Hello Moleculer!`;
                }
            }
        }
    }
};
```

## Action hook inside action definition
Sometimes it's better to define action hooks inside action definition instead of service `hooks` property.

```js
broker.createService({
    name: "greeter",
    hooks: {
        before: {
            "*"(ctx) {
                broker.logger.info(chalk.cyan("Before all hook"));
            },
            hello(ctx) {
                broker.logger.info(chalk.magenta("  Before hook"));
            }
        },
        after: {
            "*"(ctx, res) {
                broker.logger.info(chalk.cyan("After all hook"));
                return res;
            },
            hello(ctx, res) {
                broker.logger.info(chalk.magenta("  After hook"));
                return res;
            }
        },
    },

    actions: {
        hello: {
            hooks: {
                before(ctx) {
                    broker.logger.info(chalk.yellow.bold("    Before action hook"));
                },
                after(ctx, res) {
                    broker.logger.info(chalk.yellow.bold("    After action hook"));
                    return res;
                }
            },

            handler(ctx) {
                broker.logger.info(chalk.green.bold("      Action handler"));
                return `Hello ${ctx.params.name}`;
            }
        }
    }
});    
```

**Output**
```
INFO  - Before all hook
INFO  -   Before hook
INFO  -     Before action hook
INFO  -       Action handler
INFO  -     After action hook
INFO  -   After hook
INFO  - After all hook
```

## Metadata in broker options
There is a new `metadata` property in broker options to store custom values. You can use the `metadata` property in your custom middlewares or strategies.
```js
const broker2 = new ServiceBroker({
    nodeID: "broker-2",
    transporter: "NATS",
    metadata: {
        region: "eu-west1"
    }
});
```
_This information is available in response of `$node.list` action._


## Enhanced hot-reload feature
In v0.14 the built-in hot-reload feature was entirely rewritten. Now, it can detect dependency-graph between service files and other loaded (with `require`) files. This means that the hot-reload mechanism now watches the service files and their dependencies. Every time a file change is detected the hot-reload mechanism will track the affected services and will restart them.

## New middleware hooks
There are some new middleware hooks.

### `registerLocalService`
It's called before registering a local service instance.

**Signature**
```js
// my-middleware.js
module.exports = {
    registerLocalService(next) {
        return (svc) => {
            return next(svc);
        };
    }
}
```

### `serviceCreating`
It's called before a local service instance creating. At this point the service mixins are resolved, so the service schema is merged completely.

**Signature**
```js
// my-middleware.js
module.exports = {
    serviceCreating(service, schema) {
        // Modify schema
        schema.myProp = "John";
    }
}
```

### `transitPublish`
It's called before communication packet publishing.

**Signature**
```js
// my-middleware.js
module.exports = {
    transitPublish(next) {
        return (packet) => {
            return next(packet);
        };
    },
}
```

### `transitMessageHandler`
It's called before transit receives & parses an incoming message

**Signature**
```js
// my-middleware.js
module.exports = {
    transitMessageHandler(next) {
        return (cmd, packet) => {
            return next(cmd, packet);
        };
    }
}
```

### `transporterSend`
It's called before transporter send a communication packet (after serialization). Use it to encrypt or compress the packet buffer.

**Signature**
```js
// my-middleware.js
module.exports = {
    transporterSend(next) {
        return (topic, data, meta) => {
            // Do something with data
            return next(topic, data, meta);
        };
    }
}
```

### `transporterReceive`
It's called after transporter received a communication packet (before serialization). Use it to decrypt or decompress the packet buffer.

**Signature**
```js
// my-middleware.js
module.exports = {
    transporterReceive(next) {
        return (cmd, data, s) => {
            // Do something with data
            return next(cmd, data, s);
        };
    }
}
```

### `newLogEntry`
It's called when a new logger entry created by the default console logger. It's not called when using external custom logger like (Pino, Winston, Bunyan...etc).

**Signature**
```js
// my-middleware.js
module.exports = {
    newLogEntry(type, args, bindings) {
        // e.g. collect & send log entries to a central server.
    },
}
```

_Please note: it's not called during broker is starting because logger is created early before middleware initialization._

## New built-in middlewares

### Encryption
AES encryption middleware protects all inter-services communications that use the transporter module.
This middleware uses built-in Node [`crypto`](https://nodejs.org/api/crypto.html) library.

```js
const { Middlewares } = require("moleculer");

// Create broker
const broker = new ServiceBroker({
    middlewares: [
        Middlewares.Transmit.Encryption("secret-password", "aes-256-cbc", initVector) // "aes-256-cbc" is the default
    ]
});
```
### Compression
Compression middleware reduces the size of messages that go through the transporter module.
This middleware uses built-in Node [`zlib`](https://nodejs.org/api/zlib.html) library.
```js
const { Middlewares } = require("moleculer");

// Create broker
const broker = new ServiceBroker({
    middlewares: [
        Middlewares.Transmit.Compression("deflate") // or "deflateRaw" or "gzip"
    ]
});
```

### Transit Logger
Transit logger middleware allows to easily track the messages that are exchanged between services.

```js
const { Middlewares } = require("moleculer");

// Create broker
const broker = new ServiceBroker({
    middlewares: [
        Middlewares.Debugging.TransitLogger({
            logPacketData: false,
            folder: null,
            colors: {
                send: "magenta",
                receive: "blue"
            },
            packetFilter: ["HEARTBEAT"]
        })
    ]
});
```

### Action Logger
Action Logger middleware tracks "how" service actions were executed.

```js
const { Middlewares } = require("moleculer");

// Create broker
const broker = new ServiceBroker({
    middlewares: [
        Middlewares.Debugging.ActionLogger({
            logParams: true,
            logResponse: true,
            folder: null,
            colors: {
                send: "magenta",
                receive: "blue"
            },
            whitelist: ["**"]
        })
    ]
});
```

## Load middlewares by names
To load built-in middlewares, use its names in `middleware` broker option.

```js
const { Middlewares } = require("moleculer");

// Extend with custom middlewares
Middlewares.MyCustom = {
    created(broker) {
        broker.logger.info("My custom middleware is created!");
    }
};


const broker1 = new ServiceBroker({
    logger: true,
    middlewares: [
        // Load by middleware name
        "MyCustom"
    ]
});    
```

## Global error handler
There is a new global error handler in ServiceBroker. It can be defined in broker options as `errorHandler(err, info)`.
It catches unhandled errors in action & event handlers.

**Catch, handle & log the error**
```js
const broker = new ServiceBroker({
    errorHandler(err, info) {

        this.logger.warn("Error handled:", err);
    }
});
```

**Catch & throw further the error**
```js
const broker = new ServiceBroker({
    errorHandler(err, info) {
        this.logger.warn("Error handled:", err);
        throw err; // Throw further
    }
});
```
>The `info` object contains the broker and the service instances, the current context and the action or the event definition.

## Async storage for current context
ServiceBroker has a continuous local storage in order to store the current context. It means you don't need to always pass the `ctx` from actions to service methods. You can get it with `this.currentContext`.

```js
// greeter.service.js
module.exports = {
    name: "greeter",
    actions: {
        hello(ctx) {
            return this.Promise.resolve()
                .then(() => this.doSomething());

        }
    },
    methods: {
        doSomething() {
            const ctx = this.currentContext;
            return ctx.call("other.service");
        }
    }
});
```

## Timeout setting in action definitions
Timeout can be set in action definition, as well. It overwrites the global broker `requestTimeout` option, but not the `timeout` in calling options.

```js
// moleculer.config.js
module.exports = {
    nodeID: "node-1",
    requestTimeout: 3000
};

// greeter.service.js
module.exports = {
    name: "greeter",
    actions: {
        normal: {
            handler(ctx) {
                return "Normal";
            }
        },

        slow: {
            timeout: 5000, // 5 secs
            handler(ctx) {
                return "Slow";
            }
        }
    },
```

```js
// It uses the global 3000 timeout
await broker.call("greeter.normal");

// It uses the 5000 timeout from action definition
await broker.call("greeter.slow");

// It uses 1000 timeout from calling option
await broker.call("greeter.slow", null, { timeout: 1000 });
```

## `Buffer` supporting improved in serializers
In earlier version, if request, response or event data was a `Buffer`, the schema-based serializers convert it to JSON string which was not very efficient. In this version all schema-based serializers (ProtoBuf, Avro, Thrift) can detect the type of data & convert it based on the best option and send always as binary data.


# Other notable changes
- Kafka transporter upgrade to support kafka-node@4.
- rename `ctx.metrics` to `ctx.tracing`.
- `broker.hotReloadService` method has been removed.
- new `hasEventListener` & `getEventListeners` broker method.
- new `uidGenerator` broker options to overwrite the default UUID generator code.
- new `ctx.locals` property to store local variables in hooks or actions.

--------------------------------------------------
<a name="Unreleased"></a>
# [Unreleased](https://github.com/moleculerjs/moleculer/compare/v0.13.10...master)

--------------------------------------------------
<a name="0.13.10"></a>
# [0.13.10](https://github.com/moleculerjs/moleculer/compare/v0.13.9...v0.13.10) (2019-08-26)

# New

## Customizable serializer for Redis cacher by [@shawnmcknight](https://github.com/shawnmcknight) [#589](https://github.com/moleculerjs/moleculer/pull/589)
The default serializer is the JSON Serializer but you can change it in Redis cacher options. 

_You can use any built-in Moleculer serializer or use a custom one._

**Example to set the built-in MessagePack serializer:**
```js
const broker = new ServiceBroker({
    nodeID: "node-123",
    cacher: {
        type: "Redis",
        options: {
            ttl: 30,

            // Using MessagePack serializer to store data.
            serializer: "MsgPack",

            redis: {
                host: "my-redis"
            }
        }
    }
});
```

## Cluster mode of Redis cacher by [Gadi-Manor](https://github.com/Gadi-Manor) [#539](https://github.com/moleculerjs/moleculer/pull/539)
Redis cacher supports cluster mode.

**Example**
```js
const broker = new ServiceBroker({
    cacher: {
        type: "Redis",
        options: {
            ttl: 30, 

            cluster: {
                nodes: [
                    { port: 6380, host: "127.0.0.1" },
                    { port: 6381, host: "127.0.0.1" },
                    { port: 6382, host: "127.0.0.1" }
                ],
                options: { /* More information: https://github.com/luin/ioredis#cluster */ }
            }	
        }
    }
});
```

# Changes
- update dependencies.
- update Typescript definitions by [@shawnmcknight](https://github.com/shawnmcknight).
- fix Protocol Buffer definitions by [@fugufish](https://github.com/fugufish).

--------------------------------------------------
<a name="0.13.9"></a>
# [0.13.9](https://github.com/moleculerjs/moleculer/compare/v0.13.8...v0.13.9) (2019-04-18)

# New

## Cache locking feature by [@tiaod](https://github.com/tiaod) [#490](https://github.com/moleculerjs/moleculer/pull/490)

**Example to enable cacher locking:**
```js
cacher: {
  ttl: 60,
  lock: true, // Set to true to enable cache locks. Default is disabled.
}

//  Or
cacher: {
  ttl: 60,
  lock: {
    ttl: 15, //the maximum amount of time you want the resource locked in seconds
    staleTime: 10, // If the ttl is less than this number, means that the resources are staled
  }
}

// Disable the lock
cacher: {
  ttl: 60,
  lock: {
    enable: false, // Set to false to disable.
    ttl: 15, //the maximum amount of time you want the resource locked in seconds
    staleTime: 10, // If the ttl is less than this number, means that the resources are staled
  }
}
```

**Example for Redis cacher with `redlock` library:**

```js
const broker = new ServiceBroker({
  cacher: {
    type: "Redis",
    options: {
      // Prefix for keys
      prefix: "MOL",
      // set Time-to-live to 30sec.
      ttl: 30,
      // Turns Redis client monitoring on.
      monitor: false,
      // Redis settings
      redis: {
        host: "redis-server",
        port: 6379,
        password: "1234",
        db: 0
      },
      lock: {
        ttl: 15, //the maximum amount of time you want the resource locked in seconds
        staleTime: 10, // If the ttl is less than this number, means that the resources are staled
      },
      // Redlock settings
      redlock: {
        // Redis clients. Support node-redis or ioredis. By default will use the local client.
        clients: [client1, client2, client3],
        // the expected clock drift; for more details
        // see http://redis.io/topics/distlock
        driftFactor: 0.01, // time in ms

        // the max number of times Redlock will attempt
        // to lock a resource before erroring
        retryCount: 10,

        // the time in ms between attempts
        retryDelay: 200, // time in ms

        // the max time in ms randomly added to retries
        // to improve performance under high contention
        // see https://www.awsarchitectureblog.com/2015/03/backoff.html
        retryJitter: 200 // time in ms
      }
    }
  }
});
```

# Changes
- fix event wildcard handling in case of NATS transporter and disabled balancer [#517](https://github.com/moleculerjs/moleculer/pull/517)
- update typescript d.ts file. [#501](https://github.com/moleculerjs/moleculer/pull/501) [#521](https://github.com/moleculerjs/moleculer/pull/521)
- fix context calling options cloning.
- service modification support for ES6 classes [#514](https://github.com/moleculerjs/moleculer/pull/514)
- fix `null`, `0` & `false` return value issue in case of ProtoBuf serializer [#511](https://github.com/moleculerjs/moleculer/pull/511)
- `destroyService(name: string | ServiceSearchObj);`
- `getLocalService(name: string | ServiceSearchObj): Service;`


--------------------------------------------------
<a name="0.13.8"></a>
# [0.13.8](https://github.com/moleculerjs/moleculer/compare/v0.13.7...v0.13.8) (2019-03-21)

# Changes
- fix missing field in ProtoBuf & Thrift serializers [#496](https://github.com/moleculerjs/moleculer/pull/496)

--------------------------------------------------
<a name="0.13.7"></a>
# [0.13.7](https://github.com/moleculerjs/moleculer/compare/v0.13.6...v0.13.7) (2019-02-21)

# Changes
- fix ioredis dependency in typescript definition file [#476](https://github.com/moleculerjs/moleculer/pull/476)

--------------------------------------------------
<a name="0.13.6"></a>
# [0.13.6](https://github.com/moleculerjs/moleculer/compare/v0.13.5...v0.13.6) (2019-02-15)

# New

## Secure service settings
To protect your tokens & API keys, define a `$secureSettings: []` property in service settings and set the protected property keys.
The protected settings won't be published to other nodes and it won't appear in Service Registry. They are only available under `this.settings` inside the service functions.

**Example**
```js
// mail.service.js
module.exports = {
    name: "mailer",
    settings: {
        $secureSettings: ["transport.auth.user", "transport.auth.pass"],

        from: "sender@moleculer.services",
        transport: {
            service: 'gmail',
            auth: {
                user: 'gmail.user@gmail.com',
                pass: 'yourpass'
            }
        }
    }        
    // ...
};
```

# Changes
- fix `cacher.clean` issue [#435](https://github.com/moleculerjs/moleculer/pull/435)
- add `disableVersionCheck` option for broker transit options. It can disable protocol version checking logic in Transit. Default: `false`
- improve Typescript definition file. [#442](https://github.com/moleculerjs/moleculer/pull/442) [#454](https://github.com/moleculerjs/moleculer/pull/454)
- waitForServices accept versioned service names (e.g.: `v2.posts`).
- update dependencies (plus using semver ranges in dependencies)

--------------------------------------------------
<a name="0.13.5"></a>
# [0.13.5](https://github.com/moleculerjs/moleculer/compare/v0.13.4...v0.13.5) (2018-12-09)

# New

## Conditional caching
It's a common issue that you enable caching for an action but sometimes you don't want to get data from cache. To solve it you may set `ctx.meta.$cache = false` before calling and the cacher won't send cached responses.

**Example**
```js
// Turn off caching for this request
broker.call("greeter.hello", { name: "Moleculer" }, { meta: { $cache: false }}))
```

Other solution is that you use a custom function which enables or disables caching for every request. The function gets the `ctx` Context instance so it has access any params or meta data.

**Example**
```js
// greeter.service.js
module.exports = {
    name: "greeter",
    actions: {
        hello: {
            cache: {
                enabled: ctx => ctx.params.noCache !== true,
                keys: ["name"]
            },
            handler(ctx) {
                this.logger.debug(chalk.yellow("Execute handler"));
                return `Hello ${ctx.params.name}`;
            }
        }
    }
};

// Use custom `enabled` function to turn off caching for this request
broker.call("greeter.hello", { name: "Moleculer", noCache: true }))
```

## LRU memory cacher
An LRU memory cacher has been added to the core modules. It uses the familiar [lru-cache](https://github.com/isaacs/node-lru-cache) library.

**Example**
```js
let broker = new ServiceBroker({ cacher: "MemoryLRU" });
```

```js
let broker = new ServiceBroker({
    logLevel: "debug",
    cacher: {
        type: "MemoryLRU",
        options: {
            // Maximum items
            max: 100,
            // Time-to-Live
            ttl: 3
        }
    }
});
```


# Changes
- throw the error further in `loadService` method so that Runner prints the correct error stack.
- new `packetLogFilter` transit option to filter packets in debug logs (e.g. HEARTBEAT packets) by [@faeron](https://github.com/faeron)
- the Redis cacher `clean` & `del` methods handle array parameter by [@dkuida](https://github.com/dkuida)
- the Memory cacher `clean` & `del` methods handle array parameter by [@icebob](https://github.com/icebob)
- fix to handle `version: 0` as a valid version number by [@ngraef](https://github.com/ngraef)

--------------------------------------------------
<a name="0.13.4"></a>
# [0.13.4](https://github.com/moleculerjs/moleculer/compare/v0.13.3...v0.13.4) (2018-11-04)

# Changes
- catch errors in `getCpuUsage()` method.
- support multiple urls in AMQP transporter by [@urossmolnik](https://github.com/urossmolnik)
- fix AMQP connection recovery by [@urossmolnik](https://github.com/urossmolnik)
- add `transit.disableReconnect` option to disable reconnecting logic at broker starting by [@Gadi-Manor](https://github.com/Gadi-Manor)
- catch `os.userInfo` errors in health action by [@katsanva](https://github.com/katsanva)
- allow specifying 0 as `retries` [#404](https://github.com/moleculerjs/moleculer/issues/404) by [@urossmolnik](https://github.com/urossmolnik)
- fix `GraceFulTimeoutError` bug [#400](https://github.com/moleculerjs/moleculer/issues/400)
- fix event return handling to avoid localEvent error handling issue in middleware [#403](https://github.com/moleculerjs/moleculer/issues/403)
- update [fastest-validator](https://github.com/icebob/fastest-validator) to the 0.6.12 version
- update all dependencies

--------------------------------------------------
<a name="0.13.3"></a>
# [0.13.3](https://github.com/moleculerjs/moleculer/compare/v0.13.2...v0.13.3) (2018-09-27)

# Changes
- update dependencies
- fix MQTTS connection string protocol from `mqtt+ssl://` to `mqtts://` by [@AndreMaz](https://github.com/AndreMaz)
- Moleculer Runner supports typescript configuration file `moleculer.config.ts`
- fix to call service start after hot-reloading.
- fix Bluebird warning in service loading [#381](https://github.com/moleculerjs/moleculer/issues/381) by [@faeron](https://github.com/faeron)
- fix `waitForServices` definition in `index.d.ts` [#358](https://github.com/moleculerjs/moleculer/issues/358)
- fix `cpuUsage` issue [#379](https://github.com/moleculerjs/moleculer/issues/379) by [@faeron](https://github.com/faeron)


--------------------------------------------------
<a name="0.13.2"></a>
# [0.13.2](https://github.com/moleculerjs/moleculer/compare/v0.13.1...v0.13.2) (2018-08-16)

# Changes
- update dependencies
- add Notepack (other MsgPack) serializer
- `skipProcessEventRegistration` broker option to disable `process.on` shutdown event handlers which stop broker.
- make unique service dependencies
- add `socketOptions` to AMQP transporter options. [#330](https://github.com/moleculerjs/moleculer/pull/330)
- fix unhandled promise in AMQP transporter `connect` method.
- add `autoDeleteQueues` option to AMQP transporter. [#341](https://github.com/moleculerjs/moleculer/pull/341)
- ES6 support has improved. [#348](https://github.com/moleculerjs/moleculer/pull/348)
- add `qos` transporter option to MQTT transporter. Default: `0`
- add `topicSeparator` transporter option to MQTT transporter. Default: `.`
- fix MQTT transporter disconnect logic (waiting for in-flight messages) 
- add support for non-defined defaultOptions variables [#350](https://github.com/moleculerjs/moleculer/pull/350)
- update ioredis to v4

--------------------------------------------------
<a name="0.13.1"></a>
# [0.13.1](https://github.com/moleculerjs/moleculer/compare/v0.13.0...v0.13.1) (2018-07-13)

# Changes
- improve `index.d.ts`
- support Duplex streams [#325](https://github.com/moleculerjs/moleculer/issues/325)
- update dependencies

--------------------------------------------------
<a name="0.13.0"></a>
# [0.13.0](https://github.com/moleculerjs/moleculer/compare/v0.12.8...v0.13.0) (2018-07-08)

**Migration guide from v0.12.x to v0.13.x is [here](docs/MIGRATION_GUIDE_0.13.md).**

# Breaking changes

## Streaming support
Built-in streaming support has just been implemented. Node.js streams can be transferred as request `params` or as response. You can use it to transfer uploaded file from a gateway or encode/decode or compress/decompress streams.

>**Why is it a breaking change?**
>
> Because the protocol has been extended with a new field and it caused a breaking change in schema-based serializators (ProtoBuf, Avro). Therefore, if you use ProtoBuf or Avro, you won't able to communicate with the previous (<=0.12) brokers. Using JSON or MsgPack serializer, there is nothing extra to do.

### Examples

**Send a file to a service as a stream**
```js
const stream = fs.createReadStream(fileName);

broker.call("storage.save", stream, { meta: { filename: "avatar-123.jpg" }});
```

Please note, the `params` should be a stream, you cannot add any more variables to the request. Use the `meta` property to transfer additional data.

**Receiving a stream in a service**
```js
module.exports = {
    name: "storage",
    actions: {
        save(ctx) {
            const s = fs.createWriteStream(`/tmp/${ctx.meta.filename}`);
            ctx.params.pipe(s);
        }
    }
};
```

**Return a stream as response in a service**
```js
module.exports = {
    name: "storage",
    actions: {
        get: {
            params: {
                filename: "string"
            },
            handler(ctx) {
                return fs.createReadStream(`/tmp/${ctx.params.filename}`);
            }
        }
    }
};
```

**Process received stream on the caller side**
```js
const filename = "avatar-123.jpg";
broker.call("storage.get", { filename })
    .then(stream => {
        const s = fs.createWriteStream(`./${filename}`);
        stream.pipe(s);
        s.on("close", () => broker.logger.info("File has been received"));
    })
```

**AES encode/decode example service**
```js
const crypto = require("crypto");
const password = "moleculer";

module.exports = {
    name: "aes",
    actions: {
        encrypt(ctx) {
            const encrypt = crypto.createCipher("aes-256-ctr", password);
            return ctx.params.pipe(encrypt);
        },

        decrypt(ctx) {
            const decrypt = crypto.createDecipher("aes-256-ctr", password);
            return ctx.params.pipe(decrypt);
        }
    }
};
```

## Better Service & Broker lifecycle handling
The ServiceBroker & Service lifecycle handler logic has already been improved. The reason for amendment was a problem occuring during loading more services locally; they could call each others' actions before `started` execution. It generally causes errors if database connecting process started in the `started` event handler.

This problem has been fixed with a probable side effect: causing errors (mostly in unit tests) if you call the local services without `broker.start()`.

**It works in the previous version**
```js
const { ServiceBroker } = require("moleculer");

const broker = new ServiceBroker();

broker.loadService("./math.service.js");

broker.call("math.add", { a: 5, b: 3 }).then(res => console.log);
// Prints: 8
```
From v0.13 it throws a `ServiceNotFoundError` exception, because the service is only loaded but not started yet.

**Correct logic**
```js
const { ServiceBroker } = require("moleculer");

const broker = new ServiceBroker();

broker.loadService("./math.service.js");

broker.start().then(() => {
    broker.call("math.add", { a: 5, b: 3 }).then(res => console.log);
    // Prints: 8
});
```

or with await

```js
broker.loadService("./math.service.js");

await broker.start();

const res = await broker.call("math.add", { a: 5, b: 3 });
console.log(res);
// Prints: 8
```

Similar issue has been fixed at broker shutdown. Previously when you stopped a broker, which while started to stop local services, it still acccepted incoming requests from remote nodes.

The shutdown logic has also been changed. When you call `broker.stop`, at first broker publishes an empty service list to remote nodes, so they route the requests to other instances.


## Default console logger
No longer need to set `logger: console` in broker options, because ServiceBroker uses `console` as default logger.

```js
const broker = new ServiceBroker();
// It will print log messages to the console
```

**Disable loggging (e.g. in tests)**
```js
const broker = new ServiceBroker({ logger: false });
```

## Changes in internal event sending logic
The `$` prefixed internal events will be transferred if they are called by `emit` or `broadcast`. If you don't want to transfer them, use the `broadcastLocal` method.

> From v0.13, the `$` prefixed events mean built-in core events instead of internal "only-local" events.

## Improved Circuit Breaker
Threshold-based circuit-breaker solution has been implemented. It uses a time window to check the failed request rate. Once the `threshold` value is reached, it trips the circuit breaker.

```js
const broker = new ServiceBroker({
    nodeID: "node-1",
    circuitBreaker: {
        enabled: true,
        threshold: 0.5,
        minRequestCount: 20,
        windowTime: 60, // in seconds
        halfOpenTime: 5 * 1000,
        check: err => err && err.code >= 500
    }
});
```

Instead of `failureOnTimeout` and `failureOnReject` properties, there is a new `check()` function property in the options. It is used by circuit breaker in order to detect which error is considered as a failed request.

You can override these global options in action definition, as well.

```js
module.export = {
    name: "users",
    actions: {
        create: {
            circuitBreaker: {
                // All CB options can be overwritten from broker options.
                threshold: 0.3,
                windowTime: 30
            },
            handler(ctx) {}
        }
    }
};
```

### CB metrics events removed
The metrics circuit breaker events have been removed due to internal event logic changes.
Use the `$circuit-breaker.*` events instead of `metrics.circuit-breaker.*` events.

## Improved Retry feature (with exponential backoff)
The old retry feature has been improved. Now it uses exponential backoff for retries. The old solution retries the request immediately in failures.
The retry options have also been changed in the broker options. Every option is under the `retryPolicy` property.

```js
const broker = new ServiceBroker({
    nodeID: "node-1",
    retryPolicy: {
        enabled: true,
        retries: 5,
        delay: 100,
        maxDelay: 2000,
        factor: 2,
        check: err => err && !!err.retryable
    }
});
```

**Overwrite the `retries` value in calling option**
The `retryCount` calling options has been renamed to `retries`.

```js
broker.call("posts.find", {}, { retries: 3 });
```

There is a new `check()` function property in the options. It is used by the Retry middleware in order to detect which error is a failed request and needs a retry. The default function checks the `retryable` property of errors.

These global options can be overridden in action definition, as well.

```js
module.export = {
    name: "users",
    actions: {
        find: {
            retryPolicy: {
                // All Retry policy options can be overwritten from broker options.
                retries: 3,
                delay: 500
            },
            handler(ctx) {}
        },
        create: {
            retryPolicy: {
                // Disable retries for this action
                enabled: false
            },
            handler(ctx) {}
        }
    }
};
```

## Changes in context tracker
There are also some changes in context tracker configuration. 

```js
const broker = new ServiceBroker({
    nodeID: "node-1",
    tracking: {
        enabled: true,
        shutdownTimeout: 5000
    }
});
```

**Disable tracking in calling option at calling**

```js
broker.call("posts.find", {}, { tracking: false });
```

_The shutdown timeout can be overwritten by `$shutdownTimeout` property in service settings._


## Removed internal statistics module
The internal statistics module (`$node.stats`) is removed. Yet you need it, download from [here](https://gist.github.com/icebob/99dc388ee29ae165f879233c2a9faf63), load as a service and call the `stat.snapshot` to receive the collected statistics.

## Renamed errors
Some errors have been renamed in order to follow name conventions.
- `ServiceNotAvailable` -> `ServiceNotAvailableError`
- `RequestRejected` -> `RequestRejectedError`
- `QueueIsFull` -> `QueueIsFullError`
- `InvalidPacketData` -> `InvalidPacketDataError`

## Context nodeID changes
The `ctx.callerNodeID` has been removed. The `ctx.nodeID` contains the target or caller nodeID. If you need the current nodeID, use `ctx.broker.nodeID`.

## Enhanced ping method
It returns `Promise` with results of ping responses. Moreover, the method is renamed to `broker.ping`.

**Ping a node with 1sec timeout**
```js
broker.ping("node-123", 1000).then(res => broker.logger.info(res));
```
Output:
```js
{ 
    nodeID: 'node-123', 
    elapsedTime: 16, 
    timeDiff: -3 
}
```

**Ping all known nodes**
```js
broker.ping().then(res => broker.logger.info(res));
```
Output:
```js
{ 
    "node-100": { 
        nodeID: 'node-100', 
        elapsedTime: 10, 
        timeDiff: -2 
    } ,
    "node-101": { 
        nodeID: 'node-101', 
        elapsedTime: 18, 
        timeDiff: 32 
    }, 
    "node-102": { 
        nodeID: 'node-102', 
        elapsedTime: 250, 
        timeDiff: 850 
    } 
}
```

## Amended cacher key generation logic
When you didn't define `keys` at caching, the cacher hashed the whole `ctx.params` and used as a key to store the content. This method was too slow and difficult to implement to other platforms. Therefore we have changed it. The new method is simpler, the key generator concatenates all property names & values from `ctx.params`.

However, the problem with this new logic is that the key can be very long. It can cause performance issues when you use too long keys to get or save cache entries. To avoid it, there is a `maxParamsLength` option to limit the key length. If it is longer than the configured limit, the cacher calculates a hash (SHA256) from the full key and add it to the end of key.

> The minimum of `maxParamsLength` is `44` (SHA 256 hash length in Base64).
> 
> To disable this feature, set it to `0` or `null`.

**Generate a full key from the whole params**
```js
cacher.getCacheKey("posts.find", { id: 2, title: "New post", content: "It can be very very looooooooooooooooooong content. So this key will also be too long" });
// Key: 'posts.find:id|2|title|New post|content|It can be very very looooooooooooooooooong content. So this key will also be too long'
```

**Generate a limited key with hash**
```js
const broker = new ServiceBroker({
    logger: console,
    cacher: {
        type: "Memory",
        options: {
            maxParamsLength: 60
        }
    }
});

cacher.getCacheKey("posts.find", { id: 2, title: "New post", content: "It can be very very looooooooooooooooooong content. So this key will also be too long" });
// Key: 'posts.find:id|2|title|New pL4ozUU24FATnNpDt1B0t1T5KP/T5/Y+JTIznKDspjT0='
```

Of course, you can use your custom solution with `keygen` cacher options like earlier.

## Cacher matcher changed
The cacher matcher code also changed in `cacher.clean` method. The previous (wrong) matcher couldn't handle dots (.) properly in patterns. E.g the `posts.*` pattern cleaned the `posts.find.something` keys, too. Now it has been fixed, but it means that you should use `posts.**` pattern because the `params` and `meta` values can contain dots.

## Changed Moleculer errors signature
The following Moleculer Error classes constructor arguments is changed to `constructor(data)`:
- `ServiceNotFoundError`
- `ServiceNotAvailableError`
- `RequestTimeoutError`
- `RequestSkippedError`
- `RequestRejectedError`
- `QueueIsFullError`
- `MaxCallLevelError`
- `ProtocolVersionMismatchError`
- `InvalidPacketDataError`

**Before**
```js
throw new ServiceNotFoundError("posts.find", "node-123");
```

**Now**
```js
throw new ServiceNotFoundError({ action: "posts.find",  nodeID: "node-123" });
```


# New

## New state-of-the-art middlewares
We have been improved the current middleware handler and enriched it with a lot of useful features. As a result, you can hack more internal flow logic with custom middlewares (e.g. event sending, service creating, service starting...etc)

The new one is an `Object` with hooks instead of a simple `Function`. However, the new solution is backward compatible, so you don't need to migrate your old middlewares. 

**A new middleware with all available hooks**
```js
const MyCustomMiddleware = {
    // Wrap local action handlers (legacy middleware handler)
    localAction(next, action) {

    },

    // Wrap remote action handlers
    remoteAction(next, action) {

    },

    // Wrap local event handlers
    localEvent(next, event) {

    }

    // Wrap broker.createService method
    createService(next) {

    }

    // Wrap broker.destroyService method
    destroyService(next) {

    }

    // Wrap broker.call method
    call(next) {

    }

    // Wrap broker.mcall method
    mcall(next) {

    }

    // Wrap broker.emit method
    emit(next) {

    },

    // Wrap broker.broadcast method
    broadcast(next) {

    },

    // Wrap broker.broadcastLocal method
    broadcastLocal(next) {

    },

    // After a new local service created (sync)
    serviceCreated(service) {

    },

    // Before a local service started (async)
    serviceStarting(service) {

    },

    // After a local service started (async)
    serviceStarted(service) {

    },

    // Before a local service stopping (async)
    serviceStopping(service) {

    },

    // After a local service stopped (async)
    serviceStopped(service) {

    },

    // After broker is created (async)
    created(broker) {

    },

    // Before broker starting (async)
    starting(broker) {

    },

    // After broker started (async)
    started(broker) {

    },

    // Before broker stopping (async)
    stopping(broker) {

    },

    // After broker stopped (async)
    stopped(broker) {

    }
}
```

**Use it in broker options**
```js
const broker = new ServiceBroker({
    middlewares: [
        MyCustomMiddleware
    ]
});
```

### Wrapping handlers
Some hooks are wrappers. It means you need to wrap the original handler and return a new Function.
Wrap hooks where the first parameter is `next`.

**Wrap local action handler**
```js
const MyDoSomethingMiddleware = {
    localAction(next, action) {
        if (action.myFunc) {
            // Wrap the handler

            return function(ctx) {
                doSomethingBeforeHandler(ctx);

                return handler(ctx)
                    .then(res => {
                        doSomethingAfterHandler(res);
                        // Return the original result
                        return res;
                    })
                    .catch(err => {
                        doSomethingAfterHandlerIfFailed(err);

                        // Throw further the error
                        throw err;
                    });
            }
        }

        // If the feature is disabled we don't wrap it, return the original handler
        // So it won't cut down the performance for actions where the feature is disabled.
        return handler;
    }
};
```

### Decorate broker (to extend functions)
Other hooks are to help you to decorate new features in ServiceBroker & services.

**Decorate broker with a new `allCall` method**
```js
const broker = new ServiceBroker({
    middlewares: [
        {
            // After broker is created
            created(broker) {
                // Call action on all available nodes
                broker.allCall = function(action, params, opts = {}) {
                    const nodeIDs = this.registry.getNodeList({ onlyAvailable: true })
                        .map(node => node.id);

                    // Make direct call to the given Node ID
                    return Promise.all(nodeIDs.map(nodeID => broker.call(action, params, Object.assign({ nodeID }, opts))));
                }
            }
        }
    ]
});

await broker.start();

// Call `$node.health` on every nodes & collect results
const res = await broker.allCall("$node.health");
```

**Decorate services with a new method**
```js
const broker = new ServiceBroker({
    middlewares: [
        {
            // After a new local service created
            serviceCreated(service) {
                // Call action on all available nodes
                service.customFunc = function() {
                    // Do something
                }.bind(service);
            }
        }
    ]
});
```

In service schema:

```js
module.export = {
    name: "users",
    actions: {
        find(ctx) {
            // Call the new custom function
            this.customFunc();
        }
    }
};
```

> The mixins can do similar things, so we prefer mixins to this decorating.

## Many internal features are exposed to internal middlewares
Due to the new advanced middlewares, we could bring out many integrated features to middlewares. They are available under `require("moleculer").Middlewares` property, but they load automatically.

**New internal middlewares:**
- Action hook handling
- Validator
- Bulkhead
- Cacher
- Context tracker
- Circuit Breaker
- Timeout
- Retry
- Fallback
- Error handling
- Metrics

> Turn off the automatic loading with `internalMiddlewares: false` broker option. In this case you have to add them to `middlewares: []` broker option.

> The `broker.use` method is deprecated. Use `middlewares: []` in the broker options instead.

## Action hooks
Define action hooks to wrap certain actions coming from mixins.
There are `before`, `after` and `error` hooks. Assign it to a specified action or all actions (`*`) in service.
The hook can be a `Function` or a `String`. The latter must be a local service method name.

**Before hooks**

```js
const DbService = require("moleculer-db");

module.exports = {
    name: "posts",
    mixins: [DbService]
    hooks: {
        before: {
            // Define a global hook for all actions
            // The hook will call the `resolveLoggedUser` method.
            "*": "resolveLoggedUser",

            // Define multiple hooks
            remove: [
                function isAuthenticated(ctx) {
                    if (!ctx.user)
                        throw new Error("Forbidden");
                },
                function isOwner(ctx) {
                    if (!this.checkOwner(ctx.params.id, ctx.user.id))
                        throw new Error("Only owner can remove it.");
                }
            ]
        }
    },

    methods: {
        async resolveLoggedUser(ctx) {
            if (ctx.meta.user)
                ctx.user = await ctx.call("users.get", { id: ctx.meta.user.id });
        }
    }
}
```

**After & Error hooks**

```js
const DbService = require("moleculer-db");

module.exports = {
    name: "users",
    mixins: [DbService]
    hooks: {
        after: {
            // Define a global hook for all actions to remove sensitive data
            "*": function(ctx, res) {
                // Remove password
                delete res.password;

                // Please note, must return result (either the original or a new)
                return res;
            },
            get: [
                // Add a new virtual field to the entity
                async function (ctx, res) {
                    res.friends = await ctx.call("friends.count", { query: { follower: res._id }});

                    return res;
                },
                // Populate the `referrer` field
                async function (ctx, res) {
                    if (res.referrer)
                        res.referrer = await ctx.call("users.get", { id: res._id });

                    return res;
                }
            ]
        },
        error: {
            // Global error handler
            "*": function(ctx, err) {
                this.logger.error(`Error occurred when '${ctx.action.name}' action was called`, err);

                // Throw further the error
                throw err;
            }
        }
    }
};
```

The recommended use case is to create mixins filling up the service with methods and in `hooks` set method names.

**Mixin**
```js
module.exports = {
    methods: {
        checkIsAuthenticated(ctx) {
            if (!ctx.meta.user)
                throw new Error("Unauthenticated");
        },
        checkUserRole(ctx) {
            if (ctx.action.role && ctx.meta.user.role != ctx.action.role)
                throw new Error("Forbidden");
        },
        checkOwner(ctx) {
            // Check the owner of entity
        }
    }
}
```

**Use mixin methods in hooks**
```js
const MyAuthMixin = require("./my.mixin");

module.exports = {
    name: "posts",
    mixins: [MyAuthMixin]
    hooks: {
        before: {
            "*": ["checkIsAuthenticated"],
            create: ["checkUserRole"],
            update: ["checkUserRole", "checkOwner"],
            remove: ["checkUserRole", "checkOwner"]
        }
    },

    actions: {
        find: {
            // No required role
            handler(ctx) {}
        },
        create: {
            role: "admin",
            handler(ctx) {}
        },
        update: {
            role: "user",
            handler(ctx) {}
        }
    }
};
```

## New Bulkhead fault-tolerance feature
Bulkhead feature is an internal middleware in Moleculer. Use it to control the concurrent request handling of actions.

**Global settings in the broker options.** _Applied to all registered local actions._
```js
const broker = new ServiceBroker({
    bulkhead: {
        enabled: true,
        concurrency: 3,
        maxQueueSize: 10,
    }
});
```

The `concurrency` value restricts the concurrent request executions. If `maxQueueSize` is bigger than 0, broker queues additional requests, if all slots are taken. If queue size reaches `maxQueueSize` limit or it is 0, broker will throw `QueueIsFull` error for every addition request.

These global options can be overriden in action definition, as well.

```js
module.export = {
    name: "users",
    actions: {
        find: {
            bulkhead: {
                enabled: false
            },
            handler(ctx) {}
        },
        create: {
            bulkhead: {
                // Increment the concurrency value
                // for this action
                concurrency: 10
            },
            handler(ctx) {}
        }
    }
};
```

## Fallback in action definition
Due to the exposed Fallback middleware, fallback response can be set in the action definition, too.

> Please note, this fallback response will only be used if the error occurs within action handler. If the request is called from a remote node and the request is timed out on the remote node, the fallback response is not be used. In this case, use the `fallbackResponse` in calling option.

**Fallback as function**
```js
module.exports = {
    name: "recommends",
    actions: {
        add: {
            fallback: (ctx, err) => "Some cached result",
            //fallback: "fakeResult",
            handler(ctx) {
                // Do something
            }
        }
    }
};
```

**Fallback as method name string**
```js
module.exports = {
    name: "recommends",
    actions: {
        add: {
            // Call the 'getCachedResult' method when error occurred
            fallback: "getCachedResult",
            handler(ctx) {
                // Do something
            }
        }
    },

    methods: {
        getCachedResult(ctx, err) {
            return "Some cached result";
        }
    }
};
```

## Action visibility
The action has a new `visibility` property to control the visibility & callability of service actions.

**Available values:**
- `published` or `null`: public action. It can be called locally, remotely and can be published via API Gateway
- `public`: public action, can be called locally & remotely but not published via API GW
- `protected`: can be called only locally (from local services)
- `private`: can be called only internally (via `this.actions.xy()` within service)

```js
module.exports = {
    name: "posts",
    actions: {
        // It's published by default
        find(ctx) {},
        clean: {
            // Callable only via `this.actions.clean`
            visibility: "private",
            handler(ctx) {}
        }
    },
    methods: {
        cleanEntities() {
            // Call the action directly
            return this.actions.clean();
        }
    }
}
```

> The default value is `null` (means `published`) due to backward compatibility.

## New Thrift serializer
There is a new built-in [Thrift](http://thrift.apache.org/) serializer.

```js
const broker = new ServiceBroker({
    serializer: "Thrift"
});
```
> To use this serializer install the `thrift` module with `npm install thrift --save` command.

## Enhanced log level configuration 
A new module-based log level configuration was added. The log level can be set for every Moleculer module. Use of wildcard is allowed.

```js
const broker = new ServiceBroker({
    logger: console,
    logLevel: {
        "MY.**": false,         // Disable logs
        "TRANS": "warn",        // Only 'warn ' and 'error' log entries
        "*.GREETER": "debug",   // All log entries
        "**": "debug",          // All other modules use this level
    }
});
```

**Please note, it works only with default console logger. In case of external loggers (Pino, Windows, Bunyan, ...etc), these log levels must be applied.**

> These settings are evaluated from top to bottom, so the `**` level must be the last property.

> Internal modules: `BROKER`, `TRANS`, `TX` as transporter, `CACHER`, `REGISTRY`.
>
> For services, the name comes from the service name. E.g. `POSTS`. 
> A version is used as a prefix. E.g. `V2.POSTS`

The old global log level settings works, as well.
```js
const broker = new ServiceBroker({
    logger: console,
    logLevel: "warn"
});
```

## New `short` log formatter
A new `short` log formatter was also added. It is similar to the default, but doesn't print the date and `nodeID`.

```js
const broker = new ServiceBroker({
    logFormatter: "short"
});
```

**Output**
```
[19:42:49.055Z] INFO  MATH: Service started.
```

## Load services also with glob patterns
Moleculer Runner loads services also from glob patterns. It is useful when loading all services except certain ones.

```bash
$ moleculer-runner services !services/others/**/*.service.js services/others/mandatory/main.service.js
```

**Explanations:**
- `services` - legacy mode. Load all services from the `services` folder with `**/*.service.js` file mask
- `!services/others/**/*.service.js` - skip all services in the `services/others` folder and sub-folders.
- `services/others/mandatory/main.service.js` - load the exact service

> Glob patterns work in the `SERVICES` enviroment variables, as well.

## MemoryCacher cloning
There is a new `clone` property in the `MemoryCacher` options. If it's `true`, the cacher clones the cached data before returning.
If received value is modified, enable this option. Note: it cuts down the performance.

**Enable cloning**
```js
const broker = new ServiceBroker({ 
    cacher: {
        type: "Memory",
        options: {
            clone: true
        }
    }
});
```

This feature uses the lodash `_.cloneDeep` method. To change cloning method set a `Function` to the `clone` option instead of a `Boolean`.

**Custom clone function with JSON parse & stringify:**
```js
const broker = new ServiceBroker({ 
    cacher: {
        type: "Memory",
        options: {
            clone: data => JSON.parse(JSON.stringify(data))
        }
    }
});
```

# Changes
- service instances has a new property named `fullName` containing service version & service name.
- the `Action` has a `rawName` property containing action name without service name.
- new `$node.options` internal action to get the current broker options.
- `Context.create` & `new Context` signature changed.
- removed Context metrics methods. All metrics feature moved to the `Metrics` middleware.
- `ctx.timeout` moved to `ctx.options.timeout`.
- removed `ctx.callerNodeID`.
- `ctx.endpoint` is a new property pointing to target `Endpoint`. For example you can check with `ctx.endpoint.local` flag whether the request is remote or local.
- lazily generated `ctx.id`, i.e. only generated at access. `ctx.generateID()` was removed.
- renamed service lifecycle methods in service instances (not in service schema!)
- extended `transit.stat.packets` with byte-based statistics.
- `utils.deprecate` method was created for deprecation.
- Transporter supports `mqtt+ssl://`, `rediss://` & `amqps://` protocols in connection URIs.
- fixed circular objects handling in service schema (e.g.: Joi validator problem)

# Deprecations

- `broker.use()` has been deprecated. Use `middlewares: [...]` in broker options instead.

--------------------------------------------------
<a name="0.12.8"></a>
# [0.12.8](https://github.com/moleculerjs/moleculer/compare/v0.12.6...v0.12.8) (2018-06-14)

# Changes
- fix action disabling with mixins [#298](https://github.com/moleculerjs/moleculer/issues/298)
- Fix metrics options and add findNextActionEndpoint to index.d.ts
- update dependencies
- set `maxReconnectAttempts` to `-1` in NATS client to try reconnecting continuously

--------------------------------------------------
<a name="0.12.6"></a>
# [0.12.6](https://github.com/moleculerjs/moleculer/compare/v0.12.5...v0.12.6) (2018-06-07)

# Changes
- update dependencies
- The `breakLength` is changed to `Infinity` (single-line printing) for better log processing when logger prints objects and arrays.
- adds ability to customise console object/array printing [#285](https://github.com/moleculerjs/moleculer/issues/285)
    ```js
    const util = require("util");

    const broker = new ServiceBroker({
        logger: true,
        logObjectPrinter: o => util.inspect(o, { depth: 4, colors: false, breakLength: 50 }) // `breakLength: 50` activates multi-line object
    });    
    ```

--------------------------------------------------
<a name="0.12.5"></a>
# [0.12.5](https://github.com/moleculerjs/moleculer/compare/v0.12.4...v0.12.5) (2018-05-21)

# Changes
- fix AMQP logs. [#270](https://github.com/moleculerjs/moleculer/issues/270)
- fix transferred retryable error handling
- `broker.createService` supports ES6 classes
- fix broken promise chain if trackContext is enabled

--------------------------------------------------
<a name="0.12.4"></a>
# [0.12.4](https://github.com/moleculerjs/moleculer/compare/v0.12.3...v0.12.4) (2018-05-10)

# New 

## Graceful shutdown
Thanks for [@rmccallum81](https://github.com/rmccallum81), ServiceBroker supports graceful shutdown. You can enable it with `trackContext` broker option. If you enable it, all services wait for all running contexts before shutdowning. You can also define a timeout value with `gracefulStopTimeout` broker option.

```js
const broker = new ServiceBroker({
    trackContext: true,
    gracefulStopTimeout: 5 * 1000 // waiting max 5 sec
});
```

_This timeout can be overwrite in service settings with `$gracefulStopTimeout` property._

# Changes
- fix service registry update after reconnecting. [#262](https://github.com/moleculerjs/moleculer/issues/262)
- update index.d.ts
- update dependencies
- fix distributed timeout handling

--------------------------------------------------
<a name="0.12.3"></a>
# [0.12.3](https://github.com/moleculerjs/moleculer/compare/v0.12.2...v0.12.3) (2018-04-19)

# Changes
- fix empty service mixins issue (`mixins: []`).
- update index.d.ts

--------------------------------------------------
<a name="0.12.2"></a>
# [0.12.2](https://github.com/moleculerjs/moleculer/compare/v0.12.0...v0.12.2) (2018-04-11)

# New

## Latency strategy
This strategy selects a node which has the lowest latency, measured by periodic `PING`. Notice that the strategy only ping one of nodes from a single host. Due to the node list can be very long, it gets samples and selects the host with the lowest latency from only samples instead of the whole node list.

**Usage**
```js
let broker = new ServiceBroker({
    registry: {
        strategy: "Latency"
    }
});
```

**Strategy options**

| Name | Type | Default | Description |
| ---- | ---- | --------| ----------- |
| `sampleCount` | `Number` | `5` | the number of samples. If you have a lot of hosts/nodes, it's recommended to *increase* the value. |
| `lowLatency` | `Number` | `10` | the low latency (ms). The node which has lower latency than this value is selected immediately. |
| `collectCount` | `Number` | `5` | the number of measured latency per host to keep in order to calculate the average latency. |
| `pingInterval` | `Number` | `10` | ping interval (s). If you have a lot of host/nodes, it's recommended to *increase* the value. |

**Usage with custom options**
```js
let broker = new ServiceBroker({
    registry: {
        strategy: "Latency",
        strategyOptions: {
            sampleCount: 15,
            lowLatency: 20,
            collectCount: 10,
            pingInterval: 15
        }
    }
});
```

## Filemask for Moleculer Runner
There is a new Moleculer Runner option `--mask` to define filemask when load all services from folders. 

**Example**
```
$ moleculer-runner.js -r --mask **/user*.service.js examples
```

**Example to load Typescript services** 
```
$ node -r ts-node/register node_modules/moleculer/bin/moleculer-runner --hot --repl --mask **/*.service.ts services
```

# Changes
- fix `d.ts` issues
- fix event `group` handling in mixins ([#217](https://github.com/moleculerjs/moleculer/issues/217))
- move `mergeSchemas` from `utils` to `Service` static method. It can be overwritten in a custom ServiceFactory
- improve `d.ts`
- fix `prefix` option in Redis Cacher ([223](https://github.com/moleculerjs/moleculer/issues/223))
- remove `nanomatch` dependency, use own implementation
- fix ContextFactory issue ([235](https://github.com/moleculerjs/moleculer/issues/235))
- expose utility functions as `require("moleculer").Utils`
- overwritable `mergeSchemas` static method in `Service` class.
- Moleculer Runner precedence order is changed. The `SERVICES` & `SERVICEDIR` env vars overwrites the paths in CLI arguments.

--------------------------------------------------
<a name="0.12.0"></a>
# [0.12.0](https://github.com/moleculerjs/moleculer/compare/v0.11.10...v0.12.0) (2018-03-03)

This version contains the most changes in the history of Moleculer! More than 200 commits with 17k additions and a lot of new features.

# Breaking changes

## Github organization is renamed
The Github organization name (Ice Services) has been renamed to MoleculerJS. Please update your bookmarks.

* Github organization: https://github.com/moleculerjs
* Website: https://moleculer.services or http://moleculerjs.com/
* Gitter chat: https://gitter.im/moleculerjs/moleculer

## Mixin merging logic is changed
To support [#188](https://github.com/moleculerjs/moleculer/issues/188), mixin merging logic is changed at `actions`. Now it uses `defaultsDeep` for merging. It means you can extend the actions definition of mixins, no need to redeclare the `handler`.

**Add extra action properties but `handler` is untouched**
```js
    // mixin.service.js
    module.exports = {
        actions: {
            create(ctx) {
                // Action handler without `params`
            }
        }
    };
```

```js
    // my.service.js
    module.exports = {
        mixins: [MixinService]
        actions: {
            create: {
                // Add only `params` property to the `create` action
                // The handler is merged from mixin
                params: {
                    name: "string"
                }
            }
        }

    };
```

## Wrapper removed from transporter options
If you are using transporter options, you will need to migrate them. The transporter specific wrapper has been removed from options (`nats`, `redis`, `mqtt`, `amqp`).

**Before**
```js
// NATS transporter
const broker = new ServiceBroker({
    transporter: {
        type: "NATS",
        options: {
            nats: {
                user: "admin",
                pass: "1234"    
            }
        }
    }
});

// Redis transporter
const broker = new ServiceBroker({
    transporter: {
        type: "Redis",
        options: {
            redis: {
                port: 6379,
                db: 0
            }
        }
    }
});

// MQTT transporter
const broker = new ServiceBroker({
    transporter: {
        type: "MQTT",
        options: {
            mqtt: {
                user: "admin",
                pass: "1234"    
            }
        }
    }
});

// AMQP transporter
const broker = new ServiceBroker({
    transporter: {
        type: "AMQP",
        options: {
            amqp: {
                prefetch: 1 
            }
        }
    }
});
```

**After**
```js
// NATS transporter
const broker = new ServiceBroker({
    transporter: {
        type: "NATS",
        options: {
            user: "admin",
            pass: "1234"    
        }
    }
});

// Redis transporter
const broker = new ServiceBroker({
    transporter: {
        type: "Redis",
        options: {
            port: 6379,
            db: 0
        }
    }
});

// MQTT transporter
const broker = new ServiceBroker({
    transporter: {
        type: "MQTT",
        options: {
            user: "admin",
            pass: "1234"    
        }
    }
});

// AMQP transporter
const broker = new ServiceBroker({
    transporter: {
        type: "AMQP",
        options: {
            prefetch: 1 
        }
    }
});
```

## Default `nodeID` generator changed
When `nodeID` didn't define in broker options, the broker generated it from hostname (`os.hostname()`). It could cause problem for new users when they tried to start multiple instances on the same computer. Therefore, the broker generates `nodeID` from hostname **and process PID**. The newly generated nodeID looks like `server-6874` where `server` is the hostname and `6874` is the PID.

## Protocol changed
The transport protocol is changed. The new version is `3`. [Check the changes.](https://github.com/moleculerjs/moleculer/blob/aa56e0072f4726dcd3a72ef164c3e13ad377bfc2/docs/PROTOCOL.md)

**It means, the >=0.12.x versions can't communicate with old <=0.11 versions.**

**Changes:**
- the `RESPONSE` packet has a new field `meta`.
- the `EVENT` packet has a new field `broadcast`.
- the `port` field is removed from `INFO` packet.
- the `INFO` packet has a new field `hostname`.

# New features

## New ServiceBroker options
There are some new properties in ServiceBroker option: `middlewares`, `created`, `started`, `stopped`.

They can be useful when you use broker config file and start your project with Moleculer Runner.

```js
// moleculer.config.js
module.exports = {
    logger: true,

    // Add middlewares
    middlewares: [myMiddleware()],

    // Fired when the broker created
    created(broker) {
    },

    // Fired when the broker started
    started(broker) {
        // You can return Promise
        return broker.Promise.resolve();
    },

    // Fired when the broker stopped
    stopped(broker) {
        // You can return Promise
        return broker.Promise.resolve();
    }
};
```

## Broadcast events with group filter

The `broker.broadcast` function has a third `groups` argument similar to `broker.emit`. 
```js
// Send to all "mail" service instances
broker.broadcast("user.created", { user }, "mail");

// Send to all "user" & "purchase" service instances.
broker.broadcast("user.created", { user }, ["user", "purchase"]);
```

## CPU usage-based strategy
There is a new `CpuUsageStrategy` strategy. It selects a node which has the lowest CPU usage.
Due to the node list can be very long, it gets samples and selects the node with the lowest CPU usage from only samples instead of the whole node list.

There are 2 options for the strategy:
- `sampleCount`: the number of samples. Default: `3`
- `lowCpuUsage`: the low CPU usage percent. The node which has lower CPU usage than this value is selected immediately. Default: `10`

**Usage:**
```js
const broker = new ServiceBroker({
    registry: {
        strategy: "CpuUsage"
    }
});
```

**Usage with custom options**
```js
const broker = new ServiceBroker({
    registry: {
        strategy: "CpuUsage",
        strategyOptions: {
            sampleCount: 3,
            lowCpuUsage: 10
        }
    }
});
```

## Starting logic is changed
The broker & services starting logic has been changed. 

**Previous logic:** the broker starts transporter connecting. When it's done, it starts all services (calls service `started` handlers). It has a disadvantage because other nodes can send requests to these services, while they are still starting and not ready yet.

**New logic:** the broker starts transporter connecting but it doesn't publish the local service list to remote nodes. When it's done, it starts all services (calls service `started` handlers). Once all services start successfully, broker publishes the local service list to remote nodes. Hence other nodes send requests only after all local service started properly.
>Please note: you can make dead-locks when two services wait for each other. E.g.: `users` service has `dependencies: [posts]` and `posts` service has `dependencies: [users]`. To avoid it remove the concerned service from `dependencies` and use `waitForServices` method out of `started` handler instead.

## Metadata is sent back to requester
At requests, `ctx.meta` is sent back to the caller service. You can use it to send extra meta information back to the caller. 
E.g.: send response headers back to API gateway or set resolved logged in user to metadata.

**Export & download a file with API gateway:**
```js
// Export data
export(ctx) {
    const rows = this.adapter.find({});

    // Set response headers to download it as a file
    ctx.meta.headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename=\"book.json\"'
    }

    return rows;
}
```

**Authenticate:**
```js
auth(ctx) {
    let user = this.getUserByJWT(ctx.params.token);
    if (ctx.meta.user) {
        ctx.meta.user = user;

        return true;
    }

    throw new Forbidden();
}
```

## Better ES6 class support
If you like better ES6 classes than Moleculer service schema, you can write your services in ES6 classes.

There are two ways to do it:

1. **Native ES6 classes with schema parsing**
    
    Define `actions` and `events` handlers as class methods. Call the `parseServiceSchema` method in constructor with schema definition where the handlers pointed to these class methods. 
    ```js
    const Service = require("moleculer").Service;

    class GreeterService extends Service {

        constructor(broker) {
            super(broker);

            this.parseServiceSchema({
                name: "greeter",
                version: "v2",
                meta: {
                    scalable: true
                },
                dependencies: [
                    "auth",
                    "users"
                ],

                settings: {
                    upperCase: true
                },
                actions: {
                    hello: this.hello,
                    welcome: {
                        cache: {
                            keys: ["name"]
                        },
                        params: {
                            name: "string"
                        },
                        handler: this.welcome
                    }
                },
                events: {
                    "user.created": this.userCreated
                },
                created: this.serviceCreated,
                started: this.serviceStarted,
                stopped: this.serviceStopped,
            });
        }

        // Action handler
        hello() {
            return "Hello Moleculer";
        }

        // Action handler
        welcome(ctx) {
            return this.sayWelcome(ctx.params.name);
        }

        // Private method
        sayWelcome(name) {
            this.logger.info("Say hello to", name);
            return `Welcome, ${this.settings.upperCase ? name.toUpperCase() : name}`;
        }

        // Event handler
        userCreated(user) {
            this.broker.call("mail.send", { user });
        }

        serviceCreated() {
            this.logger.info("ES6 Service created.");
        }

        serviceStarted() {
            this.logger.info("ES6 Service started.");
        }

        serviceStopped() {
            this.logger.info("ES6 Service stopped.");
        }
    }

    module.exports = GreeterService;
    ```

2. **Use decorators**

    Thanks for [@ColonelBundy](https://github.com/ColonelBundy), you can use ES7/TS decorators as well: [moleculer-decorators](https://github.com/ColonelBundy/moleculer-decorators)
    
    >Please note, you need to use Typescript or Babel to compile decorators.

    **Example service**
    ```js
    const moleculer = require('moleculer');
    const { Service, Action, Event, Method } = require('moleculer-decorators');
    const web = require('moleculer-web');
    const broker = new moleculer.ServiceBroker({
        logger: console,
        logLevel: "debug",
    });

    @Service({
        mixins: [web],
        settings: {
            port: 3000,
            routes: [
            ...
            ]
        }
    })
    class ServiceName {
        @Action()
        Login(ctx) {
            ...
        }

        // With options
        @Action({
            cache: false,
            params: {
                a: "number",
                b: "number"
            }
        })
        Login2(ctx) {
            ...
        }

        @Event
        'event.name'(payload, sender, eventName) {
            ...
        }

        @Method
        authorize(ctx, route, req, res) {
            ...
        }

        hello() { // Private
            ...
        }

        started() { // Reserved for moleculer, fired when started
            ...
        }

        created() { // Reserved for moleculer, fired when created
            ...
        }

        stopped() { // Reserved for moleculer, fired when stopped
            ...
        }
    }

    broker.createService(ServiceName);
    broker.start();
    ```

## Event group option
The broker groups the event listeners by group name. The group name is the name of the service where your event handler is declared. You can change it in the event definition.

```js
module.export = {
    name: "payment",
    events: {
        "order.created": {
            // Register handler to "other" group instead of "payment" group.
            group: "other",
            handler(payload) {
                // ...
            }
        }
    }
}
```

## New experimental TCP transporter with UDP discovery
There is a new built-in zero-config TCP transporter. It uses [Gossip protocol](https://en.wikipedia.org/wiki/Gossip_protocol) to disseminate node info, service list and heartbeats. It has an integrated UDP discovery to detect new nodes on the network. It uses multicast discovery messages.
If the UDP is prohibited on your network, you can use `urls` option. It is a list of remote endpoints (host/ip, port, nodeID). It can be a static list in your configuration or a file path which contains the list.

>Please note, you don't need to list all remote nodes. It's enough at least one node which is online. For example, you can create a "serviceless" gossiper node, which does nothing, just shares remote nodes addresses by gossip messages. So all nodes need to know only the gossiper node address to be able to detect all other nodes.

<!-- **This TCP transporter is the default transporter in Moleculer**.
It means, you don't have to configure any transporter, just start the brokers/nodes, use same namespaces and the nodes will find each others.
>If you don't want to use transporter, set `transporter: null` in broker options. 
-->

**Use TCP transporter with default options**
```js
const broker = new ServiceBroker({
    transporter: "TCP"
});
```

**Use TCP transporter with static node list**
```js
const broker = new ServiceBroker({
    transporter: "tcp://172.17.0.1:6000/node-1,172.17.0.2:6000/node-2"
});
```
or 
```js
const broker = new ServiceBroker({
    nodeID: "node-1",
    transporter: {
        type: "TCP",
        options: {
            udpDiscovery: false,
            urls: [
                "172.17.0.1:6000/node-1",
                "172.17.0.2:6000/node-2",
                "172.17.0.3:6000/node-3"
            ]
        }
    }
});
```


**All TCP transporter options with default values**
```js
const broker = new ServiceBroker({
    logger: true,
    transporter: {
        type: "TCP",
        options: {
            // Enable UDP discovery
            udpDiscovery: true,
            // Reusing UDP server socket
            udpReuseAddr: true,

            // UDP port
            udpPort: 4445,
            // UDP bind address (if null, bind on all interfaces)
            udpBindAddress: null,
            // UDP sending period (seconds)
            udpPeriod: 30,

            // Multicast address.
            udpMulticast: "239.0.0.0",
            // Multicast TTL setting
            udpMulticastTTL: 1,

            // Send broadcast (Boolean, String, Array<String>)
            udpBroadcast: false,

            // TCP server port. Null or 0 means random port
            port: null,
            // Static remote nodes address list (when UDP discovery is not available)
            urls: null,
            // Use hostname as preffered connection address
            useHostname: true,

            // Gossip sending period in seconds
            gossipPeriod: 2,
            // Maximum enabled outgoing connections. If reach, close the old connections
            maxConnections: 32,
            // Maximum TCP packet size
            maxPacketSize: 1 * 1024 * 1024            
        }
    }
});
```

## New experimental transporter for Kafka
There is a new transporter for [Kafka](https://kafka.apache.org/). It is a very simple implementation. It transfers Moleculer packets to consumers via pub/sub. There are not implemented offset, replay...etc features.
Please note, it is an **experimental** transporter. **Do not use it in production yet!**

>To use it, install `kafka-node` with `npm install kafka-node --save` command.

**Connect to Zookeeper**
```js
const broker = new ServiceBroker({
    logger: true,
    transporter: "kafka://192.168.51.29:2181"
});
```

**Connect to Zookeeper with custom options**
```js
const broker = new ServiceBroker({
    logger: true,
    transporter: {
        type: "kafka",
        options: {
            host: "192.168.51.29:2181",

            // KafkaClient options. More info: https://github.com/SOHU-Co/kafka-node#clientconnectionstring-clientid-zkoptions-noackbatchoptions-ssloptions
            client: {
                zkOptions: undefined,
                noAckBatchOptions: undefined,
                sslOptions: undefined
            },

            // KafkaProducer options. More info: https://github.com/SOHU-Co/kafka-node#producerclient-options-custompartitioner
            producer: {},
            customPartitioner: undefined,

            // ConsumerGroup options. More info: https://github.com/SOHU-Co/kafka-node#consumergroupoptions-topics
            consumer: {
            },

            // Advanced options for `send`. More info: https://github.com/SOHU-Co/kafka-node#sendpayloads-cb
            publish: {
                partition: 0,
                attributes: 0
            }               
        }
    }
    
});
```

## New experimental transporter for NATS Streaming
There is a new transporter for [NATS Streaming](https://nats.io/documentation/streaming/nats-streaming-intro/). It is a very simple implementation. It transfers Moleculer packets to consumers via pub/sub. There are not implemented offset, replay...etc features.
Please note, it is an **experimental** transporter. **Do not use it in production yet!**

>To use it, install `node-nats-streaming` with `npm install node-nats-streaming --save` command.

**Connect to NATS Streaming server**
```js
// Shorthand to local server
const broker = new ServiceBroker({
    logger: true,
    transporter: "STAN"
});

// Shorthand
const broker = new ServiceBroker({
    logger: true,
    transporter: "stan://192.168.0.120:4222"
});

// Shorthand with options
const broker = new ServiceBroker({
    logger: true,
    transporter: {
        type: "STAN",
        options: {
            url: "stan://127.0.0.1:4222",
            clusterID: "my-cluster"
        }
    }
});

```

## Define custom REPL commands in broker options
You can define your custom REPL commands in broker options to extend Moleculer REPL commands.

```js
const broker = new ServiceBroker({
    logger: true,
    replCommands: [
        {
            command: "hello <name>",
            description: "Call the greeter.hello service with name",
            alias: "hi",
            options: [
                { option: "-u, --uppercase", description: "Uppercase the name" }
            ],
            types: {
                string: ["name"],
                boolean: ["u", "uppercase"]
            },
            //parse(command, args) {},
            //validate(args) {},
            //help(args) {},
            allowUnknownOptions: true,
            action(broker, args) {
                const name = args.options.uppercase ? args.name.toUpperCase() : args.name;
                return broker.call("greeter.hello", { name }).then(console.log);
            }
        }
    ]
});

broker.repl();
```

# Changes
- MemoryCacher clears all cache entries after the transporter connected/reconnected.
- `broker.loadServices` file mask is changed from `*.service.js` to `**/*.service.js` in order to load all services from subfolders, too.
- `ServiceNotFoundError` and `ServiceNotAvailableError` errors are retryable errors.
- `Strategy.select` method gets only available endpoint list.
- old unavailable nodes are removed from registry after 10 minutes.  
- CPU usage in `HEARTBEAT` packet is working properly in Windows, too.
- register middlewares before internal service (`$node.*`) loading.
- `broker.getAction` deprecated method is removed.
- `PROTOCOL_VERSION` constant is available via broker as `ServiceBroker.PROTOCOL_VERSION` or `broker.PROTOCOL_VERSION`
- serialization functions are moved from transit to transporter codebase.
- `ctx.broadcast` shortcut method is created to send broadcast events from action handler.
- `broker.started` property is created to indicate broker starting state.

# Fixes
- handles invalid `dependencies` value in service schema [#164](https://github.com/moleculerjs/moleculer/pull/164)
- fix event emit error if payload is `null`,

--------------------------------------------------
<a name="0.11.10"></a>
# [0.11.10](https://github.com/moleculerjs/moleculer/compare/v0.11.9...v0.11.10) (2018-01-19)

# New

## Built-in clustering in Moleculer Runner [#169](https://github.com/moleculerjs/moleculer/pull/169)
By [@tinchoz49](https://github.com/tinchoz49 ) Moleculer Runner has a new built-in clustering function. With it, you can start multiple instances from your broker.

Example to start all services from the `services` folder in 4 instances.
```bash
$ moleculer-runner --instances 4 services
```
> Please note, the `nodeID` will be suffixed with the worker ID.


## Context meta & params in metrics events [#166](https://github.com/moleculerjs/moleculer/pull/166)
By [@dani8art](https://github.com/dani8art) you can set that the broker put some `ctx.meta` and `ctx.params` fields to the metrics events.
You can define it in the action definition:

```js
module.exports = {
    name: "test",
    actions: {
        import: {
            cache: true,
            metrics: {
                // Disable to add `ctx.params` to metrics payload. Default: false
                params: false,
                // Enable to add `ctx.meta` to metrics payload. Default: true
                meta: true
            },
            handler(ctx) {
                // ...
            }
        }
    }
}
```

If the value is `true`, it adds all fields. If `Array`, it adds the specified fields. If `Function`, it calls with `params` or `meta`and you need to return an `Object`.

--------------------------------------------------
<a name="0.11.9"></a>
# [0.11.9](https://github.com/moleculerjs/moleculer/compare/v0.11.8...v0.11.9) (2018-01-08)

# New

## Strategy resolver

ServiceBroker can resolve the `strategy` from a string.
```js
const broker = new ServiceBroker({
    registry: {
        strategy: "Random"
        // strategy: "RoundRobin"
    }
});
```

You can set it via env variables as well, if you are using the Moleculer Runner:
```sh
$ REGISTRY_STRATEGY=random
```

## Load env files in Moleculer Runner [#158](https://github.com/moleculerjs/moleculer/issues/158)
Moleculer runner can load `.env` file at starting. There are two new cli options to load env file:

* `-e, --env` - Load envorinment variables from the '.env' file from the current folder.
* `-E, --envfile <filename>` - Load envorinment variables from the specified file.
 
**Example**
```sh
# Load the default .env file from current directory
$ moleculer-runner --env 

# Load the specified .my-env file
$ moleculer-runner --envfile .my-env
```

# Fixes
- fixed hot reloading after broken service files by @askuzminov ([#155](https://github.com/moleculerjs/moleculer/pull/155))
- allow fallbackResponse to be falsy values


--------------------------------------------------
<a name="0.11.8"></a>
# [0.11.8](https://github.com/moleculerjs/moleculer/compare/v0.11.7...v0.11.8) (2017-12-15)

# Changes
- `d.ts` has been improved.

--------------------------------------------------
<a name="0.11.7"></a>
# [0.11.7](https://github.com/moleculerjs/moleculer/compare/v0.11.6...v0.11.7) (2017-12-05)

# Changes
- `d.ts` has been improved.

--------------------------------------------------
<a name="0.11.6"></a>
# [0.11.6](https://github.com/moleculerjs/moleculer/compare/v0.11.5...v0.11.6) (2017-11-07)

# New

## New cacher features
In action cache keys you can use meta keys with `#` prefix.
```js
broker.createService({
    name: "posts",
    actions: {
        list: {
            cache: {
                // Cache key:  "limit" & "offset" from ctx.params, "user.id" from ctx.meta
                keys: ["limit", "offset", "#user.id"],
                ttl: 5
            },
            handler(ctx) {...}
        }
    }
});
```

You can override the cacher default TTL setting in action definition.
```js
const broker = new ServiceBroker({
    cacher: {
        type: "memory",
        options: {
            ttl: 30 // 30 seconds
        }
    }
});

broker.createService({
    name: "posts",
    actions: {
        list: {
            cache: {
                // This cache entries will be expired after 5 seconds instead of 30.
                ttl: 5
            },
            handler(ctx) {...}
        }
    }
});
```

You can change the built-in cacher keygen function to your own one.
```js
const broker = new ServiceBroker({
    cacher: {
        type: "memory",
        options: {
            keygen(name, params, meta, keys) {
                // Generate a cache key
                return ...;
            }
        }
    }
});
```

# Others
- `d.ts` has been improved by [@rmccallum81](https://github.com/rmccallum81)

--------------------------------------------------
<a name="0.11.5"></a>
# [0.11.5](https://github.com/moleculerjs/moleculer/compare/v0.11.4...v0.11.5) (2017-10-12)

# Changes
- `strategy` option has been fixed in broker option [#121](https://github.com/moleculerjs/moleculer/pull/121)


--------------------------------------------------
<a name="0.11.4"></a>
# [0.11.4](https://github.com/moleculerjs/moleculer/compare/v0.11.3...v0.11.4) (2017-10-11)

# Changes
- Moleculer Runner arguments have been fixed (`services` arg)
- update AMQP default queue options by @Nathan-Schwartz [#119](https://github.com/moleculerjs/moleculer/pull/119)


--------------------------------------------------
<a name="0.11.3"></a>
# [0.11.3](https://github.com/moleculerjs/moleculer/compare/v0.11.2...v0.11.3) (2017-10-10)

# Changes
- The `ack` handling has been fixed in AMQP transporter.
- AMQP RCP integration tests are added.


--------------------------------------------------
<a name="0.11.2"></a>
# [0.11.2](https://github.com/moleculerjs/moleculer/compare/v0.11.1...v0.11.2) (2017-10-06)

# New

## Service dependencies [#102](https://github.com/moleculerjs/moleculer/issues/102)
The `Service` schema has a new `dependencies` property. The serice can wait for other dependening ones when it starts. This way you don't need to call `waitForServices` in `started` any longer.

```js
module.exports = {
  name: "posts",
  settings: {
      $dependencyTimeout: 30000 // Default: 0 - no timeout
  },
  dependencies: [
      "likes", // shorthand w/o version
      { name: "users", version: 2 }, // with numeric version
      { name: "comments", version: "staging" } // with string version
  ],
  started() {
      this.logger.info("Service started after the dependent services available.");
  }
  ....
}
```
The `started` service handler is called once the `likes`, `users` and `comments` services are registered (on the local or remote nodes).

## Pending request queue size limit [#111](https://github.com/moleculerjs/moleculer/issues/111)
The `ServiceBroker` has a new `maxQueueSize` option under `transit` key. The broker protects the process to avoid crash during a high load with it. The `maxQueueSize` default value is 50,000. If pending request queue size reaches it, broker rejects the request with a `QueueIsFull` (retryable) error.

```js
const broker = new ServiceBroker({
    transporter: "NATS",
    transit: {
        maxQueueSize: 10 * 1000
    }
}
```

# Changes

## The `waitForServices` method supports service versions [#112](https://github.com/moleculerjs/moleculer/issues/112)
By [@imatefx](https://github.com/imatefx), the `waitForServices` broker & service methods support service versions. Use the following formats to define version in a dependency:

```js
module.exports = {
    name: "test",
    dependencies: { name: "users", version: 2 }
};
```

--------------------------------------------------
<a name="0.11.1"></a>
# [0.11.1](https://github.com/moleculerjs/moleculer/compare/v0.11.0...v0.11.1) (2017-09-27)

# New

## Service metadata [#91](https://github.com/moleculerjs/moleculer/issues/91)
The `Service` schema has a new `metadata` property. The Moleculer modules doesn't use it, so you can use it whatever you want.

```js
broker.createService({
    name: "posts",
    settings: {},
    metadata: {
        scalable: true,
        priority: 5
    },

    actions: { ... }
});
```

> The `metadata` is transferred between nodes, you can access it via `$node.services`. Or inside service with `this.metadata` like settings.

## NATS transporter supports to use the built-in balancer
The NATS transporter has been changed. It supports to use the NATS built-in balancer instead of Moleculer balancer. In this case every `call` & `emit` will be transferred through NATS message broker.

```js
const broker = new ServiceBroker({
    transporter: "NATS",
    disableBalancer: true
});
```

# Changes
- ping nodes with `broker.sendPing` instead of `broker.transit.sendPing`.
- `index.d.ts` updated to v0.11
- AMQP integration tests has been rewritten.
- process exit code changed from `2` to `1` in `broker.fatal`. Reason: `2` is reserved by Bash for builtin misuse. [More info](https://nodejs.org/dist/latest-v6.x/docs/api/process.html#process_exit_codes)

--------------------------------------------------
<a name="0.11.0"></a>
# [0.11.0](https://github.com/moleculerjs/moleculer/compare/v0.10.0...v0.11.0) (2017-09-12)

# Breaking changes

## Protocol changed [#86](https://github.com/moleculerjs/moleculer/issues/86)
The Moleculer transportation protocol has been changed. It means, **the new (>= v0.11) versions can't communicate with the old (<= v0.10.x) ones.**
You can find more information about changes in [#86](https://github.com/moleculerjs/moleculer/issues/86) issue.

## Balanced events
The whole event handling has been rewritten. By now Moleculer supports [event driven architecture](http://microservices.io/patterns/data/event-driven-architecture.html). It means that event emits are balanced like action calls are.

For example, you have 2 main services: `users` & `payments`. Both subscribe to the `user.created` event. You start 3 instances from `users` service and 2 instances from `payments` service. If you emit the event with `broker.emit('user.created')`, broker groups & balances the event, so only one `users` and one `payments` service receive the event. 
You can also send broadcast events with the `broker.broadcast('user.created')` command. This way every service instance on every node receives the event.
The `broker.broadcastLocal('user.created')` command sends events only to the local services.

## Renamed & new internal events
Every internal event name starts with '$'. These events are not transferred to remote nodes.

**Renamed events:**
- `node.connected` -> `$node.connected`
- `node.updated` -> `$node.updated`
- `node.disconnected` -> `$node.disconnected`
- `services.changed` -> `$services.changed`. It is called if local or remote service list is changed.
- `circuit-breaker.closed` -> `$circuit-breaker.closed`
- `circuit-breaker.opened` -> `$circuit-breaker.opened`
- `circuit-breaker.half-opened` -> `$circuit-breaker.half-opened`

**New events:**
- global circuit breaker events for metrics: `metrics.circuit-breaker.closed`, `metrics.circuit-breaker.opened`, `metrics.circuit-breaker.half-opened`

## Switchable built-in load balancer
The built-in Moleculer load balancer is switchable. You can turn it off, if the transporter has internal balancer (currently AMQP has it).

```js
const broker = new ServiceBroker({
    disableBalancer: false
});
```

> Please note! If built-in balancer is disabled, every call & emit (including local ones too) are transferred via transporter.

## Removed broker methods
Some internal broker methods have been removed or renamed.
- `broker.bus` has been removed.
- `broker.on` has been removed. Use `events` in service schema instead.
- `broker.once` has been removed.
- `broker.off` has been removed.
- `broker.getService` has been renamed to `broker.getLocalService`
- `broker.hasService` has been removed.
- `broker.hasAction` has been removed.
- `broker.getAction` has been deprecated.
- `broker.isActionAvailable` has been removed.

## Changed local service responses
Internal action (`$node.list`, `$node.services`, `$node.actions`, `$node.health`) responses are changed. New internal action (`$node.events`) to list event subscriptiion is added.

## Broker option changes
- `heartbeatInterval` default value is changed from `10` to `5`.
- `heartbeatTimeout` default value is changed from `30` to `15`.
- `circuitBreaker.maxFailures` default value is changed from `5` to `3`.
- `logFormatter` accepts string. The `simple` value is a new formatter to show only log level & log messages.

# New

## Ping command
New PING & PONG feature has been implemented. Ping remite nodes to measure the network latency and system time differences.

```js
broker.createService({
    name: "test",
    events: {
        "$node.pong"({ nodeID, elapsedTime, timeDiff }) {
            this.logger.info(`Pong received from '${nodeID}' - Time: ${elapsedTime}ms, System time difference: ${timeDiff}ms`);
        }
    }
});

broker.start().then(() => broker.transit.sendPing(/*nodeID*/));
```

## Pluggable validator
The Validator in ServiceBroker is plugable. So you can change the built-in `fastest-validator` to a slower one :) [Example Joi validator](https://gist.github.com/icebob/07024c0ac22589a5496473c2a8a91146)

## Waiting for other services feature
If your services depend on other ones, use the `waitForService` method to make services wait until dependencies start.

```js
let svc = broker.createService({
    name: "seed",
    started() {
        return this.waitForServices(["posts", "users"]).then(() => {
            // Do work...
        });
    }
});
```

Signature: 
```js
this.waitForServices(serviceNames: String|Array<String>, timeout: Number/*milliseconds*/, interval: Number/*milliseconds*/): Promise
```

## New error types
We added some new Moleculer error classes.
- `MoleculerRetryableError` - Common Retryable error. Caller retries the request if `retryCount > 0`.
- `MoleculerServerError` - Common server error (5xx).
- `MoleculerClientError` - Common client/request error (4xx).
- `ServiceNotAvailable` - Raises if the service is registered but isn't available (no live nodes or CB disabled them).
- `ProtocolVersionMismatchError` - Raises if connect a node with an older client (<= v0.10.0)).

# Other changes
- The cachers don't listen "cache.clean" event.

--------------------------------------------------
<a name="0.10.0"></a>
# [0.10.0](https://github.com/moleculerjs/moleculer/compare/v0.9.0...v0.10.0) (2017-08-20)

# Breaking changes

## No more `nodeID == null` in local stuff
In all core modules removed the nullable `nodeID`. Every places (context, events, $node.* results) the nodeID contains a valid (local or remote) nodeID. On local nodes it equals with `broker.nodeID`.

**Migration guide**

Before:
```js
if (ctx.nodeID == null) { ... }
// ---------
events: {
    "users.created"(payload, sender) {
        if (sender == null) { ... }
    }
}
```

After:
```js
if (ctx.nodeID == ctx.broker.nodeID) { ... }
// ---------
events: {
    "users.created"(payload, sender) {
        if (sender == this.broker.nodeID) { ... }
    }
}
```

## `internalActions` is renamed to `internalServices`
The `internalActions` broker option is renamed to `internalServices`.

## Removed `broker.createNewContext` method
The `createNewContext` broker method is moved to `Context`class as a static method.

**Migration guide:**

Before:
```js
let ctx = broker.createNewContext(action, nodeID, params, opts);
```

After:
```js
let ctx = Context.create(broker, action, nodeID, params, opts);
// or better
let ctx = broker.ContextFactory.create(broker, action, nodeID, params, opts);
```

## Removed `LOCAL_NODE_ID` constant
The recently added `LOCAL_NODE_ID` constant is removed. If you want to check the nodeID is local, please use the `if (nodeID == broker.nodeID)` syntax.

## Class based pluggable Service registry strategies [#75](https://github.com/moleculerjs/moleculer/pull/75)
By @WoLfulus, the service registry balancer strategy is now pluggable.

**New syntax:**
```js
let Strategies = require("moleculer").Strategies;

const broker = new ServiceBroker({
    registry: {        
        strategy: new Strategies.RoundRobin()
    }
});
```

**Custom strategy**

You can create you custom strategy.

```js
let BaseStrategy = require("moleculer").Strategies.Base;

class CustomStrategy extends BaseStrategy {
    select(list) {
        return list[0];
    }
};

const broker = new ServiceBroker({
    registry: {        
        strategy: new CustomStrategy()
    }
});
```

## Metrics event payloads are changed
The metrics payload contains `remoteCall` and `callerNodeID` properties. The `remoteCall` is true if the request is called from a remote node. In this case the `callerNodeID` contains the caller nodeID.

`metrics.trace.span.start`:
```js
{
    "action": {
        "name": "users.get"
    },
    "id": "123123123",
    "level": 1,
    "parent": 123,
    "remoteCall": true,
    "requestID": "abcdef",
    "startTime": 123456789,
    "nodeID": "node-1",
    "callerNodeID": "node-2"
}
```

`metrics.trace.span.start`:
```js
{
    "action": {
        "name": "users.get"
    },
    "duration": 45,
    "id": "123123123",
    "parent": 123,
    "requestID": "abcdef",
    "startTime": 123456789,
    "endTime": 123456795,
    "fromCache": false,
    "level": 1,
    "remoteCall": true,
    "nodeID": "node-1",
    "callerNodeID": "node-2"
}
```

# New

## Hot reload services [#82](https://github.com/moleculerjs/moleculer/pull/82)
The ServiceBroker supports hot reloading services. If you enable it broker will watch file changes. If you modify service file, broker will reload it on-the-fly.
[Demo video](https://www.youtube.com/watch?v=l9FsAvje4F4)

> Note: Hot reloading is only working with Moleculer Runner or if you load your services with `broker.loadService` or `broker.loadServices`.

**Usage**

```js
const broker = new ServiceBroker({
    logger: console,
    hotReload: true
});

broker.loadService("./services/test.service.js");
```

**Usage with Moleculer Runner**

Turn it on with `--hot` or `-H` flags.

```bash
$ moleculer-runner --hot ./services/test.service.js
```

## Protocol documentation
Moleculer protocol documentation is available in [docs/PROTOCOL.md](docs/PROTOCOL.md) file.

# AMQP transporter [#72](https://github.com/moleculerjs/moleculer/pull/72)
By @Nathan-Schwartz, AMQP (for RabbitMQ) transporter added to Moleculer project.

```js
const broker = new ServiceBroker({
    transporter: "amqp://guest:guest@rabbitmq-server:5672"
});

const broker = new ServiceBroker({
    transporter: new AmqpTransporter({
        amqp: {
            url: "amqp://guest:guest@localhost:5672",
            eventTimeToLive: 5000,
            prefetch: 1 
        }
    });
});
```

--------------------------------------------------

<a name="0.9.0"></a>
# [0.9.0](https://github.com/moleculerjs/moleculer/compare/v0.8.5...v0.9.0) (2017-08-10)

# Breaking changes

## Namespace support, removed `prefix` options [#57](https://github.com/moleculerjs/moleculer/issues/57)
The broker has a new `namespace` option to segment your services. For example, you are running development & production services (or more production services) on the same transporter. If you are using different `namespace` you can avoid collisions between different environments.

> You can reach it in your services as `this.broker.namespace`.

Thereupon the `prefix` option in transporters & cachers is removed.

**Example**
```js
const broker = new ServiceBroker({
    logger: console,
    namespace: "DEV",
    transporter: "NATS",
    cacher: "Redis"
});
```
In this case the transporter & cacher prefix will be `MOL-DEV`.


## Renamed internal service settings
The `useVersionPrefix` is renamed to `$noVersionPrefix`. The `serviceNamePrefix` is renamed to `$noServiceNamePrefix`. Both settings logical state is changed.
The `cache` setting is renamed to `$cache`.

### Migration guide

**Before**
```js
broker.createService({
    name: "test",
    settings: {
        useVersionPrefix: false,
        serviceNamePrefix: false,
        cache: true
    }
});
```

**After**
```js
broker.createService({
    name: "test",
    settings: {
        $noVersionPrefix: true,
        $noServiceNamePrefix: true,
        $cache: true
    }
});
```

## Changed versioned action names [#58](https://github.com/moleculerjs/moleculer/issues/58)
Based on [#58](https://github.com/moleculerjs/moleculer/issues/58) if service version is a `String`, the version in action names won't be prefixed with `v`, expect if it is a `Number`.

**Example**
```js
broker.createService({
    name: "test",
    version: 3,
    actions: {
        hello(ctx) {}
    }
});
broker.call("v3.test.hello");

broker.createService({
    name: "test",
    version: "staging",
    actions: {
        hello(ctx) {}
    }
});
broker.call("staging.test.hello");
```

## Module log level configuration is removed
The module log level is not supported. The `logLevel` option can be only `String`. It is used if the logger is the `console`. **In case of external loggers you have to handle log levels.**

# New 

## Better logging [#61](https://github.com/moleculerjs/moleculer/issues/61)
The whole Moleculer logger is rewritten. It supports better the external loggers. The built-in log message format is also changed.

### Built-in `console` logger
```js
const broker = createBroker({ 
    logger: console, 
    logLevel: "info"
});
```
New console output:
![image](https://user-images.githubusercontent.com/306521/29127309-011bd0e0-7d21-11e7-87e2-c2d83352a857.png)

**With custom `logFormatter`**
```js
const broker = new ServiceBroker({ 
    logger: console, 
    logFormatter(level, args, bindings) {
        return level.toUpperCase() + " " + bindings.nodeID + ": " + args.join(" ");
    }
});
broker.logger.warn("Warn message");
broker.logger.error("Error message");
```
Output:
```
WARN dev-pc: Warn message
ERROR dev-pc: Error message
```

### External loggers

**[Pino](http://getpino.io/)**
```js
const pino = require("pino")({ level: "info" });
const broker = new ServiceBroker({ 
    logger: bindings => pino.child(bindings)
});
```

Sample output:
![image](https://user-images.githubusercontent.com/306521/29127258-e151e3bc-7d20-11e7-9995-025f53cf41ec.png)


**[Bunyan](https://github.com/trentm/node-bunyan)**
```js
const bunyan = require("bunyan");
const logger = bunyan.createLogger({ name: "moleculer", level: "info" });
const broker = new ServiceBroker({ 
    logger: bindings => logger.child(bindings)
});
```

Sample output:
![image](https://user-images.githubusercontent.com/306521/29127286-f2203428-7d20-11e7-84f1-c81aeaaaef53.png)

**[Winston](https://github.com/winstonjs/winston)**
```js
const broker = new ServiceBroker({ 
    logger: bindings => new winston.Logger({
        transports: [
            new (winston.transports.Console)({
                timestamp: true,
                colorize: true,
                prettyPrint: true
            })
        ]
    })
});
```

**[Winston context](https://github.com/citrix-research/node-winston-context)**
```js
const WinstonContext = require("winston-context");
const winston = require("winston");
const broker = createBroker({ 
    logger: bindings => new WinstonContext(winston, "", bindings)
});
```

> Please note! Some external loggers have not `trace` & `fatal` log methods (e.g.: winston). In this case you have to extend your logger.
```js
const WinstonContext = require("winston-context");
const winston = require("winston");
const { extend } = require("moleculer").Logger;
const broker = createBroker({ 
    logger: bindings => extend(new WinstonContext(winston, "", bindings))
});
```

The `bindings` contains the following properties:
- `ns` - namespace
- `nodeID` - nodeID
- `mod` - type of core module: `broker`, `cacher`, `transit`, `transporter`
- `svc` - service name
- `ver` - service version

**Please avoid to use these property names when you log an `Object`.** For example: the `broker.logger.error({ mod: "peanut" })` overrides the original `mod` value!


## Dynamic service load & destroy
Available to load & destroy services after the broker started. For example you can hot-reload your services in runtime. The remote nodes will be notified about changes and the broker will emit a `services.changed` event locally.

**Example**
```js

broker.start().then(() => {

    setTimeout(() => {
        // Create a new service after 5s
        broker.createService({
            name: "math",
            actions: {
                add(ctx) {
                    return Number(ctx.params.a) + Number(ctx.params.b);
                },
            }
        });

    }, 5000);

    setTimeout(() => {
        // Destroy a created service after 10s
        let svc = broker.getService("math");
        broker.destroyService(svc);

    }, 10000);

});
```

## Multiple service calls [#31](https://github.com/moleculerjs/moleculer/issues/31)
With `broker.mcall` method you can call multiple actions (in parallel). 

**Example with `Array`**
```js
broker.mcall([
    { action: "posts.find", params: {limit: 5, offset: 0}, options: { timeout: 500 } },
    { action: "users.find", params: {limit: 5, sort: "username"} }
]).then(results => {
    let posts = results[0];
    let users = results[1];
})
```

**Example with `Object`**
```js
broker.mcall({
    posts: { action: "posts.find", params: {limit: 5, offset: 0}, options: { timeout: 500 } },
    users: { action: "users.find", params: {limit: 5, sort: "username"} }
}).then(results => {
    let posts = results.posts;
    let users = results.users;
})
```

# Fixes

--------------------------------------------------
<a name="0.8.5"></a>
# [0.8.5](https://github.com/moleculerjs/moleculer/compare/v0.8.4...v0.8.5) (2017-08-06)

# Fixes
- fixed logger method bindings.
- fixed transporter shutdown errors [#62](https://github.com/moleculerjs/moleculer/issues/62)

--------------------------------------------------
<a name="0.8.4"></a>
# [0.8.4](https://github.com/moleculerjs/moleculer/compare/v0.8.3...v0.8.4) (2017-07-24)

# Fixes
- fixed `Calling error! TypeError : Cannot read property 'requestID' of undefined` error when you call a local action from other one directly.

--------------------------------------------------
<a name="0.8.3"></a>
# [0.8.3](https://github.com/moleculerjs/moleculer/compare/v0.8.2...v0.8.3) (2017-07-24)

# New

## Removable actions in mixins
You can remove an existing action when mixing a service.

```
broker.createService({
    name: "test",
    mixins: [OtherService],
    actions: {
        dangerAction: false
    }
});
```
In the `test` service the `dangerAction` action won't be registered.

## Support NPM modules in `moleculer-runner`
You can load services from NPM module in `moleculer-runner`.

**With CLI arguments**
```bash
$ moleculer-runner -r npm:moleculer-fake npm:moleculer-twilio
```

**With env**
```bash
$ SERVICES=posts,users,npm:moleculer-fale,npm:moleculer-twilio

$ moleculer-runner
```

--------------------------------------------------
<a name="0.8.2"></a>
# [0.8.2](https://github.com/moleculerjs/moleculer/compare/v0.8.1...v0.8.2) (2017-07-06)

# Fixes
- fixed Redis cacher option resolver in ServiceBroker. Now it accepts connection string.

    ```js
    const broker = new ServiceBroker({
        cacher: "redis://localhost"
    });
    ```

# New

## Validator updated
The fastest-validator is updated to [v0.5.0](https://github.com/icebob/fastest-validator/releases/tag/v0.5.0). It supports multi rules & custom validators.

--------------------------------------------------
<a name="0.8.1"></a>
# [0.8.1](https://github.com/moleculerjs/moleculer/compare/v0.8.0...v0.8.1) (2017-07-03)

# New

## Improved mixin's merge logic [#50](https://github.com/moleculerjs/moleculer/issues/50/)
The mixins merge logic is handle better events & lifecycle events. If you have a `created`, `started`, `stopped` lifecycle event or any other service event handler in your services, but your mixin has the same event, Moleculer will call all of them in your service and in mixins. 

[Read more about mixins](http://moleculer.services/docs/service.html#Mixins)

--------------------------------------------------

<a name="0.8.0"></a>
# [0.8.0](https://github.com/moleculerjs/moleculer/compare/v0.7.0...v0.8.0) (2017-06-21)

# New

## Project runner script
There is a new Moleculer project runner script in the `bin` folder.
You can use it if you want to create small repos for services. In this case you needn't to create a ServiceBroker with options. Just create a `moleculer.config.js` or `moleculer.config.json` file in the root of repo fill it with your options and call the `moleculer-runner` within the NPM scripts.
As an other solution you can put it to the environment variables instead of putting  options to file.

[Read more about runner](http://moleculer.services/docs/runner.html)

## Shorthand for transporters, cachers and serializers in broker options
Some new resolvers are implemented in broker options to support shorthand configurations. This feature is enabled to load broker options easily from a JSON file or load from environment variables.

**Usage for transporters**
```js
// Connect to the NATS default (localhost) server
const broker = new ServiceBroker({
    transporter: "NATS"
});

// Connect to a NATS server with connection string
const broker = new ServiceBroker({
    transporter: "nats://nats-server:4222"
});

// Connect to a NATS server with transporter options
const broker = new ServiceBroker({
    transporter: {
        type: "NATS",
        options: {
            prefix: "TEST",
            nats: {
                host: "nats-server",
                user: "admin",
                pass: "nats-pass"
            }
        }
    }
});
```

**Usage for cachers**
```js
// Use a memory cacher
const broker = new ServiceBroker({
    cacher: true
    // or
    // cacher: "Memory"
});

// Use a Redis cacher with default options
const broker = new ServiceBroker({
    cacher: "Redis"
});

// Use a Redis cacher with options
const broker = new ServiceBroker({
    cacher: {
        type: "Redis",
        options: {
            ttl: 100
        }
    }
});
```

**Usage for serializers**
```js
// Use the Avro serializer
const broker = new ServiceBroker({
    serializers: "Avro"
});

// Use the Protocol Buffer serializer
const broker = new ServiceBroker({
    serializers: {
        type: "ProtoBuf"
    }
});
```

## Built-in circuit breaker [#22](https://github.com/moleculerjs/moleculer/issues/22/)
A better circuit breaker solution has recently been implemented. As a result of this improvement every call (local and remote) is protected by the built-in circuit breaker.
You only need to enable it in broker options.

**Usage**
```js
const broker = new ServiceBroker({
    circuitBreaker: {
        enabled: true, // Enable this feature
        maxFailures: 5, // Trip breaker on 5 failures
        halfOpenTime: 10 * 1000 // 10 sec to switch to `half-open` state
        failureOnTimeout: true // Failure if request timed out
        failureOnReject: true // Failure if request rejected with error code >= 500
    }
});
```

*`nodeUnavailable` method is dropped.*

## Service Registry module
A built-in Service Registry module was created. It handles actions of services on nodes, circuit breaker logic...etc. It would be pluggable in the future.

You can change the load balancing strategies of Service Registry via broker options.

**Example**

```js
const { STRATEGY_ROUND_ROBIN, STRATEGY_RANDOM } = require("moleculer");

const broker = new ServiceBroker({
    registry: {
        strategy: STRATEGY_ROUND_ROBIN, // Load balancing strategy
        preferLocal: true // First call local service if available
    }
});
```

## REPL mode [#30](https://github.com/moleculerjs/moleculer/issues/30/)
Broker module has an interactive REPL mode. You can call actions, load services, also emit events, subscribe to & unsubscribe from events from your console. You can list registered nodes & actions.
> To use REPL mode please install the [moleculer-repl](https://github.com/moleculerjs/moleculer-repl) module with `npm install moleculer-repl --save` command.

**Start REPL mode**
```js
const broker = new ServiceBroker({ logger: console });

// Start REPL
broker.repl();
```

**Commands**
```
  Commands:

    help [command...]                      Provides help for a given command.
    exit                                   Exits application.
    q                                      Exit application
    call <actionName> [params]             Call an action
    dcall <nodeID> <actionName> [params]   Call a direct action
    emit <eventName> [payload]             Emit an event
    load <servicePath>                     Load a service from file
    loadFolder <serviceFolder> [fileMask]  Load all service from folder
    subscribe <eventName>                  Subscribe to an event
    unsubscribe <eventName>                Unsubscribe from an event
    actions [options]                      List of actions
    nodes                                  List of nodes
    info                                   Information from broker
```

### REPL Commands

**List nodes**
```
mol $ nodes
```
![image](https://cloud.githubusercontent.com/assets/306521/26260893/67a579d4-3ccf-11e7-955a-70f252aa260d.png)

**List services**
```
mol $ services
```

**List actions**
```
mol $ actions
```
![image](https://cloud.githubusercontent.com/assets/306521/26260954/8ef9d44e-3ccf-11e7-995a-ccbe035b2a9a.png)

**Show common informations**
```
mol $ info
```
![image](https://cloud.githubusercontent.com/assets/306521/26260974/aaea9b02-3ccf-11e7-9e1c-ec9150518791.png)

**Call an action**
```
mol $ call "test.hello"
```

**Call an action with params**
```
mol $ call "math.add" '{"a": 5, "b": 4}'
```

**Direct call**
```
mol $ dcall server-2 "$node.health"
```

**Emit an event**
```
mol $ emit "user.created"
```

**Subscribe to an event**
```
mol $ subscribe "user.created"
```

**Unsubscribe from an event**
```
mol $ unsubscribe "user.created"
```

**Load a service**
```
mol $ load "./math.service.js"
```

**Load services from folder**
```
mol $ load "./services"
```

## Direct call
It is available to call an action directly on a specified node. To use it set `nodeID` in options of call.

**Example**

```js
broker.call("user.create", {}, { timeout: 5000, nodeID: "server-12" });
```

## Mergeable schemas in `createService`
Now there is a second parameter of `broker.createService`. With it you can override the schema properties. You can use it to use a built-in service & override some props.

**Example**

```js
broker.createService(apiGwService, {
    settings: {
        // Change port setting
        port: 8080
    },
    actions: {
        myAction() {
            // Add a new action to apiGwService service
        }
    },

    created() {
        // Overwrite apiGwService.created handler
    }
});
```

Or you can merge it manually with `mergeSchemas` method.
```js
let mergedSchema = broker.mergeSchemas(origSchema, modifications);
broker.createService(mergedSchema);
```

## Service mixins
Like mergeable schemas, the service may include any mixin schemas. The constructor of Service merges these mixins with the schema of Service. It is to reuse an other Service in your service or extend an other Service.

**Examples**

```js
const ApiGwService = require("moleculer-web");

module.exports = {
    name: "api",
    mixins: [ApiGwService]
    settings: {
        // Change port setting
        port: 8080
    },
    actions: {
        myAction() {
            // Add a new action to apiGwService service
        }
    }
}
```

## New option to protect calling loop
You can protect your app against calling loop with the new `maxCallLevel` option. If the `ctx.level` value reaches this limit, it throwns a `MaxCallLevelError` error.

```js
const broker = new ServiceBroker({
    maxCallLevel: 100
});
```

## New Service setting
There is a new `useVersionPrefix` option in Service settings. If it is `false`, Moleculer can't use the version number of service as prefix for action names. The name of service will be `users.find` instead of `v2.users.find`. The default is `true`.

# Changes

## Removed the `node.reconnected` and `node.broken` events (breaking)
We merged the `node.connected` and `node.reconnected` events. The payload is changed:
```js
{
    node: {...},
    reconnected: false // it indicates the node is connected or reconnected
}
```

We merged also the `node.disconnected` and `node.broken` events. The payload is changed:
```js
{
    node: {...},
    unexpected: true // True: broken, not coming heart-beat, False: received "DISCONNECT" packet
}
```

## Remove Transporter, Cacher and Serializers dependencies (breaking)
Moleculer doesn't contain dependencies for NATS, Redis, MQTT, MsgPack, Avro and Protobuf. So it need install manually in your project.
If you want to create a Moleculer project which communicates via NATS and your Redis cacher, you have to install `npm install moleculer nats redis --save`

## Changed code of ServiceNotFoundError
The code of `ServiceNotFoundError` is changed from `501` to `404`. [More info](https://github.com/moleculerjs/moleculer-web/issues/7)

## Using Nanomatch instead of micromatch
Memory cacher is using [nanomatch](https://github.com/micromatch/nanomatch) instead of [micromatch](https://github.com/micromatch/micromatch). The `nanomatch` is ~10x faster.

## Removed `metricsSendInterval` option [#24](https://github.com/moleculerjs/moleculer/issues/24/)
The `metricsSendInterval` option is removed from broker options. If you want to access statistics & health info, call the `$node.health` and `$node.stats` actions.

## Metrics & Statistics separated [#24](https://github.com/moleculerjs/moleculer/issues/24/)
The metrics & statistics features separated. You can use just metrics or just statistics.

## Metrics nodeID
Metrics events contains two nodeID properties. 
- `nodeID`: the "caller" nodeID
- `targetNodeID`: in case of remote call this is the remote nodeID

## Response error with stack trace
If an action responses an error on a remote node, the transporter will send back the error to the caller with the stack traces.
```js
// It will print the original error stack trace.
broker.call("account.deposit").catch(err => console.log(err.stack)); 
```

## Type property in custom error
The `CustomError` class renamed to `MoleculerError`. also it has a `type` new property. You can store here a custom error type. For example, if you have a `ValidationError`, in some cases the `name` & `code` is not enough. By `type` error causes are to be stored. 

**Example**
```js
const ERR_MISSING_ID = "ERR_MISSING_ID";
const ERR_ENTITY_NOT_FOUND = "ERR_ENTITY_NOT_FOUND";

broker.createService({
    actions: {
        get(ctx) {
            if (ctx.params.id) {
                const entity = this.searchEntity(ctx.params.id);
                if (entity)
                    return entity;
                else
                    return Promise.reject(new ValidationError("Not found entity!", ERR_ENTITY_NOT_FOUND));
            } else
                return Promise.reject(new ValidationError("Please set the ID field!", ERR_MISSING_ID));
        }
    }
});
```

## Renamed `appendServiceName` settings to `serviceNamePrefix` in Service schema

## Fatal crash
The `ServiceBroker` has a new `fatal` method. If you call it, broker will log the message with `fatal` level and exit the process with code `2`.

`broker.fatal(message, err, needExit = true)`
> If you are running your app in containers and it has restart policy, you can use it to restart your app.

**Usage**
```js

try {
    // Do something dangerous
} catch(err) {
    broker.fatal("Dangerous thing is happened!", err, true);
}

```

## Low-level changes
- new output of `$node.actions` and `$node.services`
- In packet `INFO` & `DISCOVER` changed the `actions` property to `services` and now it contains all services with actions of node
- splitted `broker.registerService` to `registerLocalService` and `registerRemoteService`
- new `broker.unregisterServicesByNode`. It will be called when a node disconnected

--------------------------------------------------


<a name="0.7.0"></a>
# 0.7.0 (2017-04-24)

# New
## Serializers for transporters [#10](https://github.com/moleculerjs/moleculer/issues/10/)
Implemented pluggable serializers.
Built-in serializers:
- [x] JSON (default)
- [x] [Avro](https://github.com/mtth/avsc)
- [x] [MsgPack](https://github.com/mcollina/msgpack5)
- [x] [ProtoBuf](https://developers.google.com/protocol-buffers/)

**Usage**
```js
let JSONSerializer = require("moleculer").Serializers.JSON;

const broker = new ServiceBroker({
    serializer: new JSONSerializer(),
    transporter: new Transporter(),
    nodeID: "node-1"	
});
```

## Typescript definition file [#5](https://github.com/moleculerjs/moleculer/issues/5)
Created an index.d.ts file. I'm not familiar in Typescript, so if you found error please help me and open a PR with fix. Thank you!

## Metrics rate option
Added `metricsRate` options to broker. This property sets the rate of sampled calls. 
- `1` means to metric all calls
- `0.5` means to metric 50% of calls
- `0.1` means to metric 10% of calls

**Usage**
```js
const broker = new ServiceBroker({
    metrics: true,
    metricsRate: 0.1
});
```

## Context meta data ([#16](https://github.com/moleculerjs/moleculer/pull/16))
Added `meta` prop to `Context`. The `meta` will be merged if has parent context.
In case of remote calls the metadata will be transfered to the target service.

**Usage**

Set meta in `broker.call`:
```js
// Broker call with meta data
broker.call("user.create", { name: "Adam", status: true}, {
    timeout: 1000,
    meta: {
        // Send logged in user data with request to the service
        loggedInUser: {
            userID: 45,
            roles: [ "admin" ]
        }
    }
})
```

Access meta in action:
```js
broker.createService({
    name: "user",
    actions: {
        create(ctx) {
            const meta = ctx.meta;
            if (meta.loggedInUser && meta.loggedInUser.roles.indexOf("admin") !== -1)
                return Promise.resolve(...);
            else
                throw new MoleculerError("Access denied!");
        }
    }
});
```

# Changes

## Update benchmarkify
Benchmarkify updated & created continuous benchmarking with [bench-bot](https://github.com/icebob/bench-bot). 
Bench-bot is a benchmark runner. If a new Pull Request opened, bench-bot will run benchmarks against the `master` branch and it will post the results to the PR conversation.

## Timeout & fallback response handling in local calls too
- Can be use timeout & fallback response in local calls.
- Timeout handling move from `Transit` to `ServiceBroker`
- Remove `wrapContentAction`
- In case of calling error, Node will be unavailable only if the error code >= `500`

## Context changes
- Removed `createSubContext`
- Removed `ctx.parent` and added `ctx.parentID`
- Removed options in constructor. New constructor syntax:
    ```js
    let ctx = new Context(broker, action);
    ctx.setParams({ a: 5 });
    ctx.generateID(); // for metrics
    ctx.requestID = requestID;
    ```
- Add Context reference to returned Promise
    ```js
    const p = broker.call("user.create");
    console.log("Context:", p.ctx);
    ```

## Sender in event handlers
If an event triggered remotely on an other node, broker passes the nodeID of sender to the event handler as 2nd parameter.
```js
// Usage in subscription
broker.on("**", (payload, sender) => console.log(`Event from ${sender || "local"}:`, payload));

// Usage in Service schema
broker.createService({
    ...
    events: {
        something(payload, sender) {
            console.log(`Something happened on '${sender}':`, payload);			
        }
    }
});
```

## Distributed timeout handling
Moleculer uses [distributed timeouts](https://www.datawire.io/guide/traffic/deadlines-distributed-timeouts-microservices/).In the chained calls the `ctx.call` decrement the original timeout value with the elapsed time. If the new calculated timeout is less or equal than 0, it'll skip the next calls because the first call is rejected with `RequestTimeoutError` error.


--------------------------------------------------


<a name="0.6.0"></a>
# 0.6.0 (2017-03-31)

# New

## Validator library changed
The previous `validatorjs` validator removed and added own very fast [fastest-validator](https://github.com/icebob/fastest-validator) library. It can 3M validations/sec. Hereafter validation is not the bottle-neck. Only -7% slower with validation.

**Here is the new benchmark result:**
```
Suite: Call with param validator
√ No validator x 588,463 ops/sec ±1.11% (84 runs sampled)
√ With validator passes x 541,903 ops/sec ±1.41% (84 runs sampled)
√ With validator fail x 25,648 ops/sec ±1.62% (85 runs sampled)
   No validator              0.00%    (588,463 ops/sec)
   With validator passes    -7.91%    (541,903 ops/sec)
   With validator fail     -95.64%     (25,648 ops/sec)
```

**Example params definition:**
```js
mult: {
    params: {
        a: { type: "number" },
        b: { type: "number" }
    },
    handler(ctx) {
        return Number(ctx.params.a) * Number(ctx.params.b);
    }
}
```

**Validation error object:**
```js
[ { 
    type: 'number',
    field: 'b',
    message: 'The \'b\' field must be a number!' 
} ]
```

# Changes
## Added & removed log levels
* Added 2 new log levels (`fatal` and `trace`);
* Removed unused `log` level. Use `info` level instead.

**Available levels:**
```js
logger.trace("trace level");
logger.debug("debug level");
logger.info("info level");
logger.warn("warn level");
logger.error("error level");	
logger.fatal("fatal level");
```

**Logger fallback levels:**
* `trace` -> `debug` -> `info`
* `debug` -> `info`
* `info`: main level, no fallback
* `warn` -> `error` -> `info`
* `error` -> `info`
* `fatal` -> `error` -> `info`


--------------------------------------------------


<a name="0.5.0"></a>
# 0.5.0 (2017-02-26)

First release.
