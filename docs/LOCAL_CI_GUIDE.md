# Local CI/CD with `act`

This guide provides instructions for running the CI/CD pipeline locally using [`act`](https://github.com/nektos/act). `act` allows you to run your GitHub Actions workflows locally, which is useful for testing and debugging CI/CD issues.

## Prerequisites

- **Docker**: `act` uses Docker to run the workflows in containers. Make sure you have Docker installed and running.
- **`act`**: Follow the [installation guide](https://github.com/nektos/act#installation) to install `act`.

## Running the CI Pipeline Locally

To run the entire CI pipeline, use the following command:

```bash
act --secret GITHUB_TOKEN=<your-github-token>
```

Replace `<your-github-token>` with a GitHub personal access token. This is required for `act` to access the repository and other resources.

### Running a Specific Job

You can also run a specific job from the CI pipeline. For example, to run the `ui-tests` job, use the following command:

```bash
act -j ui-tests --secret GITHUB_TOKEN=<your-github-token>
```

## Known Issues and Caveats

- **Network Issues**: The local `act` environment can sometimes be flaky due to network issues within the GitHub Actions containers. If you encounter errors related to network connectivity, such as "connection reset by peer," it's likely a transient issue. Retrying the command usually resolves the problem.
- **Artifacts**: The local `act` environment does not support uploading or downloading artifacts. The `ci.yml` workflow has been configured to handle this by skipping artifact-related steps and building the application from source when `ACT=true` is set.
- **Resource Constraints**: Running the entire CI pipeline locally can be resource-intensive, especially on machines with limited memory or CPU. If you experience performance issues, consider running individual jobs instead of the entire pipeline.
- **Caching**: The caching mechanism in `act` is not as robust as the one in GitHub Actions. You may not see the same performance improvements from caching as you would in the remote environment.
