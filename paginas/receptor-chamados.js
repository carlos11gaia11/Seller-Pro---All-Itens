/*
  RECEPTOR DE CHAMADOS POR VOZ — SELLER PRO

  Uso antes do </body>:

  <script>
    window.CHAMADOS_CONFIG = {
      canal: "ares",
      mostrarBotaoAtivacao: true,
      tocarSinal: true
    };
  </script>
  <script src="./receptor-chamados.js"></script>

  Observação:
  - A autorização escolhida pelo usuário fica salva no localStorage deste navegador.
  - O receptor usa Realtime e também consulta a tabela periodicamente como contingência.
*/

(() => {
  "use strict";

  if (window.__SELLERPRO_VOICE_RECEIVER__) {
    console.info("Chamados por voz: receptor já inicializado nesta página.");
    return;
  }
  window.__SELLERPRO_VOICE_RECEIVER__ = true;

  const SUPABASE_URL = "https://owgvzmeewzpmzgcdwbfq.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vEZ-hnwOMl9Z1NJGrK5ktw_vT2-4HMr";
  const TABLE_NAME = "chamados_audio";
  const AUDIO_PERMISSION_KEY = "sellerpro_voice_enabled";
  const LEGACY_AUDIO_PERMISSION_KEYS = [
    "sellerpro_voice_enabled_v3",
    "sellerpro_voice_enabled_v2",
    "sellerpro_voice_enabled_v1"
  ];
  const POLLING_INTERVAL_MS = 4000;

  const config = {
    canal: "todos",
    mostrarBotaoAtivacao: true,
    tocarSinal: true,
    polling: true,
    ...window.CHAMADOS_CONFIG
  };

  if (!window.supabase?.createClient) {
    console.error("Chamados por voz: carregue @supabase/supabase-js antes de receptor-chamados.js.");
    return;
  }

  function resolveSupabaseClient() {
    try {
      // Reutiliza o cliente já criado pela página para preservar a mesma sessão.
      if (
        typeof supabaseClient !== "undefined" &&
        supabaseClient &&
        typeof supabaseClient.from === "function" &&
        typeof supabaseClient.channel === "function"
      ) {
        return supabaseClient;
      }
    } catch (error) {
      console.debug("Chamados por voz: cliente global não reutilizado.", error);
    }

    if (
      window.__SUPABASE_CLIENT__ &&
      typeof window.__SUPABASE_CLIENT__.from === "function" &&
      typeof window.__SUPABASE_CLIENT__.channel === "function"
    ) {
      return window.__SUPABASE_CLIENT__;
    }

    return window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }

  const client = resolveSupabaseClient();
  const queue = [];
  const seenIds = new Set();

  let processing = false;
  let voices = [];
  let audioContext = null;
  let subscription = null;
  let pollingTimer = null;
  let pollCursorIso = new Date(Date.now() - 5000).toISOString();
  let audioEnabled = readSavedAudioPermission();
  let interfaceReady = false;

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

  function readSavedAudioPermission() {
    try {
      if (window.localStorage.getItem(AUDIO_PERMISSION_KEY) === "1") return true;

      const legacyEnabled = LEGACY_AUDIO_PERMISSION_KEYS.some(
        key => window.localStorage.getItem(key) === "1"
      );

      if (legacyEnabled) {
        window.localStorage.setItem(AUDIO_PERMISSION_KEY, "1");
      }

      return legacyEnabled;
    } catch (error) {
      console.warn("Chamados por voz: não foi possível ler a preferência salva.", error);
      return false;
    }
  }

  async function persistBrowserStorage() {
    try {
      if (navigator.storage?.persist) {
        await navigator.storage.persist();
      }
    } catch (error) {
      console.debug("Chamados por voz: persistência adicional indisponível.", error);
    }
  }

  function saveAudioPermission(enabled) {
    try {
      window.localStorage.setItem(AUDIO_PERMISSION_KEY, enabled ? "1" : "0");
      LEGACY_AUDIO_PERMISSION_KEYS.forEach(key => {
        if (enabled) window.localStorage.setItem(key, "1");
        else window.localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn("Chamados por voz: não foi possível salvar a preferência.", error);
    }
  }

  function receives(row) {
    const destination = normalize(row?.destino);
    return destination === "todos" || destination === pageChannel;
  }

  function emitStatus(status, detail = {}) {
    console.info(`Chamados por voz [${pageChannel}]: ${status}`, detail);
    window.dispatchEvent(new CustomEvent("sellerpro:voice-status", {
      detail: { status, canal: pageChannel, ...detail }
    }));
  }

  function addStyles() {
    if (document.getElementById("sp-voice-styles")) return;

    const style = document.createElement("style");
    style.id = "sp-voice-styles";
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

      #sp-voice-enable.is-error {
        color: #ffd0d0;
        border: 1px solid rgba(255,77,77,.38);
        background: rgba(48,8,8,.96);
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
    if (interfaceReady) return;
    interfaceReady = true;

    addStyles();

    if (!document.getElementById("sp-voice-overlay")) {
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
    }

    if (config.mostrarBotaoAtivacao && !audioEnabled && !document.getElementById("sp-voice-enable")) {
      const button = document.createElement("button");
      button.id = "sp-voice-enable";
      button.type = "button";
      button.textContent = "🔊 Ativar chamados por voz";
      button.addEventListener("click", () => enableAudio({ announce: true }));
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

  async function prepareAudioContext() {
    if (!config.tocarSinal) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      audioContext = audioContext || new AudioContextClass();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
    } catch (error) {
      console.warn("Chamados por voz: sinal sonoro aguardando interação do usuário.", error);
    }
  }

  async function enableAudio({ announce = false } = {}) {
    audioEnabled = true;
    saveAudioPermission(true);
    await persistBrowserStorage();
    await prepareAudioContext();

    const button = document.getElementById("sp-voice-enable");
    if (button) {
      button.textContent = `✓ Voz ativa — canal ${pageChannel}`;
      button.classList.remove("is-error");
      button.classList.add("is-active");
      window.setTimeout(() => button.remove(), 1800);
    }

    if (announce) {
      await speakText("Chamados por voz ativados.", 1, 1);
    }

    processQueue();
  }

  function installSilentAudioUnlock() {
    if (!audioEnabled) return;

    const unlock = async () => {
      await prepareAudioContext();
      ["pointerdown", "keydown", "touchstart"].forEach(eventName => {
        document.removeEventListener(eventName, unlock, true);
      });
      processQueue();
    };

    ["pointerdown", "keydown", "touchstart"].forEach(eventName => {
      document.addEventListener(eventName, unlock, { capture: true, once: true });
    });

    // Tenta imediatamente; caso o navegador bloqueie, a primeira interação libera silenciosamente.
    prepareAudioContext();
  }

  function playChime() {
    if (!config.tocarSinal || !audioContext || audioContext.state !== "running") {
      return Promise.resolve();
    }

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
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        resolve();
      };

      function next() {
        const utterance = new SpeechSynthesisUtterance(String(text || ""));
        utterance.lang = selectedVoice?.lang || "pt-BR";
        utterance.rate = Number(rate || .95);
        utterance.pitch = .92;
        utterance.volume = 1;
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onend = () => {
          remaining -= 1;
          if (remaining > 0) window.setTimeout(next, 650);
          else finish();
        };

        utterance.onerror = event => {
          console.warn("Chamados por voz: falha na síntese de voz.", event);
          finish();
        };

        window.speechSynthesis.speak(utterance);
      }

      next();

      // Evita travamento da fila caso o navegador não dispare onend/onerror.
      const estimatedMs = Math.min(45000, Math.max(8000, String(text || "").length * 115 * remaining));
      window.setTimeout(finish, estimatedMs);
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
      const row = queue[0];
      showOverlay(row);

      if (!audioEnabled) {
        emitStatus("WAITING_AUDIO_PERMISSION", { id: row.id });
        processing = false;
        return;
      }

      await prepareAudioContext();

      // Quando o navegador restaurou a preferência, mas ainda exige a primeira
      // interação da sessão, preserva o chamado na fila em vez de consumi-lo sem som.
      if (config.tocarSinal && audioContext && audioContext.state !== "running") {
        emitStatus("WAITING_BROWSER_INTERACTION", { id: row.id });
        installSilentAudioUnlock();
        processing = false;
        return;
      }

      await playChime();

      const spoken = row.prioridade === "urgente"
        ? `Atenção. Chamado urgente. ${row.mensagem}`
        : row.mensagem;

      await speakText(spoken, row.repeticoes, row.velocidade);
      queue.shift();
      hideOverlay();
      await new Promise(resolve => window.setTimeout(resolve, 450));
    }

    processing = false;
  }

  function enqueue(row, source = "unknown") {
    if (!row || !row.id) return;
    if (seenIds.has(row.id)) return;

    seenIds.add(row.id);
    if (!receives(row)) return;

    queue.push(row);
    emitStatus("ANNOUNCEMENT_RECEIVED", { id: row.id, source, destino: row.destino });
    processQueue();
  }

  async function pollForAnnouncements() {
    const { data, error } = await client
      .from(TABLE_NAME)
      .select("id,mensagem,destino,prioridade,repeticoes,velocidade,created_at")
      .gt("created_at", pollCursorIso)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      emitStatus("POLLING_ERROR", { message: error.message });
      showConnectionError(error.message);
      return;
    }

    const rows = data || [];
    rows.forEach(row => enqueue(row, "polling"));

    if (rows.length) {
      pollCursorIso = rows[rows.length - 1].created_at;
    }
  }

  function showConnectionError(message) {
    if (!config.mostrarBotaoAtivacao || !interfaceReady) return;

    let button = document.getElementById("sp-voice-enable");
    if (!button) {
      button = document.createElement("button");
      button.id = "sp-voice-enable";
      button.type = "button";
      document.body.appendChild(button);
    }

    button.textContent = "⚠ Chamados sem conexão";
    button.title = message;
    button.classList.remove("is-active");
    button.classList.add("is-error");
  }

  function startPolling() {
    if (!config.polling || pollingTimer) return;
    pollForAnnouncements();
    pollingTimer = window.setInterval(pollForAnnouncements, POLLING_INTERVAL_MS);
  }

  function startRealtime() {
    subscription = client
      .channel(`chamados-voz-${pageChannel}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: TABLE_NAME },
        payload => enqueue(payload.new, "realtime")
      )
      .subscribe(status => {
        emitStatus(status);

        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          startPolling();
        }
      });
  }

  function init() {
    addInterface();
    loadVoices();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    if (audioEnabled) {
      installSilentAudioUnlock();
      emitStatus("AUDIO_PERMISSION_RESTORED");
    }

    startRealtime();
    startPolling();

    window.addEventListener("beforeunload", () => {
      if (pollingTimer) window.clearInterval(pollingTimer);
      if (subscription) client.removeChannel(subscription);
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
