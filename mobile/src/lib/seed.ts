import { db, scalar } from './db';
import type { Form } from './types';

const C3 = ['30C', '200C', '1M'];
const C5 = ['6', '30C', '200C', '1M', '10M'];
const BIO = ['3X', '6X', '12X', '30X'];

// [name, potencies, forms, group]
type M = [string, string[], Form[], string?];
const G: Form[] = ['globule', 'drop'];

const POLYCHRESTS = `Aconitum napellus|Aethusa cynapium|Agaricus muscarius|Allium cepa|Aloe socotrina|Alumina|Ambra grisea|Ammonium carbonicum|Anacardium orientale|Antimonium crudum|Antimonium tartaricum|Apis mellifica|Argentum nitricum|Arnica montana|Arsenicum album|Aurum metallicum|Baptisia tinctoria|Baryta carbonica|Belladonna|Bellis perennis|Berberis vulgaris|Borax|Bryonia alba|Cactus grandiflorus|Calcarea carbonica|Calcarea phosphorica|Calendula officinalis|Camphora|Cantharis|Carbo vegetabilis|Causticum|Chamomilla|Chelidonium majus|China officinalis|Cimicifuga racemosa|Cina|Cocculus indicus|Coffea cruda|Colchicum autumnale|Colocynthis|Conium maculatum|Cuprum metallicum|Drosera|Dulcamara|Equisetum hyemale|Euphrasia|Ferrum metallicum|Ferrum phosphoricum|Gelsemium|Glonoinum|Graphites|Hamamelis virginica|Hepar sulphur|Hyoscyamus niger|Hypericum perforatum|Ignatia amara|Iodium|Ipecacuanha|Kali bichromicum|Kali carbonicum|Kreosotum|Lachesis|Ledum palustre|Lilium tigrinum|Lycopodium clavatum|Magnesia phosphorica|Medorrhinum|Mercurius corrosivus|Mercurius solubilis|Natrum carbonicum|Natrum muriaticum|Natrum sulphuricum|Nitricum acidum|Nux moschata|Nux vomica|Opium|Petroleum|Phosphoricum acidum|Phosphorus|Phytolacca decandra|Platina|Podophyllum|Psorinum|Pulsatilla|Pyrogenium|Rhododendron|Rhus toxicodendron|Ruta graveolens|Sabadilla|Sabina|Sanguinaria|Sarsaparilla|Secale cornutum|Sepia|Silicea|Spigelia|Spongia tosta|Stannum metallicum|Staphysagria|Stramonium|Sulphur|Sulphuricum acidum|Symphytum|Syphilinum|Tabacum|Tarentula hispanica|Thuja occidentalis|Tuberculinum|Veratrum album|Zincum metallicum`;

const MOTHERS = `Alfalfa|Avena sativa|Berberis aquifolium|Blatta orientalis|Calendula|Carduus marianus|Cassia sophera|Crataegus oxyacantha|Echinacea|Ginseng|Hydrastis canadensis|Justicia adhatoda|Ocimum sanctum|Passiflora incarnata|Rauwolfia serpentina|Syzygium jambolanum|Thuja|Urtica urens|Arnica|Chelidonium`;

const BIOCHEMICS = `Calcarea fluorica|Calcarea phosphorica|Calcarea sulphurica|Ferrum phosphoricum|Kali muriaticum|Kali phosphoricum|Kali sulphuricum|Magnesia phosphorica|Natrum muriaticum|Natrum phosphoricum|Natrum sulphuricum|Silicea`;

const EXTRA: M[] = [
  ['Five Phos', ['6X'], ['tablet'], 'বায়োকেমিক'],
  ['Bio-combination 1', ['6X'], ['tablet'], 'বায়োকেমিক'],
  ['Sac lac', ['প্লাসিবো'], ['powder', 'globule'], 'প্লাসিবো'],
  ['Calendula ointment', ['Q'], ['ointment'], 'বাহ্যিক'],
  ['Arnica ointment', ['Q'], ['ointment'], 'বাহ্যিক'],
];

export function medicineSeed(): M[] {
  const out: M[] = [];
  for (const n of POLYCHRESTS.split('|')) out.push([n, ['Nux vomica', 'Pulsatilla', 'Sulphur', 'Arsenicum album', 'Lycopodium clavatum', 'Calcarea carbonica', 'Phosphorus', 'Sepia'].includes(n) ? C5 : C3, G]);
  for (const n of BIOCHEMICS.split('|')) out.push([n + ' (Bio)', BIO, ['tablet'], 'বায়োকেমিক']);
  for (const n of MOTHERS.split('|')) out.push([n + ' Q', ['Q'], ['mother'], 'মাদার টিংচার']);
  return out.concat(EXTRA);
}

