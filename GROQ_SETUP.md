# Groq API Setup

This app uses Groq's ultra-fast LLM inference for copyright detection and filtering.

## Get your Groq API Key

1. Go to https://console.groq.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key

## Add to Environment Variables

Add this line to your `.env.local` file:

```
GROQ_API_KEY=your_groq_api_key_here
```

## Why Groq?

- **Fastest inference** - 50-150ms response time
- **Free tier** - Generous limits for development
- **Llama 3.1 70B** - High quality copyright detection
- **Better than static lists** - Catches copyrighted content you haven't anticipated

## Models Available

We're using `llama-3.1-70b-versatile` which offers the best balance of:
- Speed (~100ms typical)
- Accuracy (excellent at identifying brands/characters)
- Cost (free tier available)

## Fallback Behavior

If the Groq API key is missing or the API fails:
- The app will return the original prompt unfiltered
- A warning will be logged to the console
- Image generation will still work normally
