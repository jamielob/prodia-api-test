/**
 * AI-powered copyright filter using Groq Llama 3.3 70B
 * Filters out copyrighted brands, characters, and artist names from prompts
 * @param {string} prompt - The input prompt to filter
 * @returns {Promise<string>} - The filtered prompt with safe alternatives
 */
export async function filterPrompt(prompt) {
  if (!prompt) return '';
  
  console.log('[Groq] Filtering prompt:', prompt);
  
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.warn('[Groq] GROQ_API_KEY not found, returning original prompt');
      return prompt;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: `1. Remove words related to text/logos: text, logo, brand, lettering, typography, words, numbers, letters, font, label, sign
2. Replace brand/character names with "abstract [description]": BMW→abstract luxury car, Star Wars→abstract space saga
3. Replace famous artist names with their art style: Jackson Pollock→abstract expressionist, Picasso→cubist abstract, Van Gogh→post-impressionist
4. Keep fashion/art style terms unchanged: grunge, academia, chic, vintage, impressionist, abstract

TO replace:
- "with text" → "" (removed)
- "BMW logo" → "abstract luxury car"
- "Star Wars" → "abstract space saga"
- "Jackson Pollock" → "abstract expressionist"
- "Andy Warhol style" → "pop art style"

NOT to replace:
- "dark academia" → "dark academia"
- "grunge style" → "grunge style"
- "impressionist" → "impressionist"
- "abstract expressionist" → "abstract expressionist"

Text: ${prompt}
Filtered:`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status);
      return prompt;
    }

    const data = await response.json();
    let filtered = data.choices?.[0]?.message?.content?.trim();
    console.log('[Groq] Raw AI response:', filtered);
    
    // Remove explanation text (e.g., "Since there are no...", "the filtered text remains")
    // Also handle "Filtered:" prefix from the AI response
    if (filtered && /^(Filtered|filtered):/i.test(filtered)) {
      filtered = filtered.replace(/^(Filtered|filtered):\s*/i, '').trim();
      console.log('[Groq] Removed "Filtered:" prefix:', filtered);
    }
    
    if (filtered && (filtered.includes('Since ') || filtered.includes('remains') || filtered.includes('given text'))) {
      // Extract text after the last colon if present (e.g., "explanation: actual text")
      if (filtered.includes(':')) {
        const lastColonIndex = filtered.lastIndexOf(':');
        const afterColon = filtered.substring(lastColonIndex + 1).trim();
        if (afterColon) {
          filtered = afterColon;
          console.log('[Groq] Extracted text after colon:', filtered);
        }
      } else {
        // Try to extract just the filtered text before the explanation
        const parts = filtered.split(/Since |As there|There are no|the filtered text/);
        if (parts[0].trim()) {
          filtered = parts[0].trim();
          console.log('[Groq] Removed explanation, extracted:', filtered);
        }
      }
    }
    
    // Remove trailing period if the original prompt didn't have one
    if (filtered && !prompt.endsWith('.') && filtered.endsWith('.')) {
      console.log('[Groq] Removing trailing period');
      filtered = filtered.slice(0, -1);
    }
    
    // Additional cleanup - remove text-related words
    const textWords = ['\\btext\\b', '\\blogo\\b', '\\bbrand\\b', '\\blettering\\b', '\\btypography\\b', '\\bwords\\b', '\\bnumbers\\b', '\\bletters\\b', '\\bfont\\b', '\\blabel\\b', '\\bsign\\b'];
    textWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '').trim();
    });
    
    // Clean up multiple spaces
    filtered = filtered.replace(/\s+/g, ' ').trim();
    
    console.log('[Groq] Final filtered result:', filtered);
    return filtered || prompt;
  } catch (error) {
    console.error('Error filtering prompt with AI:', error);
    return prompt;
  }
}
