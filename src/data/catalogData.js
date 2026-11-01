/**
 * Data Engine for THE OCCASION EDIT
 * All references use "Our" / "Us" (zero personal names).
 */

export const INITIAL_BALLOON_COLOURS = [
  { id: 'sage', code: '001', name: 'Organic Sage', hex: '#7A8C68', finish: 'Matte', inStock: true },
  { id: 'pearl-white', code: '002', name: 'Pearl Ivory', hex: '#F5F2EB', finish: 'Pearl', inStock: true },
  { id: 'champagne-gold', code: '003', name: 'Chrome Gold', hex: '#C5A059', finish: 'Chrome', inStock: true },
  { id: 'blush-pink', code: '004', name: 'Soft Blush', hex: '#E6B8AF', finish: 'Matte', inStock: true },
  { id: 'nude-stone', code: '005', name: 'Warm Taupe', hex: '#B8A693', finish: 'Matte', inStock: true },
  { id: 'butter-yellow', code: '006', name: 'Lemon Butter', hex: '#F0DE6C', finish: 'Matte', inStock: true },
  { id: 'pastel-blue', code: '007', name: 'Sky Blue', hex: '#9EC1CF', finish: 'Matte', inStock: true },
  { id: 'lilac-mist', code: '008', name: 'Soft Lilac', hex: '#C3B1CE', finish: 'Matte', inStock: true },
  { id: 'chrome-silver', code: '009', name: 'Chrome Silver', hex: '#BCC0C7', finish: 'Chrome', inStock: true },
  { id: 'matte-black', code: '010', name: 'Obsidian Black', hex: '#222421', finish: 'Matte', inStock: true },
  { id: 'rose-gold', code: '011', name: 'Rose Gold', hex: '#C48B7B', finish: 'Chrome', inStock: false },
  { id: 'eucalyptus', code: '012', name: 'Deep Forest', hex: '#4A5840', finish: 'Matte', inStock: false }
];

export const INITIAL_CURATED_PALETTES = [
  {
    id: 'palette-sage-gold',
    name: 'Sage & Gold',
    description: "Fresh and botanical, with a touch of gold glamour.",
    colourIds: ['sage', 'pearl-white', 'champagne-gold', 'nude-stone', 'blush-pink'],
    inStock: true
  },
  {
    id: 'palette-blush-romance',
    name: 'Blush & Pearl',
    description: "Soft and romantic, made for showers, christenings and weddings.",
    colourIds: ['blush-pink', 'pearl-white', 'champagne-gold', 'nude-stone', 'lilac-mist'],
    inStock: true
  },
  {
    id: 'palette-teddy-neutrals',
    name: 'Warm Neutrals',
    description: "Calm, cosy tones that suit any room and any age.",
    colourIds: ['nude-stone', 'pearl-white', 'champagne-gold', 'sage', 'butter-yellow'],
    inStock: true
  },
  {
    id: 'palette-pastel-celebration',
    name: 'Pastel Sky',
    description: "Light and playful, a breath of spring for little ones' parties.",
    colourIds: ['pastel-blue', 'butter-yellow', 'lilac-mist', 'pearl-white', 'blush-pink'],
    inStock: true
  },
  {
    id: 'palette-black-gold-luxe',
    name: 'Black & Gold',
    description: "Bold and glamorous for milestone birthdays and evening parties.",
    colourIds: ['matte-black', 'champagne-gold', 'chrome-silver', 'pearl-white', 'nude-stone'],
    inStock: true
  }
];

export const INITIAL_DIGIT_LETTER_OPTIONS = [
  {
    id: 'digits-none',
    name: 'No Number or Letter Balloons',
    description: 'Skip numbers or letters for this display',
    type: 'none',
    basePrice: 0,
    extraCharPrice: 0,
    image: null,
    inStock: true
  },
  {
    id: 'helium-foil-numbers',
    name: 'Helium Foil Numbers + 2 Clusters',
    description: "Giant floating numbers with two clusters: the instant wow as guests arrive.",
    type: 'digits',
    basePrice: 36,
    secondDigitPrice: 52,
    extraCharPrice: 16,
    // Laura's price list offers two numbers for £52, so the saving is shown to customers
    showTwoNumberSaving: true,
    maxChars: 4,
    defaultText: '30',
    image: 'public/assets/pl-bubble-helium.jpg',
    inStock: true
  },
  {
    id: 'stack-basic',
    name: 'Freestanding Number Stack — Basic',
    description: "A sculpted number standing on balloons, perfect beside the cake.",
    type: 'stack',
    basePrice: 35,
    maxChars: 2,
    defaultText: '3',
    image: 'public/assets/pl-stack-30.jpg',
    inStock: true
  },
  {
    id: 'stack-themed',
    name: 'Freestanding Number Stack — Themed',
    description: "Dressed in their favourite characters or theme.",
    type: 'stack',
    basePrice: 60,
    maxChars: 2,
    defaultText: '13',
    image: 'public/assets/pl-stack-30.jpg',
    inStock: true
  },
  {
    id: 'stack-luxury',
    name: 'Freestanding Number Stack — Luxury',
    description: "Satin bows, pearls and florals for a milestone in style.",
    type: 'stack',
    basePrice: 70,
    maxChars: 2,
    defaultText: '30',
    image: 'public/assets/pl-stack-30.jpg',
    inStock: true
  },
  {
    id: 'custom-letter-balloons',
    name: 'Custom Foil Letter Balloons (A–Z)',
    description: "Spell their name or a special word in giant foil letters.",
    type: 'letters',
    basePrice: 12,
    perLetter: true,
    maxChars: 8,
    defaultText: 'BABY',
    image: 'public/assets/examples/letter-balloons.jpg',
    inStock: true
  }
];

