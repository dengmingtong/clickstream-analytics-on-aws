"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
import json
import enums

# application type, you can switch to `enums.Application.Shopping` to send shopping events.
APP_TYPE = enums.Application.Shopping

# for history event consts
DURATION_OF_DAYS = 30
PER_ACTION_DURATION = range(3, 60)
EVENTS_PER_REQUEST = 10000
MAX_BATCH_REQUEST_NUMBER = 20
# gzip process number, for mac m1 is 8, for c5.metal is 50 to meet best performance
PROCESS_NUMBER = 50
# control the speed for event send.
MAX_UPLOAD_THREAD_NUMBER = 1
REQUEST_SLEEP_TIME = 0.2
GZIP_TIMES_PER_DAY = 1

# for real-time event consts
ALL_USER_REALTIME = 100000
RANDOM_DAU_REALTIME = range(1000, 1001)
THREAD_NUMBER_FOR_USER = 20
FLUSH_DURATION = 3   # seconds
BATCH_EVENT_DURATION_IN_MINUTES = 2
IS_LOG_FULL_REQUEST_MESSAGE = False

# common settings
SESSION_TIMES = range(4, 5)
IS_GZIP = True

# notepad configure
ALL_USER = 10000
RANDOM_DAU = range(1000, 2000)
ACTION_TIMES = range(0, 30)
# for real-time mode
PER_ACTION_DURATION_REALTIME = range(0, 5)

# shopping configure
ALL_USER_SHOPPING = 30000
RANDOM_DAU_SHOPPING = range(3000, 6000)
PLATFORM = enums.Platform.All

# following value will be replaced by amplifyconfiguration.json file.
APP_ID = ""
ENDPOINT = ""


def init_config():
    global APP_ID, ENDPOINT, IS_GZIP, REQUEST_SLEEP_TIME, MAX_UPLOAD_THREAD_NUMBER, EVENTS_PER_REQUEST
    try:
        with open('amplifyconfiguration.json') as file:
            data = json.load(file)
            APP_ID = data['analytics']['plugins']['awsClickstreamPlugin']['appId']
            ENDPOINT = data['analytics']['plugins']['awsClickstreamPlugin']['endpoint']
            IS_GZIP = data['analytics']['plugins']['awsClickstreamPlugin']['isCompressEvents']
            if not IS_GZIP:
                REQUEST_SLEEP_TIME = 0.1
                MAX_UPLOAD_THREAD_NUMBER = 1
                EVENTS_PER_REQUEST = 500
    except FileNotFoundError:
        print("Error: amplifyconfiguration.json file not found.")
    except json.JSONDecodeError:
        print("Error: when decoding the JSON file.")
    except KeyError:
        print("Error: error key in the JSON file.")
