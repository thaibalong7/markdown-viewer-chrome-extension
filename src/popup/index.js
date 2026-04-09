import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'

(async function initPopup() {
  const statusEl = document.getElementById('status');
  const previewEl = document.getElementById('settings-preview');
  const resetButton = document.getElementById('reset-settings');

  async function loadSettings() {
    const response = await sendMessage({ type: MESSAGE_TYPES.GET_SETTINGS });
    if (!response?.ok) {
      statusEl.textContent = 'Failed to load settings.';
      previewEl.textContent = response?.error || 'Unknown error';
      return;
    }

    statusEl.textContent = 'Settings loaded.';
    previewEl.textContent = JSON.stringify(response.data, null, 2);
  }

  resetButton.addEventListener('click', async () => {
    await sendMessage({ type: MESSAGE_TYPES.RESET_SETTINGS });
    await loadSettings();
  });

  await loadSettings();
})();
