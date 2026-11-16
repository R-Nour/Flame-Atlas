// Flame Atlas "Ask" box: a Framer code component.
//
// - Sends the visitor's question to the deployed Ask API (api/ask.js on Vercel).
// - Each visitor gets `dailyLimit` questions per day (default 10), counted in this browser
//   with localStorage. Storage can be blocked (private mode, strict settings), so every access
//   is wrapped in try/catch and a per-page-load counter takes over if it fails.
// - If the API is unreachable or fails, it shows the matching prepared answer from
//   data/cached_answers.json (loaded from jsDelivr).
// - After the daily limit it says so and offers the prepared answers instead.
//
// Paste this file into a Framer code component, then set "API URL" in the properties panel
// to https://flame-atlas.vercel.app/api/ask

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

const CACHED_URL = "https://cdn.jsdelivr.net/gh/R-Nour/Flame-Atlas@main/data/cached_answers.json"
const STORAGE_KEY = "flame-atlas-ask-v1"
const MAX_QUESTION_CHARS = 300

type Card = { id: string; name: string }
type Answer = { question?: string; answer: string; cited_cards?: Card[]; cached?: boolean }

// ---------- daily counter (exported so it can be tested) ----------

const memory = { day: "", count: 0 }

/** Local calendar day, e.g. "2026-11-15": the count resets at the visitor's midnight. */
export function dayKey(d: Date = new Date()): string {
    const p = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function readStored(day: string): number {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return 0
        const saved = JSON.parse(raw)
        return saved && saved.day === day && Number.isFinite(saved.count) ? Math.max(0, saved.count) : 0
    } catch (e) {
        return 0 // storage blocked, empty or corrupted
    }
}

export function getQuestionsUsed(day: string = dayKey()): number {
    const stored = readStored(day)
    return memory.day === day ? Math.max(stored, memory.count) : stored
}

export function recordQuestion(day: string = dayKey()): number {
    const next = getQuestionsUsed(day) + 1
    memory.day = day
    memory.count = next
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ day, count: next }))
    } catch (e) {
        // blocked: the in-memory count above still limits this page load
    }
    return next
}

// ---------- matching a typed question to a prepared answer ----------

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9% ]+/g, " ").replace(/\s+/g, " ").trim()
const wordSet = (s: string) => new Set(normalize(s).split(" ").filter((w) => w.length > 2))

export function findPrepared(question: string, list: Answer[]): Answer | null {
    const q = normalize(question)
    const qw = wordSet(question)
    let best: Answer | null = null
    let bestScore = 0
    for (const item of list) {
        if (!item.question) continue
        if (normalize(item.question) === q) return item
        const iw = wordSet(item.question)
        let overlap = 0
        qw.forEach((w) => {
            if (iw.has(w)) overlap++
        })
        const union = new Set([...Array.from(qw), ...Array.from(iw)]).size || 1
        const score = overlap / union
        if (score > bestScore) {
            best = item
            bestScore = score
        }
    }
    return bestScore >= 0.6 ? best : null
}

// ---------- style helpers ----------

type RGBA = { r: number; g: number; b: number; a: number }

/** Reads #rgb, #rrggbb, #rrggbbaa, rgb() and rgba(); returns null for anything else (named colours, tokens). */
function parseColor(c: string): RGBA | null {
    const s = String(c || "").trim().toLowerCase()
    if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 }
    let m = s.match(/^#([0-9a-f]{3,8})$/)
    if (m) {
        let h = m[1]
        if (h.length === 3 || h.length === 4) h = h.split("").map((x) => x + x).join("")
        if (h.length !== 6 && h.length !== 8) return null
        return {
            r: parseInt(h.slice(0, 2), 16),
            g: parseInt(h.slice(2, 4), 16),
            b: parseInt(h.slice(4, 6), 16),
            a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
        }
    }
    m = s.match(/^rgba?\(([^)]+)\)$/)
    if (m) {
        const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3 && p.every((n) => isFinite(n))) return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
    }
    return null
}

const isTransparent = (c: string) => {
    const p = parseColor(c)
    return !!p && p.a === 0
}

