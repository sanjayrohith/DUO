# DUO Brain Server

The "brain" is a Python FastAPI service that wraps a locally served LLM. This
document covers the model server underneath it: installing Ollama, exposing it
on the LAN so the phone can reach it, and verifying it works.

DUO's phone app never talks to Ollama directly — it talks to the FastAPI brain,
which talks to Ollama. But everything downstream depends on Ollama being
reachable and serving the right models, so set that up first.

---

## 1. Install Ollama

Ollama serves local models and exposes an OpenAI-compatible API at
`/v1/chat/completions`, which is what the brain streams from.

### macOS

Download the app from <https://ollama.com/download> and drag it to
`/Applications`, or use Homebrew:

```bash
brew install ollama
```

The macOS app starts the server automatically on login. If you installed via
Homebrew, start it yourself with `ollama serve` (see section 2 for the LAN
environment variable).

### Linux (x86_64 or arm64)

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

The install script drops the binary at `/usr/local/bin/ollama` and, on systems
with systemd, installs and enables an `ollama.service` unit running as the
`ollama` user. Check it:

```bash
systemctl status ollama
```

If your distribution does not use systemd (or the script skipped the unit), run
the server manually with `ollama serve`.

### Raspberry Pi OS (64-bit, arm64)

Raspberry Pi OS 64-bit is a Debian arm64 system, so the same install script
works — it detects arm64 and pulls the correct build:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Requirements and caveats:

- **Use the 64-bit OS.** Ollama has no 32-bit arm build. Confirm with
  `uname -m`, which must print `aarch64`.
- **Raspberry Pi 5 with 8GB is the realistic target** for a 3B model. A 4GB Pi
  should stick to 1B models. See section 5 for measured expectations.
- There is no GPU acceleration on the Pi; inference is CPU-only. Active cooling
  is recommended, as sustained generation will thermally throttle a bare board.

### Pull the models

DUO needs a chat model and an embedding model. Pull all three so you can switch
between the quality model and the low-latency fallback without a download:

```bash
ollama pull llama3.2:3b        # default chat model (DUO_MODEL)
ollama pull llama3.2:1b        # low-latency fallback for slow hardware
ollama pull nomic-embed-text   # 768-dim embeddings for semantic memory
```

`nomic-embed-text` produces 768-dimension vectors, which is what the
`memories_vec` table in `duo_server/memory/db.py` is sized for. Changing the
embedding model means changing that dimension.

Confirm what is installed:

```bash
ollama list
```

---

## 2. Expose Ollama on the LAN

By default Ollama binds to `127.0.0.1:11434`, which the phone cannot reach. Set
`OLLAMA_HOST=0.0.0.0` so it listens on every interface. The API is then at
`http://<server-ip>:11434`.

> Binding to `0.0.0.0` exposes the model server to everything on your network.
> That is intended here — the phone and the ESP32 are on the same LAN — but do
> not do it on an untrusted network, and do not port-forward it to the internet.

### Linux and Raspberry Pi OS (systemd)

Environment variables belong in a systemd drop-in override, not in your shell —
the service runs as the `ollama` user and will not inherit your shell
environment.

```bash
sudo systemctl edit ollama.service
```

Add:

```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

Verify it is listening on all interfaces rather than loopback:

```bash
ss -ltnp | grep 11434
# LISTEN 0 4096 *:11434 *:*  users:(("ollama",...))
```

A `127.0.0.1:11434` in that output means the override did not take effect.

If you are running Ollama manually (no systemd unit):

```bash
OLLAMA_HOST=0.0.0.0 ollama serve
```

### macOS

Set the variable before starting the server. For a Homebrew/manual run:

```bash
export OLLAMA_HOST=0.0.0.0
ollama serve
```

For the menu-bar app, set it for the login session and restart the app:

```bash
launchctl setenv OLLAMA_HOST 0.0.0.0
```

### Find your server IP

```bash
# Linux / Raspberry Pi
ip -4 addr show scope global | grep -oP 'inet \K[\d.]+'

# macOS
ipconfig getifaddr en0
```

Use that address everywhere `<server-ip>` appears below and in `.env`
(`OLLAMA_BASE_URL=http://<server-ip>:11434/v1`). Never hardcode it in source —
it is a config value, and it changes when DHCP reassigns it. Consider a DHCP
reservation on your router so the demo IP stays stable.

### Firewall

If the host runs a firewall, allow the port:

```bash
sudo ufw allow 11434/tcp                       # Debian / Raspberry Pi OS
sudo firewall-cmd --add-port=11434/tcp --permanent && sudo firewall-cmd --reload
```

macOS will prompt to allow incoming connections the first time.

---

## 3. Verify from a second device

This is the check that matters: the phone is a different device on the same
Wi-Fi, so verify from one, not from the server's own shell. `localhost` working
on the server proves nothing about LAN reachability.

From a laptop or phone on the same Wi-Fi:

```bash
curl http://<server-ip>:11434/api/tags
```

The response lists every pulled model. All three should appear.

### Recorded verification (2026-08-11, dev laptop)

Working server IP on the dev network: **`10.10.253.55`** — so the API base is
`http://10.10.253.55:11434` and `.env` carries
`OLLAMA_BASE_URL=http://10.10.253.55:11434/v1`. Yours will differ; this is an
example, not a value to copy into source.

```console
$ ss -ltnp | grep 11434
LISTEN 0  4096  *:11434  *:*  users:(("ollama",pid=59747,fd=3))

$ curl -s http://10.10.253.55:11434/api/tags
{
  "models": [
    {
      "name": "llama3.2:1b",
      "model": "llama3.2:1b",
      "size": 1321098329,
      "details": { "family": "llama", "parameter_size": "1.2B",
                   "quantization_level": "Q8_0" }
    }
  ]
}
```

