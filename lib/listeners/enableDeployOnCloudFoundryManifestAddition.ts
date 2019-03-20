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

import {
    PushImpactListener,
    PushImpactListenerRegistration,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import {
    setDeployEnablement,
    SetDeployEnablementParameters,
} from "@atomist/sdm-core/lib/handlers/commands/SetDeployEnablement";
import { AddCloudFoundryManifestMarker } from "../handlers/addCloudFoundryManifest";

export function enableDeployOnCloudFoundryManifestAdditionListener(
    sdm: SoftwareDeliveryMachine): PushImpactListener<any> {
    return async pil => {
        if (pil.push.commits.some(c => c.message.includes(AddCloudFoundryManifestMarker))) {
            const parameters: SetDeployEnablementParameters = {
                owner: pil.push.repo.owner,
                repo: pil.push.repo.name,
                providerId: pil.push.repo.org.provider.providerId,
                name: sdm.configuration.sdm.name,
                version: sdm.configuration.sdm.version,
            };

            await setDeployEnablement({
                commandName: "addCloudFoundryManifest",
                parameters,
                context: pil.context,
                credentials: pil.credentials,
                addressChannels: pil.addressChannels,
                ids: [pil.id],
                configuration: pil.configuration,
                preferences: pil.preferences,
                promptFor: () => Promise.resolve(undefined),
            }, true);
        }
    };
}

/**
 * Enable deployment when a PCF manifest is added to the default branch.
 */
export function enableDeployOnCloudFoundryManifestAddition(
    sdm: SoftwareDeliveryMachine): PushImpactListenerRegistration {
    return {
        name: "EnableDeployOnCloudFoundryManifestAddition",
        action: enableDeployOnCloudFoundryManifestAdditionListener(sdm),
    };
}
