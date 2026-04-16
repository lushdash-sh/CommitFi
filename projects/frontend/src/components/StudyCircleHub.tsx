import { useEffect, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '../utils/Firebase'

interface StudyCircleHubProps {
  onSelectChallenge: (challengeId: string) => void
}

const StudyCircleHub = ({ onSelectChallenge }: StudyCircleHubProps) => {
  const { activeAddress } = useWallet()
  const [myChallenges, setMyChallenges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeAddress) return

    const challenges: any[] = []

    // 1. Challenges created by me (as Company A)
    const qCreated = query(collection(db, 'challenges'), where('creator', '==', activeAddress))
    const unsubCreated = onSnapshot(qCreated, (snap) => {
      const created = snap.docs.map((d) => ({ id: d.id, ...d.data(), role: 'creator' }))
      
      // 2. Challenges I've joined (as participant)
      const qJoined = query(
        collection(db, 'requests'),
        where('applicant', '==', activeAddress),
        where('status', '==', 'approved')
      )
      getDocs(qJoined).then((snap) => {
        const joinedIds = snap.docs.map((d) => d.data().challengeId)
        
        // Get challenge details for joined challenges
        if (joinedIds.length > 0) {
          joinedIds.forEach((id) => {
            getDocs(query(collection(db, 'challenges'), where('__name__', '==', id))).then((snap2) => {
              if (snap2.docs.length > 0) {
                challenges.push({
                  id: snap2.docs[0].id,
                  ...snap2.docs[0].data(),
                  role: 'participant',
                })
              }
            })
          })
        }

        // 3. Contracts I've accepted (as Company B)
        const qCompanyB = query(
          collection(db, 'requests'),
          where('applicant', '==', activeAddress),
          where('type', '==', 'business'),
          where('status', '==', 'approved')
        )
        getDocs(qCompanyB).then((snap) => {
          snap.docs.forEach((doc) => {
            getDocs(query(collection(db, 'challenges'), where('__name__', '==', doc.data().challengeId))).then(
              (snap2) => {
                if (snap2.docs.length > 0) {
                  challenges.push({
                    id: snap2.docs[0].id,
                    ...snap2.docs[0].data(),
                    role: 'company-b',
                  })
                }
              }
            )
          })

          // Combine all and remove duplicates
          setTimeout(() => {
            const uniqueChallenges = new Map()
            ;[...created].forEach((c) => uniqueChallenges.set(c.id, c))
            challenges.forEach((c) => {
              if (!uniqueChallenges.has(c.id)) {
                uniqueChallenges.set(c.id, c)
              }
            })
            setMyChallenges(Array.from(uniqueChallenges.values()))
            setLoading(false)
          }, 500)
        })
      })
    })

    return () => unsubCreated()
  }, [activeAddress])

  if (loading) {
    return <div className="text-center p-20 text-neon-green font-mono">LOADING YOUR CONTRACTS...</div>
  }

  if (myChallenges.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="bg-cyber-dark/40 border border-dashed border-gray-700 rounded-xl p-12 text-center">
          <h2 className="text-2xl font-cyber text-gray-400 mb-4">NO CONTRACTS YET</h2>
          <p className="text-gray-500 font-mono mb-6">Create a challenge or accept a contract to get started.</p>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.location.hash = 'home'
            }}
            className="inline-block px-6 py-2 bg-neon-green text-black font-bold rounded hover:opacity-90"
          >
            EXPLORE CONTRACTS
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <h2 className="text-4xl font-cyber text-neon-green mb-8 tracking-wider">YOUR CIRCLE/CONTRACTS</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {myChallenges.map((challenge) => {
          const isCreator = challenge.role === 'creator'
          const isCompanyB = challenge.role === 'company-b'
          const isParticipant = challenge.role === 'participant'

          let roleLabel = 'PARTICIPANT'
          let roleColor = 'text-neon-blue'
          let statusText = ''

          if (isCreator) {
            roleLabel = 'CREATED'
            roleColor = 'text-neon-green'
            statusText = challenge.type === 'business' ? challenge.verificationStatus : ''
          } else if (isCompanyB) {
            roleLabel = 'COMPANY B'
            roleColor = 'text-neon-pink'
            statusText = challenge.verificationStatus
          }

          const typeLabel =
            challenge.type === 'business'
              ? '💼 BUSINESS'
              : challenge.type === 'fitness'
                ? '🏃 FITNESS'
                : '📚 ACADEMIC'

          return (
            <button
              key={challenge.id}
              onClick={() => onSelectChallenge(challenge.id)}
              className="text-left bg-cyber-dark/40 border border-gray-700 rounded-lg p-6 hover:border-neon-green/60 transition-all hover:scale-105"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-mono uppercase mb-1">{typeLabel}</div>
                  <h3 className="text-lg font-bold text-white break-words">{challenge.title}</h3>
                </div>
                <div className={`text-xs font-bold uppercase whitespace-nowrap ml-2 ${roleColor}`}>{roleLabel}</div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 font-mono mb-4 line-clamp-2">{challenge.description}</p>

              {/* Status & Details */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Stake:</span>
                  <span className="text-neon-green font-bold">{challenge.stakeAmount} ALGO</span>
                </div>

                {statusText && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status:</span>
                    <span className="text-neon-blue font-mono text-xs uppercase">{statusText}</span>
                  </div>
                )}

                {challenge.type === 'business' && isCreator && challenge.companyB && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Company B:</span>
                    <span className="text-neon-blue font-mono text-xs">{challenge.companyB.slice(0, 6)}...</span>
                  </div>
                )}

                {challenge.type === 'business' && isCompanyB && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Company A:</span>
                    <span className="text-neon-green font-mono text-xs">{challenge.companyA.slice(0, 6)}...</span>
                  </div>
                )}
              </div>

              {/* Button */}
              <div className="border-t border-gray-700 pt-4">
                <div className="text-xs text-gray-500 font-mono uppercase mb-2">
                  {isCreator && challenge.type === 'business'
                    ? '→ MANAGE CONTRACT'
                    : isCompanyB && challenge.verificationStatus === 'awaiting-delivery'
                      ? '→ SUBMIT DELIVERABLE'
                      : isCompanyB && challenge.verificationStatus === 'in-review'
                        ? '→ VIEW REVIEW STATUS'
                        : isCreator && challenge.verificationStatus === 'in-review'
                          ? '→ REVIEW DOCUMENT'
                          : '→ VIEW DETAILS'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default StudyCircleHub
