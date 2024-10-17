import json


data = [
    {
        "partTimeWorkerId": "123456",
        "monthlyEarnings": {"202408": 30000, "202409": 40000},
    },
    {
        "partTimeWorkerId": "654321",
        "monthlyEarnings": {"202408": 20000, "202409": 10000},
    },
]


class NotFoundException(Exception):
    pass


def fetchMonthlyEarnings(partTimeWorkerId, yearMonth):
    for worker in data:
        if worker["partTimeWorkerId"] == partTimeWorkerId:
            return worker["monthlyEarnings"].get(yearMonth, None)
    return None


def handler(event, context):
    print(dict(event=event, context=context))
    monthlyEarnings = fetchMonthlyEarnings(
        event["partTimeWorkerId"], event["yearMonth"]
    )
    if monthlyEarnings is None:
        raise NotFoundException("Specified workerId or yearMonth was not found.")
    return {"statusCode": 200, "body": json.dumps({"montlyEarnings": monthlyEarnings})}
