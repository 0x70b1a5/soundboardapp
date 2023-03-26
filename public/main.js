document.addEventListener('DOMContentLoaded', () => {
    const soundboard = document.getElementById('soundboard');
  
    fetch('/sounds')
      .then(response => response.json())
      .then(sounds => {
        const audioElements = {};

        sounds.forEach(sound => {
          const audio = new Audio(sound.url);
          audio.onerror = () => {
            console.error(`Error loading audio file: ${sound.url}`);
          };
      
          audioElements[sound.name] = audio;
  
          const buttonContainer = document.createElement('div');
          buttonContainer.classList.add('button-container');
  
          const button = document.createElement('button');
          button.classList.add('sound-button');
          button.textContent = sound.name;
          button.addEventListener('click', () => audio.play());
          buttonContainer.appendChild(button);
  
          soundboard.appendChild(buttonContainer);
        });
  
        Sortable.create(soundboard, {
          animation: 150,
          handle: '.sound-button',
        });
      });
  });
  