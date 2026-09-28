import Link from "next/link"
import { ReceiptCard } from "../../../components/ReceiptCard"
import { OPERATOR_URL } from "../../../lib/constants"
import { receiptFromId } from "../../../lib/demo-receipt"

type Props = { params: Promise<{ id: string }> }

export default async function ReceiptPage({ params }: Props) {
  const { id } = await params
  const data = receiptFromId(decodeURIComponent(id))
  const isDemo = id === "demo" || id.startsWith("exec_demo")

  return (
    <main className="page receipt-page">
      <ReceiptCard data={data} demo={isDemo} />
      <div className="receipt-actions">
        <Link href="/attack" className="btn btn-mint">
          Run attack demo
        </Link>
        <a href={`${OPERATOR_URL}/executions/${encodeURIComponent(id)}`} className="btn btn-ghost">
          Open in operator
        </a>
        <Link href="/" className="btn btn-ghost">
          Home
        </Link>
      </div>
      {!isDemo && (
        <p
          style={{
            textAlign: "center",
            fontSize: "0.8rem",
            color: "var(--muted)",
            marginTop: "1rem",
          }}
        >
          Authenticated evidence loads in the operator console. Fields above use the public envelope
          shape.
        </p>
      )}
    </main>
  )
}
