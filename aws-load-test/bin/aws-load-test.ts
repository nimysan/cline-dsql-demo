#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LoadTestStack } from '../lib/load-test-stack';

const app = new cdk.App();
new LoadTestStack(app, 'PgLoadTestStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
  description: 'PostgreSQL Load Testing Infrastructure with Locust and Auto Scaling Group'
});
