import { useEffect, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../utils/Firebase'
import * as algokit from '@algorandfoundation/algokit-utils'
import { CommitFiClient } from '../contracts/CommitFiClient'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import BusinessDocumentSubmission from './challenges/BusinessDocumentSubmission'
import BusinessReviewComponent from './challenges/BusinessReviewComponent'

interface StudyCircleProps {
  challengeId: string
  onBack?: () => void
}

type ChallengeType = 'academic' | 'fitness' | 'business'

const StudyCircle = ({ challengeId, onBack }: StudyCircleProps) => {
  const { activeAddress, transactionSigner } = useWallet()

  const [challenge, setChallenge] = useState<any>(null)
  const [memberAddresses, setMemberAddresses] = useState<string[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [mySubmission, setMySubmission] = useState<any>(null)
  const [proofLink, setProofLink] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Timer State
  const [timeString, setTimeString] = useState('LOADING...')
  const [isExpired, setIsExpired] = useState(false)

  // Business specific
  const [showDocumentSubmission, setShowDocumentSubmission] = useState(false)
  const [showReview, setShowReview] = useState(false)

  // 1. FETCH DATA
  useEffect(() => {
    if (!challengeId) return

    // Get Challenge Details
    getDoc(doc(db, 'challenges', challengeId)).then((snap) => {
      if (snap.exists()) setChallenge({ id: snap.id, ...snap.data() })
    })

    // Get Approved Members (Joiners)
    const qMembers = query(collection(db, 'requests'), where('challengeId', '==', challengeId), where('status', '==', 'approved'))
    onSnapshot(qMembers, (snap) => {
      setMemberAddresses(snap.docs.map((d) => d.data().applicant))
    })

    // Get Submissions (for academic/fitness)
    const qSubs = query(collection(db, 'submissions'), where('challengeId', '==', challengeId))
    onSnapshot(qSubs, (snap) => {
      let subs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

      const uniqueSubs = new Map()
      subs.forEach((sub: any) => uniqueSubs.set(sub.user, sub))
      subs = Array.from(uniqueSubs.values())

      setSubmissions(subs)

      if (activeAddress) {
        setMySubmission(subs.find((s: any) => s.user === activeAddress))
      }
    })
  }, [challengeId, activeAddress])

  // 2. REAL-TIME TIMER
  useEffect(() => {
    if (!challenge) return

    const tick = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = challenge.deadline - now

      if (diff <= 0) {
        setIsExpired(true)
        setTimeString('00D : 00H : 00M : 00S')
      } else {
        setIsExpired(false)
        const days = Math.floor(diff / 86400)
        const hours = Math.floor((diff % 86400) / 3600)
        const mins = Math.floor((diff % 3600) / 60)
        const secs = Math.floor(diff % 60)
        setTimeString(`${days}D : ${hours}H : ${mins}M : ${secs}S`)
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [challenge])

  // 3. ACTIONS
  const handleSubmit = async () => {
    if (!proofLink || !activeAddress) return
    try {
      if (mySubmission) return alert('You have already submitted.')
      await addDoc(collection(db, 'submissions'), {
        challengeId,
        user: activeAddress,
        proof: proofLink,
        status: 'pending',
        votes: [],
        timestamp: Date.now(),
      })
      setProofLink('')
    } catch (e) {
      console.error(e)
    }
  }

  const handleVote = async (submissionId: string) => {
    if (!activeAddress) return
    try {
      await updateDoc(doc(db, 'submissions', submissionId), {
        votes: arrayUnion(activeAddress),
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleFinalize = async (submissionId: string, participantAddress: string) => {
    if (!activeAddress) return
    setActionLoading(true)
    try {
      await updateDoc(doc(db, 'submissions', submissionId), { status: 'verified' })
      alert('Participant Verified! ✅')
    } catch (e) {
      console.error(e)
      alert(`Error: ${(e as Error).message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!activeAddress) return
    setActionLoading(true)
    try {
      if (mySubmission) await updateDoc(doc(db, 'submissions', mySubmission.id), { status: 'claimed' })
      alert('🎉 REWARD CLAIMED!')
    } catch (e) {
      alert(`Claim Failed: ${(e as Error).message}`)
    } finally {
      setActionLoading(false)
    }
  }

  if (!challenge) return <div className="text-center p-20 text-neon-green font-mono">LOADING DATA...</div>

  const isLeader = activeAddress === challenge.creator
  const challengeType: ChallengeType = challenge.type || 'academic'

  // Render based on challenge type
  if (challengeType === 'business') {
    const isCompanyA = activeAddress === challenge.companyA
    const isCompanyB = activeAddress === challenge.companyB

    // If not accepted yet, show waiting state
    if (!challenge.companyB) {
      return (
        <div className="max-w-4xl mx-auto py-8 px-6">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-6 px-4 py-2 bg-gray-700/50 text-gray-300 font-mono text-xs uppercase hover:bg-gray-700 transition rounded"
            >
              ← BACK TO YOUR CIRCLE
            </button>
          )}
          <div className="bg-cyber-dark/40 border border-yellow-500/30 rounded-xl p-8 text-center">
            <h2 className="text-3xl font-cyber text-yellow-500 mb-4">CONTRACT AWAITING ACCEPTANCE</h2>
            <p className="text-gray-400 font-mono mb-6">{challenge.title}</p>
            <div className="bg-black/40 p-4 rounded border border-gray-700 mb-6">
              <p className="text-gray-300 font-mono text-sm">{challenge.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/40 p-4 rounded border border-neon-green/30">
                <div className="text-gray-400 font-mono text-xs uppercase mb-2">Stake Amount</div>
                <div className="text-2xl font-bold text-neon-green">{challenge.stakeAmount} ALGO</div>
              </div>
              <div className="bg-black/40 p-4 rounded border border-neon-blue/30">
                <div className="text-gray-400 font-mono text-xs uppercase mb-2">Deliverable Type</div>
                <div className="text-lg font-bold text-neon-blue capitalize">{challenge.deliverableType}</div>
              </div>
              <div className="bg-black/40 p-4 rounded border border-neon-pink/30">
                <div className="text-gray-400 font-mono text-xs uppercase mb-2">Review Period</div>
                <div className="text-lg font-bold text-neon-pink">{challenge.reviewPeriodHours}h</div>
              </div>
            </div>
            <p className="text-gray-500 font-mono text-sm mt-6">Waiting for Company B to accept this contract...</p>
          </div>
        </div>
      )
    }

    // Company B can submit documents
    if (isCompanyB && challenge.verificationStatus === 'awaiting-delivery' && !showReview) {
      return (
        <div className="max-w-4xl mx-auto py-8 px-6">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-6 px-4 py-2 bg-gray-700/50 text-gray-300 font-mono text-xs uppercase hover:bg-gray-700 transition rounded"
            >
              ← BACK TO YOUR CIRCLE
            </button>
          )}
          <BusinessDocumentSubmission
            challengeId={challengeId}
            companyBAddress={activeAddress!}
            reviewPeriodHours={challenge.reviewPeriodHours}
            onSubmitSuccess={() => {
              // Refresh challenge data
              getDoc(doc(db, 'challenges', challengeId)).then((snap) => {
                if (snap.exists()) setChallenge({ id: snap.id, ...snap.data() })
              })
            }}
          />
        </div>
      )
    }

    // Show review component when in review or dispute
    if ((isCompanyA || isCompanyB) && ['in-review', 'manual-dispute'].includes(challenge.verificationStatus)) {
      return (
        <div className="max-w-4xl mx-auto py-8 px-6">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-6 px-4 py-2 bg-gray-700/50 text-gray-300 font-mono text-xs uppercase hover:bg-gray-700 transition rounded"
            >
              ← BACK TO YOUR CIRCLE
            </button>
          )}
          <BusinessReviewComponent
            challengeId={challengeId}
            documentHash={challenge.documentHash}
            documentFileName={challenge.documentFileName}
            submissionDescription={challenge.submissionDescription}
            reviewStartTimestamp={challenge.reviewStartTimestamp}
            reviewEndTimestamp={challenge.reviewEndTimestamp}
            companyAAddress={challenge.companyA}
            currentAddress={activeAddress!}
            onReviewComplete={() => {
              getDoc(doc(db, 'challenges', challengeId)).then((snap) => {
                if (snap.exists()) setChallenge({ id: snap.id, ...snap.data() })
              })
            }}
          />
        </div>
      )
    }

    // Show completed state
    return (
      <div className="max-w-4xl mx-auto py-8 px-6">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 px-4 py-2 bg-gray-700/50 text-gray-300 font-mono text-xs uppercase hover:bg-gray-700 transition rounded"
          >
            ← BACK TO YOUR CIRCLE
          </button>
        )}
        <div className="bg-cyber-dark/40 border border-neon-green/30 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-cyber text-neon-green mb-4">CONTRACT COMPLETED</h2>
          <p className="text-gray-400 font-mono mb-6">Status: {challenge.verificationStatus.toUpperCase()}</p>
          {challenge.companyADecision && (
            <div className={`text-xl font-bold ${challenge.companyADecision === 'approved' ? 'text-neon-green' : 'text-red-500'}`}>
              Decision: {challenge.companyADecision.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ACADEMIC & FITNESS FLOW
  const allParticipants = Array.from(new Set([challenge.creator, ...memberAddresses]))
  const totalVoters = allParticipants.length - 1

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 font-sans">
      {/* BACK BUTTON */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-gray-700/50 text-gray-300 font-mono text-xs uppercase hover:bg-gray-700 transition rounded"
        >
          ← BACK TO YOUR CIRCLE
        </button>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-700 pb-8 mb-8">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-cyber text-neon-green mb-4 tracking-wide">{challenge.title.toUpperCase()}</h1>
          <div className="bg-black/40 p-6 border-l-4 border-neon-blue rounded-r-lg">
            <h4 className="text-neon-blue text-xs font-bold uppercase mb-2 tracking-widest">
              {challengeType === 'academic' ? 'ACADEMIC' : 'FITNESS'} CHALLENGE BRIEF
            </h4>
            <p className="text-gray-300 font-mono text-sm leading-relaxed">{challenge.description}</p>
          </div>
        </div>

        <div className="text-right mt-6 md:mt-0 min-w-[200px]">
          <div className="text-xs text-gray-500 font-mono uppercase mb-1 tracking-widest">Time Remaining</div>
          <div className={`text-4xl font-mono font-bold ${isExpired ? 'text-red-500' : 'text-white'}`}>
            {isExpired ? 'ENDED' : timeString}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: YOUR STATUS */}
        <div className="lg:col-span-1 space-y-8">
          {challenge.templateUrl && (
            <a
              href={challenge.templateUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center py-3 bg-neon-blue/10 text-neon-blue text-xs font-bold border border-neon-blue/30 hover:bg-neon-blue hover:text-black transition uppercase rounded font-mono"
            >
              DOWNLOAD TEMPLATE 📄
            </a>
          )}

          <div className="bg-cyber-dark/40 border border-neon-green/30 p-6 rounded-xl">
            <h3 className="text-neon-green font-cyber mb-4 tracking-wider">YOUR STATUS</h3>
            {mySubmission ? (
              <div className="text-center py-6 bg-black/20 rounded-lg">
                {mySubmission.status === 'verified' && isExpired ? (
                  <button
                    onClick={handleClaim}
                    disabled={actionLoading}
                    className="w-full py-4 bg-gradient-to-r from-neon-green to-neon-blue text-black font-bold font-mono text-xl rounded hover:scale-105 transition"
                  >
                    {actionLoading ? 'CLAIMING...' : 'CLAIM REWARD 💰'}
                  </button>
                ) : mySubmission.status === 'claimed' ? (
                  <div className="text-gray-400 font-bold">REWARD CLAIMED 🏆</div>
                ) : (
                  <div
                    className={`text-2xl font-bold uppercase tracking-widest ${
                      mySubmission.status === 'verified' ? 'text-neon-green' : 'text-yellow-500'
                    }`}
                  >
                    {mySubmission.status === 'verified' ? 'VERIFIED ✅' : 'PENDING ⏳'}
                  </div>
                )}
              </div>
            ) : !isExpired ? (
              <div className="space-y-4">
                <input
                  className="w-full bg-black/50 border border-gray-600 rounded p-4 text-white text-sm focus:border-neon-green outline-none font-mono"
                  placeholder="Paste proof link..."
                  value={proofLink}
                  onChange={(e) => setProofLink(e.target.value)}
                />
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 bg-neon-green text-black font-bold font-mono rounded hover:opacity-90 uppercase tracking-wider"
                >
                  SUBMIT PROOF
                </button>
              </div>
            ) : (
              <div className="text-red-500 font-mono text-center">CHALLENGE ENDED</div>
            )}
          </div>
        </div>

        {/* RIGHT: PARTICIPANTS */}
        <div className="lg:col-span-2">
          <div className="bg-cyber-dark/40 border border-gray-700 rounded-xl overflow-hidden min-h-[500px]">
            <div className="p-6 border-b border-gray-700 bg-black/20 flex justify-between items-center">
              <h3 className="text-white font-cyber tracking-widest">PARTICIPANTS</h3>
              <span className="text-xs font-mono text-gray-500">PEER REVIEW</span>
            </div>
            <div className="divide-y divide-gray-800/50">
              {allParticipants.map((participantAddr, index) => {
                const sub = submissions.find((s) => s.user === participantAddr)
                const isMe = participantAddr === activeAddress

                if (!sub) {
                  return (
                    <div key={participantAddr} className="p-4 flex items-center gap-4 hover:bg-white/5 transition opacity-50">
                      <div className="w-8 h-8 flex items-center justify-center font-bold rounded-full bg-gray-800 text-gray-600 font-mono text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 font-mono text-sm text-gray-500">
                        {isMe ? 'YOU' : `${participantAddr.slice(0, 6)}...${participantAddr.slice(-4)}`}
                      </div>
                      <div className="text-[10px] text-gray-600 font-bold uppercase border border-gray-700 px-2 py-1 rounded">
                        WAITING FOR SUBMISSION
                      </div>
                    </div>
                  )
                }

                const votes = sub.votes?.length || 0
                const hasConsensus = votes >= Math.max(1, totalVoters)
                const iHaveVoted = sub.votes?.includes(activeAddress)

                return (
                  <div key={sub.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition">
                    <div className="w-8 h-8 flex items-center justify-center font-bold rounded-full bg-gray-800 text-gray-500 font-mono text-sm">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="font-mono text-sm text-white">
                        {isMe ? 'YOU' : `${sub.user.slice(0, 6)}...${sub.user.slice(-4)}`}
                      </div>
                      <a href={sub.proof} target="_blank" rel="noreferrer" className="text-xs text-gray-500 underline hover:text-neon-green">
                        View Proof
                      </a>
                    </div>

                    {sub.status === 'verified' ? (
                      <div className="px-3 py-1 bg-neon-green/20 text-neon-green border border-neon-green rounded text-[10px] font-bold uppercase">
                        VERIFIED
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-xs text-gray-400">
                          <span className="text-white font-bold">{votes}</span>/{Math.max(1, totalVoters)}
                        </div>

                        {isLeader && hasConsensus ? (
                          <button
                            onClick={() => handleFinalize(sub.id, sub.user)}
                            disabled={actionLoading}
                            className="px-3 py-1 bg-neon-blue text-black font-bold text-[10px] rounded hover:scale-105 transition uppercase"
                          >
                            {actionLoading ? '...' : 'FINALIZE'}
                          </button>
                        ) : !isMe && !iHaveVoted ? (
                          <button
                            onClick={() => handleVote(sub.id)}
                            className="px-3 py-1 border border-neon-green text-neon-green font-bold text-[10px] rounded hover:bg-neon-green hover:text-black transition uppercase"
                          >
                            VERIFY
                          </button>
                        ) : (
                          <div className="px-3 py-1 bg-gray-800 text-gray-500 rounded text-[10px] font-bold uppercase">
                            {hasConsensus ? 'CONSENSUS' : 'VOTING'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudyCircle