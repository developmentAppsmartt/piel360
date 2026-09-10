export type AppNoticeButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type AppNoticeRequest = {
  title: string;
  message?: string;
  buttons: AppNoticeButton[];
};

type Listener = (notice: AppNoticeRequest | null) => void;

const listeners = new Set<Listener>();
const queue: AppNoticeRequest[] = [];
let current: AppNoticeRequest | null = null;

function emit() {
  listeners.forEach((listener) => listener(current));
}

export function subscribeAppNotice(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function showAppNotice(request: AppNoticeRequest) {
  if (current) {
    queue.push(request);
    return;
  }
  current = request;
  emit();
}

export function dismissAppNotice() {
  const active = current;
  current = queue.shift() ?? null;
  emit();
  return active;
}

export function presentAppAlert(
  title?: string,
  message?: string,
  buttons?: AppNoticeButton[],
) {
  const resolved =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: 'Entendido', style: 'default' as const }];
  showAppNotice({
    title: title?.trim() || 'Aviso',
    message: message?.trim() || undefined,
    buttons: resolved,
  });
}
