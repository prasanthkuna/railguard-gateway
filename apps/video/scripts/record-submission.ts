/** Judge-safe clip capture — site + Arbiscan only (no PreBroadcast). */
delete process.env.RECORD_CHAPTER
process.env.RECORD_SUBMISSION = "1"
const { runRecordProductDemo } = await import("./record-product-demo.ts")
await runRecordProductDemo()
