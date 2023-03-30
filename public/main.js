// main.js
document.addEventListener('DOMContentLoaded', () => {
  const soundboard = document.getElementById('soundboard');
  const loadingContainer = document.getElementById('loading-container');
  const loadingBar = document.getElementById('loading-bar');
  const breadcrumb = document.getElementById('breadcrumb');
  let currentAudio;
  let loadedCount = 0;
  let currentPath = '';
  
  function getOrCreateHeading(text) {
    let heading = document.querySelector(`h2[data-heading="${text}"]`);
    if (!heading) {
      heading = document.createElement('h2');
      heading.setAttribute('data-heading', text);
      heading.textContent = text;
      soundboard.appendChild(heading);
    }
    return heading;
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

          const buttonContainer = document.createElement('div');
          buttonContainer.classList.add('button-container');

          const button = document.createElement('button');
          button.classList.add('sound-button');
          const parts = sound.name.split('/')
          if (parts.length > 1) {
            getOrCreateHeading(parts[0])
          }
          button.textContent = parts.pop().replace(/\.\w+$/,'');
          button.addEventListener('click', () => {
            if (sound.type === 'folder') {
              currentPath = sound.relativePath;
              breadcrumb.textContent = currentPath;
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

          buttonContainer.appendChild(button);
          soundboard.appendChild(buttonContainer);
        });
      });
  }

  breadcrumb.addEventListener('click', () => {
    if (currentPath) {
      currentPath = path.dirname(currentPath);
      breadcrumb.textContent = currentPath;
      fetchSounds(currentPath);
    }
  });

  fetchSounds(currentPath);
});
      