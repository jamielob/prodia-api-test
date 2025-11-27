import { NextResponse } from "next/server";

// Blacklist of words that often trigger text/logo generation
const BLACKLIST = [
  // Text and typography
  'text', 'logo', 'brand', 'label', 'sign', 'poster', 'banner',
  'typography', 'lettering', 'words', 'writing', 'letters', 'font',
  'slogan', 'title', 'caption', 'headline', 'tagline', 'quote',
  'stamp', 'watermark', 'signature', 'emblem', 'badge', 'symbol',
  
  // Print and media
  'magazine', 'newspaper', 'book', 'card', 'ticket', 'certificate',
  'advertisement', 'ad', 'flyer', 'brochure', 'packaging', 'wrapper',
  'menu', 'invoice', 'receipt', 'document', 'page', 'billboard',
  
  // Car manufacturers
  'toyota', 'ford', 'chevrolet', 'chevy', 'honda', 'nissan', 'hyundai',
  'mercedes', 'bmw', 'audi', 'volkswagen', 'vw', 'porsche', 'ferrari',
  'lamborghini', 'tesla', 'mazda', 'subaru', 'lexus', 'infiniti',
  'cadillac', 'dodge', 'jeep', 'ram', 'chrysler', 'buick', 'gmc',
  'volvo', 'jaguar', 'landrover', 'bentley', 'rollsroyce', 'maserati',
  'bugatti', 'mclaren', 'aston', 'lotus', 'fiat', 'alfa', 'peugeot',
  'renault', 'citroen', 'mini', 'seat', 'skoda', 'mitsubishi', 'kia',
  
  // Tech brands
  'apple', 'microsoft', 'google', 'amazon', 'facebook', 'meta', 'twitter',
  'samsung', 'sony', 'lg', 'dell', 'hp', 'lenovo', 'asus', 'acer',
  'intel', 'amd', 'nvidia', 'ibm', 'oracle', 'adobe', 'netflix',
  'spotify', 'youtube', 'instagram', 'tiktok', 'snapchat', 'linkedin',
  
  // Fashion and retail
  'nike', 'adidas', 'puma', 'reebok', 'underarmour', 'vans', 'converse',
  'gucci', 'prada', 'chanel', 'dior', 'versace', 'armani', 'burberry',
  'hermès', 'louisvuitton', 'fendi', 'givenchy', 'balenciaga', 'valentino',
  'zara', 'h&m', 'gap', 'uniqlo', 'forever21', 'target', 'walmart',
  
  // Food and beverage
  'cocacola', 'coke', 'pepsi', 'sprite', 'fanta', 'redbull', 'monster',
  'starbucks', 'mcdonalds', 'burgerking', 'subway', 'kfc', 'pizzahut',
  'dominos', 'wendys', 'tacobell', 'chipotle', 'panera', 'dunkin',
  'nestle', 'heinz', 'kraft', 'kellogs', 'generalmills', 'nabisco',
  
  // Universities
  'harvard', 'yale', 'princeton', 'stanford', 'mit', 'cambridge', 'oxford',
  'berkeley', 'ucla', 'usc', 'columbia', 'cornell', 'dartmouth', 'penn',
  'duke', 'northwestern', 'chicago', 'caltech', 'jhu', 'brown',
  
  // Sports teams/brands
  'yankees', 'lakers', 'patriots', 'cowboys', 'redsox', 'cubs', 'dodgers',
  'knicks', 'celtics', 'warriors', 'bulls', 'packers', 'eagles', 'steelers',
  'nfl', 'nba', 'mlb', 'nhl', 'fifa', 'olympics', 'espn',
  
  // Other major brands
  'disney', 'warner', 'universal', 'paramount', 'pixar', 'dreamworks',
  'visa', 'mastercard', 'amex', 'paypal', 'fedex', 'ups', 'dhl',
  'ikea', 'lego', 'barbie', 'hasbro', 'mattel', 'nintendo', 'playstation',
  'xbox', 'sega', 'atari', 'monopoly', 'scrabble',
  
  // Generic branded items
  'branded', 'commercial', 'corporate', 'company', 'business', 'trademark',
  'registered', 'official', 'licensed', 'authentic', 'original'
];

function filterPrompt(prompt) {
  let filtered = prompt.toLowerCase();
  
  // Remove blacklisted words (case-insensitive, whole words only)
  BLACKLIST.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '');
  });
  
  // Clean up extra spaces
  filtered = filtered.replace(/\s+/g, ' ').trim();
  
  return filtered;
}

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }
    
    // Filter out blacklisted words
    const filteredPrompt = filterPrompt(prompt);

    const apiKey = process.env.PRODIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server missing PRODIA_API_KEY" }, { status: 500 });
    }

    // Generate image using Prodia API with Flux Fast Schnell
    const prodiaRes = await fetch("https://inference.prodia.com/v2/job", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "image/jpeg",
      },
      body: JSON.stringify({
        type: "inference.flux-fast.schnell.txt2img.v2",
        config: {
          prompt: filteredPrompt
        }
      })
    });

    if (!prodiaRes.ok) {
      const errText = await prodiaRes.text();
      console.error('Prodia API error:', prodiaRes.status, errText);
      let errorMessage = `Prodia API error (${prodiaRes.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error) errorMessage += `: ${errJson.error}`;
        if (errJson.message) errorMessage += `: ${errJson.message}`;
      } catch {
        if (errText) errorMessage += `: ${errText.substring(0, 200)}`;
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: 502 }
      );
    }

    // Get the image as a buffer and convert to base64
    const imageBuffer = await prodiaRes.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    return NextResponse.json({ url: dataUrl });
  } catch (e) {
    return NextResponse.json(
      { error: "Unexpected server error", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
