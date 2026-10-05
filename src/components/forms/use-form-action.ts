"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Like `<form action={…}>` + useActionState, but without React 19's automatic form reset —
 * a validation error must never wipe what the user typed. Forms reset themselves explicitly
 * on success where that makes sense.
 */
export function useFormAction<S extends object>(action: (prev: S, fd: FormData) => Promise<S>, initial: S) {
  const [state, dispatch, pending] = useActionState<S, FormData>(
    action as (prev: Awaited<S>, fd: FormData) => Promise<S>,
    initial as Awaited<S>,
  );
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(fd));
  }
  return { state: state as S, pending, onSubmit };
}
