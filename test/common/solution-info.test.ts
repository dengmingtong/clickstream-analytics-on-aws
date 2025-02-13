/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { versionDetail } from '../../src/common/solution-info';

test ('parse solution version', () => {
  expect(versionDetail('v1.1.0-dev-main-202311081606-58f342d5'))
    .toEqual('(Version v1.1.0)(Build dev-main-202311081606-58f342d5)');

  expect(versionDetail('v1.1.0')).toEqual('(Version v1.1.0)');
});
