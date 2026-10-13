const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

connectDB()
  .then(async () => {
    // Make sure the unique/partial indexes that enforce business rules exist before serving traffic.
    const models = require('./models');
    await Promise.all(Object.values(models).map((m) => m.init()));
    app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port} (${env.nodeEnv})`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
