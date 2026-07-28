<img src="src/icons/icon128.png" alt="SenseUI logo: stylized eye with curly bracket forming a face, emitting a beam of light that illuminates the letters UI of the word SenseUI">

# SenseUI

SenseUI is an open-source Chromium extension that gives blind and low-vision web developers real-time, actionable feedback on their web designs. Get visual descriptions of your pages and receive design recommendations without relying on sighted colleagues or generic AI tools that lack context on your website and deliver vague, unhelpful feedback for blind devs. I'm making this project as part of my master's thesis in Human-Computer Interaction, but this repository will not be deleted or closed after the completion of my degree. It will remain open-source and everyone is free to fork it, change it, adapt and use freely.

Available on Chrome Web Store: https://chromewebstore.google.com/detail/senseui/nolkkggkcmpjejlobeljmffhcmbaeflk?hl=en

---

## Table of Contents

1. [Planned Features](#planned-features)
2. [How to Contribute](#how-to-contribute)
3. [Installation](#installation)
4. [Documentation](#documentation)
5. [Project Background](#project-background)
6. [License](#license)
7. [Contact](#contact)

---

## Planned Features

### Core features

1. Accessible, screen-reader friendly interface

2. Keyboard shortcuts such as (Ctrl + Shift + S) to open extension and other common actions.

3. Quick-prompts for tasks such as Generate visual description and Identify design issues

4. Download chat session

5. Session persistence across browser restarts

6. Settings page
    - Adjust feedback detail level:
        - Comprehensive — with code examples and explanations that encourage learning visual design best practices and concepts
        - Balanced (default)
        - Concise — offers straightforward answers and doesn’t explain concepts or provide code snippets
    - Text input for additional context or instructions
    - Chat download settings:
        - Download entire chat
        - Download only favorited messages

7. Structured, navigable feedback
    - Responses organized with semantic headings to switch easily between conversation turns
    - Bullet points for lists instead of dense text blocks
    - Feedback goes from general to specific
    - Numerical values and specific code parameters highlighted
    - Clear explanations of why recommendations are made (unless concise mode is on)

8. About page
    - Accessibility statement
    - User manual

### “Nice to have” features

1. Context files: option to upload to add project or brand guidelines to enhance feedback accuracy

2. Individual response confidence level
    - High, Regular and Low for each of SenseUI’s response
    - These levels depend on the availability of context files in the Settings (instructions or reference files such as PRDs or design guidelines)

3. Chat download different formats (not just .txt)

## Example use cases:

- Generate visual descriptions of your webpage without uploading screenshots

- Identify design issues (alignment, readability, contrast)

- Get actionable design recommendations (no vague "choose a bolder color" type of comments)

- Review your changes in real time

- Customize your feedback detail level and focus

- Download chat history for team sharing

---

## How to Contribute

If your heart desires, you can contribute code, fix bugs, or propose features.
To find an approachable first issue to fix, you can check the ones with an "easy-fix" label [here](https://github.com/reginacas/sense-ui/issues?q=is%3Aissue%20state%3Aopen%20label%3Aeasy-fix)

Simply fork the repository, make your changes and start a pull request.
[Contact me](#contact) for any questions you have.

### Participation of sighted contributors

This project is built for blind and visually impaired developers, and their feedback and expertise guide its direction. Of course, sighted developers are also welcome to contribute, as long as their work supports these goals and respects the lived‑experience leadership of blind contributors. Collaboration across perspectives can only strenghten the project.

### Data Protection

For Chrome Web Store users, the extension privacy policy is available here: [Privacy Policy](PRIVACY_POLICY.md)

To read more details, visit the [Contributing page](CONTRIBUTING.MD)

---

## Installation

To learn how to install SenseUI, go to the [Setup Guide](SETUP.md)

---

## Documentation

### How to Use SenseUI

SenseUI is a chat interface. You ask it questions about your webpage and it responds with feedback.

#### Keyboard shortcuts:

- Ctrl + Shift + S: Open SenseUI
- Tab: Move between elements
- Add commands in the chatbox by typing "/"

#### Quick action prompts:

- Write / in the text input
- Choose from the options in the dropdown

Type custom questions in the chat field anytime.

### Code of Conduct

All participants agree to follow our Code of Conduct: [Link to Code of Conduct](CODE_OF_CONDUCT.md)

---

## Project Background

SenseUI started from research on barriers blind and low-vision developers face when working on UI design. Many rely on sighted colleagues, expensive services or vague general-purpose AI tools to verify their work. Due to this, many decide to distance themselves from UI and focus on Back-end roles, limiting their job opportunities.

This project aims to co-design with blind and low-vision volunteers an open-source tool that enables independent work, supports career growth, and creates more inclusive development environments.

---

## About the project maintainer

I'm Regina Castro, a UX and web designer with more than 5 years of experience and a master student of Human-Computer Interaction. I'm passionate about accessibility and human-centered digital tools as well as open-source software and developer experience. While I’m not blind myself, this research has not been made without the constant collaboration with blind and visually impaired developers whose expertise and feedback have given direction to SenseUI.

---

## Disclosure about AI use

Parts of the JavaScript codebase were written with assistance from Visual Studio Code’s Copilot tool. All generated code was tested to ensure functionality, accessibility and security.

---

## License

SenseUI is licensed under the MIT License.

---

## Contact

Questions? Ideas? Want to chat?

Email: <regina.castroespinosa@student.uni-siegen.de>

Join the mailing list for development updates:

[SenseUI mailing list](https://www.freelists.org/list/sense-ui)
