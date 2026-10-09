<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:000000,50:003a42,100:00f0ff&height=200&section=header&text=Mitra%20AI&fontSize=56&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=A%20multilingual%20voice%20assistant%20that%20answers%20out%20loud&descAlignY=58&descSize=18" width="100%" />

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Mistral AI](https://img.shields.io/badge/Mistral_AI-FA520F?style=for-the-badge&logoColor=white)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-000000?style=for-the-badge&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)

### [🚀 **Live Demo**](https://adarsh705875.github.io/mitra-ai-voice-assistant/)

</div>

---

## 📖 About

**Mitra** is a voice-enabled AI assistant that runs entirely in your browser. Tap the glowing orb and speak, or type a message. Mitra replies in text and reads the answer out loud, in the language you used.

## ✨ Features

- 🎙️ **Voice input** with the browser's Web Speech API
- 🌐 **Multilingual:** English (India, US, UK), Hindi, Marathi and Kannada
- 🧠 **Choose your AI:** Google Gemini (with a model picker) or Mistral AI as a fallback
- 🔁 **Auto model fallback:** if a Gemini model is unavailable, Mitra tries the next one
- 🔊 **Voice output:** ElevenLabs for a natural voice, or the browser's built-in voices
- 💬 **Conversation memory** for the last few messages
- 💡 **Animated orb** that glows while listening and pulses while speaking
- 🔐 **Bring your own keys.** Keys are stored only in your browser's localStorage
- ♿ Keyboard focus styles and reduced-motion support
- 🧯 Clear error messages for bad keys, rate limits, network and microphone problems

## 🔑 How to use

1. Open the **Live Demo**.
2. Open **Settings** and paste a **Gemini API key** from [Google AI Studio](https://aistudio.google.com). Or paste a **Mistral key** from [console.mistral.ai](https://console.mistral.ai).
3. Pick a **Gemini model** (leave it on **Auto** if unsure) and your **Speech language**.
4. *(Optional)* Add an **ElevenLabs key** for a more natural voice.
5. Click **Save keys**, then tap the orb and talk, or type and press Enter.

> 🔒 No API keys are stored in this repository or on any server. They stay in your browser.

## 🌐 Languages and voices

| What | How it works |
|---|---|
| You speak | Set **Speech language** in Settings so recognition matches your language |
| Mitra replies | The AI answers in the same language and script you used |
| Mitra speaks | Uses a voice installed on your device for that language |

If Mitra shows text but stays silent in Hindi, Marathi or Kannada, your device probably has no voice for that language. On Windows, go to **Settings → Time & language → Speech → Add voices**, then restart the browser. ElevenLabs language coverage differs from the browser voices, so try both if one sounds wrong.

## 🧰 Tech Stack

| Part | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (single file, no build step) |
| Chat models | Google Gemini API, Mistral AI |
| Text-to-speech | ElevenLabs, with browser speech synthesis as fallback |
| Speech-to-text | Web Speech API |
| Hosting | GitHub Pages |

## 🏃 Run locally

```bash
git clone https://github.com/Adarsh705875/mitra-ai-voice-assistant.git
cd mitra-ai-voice-assistant
python -m http.server 8000
```

Open `http://localhost:8000`. Use a local server rather than double-clicking the file, so the microphone permission works.

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| "Failed to fetch" / could not reach the AI service | Check your internet, turn off VPN or ad blockers, and open from `localhost` or GitHub Pages |
| Gemini 404 | That model isn't available for your key. Pick another under **Settings → Gemini model** |
| "Rejected the API key" | Re-paste the key and click **Save keys** |
| Mic does nothing | Use Chrome or Edge, allow the microphone in the address bar, and check your input device |
| Text appears but no voice | Install a voice for that language, or use English |

## ⚠️ Limitations

- Voice input works best in **Chrome and Edge**. Firefox does not support speech recognition, and Brave blocks it.
- Speech recognition sends audio to the browser vendor's servers, so it needs an internet connection.
- Calls go straight from your browser to Gemini, Mistral and ElevenLabs, so each user needs their own keys.
- Free API tiers have rate limits.
- Replies can sometimes be inaccurate.

## 🔮 Roadmap

- [ ] Backend proxy so keys never touch the browser
- [ ] Streaming replies
- [ ] Chat history panel
- [ ] Wake word ("Hey Mitra")
- [ ] More languages

## 👤 Author

**Adarsh Kadam**: Game Developer · AI/ML Engineer · Data Analyst

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/adarsh-kadam)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Adarsh705875)
[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:adarshkadam06@gmail.com)

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00f0ff,100:000000&height=100&section=footer" width="100%" />
</div>
