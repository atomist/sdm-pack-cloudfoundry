import {
    LocalProject,
    ProjectOperationCredentials,
    RemoteRepoRef,
} from "@atomist/automation-client";
import { ProgressLog } from "@atomist/sdm";
import {
    CloudFoundryDeployment,
    CloudFoundryInfo,
} from "./config/EnvironmentCloudFoundryTarget";

export interface CloudFoundryDeployer {
    deploy(project: LocalProject,
           id: RemoteRepoRef,
           cfi: CloudFoundryInfo,
           log: ProgressLog,
           credentials: ProjectOperationCredentials,
           subDomainCreator: (id: RemoteRepoRef) => string,
           deployableArtifactPath?: string): Promise<CloudFoundryDeployment[]>;
}
