// main.js
function generateDistinguishableColors(X, mod) {
  const colors = [];
  const saturation = 0.75;
  const value = 0.75;

  for (let i = 0; i < X; i++) {
    const hue = i / X * (+mod || 1);
    const [r, g, b] = hsvToRgb(hue, saturation, value);
    const hexColor = rgbToHex(r, g, b);
    colors.push(hexColor);
  }

  return colors;
}

function hsvToRgb(h, s, v) {
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function componentToHex(c) {
  const hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

document.addEventListener('DOMContentLoaded', () => {
  const soundboard = document.getElementById('soundboard');
  const loadingContainer = document.getElementById('loading-container');
  const loadingBar = document.getElementById('loading-bar');
  // const palette = new poline.Poline({ closedLoop: true })
  let currentAudio;
  let loadedCount = 0;
  let currentPath = '';
  // let paletteCt
  
  function getOrCreateSection(text) {
    let heading = document.querySelector(`button[data-heading="${text}"]`);
    let section = document.querySelector(`section[data-heading="${text}"]`);
    if (!heading) {
      heading = document.createElement('button');
      heading.classList.add('heading')
      heading.setAttribute('data-heading', text);
      heading.setAttribute('data-seen', true);
      heading.textContent = text;
      section = document.createElement('section');
      section.setAttribute('data-heading', text)
      section.setAttribute('data-seen', true)
      heading.addEventListener('click', () => {
        const newIsSeen = section.getAttribute('data-seen') == 'true' ? false : true
        section.setAttribute('data-seen', newIsSeen)
        heading.setAttribute('data-seen', newIsSeen)
      })
      section.appendChild(heading);
      soundboard.appendChild(section);
    }
    if (heading && section)
      return [heading, section];
    throw 'didnt get a section'
  }

  function fetchSounds(path) {
    fetch(`/sounds${path ? '?path=' + encodeURIComponent(path) : ''}`)
      .then(response => response.json())
      .then(sounds => {
        loadedCount = 0;
        soundboard.innerHTML = '';

        const folderNamesAndColorIndices = {}
        sounds.forEach(sound => {
          folderNamesAndColorIndices[sound.name.replace(/^\//,'').split('/')[0]] = 0
        })
        const folderNames = Object.keys(folderNamesAndColorIndices)
        const colors = generateDistinguishableColors(folderNames.length, 2)
        folderNames.map((folder, i) => folderNamesAndColorIndices[folder] = i)
        console.log({ folderNames, folderNamesAndColorIndices })

        sounds.forEach((sound) => {
          let audio;
          sound.name = sound.name.replace(/^\//, '')

          if (sound.type === 'sound') {
            audio = new Audio(sound.url);
            audio.onerror = () => {
              console.error(`Error loading audio file: ${sound.url}`);
            };
            audio.onloadeddata = () => {
              loadedCount++;
              const progress = (loadedCount / sounds.length) * 100;
              loadingBar.style.width = `${progress}%`;
              if (loadedCount === sounds.length) {
                setTimeout(() => {
                  loadingContainer.style.display = 'none';
                }, 500);
              }
            };
          }

          const button = document.createElement('button');
          button.classList.add('sound-button');
          const parts = sound.name.split('/')
          let heading, section;
          if (parts.length > 1) {
            [heading, section] = getOrCreateSection(parts[0])
          }
          button.textContent = parts[1].replace(/\.\w+$/,'');
          button.style = 'background-color: ' + colors[folderNamesAndColorIndices[parts[0]]]
          button.addEventListener('click', () => {
            if (sound.type === 'folder') {
              currentPath = sound.relativePath;
              fetchSounds(currentPath);
            } else {
              if (currentAudio && !currentAudio.paused) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
              }
              audio.play();
              currentAudio = audio;
            }
          });

          let parent = section || soundboard;
          parent.appendChild(button);
        });
      });
  }

  fetchSounds(currentPath);
});
      