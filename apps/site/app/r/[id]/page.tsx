import Link from "next/link"
import { notFound } from "next/navigation"
import { ReceiptTimeline } from "../../../components/ReceiptTimeline"
import { EXTERNAL_LINK } from "../../../lib/constants"
import { receiptFromId } from "../../../lib/demo-receipt"

type Props = { params: Promise<{ id: string }> }

export default async function ReceiptPage({ params }: Props) {
  const { id } = await params
  const data = receiptFromId(decodeURIComponent(id))
  if (!data) notFound()

  return (
    <main className="page receipt-page">
      <ReceiptTimeline data={data} sample />
      <div className="receipt-actions">
        <Link href="/attack" className="btn btn-mint">
          Run attack demo
        </Link>
        <Link href="/proof/arbitrum-sepolia" className="btn btn-ghost">
          View verified testnet proof
        </Link>
        <Link href="/" className="btn btn-ghost">
          Home
        </Link>
      </div>
    </main>
  )
}