export const CONFIGURATOR_STEPS = [
  {
    id: 'colours',
    stepNumber: 'Step 1 of 5',
    shortTab: '1. Colours',
    title: "Choose your colours",
    subtitle: "",
    allowSkip: false,
    items: []
  },
  {
    id: 'backdrop',
    stepNumber: 'Step 2 of 5',
    shortTab: '2. Backdrop',
    title: "Choose a backdrop",
    subtitle: "Or skip it for freestanding balloons.",
    allowSkip: true,
    skipLabel: 'Skip Backdrop',
    items: [
      {
        id: 'wooden-board',
        name: 'Personalised Wooden Arch Board',
        shortName: 'Wooden Board',
        styleNote: "Painted in any colour with your own wording, wrapped in balloons. The photo spot everyone queues for.",
        price: 50,
        packageBasePrice: 155,
        hireOnly: true,
        inStock: true,
        backdropType: 'arch-board',
        surfaceColor: '#E5D5C3',
        image: 'public/assets/pl-board-sixty.jpg'
      },
      {
        id: 'gold-shimmer',
        name: 'Gold Sequin Shimmer Wall',
        shortName: 'Gold Shimmer Wall',
        styleNote: "Catches the light in every photo. Small or large, dressed with a garland in your colours.",
        price: 45,
        packageBasePrice: 150,
        packageLargePrice: 180,
        hasSizeTier: true,
        hireOnly: true,
        inStock: true,
        backdropType: 'shimmer-wall',
        surfaceColor: '#D4AF37',
        image: 'public/assets/pl-shimmer-lilac.jpg'
      },
      {
        id: 'silver-shimmer',
        name: 'Silver Sequin Shimmer Wall',
        shortName: 'Silver Shimmer Wall',
        styleNote: "Mirror-bright sparkle that suits any colour scheme. Small or large, dressed with a garland.",
        price: 45,
        packageBasePrice: 150,
        packageLargePrice: 180,
        hasSizeTier: true,
        hireOnly: true,
        inStock: true,
        backdropType: 'shimmer-wall',
        surfaceColor: '#C4C9CE',
        image: 'public/assets/examples/silver-shimmer-wall.jpg'
      },
      {
        id: 'black-shimmer',
        name: 'Obsidian Black Shimmer Wall',
        shortName: 'Black Shimmer Wall',
        styleNote: "Bold and glamorous, stunning with gold and pearl. Small or large, dressed with a garland.",
        price: 45,
        packageBasePrice: 150,
        packageLargePrice: 180,
        hasSizeTier: true,
        hireOnly: true,
        inStock: true,
        backdropType: 'shimmer-wall',
        surfaceColor: '#242623',
        image: 'public/assets/examples/black-shimmer-wall.jpg'
      },
      {
        id: 'pink-shimmer',
        name: 'Blush Pink Shimmer Wall',
        shortName: 'Pink Shimmer Wall',
        styleNote: "Soft blush sparkle for a dreamy, romantic look. Small or large, dressed with a garland.",
        price: 45,
        packageBasePrice: 150,
        packageLargePrice: 180,
        hasSizeTier: true,
        hireOnly: true,
        inStock: false,
        backdropType: 'shimmer-wall',
        surfaceColor: '#E2B4BD',
        image: 'public/assets/examples/pink-shimmer-wall.jpg'
      },
      {
        id: 'balloon-hoop',
        name: 'Circular Gold Balloon Hoop',
        shortName: 'Circular Hoop',
        styleNote: "A golden circle that frames every picture, dressed with a garland in your colours.",
        price: 35,
        packageBasePrice: 140,
        hireOnly: true,
        inStock: true,
        backdropType: 'hoop',
        surfaceColor: '#C5A059',
        image: 'public/assets/hero-arch.jpg'
      },
      {
        id: 'easel-sign',
        name: 'Easel Welcome Sign & Garland',
        shortName: 'Easel Welcome Sign',
        styleNote: "Welcome your guests in beautiful lettering, on a white or black board.",
        price: 85,
        standalonePackage: true,
        hireOnly: true,
        inStock: true,
        backdropType: 'easel',
        surfaceColor: '#FAF8F5',
        image: 'public/assets/examples/easel-welcome-sign.jpg'
      }
    ]
  },
  {
    id: 'balloons',
    stepNumber: 'Step 3 of 5',
    shortTab: '3. Balloons',
    title: "Choose your balloons",
    subtitle: "",
    allowSkip: true,
    skipLabel: 'Skip Garland',
    items: [
      {
        id: 'garland-7ft',
        sku: 'GARL-SIDE-7FT',
        name: '7ft Organic Garland (Up One Side)',
        shortName: '7ft Side Garland',
        styleNote: "A flowing cascade up one side: the classic look that suits any space.",
        price: 105,
        hireOnly: false,
        inStock: true,
        layoutType: 'side-7ft',
        recipe: { defaultTotal: 70, defaultSmall: 20, defaultMed: 38, defaultLarge: 12 },
        image: 'public/assets/pl-board-sixty.jpg'
      },
      {
        id: 'clusters-top-bottom',
        sku: 'GARL-CLUST-OPP',
        name: '1 Top & 1 Bottom Corner Cluster',
        shortName: 'Top & Bottom Clusters',
        styleNote: "Two clusters framing a doorway or display. Big impact, small footprint.",
        price: 85,
        hireOnly: false,
        inStock: true,
        layoutType: 'clusters',
        recipe: { defaultTotal: 50, defaultSmall: 15, defaultMed: 28, defaultLarge: 7 },
        image: 'public/assets/examples/corner-clusters.jpg'
      },
      {
        id: 'garland-full',
        sku: 'GARL-ARCH-FULL',
        name: 'Full Surround Statement Arch',
        shortName: 'Full Surround Garland',
        styleNote: "Balloons all the way round for a full statement arch.",
        price: 145,
        upgradeSurcharge: 35,
        hireOnly: false,
        inStock: true,
        layoutType: 'full-surround',
        recipe: { defaultTotal: 120, defaultSmall: 35, defaultMed: 65, defaultLarge: 20 },
        image: 'public/assets/hero-arch.jpg'
      }
    ]
  },
  {
    id: 'digits',
    stepNumber: 'Step 4 of 5',
    shortTab: '4. Numbers & Letters',
    title: "Add numbers or letters",
    subtitle: "",
    allowSkip: true,
    skipLabel: 'Skip Numbers',
    items: []
  },
  {
    id: 'extras',
    stepNumber: 'Step 5 of 5',
    shortTab: '5. Extras',
    title: "Finishing touches",
    subtitle: "",
    allowSkip: true,
    skipLabel: 'Skip Extras',
    items: [
      {
        id: 'neon-sign',
        name: 'LED Neon Sign ("Happy Birthday")',
        shortName: 'Neon Sign',
        styleNote: "A warm glowing sign that makes every photo shine.",
        price: 35,
        hireOnly: true,
        inStock: true,
        extraType: 'neon',
        image: 'public/assets/inspire-birthday.jpg'
      },
      {
        id: 'add-on-flowers',
        madeToOrder: true,
        name: 'Floral & Pampas Accents',
        shortName: 'Floral Accents',
        styleNote: "Roses, foliage and pampas woven in for a luxury finish.",
        price: 36,
        hireOnly: true,
        inStock: true,
        extraType: 'flowers',
        image: 'public/assets/inspire-baby.jpg'
      },
      {
        id: 'baby-boxes',
        name: '4× White "BABY" Shower Blocks',
        shortName: 'BABY Shower Boxes',
        styleNote: "White BABY blocks filled with balloons: the baby shower photo.",
        price: 40,
        hireOnly: true,
        inStock: true,
        extraType: 'boxes',
        image: 'public/assets/inspire-baby.jpg'
      },
      {
        id: 'bubble-balloon',
        name: 'Personalised Clear Bubble Balloon',
        shortName: 'Bubble Balloon',
        styleNote: "A clear balloon filled with mini balloons and their name or message. A keepsake gift.",
        price: 35,
        hireOnly: false,
        inStock: true,
        extraType: 'bubble',
        image: 'public/assets/pl-bubble-helium.jpg'
      },
      {
        id: 'cut-outs',
        madeToOrder: true,
        name: 'Themed Character / Prop Cut-Outs',
        shortName: 'Theme Cut-Outs',
        styleNote: "Their favourite character or theme at full size, ready for photos.",
        price: 36,
        hireOnly: true,
        inStock: true,
        extraType: 'cutouts',
        image: 'public/assets/examples/character-cut-outs.jpg'
      },
      {
        id: 'centerpieces',
        name: 'Table Centerpiece Balloon Posy',
        shortName: 'Table Centerpiece',
        styleNote: "Matching table posies so every table feels part of the party.",
        price: 35,
        hireOnly: false,
        inStock: true,
        extraType: 'centerpiece',
        image: 'public/assets/examples/table-centrepiece.jpg'
      },
      {
        id: 'cake-stand',
        name: 'Luxury Cylinder Cake Plinth',
        shortName: 'Cake Plinth',
        styleNote: "Show off the cake on a plinth that matches your display.",
        price: 60,
        hireOnly: true,
        inStock: false,
        extraType: 'plinth',
        image: 'public/assets/examples/cake-plinth.jpg'
      }
    ]
  }
];

