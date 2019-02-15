/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { logger } from "@atomist/automation-client";
import {
    TechnologyElement,
    TechnologyScanner,
} from "@atomist/sdm-pack-analysis";

export interface CloudFoundryStack extends TechnologyElement {
    name: "cloudfoundry";
}

export const cloudFoundryScanner: TechnologyScanner<CloudFoundryStack> = async p => {
    const cfManifest = await p.getFile("manifest.yml");
    if (!cfManifest) {
        return undefined;
    }
    logger.info("Found Cloud Foundry manifest in project at %s", p.id.url);
    return {
        name: "cloudfoundry",
        tags: [ "cloudfoundry"],
    };
};
