import Link from "next/link"
import { ReceiptTimeline } from "../../../components/ReceiptTimeline"
import { OPERATOR_URL } from "../../../lib/constants"
import { receiptFromId } from "../../../lib/demo-receipt"

type Props = { params: Promise<{ id: string }> }

export default async function ReceiptPage({ params }: Props) {
  const { id } = await params
  const data = receiptFromId(decodeURIComponent(id))

  return (
    <main className="page receipt-page">
      <ReceiptTimeline data={data} />
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
    </main>
  )
}