export const INITIAL_INSPIRATION_SLIDES = [
  {
    id: 'insp-1',
    category: 'Birthdays',
    title: 'The 21st Gold Shimmer & Sage Edit',
    description: "Your party guests will be dazzled by your very own gold shimmer selfie wall, complete with a show-stopping garland of balloons in up to five colours of your choosing. Finished off with two classic foil numbers and an Instagram-ready neon sign.",
    guidePrice: 237,
    image: 'public/assets/inspire-birthday.jpg',
    isExampleWatermark: true,
    cornerBanner: {
      enabled: true,
      text: 'MOST POPULAR',
      style: 'gold',
      position: 'top-right',
      discountType: 'none',
      discountValue: 0
    },
    preset: {
      paletteId: 'palette-sage-gold',
      backdropId: 'gold-shimmer',
      shimmerSize: 'small',
      balloonId: 'garland-7ft',
      digitOptionId: 'helium-foil-numbers',
      digitText: '21',
      extraIds: ['neon-sign']
    }
  },
  {
    id: 'insp-2',
    category: 'Baby Showers',
    title: 'Botanical Oak Arch & BABY Block Package',
    description: "Welcome your little one in soft, natural style: a bespoke arched board wrapped in warm neutral and sage balloons, with pampas sprays and our white BABY blocks ready for every photo.",
    guidePrice: 231,
    image: 'public/assets/inspire-baby.jpg',
    isExampleWatermark: true,
    cornerBanner: {
      enabled: false,
      text: '',
      style: 'sage',
      position: 'top-right',
      discountType: 'none',
      discountValue: 0
    },
    preset: {
      paletteId: 'palette-teddy-neutrals',
      backdropId: 'wooden-board',
      shimmerSize: 'small',
      balloonId: 'garland-7ft',
      digitOptionId: 'digits-none',
      digitText: '',
      extraIds: ['baby-boxes', 'add-on-flowers']
    }
  },
  {
    id: 'insp-3',
    category: 'Anniversaries',
    title: 'Blush & Champagne Circular Hoop Statement',
    description: "A golden hoop that frames every picture of the day, softly dressed in blush, pearl and gold balloons with cascading florals. Romantic, elegant and made for celebrating together.",
    guidePrice: 176,
    image: 'public/assets/inspire-anniversary.jpg',
    isExampleWatermark: true,
    cornerBanner: {
      enabled: false,
      text: '',
      style: 'blush',
      position: 'top-right',
      discountType: 'none',
      discountValue: 0
    },
    preset: {
      paletteId: 'palette-blush-romance',
      backdropId: 'balloon-hoop',
      shimmerSize: 'small',
      balloonId: 'garland-7ft',
      digitOptionId: 'digits-none',
      digitText: '',
      extraIds: ['add-on-flowers']
    }
  },
  {
    id: 'insp-4',
    category: 'Parties',
    title: 'Lilac & Gold Butterfly Shimmer Wall',
    description: "Make an entrance with our large shimmer wall, wrapped in a flowing garland of lilac, plum, pearl and gold, with delicate butterflies settling on the balloons.",
    guidePrice: 180,
    image: 'public/assets/pl-shimmer-lilac.jpg',
    isExampleWatermark: true,
    cornerBanner: {
      enabled: false,
      text: '',
      style: 'gold',
      position: 'top-right',
      discountType: 'none',
      discountValue: 0
    },
    preset: {
      paletteId: 'palette-blush-romance',
      backdropId: 'gold-shimmer',
      shimmerSize: 'large',
      balloonId: 'garland-7ft',
      digitOptionId: 'digits-none',
      digitText: '',
      extraIds: []
    }
  }
];

