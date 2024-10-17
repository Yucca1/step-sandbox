import json

data = [
    {
        "partTimeWorkerId": "123456",
        "hourlyPay": 1000,
    },
    {
        "partTimeWorkerId": "654321",
        "hourlyPay": 1200,
    },
]


class NotFoundException(Exception):
    pass


def fetchHourlyPay(partTimeWorkerId):
    for worker in data:
        if worker["partTimeWorkerId"] == partTimeWorkerId:
            return worker["hourlyPay"]
    return None


def handler(event, context):
    print(dict(event=event, context=context))
    hourlyPay = fetchHourlyPay(event["partTimeWorkerId"])
    if hourlyPay is None:
        raise NotFoundException("Specified workerId was not found.")
    return {"statusCode": 200, "body": json.dumps({"hourlyPay": hourlyPay})}
