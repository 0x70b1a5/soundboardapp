// main.js

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

  function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
  
    let hslColor = 'hsl(';
    const hue = (hash % 360);
    hslColor += hue + ', 50%, 50%)';
  
    return hslColor;
  }

  function fetchSounds(path) {
    fetch(`/sounds${path ? '?path=' + encodeURIComponent(path) : ''}`)
      .then(response => response.json())
      .then(sounds => {
        loadedCount = 0;
        soundboard.innerHTML = '';

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
          button.textContent = parts.pop().replace(/\.\w+$/,'');
          button.style = 'background-color: ' + stringToColor(section.getAttribute('data-heading'))
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
      