export const FULL_CSV_CATALOG = [
  // 1. Backdrops & Frames (Hire Only)
  { id: 'PROP-WALL-GLD-SM', sku: 'PROP-WALL-GLD-SM', department: 'Backdrops & Frames', section: 'Backdrops & Frames', name: 'Gold Sequin Shimmer Wall (Small)', tier: 'luxury', category: 'Parties', style: 'Small 6x6ft gold sequin wall with 7ft organic garland', pricingText: '£150 Package', basePrice: 150, secondPrice: 180, hireOnly: true, inStock: true, image: 'public/assets/pl-shimmer-lilac.jpg', builderLink: { type: 'step', stepId: 'backdrop', id: 'gold-shimmer', usePackagePrice: true }, builderPreset: { backdropId: 'gold-shimmer', shimmerSize: 'small', balloonId: 'garland-7ft' } },
  { id: 'PROP-WALL-GLD-LG', sku: 'PROP-WALL-GLD-LG', department: 'Backdrops & Frames', section: 'Backdrops & Frames', name: 'Gold Sequin Shimmer Wall (Large)', tier: 'luxury', category: 'Parties', style: 'Large 8x8ft gold sequin wall with 7ft organic garland', pricingText: '£180 Package', basePrice: 180, hireOnly: true, inStock: true, image: 'public/assets/pl-shimmer-lilac.jpg', builderLink: { type: 'step', stepId: 'backdrop', id: 'gold-shimmer', usePackagePrice: true }, builderPreset: { backdropId: 'gold-shimmer', shimmerSize: 'large', balloonId: 'garland-7ft' } },
  { id: 'PROP-HOOP-GLD', sku: 'PROP-HOOP-GLD', department: 'Backdrops & Frames', section: 'Backdrops & Frames', name: 'Circular Gold Balloon Hoop Frame', tier: 'fancy', category: 'Anniversaries', style: 'Circular gold statement frame with organic garland', pricingText: 'From £140 Package', basePrice: 140, hireOnly: true, inStock: true, image: 'public/assets/hero-arch.jpg', builderLink: { type: 'step', stepId: 'backdrop', id: 'balloon-hoop', usePackagePrice: true }, builderPreset: { backdropId: 'balloon-hoop', balloonId: 'garland-7ft' } },
  { id: 'PROP-BRD-ARCH', sku: 'PROP-BRD-ARCH', department: 'Backdrops & Frames', section: 'Backdrops & Frames', name: 'Personalised Wooden Arch Board', tier: 'fancy', category: 'Anniversaries', style: 'Painted arched board with custom vinyl text & garland', pricingText: 'From £155 Package', basePrice: 155, hireOnly: true, inStock: true, image: 'public/assets/pl-board-sixty.jpg', builderLink: { type: 'step', stepId: 'backdrop', id: 'wooden-board', usePackagePrice: true }, builderPreset: { backdropId: 'wooden-board', balloonId: 'garland-7ft' } },
  { id: 'PROP-EASEL-SGN', sku: 'PROP-EASEL-SGN', department: 'Backdrops & Frames', section: 'Backdrops & Frames', name: 'Easel Welcome Sign & Garland', tier: 'classic', category: 'Anniversaries', style: 'Personalised welcome board on easel with mini garland', pricingText: '£85 Package', basePrice: 85, hireOnly: true, inStock: true, image: 'public/assets/examples/easel-welcome-sign.jpg', builderLink: { type: 'step', stepId: 'backdrop', id: 'easel-sign' }, builderPreset: { backdropId: 'easel-sign', balloonId: 'clusters-top-bottom' } },
  { id: 'PROP-WALL-PKG-PLN', sku: 'PROP-WALL-PKG-PLN', department: 'Backdrops & Frames', section: 'Backdrops & Frames', name: 'Shimmer Wall & Display Plinths Package', tier: 'luxury', category: 'Parties', style: 'Sequin wall paired with balloon garland & cylinder plinth', pricingText: 'From £185 Package', basePrice: 185, hireOnly: true, inStock: true, image: 'public/assets/inspire-birthday.jpg', builderPreset: { backdropId: 'gold-shimmer', shimmerSize: 'small', balloonId: 'garland-7ft', extraIds: ['cake-stand'] } },

  // 2. Garlands & Arches (Yours to Keep)
  { id: 'GARL-SIDE-7FT', sku: 'GARL-SIDE-7FT', department: 'Garlands & Arches', section: 'Garlands & Arches', name: '7ft Organic Balloon Garland (One Side)', tier: 'classic', category: 'Parties', style: '7ft organic balloon cascade installed at your venue', pricingText: '£105 Solo', basePrice: 105, hireOnly: false, inStock: true, image: 'public/assets/hero-arch.jpg', builderLink: { type: 'step', stepId: 'balloons', id: 'garland-7ft' }, builderPreset: { backdropId: null, balloonId: 'garland-7ft' } },
  { id: 'GARL-CLUST-OPP', sku: 'GARL-CLUST-OPP', department: 'Garlands & Arches', section: 'Garlands & Arches', name: 'Top & Bottom Corner Balloon Clusters', tier: 'classic', category: 'Parties', style: 'Two organic clusters framing opposite corners', pricingText: '£85 Solo', basePrice: 85, hireOnly: false, inStock: true, image: 'public/assets/examples/corner-clusters.jpg', builderLink: { type: 'step', stepId: 'balloons', id: 'clusters-top-bottom' }, builderPreset: { backdropId: null, balloonId: 'clusters-top-bottom' } },
  { id: 'GARL-ARCH-FULL', sku: 'GARL-ARCH-FULL', department: 'Garlands & Arches', section: 'Garlands & Arches', name: 'Full Surround Statement Balloon Arch', tier: 'luxury', category: 'Parties', style: 'Freestanding or frame wrap-around organic balloon arch (120 balloons)', pricingText: '£145 Solo / +£35 Upgrade', basePrice: 145, secondPrice: 35, hireOnly: false, inStock: true, image: 'public/assets/hero-arch.jpg', builderLink: { type: 'step', stepId: 'balloons', id: 'garland-full' }, builderPreset: { backdropId: null, balloonId: 'garland-full' } },

  // 3. Numbers, Helium & Stacks (Yours to Keep)
  { id: 'STK-NUM-BASIC', sku: 'STK-NUM-BASIC', department: 'Numbers, Helium & Stacks', section: 'Numbers, Helium & Stacks', name: 'Freestanding Number Stack (Classic)', tier: 'classic', category: 'Birthdays', style: 'Air-filled foil number on organic latex cluster base', pricingText: '£35 (1-Digit) / £55 (2-Digit)', basePrice: 35, secondPrice: 55, hireOnly: false, inStock: true, image: 'public/assets/pl-stack-30.jpg', builderLink: { type: 'digit', id: 'stack-basic' }, builderPreset: { digitOptionId: 'stack-basic', digitText: '3' } },
  { id: 'STK-NUM-THEME', sku: 'STK-NUM-THEME', department: 'Numbers, Helium & Stacks', section: 'Numbers, Helium & Stacks', name: 'Freestanding Number Stack (Themed Accents)', tier: 'fancy', category: 'Birthdays', style: 'Custom character or themed foil accents & organic base', pricingText: '£60 (1-Digit) / £80 (2-Digit)', basePrice: 60, secondPrice: 80, hireOnly: false, inStock: true, image: 'public/assets/pl-stack-30.jpg', builderLink: { type: 'digit', id: 'stack-themed' }, builderPreset: { digitOptionId: 'stack-themed', digitText: '13' } },
  { id: 'STK-NUM-LUX', sku: 'STK-NUM-LUX', department: 'Numbers, Helium & Stacks', section: 'Numbers, Helium & Stacks', name: 'Freestanding Number Stack (Luxury Bows & Orbs)', tier: 'luxury', category: 'Birthdays', style: 'Full luxury sculpture stack with satin bows, orbs & florals', pricingText: '£70 (1-Digit) / £90 (2-Digit)', basePrice: 70, secondPrice: 90, hireOnly: false, inStock: true, image: 'public/assets/pl-stack-30.jpg', builderLink: { type: 'digit', id: 'stack-luxury' }, builderPreset: { digitOptionId: 'stack-luxury', digitText: '30' } },
  { id: 'HEL-NUM-1DIG', sku: 'HEL-NUM-1DIG', department: 'Numbers, Helium & Stacks', section: 'Numbers, Helium & Stacks', name: 'Helium Foil Number Single + 2 Weighted Clusters', tier: 'classic', category: 'Birthdays', style: 'Giant 34" helium foil number with 2 weighted latex clusters', pricingText: '£36', basePrice: 36, hireOnly: false, inStock: true, image: 'public/assets/pl-bubble-helium.jpg', builderLink: { type: 'digit', id: 'helium-foil-numbers' }, builderPreset: { digitOptionId: 'helium-foil-numbers', digitText: '7' } },
  { id: 'HEL-NUM-2DIG', sku: 'HEL-NUM-2DIG', department: 'Numbers, Helium & Stacks', section: 'Numbers, Helium & Stacks', name: 'Helium Foil Numbers Double + 2 Weighted Clusters', tier: 'classic', category: 'Birthdays', style: 'Giant 34" helium foil numbers (pair) with 2 weighted latex clusters', pricingText: '£52', basePrice: 52, hireOnly: false, inStock: true, image: 'public/assets/pl-bubble-helium.jpg', builderLink: { type: 'digit', id: 'helium-foil-numbers' }, builderPreset: { digitOptionId: 'helium-foil-numbers', digitText: '30' } },
  { id: 'HEL-BOUQUET', sku: 'HEL-BOUQUET', department: 'Numbers, Helium & Stacks', section: 'Numbers, Helium & Stacks', name: 'Luxury Helium Bouquet Clusters', tier: 'luxury', category: 'Parties', style: 'Weighted helium bouquet clusters for room dressing', pricingText: 'From £70', basePrice: 70, hireOnly: false, inStock: true, image: 'public/assets/pl-bubble-helium.jpg', builderPreset: { balloonId: 'clusters-top-bottom' } },
  { id: 'GIFT-BUBBLE', sku: 'GIFT-BUBBLE', department: 'Numbers, Helium & Stacks', section: 'Numbers, Helium & Stacks', name: 'Personalised Deco Bubble Balloon', tier: 'classic', category: 'Baby Showers', style: 'Clear orb with internal mini balloons & custom vinyl text', pricingText: '£35', basePrice: 35, hireOnly: false, inStock: true, image: 'public/assets/pl-bubble-helium.jpg', builderLink: { type: 'step', stepId: 'extras', id: 'bubble-balloon' }, builderPreset: { extraIds: ['bubble-balloon'] } },

  // 4. Finishing Props & Extras (Hire Only)
  { id: 'PROP-NEON-HBD', sku: 'PROP-NEON-HBD', department: 'Finishing Props & Extras', section: 'Finishing Props & Extras', name: 'LED Neon Script Sign ("Happy Birthday")', tier: 'fancy', category: 'Birthdays', style: 'Warm white LED neon script sign for shimmer walls or hoop frames', pricingText: '£35 Hire', basePrice: 35, hireOnly: true, inStock: true, image: 'public/assets/inspire-birthday.jpg', builderLink: { type: 'step', stepId: 'extras', id: 'neon-sign' }, builderPreset: { extraIds: ['neon-sign'] } },
  { id: 'PROP-FLORAL-SP', sku: 'PROP-FLORAL-SP', department: 'Finishing Props & Extras', section: 'Finishing Props & Extras', name: 'Add-On Faux Floral & Foliage Sprays', tier: 'fancy', category: 'Anniversaries', style: 'Faux florals, roses & eucalyptus woven into your balloon display', pricingText: '£36 Hire', basePrice: 36, hireOnly: true, inStock: true, image: 'public/assets/inspire-baby.jpg', builderLink: { type: 'step', stepId: 'extras', id: 'add-on-flowers' }, builderPreset: { extraIds: ['add-on-flowers'] } },
  { id: 'PROP-BABY-BOX', sku: 'PROP-BABY-BOX', department: 'Finishing Props & Extras', section: 'Finishing Props & Extras', name: 'Baby Shower BABY Blocks (Set of 4)', tier: 'classic', category: 'Baby Showers', style: 'Set of 4 white lettered display cubes filled with palette balloons', pricingText: '£40 Hire', basePrice: 40, hireOnly: true, inStock: true, image: 'public/assets/inspire-baby.jpg', builderLink: { type: 'step', stepId: 'extras', id: 'baby-boxes' }, builderPreset: { extraIds: ['baby-boxes'] } },
  { id: 'PROP-PLINTH-WH', sku: 'PROP-PLINTH-WH', department: 'Finishing Props & Extras', section: 'Finishing Props & Extras', name: 'White Cylinder Display Plinth', tier: 'classic', category: 'Birthdays', style: 'Luxury white cylinder cake display plinth with mini balloon collar', pricingText: '£60 Hire', basePrice: 60, hireOnly: true, inStock: true, image: 'public/assets/inspire-anniversary.jpg', builderLink: { type: 'step', stepId: 'extras', id: 'cake-stand' }, builderPreset: { extraIds: ['cake-stand'] } },
  { id: 'PROP-CUTOUT-WD', sku: 'PROP-CUTOUT-WD', department: 'Finishing Props & Extras', section: 'Finishing Props & Extras', name: 'Themed Character Wood Cut-Outs', tier: 'fancy', category: 'Birthdays', style: 'Custom freestanding themed character or prop board cut-out', pricingText: 'From £36 Hire', basePrice: 36, secondPrice: 52, hireOnly: true, inStock: true, image: 'public/assets/examples/character-cut-outs.jpg', builderLink: { type: 'step', stepId: 'extras', id: 'cut-outs' }, builderPreset: { extraIds: ['cut-outs'] } },
  { id: 'PROP-TABLE-CTR', sku: 'PROP-TABLE-CTR', department: 'Finishing Props & Extras', section: 'Finishing Props & Extras', name: 'Bespoke Table Centerpieces', tier: 'classic', category: 'Anniversaries', style: 'Bespoke table centerpiece balloon arrangements', pricingText: '£35', basePrice: 35, hireOnly: false, inStock: true, image: 'public/assets/examples/table-centrepiece.jpg', builderLink: { type: 'step', stepId: 'extras', id: 'centerpieces' }, builderPreset: { extraIds: ['centerpieces'] } }
];

