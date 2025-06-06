// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const fs = require('fs')
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { notarize } = require('@electron/notarize')

// Define the main async function
async function notarizeApp() {
  console.log('--- Starting notarize.js Script ---')

  // Get configuration from environment variables
  const appBundleId = process.env.APP_BUNDLE_ID
  const appPath = process.env.APP_PATH
  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD
  const teamId = process.env.APPLE_TEAM_ID

  // Only run on macOS
  if (process.platform !== 'darwin') {
    console.log('Not on macOS, skipping notarization.')
    return
  }

  console.log(`App Path: ${appPath}`)
  console.log(`App Bundle ID: ${appBundleId}`)
  console.log(`Apple ID: ${appleId ? '******' : 'Not Set'}`)
  console.log(`Team ID: ${teamId ? teamId : 'Not Set'}`)

  if (!appBundleId) throw new Error('APP_BUNDLE_ID environment variable not set')
  if (!appPath) throw new Error('APP_PATH environment variable not set')
  if (!appleId) throw new Error('APPLE_ID environment variable not set')
  if (!appleIdPassword) throw new Error('APPLE_APP_SPECIFIC_PASSWORD environment variable not set')
  if (!teamId) throw new Error('APPLE_TEAM_ID environment variable not set')

  if (!fs.existsSync(appPath)) {
    console.error(`Error: App path does not exist: ${appPath}`)
    throw new Error(`App path not found: ${appPath}`)
  }

  const notarizeOptions = {
    appBundleId: appBundleId,
    appPath: appPath,
    appleId: appleId,
    appleIdPassword: appleIdPassword,
    teamId: teamId
  }

  console.log('Attempting to call notarize function...')
  try {
    await notarize(notarizeOptions)
    console.log(`--- Notarization Successful for ${appPath} ---`)
  } catch (error) {
    console.error('--- Notarization Failed ---')
    console.error(error)
    // Check if the error is due to the app already being notarized
    if (error.message && error.message.includes('Package already notarized')) {
      console.log('Warning: App seems to be already notarized. Continuing...')
    } else {
      // Re-throw the error to ensure the script exits with a non-zero code on failure
      throw error
    }
  }
}

// Export the function for potential use as a hook (though we run it directly)
exports.default = notarizeApp

// Execute the function if the script is run directly (e.g., by `node notarize.js`)
if (require.main === module) {
  notarizeApp().catch((err) => {
    console.error('--- Error executing notarizeApp script directly ---')
    console.error(err)
    process.exit(1)
  })
}
