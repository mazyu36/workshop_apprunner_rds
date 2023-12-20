import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NetworkConstruct } from './construct/network';
import { AppRunnerConstruct } from './construct/apprunner';
import { DatabaseConstruct } from './construct/database';

export class ApprunnerRdsWorkshopStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);




    const network = new NetworkConstruct(this, 'Network', {})

    const database = new DatabaseConstruct(this, 'Database', {
      vpc: network.vpc
    })

    new AppRunnerConstruct(this, 'AppRunner', {
      vpc: network.vpc,
      databaseCluster: database.databaseCluster,
    })
  }
}
