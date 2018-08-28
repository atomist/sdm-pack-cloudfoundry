# @atomist/sdm-pack-cloudfoundry

[![atomist sdm goals](http://badge.atomist.com/T29E48P34/atomist/sdm-pack-cloudfoundry/067b98ed-775a-4d34-a4a3-82837feca109)](https://app.atomist.com/workspace/T29E48P34)
[![npm version](https://img.shields.io/npm/v/@atomist/sdm-pack-cloudfoundry.svg)](https://www.npmjs.com/package/@atomist/sdm-pack-cloudfoundry)

[Atomist][atomist] software delivery machine (SDM) extension pack for
an Atomist SDM to deploy to [Cloud Foundry][cf].  These capabilities
will work for both open source and Pivotal Cloud Foundry.

[cf]: https://www.cloudfoundry.org/ (Cloud Foundry)

See the [Atomist documentation][atomist-doc] for more information on
what SDMs are and what they can do for you using the Atomist API for
software.

[atomist-doc]: https://docs.atomist.com/ (Atomist Documentation)

## Usage

Install the dependency in your SDM project.

```
$ npm install @atomist/sdm-pack-cloudfoundry
```

Then use its exported method to add the functionality to your SDM in
your machine definition.

```typescript
import {
    SoftwareDeliveryMachine,
    SoftwareDeliveryMachineConfiguration,
} from "@atomist/sdm";
import {
    createSoftwareDeliveryMachine,
} from "@atomist/sdm-core";
import {
    CloudFoundrySupport,
} from "@atomist/sdm-pack-cloudfoundry";

export function machine(configuration: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine {
    const sdm = createSoftwareDeliveryMachine({
        name: "My Software Delivery Machine",
        configuration,
    });
    sdm.addExtensionPacks(SeedSupport);
    sdm.addDeployRules(
        deploy.when(IsMaven)
            .deployTo(ProductionDeploymentGoal, ProductionEndpointGoal, ProductionUndeploymentGoal)
            .using({
                deployer: new CloudFoundryBlueGreenDeployer(configuration.sdm.projectLoader),
                targeter: () => new EnvironmentCloudFoundryTarget("production"),
            }),
    );
    return sdm;
};
```

Finally, add the required configuration values to your client
configuration.

```json
{
  "sdm": {
    "cloudfoundry": {
      "user": "cf-user@atomist.com",
      "password": "cFpAsSw0rD",
      "org": "cf-organiation",
      "spaces": {
        "staging": "cf-staging-space",
        "production": "cf-production-space"
      }
    }
  }
}
```

## Support

General support questions should be discussed in the `#support`
channel in the [Atomist community Slack workspace][slack].

If you find a problem, please create an [issue][].

[issue]: https://github.com/atomist/sdm-pack-cloudfoundry/issues

## Development

You will need to install [Node.js][node] to build and test this
project.

[node]: https://nodejs.org/ (Node.js)

### Build and test

Install dependencies.

```
$ npm install
```

Use the `build` package script to compile, test, lint, and build the
documentation.

```
$ npm run build
```

### Release

Releases are handled via the [Atomist SDM][atomist-sdm].  Just press
the 'Approve' button in the Atomist dashboard or Slack.

[atomist-sdm]: https://github.com/atomist/atomist-sdm (Atomist Software Delivery Machine)

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ (Atomist - How Teams Deliver Software)
[slack]: https://join.atomist.com/ (Atomist Community Slack)
