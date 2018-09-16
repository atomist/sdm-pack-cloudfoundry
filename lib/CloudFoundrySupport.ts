/*
 * Copyright © 2018 Atomist, Inc.
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

import {
    ExtensionPack,
    metadata,
} from "@atomist/sdm";
import { AddCloudFoundryManifest } from "./handlers/addCloudFoundryManifest";
import { enableDeployOnCloudFoundryManifestAddition } from "./listeners/enableDeployOnCloudFoundryManifestAddition";
import {
    SuggestAddingCloudFoundryManifest,
    suggestAddingCloudFoundryManifestOnNewRepo,
} from "./listeners/suggestAddingCloudFoundryManifest";

export const CloudFoundrySupport: ExtensionPack = {
    ...metadata("cloud-foundry"),
    requiredConfigurationValues: [
        "sdm.cloudfoundry.user",
        "sdm.cloudfoundry.password",
        "sdm.cloudfoundry.org",
        "sdm.cloudfoundry.spaces.production",
        "sdm.cloudfoundry.spaces.staging",
    ],
    configure: sdm => {
        sdm
            .addCodeTransformCommand(AddCloudFoundryManifest)
            .addChannelLinkListener(SuggestAddingCloudFoundryManifest)
            .addFirstPushListener(suggestAddingCloudFoundryManifestOnNewRepo(sdm.configuration.sdm.projectLoader))
            .addPushImpactListener(enableDeployOnCloudFoundryManifestAddition(sdm));
    },
};
