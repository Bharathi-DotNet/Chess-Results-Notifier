const fetch = require('node-fetch');

// Command line arguments
const args = process.argv.slice(2);
const url = args[0];
const fideId = args[1];

if (!url || !fideId) {
  console.error("❌ Usage: node chessCheck.js <chess-results-url> <fide-id>");
  process.exit(1);
}

// Replace with your OneSignal details
const oneSignalAppId = "1dd7effd-f2b7-4a1c-8310-656dde6d6978";
const oneSignalApiKey = "os_v2_app_dxl677psw5fbzayqmvw543ljpbqfvpkjyqnua2fc4tiycax4rd63mfh5x7yr5boqxjbtgenrxtvglbvcpldnnmzw34az6mffwdbvvjq";

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
    await sendOneSignalNotification(`📢 New Pairing Published for Round`);

    if (maxBoard > maxRank && maxBoard > lastNotifiedRound) {
      console.log("🎉 New round pairing published!");
      lastNotifiedRound = maxBoard;
      await sendOneSignalNotification(`📢 New Pairing Published for Round ${maxBoard}`);
    }
  } catch (err) {
    console.error("⚠️ Error:", err.message);
  }
}

async function sendOneSignalNotification(message) {
  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Basic ${oneSignalApiKey}`
    },
    body: JSON.stringify({
      app_id: oneSignalAppId,
      include_external_user_ids: [fideId], // The user ID should be same as the app's registered external user ID
      headings: { en: "♟️ Chess Update" },
      contents: { en: message }
    })
  });

  const result = await response.json();

  if (response.ok) {
    console.log("✅ OneSignal notification sent:", result.id);
  } else {
    console.error("❌ OneSignal Error:", result.errors || result);
  }
}

// Run check every 10 seconds
setInterval(checkForNewPairing, 10000);
