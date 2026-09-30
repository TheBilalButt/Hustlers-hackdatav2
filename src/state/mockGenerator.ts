import type { Table, LocaleCode, Dataset } from '../types/ir';

function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2d679f) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Realistic Pakistani names (Ahmed Raza, Bilal Khan, Ayesha Malik, Hamza Ali, etc.)
const PAKISTANI_PROFILES = [
  { first: 'Ahmed', last: 'Raza' },
  { first: 'Bilal', last: 'Khan' },
  { first: 'Ayesha', last: 'Malik' },
  { first: 'Hamza', last: 'Ali' },
  { first: 'Zainab', last: 'Bibi' },
  { first: 'Fatima', last: 'Noor' },
  { first: 'Usman', last: 'Tariq' },
  { first: 'Omar', last: 'Farooq' },
  { first: 'Sana', last: 'Tariq' },
  { first: 'Ali', last: 'Hassan' },
  { first: 'Maryam', last: 'Siddiqui' },
  { first: 'Mustafa', last: 'Shah' },
  { first: 'Danish', last: 'Qureshi' },
  { first: 'Saad', last: 'Abbasi' },
  { first: 'Hira', last: 'Gill' },
  { first: 'Zoya', last: 'Chaudhry' },
];

const FIRST_NAMES_PK = PAKISTANI_PROFILES.map((p) => p.first);
const LAST_NAMES_PK = PAKISTANI_PROFILES.map((p) => p.last);

const FIRST_NAMES_DE = [
  'Lukas', 'Maximilian', 'Leon', 'Paul', 'Felix', 'Sophie', 'Marie',
  'Maria', 'Mia', 'Emma', 'Hannah', 'Jonas', 'Anna', 'Tim', 'Laura'
];
const LAST_NAMES_DE = [
  'Mueller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer',
  'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schaefer', 'Koch', 'Bauer'
];

// Mixed international pool with Pakistani names included
const FIRST_NAMES_GLOBAL = [
  'Ahmed', 'Bilal', 'Ayesha', 'Hamza', 'Emma', 'Liam', 'Olivia', 'Noah',
  'Lucas', 'Sophia', 'Alexander', 'Zainab', 'Fatima', 'Marcus', 'Elena', 'Usman'
];
const LAST_NAMES_GLOBAL = [
  'Raza', 'Khan', 'Malik', 'Ali', 'Smith', 'Johnson', 'Williams', 'Brown',
  'Miller', 'Davis', 'Tariq', 'Farooq', 'Wilson', 'Anderson', 'Siddiqui', 'Shah'
];

const CITIES_PK = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Peshawar', 'Multan', 'Quetta', 'Sialkot', 'Gujranwala'
];
const CITIES_US = [
  'New York', 'San Francisco', 'Chicago', 'Austin', 'Seattle',
  'Boston', 'Denver', 'Atlanta', 'Portland', 'Miami'
];
const CITIES_DE = [
  'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne',
  'Stuttgart', 'Dusseldorf', 'Leipzig', 'Dresden', 'Bonn'
];

const COMPANIES = [
  'Apex Technologies Ltd',
  'Vanguard Logistics PK',
  'Indus Cloud Networks',
  'Summit Media Group',
  'Horizon Labs & Systems',
  'Nordic Digital GmbH',
  'Helios Health Tech',
  'Pinnacle Dynamics',
  'Quantum Wave Corp',
  'Karakoram Ventures',
];

const PRODUCTS = [
  'Cloud Server Cluster v4',
  'Mechanical Keyboard Pro',
  'Precision Stylus Pen',
  'Ultra-Wide 4K IPS Monitor',
  'IoT Industrial Sensor Node',
  'Noise-Canceling Wireless Headset',
  'USB-C Thunderbolt Docking Station',
  'Encrypted Hardware Key',
  'Gigabit Fiber Transceiver',
  'Biometric Access Reader',
];

const STATUSES = ['completed', 'pending', 'shipped', 'processing', 'delivered'];
const ROLES = [
  'Product Manager', 'Staff Engineer', 'Data Scientist',
  'DevOps Architect', 'Security Analyst', 'VP of Engineering', 'Lead Designer'
];

