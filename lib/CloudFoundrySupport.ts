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
} from "@atomist/sdm";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import {AddCloudFoundryManifest} from "./handlers/addCloudFoundryManifest";
import {
    SuggestAddingCloudFoundryManifest,
    suggestAddingCloudFoundryManifestOnNewRepo
} from "./listeners/suggestAddingCloudFoundryManifest";
import {enableDeployOnCloudFoundryManifestAddition} from "./listeners/enableDeployOnCloudFoundryManifestAddition";

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
            .addNewRepoWithCodeListener(suggestAddingCloudFoundryManifestOnNewRepo(sdm.configuration.sdm.projectLoader))
            .addPushReaction(enableDeployOnCloudFoundryManifestAddition(sdm));
    },
};
