const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const recursive = require('recursive-readdir');
const isDirectory = require('is-directory');

const app = express();
const soundboardDir = path.join(__dirname, 'public', 'soundboard');

app.use(cors());
app.use(express.static('public'));

app.get('/sounds', (req, res) => {
  const directoryPath = req.query.path ? path.join(soundboardDir, req.query.path) : soundboardDir;

  recursive(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read soundboard directory' });
    }

    const items = files.filter(f => f.endsWith('.mp3') || f.endsWith('.ogg'))
      .sort().map(file => {
      const relativePath = file.replace(soundboardDir, '');
      return {
        type: isDirectory.sync(file) ? 'folder' : 'sound',
        name: relativePath,
        url: `/soundboard${relativePath}`,
        relativePath: relativePath,
      };
    });

    res.json(items);
  });
});

app.get('*', (req, res) => {
  const filePath = path.join(__dirname, 'public', req.path);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('File not found');
    }
  });
});

app.listen(process.env.PORT||3000, () => {
  console.log('Server started on http://localhost:'+(process.env.PORT || 3000));
});
