import { Construct } from 'constructs';
import { aws_rds as rds } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_logs as logs } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';

export interface DatabaseProps {
  vpc: ec2.Vpc

}

export class DatabaseConstruct extends Construct {
  public readonly databaseCluster: rds.DatabaseCluster
  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);


    const databaseCluster = new rds.DatabaseCluster(this, 'Database', {

      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_05_0
      }),
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }),
      credentials: rds.Credentials.fromGeneratedSecret('apprunner'),
      writer: rds.ClusterInstance.serverlessV2('Writer', {}),
      serverlessV2MaxCapacity: 1.0,
      serverlessV2MinCapacity: 0.5,
      cloudwatchLogsRetention: logs.RetentionDays.ONE_DAY,

      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    this.databaseCluster = databaseCluster

  }
}