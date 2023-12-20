import { Construct } from 'constructs';
import * as apprunner from '@aws-cdk/aws-apprunner-alpha';
import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_rds as rds } from 'aws-cdk-lib';
import { aws_ssm as ssm } from 'aws-cdk-lib';
import { aws_wafv2 as wafv2 } from "aws-cdk-lib";
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { CfnObservabilityConfiguration, CfnService } from 'aws-cdk-lib/aws-apprunner';


export interface AppRunnerConstructProps {
  vpc: ec2.Vpc,
  databaseCluster: rds.DatabaseCluster,
}

export class AppRunnerConstruct extends Construct {
  constructor(scope: Construct, id: string, props: AppRunnerConstructProps) {
    super(scope, id);

    // Dockerイメージのビルド・プッシュ
    const image = new DockerImageAsset(this, 'CDKAppRunnerSampleImage', {
      directory: '../ap',
      platform: Platform.LINUX_AMD64,
    });

    // VPC Connector
    const vpcConnector = new apprunner.VpcConnector(this, 'VpcConnector', {
      vpc: props.vpc,
      vpcSubnets: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }),
    })

    // AppRunner -> RDSのアクセス許可
    props.databaseCluster.connections.allowDefaultPortFrom(vpcConnector)


    // SSM Parameter Store
    const ssmParameter = new ssm.StringParameter(this, 'SsmParameter', {
      parameterName: 'HOTEL_NAME',
      stringValue: 'YOUR_HOTEL_NAME'
    });

    // App Runner Service
    const appRunnerService = new apprunner.Service(this, 'AppRunnerService', {
      cpu: apprunner.Cpu.ONE_VCPU,
      memory: apprunner.Memory.TWO_GB,
      source: apprunner.Source.fromAsset({
        asset: image,
        imageConfiguration: {
          port: 8080,
          environmentSecrets: {
            MYSQL_SECRET: apprunner.Secret.fromSecretsManager(props.databaseCluster.secret!),
            HOTEL_NAME: apprunner.Secret.fromSsmParameter(ssmParameter),
          }
        },
      }),
      vpcConnector: vpcConnector
    })


    // X-RAY有効化
    const cfnObservabilityConfig = new CfnObservabilityConfiguration(this, 'SampleAppRunnerObserveConfig', {
      observabilityConfigurationName: 'SampleAppRunnerObserveConfig',
      traceConfiguration: {
        vendor: 'AWSXRAY'
      }
    });
    const cfnService = appRunnerService.node.defaultChild as CfnService;
    cfnService.addPropertyOverride('ObservabilityConfiguration', {
      'ObservabilityEnabled': true,
      'ObservabilityConfigurationArn': cfnObservabilityConfig.ref
    })


    // WAF設定
    const appWaf = new wafv2.CfnWebACL(this, "AppRunnerWaf", {
      defaultAction: { allow: {} },
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: "App-Runner-Waf",
      },
      rules: [
        // AWSManagedRulesCommonRuleSet
        {
          priority: 1,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "AWS-AWSManagedRulesCommonRuleSet",
          },
          name: "AWSManagedRulesCommonRuleSet",
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
        },
        // AWSManagedRulesKnownBadInputsRuleSet
        {
          name: "AWSManagedRulesKnownBadInputsRuleSet",
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesKnownBadInputsRuleSet",
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            sampledRequestsEnabled: true,
            metricName: "AWSManagedRulesKnownBadInputsRuleSet",
          },
        },
      ],
    });

    // WebACLをApp Runnerに紐付け
    new wafv2.CfnWebACLAssociation(this, "Waf-App-Runner", {
      webAclArn: appWaf.attrArn,
      resourceArn: appRunnerService.serviceArn,
    });


    // App RunnerのURLを出力
    new cdk.CfnOutput(this, 'AppRunnerServiceUrl', {
      exportName: 'AppRunnerServiceUrl',
      value: appRunnerService.serviceUrl,
    })
  }
}