# Autotests

This repository contains the autotests for the GMX interface.

## Prerequisites

- Git [Installation guide](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- Node.js >= 20 [Installation guide](https://nodejs.org/en/download/)
- Yarn >= 1.22.5 [Installation guide](https://classic.yarnpkg.com/en/docs/install)

## Install

1. Clone the repository to your local machine.
2. Install the dependencies by running `yarn`.
3. Install playwright dependencies by running `npx playwright install`

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

## Writing tests

Tests consist of test cases and page objects. The tests are designed to be simple, any complex interactions should be incapsulated in page objects. Each page object is either a [extended Locator](./src/elements/base-page.ts#L5) or inheritor of [BasePage](./src/elements/base-page.ts#12). Locators are extended interface to use only data-qa attributes for locating elements and implementing following API:

- `.selector` - returns locator's selector string including data-qa attribute
- `.waitForSelector()` - waits for element to appear on page
- `.waitForVisible()` - waits for element to be visible

BasePage is a class that provides basic methods for interacting with the page and manipulating locators. These classes are used to keep tests cases clean, declarative and simple, also to reuse same UI interactions in different pages. Each tests accepts [GmxApp object](./src/elements/page-objects.ts#L382) as a parameter, all interactions with APP should be accessible through this object.

Ideally tests should be isolated from each other, so that they can be run in any order and not depend on each other. In other case use `test.describe.serial` to group tests that depend on each other.
