const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const WIDTH = 72;

function pretty(val) {
  const str = typeof val === 'string' ? val : JSON.stringify(val);
  try { return JSON.stringify(JSON.parse(str), null, 2); }
  catch { return str; }
}

function indentAfterFirst(str, spaces) {
  const pad = ' '.repeat(spaces);
  return str.split('\n').map((l, i) => (i === 0 ? l : pad + l)).join('\n');
}

function formatMessage(msg) {
  const lines = [];

  if (msg.role === 'assistant' && msg.tool_calls?.length) {
    lines.push(`[assistant]`);
    for (const tc of msg.tool_calls) {
      lines.push(`  call: ${tc.function.name}(${tc.function.arguments})`);
    }
  } else if (msg.role === 'tool') {
    lines.push(`[tool]`);
    lines.push(`  ${indentAfterFirst(pretty(msg.content), 2)}`);
  } else {
    lines.push(`[${msg.role}]`);
    lines.push(`  ${indentAfterFirst(String(msg.content ?? ''), 2)}`);
  }

  return lines.join('\n');
}

class LlmLogger {
  constructor(waId) {
    this.buf = [];
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    this._line('═'.repeat(WIDTH));
    this._line(`${ts}  ·  ${waId}`);
    this._line('═'.repeat(WIDTH));
  }

  userMessage(text) {
    this._line(`IN  » ${text}`);
  }

  iteration(n, sentMessages, choice, calls) {
    this._line(`\n── turn ${n} ${'─'.repeat(WIDTH - 9 - String(n).length)}`);

    this._line('MESSAGES SENT:');
    for (const msg of sentMessages) {
      this._line('');
      for (const line of formatMessage(msg).split('\n')) {
        this._line(`  ${line}`);
      }
    }

    this._line('\nRESPONSE:');
    if (choice.finish_reason === 'tool_calls') {
      for (const { name, args, result } of calls) {
        this._line(`  call: ${name}(${JSON.stringify(args)})`);
        this._line(`  resp: ${indentAfterFirst(pretty(result), 8)}`);
      }
    } else {
      this._line(`  stop: ${indentAfterFirst(pretty(choice.message.content), 8)}`);
    }
  }

  finalReply(text) {
    this._line(`\nOUT  » ${text}`);
  }

  flush() {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    fs.appendFileSync(path.join(LOG_DIR, `llm-${date}.log`), this.buf.join('\n') + '\n');
  }

  _line(str) { this.buf.push(str); }
}

module.exports = LlmLogger;
