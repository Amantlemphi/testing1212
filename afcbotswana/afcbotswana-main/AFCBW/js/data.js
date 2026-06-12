/* ============================================================
   AFC BOTSWANA — FIREBASE DATA LAYER
   Shared by public site and main website admin.
   ============================================================ */

import {
  db,
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp
} from '../camp/camp-firebase.js';

const SITE_EVENTS = 'site_events';
const SITE_CONFIG = 'site_config';
const SITE_REGISTRATIONS = 'site_registrations';
const SITE_GALLERY = 'site_gallery';
const LEGACY_EVENTS_KEY = 'afco_events';

const defaultConfig = {
  hero_title: 'Welcome to Apostolic Faith Church',
  weekly_verse: '"For where two or three gather in my name, there am I with them." — Matthew 18:20',
  about_text: 'The Apostolic Faith Church of Portland, Oregon – Botswana Branch is a vibrant community of believers dedicated to spreading the Gospel of Jesus Christ. Founded on the principles of the original 1906 Azusa Street revival, we uphold the full Gospel message of salvation, sanctification, and the baptism of the Holy Spirit.',
  contact_email: 'contact@afcobotswana.org',
  contact_phone: '+267 71 234 567',
};

function normalizeDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    ...data,
    created: data.created || data.createdAt?.toDate?.().toISOString?.() || data.createdAt || '',
  };
}

async function getCollection(name, sortField = 'createdAt', sortDir = 'desc') {
  try {
    const snap = await getDocs(query(collection(db, name), orderBy(sortField, sortDir)));
    return snap.docs.map(normalizeDoc);
  } catch (e) {
    console.warn(`Could not load ${name}:`, e);
    return [];
  }
}

const DB = {
  defaultConfig,
  collections: {
    events: SITE_EVENTS,
    config: SITE_CONFIG,
    registrations: SITE_REGISTRATIONS,
    gallery: SITE_GALLERY,
  },

  async getEvents() {
    const events = await getCollection(SITE_EVENTS, 'date', 'asc');
    return events;
  },

  async addEvent(evt) {
    const ref = await addDoc(collection(db, SITE_EVENTS), {
      ...evt,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id, ...evt };
  },

  async updateEvent(id, data) {
    await updateDoc(doc(db, SITE_EVENTS, id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return true;
  },

  async deleteEvent(id) {
    await deleteDoc(doc(db, SITE_EVENTS, id));
  },

  getLegacyEvents() {
    try {
      return JSON.parse(localStorage.getItem(LEGACY_EVENTS_KEY)) || [];
    } catch {
      return [];
    }
  },

  async migrateLegacyEvents() {
    const legacyEvents = this.getLegacyEvents();
    if (!legacyEvents.length) return 0;

    const currentEvents = await this.getEvents();
    const currentKeys = new Set(currentEvents.map(ev =>
      [ev.name, ev.date, ev.time, ev.location].map(v => String(v || '').trim().toLowerCase()).join('|')
    ));

    let migrated = 0;
    for (const ev of legacyEvents) {
      const eventData = {
        name: String(ev.name || '').trim(),
        date: ev.date || '',
        time: ev.time || '',
        location: String(ev.location || '').trim(),
        description: String(ev.description || '').trim(),
        poster: String(ev.poster || '').trim(),
      };
      if (!eventData.name || !eventData.date || !eventData.time || !eventData.location) continue;

      const key = [eventData.name, eventData.date, eventData.time, eventData.location]
        .map(v => String(v || '').trim().toLowerCase())
        .join('|');
      if (currentKeys.has(key)) continue;

      await this.addEvent(eventData);
      currentKeys.add(key);
      migrated++;
    }

    if (migrated > 0) localStorage.removeItem(LEGACY_EVENTS_KEY);
    return migrated;
  },

  async getConfig() {
    try {
      const snap = await getDocs(query(collection(db, SITE_CONFIG), where('key', '==', 'main')));
      if (snap.empty) return { ...this.defaultConfig };
      return { ...this.defaultConfig, ...snap.docs[0].data() };
    } catch (e) {
      console.warn('Could not load site config:', e);
      return { ...this.defaultConfig };
    }
  },

  async saveConfig(cfg) {
    const payload = {
      key: 'main',
      ...cfg,
      updatedAt: serverTimestamp(),
    };
    const snap = await getDocs(query(collection(db, SITE_CONFIG), where('key', '==', 'main')));
    if (snap.empty) {
      await addDoc(collection(db, SITE_CONFIG), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      return;
    }
    await updateDoc(doc(db, SITE_CONFIG, snap.docs[0].id), payload);
  },

  async getRegistrations() {
    return getCollection(SITE_REGISTRATIONS, 'createdAt', 'desc');
  },

  async addRegistration(reg) {
    const ref = await addDoc(collection(db, SITE_REGISTRATIONS), {
      ...reg,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id, ...reg };
  },

  async getGallery() {
    return getCollection(SITE_GALLERY, 'createdAt', 'desc');
  },

  async addGalleryItem(item) {
    const ref = await addDoc(collection(db, SITE_GALLERY), {
      ...item,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id, ...item };
  },

  async deleteGalleryItem(id) {
    await deleteDoc(doc(db, SITE_GALLERY, id));
  },
};

window.DB = DB;

export { DB };
