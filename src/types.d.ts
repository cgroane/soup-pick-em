
export type GenericDataState<T> = {
  data?: T;
  dataState: DataState;
  error?: ErrorData;
  expiration?: number;
};

export type ErrorData = {
  code?: number;
  message?: string;
  type?: string;
  processCode?: string;
  data?: Record<string, string>;
};
