const app = require('../api/index.js');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`Server ishlamoqda: http://localhost:${PORT}`);
  console.log(`=================================`);
});
