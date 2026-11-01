// A clearly labelled sample order, shown only in the preview build so the
// Studio can be tried without a server. Its date is always a few weeks ahead.
// The picture was made by sending this exact order through the real builder.

function upcomingSaturday(weeksAhead) {
  const d = new Date();
  d.setDate(d.getDate() + weeksAhead * 7);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildDemoOrders() {
  return [
    {
      id: 'DEMO-001',
      createdAt: new Date().toISOString(),
      status: 'New Enquiry',
      seenByAdmin: false,
      client: {
        name: 'Demo Customer',
        email: 'demo@example.com',
        phone: '07700 900000',
        eventDate: upcomingSaturday(3),
        postcode: 'NG13 0AA',
        venueName: 'The Village Hall',
        accessTime: '10:00',
        setting: 'indoor',
        notes: 'This is a demo order to show how the Studio works.'
      },
      configuration: {
        "palette": [
          "Organic Sage",
          "Pearl Ivory",
          "Chrome Gold",
          "Warm Taupe",
          "Soft Blush"
        ],
        "backdrop": "Personalised Wooden Arch Board",
        "balloonLayout": "7ft Organic Garland (Up One Side)",
        "digitsOrLetters": "Helium Foil Numbers + 2 Clusters (\"40\")",
        "extras": [
          "Neon Sign (\u00a335)"
        ],
        "promoCode": "",
        "subtotal": 242.0,
        "bundleDiscount": 0,
        "estimatedTotal": 242.0,
        "balloonPullList": "25 \u00d7 101_M (Organic Sage), 25 \u00d7 102_M (Pearl Ivory), 25 \u00d7 103_M (Chrome Gold), 25 \u00d7 104_M (Warm Taupe), 25 \u00d7 105_M (Soft Blush)",
        "backdropId": "wooden-board",
        "balloonId": "garland-7ft",
        "digitId": "helium-foil-numbers",
        "digitText": "40",
        "extraIds": [
          "neon-sign"
        ],
        "shimmerSize": "N/A",
        "boardCustomization": {
          "color": "#F5EFEB",
          "colorName": "Warm Ivory",
          "text": "Happy 40th Jo",
          "vinylColor": "gold"
        },
        "neonPhrase": "Happy Birthday",
        "bubbleText": "",
        "depositPaid": 0,
        "balanceDue": 242.0
      },
      previewSnapshotDataUrl: "data:image/jpeg;base64,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"
    },
    // A second booking on the same Saturday, so the Studio shows the clash and the
    // customer side shows the gold wall already out that day
    {
      id: 'DEMO-002',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      status: 'Deposit Paid',
      seenByAdmin: true,
      client: {
        name: 'Second Demo Customer',
        email: 'demo2@example.com',
        phone: '07700 900001',
        eventDate: upcomingSaturday(3),
        postcode: 'NG31 6AA',
        venueName: 'The Barn',
        accessTime: '12:00',
        setting: 'indoor',
        occasion: 'Prom',
        notes: 'A second demo order on the same day, to show how the Studio flags a clash.'
      },
      configuration: {
        palette: ['Obsidian Black', 'Chrome Gold', 'Chrome Silver', 'Pearl Ivory', 'Warm Taupe'],
        backdrop: 'Gold Sequin Shimmer Wall',
        backdropId: 'gold-shimmer',
        balloonLayout: '7ft Organic Garland (Up One Side)',
        balloonId: 'garland-7ft',
        shimmerSize: 'large',
        extraIds: [],
        subtotal: 180,
        estimatedTotal: 180,
        depositPaid: 90,
        balanceDue: 90
      },
      history: [{ at: new Date(Date.now() - 2 * 86400000).toISOString(), text: 'Deposit £90 received' }]
    }
  ];
}