export const INITIAL_OFFERS = [
  {
    id: 'offer-1',
    code: 'OCCASION10',
    title: '10% Off Full Shimmer Wall Packages',
    discountPercent: 10,
    active: true
  },
  {
    id: 'offer-2',
    code: 'FREENEON',
    title: 'Complimentary Neon Sign Upgrade on Orders £180+',
    discountFixed: 35,
    minSpend: 180,
    active: true
  }
];

export const INITIAL_DELIVERY_CONFIG = {
  centerName: 'Bottesford, Leicestershire',
  centerCoords: [52.9436, -0.8006],
  // Laura: free nearby, then a mileage charge; travels up to 20 miles
  zones: [
    { id: 'zone-1', name: 'Nearby', miles: 10, surcharge: 0, color: '#7A8C68', note: 'Free delivery, setup and collection.' },
    { id: 'zone-2', name: 'Further afield', miles: 20, surcharge: null, perMile: true, color: '#C5A059', note: 'A small mileage charge, confirmed in your quote.' }
  ]
};

export const INITIAL_SEO_SETTINGS = {
  businessName: 'THE Occasion Edit',
  tagline: 'Bespoke Balloon Styling, Sequin Shimmer Walls & Luxury Event Decor',
  serviceAreas: 'Bottesford, Vale of Belvoir, Grantham, Bingham, Melton Mowbray, Newark-on-Trent, Nottingham & surrounding East Midlands borders',
  postcodePrefixes: 'NG13, NG31, NG32, NG1, NG2, NG3, NG12, LE13, LN6',
  deliveryNote: 'Based in Bottesford, Leicestershire, we deliver, install, and collect all hire frames, shimmer walls, wooden boards, and neon signs across the Vale of Belvoir and East Midlands. Air-filled number stacks and helium packages are yours to keep.',
  instagramUrl: 'https://www.instagram.com/'
};

/**
 * Centroid coordinates for East Midlands and surrounding UK outcodes.
 * Provides instant zero-network distance calculation without leaking customer residential addresses.
 */
export const UK_OUTCODE_CENTROIDS = {
  'NG13': [52.951, -0.952], // Bottesford / Bingham
  'NG31': [52.912, -0.643], // Grantham
  'NG32': [52.965, -0.612], // Grantham rural / Belvoir
  'NG33': [52.812, -0.610], // South witham
  'NG34': [52.998, -0.412], // Sleaford
  'NG1': [52.954, -1.150],  // Nottingham Central
  'NG2': [52.936, -1.134],  // West Bridgford
  'NG12': [52.905, -1.054], // Radcliffe on Trent / Cotgrave
  'LE13': [52.766, -0.887], // Melton Mowbray
  'LE14': [52.812, -0.998], // Melton rural
  'LE1': [52.636, -1.133],  // Leicester Central
  'LE7': [52.685, -1.065],  // Syston
  'LE11': [52.772, -1.206], // Loughborough
  'LE12': [52.795, -1.165], // Shepshed / East Leake
  'LN6': [53.195, -0.585],  // Lincoln South / North Hykeham
  'LN1': [53.234, -0.540],  // Lincoln Central
  'LN5': [53.180, -0.540],  // Waddington
  'DE1': [52.922, -1.476],  // Derby
  'DE72': [52.885, -1.365], // Borrowash
  'DE74': [52.835, -1.332]  // Castle Donington
};

