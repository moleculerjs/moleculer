# Moleculer Trace Exporters

## Running Jaeger

```bash
docker run -d --name jaeger -p 5775:5775/udp -p 6831:6831/udp -p 6832:6832/udp -p 5778:5778 -p 16686:16686 -p 14250:14250 -p 14268:14268 -p 14269:14269 jaegertracing/all-in-one:latest
```

**UI:** http://<docker-ip>:16686/

## Running Zipkin

```bash
docker run -d -p 9411:9411 --name=zipkin openzipkin/zipkin
```

## Running DataDog Agent

```bash
docker run -d --name dd-agent --restart unless-stopped -v /var/run/docker.sock:/var/run/docker.sock:ro -v /proc/:/host/proc/:ro -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro -e DD_API_KEY=123456 -e DD_APM_ENABLED=true -e DD_APM_NON_LOCAL_TRAFFIC=true -p 8126:8126  datadog/agent:latest
```
