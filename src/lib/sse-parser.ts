/**
 * Robust Server-Sent Events (SSE) parser with proper event buffering and boundary detection
 * Handles cases where TCP buffers split events across multiple reads
 */

export interface SSEEvent {
  type: string;
  data: any;
  id?: string;
  retry?: number;
}

export interface SSEParserOptions {
  onEvent: (event: SSEEvent) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  debug?: boolean;
}

export class SSEParser {
  private buffer = '';
  private options: SSEParserOptions;
  private heartbeatTimer?: NodeJS.Timeout;
  private lastEventTime = Date.now();

  constructor(options: SSEParserOptions) {
    this.options = options;

    if (options.enableHeartbeat) {
      this.startHeartbeatMonitoring();
    }
  }

  /**
   * Parse incoming chunk of data, handling partial events and buffering
   */
  public parseChunk(chunk: string): void {
    this.lastEventTime = Date.now();

    // Add chunk to buffer
    this.buffer += chunk;

    // Process complete events from buffer
    this.processBuffer();
  }

  /**
   * Process buffered data to extract complete SSE events
   */
  private processBuffer(): void {
    const lines = this.buffer.split('\n');

    // Keep the last line in buffer if it doesn't end with \n (incomplete)
    if (!this.buffer.endsWith('\n')) {
      this.buffer = lines.pop() || '';
    } else {
      this.buffer = '';
    }

    let eventData: { [key: string]: string } = {};

    for (const line of lines) {
      try {
        if (line.trim() === '') {
          // Empty line signals end of event - dispatch it
          if (Object.keys(eventData).length > 0) {
            this.dispatchEvent(eventData);
            eventData = {};
          }
        } else if (line.startsWith('data: ')) {
          // Data field
          const data = line.substring(6);
          eventData.data = (eventData.data || '') + data + '\n';
        } else if (line.startsWith('event: ')) {
          // Event type field
          eventData.event = line.substring(7);
        } else if (line.startsWith('id: ')) {
          // Event ID field
          eventData.id = line.substring(4);
        } else if (line.startsWith('retry: ')) {
          // Retry field
          eventData.retry = line.substring(7);
        } else if (line.startsWith(': ')) {
          // Comment - ignore but log if debugging
          if (this.options.debug) {
            console.log('SSE Comment:', line.substring(2));
          }
        }
      } catch (error) {
        this.options.onError(new Error(`Failed to parse SSE line: ${line}. Error: ${error}`));
      }
    }
  }

  /**
   * Dispatch a complete SSE event
   */
  private dispatchEvent(eventData: { [key: string]: string }): void {
    try {
      let data = eventData.data;

      // Remove trailing newline from data if present
      if (data && data.endsWith('\n')) {
        data = data.slice(0, -1);
      }

      // Try to parse data as JSON
      let parsedData: any = data;
      if (data) {
        try {
          parsedData = JSON.parse(data);
        } catch {
          // Keep as string if not valid JSON
          parsedData = data;
        }
      }

      const event: SSEEvent = {
        type: eventData.event || 'message',
        data: parsedData,
        ...(eventData.id && { id: eventData.id }),
        ...(eventData.retry && { retry: parseInt(eventData.retry, 10) })
      };

      if (this.options.debug) {
        console.log('SSE Event dispatched:', event);
      }

      this.options.onEvent(event);
    } catch (error) {
      this.options.onError(new Error(`Failed to dispatch SSE event: ${error}`));
    }
  }

  /**
   * Start monitoring for connection health via heartbeats
   */
  private startHeartbeatMonitoring(): void {
    const interval = this.options.heartbeatInterval || 30000; // 30 seconds default

    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastEvent = Date.now() - this.lastEventTime;

      if (timeSinceLastEvent > interval * 2) {
        this.options.onError(new Error('SSE connection appears to be dead - no events received'));
      }
    }, interval);
  }

  /**
   * Complete the parsing and clean up resources
   */
  public complete(): void {
    // Process any remaining data in buffer
    if (this.buffer.trim()) {
      this.processBuffer();
    }

    // Clean up heartbeat timer
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.options.onComplete();
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.buffer = '';
  }
}

/**
 * Utility function to parse SSE stream with proper error handling
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  options: SSEParserOptions
): Promise<void> {
  const decoder = new TextDecoder();
  const parser = new SSEParser(options);

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value);
      parser.parseChunk(chunk);
    }
  } catch (error) {
    options.onError(error as Error);
  } finally {
    parser.complete();
  }
}