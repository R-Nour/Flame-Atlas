// Flame Atlas "Moon Base map": a Framer code component.
//
// A scatter of every test in data/tests.csv that lists both oxygen and pressure:
// pressure (psi, log scale) on the x axis, oxygen (%) on the y axis, one colour per investigation.
// The Moon Base zone (oxygen 30% or more at 10.2 psi or less) is shaded darker, and the edge
// band (oxygen 29.5% or more at 10.6 psi or less) lighter. Hover, tap or focus a point to see
// its test id, outcome and source.
//
// Data loads from jsDelivr, so the map updates when the CSV changes on GitHub.

import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

const DATA_URL = "https://cdn.jsdelivr.net/gh/R-Nour/Flame-Atlas@main/data/tests.csv"

const ZONE = { o2: 30, psi: 10.2 }
const EDGE = { o2: 29.5, psi: 10.6 }

// Colour-blind-safe categorical palette; investigations beyond these get grey.
const COLORS: Record<string, string> = {
    FLEX: "#0072B2",
    "ACME Flame Design": "#E69F00",
    "ACME CFI-G": "#009E73",
    "BASS-II": "#CC79A7",
    CFI: "#56B4E9",
    "ACME BRE": "#D55E00",
    "Saffire-IV": "#7B3294",
    "Saffire-V": "#B8860B",
    "Saffire-VI": "#000000",
}
const FALLBACK = "#888888"

type Test = {
    id: string
    investigation: string
    testId: string
    material: string
    o2: number
    psi: number
    outcome: string
    source: string
    zone: string
    flow: number | null // cm/s; null when the table leaves it blank
    testEnd: string // exactly as written in tests.csv
}

// ---------- CSV ----------

function parseCsv(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ""
    let quoted = false
    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (quoted) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    cell += '"'
                    i++
                } else quoted = false
            } else cell += ch
        } else if (ch === '"') quoted = true
        else if (ch === ",") {
            row.push(cell)
            cell = ""
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++
            row.push(cell)
            cell = ""
            if (row.length > 1 || row[0] !== "") rows.push(row)
            row = []
        } else cell += ch
    }
    if (cell !== "" || row.length) {
        row.push(cell)
        rows.push(row)
    }
    return rows
}

export function parseTests(text: string): { plotted: Test[]; missing: number } {
    const rows = parseCsv(text)
    const head = rows[0] || []
    const col = (n: string) => head.indexOf(n)
    const c = {
        id: col("id"),
        inv: col("investigation"),
        tid: col("test_id"),
        mat: col("material"),
        o2: col("o2_pct"),
        psi: col("pressure_psi"),
        out: col("outcome"),
        src: col("source"),
        zone: col("moon_base_zone"),
        flow: col("flow_cm_s"),
        end: col("test_end"),
    }
    const plotted: Test[] = []
    let missing = 0
    for (const r of rows.slice(1)) {
        const o2 = parseFloat(r[c.o2])
        const psi = parseFloat(r[c.psi])
        if (!isFinite(o2) || !isFinite(psi)) {
            missing++
            continue
        }
        plotted.push({
            id: r[c.id],
            investigation: r[c.inv],
            testId: r[c.tid],
            material: r[c.mat] || "",
            o2,
            psi,
            outcome: r[c.out] || "",
            source: r[c.src] || "",
            zone: r[c.zone] || "",
            flow: isFinite(parseFloat(r[c.flow])) ? parseFloat(r[c.flow]) : null,
            testEnd: r[c.end] || "",
        })
    }
    return { plotted, missing }
}

// ---------- filters ----------

type Filters = { investigation: string; zone: string; airflow: string; end: string }
const NO_FILTERS: Filters = { investigation: "", zone: "", airflow: "", end: "" }
const BLANK_END = "\u0000blank" // marks tests whose test_end cell is empty

function passes(t: Test, f: Filters): boolean {
    if (f.investigation && t.investigation !== f.investigation) return false
    if (f.zone && t.zone !== f.zone) return false
    if (f.airflow === "still" && t.flow !== 0) return false
    if (f.airflow === "flow" && !(t.flow !== null && t.flow > 0)) return false
    if (f.airflow === "none" && t.flow !== null) return false
    if (f.end === BLANK_END ? t.testEnd !== "" : f.end && t.testEnd !== f.end) return false
    return true
}

