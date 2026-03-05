# Contributing to SenseUI

SenseUI is an open-source project and its success relies on the collaboration and input from our talented and dedicated contributors.
We don't simply have "useYour willingness to join this cause and community is extremely valued.
Please take a moment to read the project values first.

## Project Values

- Accessibility-first: All features must meet at least WCAG 2.2 AA standards
- We believe in transparency. Development happens in the open, with clear documentation. Important decisions are taken with input from the community in the [Discussions page](https://github.com/reginacas/sense-ui/discussions).
- SenseUI's goal is not to replace developers, or shift the control and decision making away from them. The goal is to be a part of their tool-kit for gaining confidence and independence when working on UI tasks. We are not looking to monetize from this tool.

## To try the extension:

1. Download the latest build from [Releases](https://github.com/reginacas/sense-ui/releases)

2. Open Chrome and go to the [Extensions page](chrome://extensions) or write: chrome://extensions in the address bar (this link can only be opened with Chrome)

3. Turn on "Developer mode" (toggle in the top right)

4. Click "Load unpacked"

5. Select the folder you downloaded, called "sprint-#-senseUI". This folder should include all the folders with the code, including the manifest file.

6. SenseUI should now appear in your extensions

7. To open it, press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> (or <kbd>Command</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> on Mac)

## Code Formatting

This project uses [Prettier](https://prettier.io/) to enforce consistent code style. The configuration lives in `prettier.config.js` and applies the following rules:

- `trailingComma`: `all`
- `tabWidth`: `4`
- `useTabs`: `false`
- `singleQuote`: `true`
- `semi`: `true`
- `endOfLine`: `lf`

**Format all files:**

```bash
npm run format
```

**Check formatting without writing changes:**

```bash
npx prettier --check .
```

Formatting is also enforced automatically on staged `*.{js,css,md}` files before each commit via [lint-staged](https://github.com/lint-staged/lint-staged) and [Husky](https://typicode.github.io/husky/). Make sure to run `npm install` after cloning so the Git hooks are set up correctly.

## Pull Request Guidelines

1. Create a feature branch from `main`
2. Follow accessibility standards: All code must be WCAG 2.2 AA compliant
3. Write semantic HTML with proper ARIA labels
4. Ensure your code is formatted with Prettier before opening a PR (`npm run format`)
5. Document your changes in the PR description
6. Reference related issues (e.g., "Fixes #42")

## Communication Channels

- GitHub Issues: Bug reports, feature requests, and technical discussions
- Github discussions: add a question, comment or concern.

## Questions?

If you have questions about contributing, please reach out through the mailing list

## License

By contributing to SenseUI, you agree that your contributions will be licensed under the project's open-source license (MIT License).

**Thank you for helping make web development more accessible for blind and low vision developers!**
