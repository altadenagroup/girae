// this file exists because node is retarded
import * as Sentry from '@sentry/node'

Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        nodeProfilingIntegration(),
        new Sentry.Integrations.Prisma({ client: this.db }),
        Sentry.anrIntegration({ captureStackTrace: true })
      ],
      tracesSampleRate: 1.0,
      _experiments: {
        metricsAggregator: true,
      }
    })
  

import './dist/src/index.js'
