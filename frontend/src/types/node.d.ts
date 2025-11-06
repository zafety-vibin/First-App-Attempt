// Fix for "Cannot find namespace 'NodeJS'" errors
// Used in components with debounced timers (EditableCell, etc.)

declare global {
  namespace NodeJS {
    type Timeout = ReturnType<typeof setTimeout>;
    type Timer = ReturnType<typeof setInterval>;
  }
}

export {};
