import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../utils/Firebase'
import { useWallet } from '@txnlab/use-wallet-react'
import ChallengeCard from './ChallengeCard'

interface HomeProps {
  onViewDetails: (id: string) => void
}

type ChallengeType = 'academic' | 'fitness' | 'business'

const Home = ({ onViewDetails }: HomeProps) => {
  const [challenges, setChallenges] = useState<any[]>([])
  const [activeFilter, setActiveFilter] = useState<'all' | ChallengeType>('all')
  const { activeAddress } = useWallet()

  useEffect(() => {
    const q = query(collection(db, 'challenges'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChallenges(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [])

  // NEW: Added challengeTitle to the parameters so we can save it!
  const handleJoinRequest = async (challengeId: string, leaderAddress: string, challengeType: string = 'academic', challengeTitle: string = '') => {
    if (!activeAddress) {
      alert('❌ Please Connect Wallet first!')
      return
    }
    
    if (activeAddress === leaderAddress) {
      alert('❌ You are the leader of this challenge!')
      return
    }

    try {
      const q = query(
        collection(db, 'requests'),
        where('challengeId', '==', challengeId),
        where('applicant', '==', activeAddress)
      )
      const existing = await getDocs(q)
      
      if (!existing.empty) {
        alert('⚠️ Request already sent! Check your Vault.')
        return
      }

      await addDoc(collection(db, 'requests'), {
        challengeId,
        challengeTitle, // Save the title here!
        leader: leaderAddress,
        applicant: activeAddress,
        status: 'pending',
        timestamp: Date.now(),
        type: challengeType,
      })
      alert('✅ Request sent! Check your Vault to track it.')
    } catch (error) {
      console.error('[Home] Error sending join request:', error)
      alert('❌ Failed to send request: ' + (error as Error).message)
    }
  }

  const handleBusinessRequest = async (challengeId: string, companyAAddress: string) => {
    if (!activeAddress) return alert('Please Connect Wallet first!')
    if (activeAddress === companyAAddress) return alert('You created this contract!')

    try {
      const q = query(
        collection(db, 'requests'),
        where('challengeId', '==', challengeId),
        where('applicant', '==', activeAddress)
      )
      const existing = await getDocs(q)
      if (!existing.empty) return alert('Request already accepted! Check your Circle.')

      const challengeSnap = await getDoc(doc(db, 'challenges', challengeId))
      if (!challengeSnap.exists()) return alert('Challenge not found!')
      const challengeData = challengeSnap.data()

      await addDoc(collection(db, 'requests'), {
        challengeId,
        businessTitle: challengeData.title,
        companyA: companyAAddress,
        companyB: activeAddress,
        leader: companyAAddress,
        applicant: activeAddress,
        status: 'approved',
        timestamp: Date.now(),
        type: 'business',
        role: 'company-b',
        reviewPeriodHours: challengeData.reviewPeriodHours || 48,
      })

      await updateDoc(doc(db, 'challenges', challengeId), {
        companyB: activeAddress,
        verificationStatus: 'awaiting-delivery',
      })

      alert('✅ Contract accepted! You can now submit proof.')
    } catch (error) {
      console.error('Error accepting contract:', error)
      alert('❌ Failed to accept contract: ' + (error as Error).message)
    }
  }

  const filteredChallenges =
    activeFilter === 'all'
      ? challenges
      : challenges.filter((c) => (c.type || 'academic') === activeFilter)

  return (
    <section className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-6xl md:text-8xl font-cyber font-bold mb-4 bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple bg-clip-text text-transparent animate-pulse-slow tracking-tighter">
            STOP PROCRASTINATING
          </h2>
          <h3 className="text-5xl md:text-7xl font-cyber font-bold mb-6 text-white tracking-wide">
            START <span className="text-neon-green">STAKING</span>
          </h3>
        </div>

        <p className="text-xl md:text-2xl text-gray-400 mb-16 font-mono leading-relaxed">
          Bet on your own success. <span className="text-neon-green">Complete the task</span> or{' '}
          <span className="text-neon-pink">lose your stake</span>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-black/40 backdrop-blur-sm border border-neon-green/20 rounded-xl p-8 hover:scale-105 transition-all">
            <div className="text-4xl font-bold text-neon-green font-mono mb-2">
              {challenges.length}
            </div>
            <div className="text-xs text-gray-400 font-mono tracking-widest uppercase">ACTIVE CHALLENGES</div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm border border-neon-blue/20 rounded-xl p-8 hover:scale-105 transition-all">
            <div className="text-4xl font-bold text-neon-blue font-mono mb-2">15,234</div>
            <div className="text-xs text-gray-400 font-mono tracking-widest uppercase">ALGO STAKED</div>
          </div>
          <div className="bg-black/40 backdrop-blur-sm border border-neon-purple/20 rounded-xl p-8 hover:scale-105 transition-all">
            <div className="text-4xl font-bold text-neon-purple font-mono mb-2">89%</div>
            <div className="text-xs text-gray-400 font-mono tracking-widest uppercase">SUCCESS RATE</div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mb-8">
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={() => setActiveFilter('all')} className={`px-6 py-2 rounded-lg font-mono text-sm uppercase tracking-widest transition-all ${activeFilter === 'all' ? 'bg-neon-green text-black font-bold' : 'bg-black/40 border border-gray-700 text-gray-300 hover:text-white'}`}>All</button>
          <button onClick={() => setActiveFilter('academic')} className={`px-6 py-2 rounded-lg font-mono text-sm uppercase tracking-widest transition-all ${activeFilter === 'academic' ? 'bg-neon-green text-black font-bold' : 'bg-black/40 border border-gray-700 text-gray-300 hover:text-white'}`}>Academics</button>
          <button onClick={() => setActiveFilter('fitness')} className={`px-6 py-2 rounded-lg font-mono text-sm uppercase tracking-widest transition-all ${activeFilter === 'fitness' ? 'bg-neon-green text-black font-bold' : 'bg-black/40 border border-gray-700 text-gray-300 hover:text-white'}`}>Fitness</button>
          <button onClick={() => setActiveFilter('business')} className={`px-6 py-2 rounded-lg font-mono text-sm uppercase tracking-widest transition-all ${activeFilter === 'business' ? 'bg-neon-green text-black font-bold' : 'bg-black/40 border border-gray-700 text-gray-300 hover:text-white'}`}>Business</button>
        </div>
      </div>

      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredChallenges.length === 0 ? (
            <div className="col-span-3 text-center p-12 border border-dashed border-gray-700 rounded text-gray-500 font-mono">
              NO {activeFilter.toUpperCase()} CHALLENGES. CREATE ONE TO START.
            </div>
          ) : (
            filteredChallenges.map((challenge) => {
              const isLeader = activeAddress === challenge.creator
              const challengeType = challenge.type || 'academic'

              if (challengeType === 'business') {
                return (
                  <div key={challenge.id} className="relative group">
                    <div className="bg-black/40 border border-neon-blue/30 rounded-lg overflow-hidden hover:border-neon-blue/60 transition-all">
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-white mb-2">{challenge.title}</h3>
                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{challenge.description}</p>
                        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                          <div>
                            <span className="text-gray-500">Company A:</span>
                            <p className="text-neon-blue font-mono text-xs">{challenge.companyA.slice(0, 6)}...</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Company B:</span>
                            <p className="text-neon-green font-mono text-xs">{challenge.companyB || 'TBD'}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-neon-green font-bold">{challenge.stakeAmount} ALGO</div>
                          {isLeader ? (
                            <button onClick={() => onViewDetails(challenge.id)} className="px-4 py-2 bg-neon-blue/20 text-neon-blue border border-neon-blue rounded text-xs font-bold hover:bg-neon-blue/30">MANAGE</button>
                          ) : (
                            <button onClick={() => handleBusinessRequest(challenge.id, challenge.creator)} className="px-4 py-2 bg-neon-green/20 text-neon-green border border-neon-green rounded text-xs font-bold hover:bg-neon-green/30">ACCEPT REQUEST</button>
                          )}
                        </div>
                      </div>
                    </div>
                    {isLeader && <div className="absolute top-0 right-0 bg-neon-blue text-black text-[10px] font-bold px-2 py-1 uppercase z-20 rounded-bl">LEADER</div>}
                  </div>
                )
              }

              return (
                <div key={challenge.id} className="relative group">
                  <ChallengeCard
                    id={challenge.id}
                    title={challenge.title}
                    stakeAmount={challenge.stakeAmount}
                    deadline={challenge.deadline}
                    // NEW: Passing the challenge.title to the request function!
                    onJoin={isLeader ? () => onViewDetails(challenge.id) : () => handleJoinRequest(challenge.id, challenge.creator, challengeType, challenge.title)}
                    status={isLeader ? 'MANAGE' : 'Available'}
                  />
                  {isLeader && <div className="absolute top-0 right-0 bg-neon-blue text-black text-[10px] font-bold px-2 py-1 uppercase z-20 rounded-bl">LEADER</div>}
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
export default Home