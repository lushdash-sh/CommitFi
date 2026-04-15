import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, where, getDocs } from 'firebase/firestore'
import { db } from '../utils/Firebase'
import { useWallet } from '@txnlab/use-wallet-react'
import ChallengeCard from './ChallengeCard'

interface HomeProps {
  onViewDetails: (id: string) => void
}

const Home = ({ onViewDetails }: HomeProps) => {
  const [challenges, setChallenges] = useState<any[]>([])
  const { activeAddress } = useWallet()

  useEffect(() => {
    const q = query(collection(db, "challenges"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChallenges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [])

  const handleJoinRequest = async (challengeId: string, leaderAddress: string) => {
    if (!activeAddress) return alert("Please Connect Wallet first!")
    if (activeAddress === leaderAddress) return alert("You are the leader of this challenge!")

    const q = query(collection(db, "requests"), where("challengeId", "==", challengeId), where("applicant", "==", activeAddress))
    const existing = await getDocs(q)
    if (!existing.empty) return alert("Request already sent! Check your Vault.")

    await addDoc(collection(db, "requests"), {
      challengeId,
      leader: leaderAddress,
      applicant: activeAddress,
      status: "pending",
      timestamp: Date.now()
    })
    alert("Request sent to Team Leader!")
  }

  return (
    <section className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-6xl md:text-8xl font-cyber font-bold mb-4 bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple bg-clip-text text-transparent animate-pulse-slow tracking-tighter">
           PROCRASTINATING
          </h2>
          <h3 className="text-5xl md:text-7xl font-cyber font-bold mb-6 text-white tracking-wide">
            START <span className="text-neon-green">STAKING</span>
          </h3>
        </div>
        
        <p className="text-xl md:text-2xl text-gray-400 mb-16 font-mono leading-relaxed">
          Bet on your own success. <span className="text-neon-green">Complete the task</span> or <span className="text-neon-pink">lose your stake</span>.
        </p>

        {/* STATS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-black/40 backdrop-blur-sm border border-neon-green/20 rounded-xl p-8 hover:scale-105 transition-all">
            <div className="text-4xl font-bold text-neon-green font-mono mb-2">{challenges.length}</div>
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

      {/* CHALLENGE FEED */}
      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {challenges.length === 0 ? (
                <div className="col-span-3 text-center p-12 border border-dashed border-gray-700 rounded text-gray-500 font-mono">
                    NO ACTIVE CHALLENGES. CREATE ONE TO START.
                </div>
            ) : (
                challenges.map((challenge) => {
                  const isLeader = activeAddress === challenge.creator
                  return (
                    <div key={challenge.id} className="relative group">
                       <ChallengeCard 
                         id={challenge.id}
                         title={challenge.title} // <--- PASSING THE TITLE HERE
                         stakeAmount={challenge.stakeAmount}
                         deadline={challenge.deadline}
                         onJoin={isLeader ? () => onViewDetails(challenge.id) : () => handleJoinRequest(challenge.id, challenge.creator)}
                         status={isLeader ? "MANAGE" : "Available"} 
                       />
                       {isLeader && (
                         <div className="absolute top-0 right-0 bg-neon-blue text-black text-[10px] font-bold px-2 py-1 uppercase z-20 rounded-bl">
                           LEADER
                         </div>
                       )}
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