/**
 * Calculates straight-line distance in miles between two coordinates using Haversine formula.
 */
export function haversineDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Calculates distance from Bottesford base to a UK postcode.
 */
export function calculateDistanceToBottesford(rawPostcode) {
  if (!rawPostcode) return null;
  const cleaned = String(rawPostcode).trim().toUpperCase();
  const outcodeMatch = cleaned.match(/^[A-Z]{1,2}[0-9][A-Z0-9]?/);
  if (!outcodeMatch) return null;
  const outcode = outcodeMatch[0];

  const baseCoords = INITIAL_DELIVERY_CONFIG.centerCoords; // [52.9436, -0.8006]
  const targetCoords = UK_OUTCODE_CENTROIDS[outcode];
  if (!targetCoords) {
    // If outcode not in pre-mapped table, return approximate based on area code
    if (outcode.startsWith('NG')) return 14.0;
    if (outcode.startsWith('LE')) return 18.0;
    if (outcode.startsWith('LN')) return 22.0;
    if (outcode.startsWith('DE')) return 28.0;
    return null;
  }
  return haversineDistanceMiles(baseCoords[0], baseCoords[1], targetCoords[0], targetCoords[1]);
}

/**
 * Determines which delivery zone and surcharge apply for a given mileage.
 */
export function getDeliveryZoneForMileage(miles, zones = INITIAL_DELIVERY_CONFIG.zones) {
  if (miles === null || miles === undefined) {
    return { zone: null, surcharge: 0, note: 'Enter a postcode to check delivery' };
  }
  const zone = [...zones].sort((x, y) => x.miles - y.miles).find(z => miles <= z.miles);
  if (!zone) {
    return { zone: null, surcharge: null, outside: true, label: `About ${Math.round(miles)} miles away` };
  }
  return { zone, surcharge: zone.perMile ? null : (zone.surcharge || 0), perMile: !!zone.perMile, label: `${zone.name} (about ${Math.round(miles)} miles)` };
}

// How delivery is described to customers, in one place
export function describeDelivery(zoneInfo) {
  if (!zoneInfo || zoneInfo.outside) return 'A little outside our usual area. Send your edit and we\'ll see what we can do.';
  if (!zoneInfo.zone) return '';
  if (zoneInfo.perMile) return 'A small mileage charge for delivery, confirmed in your quote.';
  if (!zoneInfo.surcharge) return 'Free delivery, setup and collection.';
  return `Delivery and collection: £${zoneInfo.surcharge}.`;
}

/**
 * Returns UK tax year tokens for deterministic folder and document naming.
 * April 6 rollover rule.
 */
export function getUkTaxYear(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-indexed
  const day = d.getDate();

  const isAfterApril6 = month > 4 || (month === 4 && day >= 6);
  const startYear = isAfterApril6 ? year : year - 1;
  const endYear = (startYear + 1) % 100;
  const endYearPadded = String(endYear).padStart(2, '0');

  return {
    slash: `${startYear}/${endYearPadded}`,    // e.g. "2025/26" for sheet
    hyphen: `${startYear}-${endYearPadded}`,   // e.g. "2025-26" for Drive folder & filename
    label: `Tax Year ${startYear}/${endYearPadded}`
  };
}

export const INITIAL_FAQS = [
  {
    id: 'faq-1',
    question: 'Which items are hired and which items do we keep?',
    answer: 'All structural props — including Sequin Shimmer Walls, Arched Wooden Backdrop Boards, Circular Gold Hoops, Wooden Easels, LED Neon Signs, BABY Blocks, and Cake Plinths — are hired for your event and collected by our team afterwards. Freestanding Balloon Number Stacks, Helium Foil Numbers, Personalised Bubble Balloons, and latex balloons are yours to keep.'
  },
  {
    id: 'faq-2',
    question: 'What is the difference between the Small (£150) and Large (£180) Shimmer Wall packages?',
    answer: 'Our Small Sequin Shimmer Wall package (£150 including a 7ft organic balloon garland) is ideal for home celebrations and intimate dining spaces. Our Large Sequin Shimmer Wall package (£180 including a 7ft organic balloon garland) creates a wide, floor-to-ceiling photo backdrop suited to venues, function rooms, and milestone parties.'
  },
  {
    id: 'faq-3',
    question: 'How far in advance should we book our event date?',
    answer: 'We recommend submitting your custom Edit 2 to 6 weeks before your celebration to guarantee your preferred shimmer wall colour, backdrop board, and installation slot — though we always do our best to accommodate last-minute availability.'
  },
  {
    id: 'faq-4',
    question: 'Can you match a custom colour scheme or theme?',
    answer: 'Yes! You can select one of our 5 Signature Palettes in Step 1 of the Builder, or switch to "Build Your Own Palette" to blend up to 5 matte, pearl, and metallic chrome balloon shades.'
  }
];

/**
 * Helper: Applies an item's Corner Banner discount (if enabled) to a base GBP amount.
 */
export function applyCornerBannerDiscount(rawPrice, cornerBanner) {
  const base = Number(rawPrice || 0);
  if (!cornerBanner || !cornerBanner.enabled || !cornerBanner.discountValue) {
    return base;
  }
  const val = Number(cornerBanner.discountValue || 0);
  if (cornerBanner.discountType === 'percent' && val > 0) {
    return Math.max(0, Math.round(base * (1 - val / 100)));
  }
  if (cornerBanner.discountType === 'fixed' && val > 0) {
    return Math.max(0, base - val);
  }
  return base;
}

/**
 * Dynamically synthesizes an editorial description from a Look's checked stock items.
 * When Laura checks/unchecks an item in the Pick & Mix dock, this auto-generates the text.
 */
export function generateLookDescription(recipe, steps = CONFIGURATOR_STEPS, digitOptions = INITIAL_DIGIT_LETTER_OPTIONS, curatedPalettes = INITIAL_CURATED_PALETTES) {
  if (!recipe) return '';

  const backdropStep = steps.find(s => s.id === 'backdrop') || steps[1];
  const balloonStep = steps.find(s => s.id === 'balloons') || steps[2];
  const extrasStep = steps.find(s => s.id === 'extras') || steps[4];

  const backdrop = backdropStep?.items?.find(i => i.id === recipe.backdropId) || null;
  const balloons = balloonStep?.items?.find(i => i.id === recipe.balloonId) || null;
  const digitOpt = digitOptions.find(d => d.id === recipe.digitOptionId) || null;
  const extras = (recipe.extraIds || [])
    .map(id => extrasStep?.items?.find(i => i.id === id))
    .filter(Boolean);
  const palette = curatedPalettes.find(p => p.id === recipe.paletteId) || null;

  const parts = [];

  if (backdrop) {
    if (backdrop.id === 'wooden-board') {
      parts.push('Personalised Wooden Arch Board');
    } else if (backdrop.backdropType === 'shimmer-wall') {
      const sizeStr = recipe.shimmerSize === 'large' ? 'Large' : 'Small';
      parts.push(`${backdrop.name} (${sizeStr})`);
    } else {
      parts.push(backdrop.name);
    }
  }

  if (balloons) {
    const palName = palette ? ` in our ${palette.name.replace(/^\d+\.\s*/, '')} palette` : '';
    if (backdrop) {
      parts.push(`dressed with a ${balloons.name}${palName}`);
    } else {
      parts.push(`Freestanding ${balloons.name}${palName}`);
    }
  }

  if (digitOpt && digitOpt.type !== 'none') {
    const textStr = recipe.digitText ? ` "${recipe.digitText}"` : '';
    parts.push(`with ${digitOpt.name}${textStr}`);
  }

  if (extras.length > 0) {
    const extraNames = extras.map(e => e.name || e.shortName).join(' and ');
    parts.push(`finishing touches including ${extraNames}`);
  }

  if (parts.length === 0) {
    return 'Bespoke custom balloon display tailored to your venue and celebration.';
  }

  const first = parts[0];
  const rest = parts.slice(1);
  return `${first}${rest.length > 0 ? ', ' + rest.join(', ') : ''}.`;
}

