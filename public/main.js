document.addEventListener('DOMContentLoaded', () => {
  const soundboard = document.getElementById('soundboard');
  const loadingContainer = document.getElementById('loading-container');
  const loadingBar = document.getElementById('loading-bar');
  let currentAudio;
  let loadedCount = 0;

  fetch('/sounds')
    .then(response => response.json())
    .then(sounds => {
      const audioElements = {};

      sounds.forEach(sound => {
        const audio = new Audio(sound.url);
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
        audioElements[sound.name] = audio;

        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('button-container');

        const button = document.createElement('button');
        button.classList.add('sound-button');
        button.textContent = sound.name;
        button.addEventListener('click', () => {
          if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
          }
          audio.play();
          currentAudio = audio;
        });
        buttonContainer.appendChild(button);
        soundboard.appendChild(buttonContainer);
      });
    });
});
