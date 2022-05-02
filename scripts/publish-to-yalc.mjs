/**
 * Publish the theatre packages to a local registry with yalc for the build tests.
 */
import path from 'path'

const root = path.resolve(__dirname, '..')

// Make sure the script runs in the root of the monorepo
cd(root)

process.env.USING_YALC = 'true'

const packagesToPublish = [
  'theatre/core',
  'theatre/studio',
  'packages/dataverse',
  'packages/r3f',
  'packages/react',
]

;(async function () {
  // Build the theatre packages before publishing them
  await $`yarn build`

  // Publish the packages to the local `yalc` registry
  for (const pkg of packagesToPublish) {
    await $`npx yalc publish ${pkg}`
  }
})()
