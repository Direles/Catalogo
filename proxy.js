// Funzione proxy per gestire le chiamate allo script di Google Apps
const callAppsScript = async (action, method = 'GET', data = null) => {
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz44KqWzdWqRPkIfLrJ5KOz-YpkN_fbRbcu1M0mRvPILFIzciIVE_A_g4eG7pS16jk/exec";
  const params = action ? `?action=${action}` : '';
  const url = `${APPS_SCRIPT_URL}${params}`;

  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Errore nella chiamata allo script:", error);
    throw error;
  }
};