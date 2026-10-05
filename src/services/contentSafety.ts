// This file is intentionally a stub. It is NOT a working CSAM scanner.
//
// Before this app can handle real media uploads, replace the body of
// `queueCsamScan` with a real call to a vendor such as Thorn Safer or
// Microsoft PhotoDNA, and wire their callback/webhook to update the post's
// `csamScanStatus` field. Content must stay hidden (PENDING) until that
// callback reports CLEAR. Any FLAGGED result must trigger your NCMEC
// CyberTip reporting process — that's a legal requirement, not optional.
//
// Do not ship this app with real user uploads while this is still a stub.

import { prisma } from '../lib/prisma'

export async function queueCsamScan(postId: string, _mediaUrl: string): Promise<void> {
  console.warn(
    `[contentSafety] queueCsamScan called for post ${postId} — this is a STUB. ` +
      'No real scan is happening. Integrate Thorn Safer / PhotoDNA before accepting real uploads.'
  )

  // Scaffold-only behavior so the rest of the app has something to test
  // against locally. Remove this once a real vendor integration exists.
  if (process.env.NODE_ENV === 'development' && process.env.CSAM_SCAN_API_KEY === undefined) {
    await prisma.post.update({
      where: { id: postId },
      data: { csamScanStatus: 'PENDING' },
    })
  }
}
