# Free Local AI Coding Assistant Setup (Claude Code + OpenRouter)

This guide documents how to configure **Claude Code** to run completely free using **OpenRouter** (`poolside/laguna-s-2.1:free`) through a local **LiteLLM proxy**. 

---

## Architecture Overview

```
┌─────────────────┐       Anthropic Protocol       ┌─────────────────────┐       OpenAI Protocol       ┌─────────────────────────┐
│                 │  (http://localhost:4000)       │                     │  (https://openrouter.ai)    │                         │
│   Claude Code   │ ────────────────────────────>  │    LiteLLM Proxy    │ ──────────────────────────> │   OpenRouter API Host   │
│      (CLI)      │                                │  (Background Port)  │                             │ (poolside/laguna-m.1)   │
└─────────────────┘                                └─────────────────────┘                             └─────────────────────────┘
```

1. **Claude Code CLI:** Acts as the local agent interface (reading files, executing npm commands, generating React code).
2. **LiteLLM Proxy:** Runs as a background service on `http://localhost:4000`. It translates Claude Code's Anthropic Messages format into OpenRouter's format.
3. **OpenRouter (Laguna Model):** Cloud host providing free access to coding-specialized LLMs.

---

## 📋 Prerequisites

* **Node.js & npm** (for running React and installing `@anthropic-ai/claude-code`)
* **Python 3.10+** (with `pip`)
* **OpenRouter Account & API Key** (Free tier from [openrouter.ai](https://openrouter.ai))

---

## 🚀 One-Time Installation & Setup

### 1. Install Dependencies

Install Claude Code globally and LiteLLM with proxy support:

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Install LiteLLM Proxy via Python
python3 -m pip install 'litellm[proxy]'
```

### 2. Create Global LiteLLM Configuration

Create a central configuration directory and `config.yaml` file so the setup works across any directory:

```bash
mkdir -p ~/.config/litellm

cat << 'EOF' > ~/.config/litellm/config.yaml
model_list:
  - model_name: poolside-laguna
    litellm_params:
      model: openrouter/poolside/laguna-s-2.1:free
      api_key: os.environ/OPENROUTER_API_KEY
EOF
```

### 3. Add Auto-Launcher Function to Shell (`~/.zshrc`)

Append the following custom function to your `~/.zshrc` file. This function automatically manages starting the LiteLLM background process, setting environment variables, and invoking Claude Code:

```bash
cat << 'EOF' >> ~/.zshrc

# Claude Code + OpenRouter Laguna Auto-Launcher
function claude-free() {
    # 1. Credentials and Proxy Endpoints
    export OPENROUTER_API_KEY="YOUR_OPENROUTER_API_KEY_HERE"
    export LITELLM_MASTER_KEY="sk-litellm-proxy"
    export ANTHROPIC_BASE_URL="http://localhost:4000"
    export ANTHROPIC_AUTH_TOKEN="sk-litellm-proxy"
    export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"

    # 2. Check if LiteLLM is running on port 4000; launch background server if not
    if ! lsof -i :4000 > /dev/null 2>&1; then
        echo "🚀 Starting background LiteLLM proxy server..."
        /Library/Frameworks/Python.framework/Versions/3.14/bin/litellm \
            --config ~/.config/litellm/config.yaml \
            --port 4000 > /tmp/litellm.log 2>&1 &
        sleep 2
    fi

    # 3. Launch Claude Code with custom model alias
    claude --model poolside-laguna "$@"
}
EOF
```

> **Note:** Replace `YOUR_OPENROUTER_API_KEY_HERE` with your actual OpenRouter API key (`sk-or-v1-...`).

### 4. Reload Shell Configuration

Reload your terminal environment or open a new terminal tab:

```bash
source ~/.zshrc
```

---

## 💻 Daily Usage Workflow

To start working on your React project with your free AI coding assistant:

1. Open terminal and navigate to your project directory:
   ```bash
   cd ~/path/to/react-capstone
   ```
2. Launch the helper command:
   ```bash
   claude-free
   ```

The script will automatically start the proxy server in the background (if it isn't already running) and open the interactive Claude Code prompt.

---

## 🔍 Troubleshooting & Maintenance

* **Check LiteLLM Proxy Logs:**
  If requests fail or time out, view background logs:
  ```bash
  cat /tmp/litellm.log
  ```
* **Verify Proxy Status:**
  Check if LiteLLM is active on port 4000:
  ```bash
  lsof -i :4000
  ```
* **Kill Background Proxy:**
  If you need to restart the proxy server manually:
  ```bash
  kill $(lsof -t -i:4000)
  ```
* **Switching Free Models:**
  If `poolside/laguna-m.1:free` experiences heavy traffic or capacity limits, update `~/.config/litellm/config.yaml` to use an alternative free tier model, such as `openrouter/poolside/laguna-s-2.1:free` or `openrouter/qwen/qwen-2.5-coder-32b-instruct:free`.