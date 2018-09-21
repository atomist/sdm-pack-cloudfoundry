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

import { Success } from "@atomist/automation-client";
import {
    checkOutArtifact,
    DefaultGoalNameGenerator,
    ExecuteGoal,
    ExecuteGoalResult,
    FulfillableGoalDetails,
    FulfillableGoalWithRegistrations,
    getGoalDefintionFrom,
    Goal,
    GoalDefinition,
    GoalInvocation,
    ImplementationRegistration,
    IndependentOfEnvironment,
    logger,
    Targeter,
} from "@atomist/sdm";
import * as _ from "lodash";
import { CloudFoundryBlueGreenDeployer } from "../push/CloudFoundryBlueGreenDeployer";

/**
 * Register a deployment for a certain type of push
 */
export interface CloudFoundryDeploymentRegistration extends Partial<ImplementationRegistration> {
    targeter: Targeter<any>;
}

const CloudFoundryGoalDefition: GoalDefinition = {
    uniqueName: "cloudfoundry-deploy",
    environment: IndependentOfEnvironment,
    workingDescription: "Deploying to CloudFoundry",
    completedDescription: "Deployed to CloudFoundry",
    failedDescription: "Deployment to CloudFoundry failed",
};

// noinspection TsLint
/**
 * Goal to deploy to CloudFoundry. This uses blue/green deployment.
 */
export class CloudFoundryDeploy extends FulfillableGoalWithRegistrations<CloudFoundryDeploymentRegistration> {
    constructor(protected details: FulfillableGoalDetails | string = DefaultGoalNameGenerator.generateName("cf-deploy-push"),
                ...dependsOn: Goal[]) {

        super({
            ...CloudFoundryGoalDefition,
            ...getGoalDefintionFrom(details, DefaultGoalNameGenerator.generateName("cf-deploy-push")),
            displayName: "deploying to CloudFoundry",
        }, ...dependsOn);
    }

    public with(registration: CloudFoundryDeploymentRegistration): this {
        this.addFulfillment({
            name: DefaultGoalNameGenerator.generateName("cf-deployer"),
            goalExecutor: executeCloudFoundryDeployment(registration),
            ...registration as ImplementationRegistration,
        });
        return this;
    }
}

async function executeCloudFoundryDeployment(registration: CloudFoundryDeploymentRegistration): Promise<ExecuteGoal> {
    return async (goalInvocation: GoalInvocation): Promise<ExecuteGoalResult> => {
        const {sdmGoal, credentials, id, context, progressLog, configuration} = goalInvocation;
        const atomistTeam = context.workspaceId;

        logger.info("Deploying project %s:%s to CloudFoundry]", id.owner, id.repo);

        const artifactCheckout = await checkOutArtifact(_.get(sdmGoal, "push.after.image.imageName"),
            configuration.sdm.artifactStore, id, credentials, progressLog);

        artifactCheckout.id.branch = sdmGoal.branch;
        const deployments = await new CloudFoundryBlueGreenDeployer(configuration.sdm.projectLoader).deploy(
            artifactCheckout,
            registration.targeter(id, id.branch),
            progressLog,
            credentials,
            atomistTeam);

        await Promise.all(deployments.map(deployment => {
            return {
                code: 0,
                phase: deployment.endpoint,
            } as ExecuteGoalResult;
        }));

        return Success;
    };
}
