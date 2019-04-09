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
    StringCapturingProgressLog,
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
        const previouslyDeployed = await this.hasBeenPreviouslyDeployed(id);
        if (previouslyDeployed) {
            log.write("Starting blue-green deployment\n");
            await this.createGreenDeployment(id, project, subDomain, manifestFile, cfi, deployableArtifactPath, log);
            await this.mapGreenDeploymentToBlueEndpoint(id, cfi, subDomain, log);
            await this.unmapBlueDeploymentToBlueEndpoint(id, cfi, subDomain, log);
            await this.unmapGreenDeploymentToGreenEndpoint(id, cfi, subDomain, log);
            await this.deleteBlueDeployment(id, log);
            await this.renameGreenDeploymentToBlueDeployment(id, log);
            log.write("Blue-green deployment complete\n");
        } else {
            await this.deployToCloudFoundry(id, project, manifestFile, cfi, subDomain, deployableArtifactPath, log);
        }
        return [{
            endpoint: `http://${subDomain}.${cfi.domain}`,
            appName: id.repo,
        }];
    }

    private async hasBeenPreviouslyDeployed(id: RemoteRepoRef): Promise<boolean> {
        const stringLog = new StringCapturingProgressLog();
        await spawnLog(`cf`,
            ["curl", `/v3/apps?names=${id.repo}`],
            {log: stringLog});
        const json = stringLog.log.substring(stringLog.log.indexOf("{"));
        const cfApp = JSON.parse(json);
        return cfApp.pagination.total_results > 0;
    }

    private async renameGreenDeploymentToBlueDeployment(id: RemoteRepoRef, log: ProgressLog): Promise<any> {
        log.write("Renaming green deployment to blue deployment\n");
        const cfArgumenteRenameGreenToBlue = [
            "rename",
            id.repo + "-green",
            id.repo];
        await spawnLog("cf", cfArgumenteRenameGreenToBlue, {log});
    }

    private async deleteBlueDeployment(id: RemoteRepoRef, log: ProgressLog): Promise<any> {
        log.write("Deleting blue deployment\n");
        const cfArgumentsDeleteBlue = [
            "delete",
            "-f",
            id.repo];
        await spawnLog("cf", cfArgumentsDeleteBlue, {log});
    }

    private async unmapGreenDeploymentToGreenEndpoint(id: RemoteRepoRef,
                                                      cfi: CloudFoundryInfo,
                                                      subDomain: string,
                                                      log: ProgressLog): Promise<any> {
        log.write("Unmapping green deployment to green endpoint\n");
        const cfArgumentsRemoveGreenTempRoute = [
            "unmap-route",
            id.repo + "-green",
            cfi.domain,
            "-n",
            subDomain + "-green"];
        await spawnLog("cf", cfArgumentsRemoveGreenTempRoute, {log});
    }

    private async unmapBlueDeploymentToBlueEndpoint(id: RemoteRepoRef,
                                                    cfi: CloudFoundryInfo,
                                                    subDomain: string,
                                                    log: ProgressLog): Promise<any> {
        log.write("Unmapping blue deployment to blue endpoint\n");
        const cfArgumentsUnmapBlue = [
            "unmap-route",
            id.repo,
            cfi.domain,
            "-n",
            subDomain];
        await spawnLog("cf", cfArgumentsUnmapBlue, {log});
    }

    private async mapGreenDeploymentToBlueEndpoint(id: RemoteRepoRef,
                                                   cfi: CloudFoundryInfo,
                                                   subDomain: string,
                                                   log: ProgressLog): Promise<any> {
        log.write("Mapping green deployment to blue endpoint\n");
        const cfArgumentsMapGreen = [
            "map-route",
            id.repo + "-green",
            cfi.domain,
            "-n",
            subDomain];
        await spawnLog("cf", cfArgumentsMapGreen, {log});
    }

    private async createGreenDeployment(id: RemoteRepoRef,
                                        project: LocalProject,
                                        subDomain: string,
                                        manifestFile: string,
                                        cfi: CloudFoundryInfo,
                                        deployableArtifactPath: string,
                                        log: ProgressLog): Promise<any> {
        log.write("Creating green deployment\n");
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
        await spawnLog("cf", cfArgumentsGreen, {log});
    }

    private async deployToCloudFoundry(id: RemoteRepoRef,
                                       project: LocalProject,
                                       manifestFile: string,
                                       cfi: CloudFoundryInfo,
                                       subDomain: string,
                                       deployableArtifactPath: string,
                                       log: ProgressLog): Promise<any> {
        log.write("Deploying to CloudFoundry\n");
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
}
