import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks'
import { Construct } from 'constructs'

export class StepStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const helloFunction = new lambda.Function(this, 'MyLambdaFunction', {
      code: lambda.Code.fromAsset('lambda'),
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'hello_world.handler',
      timeout: cdk.Duration.seconds(3)
    })

    const stateMachine = new sfn.StateMachine(this, 'MyStateMachine', {
      definition: new tasks.LambdaInvoke(this, 'MyLambdaTask', {
        lambdaFunction: helloFunction
      }).next(new sfn.Succeed(this, 'GreetedWorld'))
    })
  }
}
