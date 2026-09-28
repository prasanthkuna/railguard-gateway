import { redirect } from "next/navigation"

type Props = { params: Promise<{ id: string }> }

export default async function ReceiptAliasPage({ params }: Props) {
  const { id } = await params
  redirect(`/executions/${encodeURIComponent(id)}`)
}
