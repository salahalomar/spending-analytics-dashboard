import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: false,
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1440,
    viewportHeight: 900,
    // Building 50,000 transactions on a cold CI runner can take a moment.
    defaultCommandTimeout: 12_000,
    retries: { runMode: 2, openMode: 0 },

    setupNodeEvents(on) {
      // Headless browsers default to a 1280x720 window, which is smaller than
      // the viewport configured above — screenshots then come out cropped and
      // the dashboard renders in its narrow layout. Size the window to match.
      on('before:browser:launch', (browser, launchOptions) => {
        const width = 1600;
        const height = 1050;

        if (browser.name === 'electron') {
          launchOptions.preferences.width = width;
          launchOptions.preferences.height = height;
        } else if (browser.family === 'chromium') {
          launchOptions.args.push(`--window-size=${width},${height}`);
        }

        return launchOptions;
      });
    },
  },
});
