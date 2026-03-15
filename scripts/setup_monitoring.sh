#!/bin/bash
# LocalPill GCP Monitoring & Logging Infrastructure Setup Script
# Run this script securely from your terminal where `gcloud` is authenticated.
# Requires: gcloud login, active billing on 'localpill-upcharmitra'

PROJECT_ID="localpill-upcharmitra"

echo "4. Creating Cloud Monitoring Alert: Function Failure Spikes..."
gcloud alpha monitoring policies create \
  --display-name="High Function Failure Rate" \
  --condition-display-name="Function execution with status error" \
  --condition-filter='metric.type="cloudfunctions.googleapis.com/function/execution_count" AND resource.type="cloud_function" AND metric.labels.status="error"' \
  --aggregation='{"alignmentPeriod": "60s", "crossSeriesReducer": "REDUCE_SUM", "perSeriesAligner": "ALIGN_RATE"}' \
  --if="> 5" \
  --duration="300s" \
  --trigger-count=1 \
  --combiner=OR \
  --project=${PROJECT_ID}

echo "5. Creating Cloud Monitoring Alert: Latency > 5 seconds..."
gcloud alpha monitoring policies create \
  --display-name="High Function Latency (>5s)" \
  --condition-display-name="Function execution time > 5s" \
  --condition-filter='metric.type="cloudfunctions.googleapis.com/function/execution_times" AND resource.type="cloud_function"' \
  --aggregation='{"alignmentPeriod": "60s", "crossSeriesReducer": "REDUCE_PERCENTILE_99", "perSeriesAligner": "ALIGN_DELTA"}' \
  --if="> 5000000000" \
  --duration="300s" \
  --trigger-count=1 \
  --combiner=OR \
  --project=${PROJECT_ID}

echo "✓ Infrastructure Monitoring successfully provisioned!"
