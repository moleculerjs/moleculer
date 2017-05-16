# Roadmap

## v0.8.x
- [ ] direct remote call to a specified node (for monitoring every node)
- [ ] multi broker.call (array params & returns with array result )
- [ ] official Zipkin tracer service
- [ ] RabbitMQ transporter
- [ ] create a multi-pages docs & generate a static site from it.
	- [ ] https://github.com/segmentio/metalsmith
- [ ] add lru features to Memory and Redis cachers

- [x] official API gateway service (Native, Express)

------------------------------

## v0.9.x

------------------------------

## v0.10.x

------------------------------

## v1.0.x
It will be the first stable production-ready release. Afterwards the version numbers should follow semver versioning.

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

