import express from 'express';
import cors from 'cors';
import path from 'path';
import recursive from 'recursive-readdir';

const app = express();
const soundboardDir = path.join(process.cwd(), 'public', 'soundboard');

app.use(cors());

// API endpoints
app.get('/api/sounds', (_req, res) => {
    recursive(soundboardDir, (err, files) => {
        if (err) {
            return res
                .status(500)
                .json({ error: 'Unable to read soundboard directory' });
        }

        const items = files
            .filter((f) => f.endsWith('.mp3') || f.endsWith('.ogg'))
            .sort()
            .map((file) => {
                const relativePath = file.replace(soundboardDir, '');
                return {
                    type: 'sound',
                    name: relativePath,
                    path: relativePath,
                };
            });

        res.json(items);
    });
});

// Dedicated endpoint for serving audio files
app.get('/api/audio/:path(*)', (req, res) => {
    // console.log('Audio request for:', req.params.path);
    const audioPath = path.join(soundboardDir, req.params.path);
    res.sendFile(audioPath, (err) => {
        if (err) {
            console.error(err);
            res.status(404).send('Audio file not found');
        }
    });
});

app.get('*', (req, res) => {
    console.log('404 for path:', req.path);
    res.sendStatus(404);
});

app.listen(process.env.PORT || 5174, () => {
    console.log(
        'Server started on http://localhost:' + (process.env.PORT || 5174),
    );
});
