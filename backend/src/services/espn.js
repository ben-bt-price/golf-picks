const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse ESPN response'));
        }
      });
    }).on('error', reject);
  });
}

// Get list of upcoming/current golf events from ESPN
async function getUpcomingEvents() {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  const data = await fetchJson(url);
  const events = data.events || [];
  return events.map((e) => ({
    espnId: e.id,
    name: e.name,
    shortName: e.shortName,
    date: e.date,
  }));
}

// Get full player field for an event
async function getEventField(espnEventId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/summary?event=${espnEventId}`;
  const data = await fetchJson(url);

  const competitors = data.competitors || [];
  return competitors.map((c) => ({
    espnId: c.id,
    name: c.athlete?.displayName || c.displayName || 'Unknown',
    worldRanking: c.athlete?.ranking ? parseInt(c.athlete.ranking) : null,
  }));
}

// Get final results / earnings for a completed event
async function getEventResults(espnEventId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/summary?event=${espnEventId}`;
  const data = await fetchJson(url);

  const competitors = data.competitors || [];
  return competitors.map((c) => {
    const status = c.status?.type?.name || '';
    let position = c.status?.position?.displayName || c.status?.displayValue || '';

    // Normalize cut/withdrawal
    if (status === 'STATUS_CUT') position = 'MC';
    if (status === 'STATUS_WITHDRAWN') position = 'WD';
    if (status === 'STATUS_DISQUALIFIED') position = 'DQ';

    // ESPN sometimes returns earnings in dollars
    const earningsRaw = c.statistics?.find((s) => s.name === 'earnings')?.displayValue;
    let prizeMoney = 0;
    if (earningsRaw) {
      prizeMoney = Math.round(parseFloat(earningsRaw.replace(/[$,]/g, '')) * 100);
    }

    return {
      espnId: c.id,
      name: c.athlete?.displayName || c.displayName || 'Unknown',
      position,
      prizeMoney, // in cents; 0 if ESPN doesn't have it
    };
  });
}

module.exports = { getUpcomingEvents, getEventField, getEventResults };
