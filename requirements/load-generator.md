# Test with minimal load first
k6 run --vus 10 --duration 30s load-testing/load-test.js

# Test with 100 VUs
k6 run --vus 100 --duration 2m load-testing/load-test.js

# Test with 500 VUs
k6 run --vus 500 --duration 5m load-testing/load-test.js

# Test with 1000 VUs (monitor system resources closely)
k6 run --vus 1000 --duration 10m load-testing/load-test.js
