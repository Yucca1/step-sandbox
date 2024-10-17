import json


def handler(event, context):
    print(dict(event=event, context=context))
    # parallelの処理結果は配列で得られる
    # 0番目: 単価取得処理の結果
    # 1番目: 勤務時間計算処理の結果
    hourlyPay = json.loads(event[0]["Payload"]["body"])["hourlyPay"]
    print(dict(hourlyPay=hourlyPay))
    workHours = 0
    for output in event[1]["mapOutput"]:
        workHours += json.loads(output["Payload"]["body"])["workHours"]
    print(dict(workHours=workHours))
    return {"statusCode": 200, "body": json.dumps({"earnings": workHours * hourlyPay})}
