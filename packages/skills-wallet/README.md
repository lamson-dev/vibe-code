# Advanced Skills Wallet Carousel

This package implements an advanced skills wallet carousel to display personal skills, inspired by modern web design examples.

## Features
- Displays skills as interactive cards with images, descriptions, and links.
- Horizontal scrolling with CSS scroll snapping for a smooth user experience.
- Previous/Next buttons for easy navigation, implemented with JavaScript.
- Responsive design that adapts to different screen sizes.
- Custom-styled scrollbar (for browsers that support it).

## How to View
1. Navigate to the `packages/skills-wallet` directory.
2. Open the `index.html` file in a modern web browser (e.g., Chrome, Firefox, Safari, Edge).
3. For the best experience with scroll snapping and custom scrollbars, ensure your browser is up to date.

## Contents
- `index.html`: The main HTML file containing the advanced carousel structure with skill cards.
- `style.css`: Advanced CSS for layout, card styling, scroll snapping, button styling, and responsiveness.
- `script.js`: JavaScript for controlling the carousel navigation (previous/next buttons) and updating button states.

## Notes
- The carousel uses CSS Scroll Snap, which is widely supported in modern browsers.
- Placeholder images are used for the skill cards. These can be replaced with actual images.
- The example from `chrome.dev/carousel` showcased further experimental features like scroll-driven animations and specific CSS properties that might require browser flags (e.g., `#enable-experimental-web-platform-features` in Chrome for things like `scroll-timeline`). This implementation focuses on more broadly supported features for scroll snapping and button navigation but provides a strong foundation.
