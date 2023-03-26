const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer();
const soundboardDir = path.join(__dirname, 'public', 'soundboard');


app.use(cors());
app.use(express.static('public'));

app.get('/sounds', (req, res) => {
  fs.readdir(soundboardDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read soundboard directory' });
    }

    const sounds = files.map(file => ({
      name: path.basename(file, path.extname(file)),
      url: `/soundboard/${file}`,
    }));

    res.json(sounds);
  });
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
