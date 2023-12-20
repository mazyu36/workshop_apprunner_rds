import { Construct } from 'constructs';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
export interface NetworkProps {

}

export class NetworkConstruct extends Construct {
  public readonly vpc: ec2.Vpc
  constructor(scope: Construct, id: string, props: NetworkProps) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      natGateways: 1,
      maxAzs: 3,
      ipAddresses: ec2.IpAddresses.cidr(`10.0.0.0/16`),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'PrivateSubnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true
    }
    )

    this.vpc = vpc




  }
}