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
    LocalProject,
    ProjectOperationCredentials,
    RemoteRepoRef,
} from "@atomist/automation-client";
import { ProgressLog } from "@atomist/sdm";
import {
    CloudFoundryDeployment,
    CloudFoundryInfo,
} from "./config/EnvironmentCloudFoundryTarget";

export interface CloudFoundryDeployer {
    deploy(project: LocalProject,
           id: RemoteRepoRef,
           cfi: CloudFoundryInfo,
           log: ProgressLog,
           credentials: ProjectOperationCredentials,
           subDomainCreator: (id: RemoteRepoRef) => string,
           deployableArtifactPath?: string): Promise<CloudFoundryDeployment[]>;
}
