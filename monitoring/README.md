# Monitoring Module


## Overview

This module adds monitoring to the Transcendence project using **Prometheus**, **Grafana**, and **Node Exporter**.

The goal is to monitor both the application and the host machine in real time.


## Architecture

Browser
   |
   | HTTPS :3000
   v
+-----------------------------+
|        Frontend React       |
|        quiz_frontend        |
|        port 3000            |
+-----------------------------+
   |
   | HTTPS vers backend:4000
   | REST API
   | WebSocket
   v
+-----------------------------+
|        Backend NestJS       |
|        quiz_backend         |
|        port 4000            |
|                             |
|  /health                    |
|  Auth / Users / Friends     |
|  Quizzes / Rooms / Scores   |
|  WebSocket Gateway          |
|  /metrics    ------------------------------+
+-----------------------------+              |
   |                                         |
   | Prisma ORM                              |
   | SQL :5432                               |  +---------------+
   v                                         |  | Node Exporter |
+-----------------------------+              |  |   :9100       |
|        PostgreSQL DB        |              |  +---------------+
|        quiz_db              |              |        |
|        port 5432            |              |        |
|        Persistent Volume    |              |        |
|        postgres_volume      |              | Scrape |
+-----------------------------+              |  HTTP  |
                          		               |        |
                          		               |        |
                          		               |        |
                                             |        |
                                             V        V
                                      +---------------------+
                                      |     Prometheus      |
                                      |     :9090           |
                                      |                     |
                                      | Collects Metrics    |
                                      | Stores Metrics      |
                                      +---------------------+
                                                |
                                                | datasource
                                                v
                                      +---------------------+
                                      |       Grafana       |
                                      |       :3001         |
                                      | dashboards / alerts |
                                      +---------------------+

## How it works

1. The backend exposes metrics through the `/metrics` endpoint.
2. Node Exporter exposes host machine metrics on port `9100`.
3. Prometheus collects metrics from both targets.
4. Grafana uses Prometheus as a data source.
5. Dashboards display the collected metrics in real time.


## Components

### Prometheus

Prometheus collects metrics from different targets.

Current targets:

* Backend metrics
* Node Exporter metrics

Example:

```yaml
scrape_configs:
  - job_name: backend
    static_configs:
      - targets: ['backend:4000']

  - job_name: node-exporter
    static_configs:
      - targets: ['node-exporter:9100']
```

### Node Exporter

Node Exporter provides host machine metrics such as:

* CPU usage
* Memory usage
* Disk usage
* Network traffic
* System uptime

### Grafana

Grafana is used to visualize collected metrics through dashboards.

The dashboard is automatically loaded using Grafana provisioning.

#### Provisioning

The provisioning folder automatically configures Grafana when the container starts.

```text
grafana/
└── provisioning/
    ├── datasources/
    │   └── prometheus.yml
    └── dashboards/
        └── dashboard.yml
```

`datasources/`

Defines Prometheus as a Grafana data source.

This avoids adding the data source manually through the Grafana interface.

`dashboards/`

Automatically loads dashboard files when Grafana starts.

This allows every developer to get the same dashboard configuration.


## Application Metrics

The backend exposes a `/metrics` endpoint.

Example:

```text
https://localhost:4000/metrics
```

Collected application metrics include:

### HTTP Requests

Total number of HTTP requests.

```promql
rate(http_requests_total[5m])
```

### Active Rooms

Current number of active game rooms.

```promql
active_rooms
```

### Connected WebSockets

Current number of connected websocket clients.

```promql
websocket_connections
```

### Online Users

Current number of users connected to the application.

```promql
online_users
```


## Infrastructure Metrics

Node Exporter is listened as service at port 9100.


Collected infrastructure metrics include:

### CPU Usage

```promql
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

Shows current CPU usage percentage.

### Memory Usage

```promql
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

Shows used memory percentage.

### Network Traffic

Incoming traffic:

```promql
rate(node_network_receive_bytes_total[5m])
```

Outgoing traffic:

```promql
rate(node_network_transmit_bytes_total[5m])
```

## Alerts

Prometheus alert rules are configured in:

```text
monitoring/prometheus/alerts.yml
```

Displays the current alert status:
http://localhost:9090/alerts

Displays all loaded alert rules:
http://localhost:9090/rules

Current alerts:

* BackendDown
* HighHttp5xxErrors


## Dashboard Organization

### Quiz Overview

* Online Users
* Active Rooms
* Games Active
* Games Started
* Games Ended

### Players Activity

* Correct Answer Rate
* Game Completion Rate

### Room Lifecycle

* Active Rooms Over Time
* Active WebSocket Connections Over Time

### Application Monitoring

* HTTP Requests by Endpoint

### Infrastructure Monitoring

* CPU Usage
* Memory Usage
* Network Traffic

### Monitoring Health

* Backend Status
* Prometheus Status
* Node Exporter Status


## Running the Module

Start all services:

```bash
docker compose up -d
```

or

```bash
make
```

Check Prometheus:

```text
http://localhost:9090
```

Check Grafana:

```text
http://localhost:3001
```

Default Grafana credentials:

```text
Username: admin
Password: admin
```

You can change them in `.env.example`:

GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=change_me
