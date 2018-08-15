import {
    ExtensionPack,
} from "@atomist/sdm";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import {AddCloudFoundryManifest} from "./handlers/addCloudFoundryManifest";
import {
    SuggestAddingCloudFoundryManifest,
    suggestAddingCloudFoundryManifestOnNewRepo
} from "./listeners/suggestAddingCloudFoundryManifest";
import {enableDeployOnCloudFoundryManifestAddition} from "./listeners/enableDeployOnCloudFoundryManifestAddition";

export const CloudFoundrySupport: ExtensionPack = {
    ...metadata("cloud-foundry"),
    requiredConfigurationValues: [
        "sdm.cloudfoundry.user",
        "sdm.cloudfoundry.password",
        "sdm.cloudfoundry.org",
        "sdm.cloudfoundry.spaces.production",
        "sdm.cloudfoundry.spaces.staging",
    ],
    configure: sdm => {
        sdm
            .addCodeTransformCommand(AddCloudFoundryManifest)
            .addChannelLinkListener(SuggestAddingCloudFoundryManifest)
            .addNewRepoWithCodeListener(suggestAddingCloudFoundryManifestOnNewRepo(sdm.configuration.sdm.projectLoader))
            .addPushReaction(enableDeployOnCloudFoundryManifestAddition(sdm));
    },
};
