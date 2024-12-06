import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class LoadTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with a single NAT Instance instead of NAT Gateway
    const vpc = new ec2.Vpc(this, 'LoadTestVPC', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        }
      ]
    });

    // Create IAM role for EC2 instances
    const ec2Role = new iam.Role(this, 'EC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    // Create security group for EC2 instances
    const securityGroup = new ec2.SecurityGroup(this, 'LoadTestSG', {
      vpc,
      description: 'Security group for load test instances',
      allowAllOutbound: true,
    });

    // Allow inbound traffic for Locust
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8089),
      'Allow Locust web interface'
    );

    // Allow communication between Locust master and workers
    securityGroup.addIngressRule(
      securityGroup,
      ec2.Port.tcp(5557),
      'Allow Locust master-worker communication'
    );

    // Create Auto Scaling Group for Locust master
    const masterASG = new autoscaling.AutoScalingGroup(this, 'LoadTestMasterASG', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      minCapacity: 1,
      maxCapacity: 1,
      desiredCapacity: 1,
      role: ec2Role,
      securityGroup,
      associatePublicIpAddress: true,
      keyName: 'us-east-1', // Using existing key pair
    });

    // Create Auto Scaling Group for Locust workers
    const workerASG = new autoscaling.AutoScalingGroup(this, 'LoadTestWorkerASG', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      minCapacity: 1,
      maxCapacity: 5,
      desiredCapacity: 2,
      role: ec2Role,
      securityGroup,
      associatePublicIpAddress: true,
      keyName: 'us-east-1', // Using existing key pair
    });

    // Add user data script for master node
    const masterUserDataScript = `
#!/bin/bash
yum update -y
yum install -y python3-pip git

# Install Node.js for TypeScript support
curl -sL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs

# Clone the repository
git clone https://github.com/nimysan/cline-dsql-demo.git
cd videomaker

# Install dependencies
pip3 install locust psycopg2-binary

# Copy the Locust file to the appropriate location
mkdir -p aws-load-test/locust
cp aws-load-test/locust/locustfile.py /home/ec2-user/locustfile.py

# Start Locust master
locust --master --host=http://localhost:8089
`;

    // Add user data script for worker nodes
    const workerUserDataScript = `
#!/bin/bash
yum update -y
yum install -y python3-pip git

# Install Node.js for TypeScript support
curl -sL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs

# Clone the repository
git clone https://github.com/your-repo/videomaker.git
cd videomaker

# Install dependencies
pip3 install locust psycopg2-binary

# Copy the Locust file to the appropriate location
mkdir -p aws-load-test/locust
cp aws-load-test/locust/locustfile.py /home/ec2-user/locustfile.py

# Get master node IP (using AWS CLI to get the first instance from master ASG)
MASTER_IP=$(aws ec2 describe-instances --filters "Name=tag:aws:autoscaling:groupName,Values=LoadTestMasterASG" --query "Reservations[0].Instances[0].PrivateIpAddress" --output text)

# Start Locust worker
locust --worker --master-host=$MASTER_IP
`;

    masterASG.addUserData(masterUserDataScript);
    workerASG.addUserData(workerUserDataScript);

    // Output the master node's public DNS
    new cdk.CfnOutput(this, 'LocustMasterDNS', {
      value: masterASG.autoScalingGroupName,
      description: 'Auto Scaling Group name for Locust master node',
    });
  }
}
