const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 5330;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Inkpress running:`);
  console.log(`  Blog  → http://localhost:${PORT}/`);
  console.log(`  Admin → http://localhost:${PORT}/admin (password: ${process.env.ADMIN_PASSWORD ? 'from env' : '"admin" — set ADMIN_PASSWORD!'})`);
});
