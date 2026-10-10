import { createStore } from './store';

/** Scratch selections shared between a screen and a picker sheet. */
export const pickStore = createStore<{ formDiseases: string[]; khataPid: string }>({ formDiseases: [], khataPid: '' });