**Two gaps in this run, recorded honestly rather than glossed over:**

1. **Only `llama3.2:1b` is pulled.** The dev laptop ran out of disk (0 bytes
   free on a 157G root) partway through `ollama pull nomic-embed-text`, so
   `nomic-embed-text` and `llama3.2:3b` are not installed. Free roughly 4GB and
   re-run the three `ollama pull` commands from section 1. Phase 4's semantic
   memory cannot work until `nomic-embed-text` is present.
2. **The request was issued from the server host itself, addressed to its LAN
   IP.** That proves Ollama is bound to the LAN interface and answering on it —
   the loopback-only failure mode is ruled out. It does *not* prove the access
   point forwards traffic between clients. Re-run this exact curl from the phone
   or a second laptop before the demo; AP client isolation would break it in a
   way this test cannot see.

If this hangs or refuses the connection:

- `OLLAMA_HOST` is still `127.0.0.1` — re-check the `ss -ltnp` output above.
- A firewall is blocking 11434.
- The two devices are on different networks — a "guest" Wi-Fi SSID, or one
  device on 5GHz band isolation. Client isolation on the AP will block this
  silently; test on a normal home network.

---

## 4. Verify streaming chat completions

The brain streams from Ollama's OpenAI-compatible endpoint, so verify that path
specifically, not just `/api/tags`. `curl -N` disables output buffering so you
see chunks arrive as they are generated.

```bash
curl -N http://<server-ip>:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b",
    "stream": true,
    "messages": [{"role": "user", "content": "Say hello in five words."}]
  }'
```

Expect a sequence of `data: {...}` server-sent-event lines, each carrying one
token in `choices[0].delta.content`, terminated by `data: [DONE]`.

### Recorded verification (2026-08-11, dev laptop)

Run with `llama3.2:1b`, since `llama3.2:3b` is not yet pulled on this machine
(see the note in section 3). The endpoint and response shape are identical
across models — only the `model` field changes.

```console
$ curl -sN http://10.10.253.55:11434/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{"model":"llama3.2:1b","stream":true,
         "messages":[{"role":"user","content":"Say hello in five words."}]}'

data: {"id":"chatcmpl-616","object":"chat.completion.chunk","model":"llama3.2:1b",
       "choices":[{"index":0,"delta":{"role":"assistant","content":"Hi"},"finish_reason":null}]}

data: {... "delta":{"role":"assistant","content":","} ...}
data: {... "delta":{"role":"assistant","content":" I"} ...}
data: {... "delta":{"role":"assistant","content":"'m"} ...}
data: {... "delta":{"role":"assistant","content":" happy"} ...}
data: {... "delta":{"role":"assistant","content":" to"} ...}
data: {... "delta":{"role":"assistant","content":" help"} ...}
data: {... "delta":{"role":"assistant","content":"."} ...}

data: {... "delta":{"role":"assistant","content":""},"finish_reason":"stop"}

data: [DONE]
```

Tokens streamed one per event, terminated by `finish_reason: "stop"` and
`data: [DONE]`. Confirmed working.

Re-run this against `llama3.2:3b` once it is pulled, before relying on the 3B
model for the demo.

This confirms the exact contract `duo_server/llm/ollama_client.py` depends on in
Phase 2: an OpenAI-shaped SSE stream of text deltas.

---

## 5. Hardware expectations

Generation speed decides whether DUO feels like a companion or a lag. Know what
your demo hardware does before you blame the code.

| Device | Model | Approx. tokens/sec |
| --- | --- | --- |
| Raspberry Pi 5 (8GB) | `llama3.2:3b` | ~5 |
| Raspberry Pi 5 (8GB) | `deepseek-r1:1.5b` | ~7–9 |
| Raspberry Pi 5 (8GB) | `llama3.2:1b` | ~8 |
| Raspberry Pi 5 (8GB) | `gemma3:1b` | ~18–22 |
| Raspberry Pi 5 (8GB) | `mistral:7b` | ~2 |
| Laptop with a discrete GPU | `llama3.2:3b` | far faster; not a bottleneck |

These are community-reported figures for CPU-only inference on a Pi 5, not
measurements from this repo. Treat them as an order of magnitude.

One figure *is* measured here: on the dev laptop (2026-08-11, no GPU offload),
`llama3.2:1b` at Q8_0 generated **10.8 tokens/sec** over a 111-token reply. That
is in the same range as the Pi 5 numbers above, which is a useful reminder — a
laptop without a working GPU offload is not automatically faster than a Pi.
Check `ollama ps` to see whether a model loaded to GPU or CPU.

**If latency feels slow on the demo device, switch `DUO_MODEL` to a 1B model:**

```bash
# in .env
DUO_MODEL=llama3.2:1b
# or, for the fastest option on a Pi:
DUO_MODEL=gemma3:1b        # requires: ollama pull gemma3:1b
```

The model name is a config value and is never hardcoded in source, so this is a
one-line change plus a brain restart. Nothing else moves.

Two related levers, both used from Phase 3 onward:

- **DUO's replies are short by construction** (1–3 sentences, enforced by the
  persona prompt and a max-token cap). At 5 tokens/sec, a 30-token reply is
  about six seconds — acceptable; a paragraph is not.
- **Latency-sensitive reactions are templated, not generated** (Phase 5).
  "Nice!" and "One more?" never wait on the model.

A first request after idle also pays a model load cost of several seconds while
weights are read into RAM. Send a throwaway prompt to warm the model before a
demo.
