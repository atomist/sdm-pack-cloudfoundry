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
    DelimitedWriteProgressLogDecorator,
    ProgressLog,
    spawnLog,
} from "@atomist/sdm";
import { CloudFoundryDeployer } from "../CloudFoundryDeployer";
import {
    CloudFoundryDeployment,
    CloudFoundryInfo,
} from "../config/EnvironmentCloudFoundryTarget";

/**
 * Spawn a new process to use the Cloud Foundry CLI to push.
 * Note that this isn't thread safe concerning multiple logins or spaces.
 */
export class CommandLineBlueGreenCloudFoundryDeployer implements CloudFoundryDeployer {
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
            ["login", `-a`, `${cfi.api}`, `-o`, `${cfi.org}`, `-u`, `${cfi.username}`, `-p`,  `'${cfi.password}'`, `-s`, `${cfi.space}`],
            {cwd: project.baseDir, log});
        logger.debug("Successfully selected space [%s]", cfi.space);
        // Turn off color so we don't have unpleasant escape codes in stream
        await spawnLog(`cf`,
            ["config", "--color", "false"],
            {cwd: project.baseDir, log});
        const newLineDelimitedLog = new DelimitedWriteProgressLogDecorator(log, "\n");
        const subDomain = subDomainCreator(id);
        await this.createGreenDeployment(id, project, subDomain, manifestFile, cfi, deployableArtifactPath, newLineDelimitedLog);
        await this.mapGreenDeploymentToBlueEndpoint(id, cfi, subDomain, newLineDelimitedLog);
        await this.unmapBlueDeploymentToBlueEndpoint(id, cfi, subDomain, newLineDelimitedLog);
        await this.unmapGreenDeploymentToGreenEndpoint(id, cfi, subDomain, newLineDelimitedLog);
        await this.deleteBlueDeployment(id, newLineDelimitedLog);
        await this.renameGreenDeploymentToBlueDeployment(id, newLineDelimitedLog);
        return [{
            endpoint: `${subDomain}.${cfi.domain}`,
            appName: id.repo,
        }];
    }

    private async renameGreenDeploymentToBlueDeployment(id: RemoteRepoRef, newLineDelimitedLog: ProgressLog): Promise<any> {
        const cfArgumenteRenameGreenToBlue = [
            "rename",
            id.repo + "-green",
            id.repo];
        await spawnLog("cf", cfArgumenteRenameGreenToBlue, {log: newLineDelimitedLog});
    }

    private async deleteBlueDeployment(id: RemoteRepoRef, newLineDelimitedLog: ProgressLog): Promise<any> {
        const cfArgumentsDeleteBlue = [
            "delete",
            "-f",
            id.repo];
        await spawnLog("cf", cfArgumentsDeleteBlue, {log: newLineDelimitedLog});
    }

    private async unmapGreenDeploymentToGreenEndpoint(id: RemoteRepoRef,
                                                      cfi: CloudFoundryInfo,
                                                      subDomain: string,
                                                      newLineDelimitedLog: ProgressLog): Promise<any> {
        const cfArgumentsRemoveGreenTempRoute = [
            "unmap-route",
            id.repo + "-green",
            cfi.domain,
            "-n",
            subDomain + "-green"];
        await spawnLog("cf", cfArgumentsRemoveGreenTempRoute, {log: newLineDelimitedLog});
    }

    private async unmapBlueDeploymentToBlueEndpoint(id: RemoteRepoRef,
                                                    cfi: CloudFoundryInfo,
                                                    subDomain: string,
                                                    newLineDelimitedLog: ProgressLog): Promise<any> {
        const cfArgumentsUnmapBlue = [
            "unmap-route",
            id.repo,
            cfi.domain,
            "-n",
            subDomain];
        await spawnLog("cf", cfArgumentsUnmapBlue, {log: newLineDelimitedLog});
    }

    private async mapGreenDeploymentToBlueEndpoint(id: RemoteRepoRef,
                                                   cfi: CloudFoundryInfo,
                                                   subDomain: string,
                                                   newLineDelimitedLog: ProgressLog): Promise<any> {
        const cfArgumentsMapGreen = [
            "map-route",
            id.repo + "-green",
            cfi.domain,
            "-n",
            subDomain];
        await spawnLog("cf", cfArgumentsMapGreen, {log: newLineDelimitedLog});
    }

    private async createGreenDeployment(id: RemoteRepoRef,
                                        project: LocalProject,
                                        subDomain: string,
                                        manifestFile: string,
                                        cfi: CloudFoundryInfo,
                                        deployableArtifactPath: string,
                                        newLineDelimitedLog: ProgressLog): Promise<any> {
        const cfArgumentsGreen = [
            "push",
            id.repo + "-green",
            "-f",
            project.baseDir + "/" + manifestFile,
            "-d",
            cfi.domain,
            "-n",
            subDomain + "-green"]
            .concat(
                !!deployableArtifactPath ?
                    ["-p",
                        deployableArtifactPath] :
                    []);
        await spawnLog("cf", cfArgumentsGreen, {log: newLineDelimitedLog});
    }
}
