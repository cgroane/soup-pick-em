# Important Note

## Railway PR Environments: secure config

Do not commit credentials to this repository. Use GitHub Actions `Secrets` for sensitive values and GitHub Actions `Variables` for non-sensitive identifiers.

### GitHub Secrets (private)

- `RAILWAY_API_TOKEN` (required): account token used by Railway CLI in CI.
- `RAILWAY_ENV_VAR_VALUE` (optional): value injected into the PR environment (for example a shared staging `DATABASE_URL`).

If you add other credentials (Firebase admin key, third-party API keys, JWT secrets), keep them in secrets only and inject them at deploy/runtime.

### GitHub Variables (non-sensitive)

- `RAILWAY_LINK_PROJECT_ID` (required): Railway project ID to link in CI.
- `RAILWAY_DUPLICATE_FROM_ID` (required): source Railway environment ID to copy.
- `RAILWAY_SERVICE_ID` (optional): Railway service receiving injected variable.
- `RAILWAY_ENV_VAR_NAME` (optional): variable key name to inject (for example `DATABASE_URL`).
- `RAILWAY_WORKSPACE_ID` (optional): only if the project is scoped under a workspace and CLI linking requires it.

### Workflow behavior

- Workflow file: `.github/workflows/railway-pr-envs.yml`.
- It runs only for internal PR branches (not forks).
- On `opened`/`reopened`, it creates `pr-<number>` Railway environments from `RAILWAY_DUPLICATE_FROM_ID`.
- If `RAILWAY_SERVICE_ID`, `RAILWAY_ENV_VAR_NAME`, and `RAILWAY_ENV_VAR_VALUE` are all set, it injects that variable into the service.
- On `closed`, it deletes the corresponding `pr-<number>` environment.

### PR checks workflow

- Workflow file: `.github/workflows/pr-checks.yml`.
- Runs on pull requests (including updates) and skips draft PRs.
- Executes `npm ci`, `npm run build`, and `npm test -- --watch=false`.

### Immediate security follow-up

- Rotate any Railway token that was previously committed.
- Rotate Firebase admin credentials if they were ever committed or shared.
- Keep local secrets in `.env` only and ensure `.env` remains gitignored.


# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

## TODO
Make CreateSlate.tsx use local state to monitor game selection and comparison.
Make MakePicks.tsx use local state to monitor pick selection
Determine best off season structure
set up node server to serve app, build file, etc
