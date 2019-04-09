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
    RemoteRepoRef,
} from "@atomist/automation-client";
import {
    checkOutArtifact,
    DefaultGoalNameGenerator,
    ExecuteGoal,
    ExecuteGoalResult,
    FulfillableGoalDetails,
    FulfillableGoalWithRegistrations,
    getGoalDefinitionFrom,
    Goal,
    GoalDefinition,
    GoalInvocation,
    ImplementationRegistration,
    IndependentOfEnvironment,
    ProgressTest,
    ReportProgress,
    testProgressReporter,
} from "@atomist/sdm";
import * as _ from "lodash";
import { CommandLineBlueGreenCloudFoundryDeployer } from "../cli/CommandLineBlueGreenCloudFoundryDeployer";
import { CommandLineCloudFoundryDeployer } from "../cli/CommandLineCloudFoundryDeployer";
import { CloudFoundryDeployer } from "../CloudFoundryDeployer";
import { EnvironmentCloudFoundryTarget } from "../config/EnvironmentCloudFoundryTarget";

/**
 * Register a deployment for a certain type of push
 */
export interface CloudFoundryDeploymentRegistration extends Partial<ImplementationRegistration> {
    environment: ("staging" | "production");
    strategy: CloudFoundryDeploymentStrategy;
    deployableArtifactLocator?: (p: LocalProject) => Promise<string>;
    subDomainCreator: (id: RemoteRepoRef) => string;
}

export enum CloudFoundryDeploymentStrategy {
    BLUE_GREEN,
    STANDARD,
}

const CloudFoundryGoalDefinition: GoalDefinition = {
    displayName: "deploying to Cloud Foundry",
    uniqueName: "cloudfoundry-deploy",
    environment: IndependentOfEnvironment,
    workingDescription: "Deploying to Cloud Foundry",
    completedDescription: "Deployed to Cloud Foundry",
    failedDescription: "Deployment to Cloud Foundry failed",
    waitingForApprovalDescription: "Waiting for Cloud Foundry deployment approval",
    waitingForPreApprovalDescription: "Waiting to start Cloud Foundry deployment",
    stoppedDescription: "Deployment to Cloud Foundry stopped",
    canceledDescription: "Deployment to Cloud Foundry cancelled",
    isolated: true,
};

/**
 * Deploys an application to CloudFoundry.
 */
export class CloudFoundryDeploy extends FulfillableGoalWithRegistrations<CloudFoundryDeploymentRegistration> {
    // tslint:disable-next-line
    constructor(protected details: FulfillableGoalDetails | string = DefaultGoalNameGenerator.generateName("cf-deploy-push"),
                ...dependsOn: Goal[]) {

        super({
            ...CloudFoundryGoalDefinition,
            ...getGoalDefinitionFrom(details, DefaultGoalNameGenerator.generateName("cf-deploy-push")),
        }, ...dependsOn);
    }

    public with(registration: CloudFoundryDeploymentRegistration): this {
        this.addFulfillment({
            name: DefaultGoalNameGenerator.generateName("cf-deployer"),
            goalExecutor: executeCloudFoundryDeployment(registration),
            progressReporter: CloudFoundryDeployProgressReporter,
            ...registration,
        });
        return this;
    }
}

const CloudFoundryProgressTests: ProgressTest[] = [{
    test: /Deploying to CloudFoundry/i,
    phase: "deploying",
}, {
    test: /Starting blue-green deployment/i,
    phase: "starting blue-green",
}, {
    test: /Creating green deployment/i,
    phase: "deploying green",
}, {
    test: /Mapping green deployment to blue endpoint/i,
    phase: "mapping green -> blue",
}, , {
    test: /Unmapping blue deployment to blue endpoint]/i,
    phase: "unmapping blue -> blue",
}, {
    test: /Unmapping green deployment to green endpoint/i,
    phase: "unmaping green -> green",
}, {
    test: /Deleting blue deployment/i,
    phase: "deleting blue",
}, {
    test: /Renaming green deployment to blue]/i,
    phase: "renaming green -> blue",
}, {
    test: /Blue-green deployment complete/i,
    phase: "deployment complete",
}];

/**
 * ReportProgress for our CloudFoundry deployments
 */
const CloudFoundryDeployProgressReporter: ReportProgress = testProgressReporter(...CloudFoundryProgressTests);

function executeCloudFoundryDeployment(registration: CloudFoundryDeploymentRegistration): ExecuteGoal {
    return async (goalInvocation: GoalInvocation): Promise<ExecuteGoalResult> => {
        const { sdmGoal, credentials, id, progressLog, configuration } = goalInvocation;

        logger.info("Deploying project %s:%s to CloudFoundry in %s]", id.owner, id.repo, registration.environment);

        const artifactCheckout = await checkOutArtifact(_.get(sdmGoal, "push.after.image.imageName"),
            configuration.sdm.artifactStore, id, credentials, progressLog);

        artifactCheckout.id.branch = sdmGoal.branch;

        let deployer: CloudFoundryDeployer;
        switch (registration.strategy) {
            case CloudFoundryDeploymentStrategy.STANDARD:
                deployer = new CommandLineCloudFoundryDeployer();
                break;
            case CloudFoundryDeploymentStrategy.BLUE_GREEN:
                deployer = new CommandLineBlueGreenCloudFoundryDeployer();
                break;
        }
        const projectLoader = configuration.sdm.projectLoader;
        return projectLoader.doWithProject({ credentials, id, readOnly: true }, async project => {
            const deployments = await deployer.deploy(
                project,
                id,
                new EnvironmentCloudFoundryTarget(registration.environment),
                progressLog,
                credentials,
                registration.subDomainCreator,
                await registration.deployableArtifactLocator(project));

            const results = await Promise.all(deployments.map(deployment => {
                return {
                    code: 0,
                    targetUrl: deployment.endpoint,
                };
            }));

            return _.head(results);
        });
    };
}
