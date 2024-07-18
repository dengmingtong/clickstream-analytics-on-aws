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
import os

# application type, you can switch to `enums.Application.Shopping` to send shopping events.
APP_TYPE = enums.Application.Shopping

# for performance tool
ALL_USER_REALTIME_PERFORMANCE = 1000000
RANDOM_DAU_PERFORMANCE = range(100000, 100001)
THREAD_NUMBER_FOR_USER_PERFORMANCE = 1
FLUSH_DURATION_PERFORMANCE = 3
BATCH_EVENT_DURATION_IN_MINUTES_PERFORMANCE = 2
NEED_SLEEP = True
# 100 RPS
# PERFORMANCE_SLEEP_TIME = 0.005
# 10 RPS
# PERFORMANCE_SLEEP_TIME = 0.08
# 1000 RPS
PERFORMANCE_SLEEP_TIME = 0.003

# common settings
SESSION_TIMES = range(1, 4)
IS_GZIP = True

# notepad configure
ALL_USER = 10000
RANDOM_DAU = range(1000, 2000)
ACTION_TIMES = range(0, 30)
# for real-time mode
PER_ACTION_DURATION_REALTIME = range(0, 5)

# shopping configure
ALL_USER_SHOPPING = 5000
RANDOM_DAU_SHOPPING = range(300, 400)
PLATFORM = enums.Platform.All
# the number of products on one page of the shopping application, the minimum value is 2
MAIN_PAGE_PRODUCT_COUNT = 4
DEFAULT_PRODUCT_COUNT = 2

# following value will be replaced by amplifyconfiguration.json file.
APP_ID = ""
ENDPOINT = ""

def init_config():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, 'amplifyconfiguration.json')
    global APP_ID, ENDPOINT, IS_GZIP, REQUEST_SLEEP_TIME, MAX_UPLOAD_THREAD_NUMBER, EVENTS_PER_REQUEST
    try:
        with open(config_path) as file:
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