/**
 * Shared Single-Source Recipe Pricing Engine:
 * Powers BOTH the Lookbook cards ("Compile a Look from Stock") AND the 3D Builder (getLineItems).
 */
export function calculateLookRecipePrice(recipe, steps = CONFIGURATOR_STEPS, digitOptions = INITIAL_DIGIT_LETTER_OPTIONS, balloonColours = INITIAL_BALLOON_COLOURS, curatedPalettes = INITIAL_CURATED_PALETTES, cardCornerBanner = null) {
  if (!recipe) {
    return { lines: [], originalTotal: 0, finalTotal: 0, hasDiscount: false, outOfStockItems: [] };
  }

  const backdropStep = steps.find(s => s.id === 'backdrop') || steps[1];
  const balloonStep = steps.find(s => s.id === 'balloons') || steps[2];
  const extrasStep = steps.find(s => s.id === 'extras') || steps[4];

  const backdrop = backdropStep?.items?.find(i => i.id === recipe.backdropId) || null;
  const balloons = balloonStep?.items?.find(i => i.id === recipe.balloonId) || null;
  const shimmerSize = recipe.shimmerSize || 'small';
  const digitSelection = digitOptions.find(d => d.id === recipe.digitOptionId) || digitOptions[0];
  const extras = (recipe.extraIds || [])
    .map(id => extrasStep?.items?.find(i => i.id === id))
    .filter(Boolean);

  const lines = [];
  const outOfStockItems = [];

  if (recipe.paletteId) {
    const pal = curatedPalettes.find(p => p.id === recipe.paletteId);
    if (pal && !pal.inStock) outOfStockItems.push(pal.name);
  }
  if (backdrop && !backdrop.inStock) outOfStockItems.push(backdrop.shortName || backdrop.name);
  if (balloons && !balloons.inStock) outOfStockItems.push(balloons.shortName || balloons.name);
  if (digitSelection && digitSelection.type !== 'none' && !digitSelection.inStock) {
    outOfStockItems.push(digitSelection.name);
  }
  extras.forEach(ex => {
    if (!ex.inStock) outOfStockItems.push(ex.shortName || ex.name);
  });

  // 1. Backdrop + Garland Package Rules
  if (backdrop && balloons) {
    if (backdrop.id === 'wooden-board' || backdrop.backdropType === 'hoop') {
      const rawPkg = backdrop.packageBasePrice || (backdrop.price + balloons.price);
      const finalPkg = applyCornerBannerDiscount(rawPkg, backdrop.cornerBanner);
      lines.push({ label: `${backdrop.shortName} & Garland`, rawAmount: rawPkg, amount: finalPkg });
      if (balloons.id === 'garland-full') {
        const rawUpg = balloons.upgradeSurcharge || 35;
        lines.push({ label: 'Full Arch Upgrade', rawAmount: rawUpg, amount: applyCornerBannerDiscount(rawUpg, balloons.cornerBanner) });
      }
    } else if (backdrop.backdropType === 'shimmer-wall') {
      const rawWall = shimmerSize === 'large'
        ? (backdrop.packageLargePrice || 180)
        : (backdrop.packageBasePrice || 150);
      const finalWall = applyCornerBannerDiscount(rawWall, backdrop.cornerBanner);
      lines.push({
        label: `${backdrop.shortName} (${shimmerSize === 'large' ? 'Large' : 'Small'})`,
        rawAmount: rawWall,
        amount: finalWall
      });
      if (balloons.id === 'garland-full') {
        const rawUpg = balloons.shimmerUpgradeSurcharge || 25;
        lines.push({ label: 'Full Arch Upgrade', rawAmount: rawUpg, amount: applyCornerBannerDiscount(rawUpg, balloons.cornerBanner) });
      }
    } else if (backdrop.standalonePackage) {
      const raw = backdrop.price;
      lines.push({ label: backdrop.shortName, rawAmount: raw, amount: applyCornerBannerDiscount(raw, backdrop.cornerBanner) });
    } else {
      const raw = backdrop.price + balloons.price;
      const finalAmt = applyCornerBannerDiscount(backdrop.price, backdrop.cornerBanner) + applyCornerBannerDiscount(balloons.price, balloons.cornerBanner);
      lines.push({ label: `${backdrop.shortName} + ${balloons.shortName}`, rawAmount: raw, amount: finalAmt });
    }
  } else if (backdrop && !balloons) {
    // A wall's price depends on its size even before any balloons are chosen
    const isLargeWall = backdrop.backdropType === 'shimmer-wall' && shimmerSize === 'large';
    const raw = isLargeWall ? (backdrop.packageLargePrice || 180) : (backdrop.packageBasePrice || backdrop.price);
    const label = backdrop.backdropType === 'shimmer-wall' ? `${backdrop.shortName} (${isLargeWall ? 'Large' : 'Small'})` : backdrop.shortName;
    lines.push({ label, rawAmount: raw, amount: applyCornerBannerDiscount(raw, backdrop.cornerBanner) });
  } else if (!backdrop && balloons) {
    const raw = balloons.price;
    lines.push({ label: balloons.shortName, rawAmount: raw, amount: applyCornerBannerDiscount(raw, balloons.cornerBanner) });
  }

  // 2. Foil Digits, Number Stacks & Custom Letters
  if (digitSelection && digitSelection.type !== 'none') {
    const cleaned = (recipe.digitText || digitSelection.defaultText || '1').replace(/\s+/g, '');
    const charCount = Math.max(1, cleaned.length);
    let rawDigit = digitSelection.basePrice;
    if (digitSelection.perLetter) {
      rawDigit = charCount * digitSelection.basePrice;
    } else if (charCount === 2 && digitSelection.secondDigitPrice) {
      rawDigit = digitSelection.secondDigitPrice;
    } else if (charCount > 1) {
      // Only charge per extra number where a price for it has been set
      rawDigit = digitSelection.basePrice + (charCount - 1) * (digitSelection.extraCharPrice || 0);
    }
    lines.push({
      label: `${digitSelection.name} ("${cleaned.toUpperCase()}")`,
      rawAmount: rawDigit,
      amount: applyCornerBannerDiscount(rawDigit, digitSelection.cornerBanner)
    });
  }

  // 3. Finishing Extras
  extras.forEach(ex => {
    lines.push({
      label: ex.shortName,
      rawAmount: ex.price,
      amount: applyCornerBannerDiscount(ex.price, ex.cornerBanner)
    });
  });

  const originalTotal = lines.reduce((sum, l) => sum + l.rawAmount, 0);
  let finalTotal = lines.reduce((sum, l) => sum + l.amount, 0);

  // 4. Optional Lookbook Card Corner Banner Discount
  const activeBanner = cardCornerBanner || recipe.cornerBanner;
  if (activeBanner && activeBanner.enabled && activeBanner.discountValue > 0) {
    finalTotal = applyCornerBannerDiscount(finalTotal, activeBanner);
  }

  return {
    lines,
    originalTotal,
    finalTotal,
    hasDiscount: finalTotal < originalTotal,
    outOfStockItems
  };
}

