<img src="src/icons/icon128.png" alt="SenseUI logo: stylized eye with curly bracket forming a face, emitting a beam of light that illuminates the letters UI of the word SenseUI">

# SenseUI

SenseUI is an open-source Chromium extension that gives blind and low-vision web developers real-time, actionable feedback on their web designs. Get visual descriptions of your pages and receive design recommendations without relying on sighted colleagues or generic AI tools that lack context on your website and deliver vague, unhelpful feedback for blind devs. I'm making this project as part of my master's thesis in Human-Computer Interaction, but this repository will not be deleted or closed after the completion of my degree. It will remain open-source and everyone is free to fork it, change it, adapt and use freely.

We are actively looking forbBlind and low-vision developers to test and provide feedback. Participation is flexible and optional. You can participate in as many Sprints as you can. For more details go to [How to Contribute](#how-to-contribute)

Current State: Sprint 3

If you would like to join as a tester, please fill out [this form](https://docs.google.com/forms/d/e/1FAIpQLScDW_FCZznz-Nmws8N_mPTWvaSR4sbmvnxJ8kcTWSgy61M8wA/viewform?usp=sharing&ouid=113702676436730582551)

---

## Table of Contents

1. [Planned Features](#planned-features)
2. [Roadmap](#roadmap)
3. [How to Contribute](#how-to-contribute)
4. [Installation](#installation)
5. [Documentation](#documentation)
6. [Project Background](#project-background)
7. [License](#license)
8. [Contact](#contact)

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

## Roadmap

Disclaimer: The following are my initial guesses and not strict timelines

### Sprint 1: Foundation & Accessibility (until end of October)

The goal for this sprint is to establish the core infrastructure: accessible interface with keyboard navigation, the keyboard shortcut to open the extension, quick prompts and semantic headings to each of the conversation turns for easy navigation. No AI integration at this point yet.

### Sprint 2: Core Functionality and AI integration (Current)

- AI Keys input from the settings page
- AI-generated responses based on HTML/CSS and screenshots of the active tab

### Sprint 3: Customization (December 9 - Current)

- Fixes to visual description
- Keyboard shortcut customization
- Added full-page screenshot instead of just viewport-only, which can be changed on the settings page
- Reset button for settings page
- Quick action buttons added to compare against current slash commands

### Sprint 4: Customization (All through January)

- Feedback customization (level of detail and instructions/context)
- Chat download settings (only favorites or full chat)

### Sprint 5: About page and Nice-to-Haves (Mid or end of February)

- Finish polishing About page and add all necessary documentation
- Nice-to-have's and newer suggested features (if time allows), edge cases

### Beta launch prediction: End of February of Early March 2026

For detailed progress, visit the [SenseUI GitHub issues page](https://github.com/reginacas/sense-ui/issues)

Look for the issue pinned

---

## How to Contribute

### As a Tester

Testers help us find issues and improve accessibility. Requirements:

- You use a screen reader (NVDA, JAWS, VoiceOver)
- You have experience or are learning web development
- You can spend around 30 minutes testing it, every 2 to 3 weeks until the end of February approximately

At the start of each sprint, I create a tracking issue with features to test (labeled "current-sprint") with:

- What features are in this sprint
- What to look for when testing.
  You download the Release, test it, and comment on what works and what breaks, suggest improvements, share words of encouragement, etc.

### As a Developer

If your heart desires, you can contribute code, fix bugs, or propose features.
To find an approachable first issue to fix, you can check the ones with an "easy-fix" label [here](https://github.com/reginacas/sense-ui/issues?q=is%3Aissue%20state%3Aopen%20label%3Aeasy-fix)

Simply fork the repository, make your changes and start a pull request.
[Contact me](#contact) for any questions you have.

### Participation of sighted contributors

This project is built for blind and visually impaired developers, and their feedback and expertise guide its direction. Of course, sighted developers are also welcome to contribute, as long as their work supports these goals and respects the lived‑experience leadership of blind contributors. Collaboration across perspectives can only strenghten the project.

### Data Protection

If you decide to participate and become part of the research study, you can read about how your personal data will be handled here: [Data protection](DATA_PROTECTION.md)

For Chrome Web Store users, the extension privacy policy is available here: [Privacy Policy](PRIVACY_POLICY.md)

You can choose to remain anonymous, or if you are comfortable sharing your name, I would be happy to aknowledgement and credit your contributions in any published papers that come out of this project.

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

To learn more about the research and the previous study we did to come up with the concept, see the project wiki: [SenseUI Wiki](https://github.com/reginacas/sense-ui/wiki)

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
