export type RealtimeEventEnvelope<T = unknown> = {
  type: string;
  room: string;
  seq: number;
  ts: string;
  payload: T;
};

export type JoinV1Request = {
  room: string;
  cursor?: number | null;
};

export type JoinV1Ack = {
  ok: boolean;
  room: string;
  cursor?: number | null;
};

export type ReplayV1Request = {
  room: string;
  fromSeq?: number | null;
};

export type ReplayV1Ack<T = unknown> = {
  ok: boolean;
  room: string;
  items: Array<RealtimeEventEnvelope<T>>;
};