export function generateClientMockRows(
  table: Table,
  seed: number,
  count: number = 50,
  locale: LocaleCode = 'en_US',
  chaosEnabled: boolean = false,
  allTables?: Table[]
): Record<string, unknown>[] {
  const prng = mulberry32(seed + table.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const rows: Record<string, unknown>[] = [];

  const isPakistani = locale === 'en_PK';
  const isGerman = locale === 'de_DE';

  const firstNames = isPakistani ? FIRST_NAMES_PK : isGerman ? FIRST_NAMES_DE : FIRST_NAMES_GLOBAL;
  const lastNames = isPakistani ? LAST_NAMES_PK : isGerman ? LAST_NAMES_DE : LAST_NAMES_GLOBAL;
  const cities = isPakistani ? CITIES_PK : isGerman ? CITIES_DE : CITIES_US;

  let parentMax = 50;
  if (allTables) {
    const parentTable = allTables.find((t) => t.name !== table.name && t.columns.some((c) => c.pk));
    if (parentTable) {
      parentMax = Math.min(50, parentTable.row_count || 50);
    }
  }

  for (let i = 0; i < count; i++) {
    const row: Record<string, unknown> = {};
    let isChaosRow = false;

    // Guaranteed inclusion of core realistic names in first rows
    let fName = firstNames[Math.floor(prng() * firstNames.length)];
    let lName = lastNames[Math.floor(prng() * lastNames.length)];

    if (i < PAKISTANI_PROFILES.length && (isPakistani || prng() < 0.4)) {
      const p = PAKISTANI_PROFILES[i];
      fName = p.first;
      lName = p.last;
    }

    const username = `${fName.toLowerCase()}.${lName.toLowerCase()}${Math.floor(prng() * 89 + 10)}`;

    for (const col of table.columns) {
      if (chaosEnabled && !col.pk && prng() < 0.04) {
        row[col.name] = null;
        isChaosRow = true;
        continue;
      }

      if (col.generator?.kind === 'sequence') {
        const start = col.generator.start ?? 1;
        const step = col.generator.step ?? 1;
        row[col.name] = start + i * step;
        continue;
      }

      if (col.generator?.kind === 'categorical' && col.generator.values?.length) {
        const idx = Math.floor(prng() * col.generator.values.length);
        row[col.name] = col.generator.values[idx];
        continue;
      }

      switch (col.semantic_type) {
        case 'id':
          if (
            col.name.includes('parent') ||
            col.name.includes('customer') ||
            col.name.includes('user') ||
            col.name.includes('org') ||
            col.name.includes('holder')
          ) {
            if (!col.pk) {
              row[col.name] = Math.floor(prng() * parentMax) + 1;
              break;
            }
          }
          row[col.name] = 1000 + i + 1;
          break;

        case 'person_name':
          row[col.name] = `${fName} ${lName}`;
          break;

        case 'first_name':
          row[col.name] = fName;
          break;

        case 'last_name':
          row[col.name] = lName;
          break;

        case 'email':
          row[col.name] = `${username}@example.com`;
          break;

        case 'phone':
          if (isPakistani) {
            row[col.name] = `+92-300-${Math.floor(prng() * 8999999 + 1000000)}`;
          } else if (isGerman) {
            row[col.name] = `+49-30-${Math.floor(prng() * 899999 + 100000)}`;
          } else {
            row[col.name] = `+1-555-01${Math.floor(prng() * 89 + 10)}`;
          }
          break;

        case 'company':
          row[col.name] = COMPANIES[Math.floor(prng() * COMPANIES.length)];
          break;

        case 'city':
          row[col.name] = cities[Math.floor(prng() * cities.length)];
          break;

        case 'country':
          row[col.name] = isPakistani ? 'Pakistan' : isGerman ? 'Germany' : 'United States';
          break;

        case 'money': {
          // Prices use PKR when en_PK, otherwise USD
          if (isPakistani) {
            const baseAmount = prng() * 45000 + 1500;
            row[col.name] = Math.round(baseAmount * 100) / 100;
          } else {
            const baseAmount = prng() * 850 + 25;
            row[col.name] = Math.round(baseAmount * 100) / 100;
          }
          break;
        }

        case 'date': {
          const month = String(Math.floor(prng() * 8) + 1).padStart(2, '0');
          const day = String(Math.floor(prng() * 27) + 1).padStart(2, '0');
          row[col.name] = `2026-${month}-${day}`;
          break;
        }

        case 'category':
          row[col.name] = STATUSES[Math.floor(prng() * STATUSES.length)];
          break;

        case 'job_title':
          row[col.name] = ROLES[Math.floor(prng() * ROLES.length)];
          break;

        case 'product_name':
          row[col.name] = PRODUCTS[Math.floor(prng() * PRODUCTS.length)];
          break;

        case 'quantity':
        case 'integer':
          row[col.name] = Math.floor(prng() * 8) + 1;
          break;

        case 'float':
          row[col.name] = Math.round(prng() * 1000) / 10;
          break;

        case 'mcc':
          row[col.name] = ['5411', '5812', '5732', '4121', '6011'][Math.floor(prng() * 5)];
          break;

        case 'card_fake':
          row[col.name] = `4111-XXXX-XXXX-${Math.floor(prng() * 8999 + 1000)}`;
          break;

        default:
          if (col.dtype === 'int') {
            row[col.name] = Math.floor(prng() * 100);
          } else if (col.dtype === 'decimal' || col.dtype === 'float') {
            row[col.name] = Math.round(prng() * 10000) / 100;
          } else if (col.dtype === 'bool') {
            row[col.name] = prng() > 0.5;
          } else {
            row[col.name] = `val_${Math.floor(prng() * 1000)}`;
          }
      }

      if (chaosEnabled && !col.pk && (col.dtype === 'int' || col.dtype === 'decimal') && prng() < 0.02) {
        row[col.name] = isPakistani ? 9999999.00 : 999999.99;
        isChaosRow = true;
      }
    }

    if (isChaosRow) {
      row._hasChaos = true;
    }
    rows.push(row);
  }

  return rows;
}

export function generateAllMockRows(dataset: Dataset, count: number = 50): Record<string, Record<string, unknown>[]> {
  const result: Record<string, Record<string, unknown>[]> = {};
  for (const table of dataset.tables) {
    result[table.name] = generateClientMockRows(
      table,
      dataset.seed,
      count,
      dataset.locale,
      !!dataset.chaos?.enabled,
      dataset.tables
    );
  }
  return result;
}
