import { useEffect, useState } from 'react'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../../utils/Firebase'

interface BusinessReviewComponentProps {
  challengeId: string
  documentHash: string
  documentFileName: string
  submissionDescription: string
  reviewStartTimestamp: number
  reviewEndTimestamp: number
  companyAAddress: string
  currentAddress: string
  onReviewComplete: () => void
}

const BusinessReviewComponent = ({
  challengeId,
  documentHash,
  documentFileName,
  submissionDescription,
  reviewStartTimestamp,
  reviewEndTimestamp,
  companyAAddress,
  currentAddress,
  onReviewComplete,
}: BusinessReviewComponentProps) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'approved' | 'rejected' | 'auto-refunded'>('pending')
  const [loading, setLoading] = useState(false)
  const isCompanyA = currentAddress === companyAAddress

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000)
      const remaining = reviewEndTimestamp - now

      if (remaining <= 0) {
        setTimeRemaining('REVIEW PERIOD EXPIRED')
        // Trigger auto-refund
        if (reviewStatus === 'pending') {
          triggerAutoRefund()
        }
      } else {
        const hours = Math.floor(remaining / 3600)
        const minutes = Math.floor((remaining % 3600) / 60)
        setTimeRemaining(`${hours}h ${minutes}m remaining`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [reviewEndTimestamp, reviewStatus])

  const triggerAutoRefund = async () => {
    try {
      // Update challenge status to auto-refunded
      await updateDoc(doc(db, 'challenges', challengeId), {
        verificationStatus: 'auto-refunded',
        companyADecision: 'auto-refund',
        decisionTimestamp: Date.now(),
      })

      setReviewStatus('auto-refunded')
      alert('Review period expired. Automatic refund executed via optimistic execution!')
    } catch (error) {
      console.error('Auto-refund failed:', error)
    }
  }

  const handleApprove = async () => {
    if (!isCompanyA) {
      alert('Only Company A can approve/reject')
      return
    }

    setLoading(true)
    try {
      await updateDoc(doc(db, 'challenges', challengeId), {
        verificationStatus: 'approved',
        companyADecision: 'approved',
        decisionTimestamp: Date.now(),
      })

      setReviewStatus('approved')
      alert('Deliverable approved! Payment released to Company B.')
      onReviewComplete()
    } catch (error) {
      alert('Error approving: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!isCompanyA) {
      alert('Only Company A can approve/reject')
      return
    }

    const reason = prompt('Reason for rejection (this will initiate manual dispute):')
    if (!reason) return

    setLoading(true)
    try {
      await updateDoc(doc(db, 'challenges', challengeId), {
        verificationStatus: 'manual-dispute',
        companyADecision: 'rejected',
        rejectionReason: reason,
        decisionTimestamp: Date.now(),
      })

      setReviewStatus('rejected')
      alert('Deliverable rejected. Manual dispute initiated. Admin will review.')
      onReviewComplete()
    } catch (error) {
      alert('Error rejecting: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-cyber-dark/40 border border-neon-blue/30 rounded-xl p-8 max-w-3xl mx-auto">
      <h2 className="text-3xl font-cyber text-neon-blue mb-6">DOCUMENT REVIEW</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* TIME REMAINING */}
        <div className="bg-black/40 border border-neon-blue/30 rounded-lg p-4 text-center">
          <div className="text-gray-400 font-mono text-xs uppercase mb-2">Time Remaining</div>
          <div
            className={`text-2xl font-bold font-mono ${
              timeRemaining === 'REVIEW PERIOD EXPIRED' ? 'text-red-500' : 'text-neon-blue'
            }`}
          >
            {timeRemaining || 'Loading...'}
          </div>
        </div>

        {/* REVIEW STATUS */}
        <div className="bg-black/40 border border-neon-green/30 rounded-lg p-4 text-center">
          <div className="text-gray-400 font-mono text-xs uppercase mb-2">Status</div>
          <div
            className={`text-2xl font-bold font-mono uppercase ${
              reviewStatus === 'pending'
                ? 'text-yellow-500'
                : reviewStatus === 'approved'
                  ? 'text-neon-green'
                  : reviewStatus === 'rejected'
                    ? 'text-red-500'
                    : 'text-neon-blue'
            }`}
          >
            {reviewStatus}
          </div>
        </div>

        {/* ROLE */}
        <div className="bg-black/40 border border-neon-pink/30 rounded-lg p-4 text-center">
          <div className="text-gray-400 font-mono text-xs uppercase mb-2">Your Role</div>
          <div className={`text-2xl font-bold font-mono uppercase ${isCompanyA ? 'text-neon-blue' : 'text-gray-400'}`}>
            {isCompanyA ? 'Company A' : 'Company B'}
          </div>
        </div>
      </div>

      {/* DOCUMENT INFO */}
      <div className="bg-black/40 border border-gray-700 rounded-lg p-6 mb-8">
        <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-4">Submitted Document</h3>

        <div className="space-y-4">
          <div>
            <div className="text-gray-400 font-mono text-xs uppercase mb-1">File Name</div>
            <div className="text-white font-mono text-sm break-all">{documentFileName}</div>
          </div>

          <div>
            <div className="text-gray-400 font-mono text-xs uppercase mb-1">SHA-256 Hash (Proof of Authenticity)</div>
            <div className="bg-black/60 p-3 rounded border border-neon-blue/20 font-mono text-xs text-neon-blue break-all">
              {documentHash}
            </div>
          </div>

          <div>
            <div className="text-gray-400 font-mono text-xs uppercase mb-1">Submission Description</div>
            <div className="bg-black/60 p-3 rounded border border-gray-700 text-gray-300 text-sm whitespace-pre-wrap">
              {submissionDescription}
            </div>
          </div>
        </div>
      </div>

      {/* REVIEW NOTES */}
      <div className="p-4 border border-neon-green/20 rounded-lg bg-black/30 mb-8">
        <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-3">Review Instructions</h3>
        <ul className="space-y-2 text-gray-300 text-sm font-mono">
          <li className="flex gap-2">
            <span className="text-neon-green">→</span>
            <span>Verify the SHA-256 hash matches your expected document</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neon-green">→</span>
            <span>Review the submitted description and document details</span>
          </li>
          <li className="flex gap-2">
            <span className="text-neon-green">→</span>
            <span>If no action taken, automatic refund applies after review period</span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-500">⚠</span>
            <span>Rejecting initiates manual dispute - only if document is false/incomplete</span>
          </li>
        </ul>
      </div>

      {/* ACTION BUTTONS */}
      {isCompanyA && reviewStatus === 'pending' && (
        <div className="flex gap-4">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 py-4 bg-neon-green text-black font-bold font-mono uppercase tracking-wider rounded hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : 'APPROVE & PAY'}
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 py-4 bg-red-600 text-white font-bold font-mono uppercase tracking-wider rounded hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'PROCESSING...' : 'REJECT & DISPUTE'}
          </button>
        </div>
      )}

      {!isCompanyA && (
        <div className="p-4 border border-yellow-500/30 rounded-lg bg-yellow-500/10 text-center">
          <p className="text-yellow-500 font-mono text-sm">
            Waiting for Company A to review and approve/reject this deliverable...
          </p>
        </div>
      )}

      {reviewStatus !== 'pending' && (
        <div className="p-4 border border-neon-green/30 rounded-lg bg-neon-green/10 text-center">
          <p className="text-neon-green font-mono text-sm uppercase">Review Complete: {reviewStatus.toUpperCase()}</p>
        </div>
      )}
    </div>
  )
}

export default BusinessReviewComponent
