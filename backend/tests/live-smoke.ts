import { OpenFdaAdapter } from '../src/modules/ingestion/adapters/openfda.adapter.js';
import { env } from '../src/config/env.js';
import { redactApiKey } from '../src/modules/ingestion/adapter.js';

async function runLiveSmoke() {
  console.log('=== Starting opt-in live openFDA smoke test ===');
  const apiKey = env.OPENFDA_API_KEY;

  if (apiKey) {
    console.log('Using configured OPENFDA_API_KEY: [REDACTED (length: ' + apiKey.length + ')]');
  } else {
    console.log('No OPENFDA_API_KEY configured; running against public openFDA rate limits');
  }

  const adapter = new OpenFdaAdapter({
    apiKey,
  });

  // Pull a 1-month window (e.g. 20260901 to 20261001)
  const startDate = '20260901';
  const endDate = '20261001';

  console.log(`Querying window: ${startDate} to ${endDate}...`);
  const result = await adapter.fetchWindow(startDate, endDate);

  console.log(`Successfully fetched: ${result.records.length} records`);
  console.log(`Source last updated: ${result.sourceLastUpdated?.toISOString() ?? 'none'}`);

  if (result.records.length > 0) {
    const sample = result.records[0];
    console.log('\n--- Sample Normalized Record ---');
    console.log('Source:', sample.source);
    console.log('Source ID:', sample.sourceId);
    console.log('Title:', sample.title);
    console.log('Severity Raw:', sample.severityRaw);
    console.log('Severity Num:', sample.severityNum);
    console.log('Event Date:', sample.eventDate?.toISOString());
    console.log('Recall Initiation Date:', sample.recallInitiationDate?.toISOString());
    console.log('Report Date:', sample.reportDate?.toISOString());
    console.log('Country:', sample.country);
    console.log('Sanitized URL (no key):', sample.url);
    console.log('Content Hash (SHA-256):', sample.contentHash);

    // Verify key redaction
    if (apiKey) {
      const serialized = JSON.stringify(sample);
      if (serialized.includes(apiKey)) {
        throw new Error('SECURITY VIOLATION: API key found in serialized record!');
      }
      console.log('\n[PASS] Verified API key is NOT present anywhere in normalized record or URL.');
    }
  }

  console.log('\n=== Live smoke check completed successfully ===');
}

runLiveSmoke().catch((err) => {
  console.error('Smoke test failed:', redactApiKey(err.message, env.OPENFDA_API_KEY));
  process.exit(1);
});
