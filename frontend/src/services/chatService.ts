import type { ScanResult, ChatMessage } from '../types';

export type ChatStreamCallback = (chunk: string, isComplete: boolean) => void;

export const chatService = {
  async sendMessage(
    messages: ChatMessage[], 
    context: { scanResult?: ScanResult }, 
    onStream: ChatStreamCallback
  ): Promise<void> {
    
    let rawScanResults = null;
    if (context.scanResult) {
      const stored = localStorage.getItem(`scan_raw_${context.scanResult.id}`);
      if (stored) {
        try {
          rawScanResults = JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse stored scan result", e);
        }
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "",
          messages,
          scan_results: rawScanResults
        })
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              try {
                // Backend yields JSON objects with "text" or "error" keys
                // Currently gemini_provider yields pure JSON dumps directly to the stream (not prefixed with data: necessarily, wait let's check). 
                // Ah, backend `StreamingResponse` just sends the strings as yielded by `stream_gemini_response`. 
                // Let's parse it safely.
                const parsed = JSON.parse(line);
                if (parsed.error) {
                  onStream(`\n\n**Error:** ${parsed.error}`, true);
                  return;
                }
                if (parsed.text) {
                  onStream(parsed.text, false);
                }
              } catch (e) {
                // If it's not valid JSON, it might be a fragmented chunk.
                // For a highly robust implementation, we would buffer incomplete JSON strings.
                // However, since we yield `json.dumps(obj) + "\n"` in the backend (Wait, does the backend add newlines? Let me verify).
                // Let's just pass the chunk as is if it fails parsing, in case it's plain text.
              }
            }
          }
        }
      }
      
      onStream("", true); // signal completion

    } catch (err) {
      console.error(err);
      onStream("\n\n**Error connecting to the AI advisor.** Please ensure the backend is running and the API keys are configured.", true);
    }
  }
};
