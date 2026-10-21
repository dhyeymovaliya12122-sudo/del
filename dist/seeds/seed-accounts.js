"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const phoneNumbers = [];
async function seedAccounts() {
    console.log(`Starting seeding process for ${phoneNumbers.length} accounts...`);
    if (phoneNumbers.length === 0) {
        console.warn('⚠️ No phone numbers provided in the array. Please add your 60 numbers to src/seeds/seed-accounts.ts.');
        process.exit(1);
    }
    for (const phone of phoneNumbers) {
        try {
            const payload = {
                name: `WA Account ${phone}`,
                phone: phone,
                tenantId: 'default-tenant',
            };
            const response = await axios_1.default.post('http://localhost:3000/api/v1/accounts', payload);
            console.log(`✅ Successfully seeded: ${phone} (ID: ${response.data.id})`);
        }
        catch (error) {
            console.error(`❌ Failed to seed ${phone}:`, error.response?.data || error.message);
        }
    }
    console.log('Seeding complete!');
}
seedAccounts();
//# sourceMappingURL=seed-accounts.js.map