import json
from datetime import datetime


def toDatetime(datetimeString):
    return datetime.strptime(datetimeString, "%Y%m%d %H:%M")


def handler(event, context):
    print(dict(event=event, context=context))
    # 開始・終了日時(yyyymmdd HH:MM)から勤務時間(H)を計算
    startDatetime = toDatetime(event["start"])
    endDatetime = toDatetime(event["end"])
    diff = endDatetime - startDatetime
    return {"statusCode": 200, "body": json.dumps({"workHours": diff.seconds / 3600.0})}
