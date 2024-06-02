// this file exists because node is retarded
import { execSync } from 'child_process'

if (process.env.JANET_VERSION && process.env.MAIN_CONTAINER) {
  // apply prisma migrations and skip generator
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
}
import './dist/src/index.js'
