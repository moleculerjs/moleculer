# Roadmap

## v0.7.x
- [x] [Distributed request timeout](https://www.datawire.io/guide/traffic/deadlines-distributed-timeouts-microservices/). Reduce the original timeout value in every calls.
- [x] metricsRate: doesn't measure every request
- [x] add nodeID to EVENT package and it will be the 3rd param in event handlers
- [x] move heart-beat handling to `Transit` class.
- [x] meta in context which will be transported. (for user, session, state...etc)
- [x] create d.ts file
- [x] pluggable serializer for transport
	- [x] JSON parse/stringify
	- [x] [Avro](https://github.com/mtth/avsc)
    - [x] [MsgPack](https://github.com/mcollina/msgpack5)
	- [x] [ProtoBuf](https://developers.google.com/protocol-buffers/)	

## v0.8.x
- [ ] direct remote call to a specified node (for monitoring every node)
- [ ] multi broker.call (array params & returns with array result )
- [ ] official Zipkin tracer service
- [ ] RabbitMQ transporter
- [ ] create a multi-pages docs & generate a static site from it.
	- [ ] https://github.com/segmentio/metalsmith
- [ ] add lru features to Memory and Redis cachers

- [ ] official API gateway service (Native, Express, [Aero](https://github.com/aerojs/aero), [uWebsocket HTTP](https://github.com/uWebSockets/bindings/blob/master/nodejs/examples/http_sillybenchmark.js), [benchmark](https://github.com/blitzprog/webserver-benchmarks))

## v1.0.x
It will be the first stable release. Afterwards the version numbers should follow semver versioning.

- [ ] more [offical examples](https://github.com/ice-services/moleculer-examples)

## Others in the future

### Gobal configuration
Every service can get the config from the broker (in constructor).
The result is a merged configuration from the common & the specified service config.
```js
{
	common: {
		port: 3000,
		db: {
			uri: "mongo://localhost"
		}
	},

	services: {
		posts: {
			db: {
				uri: "couchdb://localhost"
			}
		}
	}
}
```
In this case, if `posts` service asks the config, it'll get 
```js
{
	port: 3000,
	db: {
		uri: "couchdb://localhost"
	}
}
```

### Other transporters
- websocket
- [AutobahnJS](http://autobahn.ws/js/) [server](https://github.com/Orange-OpenSource/wamp.rt) or [server in go](https://github.com/jcelliott/turnpike)
- add gzip support

### Service dependency
Wait for all dependent service will be available. After it, call the `started` event handler of service.
[example](http://www.slideshare.net/adriancockcroft/microservices-whats-missing-oreilly-software-architecture-new-york#24)

### CLI helper tool
Create a command line tool to generate Moleculer project & modules.

* `moleculer init` - create an empty Moleculer based project with sample code
	* prompts for transporter, cacher, metrics, stats options
* `moleculer add service` - create a new empty service. Ask name and version of service, action names.

* `moleculer add middleware` - create a new empty middleware.

	- https://github.com/sboudrias/Inquirer.js
	- https://github.com/tj/consolidate.js
	- https://github.com/mattallty/Caporal.js
	- https://github.com/tj/ngen 
	- https://github.com/senecajs/seneca-repl/blob/master/repl.js 
