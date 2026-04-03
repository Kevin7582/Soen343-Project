function notifyObserver(observer, event) {
  if (typeof observer === 'function') {
    observer(event);
    return;
  }

  observer?.update?.(event);
}

function notifyObserverStatus(observer, status) {
  observer?.onSubjectStatusChange?.(status);
}

function buildRealtimeEvent(payload, table) {
  const record =
    payload?.new && Object.keys(payload.new).length > 0
      ? payload.new
      : payload?.old || {};
  const recordId = record?.id ?? null;

  return {
    eventType: payload?.eventType || 'UNKNOWN',
    table,
    record,
    recordId: recordId == null ? null : String(recordId),
    timestamp: new Date().toISOString(),
    raw: payload,
  };
}

export default class SupabaseRealtimeSubject {
  constructor({ supabaseClient, channelName, schema = 'public', tables = [] }) {
    if (!supabaseClient) {
      throw new Error('SupabaseRealtimeSubject requires a Supabase client.');
    }

    this.supabaseClient = supabaseClient;
    this.channelName = channelName;
    this.schema = schema;
    this.tables = Array.from(new Set(tables));
    this.observers = new Set();
    this.channel = null;
    this.connectionStatus = 'IDLE';
  }

  subscribe(observer) {
    if (!observer) return;

    this.observers.add(observer);
    notifyObserverStatus(observer, this.connectionStatus);
  }

  unsubscribe(observer) {
    if (!observer) return;

    this.observers.delete(observer);
  }

  notify(event) {
    this.observers.forEach((observer) => {
      notifyObserver(observer, event);
    });
  }

  notifyStatus(status) {
    this.connectionStatus = status;
    this.observers.forEach((observer) => {
      notifyObserverStatus(observer, status);
    });
  }

  connect() {
    if (this.channel) {
      return this.channel;
    }

    const channel = this.supabaseClient.channel(this.channelName);

    this.tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: this.schema, table },
        (payload) => {
          this.notify(buildRealtimeEvent(payload, table));
        }
      );
    });

    this.channel = channel;
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        this.channel = null;
      }

      this.notifyStatus(status);
    });

    return channel;
  }

  disconnect() {
    if (this.channel) {
      const activeChannel = this.channel;
      this.channel = null;
      this.supabaseClient.removeChannel(activeChannel);
    }

    this.notifyStatus('CLOSED');
  }

  get observerCount() {
    return this.observers.size;
  }
}
