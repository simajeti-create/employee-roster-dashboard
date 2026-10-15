import app from './src/app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Employee roster API listening on http://localhost:${PORT}`);
});
