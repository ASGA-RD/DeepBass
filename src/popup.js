document.addEventListener('DOMContentLoaded', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab.id;
    const storageKey = `deepBass_${tabId}`;

    const bassSlider = document.getElementById('bass-slider');
    const toggle = document.getElementById('toggle');
    const resetButton = document.getElementById('reset-button');

    function isEnabled() {
        return toggle.classList.contains('on');
    }

    function setToggleState(state) {
        toggle.classList.toggle('on', state);
        bassSlider.disabled = !state;
    }

    function saveState(enabled, bass) {
        const data = {};
        data[storageKey] = { enabled, bass };
        chrome.storage.local.set(data, () => {
            applyBassBoost(tabId, enabled, parseFloat(bass));
        });
    }

    // INJETAR SCRIPT PARA APLICAR BASS BOOST
    function applyBassBoost(tabId, enabled, bassLevel) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (enabled, bassLevel) => {
                if (!window.deepBassContext) {
                    window.deepBassContext = new (window.AudioContext || window.webkitAudioContext)();
                    window.deepBassGain = window.deepBassContext.createGain();
                    window.deepBassFilter = window.deepBassContext.createBiquadFilter();
                    window.deepBassFilter.type = "lowshelf";
                    window.deepBassFilter.frequency.value = 200;
                    window.deepBassFilter.gain.value = bassLevel;

                    const connectAudio = () => {
                        document.querySelectorAll("audio, video").forEach((media) => {
                            try {
                                const source = window.deepBassContext.createMediaElementSource(media);
                                source.connect(window.deepBassFilter);
                                window.deepBassFilter.connect(window.deepBassGain);
                                window.deepBassGain.connect(window.deepBassContext.destination);
                            } catch (e) {
                                // Já conectado
                            }
                        });
                    };

                    connectAudio();
                }

                if (enabled) {
                    window.deepBassFilter.gain.value = bassLevel;
                } else {
                    window.deepBassFilter.gain.value = 0;
                }
            },
            args: [enabled, bassLevel]
        });
    }

    // Inicializar
    chrome.storage.local.get([storageKey], (result) => {
        const state = result[storageKey] || { enabled: false, bass: '0' };
        bassSlider.value = state.bass;
        setToggleState(state.enabled);
        applyBassBoost(tabId, state.enabled, parseFloat(state.bass));
    });

    toggle.addEventListener('click', () => {
        const newState = !isEnabled();
        setToggleState(newState);
        saveState(newState, bassSlider.value);
    });

    bassSlider.addEventListener('input', () => {
        if (isEnabled()) {
            saveState(true, bassSlider.value);
        }
    });

    resetButton.addEventListener('click', () => {
        bassSlider.value = 0;
        saveState(isEnabled(), 0);
    });
});
