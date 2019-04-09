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
    configurationValue,
    logger,
} from "@atomist/automation-client";
import {
    Deployment,
    TargetInfo,
} from "@atomist/sdm";

export interface CloudFoundryInfo extends TargetInfo {

    api: string;
    username: string;
    password: string;
    space: string;
    org: string;
    domain: string;

}

export interface CloudFoundryDeployment extends Deployment {

    appName: string;

}

/**
 * Configure cloud foundry from environment variables.
 * See README for definition.
 */
export class EnvironmentCloudFoundryTarget {

    public api: string = configurationValue<CloudfoundryOptions>("sdm.cloudfoundry").api || "https://api.run.pivotal.io";

    public username: string = configurationValue<CloudfoundryOptions>("sdm.cloudfoundry").user;

    public password: string = configurationValue<CloudfoundryOptions>("sdm.cloudfoundry").password;

    public org: string = configurationValue<CloudfoundryOptions>("sdm.cloudfoundry").org;

    public domain: string = configurationValue<CloudfoundryOptions>("sdm.cloudfoundry").domain;

    /**
     * Logical name for the space
     * @param {string} environmentName: Name of the environment, such as "staging" or "production"
     */
    constructor(private readonly environmentName: "staging" | "production") {
    }

    get space(): string {
        const space = configurationValue<CloudfoundryOptions>(`sdm.cloudfoundry`).spaces[this.environmentName];
        logger.info("PCF space for environment [%s] is [%s]", this.environmentName, space);
        if (!space) {
            throw new Error(`Please set environment key cloudfoundry.spaces.${
                this.environmentName} to deploy to Cloud Foundry environment ${this.environmentName}`);
        }
        return space;
    }

    get name(): string {
        return `PCF: ${this.environmentName}`;
    }

    get description(): string {
        return `PCF ${this.api};org=${this.org};space=${this.space};user=${this.username}`;
    }
}

export interface CloudfoundryOptions {

    api: string;
    user: string;
    password: string;
    org: string;
    spaces: {
        [key: string]: string;
    };
    domain: string;
}
