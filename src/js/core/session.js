import { api } from './api.js';
import { store } from './store.js';

let currentUser = null;

export async function initSession() {
  window.addEventListener('auth:unauthorized', () => {
    currentUser = null;
    store.emit('session:expired');
  });

  try {
    currentUser = await api.getCurrentUser();
    store.emit('session:ready', currentUser);
  } catch (e) {
    if (e.status === 401 || e.status === 0) {
      currentUser = null;
      store.emit('session:anonymous');
    } else throw e;
  }
  return currentUser;
}

export const getUser    = () => currentUser;
export const isAuthed   = () => !!currentUser;