const DISEASES: [string, string][] = [
  ['মাইগ্রেন', 'Migraine'], ['মাথাব্যথা', 'Headache'], ['গ্যাস্ট্রিক', 'Gastritis'], ['এলার্জি', 'Allergy'], ['চর্মরোগ', 'Skin disease'],
  ['বাত-ব্যথা', 'Rheumatism'], ['জ্বর', 'Fever'], ['সর্দি-কাশি', 'Cold & cough'], ['অনিদ্রা', 'Insomnia'], ['হাঁপানি', 'Asthma'],
  ['ডায়াবেটিস', 'Diabetes'], ['উচ্চ রক্তচাপ', 'Hypertension'], ['কোষ্ঠকাঠিন্য', 'Constipation'], ['ডায়রিয়া', 'Diarrhoea'], ['পাইলস', 'Piles'],
  ['একজিমা', 'Eczema'], ['সোরিয়াসিস', 'Psoriasis'], ['ব্রণ', 'Acne'], ['চুল পড়া', 'Hair fall'], ['খুশকি', 'Dandruff'],
  ['টনসিল', 'Tonsillitis'], ['সাইনাস', 'Sinusitis'], ['থাইরয়েড', 'Thyroid'], ['মাসিকের সমস্যা', 'Menstrual problem'], ['লিউকোরিয়া', 'Leucorrhoea'],
  ['কিডনিতে পাথর', 'Kidney stone'], ['প্রস্রাবে জ্বালা', 'Urinary infection'], ['আঁচিল', 'Warts'], ['দুশ্চিন্তা', 'Anxiety'], ['বিষণ্ণতা', 'Depression'],
  ['কোমর ব্যথা', 'Back pain'], ['হাঁটু ব্যথা', 'Knee pain'], ['দাঁতের ব্যথা', 'Toothache'], ['কানের ব্যথা', 'Earache'], ['চোখ ওঠা', 'Conjunctivitis'],
  ['রক্তস্বল্পতা', 'Anaemia'], ['শিশুর দাঁত ওঠা', 'Teething'], ['কৃমি', 'Worms'], ['আঘাত', 'Injury'], ['ওজন বৃদ্ধি', 'Obesity'],
];

// [bn, en, short bn, short en, category, default-on]
const ADVICE: [string, string, string, string, 'rule' | 'food' | 'storage', 0 | 1][] = [
  ['ওষুধের আধা ঘণ্টা আগে ও পরে কিছু খাবেন না (পানি চলবে)', 'Nothing by mouth 30 minutes before and after the medicine (water is fine)', 'আধা ঘণ্টা আগে-পরে কিছু খাবেন না', 'Nothing 30 min before/after', 'rule', 1],
  ['কাঁচা পেঁয়াজ, রসুন, আদা খাবেন না', 'Avoid raw onion, garlic and ginger', 'কাঁচা পেঁয়াজ-রসুন নয়', 'No raw onion/garlic', 'food', 1],
  ['কফি, চা, পান-জর্দা এড়িয়ে চলুন', 'Avoid coffee, tea, betel leaf and tobacco', 'কফি-চা নয়', 'No coffee/tea', 'food', 1],
  ['পুদিনা বা কড়া টুথপেস্ট ব্যবহার করবেন না', 'Do not use mint or strong toothpaste', 'পুদিনা টুথপেস্ট নয়', 'No mint toothpaste', 'rule', 0],
  ['কর্পূর, বাম, কড়া গন্ধ থেকে দূরে থাকুন', 'Keep away from camphor, balms and strong smells', 'কর্পূর-বাম নয়', 'No camphor/balm', 'rule', 0],
  ['ওষুধ হাতে না নিয়ে ঢাকনায় নিয়ে খাবেন', 'Take the medicine from the cap, do not touch it by hand', 'ঢাকনায় নিয়ে খাবেন', 'Use the cap', 'rule', 0],
  ['তরল ওষুধ খাওয়ার আগে ১০ বার ঝাঁকিয়ে নিন', 'Shake liquid medicine 10 times before each dose', '১০ বার ঝাঁকাবেন', 'Shake 10 times', 'rule', 0],
  ['ওষুধ রোদ ও গন্ধ থেকে দূরে রাখবেন', 'Keep the medicine away from sunlight and smells', 'রোদ-গন্ধ থেকে দূরে', 'Away from sun/smell', 'storage', 0],
  ['ধূমপান ও মদ্যপান করবেন না', 'No smoking or alcohol', 'ধূমপান নয়', 'No smoking', 'food', 0],
  ['ঠান্ডা পানীয় ও আইসক্রিম এড়িয়ে চলুন', 'Avoid cold drinks and ice cream', 'ঠান্ডা পানীয় নয়', 'No cold drinks', 'food', 0],
  ['তেল-মসলাযুক্ত খাবার কম খাবেন', 'Eat less oily and spicy food', 'তেল-মসলা কম', 'Less oil/spice', 'food', 0],
  ['ওষুধ ফ্রিজে রাখবেন না', 'Do not keep the medicine in the fridge', 'ফ্রিজে নয়', 'Not in fridge', 'storage', 0],
  ['মোবাইল ফোন ও পারফিউমের পাশে রাখবেন না', 'Do not keep next to a mobile phone or perfume', 'মোবাইলের পাশে নয়', 'Away from phone', 'storage', 0],
];

export function seedIfEmpty() {
  if (scalar<number>('SELECT COUNT(*) FROM medicines') > 0) return;
  // Seeded catalogue rows are "clean" (dirty=0, updated_at=0): they only sync once the doctor edits them.
  const ins = (sql: string, rows: any[][]) => {
    const st = db.prepareSync(sql);
    try {
      for (const r of rows) st.executeSync(r);
    } finally {
      st.finalizeSync();
    }
  };
  db.withTransactionSync(() => {
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    ins(
      `INSERT OR IGNORE INTO medicines (id,name,potencies,forms,grp,dirty,updated_at) VALUES (?,?,?,?,?,0,0)`,
      medicineSeed().map(([name, p, f, g]) => ['m-' + slug(name), name, JSON.stringify(p), JSON.stringify(f), g ?? '']),
    );
    ins(
      `INSERT OR IGNORE INTO diseases (id,name_bn,name_en,dirty,updated_at) VALUES (?,?,?,0,0)`,
      DISEASES.map(([bn, en]) => ['d-' + slug(en), bn, en]),
    );
    ins(
      `INSERT OR IGNORE INTO advice (id,text_bn,text_en,short_bn,short_en,cat,is_default,sort,dirty,updated_at) VALUES (?,?,?,?,?,?,?,?,0,0)`,
      ADVICE.map((a, i) => ['a-' + (i + 1), ...a, i]),
    );
  });
}