// ---------- component ----------

type Props = {
    dataUrl: string
    xMin: number
    xMax: number
    yMin: number
    yMax: number
    textColor: string
    backgroundColor: string
    style?: React.CSSProperties
}

const W = 640
const H = 440
const M = { top: 16, right: 16, bottom: 48, left: 52 }

export default function MoonBaseMap(props: Props) {
    const { dataUrl, xMin, xMax, yMin, yMax, textColor, backgroundColor, style } = props
    const [tests, setTests] = React.useState<Test[]>([])
    const [missing, setMissing] = React.useState(0)
    const [status, setStatus] = React.useState<"loading" | "ok" | "error">("loading")
    const [active, setActive] = React.useState<Test | null>(null)
    const [filters, setFilters] = React.useState<Filters>(NO_FILTERS)
    const [hidden, setHidden] = React.useState<Record<string, boolean>>({})

    React.useEffect(() => {
        let live = true
        fetch(dataUrl || DATA_URL)
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error("HTTP " + r.status))))
            .then((text) => {
                if (!live) return
                const { plotted, missing } = parseTests(text)
                setTests(plotted)
                setMissing(missing)
                setStatus("ok")
            })
            .catch(() => live && setStatus("error"))
        return () => {
            live = false
        }
    }, [dataUrl])

    const x0 = Math.max(0.5, Math.min(xMin, xMax - 1))
    const y0 = Math.min(yMin, yMax - 1)
    const pw = W - M.left - M.right
    const ph = H - M.top - M.bottom
    const lx = (v: number) => Math.log(v)
    const sx = (v: number) => M.left + ((lx(v) - lx(x0)) / (lx(xMax) - lx(x0))) * pw
    const sy = (v: number) => M.top + ph - ((v - y0) / (yMax - y0)) * ph

    const inView = tests.filter((t) => t.psi >= x0 && t.psi <= xMax && t.o2 >= y0 && t.o2 <= yMax)
    const outOfView = tests.length - inView.length
    const names = Array.from(new Set(tests.map((t) => t.investigation)))
    const visible = inView.filter((t) => !hidden[t.investigation] && passes(t, filters))
    const investigations = [...names].sort((a, b) => a.localeCompare(b))
    const ends = Array.from(new Set(tests.map((t) => t.testEnd).filter((e) => e !== ""))).sort((a, b) => a.localeCompare(b))
    const hasBlankEnd = tests.some((t) => t.testEnd === "")
    const filtered = Object.keys(hidden).some((k) => hidden[k]) || JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)
    const colorOf = (n: string) => COLORS[n] || FALLBACK

    const ticksX: number[] = []
    for (const v of [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 40, 60, 80, 100]) if (v >= x0 && v <= xMax) ticksX.push(v)
    const ticksY: number[] = []
    for (let v = Math.ceil(y0 / 5) * 5; v <= yMax; v += 5) ticksY.push(v)

    const clampX = (v: number) => Math.min(Math.max(v, x0), xMax)
    const clampY = (v: number) => Math.min(Math.max(v, y0), yMax)

    const filterGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 14, fontWeight: 600 }
    const selectStyle: React.CSSProperties = {
        fontSize: 14,
        fontWeight: 400,
        padding: "6px 8px",
        borderRadius: 6,
        border: `1px solid ${textColor}`,
        background: backgroundColor,
        color: textColor,
        maxWidth: "100%",
    }
    const segRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 4 }
    const segButton = (on: boolean): React.CSSProperties => ({
        fontSize: 14,
        fontWeight: 400,
        padding: "6px 10px",
        borderRadius: 6,
        border: `1px solid ${textColor}`,
        background: on ? textColor : "transparent",
        color: on ? backgroundColor : textColor,
        cursor: "pointer",
    })

    const tipLeft = active ? Math.min(Math.max(sx(active.psi) / W, 0.02), 0.98) : 0

    return (
        <div
            style={{
                boxSizing: "border-box",
                width: "100%",
                padding: 16,
                borderRadius: 12,
                background: backgroundColor,
                color: textColor,
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 14,
                lineHeight: 1.4,
                position: "relative",
                ...style,
            }}
        >
            {status === "loading" && <div role="status">Loading tests…</div>}
            {status === "error" && (
                <div role="alert">The map couldn't load its data. Please try again in a minute.</div>
            )}

            {status === "ok" && (
                <>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "10px 16px", marginBottom: 10, fontSize: 14 }}>
                        <label style={filterGroup}>
                            Investigation
                            <select
                                value={filters.investigation}
                                onChange={(e) => setFilters({ ...filters, investigation: e.target.value })}
                                style={selectStyle}
                            >
                                <option value="">All investigations</option>
                                {investigations.map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div style={filterGroup} role="group" aria-label="Zone">
                            Zone
                            <div style={segRow}>
                                {[["", "All"], ["inside", "Inside"], ["edge", "Edge"], ["outside", "Outside"]].map(([v, label]) => (
                                    <button
                                        key={label}
                                        type="button"
                                        aria-pressed={filters.zone === v}
                                        onClick={() => setFilters({ ...filters, zone: v })}
                                        style={segButton(filters.zone === v)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={filterGroup} role="group" aria-label="Airflow">
                            Airflow
                            <div style={segRow}>
                                {[["", "All"], ["still", "Still air"], ["flow", "With airflow"], ["none", "Not stated"]].map(([v, label]) => (
                                    <button
                                        key={label}
                                        type="button"
                                        aria-pressed={filters.airflow === v}
                                        onClick={() => setFilters({ ...filters, airflow: v })}
                                        style={segButton(filters.airflow === v)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <label style={filterGroup}>
                            How it ended
                            <select
                                value={filters.end}
                                onChange={(e) => setFilters({ ...filters, end: e.target.value })}
                                style={selectStyle}
                            >
                                <option value="">Any</option>
                                {ends.map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                                {hasBlankEnd && <option value={BLANK_END}>(blank in table)</option>}
                            </select>
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                setFilters(NO_FILTERS)
                                setHidden({})
                            }}
                            disabled={!filtered}
                            style={{ ...segButton(false), opacity: filtered ? 1 : 0.5, cursor: filtered ? "pointer" : "default" }}
                        >
                            Reset
                        </button>
                    </div>
                    <div role="status" style={{ fontSize: 14, marginBottom: 6 }}>
                        Showing {visible.length} of {tests.length} tests
                    </div>

                    <svg
                        viewBox={`0 0 ${W} ${H}`}
                        width="100%"
                        role="img"
                        aria-label={`Scatter of ${visible.length} tests by pressure in psi and oxygen percent. The Moon Base zone is oxygen ${ZONE.o2}% or more at ${ZONE.psi} psi or less.`}
                        style={{ display: "block", height: "auto", touchAction: "manipulation" }}
                        onMouseLeave={() => setActive(null)}
                    >
                        {/* edge band, then the zone on top */}
                        <rect
                            x={sx(x0)}
                            y={sy(clampY(yMax))}
                            width={sx(clampX(EDGE.psi)) - sx(x0)}
                            height={sy(clampY(EDGE.o2)) - sy(clampY(yMax))}
                            fill="#E69F00"
                            opacity={0.18}
                        />
                        <rect
                            x={sx(x0)}
                            y={sy(clampY(yMax))}
                            width={sx(clampX(ZONE.psi)) - sx(x0)}
                            height={sy(clampY(ZONE.o2)) - sy(clampY(yMax))}
                            fill="#D55E00"
                            opacity={0.22}
                        />
                        <text x={sx(x0) + 6} y={sy(yMax) + 14} fontSize={12} fill={textColor} fontWeight={600}>
                            Moon Base zone
                        </text>

                        {ticksX.map((v) => (
                            <g key={"x" + v}>
                                <line x1={sx(v)} x2={sx(v)} y1={M.top} y2={M.top + ph} stroke={textColor} opacity={0.1} />
                                <text x={sx(v)} y={M.top + ph + 16} fontSize={11} textAnchor="middle" fill={textColor}>
                                    {v}
                                </text>
                            </g>
                        ))}
                        {ticksY.map((v) => (
                            <g key={"y" + v}>
                                <line x1={M.left} x2={M.left + pw} y1={sy(v)} y2={sy(v)} stroke={textColor} opacity={0.1} />
                                <text x={M.left - 8} y={sy(v) + 4} fontSize={11} textAnchor="end" fill={textColor}>
                                    {v}
                                </text>
                            </g>
                        ))}
                        <rect x={M.left} y={M.top} width={pw} height={ph} fill="none" stroke={textColor} opacity={0.4} />
                        <text x={M.left + pw / 2} y={H - 8} fontSize={12} textAnchor="middle" fill={textColor}>
                            Pressure (psi, log scale)
                        </text>
                        <text
                            transform={`translate(14 ${M.top + ph / 2}) rotate(-90)`}
                            fontSize={12}
                            textAnchor="middle"
                            fill={textColor}
                        >
                            Oxygen (%)
                        </text>

                        {visible.map((t) => (
                            <circle
                                key={t.id}
                                cx={sx(t.psi)}
                                cy={sy(t.o2)}
                                r={active && active.id === t.id ? 7 : 4}
                                fill={colorOf(t.investigation)}
                                fillOpacity={0.7}
                                stroke={active && active.id === t.id ? textColor : "#fff"}
                                strokeWidth={active && active.id === t.id ? 2 : 0.5}
                                tabIndex={0}
                                aria-label={`${t.investigation} test ${t.testId}: ${t.o2}% oxygen at ${t.psi} psi. ${t.outcome || "Outcome not recorded"}`}
                                onMouseEnter={() => setActive(t)}
                                onFocus={() => setActive(t)}
                                onBlur={() => setActive(null)}
                                onClick={() => setActive(t)}
                            />
                        ))}
                    </svg>

                    {active && (
                        <div
                            role="status"
                            style={{
                                position: "absolute",
                                top: 12,
                                left: `${tipLeft * 100}%`,
                                transform: `translateX(${tipLeft > 0.6 ? "-100%" : "0"})`,
                                maxWidth: "min(300px, 70%)",
                                padding: "8px 10px",
                                borderRadius: 8,
                                background: textColor,
                                color: backgroundColor,
                                fontSize: 13,
                                pointerEvents: "none",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                            }}
                        >
                            <strong>
                                {active.investigation} · test {active.testId}
                            </strong>
                            <div>
                                {active.o2}% oxygen at {active.psi} psi
                            </div>
                            <div>Outcome: {active.outcome || "not recorded in the table"}</div>
                            <div style={{ opacity: 0.8 }}>Source: {active.source}</div>
                        </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
                        {names.map((n) => (
                            <button
                                key={n}
                                type="button"
                                aria-pressed={!hidden[n]}
                                onClick={() => setHidden({ ...hidden, [n]: !hidden[n] })}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: 0,
                                    border: "none",
                                    background: "none",
                                    color: textColor,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    opacity: hidden[n] ? 0.4 : 1,
                                }}
                            >
                                <span
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: colorOf(n),
                                        display: "inline-block",
                                    }}
                                />
                                {n}
                            </button>
                        ))}
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                        Dark shading: Moon Base zone (oxygen {ZONE.o2}% or more, {ZONE.psi} psi or less). Light shading: edge
                        (oxygen {EDGE.o2}% or more, {EDGE.psi} psi or less). Click a name to hide or show it.
                        {outOfView > 0 && ` ${outOfView} tests lie outside this view.`}
                        {missing > 0 && ` ${missing} tests are not plotted because the table lists no oxygen or pressure.`}
                    </div>
                </>
            )}
        </div>
    )
}

MoonBaseMap.defaultProps = {
    dataUrl: DATA_URL,
    xMin: 3,
    xMax: 80,
    yMin: 10,
    yMax: 42,
    textColor: "#1c1917",
    backgroundColor: "#fafaf9",
}

addPropertyControls(MoonBaseMap, {
    dataUrl: { type: ControlType.String, title: "Data URL" },
    xMin: { type: ControlType.Number, title: "Pressure min (psi)", min: 1, max: 20, step: 1 },
    xMax: { type: ControlType.Number, title: "Pressure max (psi)", min: 12, max: 100, step: 1 },
    yMin: { type: ControlType.Number, title: "Oxygen min (%)", min: 0, max: 25, step: 1 },
    yMax: { type: ControlType.Number, title: "Oxygen max (%)", min: 31, max: 100, step: 1 },
    textColor: { type: ControlType.Color, title: "Text" },
    backgroundColor: { type: ControlType.Color, title: "Background" },
})
