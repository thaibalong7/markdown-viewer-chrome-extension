import { MESSAGE_TYPES, sendMessage } from '../messaging/index.js'

(async function initOptions() {
  const textarea = document.getElementById('settings-json');

  async function load() {
    const response = await sendMessage({ type: MESSAGE_TYPES.GET_SETTINGS });
    if (!response?.ok) {
      textarea.value = response?.error || 'Failed to load settings.';
      return;
    }
    textarea.value = JSON.stringify(response.data, null, 2);
  }

  document.getElementById('reload-settings').addEventListener('click', load);

  document.getElementById('save-settings').addEventListener('click', async () => {
    let parsed;
    try {
      parsed = JSON.parse(textarea.value);
    } catch (err) {
      window.alert(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    const response = await sendMessage({
      type: MESSAGE_TYPES.SAVE_SETTINGS,
      payload: parsed
    });
    if (!response?.ok) {
      window.alert(`Save failed: ${response?.error || 'Unknown error'}`);
      return;
    }
    await load();
  });

  document.getElementById('reset-settings').addEventListener('click', async () => {
    await sendMessage({ type: MESSAGE_TYPES.RESET_SETTINGS });
    await load();
  });

  await load();
})();
