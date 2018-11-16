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
    buttonForCommand,
    logger,
} from "@atomist/automation-client";
import {
    allPredicatesSatisfied,
    anyPredicateSatisfied,
    ChannelLinkListener,
    ProjectLoader,
    ProjectPredicate,
    RepoListener,
} from "@atomist/sdm";
import { IsNode } from "@atomist/sdm-pack-node";
import {
    HasSpringBootApplicationClass,
    IsMaven,
} from "@atomist/sdm-pack-spring";
import {
    Attachment,
    codeLine,
    SlackMessage,
} from "@atomist/slack-messages";
import { AddCloudFoundryManifest } from "../handlers/addCloudFoundryManifest";

/**
 * PushTest to determine whether we know how to deploy a project
 * @type {PushTest}
 */
const CloudFoundryDeployableProject: ProjectPredicate =
    anyPredicateSatisfied(
        allPredicatesSatisfied(IsMaven.predicate, HasSpringBootApplicationClass.predicate),
        IsNode.predicate);

export const SuggestAddingCloudFoundryManifest: ChannelLinkListener = async inv => {
    const eligible = await CloudFoundryDeployableProject(inv.project);
    if (!eligible) {
        logger.info("Not suggesting Cloud Foundry manifest for %j as we don't know how to deploy yet", inv.id);
        return;
    }

    const attachment: Attachment = {
        text: "Add a Cloud Foundry manifest to your new repo?",
        fallback: "add PCF manifest",
        actions: [buttonForCommand({ text: "Add Cloud Foundry Manifest" },
            AddCloudFoundryManifest.name,
            { "targets.owner": inv.id.owner, "targets.repo": inv.id.repo },
        ),
        ],
    };
    const message: SlackMessage = {
        attachments: [attachment],
    };
    return inv.addressNewlyLinkedChannel(message, { dashboard: false });
};

export function suggestAddingCloudFoundryManifestOnNewRepo(projectLoader: ProjectLoader): RepoListener {
    return async inv => {
        await projectLoader.doWithProject(
            { context: inv.context, credentials: inv.credentials, id: inv.id, readOnly: true }, async p => {
                const eligible = await CloudFoundryDeployableProject(p);
                if (!eligible) {
                    return;
                }

                const attachment: Attachment = {
                    text: `Add a Cloud Foundry manifest to ${codeLine(`${inv.id.owner}/${inv.id.repo}`)}?`,
                    fallback: `Add a Cloud Foundry manifest to ${inv.id.owner}/${inv.id.repo}?`,
                    actions: [buttonForCommand({ text: "Add Cloud Foundry Manifest" },
                        AddCloudFoundryManifest.name,
                        { "targets.owner": inv.id.owner, "targets.repo": inv.id.repo },
                    ),
                    ],
                };
                const message: SlackMessage = {
                    attachments: [attachment],
                };
                return inv.addressChannels(message);
            });
    };
}
