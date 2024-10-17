import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks'
import { Construct } from 'constructs'

export class StepStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // 月収取得Lambda
    const fetchMonthlyEarningsFunction = new lambda.Function(this, 'fetchMonthlyEarnings', {
      code: lambda.Code.fromAsset('lambda'),
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'fetchMonthlyEarnings.handler',
      timeout: cdk.Duration.seconds(3)
    })

    // 単価取得Lambda
    const fetchHourlyPayFunction = new lambda.Function(this, 'fetchHourlyPay', {
      code: lambda.Code.fromAsset('lambda'),
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'fetchHourlyPay.handler',
      timeout: cdk.Duration.seconds(3)
    })

    // 勤務時間計算Lambda
    const calculateWorkHoursFunction = new lambda.Function(this, 'calculateWorkHours', {
      code: lambda.Code.fromAsset('lambda'),
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'calculateWorkHours.handler',
      timeout: cdk.Duration.seconds(3)
    })

    // 勤務時間と単価から給料計算するLambda
    const calculateEarningsFunction = new lambda.Function(this, 'calculateMonthlyEarnings', {
      code: lambda.Code.fromAsset('lambda'),
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'calculateMonthlyEarnings.handler',
      timeout: cdk.Duration.seconds(3)
    })

    // 年月を指定して過去の給料を取得する処理
    // 月収取得Lambda呼び出し
    const fetchMonthlyEarningsTask = new tasks.LambdaInvoke(this, 'fetchMonthlyEarningsTask', {
      lambdaFunction: fetchMonthlyEarningsFunction,
      payloadResponseOnly: true // レスポンスをPayloadのみにする
    })
      .addCatch(
        new sfn.Fail(this, 'fetchMonthlyEarningsFail', { cause: 'fetchMonthlyEarnings Error' })
      )
      .addRetry({
        errors: ['States.ALL'], // すべてのエラーが対象
        maxAttempts: 1
      })
      .next(new sfn.Succeed(this, 'fetchMonthlyEarningsSucceed'))

    // 勤務時間から給料を計算する処理
    // 単価取得処理と勤務時間計算処理を並列呼び出し
    const calculateEarningsByWorkHours = new sfn.Parallel(this, 'parallelProcess')
    calculateEarningsByWorkHours.branch(
      new tasks.LambdaInvoke(this, 'fetchHourlyPayTask', {
        lambdaFunction: fetchHourlyPayFunction
      })
    )
    calculateEarningsByWorkHours.branch(
      // 勤務時間は時間帯を複数指定可能とするため、Mapにより指定した数だけ集計する
      new sfn.Map(this, 'mapProcess', {
        itemsPath: sfn.JsonPath.stringAt('$.workHours'),
        maxConcurrency: 1,
        resultPath: '$.mapOutput'
      }).itemProcessor(
        new tasks.LambdaInvoke(this, 'calculateWorkHoursTask', {
          lambdaFunction: calculateWorkHoursFunction
        })
      )
    )
    calculateEarningsByWorkHours.addCatch(
      new sfn.Fail(this, 'parallelProcessFail', { cause: 'Error in parallel process' })
    )
    calculateEarningsByWorkHours
      .next(
        new tasks.LambdaInvoke(this, 'calculateMonthlyEarningsTask', {
          lambdaFunction: calculateEarningsFunction,
          payloadResponseOnly: true // レスポンスをPayloadのみにする
        }).addCatch(
          new sfn.Fail(this, 'calculateEarningsByWorkHoursFail', {
            cause: 'calculateEarning Error'
          })
        )
      )
      .next(new sfn.Succeed(this, 'calculateEarningsByWorkHoursSucceed'))

    // アルバイト給料ステートマシン
    new sfn.StateMachine(this, 'PartTimeWorkerEarningsStateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(
        new sfn.Choice(this, 'isYearMonthSpecified')
          // 年月が指定されている場合、給料情報をDB等から取得する
          .when(sfn.Condition.isPresent('$.yearMonth'), fetchMonthlyEarningsTask)
          // 年月が指定されていない場合、勤務時間の指定をもとに給料を計算する
          .otherwise(calculateEarningsByWorkHours)
      )
    })
  }
}
