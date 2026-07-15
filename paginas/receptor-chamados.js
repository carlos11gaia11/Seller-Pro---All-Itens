/*
  RECEPTOR DE CHAMADOS POR VOZ — SELLER PRO

  Antes deste arquivo, carregue:
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

  Defina o canal da página antes deste arquivo:
  <script>
    window.CHAMADOS_CONFIG = { canal: "painel_sellers" };
  </script>
*/

(() => {
  "use strict";

  const SUPABASE_URL = "https://owgvzmeewzpmzgcdwbfq.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vEZ-hnwOMl9Z1NJGrK5ktw_vT2-4HMr";
  const TABLE_NAME = "chamados_audio";

  const config = {
    canal: "todos",
    mostrarBotaoAtivacao: true,
    tocarSinal: true,
    ...window.CHAMADOS_CONFIG
  };

  if (!window.supabase?.createClient) {
    console.error("Chamados por voz: carregue @supabase/supabase-js antes de receptor-chamados.js.");
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const queue = [];
  let processing = false;
  let audioEnabled = false;
  let voices = [];
  let audioContext = null;

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  const pageChannel = normalize(config.canal) || "todos";

  function receives(row) {
    const destination = normalize(row?.destino);
    return destination === "todos" || destination === pageChannel;
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #sp-voice-enable {
        position: fixed;
        right: 22px;
        bottom: 22px;
        z-index: 2147483647;
        border: 0;
        border-radius: 999px;
        padding: 13px 17px;
        font: 800 13px/1.2 Inter, system-ui, sans-serif;
        color: #111;
        background: linear-gradient(135deg, #ff7a00, #ff9d2e);
        box-shadow: 0 16px 38px rgba(0,0,0,.32);
        cursor: pointer;
      }

      #sp-voice-enable.is-active {
        color: #b8ffc9;
        border: 1px solid rgba(48,209,88,.35);
        background: rgba(9,25,14,.95);
      }

      #sp-voice-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        display: grid;
        place-items: center;
        padding: 28px;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity .22s ease, visibility .22s ease;
        background: rgba(0,0,0,.38);
        backdrop-filter: blur(6px);
      }

      #sp-voice-overlay.is-visible {
        opacity: 1;
        visibility: visible;
      }

      .sp-voice-card {
        width: min(780px, 100%);
        padding: clamp(26px, 5vw, 48px);
        color: #fff;
        text-align: center;
        border: 1px solid rgba(255,122,0,.42);
        border-radius: 28px;
        background:
          radial-gradient(circle at 50% 0%, rgba(255,122,0,.24), transparent 38%),
          rgba(8,8,8,.96);
        box-shadow: 0 30px 100px rgba(0,0,0,.7), 0 0 60px rgba(255,122,0,.12);
        transform: translateY(14px) scale(.985);
        transition: transform .22s ease;
      }

      #sp-voice-overlay.is-visible .sp-voice-card {
        transform: translateY(0) scale(1);
      }

      .sp-voice-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 18px;
        color: #ffd1a1;
        font: 850 12px/1 Inter, system-ui, sans-serif;
        letter-spacing: .12em;
        text-transform: uppercase;
      }

      .sp-voice-label::before {
        content: "";
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #ff7a00;
        box-shadow: 0 0 18px rgba(255,122,0,.85);
      }

      .sp-voice-message {
        margin: 0;
        font: 850 clamp(28px, 5vw, 54px)/1.13 Inter, system-ui, sans-serif;
        letter-spacing: -.045em;
        overflow-wrap: anywhere;
      }

      .sp-voice-destination {
        margin-top: 18px;
        color: #aaa;
        font: 650 13px/1.4 Inter, system-ui, sans-serif;
      }

      #sp-voice-overlay.is-urgent .sp-voice-card {
        border-color: rgba(255,77,77,.58);
        box-shadow: 0 30px 100px rgba(0,0,0,.7), 0 0 70px rgba(255,77,77,.16);
      }

      #sp-voice-overlay.is-urgent .sp-voice-label {
        color: #ffc1c1;
      }

      #sp-voice-overlay.is-urgent .sp-voice-label::before {
        background: #ff4d4d;
        box-shadow: 0 0 18px rgba(255,77,77,.85);
      }

      @media (prefers-reduced-motion: reduce) {
        #sp-voice-overlay, .sp-voice-card { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function addInterface() {
    const overlay = document.createElement("div");
    overlay.id = "sp-voice-overlay";
    overlay.setAttribute("role", "alert");
    overlay.setAttribute("aria-live", "assertive");
    overlay.innerHTML = `
      <div class="sp-voice-card">
        <div class="sp-voice-label">Chamado Seller Pro</div>
        <p class="sp-voice-message" id="sp-voice-message"></p>
        <div class="sp-voice-destination" id="sp-voice-destination"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    if (config.mostrarBotaoAtivacao) {
      const button = document.createElement("button");
      button.id = "sp-voice-enable";
      button.type = "button";
      button.textContent = "🔊 Ativar chamados por voz";
      button.addEventListener("click", enableAudio);
      document.body.appendChild(button);
    }
  }

  function loadVoices() {
    if (!("speechSynthesis" in window)) return;
    voices = window.speechSynthesis.getVoices();
  }

  function preferredVoice() {
    return voices.find(voice => /google/i.test(voice.name) && /pt[-_]br/i.test(voice.lang))
      || voices.find(voice => /pt[-_]br/i.test(voice.lang))
      || voices.find(voice => String(voice.lang || "").toLowerCase().startsWith("pt"))
      || null;
  }

  async function enableAudio() {
    audioEnabled = true;

    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") await audioContext.resume();
    } catch (error) {
      console.warn("Chamados por voz: sinal sonoro indisponível.", error);
    }

    const button = document.getElementById("sp-voice-enable");
    if (button) {
      button.textContent = `✓ Voz ativa — canal ${pageChannel}`;
      button.classList.add("is-active");
      window.setTimeout(() => button.remove(), 1800);
    }

    speakText("Chamados por voz ativados.", 1, 1);
  }

  function playChime() {
    if (!config.tocarSinal || !audioContext) return Promise.resolve();

    return new Promise(resolve => {
      const now = audioContext.currentTime;
      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.17, now + .03);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .8);
      gain.connect(audioContext.destination);

      [659.25, 783.99].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start(now + index * .18);
        oscillator.stop(now + .72 + index * .18);
      });

      window.setTimeout(resolve, 950);
    });
  }

  function speakText(text, repetitions, rate) {
    if (!("speechSynthesis" in window)) return Promise.resolve();

    return new Promise(resolve => {
      const selectedVoice = preferredVoice();
      let remaining = Math.max(1, Number(repetitions || 1));

      function next() {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = selectedVoice?.lang || "pt-BR";
        utterance.rate = Number(rate || .95);
        utterance.pitch = .92;
        utterance.volume = 1;
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onend = () => {
          remaining -= 1;
          if (remaining > 0) window.setTimeout(next, 650);
          else resolve();
        };

        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      }

      next();
    });
  }

  function showOverlay(row) {
    const overlay = document.getElementById("sp-voice-overlay");
    const message = document.getElementById("sp-voice-message");
    const destination = document.getElementById("sp-voice-destination");
    if (!overlay || !message || !destination) return;

    message.textContent = row.mensagem;
    destination.textContent = `Canal: ${row.destino}`;
    overlay.classList.toggle("is-urgent", row.prioridade === "urgente");
    overlay.classList.add("is-visible");
  }

  function hideOverlay() {
    const overlay = document.getElementById("sp-voice-overlay");
    overlay?.classList.remove("is-visible", "is-urgent");
  }

  async function processQueue() {
    if (processing || !queue.length) return;
    processing = true;

    while (queue.length) {
      const row = queue.shift();
      showOverlay(row);

      if (audioEnabled) {
        await playChime();
        const spoken = row.prioridade === "urgente"
          ? `Atenção. Chamado urgente. ${row.mensagem}`
          : row.mensagem;
        await speakText(spoken, row.repeticoes, row.velocidade);
      } else {
        console.warn("Chamado recebido, mas a voz ainda não foi ativada nesta página:", row.mensagem);
        await new Promise(resolve => window.setTimeout(resolve, 5000));
      }

      hideOverlay();
      await new Promise(resolve => window.setTimeout(resolve, 450));
    }

    processing = false;
  }

  function enqueue(row) {
    if (!receives(row)) return;
    queue.push(row);
    processQueue();
  }

  addStyles();
  addInterface();
  loadVoices();

  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  client
    .channel(`chamados-voz-${pageChannel}-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE_NAME },
      payload => enqueue(payload.new)
    )
    .subscribe(status => {
      console.info(`Chamados por voz [${pageChannel}]:`, status);
    });
})();
