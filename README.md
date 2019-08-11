<p align="center">
  <img src="https://images.atomist.com/sdm/SDM-Logo-Dark.png">
</p>

# zwitch-sdm

[![forthebadge](https://forthebadge.com/images/badges/built-with-resentment.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/compatibility-emacs.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/contains-cat-gifs.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/60-percent-of-the-time-works-every-time.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/winter-is-coming.svg)](https://forthebadge.com)

An [Atomist][atomist] software delivery machine (SDM) that clones projects
and deletes/adds features to them based on parameters.

## Usage

Install dependencies
```bash
npm install -h @atomist/cli
```

Clone this project:
```bash
git clone https://github.com/ElderMael/zwitch-sdm.git
```

Start the SDM
```bash
cd zwitch-sdm && atomist start --local
```

Create a seed project instance somewhere in your `ATOMIST_ROOT` e.g.

```bash
atomist create seed instance \
    --seed-name=micronaut-seed-app \
    --seed-owner=ElderMael \
    --seed-branch=master \
    --remove-features=echo,users \
    --target-repo=seed-instance-6
```

This will clone [this repository][seed-example] and remove classes tagged with `Feature("echo")`.

## Parameters

* `--seed-owner`: a GitHub username 
* `--seed-name`: a GitHub repository name from the provided GitHub user
* `--seed-branch` the repository branch you want to use as starting point

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


## Code of conduct

This project is governed by the [Code of
Conduct](CODE_OF_CONDUCT.md). You are expected to act in accordance
with this code by participating. Please report any unacceptable
behavior to code-of-conduct@atomist.com.

If you find a problem, please create an [issue][].

[issue]: https://github.com/ElderMael/zwitch-sdm/issues

---
[atomist]: https://atomist.com/ (Atomist - How Teams Deliver Software)
[slack]: https://join.atomist.com/ (Atomist Community Slack)
[seed-example]: https://github.com/ElderMael/micronaut-seed-app (Seed Project Example)
