/** Three plain-English lines at the top of every proof page. */
export function PlainSummary({
  happened,
  checked,
  matters,
}: {
  happened: string
  checked: string
  matters: string
}) {
  return (
    <div className="ui-plain" aria-label="In plain words">
      <p>
        <b>What happened:</b> {happened}
      </p>
      <p>
        <b>What Railguard checked:</b> {checked}
      </p>
      <p>
        <b>Why it matters:</b> {matters}
      </p>
    </div>
  )
}
