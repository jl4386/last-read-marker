const entriesList = document.getElementById("entries");
const emptyState = document.getElementById("empty");
const countEl = document.getElementById("count");
const saveButton = document.getElementById("save-current");
const refreshButton = document.getElementById("refresh-list");

const STORAGE_KEY = "lastReadEntries";
const storageArea = chrome.storage.sync;

function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setLoading(isLoading) {
  saveButton.disabled = isLoading;
  refreshButton.disabled = isLoading;
}

function renderEntries(entries) {
  entriesList.innerHTML = "";
  countEl.textContent = entries.length;

  if (!entries.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "entry";

    const title = document.createElement("div");
    title.className = "entry-title";
    title.textContent = entry.title || "Untitled";

    const url = document.createElement("div");
    url.className = "entry-url";
    url.textContent = entry.url;

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    meta.innerHTML = `<span>${Math.round(entry.scrollY)}px</span><span>${formatDate(entry.updatedAt)}</span>`;

    const actions = document.createElement("div");
    actions.className = "entry-actions";

    const openButton = document.createElement("button");
    openButton.className = "open";
    openButton.textContent = "Open & jump";
    openButton.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "OPEN_ENTRY",
        payload: { url: entry.url, scrollY: entry.scrollY },
      });
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", async () => {
      const remaining = entries.filter((item) => item.url !== entry.url);
      await storageArea.set({ [STORAGE_KEY]: remaining });
      renderEntries(remaining);
    });

    actions.append(openButton, deleteButton);
    li.append(title, url, meta, actions);
    entriesList.appendChild(li);
  }
}

async function loadEntries() {
  const result = await storageArea.get(STORAGE_KEY);
  const entries = result[STORAGE_KEY] || [];
  renderEntries(entries);
}

async function saveCurrentPage() {
  setLoading(true);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url || !tab.url.startsWith("http")) {
      alert("Open a normal web page first.");
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_SCROLL" });
    const scrollY = response?.scrollY ?? 0;

    const result = await storageArea.get(STORAGE_KEY);
    const entries = result[STORAGE_KEY] || [];

    const existingIndex = entries.findIndex((entry) => entry.url === tab.url);
    const nextEntry = {
      url: tab.url,
      title: tab.title,
      scrollY,
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      entries[existingIndex] = nextEntry;
    } else {
      entries.unshift(nextEntry);
    }

    await storageArea.set({ [STORAGE_KEY]: entries });
    renderEntries(entries);
  } catch (error) {
    console.error(error);
    alert("Unable to save this page. Try refreshing the page first.");
  } finally {
    setLoading(false);
  }
}

saveButton.addEventListener("click", saveCurrentPage);
refreshButton.addEventListener("click", loadEntries);

loadEntries();
