import { redirect } from "next/navigation"

type Props = { params: Promise<{ id: string }> }

/** Shareable receipt deep link — resolves to operator execution view. */
export default async function ReceiptSharePage({ params }: Props) {
  const { id } = await params
  const operator = process.env.NEXT_PUBLIC_OPERATOR_URL || "https://prebroadcast.vercel.app"
  redirect(`${operator}/executions/${encodeURIComponent(id)}`)
}
