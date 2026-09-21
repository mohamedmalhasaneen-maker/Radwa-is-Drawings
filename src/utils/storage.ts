import { ProjectData, ProjectMetadata } from '../types';

const DB_NAME = 'RassamDrawingAppDB';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        const store = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProjectToDB(project: ProjectData): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, 'readwrite');
    const store = tx.objectStore(PROJECTS_STORE);
    const req = store.put(project);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getProjectFromDB(id: string): Promise<ProjectData | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, 'readonly');
    const store = tx.objectStore(PROJECTS_STORE);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function listProjectsFromDB(): Promise<ProjectMetadata[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, 'readonly');
    const store = tx.objectStore(PROJECTS_STORE);
    const req = store.getAll();

    req.onsuccess = () => {
      const all: ProjectData[] = req.result || [];
      // Return metadata without heavy layer dataUrl blobs for fast listing
      const metas: ProjectMetadata[] = all
        .map((p) => ({
          id: p.id,
          title: p.title,
          width: p.width,
          height: p.height,
          dpi: p.dpi,
          backgroundColor: p.backgroundColor,
          hasTransparentBg: p.hasTransparentBg,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          thumbnail: p.thumbnail,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(metas);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, 'readwrite');
    const store = tx.objectStore(PROJECTS_STORE);
    const req = store.delete(id);

    req.onsuccess = () => {
      try {
        const lastId = localStorage.getItem('rassam_last_project_id');
        if (lastId === id) {
          localStorage.removeItem('rassam_last_project_id');
        }
      } catch (e) {
        // Ignore localStorage errors
      }
      resolve();
    };

    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Local storage for quick preferences
export function loadSavedPreferences() {
  try {
    const theme = localStorage.getItem('rassam_theme') || 'dark';
    const recentColors = JSON.parse(localStorage.getItem('rassam_recent_colors') || '[]');
    const customPalette = JSON.parse(localStorage.getItem('rassam_custom_palette') || '[]');
    const lastProjectId = localStorage.getItem('rassam_last_project_id');
    const isSidePanelPinned = localStorage.getItem('rassam_sidepanel_pinned') === 'true';
    return { theme, recentColors, customPalette, lastProjectId, isSidePanelPinned };
  } catch (e) {
    return { theme: 'dark', recentColors: [], customPalette: [], lastProjectId: null, isSidePanelPinned: false };
  }
}

export function savePreferences(prefs: {
  theme?: string;
  recentColors?: string[];
  customPalette?: string[];
  lastProjectId?: string;
  isSidePanelPinned?: boolean;
}) {
  try {
    if (prefs.theme) localStorage.setItem('rassam_theme', prefs.theme);
    if (prefs.recentColors) localStorage.setItem('rassam_recent_colors', JSON.stringify(prefs.recentColors));
    if (prefs.customPalette) localStorage.setItem('rassam_custom_palette', JSON.stringify(prefs.customPalette));
    if (prefs.lastProjectId) localStorage.setItem('rassam_last_project_id', prefs.lastProjectId);
    if (prefs.isSidePanelPinned !== undefined) {
      localStorage.setItem('rassam_sidepanel_pinned', String(prefs.isSidePanelPinned));
    }
  } catch (e) {
    // Ignore quota issues
  }
}
