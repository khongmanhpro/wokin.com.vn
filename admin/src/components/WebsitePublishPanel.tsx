'use client'

import { useCallback, useEffect, useState } from 'react'

type Run = {
  id: string
  status: 'running' | 'success' | 'failed'
  startedAt: string
  finishedAt?: string
  actor: string
  releaseId?: string
  error?: string
  summary?: { products: number; categories: number }
  log?: string[]
}

type Status =
  | { enabled: false; reason: string }
  | { enabled: true; running: Run | null; history: Run[]; live: { releases: string[]; current: string | null }; siteUrl: string }

const statusLabel: Record<Run['status'], string> = { running: 'Đang chạy', success: 'Thành công', failed: 'Thất bại' }

function time(value?: string): string {
  return value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }) : '—'
}

function releaseLabel(id: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(id)
  return match ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6])).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : id
}

export function WebsitePublishPanel({ canPublish, canRollback }: { canPublish: boolean; canRollback: boolean }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [openLog, setOpenLog] = useState<{ id: string; text: string } | null>(null)

  const refresh = useCallback(async () => {
    const response = await fetch('/api/website-publish', { credentials: 'include', cache: 'no-store' })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error ?? 'Không tải được trạng thái xuất bản.')
    setStatus(body as Status)
    return body as Status
  }, [])

  useEffect(() => {
    refresh().catch((error: Error) => setMessage({ tone: 'error', text: error.message }))
  }, [refresh])

  const running = status?.enabled ? status.running : null
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      refresh().then((next) => {
        if (next.enabled && !next.running) {
          const last = next.history[0]
          setMessage(last?.status === 'success'
            ? { tone: 'success', text: `Đã xuất bản: website đang chạy bản mới (${last.summary?.products ?? '?'} sản phẩm).` }
            : { tone: 'error', text: last?.error ?? 'Xuất bản thất bại; website vẫn chạy bản cũ.' })
        }
      }).catch(() => undefined)
    }, 3000)
    return () => clearInterval(timer)
  }, [running, refresh])

  async function post(url: string, body?: unknown) {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Không thực hiện được.')
      return result
    } finally {
      setBusy(false)
      await refresh().catch(() => undefined)
    }
  }

  async function publish() {
    if (!window.confirm('Xuất bản website với dữ liệu đã xuất bản hiện tại? Quá trình mất vài phút, website cũ vẫn chạy trong lúc chờ.')) return
    await post('/api/website-publish').catch((error: Error) => setMessage({ tone: 'error', text: error.message }))
  }

  async function rollback(releaseId: string) {
    if (!window.confirm(`Quay website về bản ${releaseLabel(releaseId)}?`)) return
    await post('/api/website-publish/rollback', { releaseId })
      .then(() => setMessage({ tone: 'success', text: `Website đã quay về bản ${releaseLabel(releaseId)}.` }))
      .catch((error: Error) => setMessage({ tone: 'error', text: error.message }))
  }

  async function showLog(id: string) {
    const response = await fetch(`/api/website-publish/log/${encodeURIComponent(id)}`, { credentials: 'include' })
    const body = await response.json()
    setOpenLog({ id, text: response.ok ? body.log : body.error })
  }

  if (!status) return <p className="wokin-state" aria-live="polite">Đang tải trạng thái…</p>
  if (!status.enabled) return <div className="wokin-state wokin-state--error" role="alert"><h2>Chưa bật xuất bản website</h2><p>{status.reason}</p></div>

  return <div className="wokin-publish">
    {message && <p className={`wokin-state wokin-state--${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>{message.text}</p>}

    <section className="wokin-publish__card" aria-labelledby="publish-now">
      <h2 id="publish-now">Đưa thay đổi lên website</h2>
      <p>Sản phẩm, danh mục, hình ảnh ở trạng thái <strong>Đã xuất bản</strong>, cùng Thông tin website và Menu sẽ được đưa lên <a href={status.siteUrl} target="_blank" rel="noreferrer">{status.siteUrl}</a>. Thường mất vài phút; trong lúc đó website cũ vẫn chạy bình thường. Nếu có lỗi, website giữ nguyên bản cũ.</p>
      {canPublish
        ? <button type="button" className="wokin-button wokin-publish__primary" onClick={publish} disabled={busy || Boolean(running)}>{running ? 'Đang xuất bản…' : 'Xuất bản website'}</button>
        : <p className="wokin-state">Bạn chỉ có quyền xem.</p>}
    </section>

    {running && <section className="wokin-publish__card" aria-live="polite" aria-labelledby="publish-progress">
      <h2 id="publish-progress">Đang xuất bản (bắt đầu {time(running.startedAt)})</h2>
      <pre className="wokin-publish__log">{(running.log ?? []).join('\n')}</pre>
    </section>}

    <section className="wokin-publish__card" aria-labelledby="publish-live">
      <h2 id="publish-live">Các bản website</h2>
      {status.live.releases.length === 0
        ? <p>Chưa có bản nào được xuất bản từ admin.</p>
        : <ul className="wokin-publish__list">{status.live.releases.map((id) => <li key={id}>
          <span>{releaseLabel(id)}</span>
          {id === status.live.current
            ? <strong className="wokin-publish__badge">Đang chạy</strong>
            : canRollback && <button type="button" className="wokin-button wokin-button--secondary" onClick={() => rollback(id)} disabled={busy || Boolean(running)}>Quay về bản này</button>}
        </li>)}</ul>}
    </section>

    <section className="wokin-publish__card" aria-labelledby="publish-history">
      <h2 id="publish-history">Lịch sử xuất bản</h2>
      {status.history.length === 0 ? <p>Chưa có lượt xuất bản nào.</p> : <table className="wokin-publish__table">
        <thead><tr><th scope="col">Bắt đầu</th><th scope="col">Người thực hiện</th><th scope="col">Kết quả</th><th scope="col">Sản phẩm</th><th scope="col"><span className="sr-only">Nhật ký</span></th></tr></thead>
        <tbody>{status.history.map((run) => <tr key={run.id}>
          <td>{time(run.startedAt)}</td>
          <td>{run.actor}</td>
          <td>{statusLabel[run.status]}{run.error ? `: ${run.error}` : ''}</td>
          <td>{run.summary?.products ?? '—'}</td>
          <td><button type="button" className="wokin-button wokin-button--secondary" onClick={() => showLog(run.id)}>Xem nhật ký</button></td>
        </tr>)}</tbody>
      </table>}
      {openLog && <div className="wokin-publish__card">
        <h3>Nhật ký {openLog.id}</h3>
        <pre className="wokin-publish__log">{openLog.text}</pre>
        <button type="button" className="wokin-button wokin-button--secondary" onClick={() => setOpenLog(null)}>Đóng</button>
      </div>}
    </section>
  </div>
}
