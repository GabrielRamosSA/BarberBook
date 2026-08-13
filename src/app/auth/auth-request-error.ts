import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

export function getAuthRequestErrorMessage(
  error: unknown,
  fallback: string,
  timeoutMessage: string,
): string {
  if (error instanceof TimeoutError || getErrorName(error) === 'TimeoutError') {
    return timeoutMessage;
  }

  if (error instanceof HttpErrorResponse) {
    const apiMessage = getMessage(error.error);
    if (apiMessage) {
      return apiMessage;
    }

    if (error.status === 0) {
      return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
    }

    if (error.status >= 500) {
      return 'O servidor encontrou um problema. Tente novamente em alguns instantes.';
    }
  }

  return getMessage(error) || fallback;
}

function getErrorName(error: unknown): string | undefined {
  return isRecord(error) && typeof error['name'] === 'string' ? error['name'] : undefined;
}

function getMessage(error: unknown): string | undefined {
  if (typeof error === 'string') {
    return error;
  }

  return isRecord(error) && typeof error['message'] === 'string' ? error['message'] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
