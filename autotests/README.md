# Autotests

This repository contains the autotests for the GMX interface.

## Prerequisites

- Git [Installation guide](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- Node.js >= 20 [Installation guide](https://nodejs.org/en/download/)
- Yarn >= 1.22.5 [Installation guide](https://classic.yarnpkg.com/en/docs/install)

## Install

1. Clone the repository to your local machine.
2. Install the dependencies by running `yarn`.

## How to run autotests locally

1. Setup `.env` file in same directory as tests with the following content:

```bash
GMX_BASE_URL=<URL to GMX interface for testing>
SEED=<SEED PHRASE FOR WALLET>
PWDEBUG=<true if want to see tests UI>
USE_METAMASK=<true if using real metamask>
PW_WORKERS=<number of workers for parallel tests, preferable 1>
NETWORK=arbitrum or fuji
```

2. Run tests: `yarn test`
