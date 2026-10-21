/**
 * seed-accounts.ts
 *
 * Use this script to register your 60 real WhatsApp phone numbers into the local SQLite database.
 * The script uses the local REST API to add the accounts, ensuring all TypeORM hooks and business logic run.
 *
 * HOW TO RUN:
 * 1. Ensure the NestJS backend is running (npm run start:dev)
 * 2. Replace the `phoneNumbers` array below with your 60 numbers.
 * 3. Run: npx ts-node src/seeds/seed-accounts.ts
 */

import axios from 'axios';

// ── Replace this array with your 60 actual WhatsApp phone numbers (E.164 format)
const phoneNumbers: string[] = [
  // '+12345678901',
  // '+12345678902',
  // ...
];

async function seedAccounts() {
  console.log(`Starting seeding process for ${phoneNumbers.length} accounts...`);

  if (phoneNumbers.length === 0) {
    console.warn('⚠️ No phone numbers provided in the array. Please add your 60 numbers to src/seeds/seed-accounts.ts.');
    process.exit(1);
  }

  for (const phone of phoneNumbers) {
    try {
      // Assuming your REST API requires an account name and the phone number.
      // Adjust the payload if your endpoint requires different fields.
      const payload = {
        name: `WA Account ${phone}`,
        phone: phone,
        // Since we are moving to Cloud API, you might have tenantId or other fields here
        tenantId: 'default-tenant',
      };

      const response = await axios.post('http://localhost:3000/api/v1/accounts', payload);
      console.log(`✅ Successfully seeded: ${phone} (ID: ${response.data.id})`);
    } catch (error: any) {
      console.error(`❌ Failed to seed ${phone}:`, error.response?.data || error.message);
    }
  }

  console.log('Seeding complete!');
}

seedAccounts();
