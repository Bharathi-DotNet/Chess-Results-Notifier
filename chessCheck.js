const fetch = require('node-fetch');

// Get user inputs from command line arguments
const args = process.argv.slice(2);
const url = args[0];
const fideId = args[1];

if (!url || !fideId) {
  console.error("❌ Usage: node chessCheck.js <chess-results-url> <fide-id>");
  process.exit(1);
}

// Use FIDE ID as the user's unique topic
const ntfyTopic = fideId.toLowerCase();
let lastNotifiedRound = 0;

async function checkForNewPairing() {
  try {
    const res = await fetch(url);
    const html = await res.text();

    const boardMatch = html.match(/Board Pairings<\/td><td[^>]*>(.*?)<\/td>/);
    const rankingMatch = html.match(/Ranking list after<\/td><td[^>]*>(.*?)<\/td>/);

    if (!boardMatch || !rankingMatch) {
      console.log("❌ Could not find pairing rows.");
      return;
    }

    const boardHTML = boardMatch[1];
    const rankingHTML = rankingMatch[1];

    const boardRounds = (boardHTML.match(/Rd\.\d+/g) || []).map(r => parseInt(r.split(".")[1]));
    const rankingRounds = (rankingHTML.match(/Rd\.\d+/g) || []).map(r => parseInt(r.split(".")[1]));

    const maxBoard = Math.max(...boardRounds);
    const maxRank = Math.max(...rankingRounds);

    console.log(`📋 Board Pairings: Rd.${maxBoard}, Ranking List: Rd.${maxRank}, Last Notified: Rd.${lastNotifiedRound}`);
    await sendNtfyNotification(`📢 New Pairing Published `);


    if (maxBoard > maxRank && maxBoard > lastNotifiedRound) {
      console.log("🎉 New round pairing published!");
      lastNotifiedRound = maxBoard;
      await sendNtfyNotification(`📢 New Pairing Published for Round ${maxBoard}`);
    }
  } catch (err) {
    console.error("⚠️ Error:", err.message);
  }
}

async function sendNtfyNotification(message) {
  const url = `https://ntfy.sh/${ntfyTopic}`;

  const res = await fetch(url, {
    method: "POST",
    body: message
  });

  if (res.ok) {
    console.log("✅ ntfy notification sent!");
  } else {
    console.error("❌ Failed to send ntfy notification:", await res.text());
  }
}

// Run check every 10 seconds
setInterval(checkForNewPairing, 10000);
