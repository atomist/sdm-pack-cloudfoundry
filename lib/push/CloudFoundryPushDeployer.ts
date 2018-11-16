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
    logger,
    Project,
    ProjectOperationCredentials,
    RemoteRepoRef,
} from "@atomist/automation-client";

import {
    DeployableArtifact,
    Deployer,
    InterpretedLog,
    ProgressLog,
    ProjectLoader,
} from "@atomist/sdm";
import * as yaml from "js-yaml";

import * as _ from "lodash";
import {
    CloudFoundryApi,
    initializeCloudFoundry,
} from "../api/CloudFoundryApi";
import { Manifest } from "../api/CloudFoundryManifest";
import {
    CloudFoundryDeployment,
    CloudFoundryInfo,
    CloudFoundryManifestPath,
} from "../api/CloudFoundryTarget";
import { CloudFoundryPusher } from "./CloudFoundryPusher";
import { ProjectArchiver } from "./ProjectArchiver";

/**
 * Use the Cloud Foundry API to approximate their CLI to push.
 * Note that this is indeed thread safe concerning multiple logins and spaces.
 */
export class CloudFoundryPushDeployer implements Deployer<CloudFoundryInfo, CloudFoundryDeployment> {

    constructor(private readonly projectLoader: ProjectLoader) {
    }

    public async deploy(da: DeployableArtifact,
                        cfi: CloudFoundryInfo,
                        log: ProgressLog,
                        credentials: ProjectOperationCredentials,
                        team: string): Promise<CloudFoundryDeployment[]> {
        logger.info("Deploying app [%j] to Cloud Foundry [%j]", da, { ...cfi, password: "REDACTED" });
        if (!cfi.api || !cfi.username || !cfi.password || !cfi.space) {
            throw new Error("cloud foundry authentication information missing. See CloudFoundryTarget.ts");
        }
        return this.projectLoader.doWithProject({ credentials, id: da.id, readOnly: !da.cwd }, async project => {
            const archiver = new ProjectArchiver(log);
            const packageFile = await archiver.archive(project, da);
            const manifest = await this.getManifest(project);
            const cfClient = await initializeCloudFoundry(cfi);
            const cfApi = new CloudFoundryApi(cfClient);
            const pusher = new CloudFoundryPusher(cfApi, cfi.org, cfi.space);
            const deploymentPromises = manifest.applications.map(manifestApp => {
                manifestApp["random-route"] = true; // always use a random route for now to match previous behavior
                return pusher.push(manifestApp, packageFile, log);
            });
            return Promise.all(deploymentPromises);
        });
    }

    public async findDeployments(id: RemoteRepoRef,
                                 cfi: CloudFoundryInfo,
                                 credentials: ProjectOperationCredentials): Promise<CloudFoundryDeployment[]> {
        if (!cfi.api || !cfi.username || !cfi.password || !cfi.space) {
            throw new Error("cloud foundry authentication information missing. See CloudFoundryTarget.ts");
        }
        return this.projectLoader.doWithProject({ credentials, id, readOnly: true }, async project => {
            const manifest = await this.getManifest(project);
            const cfClient = await initializeCloudFoundry(cfi);
            const cfApi = new CloudFoundryApi(cfClient);
            const pusher = new CloudFoundryPusher(cfApi, cfi.org, cfi.space);
            const spaceGuid = await pusher.getSpaceGuid();
            const apps = manifest.applications.map(async manifestApp => {
                const app = await cfApi.getApp(spaceGuid, manifestApp.name);
                if (app) {
                    return manifestApp.name;
                } else {
                    return undefined;
                }
            });
            const appNames = _.compact(await Promise.all(apps));
            return appNames.map(appName => {
                return {
                    appName,
                };
            });
        });
    }

    public async undeploy(cfi: CloudFoundryInfo,
                          deployment: CloudFoundryDeployment,
                          log: ProgressLog): Promise<any> {
        logger.info(`Undeploying app ${cfi.space}:${deployment.appName} from Cloud Foundry ${cfi.description}`);
        if (!cfi.api || !cfi.org || !cfi.username || !cfi.password || !cfi.space) {
            throw new Error("cloud foundry authentication information missing. See CloudFoundryTarget.ts");
        }
        const cfClient = await initializeCloudFoundry(cfi);
        const cfApi = new CloudFoundryApi(cfClient);
        const organisationGuid = await cfApi.getOrganisationGuidByName(cfi.org);
        const space = await cfApi.getSpaceByName(organisationGuid, cfi.space);
        const spaceGuid = space.metadata.guid;
        const app = await cfApi.getApp(spaceGuid, deployment.appName);
        if (app) {
            return cfApi.deleteApp(app.metadata.guid);
        }
    }

    public logInterpreter(log: string): InterpretedLog {
        return {
            relevantPart: log.split("\n").slice(-10).join("\n"),
            message: "Oh no!",
        };
    }

    private async getManifest(p: Project): Promise<Manifest> {
        const manifestFile = await p.findFile(CloudFoundryManifestPath);
        const manifestContent = await manifestFile.getContent();
        return yaml.load(manifestContent);
    }
}
