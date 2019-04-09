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
    editModes,
} from "@atomist/automation-client";
import {
    CodeTransform,
    CodeTransformRegistration,
} from "@atomist/sdm";

export const AddCloudFoundryManifestMarker = "[atomist:add-pcf-manifest]";

// Using this marker removes some buttons on the Pull Request
export const AtomistGeneratedMarker = "[atomist:generated]";

// This should not have been invoked unless it's a Spring or Node project
export const addCloudFoundryManifestTransform: CodeTransform = async (p, ctx) => {
        return p.addFile("manifest.yaml", defaultManifest(p.id.repo, ctx.context.workspaceId));
};

/**
 * Command handler wrapping AddCloudFoundryManifest editor
 * @type {HandleCommand<EditOneOrAllParameters>}
 */
export const AddCloudFoundryManifest: CodeTransformRegistration = {
    transform: addCloudFoundryManifestTransform,
    name: "AddCloudFoundryManifest",
    intent: "Add Cloud Foundry manifest",
    transformPresentation: () => new editModes.PullRequest(
        `add-pcf-manifest-${Date.now()}`,
        "Add Cloud Foundry manifest",
        `This will trigger the Software Development Machine to deploy to your Cloud Foundry space.

${AtomistGeneratedMarker}`,
        `Add Cloud Foundry manifest

${AddCloudFoundryManifestMarker}`),
};

// Simple template for Cloud Foundry manifest
const defaultManifest = (name, teamId) => `---
applications:
- name: "${name}"
  memory: 1024M
  instances: 1
  env:
    ATOMIST_TEAM: ${teamId}`;
