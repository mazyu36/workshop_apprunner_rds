#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApprunnerRdsWorkshopStack } from '../lib/apprunner-rds-workshop-stack';

const app = new cdk.App();
new ApprunnerRdsWorkshopStack(app, 'AppRunnerRdsWorkshopStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});