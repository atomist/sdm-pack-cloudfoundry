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
    logger,
    ProjectOperationCredentials,
    RemoteRepoRef,
} from "@atomist/automation-client";
import {
    ProgressLog,
    spawnLog,
} from "@atomist/sdm";
import { CloudFoundryDeployer } from "../CloudFoundryDeployer";
import {
    CloudFoundryDeployment,
    CloudFoundryInfo,
} from "../config/EnvironmentCloudFoundryTarget";

async function deployToCloudFoundry(id: RemoteRepoRef,
                                    project: LocalProject,
                                    manifestFile: string,
                                    cfi: CloudFoundryInfo,
                                    subDomain: string,
                                    deployableArtifactPath: string,
                                    log: ProgressLog): Promise<any> {
    const cfArguments = [
        "push",
        id.repo,
        "-f",
        project.baseDir + "/" + manifestFile,
        "-d",
        cfi.domain,
        "-n",
        subDomain]
        .concat(
            !!deployableArtifactPath ?
                ["-p",
                    deployableArtifactPath] :
                []);
    await spawnLog("cf", cfArguments, {log});
}

/**
 * Spawn a new process to use the Cloud Foundry CLI to push.
 * Note that this isn't thread safe concerning multiple logins or spaces.
 */
export class CommandLineCloudFoundryDeployer implements CloudFoundryDeployer {
    public async deploy(project: LocalProject,
                        id: RemoteRepoRef,
                        cfi: CloudFoundryInfo,
                        log: ProgressLog,
                        credentials: ProjectOperationCredentials,
                        subDomainCreator: (id: RemoteRepoRef) => string,
                        deployableArtifactPath?: string): Promise<CloudFoundryDeployment[]> {
        logger.info("Deploying app [%j] to Cloud Foundry [%s]", id.repo, cfi.description);

        // We need the Cloud Foundry manifest. If it's not found, we can't deploy
        // We want a fresh version unless we need it build

        const manifestFile = (await project.findFile("manifest.yaml")).path;

        if (!cfi.api || !cfi.org || !cfi.username || !cfi.password) {
            throw new Error("Cloud foundry authentication information missing. See CloudFoundryTarget.ts");
        }

        // Note: if the password is wrong, things hangs forever waiting for input.
        await spawnLog(
            "cf",
            ["login", `-a`, `${cfi.api}`, `-o`, `${cfi.org}`, `-u`, `${cfi.username}`, `-p`,  `${cfi.password}`, `-s`, `${cfi.space}`],
            {cwd: project.baseDir, log});
        logger.debug("Successfully selected space [%s]", cfi.space);
        // Turn off color so we don't have unpleasant escape codes in stream
        await spawnLog(`cf`,
            ["config", "--color", "false"],
            {cwd: project.baseDir, log});
        const subDomain = subDomainCreator(id);
        await deployToCloudFoundry(id, project, manifestFile, cfi, subDomain, deployableArtifactPath, log);
        return [{
            endpoint: `http://${subDomain}.${cfi.domain}`,
            appName: id.repo,
        }];
    }
}
