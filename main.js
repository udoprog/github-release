// This is based off https://github.com/rust-lang/rust-analyzer/tree/5aa0d129de725eee28099c6f52ba495d135b6c13/.github/actions/github-release

const core = require('@actions/core');
const fs = require("fs");
const github = require('@actions/github');
const glob = require('glob');
const path = require("path");

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function ensure(what, value) {
  if (!value) {
    throw Error(`missing ${what}`);
  }

  return value;
}

function boolean(value, defaultValue) {
  if (value === undefined || value == null || value === "") {
    return defaultValue;
  }

  return value === true || value === "yes";
}

async function runOnce() {
  const files = core.getInput('files');
  const name = core.getInput('name');
  const token = core.getInput('token');
  const prerelease = boolean(core.getInput('prerelease'), name === 'nightly');
  const repo = ensure("context repo", github.context.repo.repo);
  const owner = ensure("context owner", github.context.repo.owner);
  const sha = ensure("context sha", core.getInput('sha') || github.context.sha);

  core.info(`files: ${files}`);
  core.info(`name: ${name}`);
  core.info(`repo: ${repo}`);
  core.info(`owner: ${owner}`);
  core.info(`sha: ${sha}`);

  const options = {
    request: {
      timeout: 30000,
    }
  };

  const octokit = github.getOctokit(token, options);

  // Delete the previous release since we can't overwrite one. This may happen
  // due to retrying an upload or it may happen because we're doing the dev
  // release.
  const releases = await octokit.paginate("GET /repos/:owner/:repo/releases", { owner, repo });

  for (const release of releases) {
    if (release.tag_name !== name) {
      continue;
    }
  
    const release_id = release.id;
    core.info(`Deleting release ${release_id}`);
    await octokit.rest.repos.deleteRelease({ owner, repo, release_id });
  }

  // We also need to update the `dev` tag while we're at it on the `dev` branch.
  if (name == 'nightly') {
    try {
      core.info(`updating nightly tag`);
  
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: 'tags/nightly',
        sha,
        force: true,
      });
    } catch (e) {
      core.error(e);
      core.info(`creating nightly tag`);

      await octokit.rest.git.createTag({
        owner,
        repo,
        tag: 'nightly',
        message: 'nightly release',
        object: sha,
        type: 'commit',
      });
    }
  }

  // Creates an official GitHub release for this `tag`, and if this is `dev`
  // then we know that from the previous block this should be a fresh release.
  core.info("Creating a release");

  const release = await octokit.rest.repos.createRelease({
    owner,
    repo,
    name,
    tag_name: name,
    target_commitish: sha,
    prerelease,
  });

  const release_id = release.data.id;

  // Upload all the relevant assets for this release as just general blobs.
  for (const file of glob.sync(files)) {
    const size = fs.statSync(file).size;
    const name = path.basename(file);

    await runWithRetry(async function () {
      // We can't overwrite assets, so remove existing ones from a previous try.
      let assets = await octokit.rest.repos.listReleaseAssets({
        owner,
        repo,
        release_id
      });
      for (const asset of assets.data) {
        if (asset.name === name) {
          core.info(`delete asset ${name}`);
          const asset_id = asset.id;
          await octokit.rest.repos.deleteReleaseAsset({ owner, repo, asset_id });
        }
      }

      core.info(`upload ${file}`);
      const headers = { 'content-length': size, 'content-type': 'application/octet-stream' };
      const data = fs.createReadStream(file);
      await octokit.rest.repos.uploadReleaseAsset({
        data,
        headers,
        name,
        url: release.data.upload_url,
      });
    });
  }
}

async function runWithRetry(f) {
  const retries = 10;
  const maxDelay = 4000;
  let delay = 1000;

  for (let i = 0; i < retries; i++) {
    try {
      await f();
      break;
    } catch (e) {
      if (i === retries - 1)
        throw e;

      core.error(e);
      const currentDelay = Math.round(Math.random() * delay);
      core.info(`sleeping ${currentDelay} ms`);
      await sleep(currentDelay);
      delay = Math.min(delay * 2, maxDelay);
    }
  }
}

async function run() {
  await runWithRetry(runOnce);
}

run().catch(err => {
  core.error(err);
  core.setFailed(err.message);
});
