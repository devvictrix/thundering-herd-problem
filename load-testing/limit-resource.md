To limit resources in your [`docker-compose.yml`](docker-compose.yml:1), you can use the `deploy` and `resources` sections for each service. Here's how to implement resource constraints for your load testing environment:

## Resource Limitation Options

### 1. Basic Resource Limits

Add resource constraints to your services like this:

```yaml
services:
  nestjs:
    build:
      context: ./nestjs
      dockerfile: Dockerfile
    container_name: nestjs
    ports:
      - "8080:3000"
    deploy:
      resources:
        limits:
          cpus: '2.0'        # Limit to 2 CPU cores
          memory: 2G         # Limit to 2GB RAM
        reservations:
          cpus: '1.0'        # Reserve 1 CPU core
          memory: 1G         # Reserve 1GB RAM
```

### 2. Complete Example for Your Setup

Here's how to modify your entire [`docker-compose.yml`](docker-compose.yml:1) with appropriate resource limits:

```yaml
services:
  # Jaeger for trace visualization
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: jaeger
    ports:
      - "16686:16686"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    networks:
      - app-network

  # Ollama LLM Service
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    pull_policy: always
    tty: true
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
    networks:
      - app-network

  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
      - POSTGRES_SHARED_PRELOAD_LIBRARIES=pg_stat_statements
      - POSTGRES_MAX_CONNECTIONS=200
    volumes:
      - postgres-data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    networks:
      - app-network

  nestjs:
    build:
      context: ./nestjs
      dockerfile: Dockerfile
    container_name: nestjs
    ports:
      - "8080:3000"
    environment:
      - PORT=3000
      - OTEL_SERVICE_NAME=nestjs
      - OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:4318/v1/traces
      - DATABASE_URL=file:./dev.db
    depends_on:
      - ollama
      - jaeger
      - postgres
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    networks:
      - app-network
```

## Resource Limitation Strategies for Load Testing

### 1. Simulating Production Constraints

To mimic production-like resource constraints:

```yaml
# For a production-like environment with limited resources
deploy:
  resources:
    limits:
      cpus: '1.0'        # Simulate single-core production server
      memory: 1G         # Simulate limited production memory
```

### 2. Progressive Resource Scaling

Create multiple compose files for different scenarios:

**docker-compose.limited.yml** (for testing resource constraints):
```yaml
version: '3.8'
services:
  nestjs:
    deploy:
      resources:
        limits:
          cpus: '0.5'     # Very limited CPU
          memory: 512M    # Very limited memory
```

**docker-compose.unlimited.yml** (for maximum performance testing):
```yaml
version: '3.8'
services:
  nestjs:
    deploy:
      resources:
        limits:
          cpus: '4.0'     # More CPU available
          memory: 4G      # More memory available
```

Use them with: `docker-compose -f docker-compose.yml -f docker-compose.limited.yml up`

### 3. Dynamic Resource Adjustment

For testing different resource scenarios:

```yaml
# Use environment variables for dynamic resource allocation
services:
  nestjs:
    deploy:
      resources:
        limits:
          cpus: ${NESTJS_CPU_LIMIT:-'2.0'}
          memory: ${NESTJS_MEMORY_LIMIT:-'2G'}
```

Then run with: `NESTJS_CPU_LIMIT=1.0 NESTJS_MEMORY_LIMIT=1G docker-compose up`

## Monitoring Resource Usage

### 1. Real-time Monitoring

```bash
# Monitor container resource usage
docker stats

# Detailed monitoring for specific containers
docker stats nestjs postgres jaeger ollama

# Continuous monitoring with output formatting
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
```

### 2. Historical Monitoring

Add cAdvisor to your compose for detailed metrics:

```yaml
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  container_name: cadvisor
  ports:
    - "8081:8080"
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
    - /dev/disk/:/dev/disk:ro
  privileged: true
  devices:
    - /dev/kmsg
  networks:
    - app-network
```

## Best Practices for Load Testing Resource Limits

### 1. Start with Conservative Limits

Begin with lower resource limits and gradually increase them:

```yaml
# Initial conservative limits
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
```

### 2. Monitor Resource Saturation

Watch for these indicators during load testing:

- **CPU**: Consistently above 80%
- **Memory**: Approaching limits with OOM risks
- **I/O**: High disk or network I/O wait times
- **Context Switching**: High rates indicating CPU contention

### 3. Document Resource Profiles

Create documented resource profiles for different scenarios:

| Profile | CPU Limit | Memory Limit | Use Case |
|---------|-----------|--------------|----------|
| Minimal | 0.5 cores | 512MB | Testing resource constraints |
| Development | 1.0 cores | 1GB | Normal development |
| Staging | 2.0 cores | 2GB | Pre-production testing |
| Production | 4.0 cores | 4GB | Production-like performance |