/** Text colour that reads on `bg`: the light colour on dark backgrounds, the dark one on light backgrounds. */
function readableOn(bg: string, light: string, dark: string): string {
    const p = parseColor(bg)
    if (!p) return light
    const lum = (0.299 * p.r + 0.587 * p.g + 0.114 * p.b) / 255
    return lum < 0.6 ? light : dark
}

/** Size multiplier when the Font control sets a size; 1 (today's look) otherwise. */
function fontScale(font: any, base: number): number {
    const n = font && font.fontSize != null ? parseFloat(String(font.fontSize)) : NaN
    return isFinite(n) && n > 0 ? n / base : 1
}

// ---------- component ----------

type Props = {
    apiUrl: string
    cachedUrl: string
    dailyLimit: number
    font?: Record<string, any>
    accentColor: string // the "Button color"
    buttonTextColor: string
    textColor: string
    mutedColor: string
    linkColor: string
    backgroundColor: string
    inputBackground: string
    answerBackground: string
    borderColor: string
    radius: number
    style?: React.CSSProperties
}

export default function AskBox(props: Props) {
    const {
        apiUrl, cachedUrl, dailyLimit, font, accentColor, buttonTextColor, textColor, mutedColor, linkColor,
        backgroundColor, inputBackground, answerBackground, borderColor, radius, style,
    } = props
    const scale = fontScale(font, 16)
    const fs = (px: number) => px * scale
    // Only when a font is chosen do the input and buttons take it; otherwise they keep today's browser font.
    const ctlFont: React.CSSProperties = font
        ? { fontFamily: "inherit", fontStyle: "inherit", letterSpacing: "inherit" }
        : {}
    const limit = Math.max(1, Math.round(dailyLimit || 10))

    const [question, setQuestion] = React.useState("")
    const [used, setUsed] = React.useState(0)
    const [loading, setLoading] = React.useState(false)
    const [result, setResult] = React.useState<Answer | null>(null)
    const [message, setMessage] = React.useState("")
    const [prepared, setPrepared] = React.useState<Answer[]>([])
    const [preparedLoaded, setPreparedLoaded] = React.useState(false)

    React.useEffect(() => {
        setUsed(getQuestionsUsed())
        let live = true
        fetch(cachedUrl || CACHED_URL)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
            .then((data) => {
                const list = Array.isArray(data) ? data : data && Array.isArray(data.answers) ? data.answers : []
                if (live) setPrepared(list.filter((x: Answer) => x && x.question && x.answer))
            })
            .catch(() => {})
            .then(() => live && setPreparedLoaded(true))
        return () => {
            live = false
        }
    }, [cachedUrl])

    const limitReached = used >= limit
    const left = Math.max(0, limit - used)

    async function ask() {
        const q = question.trim()
        if (!q || loading) return
        if (getQuestionsUsed() >= limit) {
            setUsed(getQuestionsUsed())
            return
        }
        setUsed(recordQuestion())
        setLoading(true)
        setResult(null)
        setMessage("")
        try {
            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: q }),
            })
            const body = await res.json().catch(() => null)
            if (res.ok && body && typeof body.answer === "string") {
                setResult(body)
            } else {
                showFallback(q, body && body.error)
            }
        } catch (e) {
            showFallback(q)
        } finally {
            setLoading(false)
        }
    }

    function showFallback(q: string, serverMessage?: string) {
        const hit = findPrepared(q, prepared)
        if (hit) {
            setResult({ ...hit, cached: true })
        } else {
            setMessage(serverMessage || "Sorry, the Ask box can't answer right now. Please try again in a minute.")
        }
    }

    function showPrepared(item: Answer) {
        setMessage("")
        setResult({ ...item, cached: true })
    }

    const box: React.CSSProperties = {
        boxSizing: "border-box",
        width: "100%",
        padding: 20,
        borderRadius: radius,
        background: backgroundColor,
        boxShadow: `inset 0 0 0 1px ${borderColor}`,
        color: textColor,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: fs(16),
        lineHeight: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...font,
        ...style,
    }
    const button: React.CSSProperties = {
        padding: "10px 16px",
        borderRadius: 8,
        ...ctlFont,
        border: "none",
        background: accentColor,
        color: buttonTextColor,
        fontSize: fs(16),
        cursor: "pointer",
    }
    const chip: React.CSSProperties = {
        textAlign: "left",
        padding: "8px 12px",
        borderRadius: 8,
        ...ctlFont,
        border: `1px solid ${accentColor}`,
        background: "transparent",
        color: textColor,
        fontSize: fs(14),
        cursor: "pointer",
    }

    const examples = prepared.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {prepared.map((item) => (
                <button
                    key={item.question}
                    type="button"
                    style={chip}
                    onClick={() => (limitReached ? showPrepared(item) : setQuestion(item.question || ""))}
                >
                    {item.question}
                </button>
            ))}
        </div>
    )

    return (
        <div style={box}>
            <label htmlFor="flame-atlas-question" style={{ fontWeight: 600 }}>
                Ask about the data
            </label>

            {limitReached ? (
                <div role="status" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <strong>You've reached today's {limit} questions</strong>
                    <span>Here are the prepared answers to the five questions we get most:</span>
                    {examples}
                    {preparedLoaded && prepared.length === 0 && (
                        <span>The prepared answers couldn't be loaded. Please come back tomorrow.</span>
                    )}
                </div>
            ) : (
                <>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input
                            id="flame-atlas-question"
                            value={question}
                            maxLength={MAX_QUESTION_CHARS}
                            placeholder="Does turning off the fans put out a fire in Moon Base air?"
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && ask()}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                padding: "10px 12px",
                                borderRadius: 8,
                                ...ctlFont,
                                border: "1px solid #999",
                                background: inputBackground,
                                fontSize: fs(16),
                            }}
                        />
                        <button type="button" style={button} onClick={ask} disabled={loading || !question.trim()}>
                            {loading ? "Asking…" : "Ask"}
                        </button>
                    </div>
                    <span style={{ fontSize: fs(13), color: mutedColor }}>
                        {left} of {limit} questions left today
                    </span>
                    {examples}
                </>
            )}

            <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {message && <span>{message}</span>}
                {result && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            background: answerBackground,
                            ...(isTransparent(answerBackground) ? {} : { padding: 12, borderRadius: 8 }),
                        }}
                    >
                        <span style={{ whiteSpace: "pre-wrap" }}>{result.answer}</span>
                        {result.cited_cards && result.cited_cards.length > 0 && (
                            <span style={{ fontSize: fs(14), opacity: 0.85, color: linkColor }}>
                                Cards cited: {result.cited_cards.map((c) => c.name).join(", ")}
                            </span>
                        )}
                        {result.cached && (
                            <span style={{ fontSize: fs(13), color: mutedColor }}>
                                This is a prepared answer, not a live one.
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

AskBox.defaultProps = {
    apiUrl: "https://flame-atlas.vercel.app/api/ask",
    cachedUrl: CACHED_URL,
    dailyLimit: 10,
    accentColor: "#c2410c",
    buttonTextColor: "#ffffff",
    textColor: "#1c1917",
    mutedColor: "rgba(28, 25, 23, 0.75)",
    linkColor: "#1c1917",
    backgroundColor: "#fafaf9",
    inputBackground: "#ffffff",
    answerBackground: "rgba(0, 0, 0, 0)",
    borderColor: "rgba(0, 0, 0, 0)",
    radius: 12,
}

addPropertyControls(AskBox, {
    apiUrl: { type: ControlType.String, title: "API URL" },
    cachedUrl: { type: ControlType.String, title: "Prepared answers URL" },
    dailyLimit: { type: ControlType.Number, title: "Questions per day", min: 1, max: 50, step: 1 },
    font: { type: ControlType.Font, title: "Font", controls: "extended", defaultFontType: "sans-serif", defaultFontSize: "16px" },
    textColor: { type: ControlType.Color, title: "Text color" },
    mutedColor: { type: ControlType.Color, title: "Muted text color" },
    backgroundColor: { type: ControlType.Color, title: "Background" },
    borderColor: { type: ControlType.Color, title: "Border color" },
    radius: { type: ControlType.Number, title: "Corner radius", min: 0, max: 60, step: 1 },
    inputBackground: { type: ControlType.Color, title: "Input background" },
    accentColor: { type: ControlType.Color, title: "Button color" },
    buttonTextColor: { type: ControlType.Color, title: "Button text color" },
    answerBackground: { type: ControlType.Color, title: "Answer card background" },
    linkColor: { type: ControlType.Color, title: "Link color" },
})
