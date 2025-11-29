# Available AI Models & Configuration

## Configured Providers (Keys Detected)

- **Anthropic** (`ANTHROPIC_API_KEY`)
- **Azure OpenAI** (`AZURE_OPENAI_API_KEY`)
- **Context7** (`CONTEXT7_API_KEY`)
- **Gemini** (`GEMINI_API_KEY`)
- **GitHub** (`GITHUB_API_KEY`, `GITHUB_TOKEN`)
- **Google** (`GOOGLE_API_KEY`)
- **Groq** (`GROQ_API_KEY`)
- **Jules** (`JULES_API_KEY`)
- **Mistral** (`MISTRAL_API_KEY`)
- **Ollama** (`OLLAMA_API_KEY`)
- **OpenAI** (`OPENAI_API_KEY`)
- **OpenRouter** (`OPENROUTER_API_KEY`)
- **Perplexity** (`PERPLEXITY_API_KEY`)
- **Tavily** (`TAVILY_API_KEY`)
- **X.AI** (`XAI_API_KEY`)

## Available Models

### Google Gemini ✅

**Models**: `gemini-2.5-pro`, `gemini-3-pro-preview`, `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`

### OpenAI ✅

**Models**: `gpt-5-pro`, `gpt-5.1`, `gpt-5.1-codex`, `gpt-5-codex`, `gpt-5`, `gpt-5.1-codex-mini`, `gpt-5-mini`, `o3-pro`, `o3`, `gpt-5-nano`, `gpt-4.1`, `o3-mini`, `o4-mini`

### X.AI (Grok) ✅

**Models**: `grok-4`, `grok-3`, `grok-3-fast`

### OpenRouter ✅

**Access to**: Anthropic, Deepseek, Google, Meta-Llama, Mistralai, OpenAI, Perplexity, X-Ai

---

_Note: Claude functionality via `clink` previously failed due to an invalid API key error, despite `ANTHROPIC_API_KEY` being present. Please verify the key's validity._
