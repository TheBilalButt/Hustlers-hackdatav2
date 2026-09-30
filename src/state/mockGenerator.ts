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

const FIRST_NAMES_US = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Lucas', 'Mia', 'Mason', 'Isabella', 'Alexander', 'Charlotte', 'Benjamin', 'Amelia', 'James'];
const LAST_NAMES_US = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];

const FIRST_NAMES_DE = ['Lukas', 'Maximilian', 'Leon', 'Paul', 'Felix', 'Sophie', 'Marie', 'Maria', 'Mia', 'Emma', 'Hannah', 'Jonas', 'Anna', 'Tim', 'Laura'];
const LAST_NAMES_DE = ['Mueller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schaefer', 'Koch', 'Bauer', 'Richter', 'Klein'];

const FIRST_NAMES_IN = ['Aarav', 'Vihaan', 'Aditya', 'Reyansh', 'Muhammad', 'Saanvi', 'Ananya', 'Aadhya', 'Diya', 'Pari', 'Arjun', 'Kabir', 'Ishaan', 'Rohan', 'Tanvi'];
const LAST_NAMES_IN = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Singh', 'Kumar', 'Gupta', 'Iyer', 'Chatterjee', 'Mehta', 'Joshi', 'Chopra', 'Malhotra', 'Bhat', 'Nair'];

const CITIES_US = ['New York', 'San Francisco', 'Chicago', 'Austin', 'Seattle', 'Boston', 'Denver', 'Atlanta', 'Portland', 'Miami'];
const CITIES_DE = ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Dusseldorf', 'Leipzig', 'Dresden', 'Bonn'];
const CITIES_IN = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Noida'];

const COMPANIES = [
  'Acme Global Solutions',
  'Vanguard Logistics Ltd',
  'Apex Cloud Systems',
  'Summit Media Group',
  'Horizon Biotech Labs',
  'Nordic Digital GmbH',
  'Helios Health Tech',
  'Pinnacle Dynamics',
  'Quantum Wave Corp',
  'Starlight Ventures',
];

const PRODUCTS = [
  'Enterprise Cloud Node v4',
  'Ergonomic Mechanical Keyboard',
  'Precision Stylus Pro',
  'Ultra-Wide 4K IPS Monitor',
  'Smart IoT Industrial Sensor',
  'Noise-Canceling ANC Headset',
  'High-Speed USB-C Thunderbolt Dock',
  'Encrypted Hardware Token',
  'Low-Latency Fiber Transceiver',
  'Biometric Access Controller',
];

const STATUSES = ['completed', 'pending', 'shipped', 'processing', 'delivered'];
const ROLES = ['Product Manager', 'Staff Engineer', 'Data Scientist', 'DevOps Architect', 'Security Analyst', 'VP of Product', 'Lead Designer'];

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

  const firstNames = locale === 'de_DE' ? FIRST_NAMES_DE : locale === 'en_IN' ? FIRST_NAMES_IN : FIRST_NAMES_US;
  const lastNames = locale === 'de_DE' ? LAST_NAMES_DE : locale === 'en_IN' ? LAST_NAMES_IN : LAST_NAMES_US;
  const cities = locale === 'de_DE' ? CITIES_DE : locale === 'en_IN' ? CITIES_IN : CITIES_US;

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

    const fName = firstNames[Math.floor(prng() * firstNames.length)];
    const lName = lastNames[Math.floor(prng() * lastNames.length)];
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
          if (col.name.includes('parent') || col.name.includes('customer') || col.name.includes('user') || col.name.includes('org') || col.name.includes('holder')) {
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
          if (locale === 'de_DE') {
            row[col.name] = `+49-30-${Math.floor(prng() * 899999 + 100000)}`;
          } else if (locale === 'en_IN') {
            row[col.name] = `+91-98765-${Math.floor(prng() * 89999 + 10000)}`;
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
          row[col.name] = locale === 'de_DE' ? 'Germany' : locale === 'en_IN' ? 'India' : 'United States';
          break;

        case 'money': {
          const baseAmount = prng() * 850 + 25;
          row[col.name] = Math.round(baseAmount * 100) / 100;
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
        row[col.name] = 999999.99;
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
