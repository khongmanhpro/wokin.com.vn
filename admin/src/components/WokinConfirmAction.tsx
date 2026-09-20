'use client'

import { useEffect, useId, useRef, useState } from 'react'

export function WokinConfirmAction({ confirmLabel, disabled = false, label, message, onConfirm, title }: {
  confirmLabel: string
  disabled?: boolean
  label: string
  message: string
  onConfirm: () => Promise<void> | void
  title: string
}) {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const dialogId = useId()
  const titleId = `${dialogId}-title`
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])
  async function confirm() {
    await onConfirm()
    setOpen(false)
  }
  return <>
    <button aria-controls={dialogId} aria-haspopup="dialog" disabled={disabled} onClick={() => setOpen(true)} type="button">{label}</button>
    <dialog aria-labelledby={titleId} aria-modal="true" className="wokin-confirm-action" id={dialogId} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} ref={dialog}>
      <h2 id={titleId}>{title}</h2>
      <p>{message}</p>
      <div className="wokin-confirm-action__actions">
        <button onClick={() => setOpen(false)} type="button">Hủy</button>
        <button disabled={disabled} onClick={() => void confirm()} type="button">{confirmLabel}</button>
      </div>
    </dialog>
  </>
}