/**
 * Synchronizes FULL_CSV_CATALOG (Price Guide cards) with live Builder items (`steps` & `digitOptions`)
 * so updating a price, stock toggle, or corner banner in one place updates the entire site.
 */
export function deriveUnifiedCatalog(catalog = FULL_CSV_CATALOG, steps = CONFIGURATOR_STEPS, digitOptions = INITIAL_DIGIT_LETTER_OPTIONS) {
  return catalog.map(card => {
    const link = card.builderLink;
    if (!link) return card;

    if (link.type === 'digit') {
      const dOpt = digitOptions.find(d => d.id === link.id);
      if (!dOpt) return card;
      const base = dOpt.basePrice;
      const pricingText = dOpt.secondDigitPrice
        ? `From £${base} (1 digit) / £${dOpt.secondDigitPrice} (2 digits)`
        : `From £${base}`;
      return {
        ...card,
        basePrice: base,
        pricingText,
        inStock: dOpt.inStock,
        cornerBanner: card.cornerBanner?.enabled ? card.cornerBanner : dOpt.cornerBanner
      };
    }

    if (link.type === 'step') {
      const st = steps.find(s => s.id === link.stepId);
      const item = st?.items?.find(i => i.id === link.id);
      if (!item) return card;
      const base = link.usePackagePrice ? (item.packageBasePrice || item.price) : item.price;
      const pricingText = item.hasSizeTier
        ? `From £${item.packageBasePrice || 150} (Small) / £${item.packageLargePrice || 180} (Large)`
        : (link.usePackagePrice ? `From £${base}` : `£${base}`);
      return {
        ...card,
        basePrice: base,
        pricingText,
        inStock: item.inStock,
        hireOnly: item.hireOnly,
        cornerBanner: card.cornerBanner?.enabled ? card.cornerBanner : item.cornerBanner
      };
    }

    return card;
  });
}

/**
 * Mathematical Formula Engine: Balloon Recipe & Workshop Pull List
 * Implements the Largest Remainder Method (Hamilton-Hare) to distribute S, M, L balloons
 * across K palette colours with zero fractional balloon loss and strict invariant conservation:
 * S + M + L = Total.
 * 
 * Supports:
 * - 4 Open Inputs for Laura: Total, Small (5"), Medium (11"/12"), Large (16"/24")
 * - 8% studio popping/wastage buffer
 * - Wholesale trade bag calculations (5": 100/bag, 11": 100/bag, 16/24": 25/bag)
 */
export function calculateBalloonPullList(garlandItem, paletteColors = [], customInputs = {}) {
  const defaultRecipe = garlandItem?.recipe || { defaultTotal: 120, defaultSmall: 35, defaultMed: 65, defaultLarge: 20 };
  
  // 1. Resolve inputs (custom or default)
  const total = Number(customInputs.total !== undefined ? customInputs.total : (defaultRecipe.defaultTotal || 120));
  let small = Number(customInputs.small !== undefined ? customInputs.small : (defaultRecipe.defaultSmall || Math.round(total * 0.30)));
  let med = Number(customInputs.med !== undefined ? customInputs.med : (defaultRecipe.defaultMed || Math.round(total * 0.50)));
  let large = Number(customInputs.large !== undefined ? customInputs.large : (defaultRecipe.defaultLarge || (total - small - med)));

  // Strict invariant enforcement: S + M + L === Total
  if (small + med + large !== total) {
    large = Math.max(0, total - small - med);
  }

  // 2. Resolve Palette Colours
  const colors = (paletteColors && paletteColors.length > 0) ? paletteColors : [
    { id: 'soft-blush', name: 'Soft Blush', hex: '#D8A49B' },
    { id: 'pearl-white', name: 'Pearl Ivory', hex: '#FAF6F0' },
    { id: 'champagne-gold', name: 'Chrome Gold', hex: '#C5A059' },
    { id: 'nude-stone', name: 'Warm Taupe', hex: '#C4B5A5' },
    { id: 'soft-lilac', name: 'Soft Lilac', hex: '#C4B5D6' }
  ];
  const K = Math.max(1, colors.length);

  // Largest Remainder Method partitioning helper
  function distributeTier(count, k) {
    const base = Math.floor(count / k);
    const remainder = count % k;
    return colors.map((col, idx) => base + (idx < remainder ? 1 : 0));
  }

  const sDistrib = distributeTier(small, K);
  const mDistrib = distributeTier(med, K);
  const lDistrib = distributeTier(large, K);

  // Studio Loss / Popping buffer (default 8%)
  const bufferPercent = Number(customInputs.bufferPercent !== undefined ? customInputs.bufferPercent : 8);
  const bufferFactor = 1 + bufferPercent / 100;

  // Wholesale trade bag units: 5" = 100/bag, 11" = 100/bag, 16/24" = 25/bag
  const tradePacks = { small: 100, med: 100, large: 25 };

  const colorBreakdown = colors.map((col, idx) => {
    const s = sDistrib[idx];
    const m = mDistrib[idx];
    const l = lDistrib[idx];
    const rowTotal = s + m + l;

    const sBuf = Math.ceil(s * bufferFactor);
    const mBuf = Math.ceil(m * bufferFactor);
    const lBuf = Math.ceil(l * bufferFactor);
    const rowTotalBuf = sBuf + mBuf + lBuf;

    return {
      id: col.id || `col-${idx}`,
      color: col.name || col.id,
      hex: col.hex || '#D8A49B',
      small: s,
      med: m,
      large: l,
      total: rowTotal,
      smallBuffer: sBuf,
      medBuffer: mBuf,
      largeBuffer: lBuf,
      totalBuffer: rowTotalBuf,
      bagsToOrder: {
        small: Math.ceil(sBuf / tradePacks.small),
        med: Math.ceil(mBuf / tradePacks.med),
        large: Math.ceil(lBuf / tradePacks.large)
      }
    };
  });

  const totalWithBuffer = colorBreakdown.reduce((sum, c) => sum + c.totalBuffer, 0);

  return {
    sku: garlandItem?.sku || 'GARL-ARCH-FULL',
    name: garlandItem?.name || 'Full Surround Statement Balloon Arch',
    inputs: { total, small, med, large, bufferPercent },
    summary: {
      total,
      small,
      med,
      large,
      totalWithBuffer,
      paletteCount: K
    },
    colorBreakdown
  };
}

