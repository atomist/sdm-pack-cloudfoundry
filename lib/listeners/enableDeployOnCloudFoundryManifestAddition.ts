
import {
    CommandListenerInvocation, PushImpactListener, PushImpactListenerRegistration,
    SoftwareDeliveryMachine
} from "@atomist/sdm";
import {AddCloudFoundryManifestMarker} from "../handlers/addCloudFoundryManifest";
import {SetDeployEnablementParameters} from "@atomist/sdm-core/handlers/commands/SetDeployEnablement";
import {setDeployEnablement} from "@atomist/sdm-core";

export function enableDeployOnCloudFoundryManifestAdditionListener(sdm: SoftwareDeliveryMachine): PushImpactListener<any> {
    return async pil => {
        if (pil.push.commits.some(c => c.message.includes(AddCloudFoundryManifestMarker))) {
            const parameters: SetDeployEnablementParameters = {
                owner: pil.push.repo.owner,
                repo: pil.push.repo.name,
                providerId: pil.push.repo.org.provider.providerId,
                name: sdm.configuration.sdm.name,
                version: sdm.configuration.sdm.version,
            };

            await setDeployEnablement({
                commandName: "addCloudFoundryManifest",
                parameters,
                ...pil,
            } as CommandListenerInvocation<SetDeployEnablementParameters>, true);
        }
    };
}

/**
 * Enable deployment when a PCF manifest is added to the default branch.
 */
export function enableDeployOnCloudFoundryManifestAddition(sdm: SoftwareDeliveryMachine): PushImpactListenerRegistration {
    return {
        name: "EnableDeployOnCloudFoundryManifestAddition",
        action: enableDeployOnCloudFoundryManifestAdditionListener(sdm),
    };
}
