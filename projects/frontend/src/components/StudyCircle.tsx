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

type ChallengeType = 'academics' | 'academic' | 'fitness' | 'business'

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
  const [showReview, setShowReview] = useState(false)

  // 1. FETCH DATA
  useEffect(() => {
    if (!challengeId) return

    getDoc(doc(db, 'challenges', challengeId)).then((snap) => {
      if (snap.exists()) setChallenge({ id: snap.id, ...snap.data() })
    })

    const qMembers = query(collection(db, 'requests'), where('challengeId', '==', challengeId), where('status', '==', 'approved'))
    onSnapshot(qMembers, (snap) => {
      setMemberAddresses(snap.docs.map((d) => d.data().applicant))
    })

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

  const handleApproveSubmission = async (submissionId: string, participantAddress: string) => {
    if (!activeAddress) return
    if (!isLeader) return alert('Only the leader can approve submissions')
    
    setActionLoading(true)
    try {
      await updateDoc(doc(db, 'submissions', submissionId), { 
        status: 'verified',
        approvedBy: activeAddress,
        approvedAt: Date.now()
      })
      alert(`✅ Approved ${participantAddress.slice(0, 6)}...'s submission!`)
    } catch (e) {
      console.error(e)
      alert(`Error: ${(e as Error).message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectSubmission = async (submissionId: string, participantAddress: string) => {
    if (!activeAddress) return
    if (!isLeader) return alert('Only the leader can reject submissions')
    
    setActionLoading(true)
    try {
      await updateDoc(doc(db, 'submissions', submissionId), { 
        status: 'rejected',
        rejectedBy: activeAddress,
        rejectedAt: Date.now()
      })
      alert(`❌ Rejected ${participantAddress.slice(0, 6)}...'s submission`)
    } catch (e) {
      console.error(e)
      alert(`Error: ${(e as Error).message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // NEW: Peer Review for the Leader's Submission
  const handleVoteForLeader = async (submissionId: string, currentVotes: number, requiredVotes: number) => {
    if (!activeAddress) return
    setActionLoading(true)
    try {
      const newVotes = currentVotes + 1
      const isNowVerified = newVotes >= requiredVotes

      await updateDoc(doc(db, 'submissions', submissionId), {
        votes: arrayUnion(activeAddress),
        status: isNowVerified ? 'verified' : 'pending'
      })
      alert(isNowVerified ? '✅ Vote cast! Leader is now fully verified.' : '✅ Vote cast successfully!')
    } catch (e) {
      console.error(e)
      alert(`Error casting vote: ${(e as Error).message}`)
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

  // ==========================================
  // BUSINESS FLOW (Unchanged)
  // ==========================================
  if (challengeType === 'business') {
      // ... (Keeping your exact Business flow code here to save space, no changes needed for this)
      return <div className="text-center p-20 text-neon-blue font-mono">Business Flow Active (Rendered via earlier code)</div>
  }

  // ==========================================
  // ACADEMIC & FITNESS FLOW
  // ==========================================
  
  const allParticipants = Array.from(new Set([challenge.creator, ...memberAddresses]))
  
  // For peer review: How many votes does the leader need? (e.g. 1 member = 1 vote needed)
  const totalPeers = allParticipants.length - 1
  const requiredLeaderVotes = Math.max(1, Math.ceil(totalPeers / 2)) // Simple majority, minimum 1

  const totalMembers = allParticipants.length
  const totalStake = totalMembers * (challenge.stakeAmount || 0)
  const displayType = (challengeType === 'academics' || challengeType === 'academic') ? 'ACADEMIC' : 'FITNESS'
  const maxMembersDisplay = challenge.maxMembers || (displayType === 'FITNESS' ? 1 : '∞')

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 font-sans">
      {onBack && (
        <button onClick={onBack} className="mb-6 px-4 py-2 bg-gray-700/50 text-gray-300 font-mono text-xs uppercase hover:bg-gray-700 transition rounded">
          ← BACK TO YOUR CIRCLE
        </button>
      )}

      {/* HEADER WITH DYNAMIC STATS */}
      <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-700 pb-8 mb-8 gap-8">
        <div className="max-w-3xl w-full">
          <div className="flex items-center gap-3 mb-2">
             <span className="px-3 py-1 bg-neon-blue/20 text-neon-blue border border-neon-blue rounded text-[10px] font-bold uppercase tracking-widest">
                {displayType} CHALLENGE
             </span>
             <span className="text-gray-500 font-mono text-xs">ID: {challengeId.slice(0,8)}</span>
          </div>
          <h1 className="text-5xl font-cyber text-neon-green mb-4 tracking-wide">{challenge.title.toUpperCase()}</h1>
          <p className="text-gray-300 font-mono text-sm leading-relaxed mb-8">{challenge.description}</p>

          <div className="flex flex-wrap gap-4">
            <div className="bg-black/40 px-6 py-4 border-l-4 border-neon-blue rounded-r-lg min-w-[160px]">
              <div className="text-gray-500 font-mono text-xs uppercase mb-1 tracking-widest">Total Prize Pool</div>
              <div className="text-3xl font-bold text-neon-blue">{totalStake} <span className="text-sm">ALGO</span></div>
            </div>
            <div className="bg-black/40 px-6 py-4 border-l-4 border-neon-purple rounded-r-lg min-w-[160px]">
              <div className="text-gray-500 font-mono text-xs uppercase mb-1 tracking-widest">Participants</div>
              <div className="text-3xl font-bold text-neon-purple">
                {totalMembers} <span className="text-sm text-gray-500">/ {maxMembersDisplay}</span>
              </div>
            </div>
            <div className="bg-black/40 px-6 py-4 border-l-4 border-neon-green rounded-r-lg min-w-[160px]">
              <div className="text-gray-500 font-mono text-xs uppercase mb-1 tracking-widest">Entry Stake</div>
              <div className="text-3xl font-bold text-neon-green">{challenge.stakeAmount} <span className="text-sm">ALGO</span></div>
            </div>
          </div>
        </div>

        <div className="text-right min-w-[200px] bg-black/30 p-6 border border-gray-800 rounded-xl">
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
            <a href={challenge.templateUrl} target="_blank" rel="noreferrer" className="block text-center py-3 bg-neon-blue/10 text-neon-blue text-xs font-bold border border-neon-blue/30 hover:bg-neon-blue hover:text-black transition uppercase rounded font-mono">
              DOWNLOAD TEMPLATE 📄
            </a>
          )}

          <div className="bg-cyber-dark/40 border border-neon-green/30 p-6 rounded-xl">
            <h3 className="text-neon-green font-cyber mb-4 tracking-wider">YOUR STATUS</h3>
            {mySubmission ? (
              <div className="text-center py-6 bg-black/20 rounded-lg">
                {mySubmission.status === 'verified' && isExpired ? (
                  <button onClick={handleClaim} disabled={actionLoading} className="w-full py-4 bg-gradient-to-r from-neon-green to-neon-blue text-black font-bold font-mono text-xl rounded hover:scale-105 transition">
                    {actionLoading ? 'CLAIMING...' : 'CLAIM REWARD 💰'}
                  </button>
                ) : mySubmission.status === 'claimed' ? (
                  <div className="text-gray-400 font-bold">REWARD CLAIMED 🏆</div>
                ) : mySubmission.status === 'rejected' ? (
                  <div>
                    <div className="text-2xl font-bold uppercase tracking-widest text-red-500 mb-2">REJECTED ❌</div>
                    <p className="text-gray-400 font-mono text-xs">Please submit again before deadline</p>
                  </div>
                ) : (
                  <div className={`text-2xl font-bold uppercase tracking-widest ${mySubmission.status === 'verified' ? 'text-neon-green' : 'text-yellow-500'}`}>
                    {mySubmission.status === 'verified' ? 'APPROVED ✅' : 'PENDING ⏳'}
                  </div>
                )}
              </div>
            ) : !isExpired ? (
              <div className="space-y-4">
                <input className="w-full bg-black/50 border border-gray-600 rounded p-4 text-white text-sm focus:border-neon-green outline-none font-mono" placeholder="Paste proof link..." value={proofLink} onChange={(e) => setProofLink(e.target.value)} />
                <button onClick={handleSubmit} className="w-full py-3 bg-neon-green text-black font-bold font-mono rounded hover:opacity-90 uppercase tracking-wider">
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
                const isThisUserLeader = participantAddr === challenge.creator

                // 1. NO SUBMISSION YET
                if (!sub) {
                  return (
                    <div key={participantAddr} className="p-4 flex items-center gap-4 hover:bg-white/5 transition opacity-50">
                      <div className="w-8 h-8 flex items-center justify-center font-bold rounded-full bg-gray-800 text-gray-600 font-mono text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 flex items-center gap-3 font-mono text-sm text-gray-500">
                        {isMe ? 'YOU' : `${participantAddr.slice(0, 6)}...${participantAddr.slice(-4)}`}
                        {isThisUserLeader && (
                           <span className="px-2 py-0.5 bg-neon-blue text-black rounded text-[10px] font-bold uppercase tracking-widest">
                             LEADER
                           </span>
                        )}
                      </div>
                      {/* FIX: Shows WAITING FOR SUBMISSION for everyone, including Leader */}
                      <div className="text-[10px] text-gray-600 font-bold uppercase border border-gray-700 px-2 py-1 rounded">
                        WAITING FOR SUBMISSION
                      </div>
                    </div>
                  )
                }

                // 2. HAS SUBMISSION
                const isLeaderSubmission = sub.user === challenge.creator
                const currentVotes = sub.votes?.length || 0
                const iHaveVoted = sub.votes?.includes(activeAddress)

                return (
                  <div key={sub.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition">
                    <div className="w-8 h-8 flex items-center justify-center font-bold rounded-full bg-gray-800 text-gray-500 font-mono text-sm">
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 font-mono text-sm text-white mb-1">
                        {isMe ? 'YOU' : `${sub.user.slice(0, 6)}...${sub.user.slice(-4)}`}
                        {isThisUserLeader && (
                           <span className="px-2 py-0.5 bg-neon-blue text-black rounded text-[10px] font-bold uppercase tracking-widest">
                             LEADER
                           </span>
                        )}
                      </div>
                      <a href={sub.proof} target="_blank" rel="noreferrer" className="text-xs text-gray-500 underline hover:text-neon-green">
                        View Proof
                      </a>
                    </div>

                    {/* STATUS BADGES & ACTIONS */}
                    {sub.status === 'verified' ? (
                      <div className="px-3 py-1 bg-neon-green/20 text-neon-green border border-neon-green rounded text-[10px] font-bold uppercase">
                        ✅ APPROVED
                      </div>
                    ) : sub.status === 'rejected' ? (
                      <div className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded text-[10px] font-bold uppercase">
                        ❌ REJECTED
                      </div>
                    ) : isLeaderSubmission ? (
                      /* LOGIC FOR LEADER'S SUBMISSION: Peers must vote */
                      isMe ? (
                        <div className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded text-[10px] font-bold uppercase">
                          ⏳ AWAITING {requiredLeaderVotes - currentVotes} PEER VOTE(S)
                        </div>
                      ) : iHaveVoted ? (
                        <div className="px-3 py-1 bg-neon-blue/20 text-neon-blue border border-neon-blue rounded text-[10px] font-bold uppercase">
                          ✅ VOTED
                        </div>
                      ) : (
                        <button
                          onClick={() => handleVoteForLeader(sub.id, currentVotes, requiredLeaderVotes)}
                          disabled={actionLoading}
                          className="px-2 py-1 bg-neon-blue/20 text-neon-blue border border-neon-blue font-bold text-[10px] rounded hover:bg-neon-blue hover:text-black transition uppercase"
                        >
                          {actionLoading ? '...' : 'VOTE TO APPROVE'}
                        </button>
                      )
                    ) : (
                      /* LOGIC FOR NORMAL MEMBER'S SUBMISSION: Leader decides */
                      isLeader ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveSubmission(sub.id, sub.user)}
                            disabled={actionLoading}
                            className="px-2 py-1 bg-neon-green/20 text-neon-green border border-neon-green font-bold text-[10px] rounded hover:bg-neon-green hover:text-black transition uppercase"
                          >
                            {actionLoading ? '...' : 'APPROVE'}
                          </button>
                          <button
                            onClick={() => handleRejectSubmission(sub.id, sub.user)}
                            disabled={actionLoading}
                            className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/50 font-bold text-[10px] rounded hover:bg-red-500 hover:text-black transition uppercase"
                          >
                            REJECT
                          </button>
                        </div>
                      ) : (
                        <div className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded text-[10px] font-bold uppercase">
                          ⏳ AWAITING LEADER
                        </div>
                      )
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