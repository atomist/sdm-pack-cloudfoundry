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
    AutoCodeInspection,
    ExtensionPack,
    metadata,
    PushImpact,
    ReviewListenerRegistration,
} from "@atomist/sdm";
import { AddCloudFoundryManifest } from "./handlers/addCloudFoundryManifest";
import { enableDeployOnCloudFoundryManifestAddition } from "./listeners/enableDeployOnCloudFoundryManifestAddition";
import {
    SuggestAddingCloudFoundryManifest,
    suggestAddingCloudFoundryManifestOnNewRepo,
} from "./listeners/suggestAddingCloudFoundryManifest";

export interface CloudFoundrySupportOptions {

    /**
     * Inspect goal to add inspections to.
     * Review functionality won't work otherwise.
     */
    inspectGoal?: AutoCodeInspection;

    /**
     * Autofix goal to add autofixes to.
     * Autofix functionality won't work otherwise.
     */
    pushImpactGoal?: PushImpact;

    /**
     * Review listeners that let you publish review results.
     */
    reviewListeners?: ReviewListenerRegistration | ReviewListenerRegistration[];
}

export function CloudFoundrySupport(options: CloudFoundrySupportOptions): ExtensionPack {

    return {
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
                .addFirstPushListener(
                    suggestAddingCloudFoundryManifestOnNewRepo(sdm.configuration.sdm.projectLoader));

            if (!!options.inspectGoal) {
                    if (options.reviewListeners) {
                        const listeners = Array.isArray(options.reviewListeners) ?
                            options.reviewListeners : [options.reviewListeners];
                        listeners.forEach(l => options.inspectGoal.withListener(l));
                    }
            }
            if (!!options.pushImpactGoal) {
                options.pushImpactGoal
                    .with(enableDeployOnCloudFoundryManifestAddition(sdm));
            }
        },
    };
}
