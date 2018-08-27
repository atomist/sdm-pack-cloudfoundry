# @atomist/sdm-pack-cloudfoundry

[Atomist][atomist] software delivery machine (SDM) extension pack for an Atomist SDM to deploy to Pivotal Cloud Foundry.

See the [Atomist documentation][atomist-doc] for more information on
what SDMs are and what they can do for you using the Atomist API for
software.

[atomist-doc]: https://docs.atomist.com/ (Atomist Documentation)

## Usage

1. First install the dependency in your SDM project

```
$ npm install @atomist/sdm-pack-cloudfoundry
```

2. Install the support

```
sdm.addExtensionPacks(CloudFoundrySupport)
```

3. Add deployment rules using the Cloud Foundry deployers

```
sdm.addDeployRules(
        deploy.when(IsMaven)
            .deployTo(ProductionDeploymentGoal, ProductionEndpointGoal, ProductionUndeploymentGoal)
            .using({
                deployer: new CloudFoundryBlueGreenDeployer(configuration.sdm.projectLoader),
                targeter: () => new EnvironmentCloudFoundryTarget("production"),
            }),
    );
```

4. Add configuration to your client configuration

```
"cloudfoundry": {
  "user": "jtreehorn@atomist.com",
  "password": "1og7ammin",
  "org": "atomist",
  "spaces": {
    "staging": "lj-staging",
    "production": "lj-production"
  }
}
```

## Support

General support questions should be discussed in the `#support`
channel on our community Slack team
at [atomist-community.slack.com][slack].

If you find a problem, please create an [issue][].

[issue]: https://github.com/atomist/sdm-pack-cloudfoundry/issues


## Development

You will need to install [Node][node] to build and test this project.

[node]: https://nodejs.org/ (Node.js)

### Build and test

Use the following package scripts to build, test, and perform other
development tasks.

Command | Reason
------- | ------
`npm install` | install project dependencies
`npm run build` | compile, test, lint, and generate docs
`npm run lint` | run TSLint against the TypeScript
`npm run compile` | generate types from GraphQL and compile TypeScript
`npm test` | run tests
`npm run autotest` | run tests every time a file changes
`npm run clean` | remove files generated during build

### Build and Test

Command | Reason
------- | ------
`npm install` | install all the required packages
`npm run build` | lint, compile, and test
`npm run lint` | run tslint against the TypeScript
`npm run compile` | compile all TypeScript into JavaScript
`npm test` | run tests and ensure everything is working
`npm run clean` | remove stray compiled JavaScript files and build directory

### Release

Releases are handled via the [Atomist SDM][atomist-sdm].  Just press
the 'Approve' button in the Atomist dashboard or Slack.

[atomist-sdm]: https://github.com/atomist/atomist-sdm (Atomist Software Delivery Machine)

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack workspace][slack].

[atomist]: https://atomist.com/ (Atomist - How Teams Deliver Software)
[slack]: https://join.atomist.com/ (Atomist Community Slack)
