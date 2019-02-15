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
    Goal,
    goals,
    SdmContext,
    ToDefaultBranch,
} from "@atomist/sdm";
import {
    Interpretation,
    Interpreter,
} from "@atomist/sdm-pack-analysis";
import * as _ from "lodash";
import { CloudFoundryDeploy, CloudFoundryDeploymentStrategy } from "../goals/CloudFoundryPushDeploy";

/**
 * Deploy to PCF staging and production, requiring approval for each step.
 * If there is a previous deployment, deploy after that is complete.
 */
export class CloudFoundryDeployInterpreter implements Interpreter {

    private readonly cfDeployment: Goal = new CloudFoundryDeploy({
        displayName: "Deploy to CF `production`",
        environment: "production",
        preApproval: true,
        descriptions: {
            inProcess: "Deploying to Cloud Foundry `production`",
            completed: "Deployed to Cloud Foundry `production`",
        },
    })
        .with({ environment: "production", strategy: CloudFoundryDeploymentStrategy.API });

    private readonly cfDeploymentStaging: Goal = new CloudFoundryDeploy({
            displayName: "Deploy to CF `testing`",
            environment: "testing",
            preApproval: true,
            descriptions: {
                inProcess: "Deploying to Cloud Foundry `testing`",
                completed: "Deployed to Cloud Foundry `testing`",
            },
        },
    )
        .with({ environment: "staging", strategy: CloudFoundryDeploymentStrategy.API });

    public async enrich(interpretation: Interpretation, sdmContext: SdmContext): Promise<boolean> {
        // Only deploy to PCF from the default branch
        if (!interpretation.reason.pushListenerInvocation ||
            !await ToDefaultBranch.mapping(interpretation.reason.pushListenerInvocation)) {
            return false;
        }

        const pcfStack = interpretation.reason.analysis.elements.cloudfoundry;
        if (!pcfStack) {
            return false;
        }

        const pcfStagingDeploymentGoals = goals("pcf staging")
            .plan(this.cfDeploymentStaging);

        const pcfProductionDeploymentGoals = goals("pcf prod")
            .plan(this.cfDeployment);

        const pcfDeploymentGoals = goals("deploy")
            .plan(pcfStagingDeploymentGoals)
            .plan(pcfProductionDeploymentGoals).after(this.cfDeploymentStaging);

        if (interpretation.deployGoals) {
            // Respect previous goals
            const lastGoal = _.last(interpretation.deployGoals.goals);
            interpretation.deployGoals.plan(pcfDeploymentGoals).after(lastGoal);
        } else {
            interpretation.deployGoals = pcfDeploymentGoals;
        }

        return true;
    }
}
