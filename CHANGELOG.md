--------------------------------------------------
<a name="0.13.0"></a>
# [0.13.0](https://github.com/moleculerjs/moleculer/compare/v0.12.4...v0.13.0) (2018-xx-xx)

# Breaking changes

## Streaming support
TODO

## Better Service & Broker lifecycle handling
TODO

## Default console logger
No need to set `logger: console` in broker options, because ServiceBroker uses `console` as default logger.

```js
const broker = new ServiceBroker();
```

**Disable loggging**
```js
const broker = new ServiceBroker({ logger: false });
```

## Improved Circuit Breaker
Threshold-based circuit-breaker solution has been implemented.

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

>Circuit-breaker events payload is changed as well.


## Internal statistics module is removed
The internal statistics module (`$node.stats`) is removed. We will release it as a separated single Moleculer service in the future.

## Some internal feature is exposed to internal middlewares
- Timeout
- Retry
- Circuit Breaker
- Metrics
- Context tracking

`broker.options.internalMiddlewares = false`

## Improved request retry feature (with exponential backoff)

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

```js
broker.call("posts.find", {}, { retries: 3 });
```

TODO action level settings

## Renamed errors
Some errors have been renamed in order to follow name conventions.
- `ServiceNotAvailable` -> `ServiceNotAvailableError`
- `RequestRejected` -> `RequestRejectedError`
- `QueueIsFull` -> `QueueIsFullError`
- `InvalidPacketData` -> `InvalidPacketDataError`

## Context nodeID changes
The `ctx.callerNodeID` has been removed. The `ctx.nodeID` always contains the target or caller nodeID. If you need the current nodeID, use `ctx.broker.nodeID`.

## Internal event sending logic is changed
The `$` prefixed internal events will be transferred if they are called by `emit` or `broadcast`. 

# New

## New extended middlewares
TODO

## Enhanced log level configuration 
There is a new module-based log level configuration. You can set log levels for every Moleculer module. You can use wildcard too.

```js
const broker = new ServiceBroker({
    logger: console,
    logLevel: {
        "MY.**": false, // Disable logs
        "TRANS*": "warn",
        "*.GREETER": "debug",
        "**": "debug", // All other modules use this level
    }
});
```

>Internal modules: `BROKER`, `TRANS`, `TX` (transporter), `CACHER`, `REGISTRY`.

**Please note, it works only with default console logger. In case of external loggers (Pino, Windows, Bunyan, ...etc) you need to handle log levels.**

## New `short` log formatter

There is a new `short` log formatter. It's similar as the default, but doesn't print the date and `nodeID`.

```js
const broker = new ServiceBroker({
    logFormatter: "short"
});
```

## Cloning in MemoryCacher

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

**Custom clone function**
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

**Output**
```
[19:42:49.055Z] INFO  MATH: Service started.
```

## Enhanced ping method
It returns Promise with results of ping responses.

```js
broker.sendPing().then(console.log);
```

```js
broker.sendPing("node-123", 1000).then(console.log);
```

# Changes

- `Context.create` & `new Context` signature is changed.
- Context metrics methods is removed.
- `ctx.timeout` is moved to `ctx.options.timeout`

# Deprecations

- The `broker.use()` has been deprecated. Use `middlewares: [...]` in broker options instead.

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
- `broker.loadServices` file mask is changed from `*.service.js` to `**/*.service.js` in order to load all services from subfolders too.
- `ServiceNotFoundError` and `ServiceNotAvailableError` errors are retryable errors.
- `Strategy.select` method gets only available endpoint list.
- old unavailable nodes are removed from registry after 10 minutes.  
- CPU usage in `HEARTBEAT` packet is working properly in Windows too.
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
